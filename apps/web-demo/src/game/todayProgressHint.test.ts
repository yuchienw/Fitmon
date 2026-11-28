/**
 * FitMon Today 卡未達門檻進度提示單元測試 (T1-D4)
 *
 * 覆蓋驗收：
 * 1. 5 分鐘快走 (D4a)：主提示「再 5 分鐘就算數」、面板 5／10 分、10 格中 5 格滿、
 *    副列含「快走 5 分（已存好）」與「再快走 0.6 公里也可以」；有時間戳時含正確時段（早上／下午／晚上）。
 * 2. 重訓 1 組 (D4b)：主提示「再 1 組就算數」、面板「重訓 1／2 組」、2 格中 1 格滿、
 *    副列含「（已存好）」與「再做 1 組，組間休息一下就算數」、主按鈕為「繼續重訓」。
 * 3. 達標後 primary_hint 為 null、resolveTodayProgressHint 回傳 null，不再顯示還差多少。
 * 4. 時段切分（00:00-11:59 早上、12:00-17:59 下午、18:00-23:59 晚上）與無時間戳時省略時段（不隨意填「早上」）。
 * 5. 文案 58 在 rest_rule_unmet 且組數已夠 (>= 2) 時作為主提示，顯示琥珀提示框（含文案 58、59），且不含秒數或「休息太少」。
 *
 * 註記：
 * 專注模式秒級提示（例如「再 2 分 18 秒就算數」）及結算回饋待後續有設計定稿再行實作。
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimeOfDayPeriod,
  getSportZhName,
  formatMinutesSubText,
  formatSetsSubText,
  resolveTodayProgressHint,
} from './todayProgressHint.ts';
import {
  accumulateDayProgress,
  type DayProgressSessionInput,
} from './dayProgress.ts';
import { getLocalDayKey } from './day.ts';

describe('T1-D4 TodayProgressHint (進度提示面板純函式模型)', () => {
  // 基準時間：2026-11-28 14:00:00 (台北時間 下午)
  const baseNowMs = new Date('2026-11-28T14:00:00+08:00').getTime();
  const todayKey = getLocalDayKey(baseNowMs);

  describe('1. 時段切分 (getTimeOfDayPeriod) 與省略時段', () => {
    test('00:00-11:59 為「早上」', () => {
      const morning1 = new Date('2026-11-28T00:00:00+08:00').getTime();
      const morning2 = new Date('2026-11-28T08:30:00+08:00').getTime();
      const morning3 = new Date('2026-11-28T11:59:59+08:00').getTime();

      assert.equal(getTimeOfDayPeriod(morning1), '早上');
      assert.equal(getTimeOfDayPeriod(morning2), '早上');
      assert.equal(getTimeOfDayPeriod(morning3), '早上');
    });

    test('12:00-17:59 為「下午」', () => {
      const afternoon1 = new Date('2026-11-28T12:00:00+08:00').getTime();
      const afternoon2 = new Date('2026-11-28T15:20:00+08:00').getTime();
      const afternoon3 = new Date('2026-11-28T17:59:59+08:00').getTime();

      assert.equal(getTimeOfDayPeriod(afternoon1), '下午');
      assert.equal(getTimeOfDayPeriod(afternoon2), '下午');
      assert.equal(getTimeOfDayPeriod(afternoon3), '下午');
    });

    test('18:00-23:59 為「晚上」', () => {
      const night1 = new Date('2026-11-28T18:00:00+08:00').getTime();
      const night2 = new Date('2026-11-28T21:45:00+08:00').getTime();
      const night3 = new Date('2026-11-28T23:59:59+08:00').getTime();

      assert.equal(getTimeOfDayPeriod(night1), '晚上');
      assert.equal(getTimeOfDayPeriod(night2), '晚上');
      assert.equal(getTimeOfDayPeriod(night3), '晚上');
    });

    test('無時間戳或時間戳無效時回傳 null（省略時段，不猜「早上」）', () => {
      assert.equal(getTimeOfDayPeriod(undefined), null);
      assert.equal(getTimeOfDayPeriod(null), null);
      assert.equal(getTimeOfDayPeriod(0), null);
      assert.equal(getTimeOfDayPeriod(-100), null);
      assert.equal(getTimeOfDayPeriod(NaN), null);
    });
  });

  describe('2. 運動類型中文名稱對應 (getSportZhName)', () => {
    test('各運動類型對應正確中文', () => {
      assert.equal(getSportZhName('walk'), '快走');
      assert.equal(getSportZhName('run'), '跑步');
      assert.equal(getSportZhName('cycle'), '單車');
      assert.equal(getSportZhName('swim'), '游泳');
      assert.equal(getSportZhName('strength'), '重訓');
      assert.equal(getSportZhName('bodyweight'), '徒手');
      assert.equal(getSportZhName('yoga'), '瑜珈');
      assert.equal(getSportZhName('stretch'), '伸展');
      assert.equal(getSportZhName('yoga_stretch'), '瑜珈');
      assert.equal(getSportZhName('ball'), '球類');
      assert.equal(getSportZhName('circuit'), '循環訓練');
      assert.equal(getSportZhName('hiit'), 'HIIT');
      assert.equal(getSportZhName('circuit_hiit'), '循環訓練');
      assert.equal(getSportZhName('custom'), '自訂');
      assert.equal(getSportZhName(undefined), '運動');
      assert.equal(getSportZhName('unknown_type'), '運動');
    });
  });

  describe('3. D4a 分鐘變體：5 分鐘快走', () => {
    test('有時間戳（早上）+ 替代距離：主提示「再 5 分鐘就算數」、面板 5／10 分、10 格滿 5 格、副列含「早上 快走 5 分（已存好）・再快走 0.6 公里也可以」', () => {
      const morningTs = new Date('2026-11-28T09:15:00+08:00').getTime();
      const session: DayProgressSessionInput = {
        id: 's_walk_5m',
        sportType: 'walk',
        durationSec: 300, // 5 min
        distanceM: 400, // 快走 400m，門檻 1000m，還差 600m
        timestamp: morningTs,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.ok(hintModel);
      assert.equal(hintModel.variant, 'minutes');
      assert.equal(hintModel.primaryHint, '再 5 分鐘就算數');
      assert.equal(hintModel.panelTitle, '今天的運動 5／10 分');
      assert.equal(hintModel.panelTag, '可以累加');
      assert.equal(hintModel.totalSegments, 10);
      assert.equal(hintModel.filledSegments, 5);
      assert.equal(
        hintModel.subText,
        '早上 快走 5 分（已存好）・再快走 0.6 公里也可以'
      );
      assert.equal(hintModel.ctaText, '繼續運動');
      assert.equal(hintModel.amberAlert, null);
    });

    test('無時間戳時：省略時段，副列含「快走 5 分（已存好）」', () => {
      const session: DayProgressSessionInput = {
        id: 's_walk_no_ts',
        sportType: 'walk',
        durationSec: 300,
        distanceM: 400,
        daysAgo: 0,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.ok(hintModel);
      assert.equal(hintModel.variant, 'minutes');
      assert.equal(hintModel.panelTitle, '今天的運動 5／10 分');
      assert.equal(
        hintModel.subText,
        '快走 5 分（已存好）・再快走 0.6 公里也可以'
      );
    });

    test('無距離運動（如瑜珈）：副列只有時長，不接距離副提示', () => {
      const afternoonTs = new Date('2026-11-28T14:30:00+08:00').getTime();
      const session: DayProgressSessionInput = {
        id: 's_yoga_6m',
        sportType: 'yoga_stretch',
        durationSec: 360, // 6 min
        timestamp: afternoonTs,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.ok(hintModel);
      assert.equal(hintModel.variant, 'minutes');
      assert.equal(hintModel.primaryHint, '再 4 分鐘就算數');
      assert.equal(hintModel.panelTitle, '今天的運動 6／10 分');
      assert.equal(hintModel.subText, '下午 瑜珈 6 分（已存好）');
      assert.equal(hintModel.filledSegments, 6);
    });

    test('多筆紀錄時：以當天最新一筆有效紀錄說明副列，面板分鐘為累加總數', () => {
      const s1: DayProgressSessionInput = {
        id: 's1',
        sportType: 'yoga_stretch',
        durationSec: 180, // 3 min
        timestamp: new Date('2026-11-28T08:00:00+08:00').getTime(),
      };
      const s2: DayProgressSessionInput = {
        id: 's2',
        sportType: 'walk',
        durationSec: 240, // 4 min
        timestamp: new Date('2026-11-28T13:00:00+08:00').getTime(),
      };

      const dayProgress = accumulateDayProgress([s1, s2], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [s1, s2],
        now: baseNowMs,
      });

      assert.ok(hintModel);
      assert.equal(hintModel.variant, 'minutes');
      assert.equal(hintModel.primaryHint, '再 3 分鐘就算數');
      assert.equal(hintModel.panelTitle, '今天的運動 7／10 分');
      assert.equal(hintModel.filledSegments, 7);
      // 最新一筆是 13:00 下午 快走 4 分
      assert.ok(hintModel.subText.startsWith('下午 快走 4 分（已存好）'));
    });
  });

  describe('4. D4b 組數變體：重訓 1 組', () => {
    test('最新為重訓 1 組且組數不足：主提示「再 1 組就算數」、面板「重訓 1／2 組」、2 格滿 1 格、副列含「（已存好）」與「再做 1 組，組間休息一下就算數。」、CTA「繼續重訓」', () => {
      const session: DayProgressSessionInput = {
        id: 's_strength_1set',
        sportType: 'strength',
        loggingMode: 'live_focus',
        exerciseLogs: [
          {
            exerciseId: 'barbell_squat',
            exerciseNameZh: '深蹲',
            sets: [
              {
                weightKg: 60,
                reps: 10,
                startedAt: baseNowMs - 60000,
                completedAt: baseNowMs - 15000,
              },
            ],
          },
        ],
        timestamp: baseNowMs,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.ok(hintModel);
      assert.equal(hintModel.variant, 'sets');
      assert.equal(hintModel.primaryHint, '再 1 組就算數');
      assert.equal(hintModel.panelTitle, '重訓 1／2 組');
      assert.equal(hintModel.panelTag, '紀錄已存');
      assert.equal(hintModel.totalSegments, 2);
      assert.equal(hintModel.filledSegments, 1);
      assert.equal(
        hintModel.subText,
        '深蹲 1 組（已存好）。再做 1 組，組間休息一下就算數。'
      );
      assert.equal(hintModel.ctaText, '繼續重訓');
      // 組數還差時不得顯示琥珀框
      assert.equal(hintModel.amberAlert, null);
    });

    test('無 exerciseNameZh 時退回「重訓」', () => {
      const session: DayProgressSessionInput = {
        id: 's_str_no_name',
        sportType: 'strength',
        loggingMode: 'live_focus',
        totalSets: 1,
        sets: [
          {
            startedAt: baseNowMs - 60000,
            completedAt: baseNowMs - 15000,
          },
        ],
        timestamp: baseNowMs,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.ok(hintModel);
      assert.equal(hintModel.variant, 'sets');
      assert.equal(
        hintModel.subText,
        '重訓 1 組（已存好）。再做 1 組，組間休息一下就算數。'
      );
    });
  });

  describe('5. 文案 58 與 rest-rule 變體（組數夠但休息規則未滿足）', () => {
    test('連按 2 組（無組間休息）：主提示為文案 58、不含秒數或百分比或「休息太少」，顯示琥珀提示框（文案 58 + 59）', () => {
      // 兩組幾乎連按，休息佔比不到 20 秒
      const rapidSets = [
        {
          weightKg: 50,
          reps: 10,
          startedAt: baseNowMs - 90000,
          completedAt: baseNowMs - 60000, // 30s
          restTimerElapsedSec: 2, // 休息僅 2 秒
        },
        {
          weightKg: 50,
          reps: 10,
          startedAt: baseNowMs - 58000,
          completedAt: baseNowMs - 28000, // 30s
        },
      ];

      const session: DayProgressSessionInput = {
        id: 's_strength_rapid',
        sportType: 'strength',
        loggingMode: 'live_focus',
        sets: rapidSets,
        exerciseLogs: [
          {
            exerciseId: 'barbell_squat',
            exerciseNameZh: '槓鈴深蹲',
            sets: rapidSets,
          },
        ],
        timestamp: baseNowMs,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      assert.equal(dayProgress.met, false);
      assert.ok(dayProgress.strength_hint);
      assert.equal(dayProgress.strength_hint.sets_done, 2);
      assert.equal(dayProgress.strength_hint.rest_rule_unmet, true);
      assert.equal(
        dayProgress.primary_hint,
        '組和組之間休息一下再按下一組，休息也是訓練的一部分，這次就會算數'
      );

      // 驗證主提示不包含秒數、百分比、或「休息太少」
      assert.doesNotMatch(dayProgress.primary_hint, /\d+秒/);
      assert.doesNotMatch(dayProgress.primary_hint, /%/);
      assert.doesNotMatch(dayProgress.primary_hint, /休息太少/);

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.ok(hintModel);
      assert.equal(hintModel.variant, 'rest-rule');
      assert.equal(
        hintModel.primaryHint,
        '組和組之間休息一下再按下一組，休息也是訓練的一部分，這次就會算數'
      );
      assert.equal(hintModel.panelTitle, '重訓 2／2 組');
      assert.equal(hintModel.panelTag, '紀錄已存');
      assert.equal(hintModel.totalSegments, 2);
      assert.equal(hintModel.filledSegments, 2);
      assert.equal(hintModel.subText, '槓鈴深蹲 2 組（已存好）');
      assert.equal(hintModel.ctaText, '繼續重訓');

      // 驗證琥珀提示框（文案 58 與文案 59）
      assert.ok(hintModel.amberAlert);
      assert.equal(hintModel.amberAlert.title, '其他提示：');
      assert.equal(hintModel.amberAlert.lines.length, 2);
      assert.equal(
        hintModel.amberAlert.lines[0],
        '組和組之間休息一下再按下一組，休息也是訓練的一部分，這次就會算數'
      );
      assert.equal(
        hintModel.amberAlert.lines[1],
        '或換個運動，再 10 分鐘也算數'
      );

      // 琥珀框內亦不含秒數、百分比、或「休息太少」
      const alertCombined = hintModel.amberAlert.lines.join(' ');
      assert.doesNotMatch(alertCombined, /\d+秒/);
      assert.doesNotMatch(alertCombined, /%/);
      assert.doesNotMatch(alertCombined, /休息太少/);
    });
  });

  describe('6. 達標後 primary_hint 為 null，UI 不顯示提示面板', () => {
    test('10 分鐘快走達標：primary_hint === null，resolveTodayProgressHint 回傳 null', () => {
      const session: DayProgressSessionInput = {
        id: 's_walk_10m',
        sportType: 'walk',
        durationSec: 600, // 10 min
        timestamp: baseNowMs,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      assert.equal(dayProgress.met, true);
      assert.equal(dayProgress.primary_hint, null);

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.equal(hintModel, null);
    });

    test('重訓標準 2 組 (休息充裕) 達標：primary_hint === null，resolveTodayProgressHint 回傳 null', () => {
      const sets = [
        {
          weightKg: 60,
          reps: 10,
          startedAt: baseNowMs - 300000,
          completedAt: baseNowMs - 260000, // 40s
          restTimerElapsedSec: 120, // 休息 120s (75%)
        },
        {
          weightKg: 60,
          reps: 10,
          startedAt: baseNowMs - 140000,
          completedAt: baseNowMs - 100000, // 40s
        },
      ];

      const session: DayProgressSessionInput = {
        id: 's_strength_pass',
        sportType: 'strength',
        loggingMode: 'live_focus',
        sets,
        timestamp: baseNowMs,
      };

      const dayProgress = accumulateDayProgress([session], {
        dayKey: todayKey,
        now: baseNowMs,
      });

      assert.equal(dayProgress.met, true);
      assert.equal(dayProgress.primary_hint, null);

      const hintModel = resolveTodayProgressHint({
        dayProgress,
        daySessions: [session],
        now: baseNowMs,
      });

      assert.equal(hintModel, null);
    });
  });

  describe('7. 專注模式與結算回饋規格註記', () => {
    test('註記：專注模式秒級提示（如「再 2 分 18 秒就算數」）及結算回饋待有設計稿再實作', () => {
      // 本單工單範圍為 Today 卡 D4a／D4b 提示面板
      assert.ok(true);
    });
  });
});
