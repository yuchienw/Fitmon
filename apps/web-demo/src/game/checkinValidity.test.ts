import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  evaluateCheckinValidity,
  type CheckinValidityResult,
} from './checkinValidity.ts';
import {
  resolveCheckinValidityConfig,
  DEFAULT_CHECKIN_VALIDITY_CONFIG,
} from '../config/checkinValidity.ts';
import { type EvaluatedSet } from './strengthSessionTiming.ts';
import { getWeekKey } from './day.ts';

describe('FitMon Checkin Validity Engine (T1-D1)', () => {
  // 基準時間：2026-11-22 14:00:00 (週日)
  // 本週一為 2026-11-16，本週日為 2026-11-22
  // 上週日為 2026-11-15（已結算週）
  const baseNow = new Date('2026-11-22T14:00:00.000Z');
  const todayKey = '2026-11-22';
  const yesterdayKey = '2026-11-21'; // 同一週過去日
  const pastWeekDayKey = '2026-11-15'; // 已結算週
  const futureDayKey = '2026-11-23'; // 未來日

  describe('1. 重訓已定案例子 (T4-D2 三條件真實計算) 與循環訓練', () => {
    // 1. 一般人：約 10 組、休息佔比約 75% → met
    test('一般人：10 組、每組 45 秒、休息 150 秒 (75%) -> met', () => {
      const baseMs = new Date('2026-11-22T08:00:00.000Z').getTime();
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 45 * 1000;
      const restMs = 150 * 1000;

      for (let i = 0; i < 10; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 9;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : 150,
          timingIncomplete: false,
        });
        cursor = completedAt + restMs;
      }

      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 's_normal',
            sportType: 'strength',
            loggingMode: 'live_focus',
            timestamp: baseMs,
            sets,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.wouldCheckIn, true);
      assert.equal(res.halfRuleApplied, false);
      assert.equal(res.remainingSec, 0);
      assert.equal(res.primaryHint, null);
    });

    // 2. 大重量：6 組、休息約 90% → met (不設上限)
    test('大重量：6 組、每組 30 秒、休息 270 秒 (~88%~90%) -> met', () => {
      const baseMs = new Date('2026-11-22T09:00:00.000Z').getTime();
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 30 * 1000;
      const restMs = 270 * 1000;

      for (let i = 0; i < 6; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 5;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : 270,
          timingIncomplete: false,
        });
        cursor = completedAt + restMs;
      }

      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 's_heavy',
            sportType: 'strength',
            loggingMode: 'live_focus',
            timestamp: baseMs,
            sets,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.wouldCheckIn, true);
    });

    // 3. 等器材 15 分鐘暫停：第 4 組後等了 15 分鐘，扣除後仍 met
    test('等器材 15 分鐘暫停：扣除暫停後仍 met', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 30 * 1000;
      const normalRestSec = 90;
      const equipmentWaitSec = 15 * 60; // 900s (>600s 暫停)

      for (let i = 0; i < 6; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isSet4 = i === 3;
        const gapSec = isSet4 ? equipmentWaitSec : normalRestSec;
        const isLast = i === 5;

        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : isSet4 ? 900 : normalRestSec,
          timingIncomplete: false,
        });

        cursor = completedAt + gapSec * 1000;
      }

      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 's_wait',
            sportType: 'strength',
            loggingMode: 'live_focus',
            timestamp: baseMs,
            sets,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.wouldCheckIn, true);
    });

    // 4. 初學者休息 80% 以上 → met
    test('初學者：休息 80% 以上 -> met', () => {
      const baseMs = new Date('2026-11-22T11:00:00.000Z').getTime();
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 30 * 1000;
      const restSec = 180; // 3 min

      for (let i = 0; i < 4; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 3;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : restSec,
          timingIncomplete: false,
        });
        cursor = completedAt + restSec * 1000;
      }

      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 's_beginner',
            sportType: 'strength',
            loggingMode: 'live_focus',
            timestamp: baseMs,
            sets,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.wouldCheckIn, true);
    });

    // 5. 亂按：2 分鐘內連按 10 組、間隔約 5 秒、休息幾乎 0 → 不 met
    test('亂按：2 分鐘內連按 10 組，休息幾乎 0 -> met === false', () => {
      const baseMs = new Date('2026-11-22T12:00:00.000Z').getTime();
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 5 * 1000;
      const restSec = 5;

      for (let i = 0; i < 10; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 9;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : restSec,
          timingIncomplete: false,
        });
        cursor = completedAt + restSec * 1000;
      }

      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 's_spam',
            sportType: 'strength',
            loggingMode: 'live_focus',
            timestamp: baseMs,
            sets,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, false);
      assert.equal(res.wouldCheckIn, false);
      assert.equal(res.strengthHint?.restRuleUnmet, true);
    });

    // 6. 循環訓練／HIIT 滿 10 分鐘、不走重訓三條件 → met；不滿 10 分鐘不 met
    test('循環訓練／HIIT：滿 10 分鐘達標，不滿 10 分鐘不達標', () => {
      const baseMs = new Date('2026-11-22T13:00:00.000Z').getTime();

      // 不滿 10 分鐘 (9 分鐘 = 540 秒)
      const resUnmet = evaluateCheckinValidity({
        sessions: [
          {
            id: 'hiit_short',
            sportType: 'circuit_hiit',
            durationSec: 540,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(resUnmet.met, false);
      assert.equal(resUnmet.remainingMinutesCeil, 1);

      // 滿 10 分鐘 (600 秒)
      const resMet = evaluateCheckinValidity({
        sessions: [
          {
            id: 'hiit_full',
            sportType: 'circuit_hiit',
            durationSec: 600,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(resMet.met, true);
      assert.equal(resMet.wouldCheckIn, true);
    });

    // 事後補記且無每組時間：總時長 ≥ 10 分鐘且 ≥ 2 組 → met
    test('事後補記無每組時間：總時長 >= 10 分鐘且 >= 2 組 -> met', () => {
      const baseMs = new Date('2026-11-22T13:30:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'backfill_strength',
            sportType: 'strength',
            loggingMode: 'after_the_fact',
            timingIncomplete: true,
            totalSets: 5,
            durationSec: 600,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(res.met, true);
      assert.equal(res.wouldCheckIn, true);
    });
  });

  describe('2. 多筆累積 (早上 5 分 + 晚上 5 分 / 瑜珈 + 快走)', () => {
    test('早上 5 分鐘快走 + 晚上 5 分鐘快走：單筆差 5 分，兩筆湊滿 10 分 met', () => {
      const morningMs = new Date('2026-11-22T08:00:00+08:00').getTime();
      const eveningMs = new Date('2026-11-22T18:00:00+08:00').getTime();

      const session1 = {
        id: 'walk_morning',
        sportType: 'walk',
        durationSec: 300,
        timestamp: morningMs,
      };

      const session2 = {
        id: 'walk_evening',
        sportType: 'walk',
        durationSec: 300,
        timestamp: eveningMs,
      };

      // 只有第一筆
      const res1 = evaluateCheckinValidity({
        sessions: [session1],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(res1.met, false);
      assert.equal(res1.minutesDone, 5);
      assert.equal(res1.remainingMinutesCeil, 5);
      assert.equal(res1.wouldCheckIn, false);

      // 加上第二筆
      const res2 = evaluateCheckinValidity({
        sessions: [session1, session2],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(res2.met, true);
      assert.equal(res2.minutesDone, 10);
      assert.equal(res2.remainingSec, 0);
      assert.equal(res2.wouldCheckIn, true);
    });

    test('早上瑜珈 5 分鐘 + 晚上快走 5 分鐘湊滿 10 分鐘', () => {
      const morningMs = new Date('2026-11-22T08:00:00+08:00').getTime();
      const eveningMs = new Date('2026-11-22T18:00:00+08:00').getTime();

      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'yoga',
            sportType: 'yoga_stretch',
            durationSec: 300,
            timestamp: morningMs,
          },
          {
            id: 'walk',
            sportType: 'walk',
            durationSec: 300,
            timestamp: eveningMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.minutesDone, 10);
      assert.equal(res.wouldCheckIn, true);
    });
  });

  describe('3. T4-D6 不合理數據排除與合理數據累加', () => {
    test('被判不合理的一筆不進入累加，另一筆合理的仍算；回傳 hasExcludedRecords 與 id', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();

      // 不合理：跑步 10km 僅花 10 分鐘 (時速 60 km/h > 25 km/h)
      const implausibleRun = {
        id: 'run_superman',
        sportType: 'run',
        distanceM: 10000,
        durationSec: 600,
        timestamp: baseMs,
      };

      // 合理：快走 10 分鐘 (時速 5 km/h)
      const plausibleWalk = {
        id: 'walk_normal',
        sportType: 'walk',
        distanceM: 800,
        durationSec: 600,
        timestamp: baseMs + 1000,
      };

      const res = evaluateCheckinValidity({
        sessions: [implausibleRun, plausibleWalk],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.hasExcludedRecords, true);
      assert.deepEqual(res.excludedRecordIds, ['run_superman']);
      assert.equal(res.records.length, 2);
      // plausibleWalk 達標 600 秒
      assert.equal(res.met, true);
      assert.equal(res.minutesDone, 10);
    });

    test('快走 12–25 km/h 詢問路徑仍算數進入累加', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();

      // 快走 15 km/h (12 < v <= 25) 跑 2.5km 花 10 分鐘 (600s)
      const briskWalk = {
        id: 'walk_fast',
        sportType: 'walk',
        distanceM: 2500,
        durationSec: 600,
        timestamp: baseMs,
      };

      const res = evaluateCheckinValidity({
        sessions: [briskWalk],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.hasExcludedRecords, false);
      assert.equal(res.met, true);
      assert.equal(res.records[0].countsTowardCheckin, true);
    });
  });

  describe('4. 「我不舒服」減半規則 (YuChien 11/14 11:00 已定案)', () => {
    test('重訓 1 組 endedUnwell、額度尚有剩餘 -> met 且 halfRuleApplied', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'strength_unwell',
            sportType: 'strength',
            totalSets: 1,
            durationSec: 60,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        unwellHalfUsedByWeek: { [getWeekKey(todayKey)]: 0 },
      });

      assert.equal(res.met, true);
      assert.equal(res.halfRuleApplied, true);
      assert.equal(res.halfRuleAvailable, true);
      assert.equal(res.wouldCheckIn, true);
      assert.equal(res.remainingSec, 0);
    });

    test('快走 5 分鐘 endedUnwell、額度尚有剩餘 -> met 且 halfRuleApplied', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_unwell',
            sportType: 'walk',
            durationSec: 300,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        unwellHalfUsedByWeek: { [getWeekKey(todayKey)]: 1 },
      });

      assert.equal(res.met, true);
      assert.equal(res.halfRuleApplied, true);
      assert.equal(res.unwellHalfUsed, 1);
      assert.equal(res.wouldCheckIn, true);
    });

    test('跑步 500 公尺 (距離一半) endedUnwell -> met 且 halfRuleApplied', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'run_half_dist',
            sportType: 'run',
            distanceM: 500,
            durationSec: 180,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.halfRuleApplied, true);
    });

    test('游泳 100 公尺 (距離一半) endedUnwell -> met 且 halfRuleApplied', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'swim_half_dist',
            sportType: 'swim',
            distanceM: 100,
            durationSec: 150,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.halfRuleApplied, true);
    });

    test('單車 1500 公尺 (距離一半) endedUnwell -> met 且 halfRuleApplied', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'cycle_half_dist',
            sportType: 'cycle',
            distanceM: 1500,
            durationSec: 240,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.halfRuleApplied, true);
    });

    test('未達一半 (快走 4 分鐘、距離 200m) endedUnwell -> met === false', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_under_half',
            sportType: 'walk',
            durationSec: 240,
            distanceM: 200,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, false);
      assert.equal(res.halfRuleApplied, false);
      assert.equal(res.wouldCheckIn, false);
    });

    test('本週已用 2 次後，第三次 endedUnwell 只達一半 -> 不套減半且 met === false', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_third_unwell',
            sportType: 'walk',
            durationSec: 300,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        unwellHalfUsedByWeek: { [getWeekKey(todayKey)]: 2 },
      });

      assert.equal(res.halfRuleAvailable, false);
      assert.equal(res.halfRuleApplied, false);
      assert.equal(res.met, false);
      assert.equal(res.wouldCheckIn, false);
    });

    test('已達完整門檻即使 endedUnwell 也不標 halfRuleApplied (不扣減半名額)', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_full_unwell',
            sportType: 'walk',
            durationSec: 600,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        unwellHalfUsedByWeek: { [getWeekKey(todayKey)]: 0 },
      });

      assert.equal(res.met, true);
      assert.equal(res.halfRuleApplied, false); // 不需要使用減半
      assert.equal(res.wouldCheckIn, true);
    });

    test('沒有任何運動紀錄、只有 caringDayKeys -> met === false, wouldCheckIn === false', () => {
      const res = evaluateCheckinValidity({
        sessions: [],
        dayKey: todayKey,
        now: baseNow,
        caringDayKeys: [todayKey],
      });

      assert.equal(res.met, false);
      assert.equal(res.halfRuleApplied, false);
      assert.equal(res.wouldCheckIn, false);
    });
  });

  describe('5. 日期隔離與未來日期不可補記', () => {
    test('前一天紀錄只與前一天累加，不與今天混算', () => {
      const yesterdayMs = new Date('2026-11-21T10:00:00.000Z').getTime();
      const todayMs = new Date('2026-11-22T10:00:00.000Z').getTime();

      const allSessions = [
        {
          id: 'walk_yest',
          sportType: 'walk',
          durationSec: 300,
          timestamp: yesterdayMs,
        },
        {
          id: 'walk_tod',
          sportType: 'walk',
          durationSec: 300,
          timestamp: todayMs,
        },
      ];

      // 判定今天：只有 5 分鐘，不達標
      const resToday = evaluateCheckinValidity({
        sessions: allSessions,
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(resToday.minutesDone, 5);
      assert.equal(resToday.met, false);

      // 判定昨天：只有 5 分鐘，不達標
      const resYesterday = evaluateCheckinValidity({
        sessions: allSessions,
        dayKey: yesterdayKey,
        now: baseNow,
      });
      assert.equal(resYesterday.minutesDone, 5);
      assert.equal(resYesterday.met, false);
    });

    test('未來日期：isFutureDate === true, wouldCheckIn === false', () => {
      const futureMs = new Date('2026-11-23T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_future',
            sportType: 'walk',
            durationSec: 600,
            timestamp: futureMs,
          },
        ],
        dayKey: futureDayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.isFutureDate, true);
      assert.equal(res.wouldCheckIn, false);
      assert.equal(res.wouldGrantRewards, false);
    });
  });

  describe('6. 休息日 + 有效運動', () => {
    test('休息日又有有效運動：isRestDay, met, wouldCheckIn 皆為 true (11:44 已定)', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_rest_day',
            sportType: 'walk',
            durationSec: 600,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        restDayKeys: [todayKey],
      });

      assert.equal(res.isRestDay, true);
      assert.equal(res.met, true);
      assert.equal(res.restDayStillChecksIn, true);
      assert.equal(res.wouldCheckIn, true);
      assert.equal(res.wouldGrantRewards, true); // 當天打卡
    });
  });

  describe('7. 補記過去某日與發獎 flag', () => {
    test('補記過去某日有效且未打卡：wouldCheckIn true, wouldGrantRewards false, isBackfill true', () => {
      const yesterdayMs = new Date('2026-11-21T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_backfill',
            sportType: 'walk',
            durationSec: 600,
            timestamp: yesterdayMs,
          },
        ],
        dayKey: yesterdayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.isBackfill, true);
      assert.equal(res.wouldCheckIn, true);
      assert.equal(res.wouldGrantRewards, false); // 補過去某日不發獎！
    });

    test('當天有效且未打卡：wouldCheckIn true, wouldGrantRewards true', () => {
      const todayMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_today',
            sportType: 'walk',
            durationSec: 600,
            timestamp: todayMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.isBackfill, false);
      assert.equal(res.wouldCheckIn, true);
      assert.equal(res.wouldGrantRewards, true);
    });

    test('該日已在 checkinDayKeys：alreadyCheckedIn true, wouldCheckIn false', () => {
      const todayMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_done',
            sportType: 'walk',
            durationSec: 600,
            timestamp: todayMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        checkinDayKeys: [todayKey],
      });

      assert.equal(res.alreadyCheckedIn, true);
      assert.equal(res.wouldCheckIn, false);
      assert.equal(res.wouldGrantRewards, false);
    });
  });

  describe('8. joinDayKey 帳號建立日限制', () => {
    test('早於帳號建立日：只算歷史，isBeforeAccount true, wouldCheckIn false', () => {
      const pastMs = new Date('2026-11-20T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_before_account',
            sportType: 'walk',
            durationSec: 600,
            timestamp: pastMs,
          },
        ],
        dayKey: '2026-11-20',
        now: baseNow,
        joinDayKey: '2026-11-21', // 帳號建於 11/21
      });

      assert.equal(res.met, true);
      assert.equal(res.isBeforeAccount, true);
      assert.equal(res.wouldCheckIn, false);
      assert.equal(res.wouldGrantRewards, false);
    });

    test('等於或晚於帳號建立日：正常打卡判定', () => {
      const joinMs = new Date('2026-11-21T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_on_join_day',
            sportType: 'walk',
            durationSec: 600,
            timestamp: joinMs,
          },
        ],
        dayKey: '2026-11-21',
        now: baseNow,
        joinDayKey: '2026-11-21',
      });

      assert.equal(res.met, true);
      assert.equal(res.isBeforeAccount, false);
      assert.equal(res.wouldCheckIn, true);
    });
  });

  describe('9. 補記一律不計入本週天數 (YuChien 11/28 決策卡 Q4) 與已結算週凍結', () => {
    test('同一週過去日補記：countsTowardWeeklyDays 一律為 false', () => {
      const yesterdayMs = new Date('2026-11-21T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_yest',
            sportType: 'walk',
            durationSec: 600,
            timestamp: yesterdayMs,
          },
        ],
        dayKey: yesterdayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.isBackfill, true);
      assert.equal(res.countsTowardWeeklyDays, false);
    });

    test('本週當天即時打卡：countsTowardWeeklyDays 為 true', () => {
      const todayMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_today',
            sportType: 'walk',
            durationSec: 600,
            timestamp: todayMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.isBackfill, false);
      assert.equal(res.countsTowardWeeklyDays, true);
    });

    test('上週 (已結算週)：countsTowardWeeklyDays 一律為 false (資安 11:48 凍結)', () => {
      const pastWeekMs = new Date('2026-11-15T10:00:00.000Z').getTime();

      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_settled_week',
            sportType: 'walk',
            durationSec: 600,
            timestamp: pastWeekMs,
          },
        ],
        dayKey: pastWeekDayKey,
        now: baseNow,
      });
      assert.equal(res.met, true);
      assert.equal(res.countsTowardWeeklyDays, false);
    });
  });

  describe('10. 健康 App 過去日延遲同步、門檻等於、無發獎欄位與設定覆寫', () => {
    test('健康 App 過去日紀錄不同步補算打卡 (10:36／11:45 已定)', () => {
      const yesterdayMs = new Date('2026-11-21T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'health_app_past',
            source: 'health_app',
            sportType: 'walk',
            durationSec: 1200,
            timestamp: yesterdayMs,
          },
        ],
        dayKey: yesterdayKey,
        now: baseNow,
      });

      assert.equal(res.met, false);
      assert.equal(res.wouldCheckIn, false);
      assert.equal(res.records[0].countsTowardCheckin, false);
    });

    test('健康 App 當天紀錄正常參與打卡計算', () => {
      const todayMs = new Date('2026-11-22T10:00:00.000Z').getTime();
      const res = evaluateCheckinValidity({
        sessions: [
          {
            id: 'health_app_today',
            source: 'health_app',
            sportType: 'walk',
            durationSec: 600,
            timestamp: todayMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal(res.met, true);
      assert.equal(res.wouldCheckIn, true);
      assert.equal(res.records[0].countsTowardCheckin, true);
    });

    test('等於門檻算達標 (>= 門檻，非嚴格大於)', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();

      // 時長恰好 10 分鐘 (600s)
      const resTime = evaluateCheckinValidity({
        sessions: [
          {
            id: 'exact_time',
            sportType: 'yoga_stretch',
            durationSec: 600,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(resTime.met, true);

      // 跑步恰好 1 公里 (1000m)
      const resRun = evaluateCheckinValidity({
        sessions: [
          {
            id: 'exact_run',
            sportType: 'run',
            distanceM: 1000,
            durationSec: 360,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(resRun.met, true);

      // 游泳恰好 200 公尺
      const resSwim = evaluateCheckinValidity({
        sessions: [
          {
            id: 'exact_swim',
            sportType: 'swim',
            distanceM: 200,
            durationSec: 300,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(resSwim.met, true);

      // 單車恰好 3 公里 (3000m)
      const resCycle = evaluateCheckinValidity({
        sessions: [
          {
            id: 'exact_cycle',
            sportType: 'cycle',
            distanceM: 3000,
            durationSec: 400,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
      });
      assert.equal(resCycle.met, true);
    });

    test('純判定保證：回傳結構絕不包含 coins 或 xp 金額發放欄位', () => {
      const res = evaluateCheckinValidity({
        sessions: [],
        dayKey: todayKey,
        now: baseNow,
      });

      assert.equal('coins' in res, false);
      assert.equal('xp' in res, false);
      assert.equal('coinsGranted' in res, false);
      assert.equal('xpGranted' in res, false);
      assert.equal('grantedCoins' in res, false);
      assert.equal('grantedXp' in res, false);
    });

    test('門檻與上限設定支援覆寫 (Config override)', () => {
      const baseMs = new Date('2026-11-22T10:00:00.000Z').getTime();

      // 將門檻提高為 15 分鐘 (900s)，則 10 分鐘 (600s) 不再達標
      const resHighThreshold = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_10m',
            sportType: 'walk',
            durationSec: 600,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        thresholds: {
          minMinutes: 15,
        },
      });
      assert.equal(resHighThreshold.met, false);
      assert.equal(resHighThreshold.minutesNeeded, 15);
      assert.equal(resHighThreshold.remainingMinutesCeil, 5);

      // 將每週減半額度調為 0，則無法使用減半
      const resZeroQuota = evaluateCheckinValidity({
        sessions: [
          {
            id: 'walk_unwell_zero_quota',
            sportType: 'walk',
            durationSec: 300,
            endedUnwell: true,
            timestamp: baseMs,
          },
        ],
        dayKey: todayKey,
        now: baseNow,
        config: {
          unwellHalfPerWeek: 0,
        },
      });
      assert.equal(resZeroQuota.halfRuleAvailable, false);
      assert.equal(resZeroQuota.met, false);
    });
  });
});
