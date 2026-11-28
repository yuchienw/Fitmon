import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCheckinGrant,
  type CheckinGrantStateSnapshot,
} from './checkinGrant.ts';
import { evaluateCheckinValidity } from './checkinValidity.ts';
import { collectBackfillOnlyDayKeys, getDamageInfo } from './economyRules.ts';
import { getWeekKey } from './day.ts';

describe('FitMon Checkin Grant Pure Engine (T1-D2)', () => {
  const BASE_NOW_MS = new Date('2026-11-20T10:00:00+08:00').getTime(); // Friday
  const TODAY_KEY = '2026-11-20';

  const createInitialState = (
    overrides?: Partial<CheckinGrantStateSnapshot>
  ): CheckinGrantStateSnapshot => ({
    lastCheckinDate: null,
    checkinDayKeys: [],
    checkinLogs: [],
    level: 1,
    exp: 0,
    joinDayKey: '2026-11-01',
    coins: 100,
    coinsEarnedToday: 0,
    coinsEarnedDayKey: null,
    doubleCoinUntil: 0,
    unlockCheckinDays: 0,
    unwellHalfUsedByWeek: {},
    unlockedPoseIds: [],
    unlockedOutfitIds: [],
    ...overrides,
  });

  // 輔助：建立 10 分鐘有效快走紀錄
  const createValid10MinWalkSession = (dayKey: string, nowMs: number) => ({
    id: `walk_${dayKey}`,
    dayKey,
    timestamp: nowMs,
    sportType: 'walk' as const,
    durationSec: 600,
    distanceM: 800,
    source: 'in_app' as const,
    loggingMode: 'live_focus' as const,
  });

  // 輔助：建立 2 分鐘未達標散步紀錄
  const create2MinWalkSession = (dayKey: string, nowMs: number) => ({
    id: `walk_short_${dayKey}`,
    dayKey,
    timestamp: nowMs,
    sportType: 'walk' as const,
    durationSec: 120,
    distanceM: 100,
    source: 'in_app' as const,
    loggingMode: 'live_focus' as const,
  });

  test('當日第一次達標：發 +70 幣、+100 XP，寫 lastCheckinDate、checkinDayKeys、unlockCheckinDays +1', () => {
    const session = createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });
    assert.equal(validity.met, true);
    assert.equal(validity.wouldGrantRewards, true);

    const state = createInitialState();
    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.ok, true);
    assert.equal(grantRes.granted, true);
    assert.equal(grantRes.checkedIn, true);
    assert.equal(grantRes.reason, 'ok');
    assert.ok(grantRes.patch);
    assert.ok(grantRes.result);

    // 檢查發幣與上限
    assert.equal(grantRes.patch.coins, 170); // 100 + 70
    assert.equal(grantRes.patch.coinsEarnedToday, 70);
    assert.equal(grantRes.patch.coinsEarnedDayKey, TODAY_KEY);
    assert.equal(grantRes.result.coinsGranted, 70);
    assert.equal(grantRes.result.capReached, false);

    // 檢查 XP 與等級（Lv.1 需 100 XP 升 Lv.2）
    assert.equal(grantRes.patch.level, 2);
    assert.equal(grantRes.patch.exp, 0);
    assert.equal(grantRes.result.xpGained, 100);
    assert.equal(grantRes.result.leveledUp, true);
    assert.equal(grantRes.result.levelBefore, 1);
    assert.equal(grantRes.result.levelAfter, 2);

    // 檢查打卡狀態與 unlockCheckinDays
    assert.equal(grantRes.patch.lastCheckinDate, TODAY_KEY);
    assert.deepEqual(grantRes.patch.checkinDayKeys, [TODAY_KEY]);
    assert.equal(grantRes.patch.unlockCheckinDays, 1);
    assert.equal(grantRes.patch.checkinLogs?.length, 1);
    assert.equal(grantRes.patch.checkinLogs?.[0].dayKey, TODAY_KEY);
    assert.equal(grantRes.patch.checkinLogs?.[0].timestamp, BASE_NOW_MS);
  });

  test('冪等：同一輸入／套用 patch 後再呼叫，不再發獎、unlockCheckinDays 不加第二次', () => {
    const session = createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });

    const state = createInitialState();
    const firstCall = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });
    assert.equal(firstCall.granted, true);

    // 模擬將 firstCall.patch 套用至 state
    const patchedState: CheckinGrantStateSnapshot = {
      ...state,
      ...firstCall.patch,
    };

    // 重新跑判定（此時 checkinDayKeys 已包含今天）
    const validity2 = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
      checkinDayKeys: patchedState.checkinDayKeys,
    });

    const secondCall = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity: validity2,
      state: patchedState,
    });

    assert.equal(secondCall.ok, true);
    assert.equal(secondCall.granted, false);
    assert.equal(secondCall.checkedIn, false);
    assert.equal(secondCall.reason, 'already_checked_in');
    assert.equal(secondCall.patch, undefined);
    assert.equal(patchedState.unlockCheckinDays, 1); // 維持 1，不加第二次
    assert.equal(patchedState.coins, 170); // 不重複發幣
  });

  test('同一 local_date 第二筆有效紀錄：不發打卡幣／XP', () => {
    const session1 = createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const session2 = {
      id: `walk2_${TODAY_KEY}`,
      dayKey: TODAY_KEY,
      timestamp: BASE_NOW_MS + 3600000,
      sportType: 'walk' as const,
      durationSec: 900,
      distanceM: 1200,
      source: 'in_app' as const,
      loggingMode: 'live_focus' as const,
    };

    const stateAlreadyCheckedIn = createInitialState({
      lastCheckinDate: TODAY_KEY,
      checkinDayKeys: [TODAY_KEY],
      unlockCheckinDays: 1,
      coins: 170,
      coinsEarnedToday: 70,
      coinsEarnedDayKey: TODAY_KEY,
      level: 2,
      exp: 0,
    });

    const validity = evaluateCheckinValidity({
      sessions: [session1, session2],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS + 3600000,
      checkinDayKeys: stateAlreadyCheckedIn.checkinDayKeys,
    });
    assert.equal(validity.alreadyCheckedIn, true);
    assert.equal(validity.wouldCheckIn, false);
    assert.equal(validity.wouldGrantRewards, false);

    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS + 3600000,
      validity,
      state: stateAlreadyCheckedIn,
    });

    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.reason, 'already_checked_in');
    assert.equal(grantRes.patch, undefined);
  });

  test('未達標（例如 2 分鐘散步）：不發獎、不寫打卡', () => {
    const session = create2MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });
    assert.equal(validity.met, false);
    assert.equal(validity.wouldCheckIn, false);
    assert.equal(validity.wouldGrantRewards, false);

    const state = createInitialState();
    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.ok, true);
    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.checkedIn, false);
    assert.equal(grantRes.reason, 'not_met');
    assert.equal(grantRes.patch, undefined);
    assert.equal(state.coins, 100);
    assert.equal(state.unlockCheckinDays, 0);
    assert.equal(state.lastCheckinDate, null);
  });

  test('不合理數據（implausible 排除後未達標）：不發獎', () => {
    // 跑步時速 30 km/h (超過 25 km/h 上限，被排除)
    const implausibleRun = {
      id: 'fast_run',
      dayKey: TODAY_KEY,
      timestamp: BASE_NOW_MS,
      sportType: 'run' as const,
      durationSec: 600,
      totalDurationSec: 600,
      distanceM: 5000, // 30 km/h
      source: 'in_app' as const,
      loggingMode: 'live_focus' as const,
    };

    const validity = evaluateCheckinValidity({
      sessions: [implausibleRun],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });
    assert.equal(validity.hasExcludedRecords, true);
    assert.equal(validity.met, false);
    assert.equal(validity.wouldGrantRewards, false);

    const state = createInitialState();
    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.reason, 'not_met');
    assert.equal(grantRes.patch, undefined);
  });

  test('休息日 + 有效運動：仍打卡且發獎（當日）', () => {
    const session = createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
      restDayKeys: [TODAY_KEY], // 使用者今天先標記了休息日
    });
    assert.equal(validity.isRestDay, true);
    assert.equal(validity.restDayStillChecksIn, true);
    assert.equal(validity.met, true);
    assert.equal(validity.wouldGrantRewards, true);

    const state = createInitialState();
    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.granted, true);
    assert.equal(grantRes.patch?.coins, 170);
    assert.equal(grantRes.patch?.lastCheckinDate, TODAY_KEY);
    assert.equal(grantRes.patch?.unlockCheckinDays, 1);
  });

  test('不舒服折半達標（halfRuleApplied、wouldGrantRewards）：發完整 +70／+100，並增加該週 unwellHalfUsedByWeek', () => {
    // 散步 5 分鐘 (300 秒，滿 5 分鐘折半門檻) + endedUnwell
    const unwellWalkSession = {
      id: 'walk_unwell',
      dayKey: TODAY_KEY,
      timestamp: BASE_NOW_MS,
      sportType: 'walk' as const,
      durationSec: 300,
      totalDurationSec: 300,
      endedUnwell: true,
      source: 'in_app' as const,
      loggingMode: 'live_focus' as const,
    };

    const validity = evaluateCheckinValidity({
      sessions: [unwellWalkSession],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
      unwellHalfUsedByWeek: {},
    });
    assert.equal(validity.met, true);
    assert.equal(validity.halfRuleApplied, true);
    assert.equal(validity.wouldGrantRewards, true);

    const state = createInitialState();
    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.granted, true);
    // 發放完整打卡獎勵（不發明折半獎勵）
    assert.equal(grantRes.patch?.coins, 170);
    assert.equal(grantRes.result?.coinsGranted, 70);
    assert.equal(grantRes.result?.xpGained, 100);
    assert.equal(grantRes.patch?.unlockCheckinDays, 1);

    // 該週之 unwellHalfUsedByWeek 增加 1
    const weekKey = getWeekKey(TODAY_KEY); // '2026-11-16'
    assert.equal(grantRes.patch?.unwellHalfUsedByWeek?.[weekKey], 1);
  });

  test('補過去某一天、該日尚未打卡：寫入該日 checkinDayKeys，不發幣／XP，unlockCheckinDays 不變，lastCheckinDate 不變', () => {
    const PAST_DAY = '2026-11-18'; // 週三
    const pastSession = createValid10MinWalkSession(PAST_DAY, BASE_NOW_MS - 2 * 86400000);

    const validity = evaluateCheckinValidity({
      sessions: [pastSession],
      dayKey: PAST_DAY,
      now: BASE_NOW_MS,
      checkinDayKeys: [],
    });
    assert.equal(validity.isBackfill, true);
    assert.equal(validity.wouldCheckIn, true);
    assert.equal(validity.wouldGrantRewards, false);

    const state = createInitialState({
      lastCheckinDate: null,
      coins: 200,
      level: 3,
      exp: 50,
      unlockCheckinDays: 5,
    });

    const grantRes = applyCheckinGrant({
      dayKey: PAST_DAY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.ok, true);
    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.checkedIn, true);
    assert.equal(grantRes.reason, 'backfill_no_rewards');

    // 寫入 checkinDayKeys 與 checkinLogs
    assert.deepEqual(grantRes.patch?.checkinDayKeys, [PAST_DAY]);
    assert.equal(grantRes.patch?.checkinLogs?.length, 1);
    assert.equal(grantRes.patch?.checkinLogs?.[0].dayKey, PAST_DAY);
    assert.equal(grantRes.patch?.checkinLogs?.[0].timestamp, BASE_NOW_MS);

    // lastCheckinDate 不得被改為過去日期
    assert.equal(grantRes.patch?.lastCheckinDate, undefined);

    // 不發幣、不發 XP、不增 unlockCheckinDays
    assert.equal(grantRes.patch?.coins, undefined);
    assert.equal(grantRes.patch?.level, undefined);
    assert.equal(grantRes.patch?.exp, undefined);
    assert.equal(grantRes.patch?.unlockCheckinDays, undefined);
    assert.equal(state.unlockCheckinDays, 5);
  });

  test('補過去已打卡的一天：只 no-op，不發獎', () => {
    const PAST_DAY = '2026-11-18';
    const pastSession = createValid10MinWalkSession(PAST_DAY, BASE_NOW_MS - 2 * 86400000);

    const state = createInitialState({
      checkinDayKeys: [PAST_DAY],
    });

    const validity = evaluateCheckinValidity({
      sessions: [pastSession],
      dayKey: PAST_DAY,
      now: BASE_NOW_MS,
      checkinDayKeys: state.checkinDayKeys,
    });
    assert.equal(validity.alreadyCheckedIn, true);
    assert.equal(validity.wouldCheckIn, false);

    const grantRes = applyCheckinGrant({
      dayKey: PAST_DAY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.checkedIn, false);
    assert.equal(grantRes.reason, 'already_checked_in');
    assert.equal(grantRes.patch, undefined);
  });

  test('補未來日期：不寫、不發', () => {
    const FUTURE_DAY = '2026-11-25';
    const futureSession = createValid10MinWalkSession(FUTURE_DAY, BASE_NOW_MS + 5 * 86400000);

    const validity = evaluateCheckinValidity({
      sessions: [futureSession],
      dayKey: FUTURE_DAY,
      now: BASE_NOW_MS,
    });
    assert.equal(validity.isFutureDate, true);
    assert.equal(validity.wouldCheckIn, false);

    const state = createInitialState();
    const grantRes = applyCheckinGrant({
      dayKey: FUTURE_DAY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.ok, false);
    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.checkedIn, false);
    assert.equal(grantRes.reason, 'future_date');
    assert.equal(grantRes.patch, undefined);
  });

  test('當日補記（補今天）使第一次達標：發獎（wouldGrantRewards=true）', () => {
    // 例如下午手動事後補記今天早上的一堂課 (15 分鐘瑜珈)
    const session = {
      id: 'today_after_the_fact',
      dayKey: TODAY_KEY,
      timestamp: BASE_NOW_MS - 14400000, // 4 小時前
      sportType: 'yoga' as const,
      durationSec: 900,
      totalDurationSec: 900,
      durationMinutes: 15,
      source: 'after_the_fact' as const,
      loggingMode: 'after_the_fact' as const,
    };

    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });
    assert.equal(validity.met, true);
    assert.equal(validity.isBackfill, false);
    assert.equal(validity.wouldGrantRewards, true);

    const state = createInitialState();
    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.granted, true);
    assert.equal(grantRes.patch?.coins, 170);
    assert.equal(grantRes.patch?.unlockCheckinDays, 1);
  });

  test('舊狀態：lastCheckinDate 已是今天、沒有運動紀錄：不收回獎勵，再次呼叫不發第二次', () => {
    const state = createInitialState({
      lastCheckinDate: TODAY_KEY,
      checkinDayKeys: [TODAY_KEY],
      coins: 300,
      unlockCheckinDays: 3,
    });

    // 傳入空紀錄
    const validity = evaluateCheckinValidity({
      sessions: [],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
      checkinDayKeys: state.checkinDayKeys,
    });
    assert.equal(validity.alreadyCheckedIn, true);

    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.reason, 'already_checked_in');
    assert.equal(grantRes.patch, undefined);
    assert.equal(state.coins, 300); // 獎勵不收回
    assert.equal(state.unlockCheckinDays, 3);
  });

  test('手動／自動雙路徑：先套用自動發獎後，再模擬 checkin() 條件，不得再發', () => {
    const session = createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });

    const state = createInitialState();
    const autoGrant = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });
    assert.equal(autoGrant.granted, true);

    // 套用 patch
    const stateAfterAuto = {
      ...state,
      ...autoGrant.patch,
    };

    // 模擬手動 checkin() 嘗試呼叫 applyCheckinGrant
    const manualValidity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS + 1000,
      checkinDayKeys: stateAfterAuto.checkinDayKeys,
    });
    const manualGrant = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS + 1000,
      validity: manualValidity,
      state: stateAfterAuto,
    });

    assert.equal(manualGrant.granted, false);
    assert.equal(manualGrant.reason, 'already_checked_in');
  });

  test('結算幣已佔用上限時：打卡幣被夾住（例如 cap 90、已賺 30，打卡只入 60，capReached true）', () => {
    const session = createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });

    const stateWithWorkoutCoins = createInitialState({
      coins: 130, // 初始 100 + 結算幣 30
      coinsEarnedToday: 30, // 結算幣已佔用 30
      coinsEarnedDayKey: TODAY_KEY,
    });

    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state: stateWithWorkoutCoins,
    });

    assert.equal(grantRes.granted, true);
    // 90 cap - 30 used = 60 remaining capacity. 70 checkin coins clamped to 60.
    assert.equal(grantRes.result?.coinsGranted, 60);
    assert.equal(grantRes.result?.capReached, true);
    assert.equal(grantRes.patch?.coins, 190); // 130 + 60
    assert.equal(grantRes.patch?.coinsEarnedToday, 90);
  });

  test('兩倍券生效：打卡幣與上限加倍（70→140，上限 180），與既有 grantCoins 一致', () => {
    const session = createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS);
    const validity = evaluateCheckinValidity({
      sessions: [session],
      dayKey: TODAY_KEY,
      now: BASE_NOW_MS,
    });

    const stateWithDoubleCoupon = createInitialState({
      coins: 100,
      coinsEarnedToday: 0,
      coinsEarnedDayKey: TODAY_KEY,
      doubleCoinUntil: BASE_NOW_MS + 86400000, // 兩倍券生效中
    });

    const grantRes = applyCheckinGrant({
      dayKey: TODAY_KEY,
      nowMs: BASE_NOW_MS,
      validity,
      state: stateWithDoubleCoupon,
    });

    assert.equal(grantRes.granted, true);
    // 70 * 2 = 140 幣，上限 180，故完整獲得 140 幣
    assert.equal(grantRes.result?.coinsGranted, 140);
    assert.equal(grantRes.result?.capReached, false);
    assert.equal(grantRes.patch?.coins, 240); // 100 + 140
    assert.equal(grantRes.patch?.coinsEarnedToday, 140);
  });

  test('1. 同週補記不計入 daysThisWeek 與傷害倍率 (YuChien 11/28 決策卡 Q4)', () => {
    // 今天是週五 (2026-11-20)。包含今天 11-20 即時打卡，以及補記週二 11-17。
    // joinDayKey 為 11-01，非新手週，故 rookie floor 不適用。
    const state = {
      checkinDayKeys: ['2026-11-17', '2026-11-20'],
      joinDayKey: '2026-11-01',
      checkinLogs: [
        {
          dayKey: '2026-11-20',
          timestamp: BASE_NOW_MS, // 即時打卡
        },
        {
          dayKey: '2026-11-17',
          timestamp: BASE_NOW_MS, // 補記（timestamp 是今天 11-20，dayKey 是 11-17）
        },
      ],
    };

    const damageInfo = getDamageInfo(state, BASE_NOW_MS);
    assert.equal(damageInfo.daysThisWeek, 1);
    assert.equal(damageInfo.damageMultiplier, 1.0);
    assert.equal(damageInfo.multiplierTier, '1');
    assert.equal(damageInfo.isRookieFloor, false);
  });

  test('2. 當週零即時天數＋一筆同週補記：daysThisWeek === 0', () => {
    // 案例 A：一般玩家 (非新手週)，daysThisWeek === 0, damageMultiplier === 1.0
    const stateNonRookie = {
      checkinDayKeys: ['2026-11-17'],
      joinDayKey: '2026-11-01',
      checkinLogs: [
        {
          dayKey: '2026-11-17',
          timestamp: BASE_NOW_MS, // 11-20 補記 11-17
        },
      ],
    };
    const infoNonRookie = getDamageInfo(stateNonRookie, BASE_NOW_MS);
    assert.equal(infoNonRookie.daysThisWeek, 0);
    assert.equal(infoNonRookie.damageMultiplier, 1.0);
    assert.equal(infoNonRookie.isRookieFloor, false);

    // 案例 B：新手週 (joinDayKey 在當週 2026-11-16)，daysThisWeek 仍為 0，且 isRookieFloor 為 true (1.2)
    const stateRookie = {
      checkinDayKeys: ['2026-11-17'],
      joinDayKey: '2026-11-16',
      checkinLogs: [
        {
          dayKey: '2026-11-17',
          timestamp: BASE_NOW_MS,
        },
      ],
    };
    const infoRookie = getDamageInfo(stateRookie, BASE_NOW_MS);
    assert.equal(infoRookie.daysThisWeek, 0);
    assert.equal(infoRookie.isRookieFloor, true);
    assert.equal(infoRookie.damageMultiplier, 1.2);
  });

  test('3. 即時當日打卡照常計入本週天數與倍率', () => {
    // 兩天即時打卡 (週三 11-18 與 週五 11-20)
    const WED_MS = new Date('2026-11-18T10:00:00+08:00').getTime();
    const state = {
      checkinDayKeys: ['2026-11-18', '2026-11-20'],
      joinDayKey: '2026-11-01',
      checkinLogs: [
        {
          dayKey: '2026-11-18',
          timestamp: WED_MS, // 即時打卡
        },
        {
          dayKey: '2026-11-20',
          timestamp: BASE_NOW_MS, // 即時打卡
        },
      ],
    };

    const damageInfo = getDamageInfo(state, BASE_NOW_MS);
    assert.equal(damageInfo.daysThisWeek, 2);
    assert.equal(damageInfo.damageMultiplier, 1.2);
    assert.equal(damageInfo.multiplierTier, '2');
  });

  test('4. 補上週（已結算週）：不改變本週 daysThisWeek、不影響傷害倍率與寶箱資格', () => {
    // 今天是 2026-11-20 (W47)。補記上週二 2026-11-10 (W46)。
    const state = {
      checkinDayKeys: ['2026-11-10', '2026-11-20'],
      joinDayKey: '2026-11-01',
      checkinLogs: [
        {
          dayKey: '2026-11-20',
          timestamp: BASE_NOW_MS,
        },
        {
          dayKey: '2026-11-10',
          timestamp: BASE_NOW_MS, // 補記上週
        },
      ],
    };

    const info = getDamageInfo(state, BASE_NOW_MS);
    assert.equal(info.daysThisWeek, 1);
    assert.equal(info.damageMultiplier, 1.0);
  });

  test('6. applyCheckinGrant 過去日未達後補達標：checkedIn true, granted false, 無幣/XP, unlockCheckinDays 不變', () => {
    const PAST_DAY = '2026-11-17';
    const pastSession = createValid10MinWalkSession(
      PAST_DAY,
      BASE_NOW_MS - 3 * 86400000
    );

    const validity = evaluateCheckinValidity({
      sessions: [pastSession],
      dayKey: PAST_DAY,
      now: BASE_NOW_MS,
      checkinDayKeys: [],
    });
    assert.equal(validity.isBackfill, true);
    assert.equal(validity.wouldCheckIn, true);
    assert.equal(validity.wouldGrantRewards, false);

    const state = createInitialState({
      lastCheckinDate: null,
      coins: 200,
      level: 3,
      exp: 50,
      unlockCheckinDays: 5,
      checkinDayKeys: [],
    });

    const grantRes = applyCheckinGrant({
      dayKey: PAST_DAY,
      nowMs: BASE_NOW_MS,
      validity,
      state,
    });

    assert.equal(grantRes.ok, true);
    assert.equal(grantRes.granted, false);
    assert.equal(grantRes.checkedIn, true);
    assert.equal(grantRes.reason, 'backfill_no_rewards');

    // checkinDayKeys 包含該過去日
    assert.deepEqual(grantRes.patch?.checkinDayKeys, [PAST_DAY]);
    assert.equal(grantRes.patch?.checkinLogs?.length, 1);
    assert.equal(grantRes.patch?.checkinLogs?.[0].dayKey, PAST_DAY);
    assert.equal(grantRes.patch?.checkinLogs?.[0].timestamp, BASE_NOW_MS);

    // 不發幣、不發 XP、不增 unlockCheckinDays
    assert.equal(grantRes.patch?.coins, undefined);
    assert.equal(grantRes.patch?.level, undefined);
    assert.equal(grantRes.patch?.exp, undefined);
    assert.equal(grantRes.patch?.unlockCheckinDays, undefined);
    assert.equal(state.unlockCheckinDays, 5);
  });

  test('7. 舊存檔無 checkinLogs：checkinDayKeys 天數正常計入 (不誤判為補記)', () => {
    // 舊存檔只有 checkinDayKeys，沒有 checkinLogs (undefined 或空陣列)
    const stateWithoutLogs = {
      checkinDayKeys: ['2026-11-17', '2026-11-20'],
      joinDayKey: '2026-11-01',
      checkinLogs: undefined,
    };

    const damageInfo = getDamageInfo(stateWithoutLogs, BASE_NOW_MS);
    assert.equal(damageInfo.daysThisWeek, 2);
    assert.equal(damageInfo.damageMultiplier, 1.2);

    const stateWithEmptyLogs = {
      checkinDayKeys: ['2026-11-17', '2026-11-20'],
      joinDayKey: '2026-11-01',
      checkinLogs: [],
    };
    const damageInfoEmpty = getDamageInfo(stateWithEmptyLogs, BASE_NOW_MS);
    assert.equal(damageInfoEmpty.daysThisWeek, 2);
    assert.equal(damageInfoEmpty.damageMultiplier, 1.2);
  });

  test('8. collectBackfillOnlyDayKeys 輔助函式邏輯驗證', () => {
    assert.equal(collectBackfillOnlyDayKeys(undefined).size, 0);
    assert.equal(collectBackfillOnlyDayKeys([]).size, 0);

    const WED_MS = new Date('2026-11-18T10:00:00+08:00').getTime();
    const logs = [
      { dayKey: '2026-11-20', timestamp: BASE_NOW_MS }, // 即時打卡 (2026-11-20 === 2026-11-20)
      { dayKey: '2026-11-17', timestamp: BASE_NOW_MS }, // 補記 (2026-11-20 !== 2026-11-17)
      { dayKey: '2026-11-18', timestamp: WED_MS }, // 即時打卡 (2026-11-18 === 2026-11-18)
      { dayKey: '2026-11-18', timestamp: BASE_NOW_MS }, // 該日亦有補記，但已有即時打卡，故不是 backfill-only
    ];

    const backfillOnly = collectBackfillOnlyDayKeys(logs);
    assert.equal(backfillOnly.has('2026-11-17'), true);
    assert.equal(backfillOnly.has('2026-11-20'), false);
    assert.equal(backfillOnly.has('2026-11-18'), false);
  });
});
