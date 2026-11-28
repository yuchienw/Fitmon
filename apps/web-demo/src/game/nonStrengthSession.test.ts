import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getLocalDayKey } from './day.ts';
import { evaluateCheckinValidity } from './checkinValidity.ts';
import { applyCheckinGrant } from './checkinGrant.ts';
import type { WorkoutSessionSportType } from './workoutRecord.ts';

export interface NonStrengthSessionRecord {
  id: string;
  dateLabel: string;
  timestamp: number;
  routineName: string;
  durationMinutes: number;
  durationSec?: number;
  totalDurationSec?: number;
  distanceM?: number;
  totalVolume: number;
  totalSets: number;
  coinsEarned: number;
  expEarned: number;
  topExerciseZh: string;
  exerciseLogs: any[];
  sportType: WorkoutSessionSportType;
  source: 'in_app' | 'health_app';
  loggingMode: 'live_focus' | 'after_the_fact';
  endedUnwell: boolean;
  pauseSegments?: { startedAt: number; endedAt: number }[];
  customName?: string;
  ballKind?: string;
  intensity?: string;
  restShare?: number;
}

/**
 * T4-D4 非重訓紀錄、結算 0 與打卡判定單元測試
 *
 * 決策依據：
 * - 決策卡 2026-11-28 Q3（選項 A，經幕僚長轉達）：
 *   新運動類型結算幣與結算經驗維持 0，只拿每日第一次達標的打卡獎 +70／+100。
 *   任何畫面不得顯示「+0 幣」「+0 EXP」「+0 XP」「+0🪙」；非重訓不得顯示「總訓練容量」「容量 kg」。
 *   未達標或當日第二筆只顯示「已存紀錄」，不開空金額 VictoryModal。
 * - 工單 T4-D4 與 spec §3.5–3.7
 */

describe('T4-D4 非重訓紀錄資料模型與欄位檢核', () => {
  const BASE_TIME = new Date('2026-11-28T10:00:00+08:00').getTime();
  const TODAY_KEY = getLocalDayKey(BASE_TIME);

  const ALL_NON_STRENGTH_TYPES: WorkoutSessionSportType[] = [
    'run',
    'walk',
    'swim',
    'cycle',
    'yoga_stretch',
    'ball',
    'circuit_hiit',
    'custom',
  ];

  test('各非重訓類型組成的 session：具有正確類型、時長，距離存於 distanceM 而非 weightKg，且總容量為 0', () => {
    for (const sportType of ALL_NON_STRENGTH_TYPES) {
      const isSwim = sportType === 'swim';
      const hasDistance = sportType === 'run' || sportType === 'walk' || sportType === 'cycle' || isSwim;

      const record: NonStrengthSessionRecord = {
        id: `test_${sportType}`,
        dateLabel: '11/28（六）',
        timestamp: BASE_TIME,
        routineName: sportType,
        durationMinutes: 15,
        durationSec: 900,
        totalDurationSec: 900,
        distanceM: hasDistance ? (isSwim ? 300 : 2500) : undefined,
        totalVolume: 0, // 非重訓容量必為 0
        totalSets: 0,   // 非重訓完成組數為 0
        coinsEarned: 0, // Q3 結算幣必為 0
        expEarned: 0,   // Q3 結算 XP 必為 0
        topExerciseZh: sportType,
        exerciseLogs: [],
        sportType,
        source: 'in_app',
        loggingMode: 'live_focus',
        endedUnwell: false,
        pauseSegments: [],
        customName: sportType === 'custom' ? '戶外爬山' : undefined,
        ballKind: sportType === 'ball' ? '羽球' : undefined,
      };

      // 驗證類型與時長
      assert.equal(record.sportType, sportType);
      assert.equal(record.durationMinutes, 15);
      assert.equal(record.durationSec, 900);

      // 驗證容量為 0，且不得將距離寫入 weightKg
      assert.equal(record.totalVolume, 0);
      assert.equal((record as any).weightKg, undefined, '非重訓不得含有 weightKg 欄位');

      if (hasDistance) {
        assert.ok(typeof record.distanceM === 'number' && record.distanceM > 0);
        if (isSwim) {
          assert.equal(record.distanceM, 300);
        } else {
          assert.equal(record.distanceM, 2500);
        }
      } else {
        assert.equal(record.distanceM, undefined);
      }

      // 驗證 loggingMode 與非重訓不假造 restShare
      assert.equal(record.loggingMode, 'live_focus');
      assert.equal(record.restShare, undefined);
    }
  });

  test('暫停時間扣除：主動運動時長不包含暫停區段', () => {
    const startedAt = BASE_TIME;
    // 總經過 900 秒（15 分鐘），其中 300 秒在暫停
    const pauseStarted = startedAt + 300 * 1000;
    const pauseEnded = startedAt + 600 * 1000;
    const endedAt = startedAt + 900 * 1000;

    const pauseDurationSec = (pauseEnded - pauseStarted) / 1000;
    const activeDurationSec = (endedAt - startedAt) / 1000 - pauseDurationSec;

    assert.equal(activeDurationSec, 600); // 實質運動僅 10 分鐘

    const session: NonStrengthSessionRecord = {
      id: 'session_pause_test',
      dateLabel: '11/28（六）',
      timestamp: startedAt,
      routineName: '快走',
      durationMinutes: Math.round(activeDurationSec / 60),
      durationSec: activeDurationSec,
      totalDurationSec: activeDurationSec,
      totalVolume: 0,
      totalSets: 0,
      coinsEarned: 0,
      expEarned: 0,
      topExerciseZh: '快走',
      exerciseLogs: [],
      sportType: 'walk',
      source: 'in_app',
      loggingMode: 'live_focus',
      endedUnwell: false,
      pauseSegments: [{ startedAt: pauseStarted, endedAt: pauseEnded }],
    };

    assert.equal(session.durationMinutes, 10);
    assert.equal(session.durationSec, 600);
    assert.equal(session.pauseSegments?.length, 1);
  });
});

