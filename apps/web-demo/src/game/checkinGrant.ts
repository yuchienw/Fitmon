/**
 * FitMon 首筆有效紀錄自動發打卡獎純函式 (T1-D2)
 *
 * 規則依據：
 * - /workspace/fitmon-tickets/T1-D2-auto-grant.md
 * - /workspace/fitmon-tickets/T1-daily-checkin-economy.md
 * - /workspace/fitmon-tickets/MASTER-PLAN.md 4.6
 * - /workspace/fitmon-tickets/T4-D9-after-the-fact-log.md（資安 11:48 最終版必修）
 *
 * 核心責任：
 * - 接收當日或指定日之判定結果 (CheckinValidityResult) 與狀態快照，產出純 patch 與結果。
 * - 純函式，不讀 Date.now()、不寫 store、不產生副作用。所有時間從 input.nowMs 來。
 * - 第 2 階段由 T1-S1 在伺服器 RPC 重跑同一套發獎決策。
 */

import {
  CHECKIN_COINS,
  CHECKIN_XP,
  POSE_UNLOCK_THRESHOLDS,
  OUTFIT_UNLOCK_THRESHOLDS,
  unlockedIdsForDays,
} from '../config/economy.ts';
import {
  type CheckinValidityConfig,
  resolveCheckinValidityConfig,
} from '../config/checkinValidity.ts';
import {
  getLocalDayKey,
  getWeekKey,
} from './day.ts';
import {
  type CheckinAnnotation,
  type CheckinLogEntry,
  type CheckinResultData,
  calculateLevelProgression,
  grantCoins,
  getDamageInfo,
} from './economyRules.ts';
import { type CheckinValidityResult } from './checkinValidity.ts';

export interface CheckinGrantStateSnapshot {
  lastCheckinDate: string | null;
  checkinDayKeys: string[];
  checkinLogs?: CheckinLogEntry[];
  level: number;
  exp: number;
  joinDayKey?: string | null;
  coins: number;
  coinsEarnedToday: number;
  coinsEarnedDayKey: string | null;
  doubleCoinUntil: number;
  unlockCheckinDays?: number;
  unwellHalfUsedByWeek?: Record<string, number> | null;
  unlockedPoseIds?: string[];
  unlockedOutfitIds?: string[];
}

export interface ApplyCheckinGrantInput {
  /** 欲結算的當地日期 (YYYY-MM-DD)，若未指定則以 nowMs 所在當地日為準 */
  dayKey?: string;
  /** 呼叫端傳入之基準現在時間毫秒數（純函式，不使用 Date.now()） */
  nowMs: number;
  /** T1-D1 evaluateCheckinValidity 的判定結果 */
  validity: CheckinValidityResult;
  /** 既有狀態快照 */
  state: CheckinGrantStateSnapshot;
  /** 可選加註 (annotation) */
  annotation?: CheckinAnnotation;
  /** 可選判定與發獎設定 */
  config?: Partial<CheckinValidityConfig>;
}

export interface CheckinGrantPatch {
  lastCheckinDate?: string;
  checkinDayKeys?: string[];
  checkinLogs?: CheckinLogEntry[];
  level?: number;
  exp?: number;
  coins?: number;
  coinsEarnedToday?: number;
  coinsEarnedDayKey?: string;
  unlockCheckinDays?: number;
  unwellHalfUsedByWeek?: Record<string, number>;
  unlockedPoseIds?: string[];
  unlockedOutfitIds?: string[];
}

export interface ApplyCheckinGrantResult {
  ok: boolean;
  granted: boolean;
  checkedIn: boolean;
  reason?:
    | 'already_checked_in'
    | 'not_met'
    | 'future_date'
    | 'before_account'
    | 'backfill_no_rewards'
    | 'ok';
  patch?: CheckinGrantPatch;
  result?: CheckinResultData;
}

/**
 * 首筆有效紀錄自動發打卡獎純函式 (applyCheckinGrant)
 */
