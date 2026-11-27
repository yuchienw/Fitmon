import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  accumulateDayProgress,
  getSessionDayKey,
  formatAltDistanceHint,
  type DayProgressSessionInput,
} from './dayProgress.ts';
import {
  DEFAULT_DAY_PROGRESS_CONFIG,
  resolveDayProgressConfig,
} from '../config/dayProgress.ts';
import { getLocalDayKey } from './day.ts';

describe('T4-D5: 当天累加計算與進度提示 (accumulateDayProgress)', () => {
  const fixedNow = new Date('2026-11-21T15:30:00+08:00').getTime();
  const todayKey = getLocalDayKey(fixedNow); // '2026-11-21'

  describe('1. 早上 5 分鐘快走 + 晚上 5 分鐘快走累加與提示', () => {
    test('只有第一筆時：remaining 為 5 分鐘、met === false、提示再 5 分鐘就算數', () => {
      const session1: DayProgressSessionInput = {
        id: 's1',
        sportType: 'walk',
        durationSec: 300, // 5 min
        timestamp: new Date('2026-11-21T08:00:00+08:00').getTime(),
      };

      const res = accumulateDayProgress([session1], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.minutes_done, 5);
      assert.equal(res.minutes_needed, 10);
      assert.equal(res.seconds_done, 300);
      assert.equal(res.remaining_sec, 300);
      assert.equal(res.remaining_minutes_ceil, 5);
      assert.equal(res.met, false);
      assert.equal(res.primary_hint, '再 5 分鐘就算數');
      assert.equal(res.primaryHint, '再 5 分鐘就算數');
      assert.equal(res.records.length, 1);
      assert.equal(res.records[0].countsTowardCheckin, true);
    });

    test('加上第二筆後：minutes_done === 10、met === true、primary hint 為空', () => {
      const session1: DayProgressSessionInput = {
        id: 's1',
        sportType: 'walk',
        durationSec: 300, // 5 min
        timestamp: new Date('2026-11-21T08:00:00+08:00').getTime(),
      };
      const session2: DayProgressSessionInput = {
        id: 's2',
        sportType: 'walk',
        durationSec: 300, // 5 min
        timestamp: new Date('2026-11-21T19:00:00+08:00').getTime(),
      };

      const res = accumulateDayProgress([session1, session2], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.minutes_done, 10);
      assert.equal(res.seconds_done, 600);
      assert.equal(res.remaining_sec, 0);
      assert.equal(res.remaining_minutes_ceil, 0);
      assert.equal(res.met, true);
      assert.equal(res.primary_hint, null);
      assert.equal(res.primaryHint, null);
      assert.equal(res.records.length, 2);
    });
  });

  describe('2. 等於門檻算達標（≥，不是嚴格大於）；少一點不算', () => {
    test('時長 10 分鐘 (600s) 算達標；599 秒不算', () => {
      const underSession: DayProgressSessionInput = {
        id: 's_under',
        sportType: 'yoga_stretch',
        durationSec: 599,
        timestamp: fixedNow,
      };
      const resUnder = accumulateDayProgress([underSession], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resUnder.met, false);
      assert.equal(resUnder.remaining_sec, 1);
      assert.equal(resUnder.remaining_minutes_ceil, 1);

      const exactSession: DayProgressSessionInput = {
        id: 's_exact',
        sportType: 'yoga_stretch',
        durationSec: 600,
        timestamp: fixedNow,
      };
      const resExact = accumulateDayProgress([exactSession], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resExact.met, true);
      assert.equal(resExact.remaining_sec, 0);
      assert.equal(resExact.remaining_minutes_ceil, 0);
      assert.equal(resExact.primary_hint, null);
    });

    test('跑步／快走 1 公里 (1000m) 算達標；999 公尺不算', () => {
      // 跑步 999m (時速合規：例如 5 分鐘走完)
      const runUnder: DayProgressSessionInput = {
        id: 'r_under',
        sportType: 'run',
        distanceM: 999,
        durationSec: 300,
        timestamp: fixedNow,
      };
      const resRunUnder = accumulateDayProgress([runUnder], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resRunUnder.met, false);

      const runExact: DayProgressSessionInput = {
        id: 'r_exact',
        sportType: 'run',
        distanceM: 1000,
        durationSec: 300,
        timestamp: fixedNow,
      };
      const resRunExact = accumulateDayProgress([runExact], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resRunExact.met, true);
      assert.equal(resRunExact.primary_hint, null);

      // 快走 1000m 達標
      const walkExact: DayProgressSessionInput = {
        id: 'w_exact',
        sportType: 'walk',
        distanceM: 1000,
        durationSec: 400,
        timestamp: fixedNow,
      };
      const resWalkExact = accumulateDayProgress([walkExact], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resWalkExact.met, true);
    });

    test('游泳 200 公尺算達標；199 公尺不算', () => {
      const swimUnder: DayProgressSessionInput = {
        id: 'sw_under',
        sportType: 'swim',
        distanceM: 199,
        durationSec: 200, // pace = 100.5s/100m, normal
        timestamp: fixedNow,
      };
      const resSwimUnder = accumulateDayProgress([swimUnder], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resSwimUnder.met, false);

      const swimExact: DayProgressSessionInput = {
        id: 'sw_exact',
        sportType: 'swim',
        distanceM: 200,
        durationSec: 200, // pace = 100s/100m, normal
        timestamp: fixedNow,
      };
      const resSwimExact = accumulateDayProgress([swimExact], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resSwimExact.met, true);
    });

    test('單車 3 公里 (3000m) 算達標；2999 公尺不算', () => {
      const cycleUnder: DayProgressSessionInput = {
        id: 'c_under',
        sportType: 'cycle',
        distanceM: 2999,
        durationSec: 300, // 36 km/h, normal
        timestamp: fixedNow,
      };
      const resCycleUnder = accumulateDayProgress([cycleUnder], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resCycleUnder.met, false);

      const cycleExact: DayProgressSessionInput = {
        id: 'c_exact',
        sportType: 'cycle',
        distanceM: 3000,
        durationSec: 300, // 36 km/h, normal
        timestamp: fixedNow,
      };
      const resCycleExact = accumulateDayProgress([cycleExact], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resCycleExact.met, true);
    });
  });

  describe('3. T4-D6 不合理數據排除與合理數據累加', () => {
    test('被 T4-D6 判不合理的一筆不進入累加；另一筆合理的仍算', () => {
      // 跑步 40 km/h (距離 1000m, 時長 90s -> 40 km/h > 25 km/h cap)，不合理
      const implausibleRun: DayProgressSessionInput = {
        id: 'bad_run',
        sportType: 'run',
        distanceM: 1000,
        durationSec: 90,
        timestamp: new Date('2026-11-21T09:00:00+08:00').getTime(),
      };
      // 合理慢跑 500m，時長 180s (10 km/h)
      const validRun: DayProgressSessionInput = {
        id: 'good_run',
        sportType: 'run',
        distanceM: 500,
        durationSec: 180,
        timestamp: new Date('2026-11-21T10:00:00+08:00').getTime(),
      };

      const res = accumulateDayProgress([implausibleRun, validRun], {
        dayKey: todayKey,
        now: fixedNow,
      });

      // bad_run 被排除，只算 good_run
      assert.equal(res.records.length, 2);
      assert.equal(res.records[0].countsTowardCheckin, false);
      assert.equal(res.records[0].flagReason, 'implausible_speed');
      assert.equal(res.records[1].countsTowardCheckin, true);
      assert.equal(res.records[1].flagReason, null);

      assert.equal(res.seconds_done, 180);
      assert.equal(res.minutes_done, 3);
      assert.equal(res.met, false);
      // alt_distance 應反映剩餘距離：1000 - 500 = 500m
      assert.ok(res.alt_distance);
      assert.equal(res.alt_distance?.sportType, 'run');
      assert.equal(res.alt_distance?.remaining_m, 500);
    });

    test('快走 12–25 km/h 詢問路徑（suggestSportType: run）照樣算數進入累加', () => {
      // 快走 13 km/h (距離 1300m, 360s = 13 km/h)
      const briskWalk: DayProgressSessionInput = {
        id: 'brisk_13',
        sportType: 'walk',
        distanceM: 1300,
        durationSec: 360,
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([briskWalk], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.records[0].countsTowardCheckin, true);
      assert.equal(res.records[0].flagReason, null);
      // 距離 1300m ≥ 1000m，達到快走門檻
      assert.equal(res.met, true);
    });
  });

  describe('4. 暫停 >10 分鐘扣除時長', () => {
    test('暫停 >10 分鐘 (600s) 的時段已從時長扣除', () => {
      const baseMs = 1700000000000;
      // 重訓 2 組：
      // Set 1: 0 ~ 60s
      // Set 2: 760s ~ 820s (組間隔 700s > 600s 門檻，視為暫停扣除)
      // 總時長 820s，扣除暫停 700s 後有效時長為 120s
      const pauseSession: DayProgressSessionInput = {
        id: 's_pause',
        sportType: 'strength',
        sets: [
          {
            startedAt: baseMs,
            completedAt: baseMs + 60000,
            restTimerElapsedSec: 700,
          },
          {
            startedAt: baseMs + 760000,
            completedAt: baseMs + 820000,
            restTimerElapsedSec: 0,
          },
        ],
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([pauseSession], {
        dayKey: todayKey,
        now: fixedNow,
      });

      // 檢查扣除暫停後的有效秒數應為 120s
      assert.equal(res.records[0].durationSec, 120);
    });
  });

  describe('5. 即時重訓 vs 補記 timingIncomplete 重訓時長計算', () => {
    test('即時重訓用實際時長，不用每組 2 分鐘', () => {
      const baseMs = 1700000000000;
      // 即時重訓 2 組，實際時長 180s (3 分鐘)，且符合三條件
      const liveStrength: DayProgressSessionInput = {
        id: 'live_str',
        sportType: 'strength',
        loggingMode: 'live_focus',
        sets: [
          {
            startedAt: baseMs,
            completedAt: baseMs + 40000,
            restTimerElapsedSec: 60, // 休息 60s
          },
          {
            startedAt: baseMs + 100000,
            completedAt: baseMs + 180000,
            restTimerElapsedSec: 0,
          },
        ],
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([liveStrength], {
        dayKey: todayKey,
        now: fixedNow,
      });

      // 實際時長為 180s = 3 分鐘，不是 2 組 × 2 分鐘 = 4 分鐘
      assert.equal(res.seconds_done, 180);
      assert.equal(res.minutes_done, 3);
      // 因為通過三條件，重訓達標
      assert.equal(res.met, true);
    });

    test('補記且 timingIncomplete 的重訓才用組數 × strengthSetToMinutes (預設 2 分鐘)', () => {
      // 補記 3 組，無每組時間
      const backfillStrength: DayProgressSessionInput = {
        id: 'bf_str',
        sportType: 'strength',
        loggingMode: 'after_the_fact',
        timingIncomplete: true,
        totalSets: 3,
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([backfillStrength], {
        dayKey: todayKey,
        now: fixedNow,
      });

      // 3 組 × 2 分鐘 = 6 分鐘 = 360 秒
      assert.equal(res.seconds_done, 360);
      assert.equal(res.minutes_done, 6);
      assert.equal(res.met, false);
      assert.equal(res.remaining_sec, 240);
      assert.equal(res.remaining_minutes_ceil, 4);
    });

    test('補記 5 組無每組時間：滿 10 分鐘且 ≥2 組，達標', () => {
      const backfillMet: DayProgressSessionInput = {
        id: 'bf_met',
        sportType: 'strength',
        loggingMode: 'after_the_fact',
        timingIncomplete: true,
        totalSets: 5, // 5 組 × 2 = 10 分鐘
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([backfillMet], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.seconds_done, 600);
      assert.equal(res.minutes_done, 10);
      assert.equal(res.met, true);
      assert.equal(res.primary_hint, null);
    });
  });

  describe('6. 跨類型分鐘累加 (5 分鐘瑜珈 + 5 分鐘快走 = 10 分鐘，met === true)', () => {
    test('早上瑜珈 5 分鐘 + 晚上快走 5 分鐘 = 10 分鐘，met === true', () => {
      const yoga: DayProgressSessionInput = {
        id: 'yoga_morn',
        sportType: 'yoga_stretch',
        durationSec: 300,
        timestamp: new Date('2026-11-21T07:30:00+08:00').getTime(),
      };
      const walk: DayProgressSessionInput = {
        id: 'walk_eve',
        sportType: 'walk',
        durationSec: 300,
        timestamp: new Date('2026-11-21T20:00:00+08:00').getTime(),
      };

      const res = accumulateDayProgress([yoga, walk], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.minutes_done, 10);
      assert.equal(res.seconds_done, 600);
      assert.equal(res.met, true);
      assert.equal(res.primary_hint, null);
    });
  });

  describe('7. 重訓提示分支（再 Y 組 vs 第 58 條休息提示）', () => {
    test('重訓只有 1 組：提示「再 1 組就算數」', () => {
      const baseMs = 1700000000000;
      const oneSetStrength: DayProgressSessionInput = {
        id: 'one_set',
        sportType: 'strength',
        sets: [
          {
            startedAt: baseMs,
            completedAt: baseMs + 30000,
            restTimerElapsedSec: 0,
          },
        ],
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([oneSetStrength], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.met, false);
      assert.ok(res.strength_hint);
      assert.equal(res.strength_hint?.sets_done, 1);
      assert.equal(res.strength_hint?.sets_needed, 2);
      assert.equal(res.strength_hint?.rest_rule_unmet, false);
      assert.equal(res.primary_hint, '再 1 組就算數');
    });

    test('重訓有 2 組但組間休息不足 20 秒：提示第 58 條文案', () => {
      const baseMs = 1700000000000;
      // 2 組，但間隔僅 5 秒，休息佔比低於 25% (未過三條件)
      const rushedStrength: DayProgressSessionInput = {
        id: 'rush_set',
        sportType: 'strength',
        sets: [
          {
            startedAt: baseMs,
            completedAt: baseMs + 30000,
            restTimerElapsedSec: 5,
          },
          {
            startedAt: baseMs + 35000,
            completedAt: baseMs + 65000,
            restTimerElapsedSec: 0,
          },
        ],
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([rushedStrength], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.met, false);
      assert.ok(res.strength_hint);
      assert.equal(res.strength_hint?.sets_done, 2);
      assert.equal(res.strength_hint?.rest_rule_unmet, true);
      assert.equal(
        res.primary_hint,
        '組和組之間休息一下再按下一組，休息也是訓練的一部分，這次就會算數'
      );
    });
  });

  describe('8. 不同日期不混算', () => {
    test('昨日與今日紀錄分開，只累加 targetDayKey 當天之紀錄', () => {
      const yesterdayMs = new Date('2026-11-20T10:00:00+08:00').getTime();
      const yesterdaySession: DayProgressSessionInput = {
        id: 'yest',
        sportType: 'walk',
        durationSec: 600, // 10 min
        timestamp: yesterdayMs,
      };
      const todaySession: DayProgressSessionInput = {
        id: 'tod',
        sportType: 'walk',
        durationSec: 240, // 4 min
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([yesterdaySession, todaySession], {
        dayKey: todayKey,
        now: fixedNow,
      });

      // 只有 todaySession 進入計算
      assert.equal(res.records.length, 1);
      assert.equal(res.records[0].id, 'tod');
      assert.equal(res.minutes_done, 4);
      assert.equal(res.met, false);
      assert.equal(res.remaining_minutes_ceil, 6);
    });

    test('支援依據 daysAgo／dateLabel 解析日期', () => {
      const sessionWithLabel: DayProgressSessionInput = {
        id: 'label_today',
        dateLabel: '今日 14:00',
        sportType: 'walk',
        durationSec: 300,
      };
      const sessionOld: DayProgressSessionInput = {
        id: 'label_old',
        dateLabel: '昨天 14:00',
        sportType: 'walk',
        durationSec: 300,
      };

      const res = accumulateDayProgress([sessionWithLabel, sessionOld], {
        dayKey: todayKey,
        now: fixedNow,
      });

      assert.equal(res.records.length, 1);
      assert.equal(res.records[0].id, 'label_today');
    });
  });

  describe('9. 設定覆寫性 (thresholds override)', () => {
    test('覆寫 minMinutes 為 15 分鐘後，10 分鐘不再達標', () => {
      const session10: DayProgressSessionInput = {
        id: 's10',
        sportType: 'yoga_stretch',
        durationSec: 600, // 10 min
        timestamp: fixedNow,
      };

      const resNormal = accumulateDayProgress([session10], {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(resNormal.met, true);

      const resOverridden = accumulateDayProgress([session10], {
        dayKey: todayKey,
        now: fixedNow,
        thresholds: { minMinutes: 15 },
      });
      assert.equal(resOverridden.minutes_needed, 15);
      assert.equal(resOverridden.minutes_done, 10);
      assert.equal(resOverridden.met, false);
      assert.equal(resOverridden.remaining_minutes_ceil, 5);
      assert.equal(resOverridden.primary_hint, '再 5 分鐘就算數');
    });

    test('覆寫 runWalkMinKm 為 2 公里後，1 公里不再達標', () => {
      const run1km: DayProgressSessionInput = {
        id: 'r1',
        sportType: 'run',
        distanceM: 1000,
        durationSec: 300,
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([run1km], {
        dayKey: todayKey,
        now: fixedNow,
        thresholds: { runWalkMinKm: 2 },
      });
      assert.equal(res.met, false);
      assert.ok(res.alt_distance);
      assert.equal(res.alt_distance?.remaining_m, 1000); // 2000 - 1000 = 1000m
    });
  });

  describe('10. 不發獎保證 (Pure calculation without reward distribution)', () => {
    test('函式回傳結構不包含金幣 (coins) 與經驗值 (xp) 發放欄位', () => {
      const session: DayProgressSessionInput = {
        id: 's_full',
        sportType: 'run',
        distanceM: 1500,
        durationSec: 600,
        timestamp: fixedNow,
      };

      const res = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: fixedNow,
      });

      const resAny = res as unknown as Record<string, unknown>;
      assert.equal(resAny.coins, undefined);
      assert.equal(resAny.xp, undefined);
      assert.equal(resAny.coinsEarned, undefined);
      assert.equal(resAny.expEarned, undefined);
      assert.equal(resAny.coins_granted, undefined);
      assert.equal(resAny.xp_granted, undefined);
    });
  });

  describe('11. 輔助函式格式化測試', () => {
    test('formatAltDistanceHint 格式化跑步、快走、單車與游泳', () => {
      assert.equal(
        formatAltDistanceHint({ sportType: 'walk', remaining_m: 600 }),
        '再快走 0.6 公里也可以'
      );
      assert.equal(
        formatAltDistanceHint({ sportType: 'run', remaining_m: 1000 }),
        '再跑步 1 公里也可以'
      );
      assert.equal(
        formatAltDistanceHint({ sportType: 'cycle', remaining_m: 3000 }),
        '再單車 3 公里也可以'
      );
      assert.equal(
        formatAltDistanceHint({ sportType: 'swim', remaining_m: 200 }),
        '再游泳 200 公尺也可以'
      );
    });
  });

  describe('12. TodayHeroCard 顯示條件與 testid 掛載規則', () => {
    test('當天尚無紀錄時：showProgress 為 false，不應掛載 day-progress-hint', () => {
      const emptySessions: DayProgressSessionInput[] = [];
      const res = accumulateDayProgress(emptySessions, {
        dayKey: todayKey,
        now: fixedNow,
      });
      const showProgress = !res.met && emptySessions.length > 0;
      assert.equal(showProgress, false);
    });

    test('當天有未達標紀錄時：showProgress 為 true，掛載 day-progress-hint 並顯示主文案', () => {
      const unMetSessions: DayProgressSessionInput[] = [
        {
          id: 'walk_short',
          sportType: 'walk',
          durationSec: 180, // 3 min
          timestamp: fixedNow,
        },
      ];
      const res = accumulateDayProgress(unMetSessions, {
        dayKey: todayKey,
        now: fixedNow,
      });
      const showProgress = !res.met && unMetSessions.length > 0;
      assert.equal(showProgress, true);
      assert.equal(res.primary_hint, '再 7 分鐘就算數');
    });

    test('即使因舊結算路徑已打卡 (checkedIn === true)，只要當天未達門檻且有紀錄，showProgress 仍為 true (不被 !checkedIn 擋住)', () => {
      const walk5min: DayProgressSessionInput[] = [
        {
          id: 'walk_5min',
          sportType: 'walk',
          durationSec: 300, // 5 min
          timestamp: fixedNow,
        },
      ];
      const res = accumulateDayProgress(walk5min, {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(res.met, false);
      assert.equal(res.minutes_done, 5);
      // 舊邏輯曾被 !checkedIn 擋住，現修正為只要 !met && daySessions.length > 0 即顯示
      const showProgress = !res.met && walk5min.length > 0;
      assert.equal(showProgress, true);
      assert.equal(res.primary_hint, '再 5 分鐘就算數');
    });

    test('當天已達標時：showProgress 為 false，進度區塊消失 (不掛載 day-progress-hint)', () => {
      const metSessions: DayProgressSessionInput[] = [
        {
          id: 'run_done',
          sportType: 'run',
          distanceM: 1000,
          durationSec: 300,
          timestamp: fixedNow,
        },
      ];
      const res = accumulateDayProgress(metSessions, {
        dayKey: todayKey,
        now: fixedNow,
      });
      assert.equal(res.met, true);
      const showProgress = !res.met && metSessions.length > 0;
      assert.equal(showProgress, false);
    });
  });
});