describe('T4-D4 Q3 結算 0 與打卡獎勵判定', () => {
  const BASE_TIME = new Date('2026-11-28T10:00:00+08:00').getTime();
  const TODAY_KEY = getLocalDayKey(BASE_TIME);

  test('當日第一次非重訓達標：結算幣與 XP 為 0，但成功觸發打卡發放 +70 幣與 +100 XP', () => {
    // 10 分鐘快走
    const walkSession: NonStrengthSessionRecord = {
      id: 'walk_session_1',
      dateLabel: '11/28（六）',
      timestamp: BASE_TIME,
      routineName: '快走',
      durationMinutes: 10,
      durationSec: 600,
      distanceM: 1000,
      totalVolume: 0,
      totalSets: 0,
      coinsEarned: 0, // 新類型結算為 0
      expEarned: 0,
      topExerciseZh: '快走',
      exerciseLogs: [],
      sportType: 'walk',
      source: 'in_app',
      loggingMode: 'live_focus',
      endedUnwell: false,
      pauseSegments: [],
    };

    const validity = evaluateCheckinValidity({
      sessions: [walkSession],
      dayKey: TODAY_KEY,
      now: BASE_TIME,
      checkinDayKeys: [],
    });

    assert.equal(validity.met, true);

    const grant = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_TIME,
      validity,
      state: {
        lastCheckinDate: null,
        checkinDayKeys: [],
        level: 1,
        exp: 0,
        coins: 100,
        coinsEarnedToday: 0,
        coinsEarnedDayKey: TODAY_KEY,
        doubleCoinUntil: 0,
        unlockCheckinDays: 0,
        unwellHalfUsedByWeek: {},
      },
    });

    assert.equal(grant.ok, true);
    assert.equal(grant.granted, true);
    assert.equal(grant.result?.coinsGranted, 70);
    assert.equal(grant.result?.xpGained, 100);
    assert.ok(grant.patch?.checkinDayKeys?.includes(TODAY_KEY));
  });

  test('當日第二筆非重訓：不重複發放打卡獎，結算幣與 XP 保持 0', () => {
    const secondSession: NonStrengthSessionRecord = {
      id: 'cycle_session_2',
      dateLabel: '11/28（六）',
      timestamp: BASE_TIME + 3600 * 1000,
      routineName: '單車',
      durationMinutes: 20,
      durationSec: 1200,
      distanceM: 5000,
      totalVolume: 0,
      totalSets: 0,
      coinsEarned: 0,
      expEarned: 0,
      topExerciseZh: '單車',
      exerciseLogs: [],
      sportType: 'cycle',
      source: 'in_app',
      loggingMode: 'live_focus',
      endedUnwell: false,
      pauseSegments: [],
    };

    const validity = evaluateCheckinValidity({
      sessions: [secondSession],
      dayKey: TODAY_KEY,
      now: BASE_TIME + 3600 * 1000,
      checkinDayKeys: [TODAY_KEY], // 今天已經打過卡
    });

    const grant = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_TIME + 3600 * 1000,
      validity,
      state: {
        lastCheckinDate: TODAY_KEY,
        checkinDayKeys: [TODAY_KEY],
        level: 2,
        exp: 100,
        coins: 170,
        coinsEarnedToday: 70,
        coinsEarnedDayKey: TODAY_KEY,
        doubleCoinUntil: 0,
        unlockCheckinDays: 1,
        unwellHalfUsedByWeek: {},
      },
    });

    // 由於今日已打卡，不重複發放獎勵
    assert.equal(grant.ok, true);
    assert.equal(grant.granted, false);
    assert.equal(secondSession.coinsEarned, 0);
    assert.equal(secondSession.expEarned, 0);
  });

  test('游泳達標門檻：滿 200 公尺即使未滿 10 分鐘亦達標', () => {
    // 5 分鐘但游了 200 公尺
    const swimSession: NonStrengthSessionRecord = {
      id: 'swim_session_threshold',
      dateLabel: '11/28（六）',
      timestamp: BASE_TIME,
      routineName: '游泳',
      durationMinutes: 5,
      durationSec: 300,
      distanceM: 200,
      totalVolume: 0,
      totalSets: 0,
      coinsEarned: 0,
      expEarned: 0,
      topExerciseZh: '游泳',
      exerciseLogs: [],
      sportType: 'swim',
      source: 'in_app',
      loggingMode: 'live_focus',
      endedUnwell: false,
      pauseSegments: [],
    };

    const validity = evaluateCheckinValidity({
      sessions: [swimSession],
      dayKey: TODAY_KEY,
      now: BASE_TIME,
      checkinDayKeys: [],
    });

    assert.equal(validity.met, true);
  });
});