export function applyCheckinGrant(
  input: ApplyCheckinGrantInput
): ApplyCheckinGrantResult {
  const { nowMs, validity, state, annotation } = input;
  const todayKey = getLocalDayKey(nowMs);
  const targetDayKey = input.dayKey || validity?.dayKey || todayKey;

  const resolvedConfig = resolveCheckinValidityConfig(input.config);

  const isFutureDate = targetDayKey > todayKey;
  const isBackfill = targetDayKey < todayKey;
  const isBeforeAccount = Boolean(
    state.joinDayKey && targetDayKey < state.joinDayKey
  );

  // 1. 不可補未來日期
  if (isFutureDate) {
    return {
      ok: false,
      granted: false,
      checkedIn: false,
      reason: 'future_date',
    };
  }

  // 2. 帳號建立日前只存歷史不算打卡
  if (isBeforeAccount) {
    return {
      ok: false,
      granted: false,
      checkedIn: false,
      reason: 'before_account',
    };
  }

  // 3. 檢查當天是否已經打過卡 (冪等 no-op)
  const isDayAlreadyCheckedIn =
    (state.checkinDayKeys || []).includes(targetDayKey) ||
    (targetDayKey === todayKey && state.lastCheckinDate === todayKey);

  if (isDayAlreadyCheckedIn) {
    return {
      ok: true,
      granted: false,
      checkedIn: false,
      reason: 'already_checked_in',
    };
  }

  // 4. 未達標：不寫打卡、不發幣、不發 XP、不增 unlockCheckinDays
  if (!validity || !validity.wouldCheckIn || !validity.met) {
    return {
      ok: true,
      granted: false,
      checkedIn: false,
      reason: 'not_met',
    };
  }

  // 5. 補過去某一天 (isBackfill === true 且 wouldGrantRewards === false)
  if (isBackfill || !validity.wouldGrantRewards) {
    const nextCheckinDayKeys = [
      ...(state.checkinDayKeys || []).filter((k) => k !== targetDayKey),
      targetDayKey,
    ].slice(-21);

    // checkinLogs 的 timestamp 為 nowMs，而 dayKey 為過去某天。
    // 呼叫端與 getDamageInfo 可從 getLocalDayKey(timestamp) !== dayKey 辨認為補記，不需新增 persist 欄位。
    const newLog: CheckinLogEntry = {
      dayKey: targetDayKey,
      timestamp: nowMs,
      annotation,
    };
    const nextCheckinLogs = [newLog, ...(state.checkinLogs || [])].slice(0, 30);

    return {
      ok: true,
      granted: false,
      checkedIn: true,
      reason: 'backfill_no_rewards',
      patch: {
        checkinDayKeys: nextCheckinDayKeys,
        checkinLogs: nextCheckinLogs,
      },
    };
  }

  // 6. 當日達標且 wouldGrantRewards === true (含休息日之後留下有效運動、當日事後補記使當天第一次達標)
  const nextCheckinDayKeys = [
    ...(state.checkinDayKeys || []).filter((k) => k !== targetDayKey),
    targetDayKey,
  ].slice(-21);

  const newLog: CheckinLogEntry = {
    dayKey: targetDayKey,
    timestamp: nowMs,
    annotation,
  };
  const nextCheckinLogs = [newLog, ...(state.checkinLogs || [])].slice(0, 30);

  // 發幣：受每日上限 90 限制（兩倍券時上限與收入皆翻倍至 180）
  const coinGrantRes = grantCoins(
    {
      coins: state.coins,
      coinsEarnedToday: state.coinsEarnedToday,
      coinsEarnedDayKey: state.coinsEarnedDayKey,
      doubleCoinUntil: state.doubleCoinUntil,
    },
    { amount: CHECKIN_COINS, source: 'checkin' },
    nowMs
  );

  // 發 XP 與升級計算
  const levelRes = calculateLevelProgression(
    state.level,
    state.exp,
    CHECKIN_XP
  );

  // unlockCheckinDays 僅在即時／當日有效打卡時 +1（只增不減）
  const nextUnlockDays = (state.unlockCheckinDays || 0) + 1;
  const nextPoseIds = Array.from(
    new Set([
      ...(state.unlockedPoseIds || []),
      ...unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, nextUnlockDays),
    ])
  );
  const nextOutfitIds = Array.from(
    new Set([
      ...(state.unlockedOutfitIds || []),
      ...unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, nextUnlockDays),
    ])
  );

  // 若套用「我不舒服」減半，寫入該週之已使用次數
  const targetWeekKey = getWeekKey(targetDayKey);
  const nextUnwellHalfUsedByWeek = { ...(state.unwellHalfUsedByWeek || {}) };
  if (validity.halfRuleApplied) {
    nextUnwellHalfUsedByWeek[targetWeekKey] =
      (nextUnwellHalfUsedByWeek[targetWeekKey] || 0) + 1;
  }

  // 計算傷害倍率與本週天數
  const damageInfo = getDamageInfo(
    {
      checkinDayKeys: nextCheckinDayKeys,
      joinDayKey: state.joinDayKey || todayKey,
      checkinLogs: nextCheckinLogs,
    },
    nowMs
  );

  const checkinResult: CheckinResultData = {
    xpGained: CHECKIN_XP,
    levelBefore: state.level,
    levelAfter: levelRes.levelAfter,
    expBefore: state.exp,
    expAfter: levelRes.expAfter,
    xpToNextBefore: levelRes.xpToNextBefore,
    xpToNextAfter: levelRes.xpToNextAfter,
    leveledUp: levelRes.leveledUp,
    daysThisWeek: damageInfo.daysThisWeek,
    damageMultiplier: damageInfo.damageMultiplier,
    isRookieFloor: damageInfo.isRookieFloor,
    coinsGranted: coinGrantRes.result.granted,
    capReached: coinGrantRes.result.capReached,
  };

  const patch: CheckinGrantPatch = {
    lastCheckinDate: todayKey,
    checkinDayKeys: nextCheckinDayKeys,
    checkinLogs: nextCheckinLogs,
    level: levelRes.levelAfter,
    exp: levelRes.expAfter,
    coins: coinGrantRes.patch.coins,
    coinsEarnedToday: coinGrantRes.patch.coinsEarnedToday,
    coinsEarnedDayKey: coinGrantRes.patch.coinsEarnedDayKey,
    unlockCheckinDays: nextUnlockDays,
    unwellHalfUsedByWeek: nextUnwellHalfUsedByWeek,
    unlockedPoseIds: nextPoseIds,
    unlockedOutfitIds: nextOutfitIds,
  };

  return {
    ok: true,
    granted: true,
    checkedIn: true,
    reason: 'ok',
    patch,
    result: checkinResult,
  };
}
