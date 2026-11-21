/**
 * FitMon 存檔遷移與 V3/V4 預設值純函式庫 (T3-D3 / T4-D1)
 *
 * Persist key: fitmon-mvp-storage-v6
 * Persist version: 4
 *
 * 鏈式遷移順序：2→3 (社群、邀請、通知等) → 4 (T4-D1 多種運動紀錄資料模型與 T1/T5 本地存檔欄位)。
 * 本模組提供純函式 migratePersistedState, ensureV3Defaults 及 ensureV4Defaults，
 * 確保從舊版（v0/v1/v2 或 v3 存檔）升級時具備完整串行冪等性，
 * 且不刪除或竄改任何金幣、等級、經驗值、打卡紀錄、好友名單、戰隊資訊或歷史運動統計。
 */

import {
  STAMINA_MAX,
  DEFAULT_ADULT_INVITE_FROM,
  DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
  MINOR_PRIVACY,
  POSE_UNLOCK_THRESHOLDS,
  OUTFIT_UNLOCK_THRESHOLDS,
  unlockedIdsForDays,
} from '../config/economy.ts';
import {
  type WorkoutSessionSportType,
  VALID_WORKOUT_SESSION_SPORT_TYPES,
  mapLegacyExerciseToSportType,
  isLoggedSetTimingComplete,
  isWorkoutSessionTimingComplete,
  computePersistedSetFields,
  finalizePreviousSetRest,
  selectIsRestDay,
  selectUnwellHalfUsed,
  selectSelfCheckCompleted,
  selectOnboardingCompleted,
  selectOnboardingWorkoutHintSeen,
  selectOnboardingSortieHintSeen,
} from './workoutRecord.ts';

export type { WorkoutSessionSportType };
export {
  VALID_WORKOUT_SESSION_SPORT_TYPES,
  mapLegacyExerciseToSportType,
  isLoggedSetTimingComplete,
  isWorkoutSessionTimingComplete,
  computePersistedSetFields,
  finalizePreviousSetRest,
  selectIsRestDay,
  selectUnwellHalfUsed,
  selectSelfCheckCompleted,
  selectOnboardingCompleted,
  selectOnboardingWorkoutHintSeen,
  selectOnboardingSortieHintSeen,
};

/** 本地玩家 ID（單一真理來源，與 squadInviteRules 保持一致） */
export const DEMO_PLAYER_ID = 'self';

/** 通知保留上限（50 筆）與保留期限（30 天） */
export const NOTIFICATIONS_CAP = 50;
export const NOTIFICATIONS_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

/** 邀請送出記錄保留期限（7 天） */
export const INVITE_SEND_LOG_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 玩家代碼字元集（資安 11/20 規範）：
 * 嚴格排除 0, O, 1, I, L，共計 31 個字元（8 位數字 + 23 位大寫英文字母）。
 */
export const PLAYER_CODE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * 產生 8 字元無歧義大寫之玩家代碼。
 * 試玩用，第 2 階段由伺服器產生。
 * 使用 crypto.getRandomValues 與拒絕採樣 (rejection sampling) 避免 modulo bias。
 * 256 % 31 === 8，排除 raw bytes >= 248。
 */
export function generatePlayerCode(): string {
  // 試玩用，第 2 階段由伺服器產生
  const limit = 256 - (256 % PLAYER_CODE_CHARSET.length); // 248
  let code = '';
  while (code.length < 8) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length && code.length < 8; i++) {
      const b = bytes[i];
      if (b < limit) {
        code += PLAYER_CODE_CHARSET[b % PLAYER_CODE_CHARSET.length];
      }
    }
  }
  return code;
}

/**
 * 格式化玩家代碼顯示（4+4 帶連字號，例如 ABCD-EFGH）。
 * 若長度非 8 則原樣返回或安全退回。
 */
export function formatPlayerCode(code: string): string {
  if (typeof code !== 'string' || code.length !== 8) {
    return code ?? '';
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * 標準化玩家代碼輸入：忽略空格與連字號，轉大寫。
 */
export function normalizePlayerCode(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[\s-]+/g, '').toUpperCase();
}

/** 玩家代碼重新生成冷卻時間：24 小時 */
export const PLAYER_CODE_REGEN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * 檢查是否可重新生成玩家代碼（距上次生成需滿 24 小時）。
 */
export function canRegeneratePlayerCode(
  generatedAt?: number | null,
  now?: number
): boolean {
  if (typeof generatedAt !== 'number' || !Number.isFinite(generatedAt) || generatedAt <= 0) {
    return true;
  }
  const current = typeof now === 'number' ? now : Date.now();
  return (current - generatedAt) >= PLAYER_CODE_REGEN_COOLDOWN_MS;
}

/**
 * 重新生成玩家代碼。
 * 若冷卻尚未結束，保持現有 code 與 timestamp 不變；
 * 若冷卻已過，寫入新 code 與新 timestamp（舊代碼立即失效，不留歷史）。
 */
export function regeneratePlayerCode<T extends Record<string, unknown>>(
  state: T,
  now?: number
): T {
  const current = typeof now === 'number' ? now : Date.now();
  const rec = state as Record<string, unknown>;
  const lastGen = rec.playerCodeGeneratedAt as number | null | undefined;
  if (canRegeneratePlayerCode(lastGen, current)) {
    rec.playerCode = generatePlayerCode(); // 試玩用，第 2 階段由伺服器產生
    rec.playerCodeGeneratedAt = current;
  }
  return state;
}

export interface FriendRequestItem {
  id: string;
  fromId: string;
  toId: string;
  status: string;
  createdAt: number;
}

export interface RecentTeammateItem {
  id: string;
  lastTogetherAt: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  actorId?: string;
  refId?: string;
  squadName?: string;
  createdAt: number;
  readAt?: number | null;
  status?: string;
  expiresAt?: number | null;
}

export interface InviteSendLogItem {
  targetId: string;
  sentAt: number;
  outcome?: string;
}

export interface PlayerPrivacySettings {
  inviteFrom: 'everyone' | 'friends';
  discoverableByCode: boolean;
}

/**
 * 檢舉紀錄項目。
 * 資安規定：reportLog 僅為本地持久化欄位，絕不得傳送至伺服器或分析工具，
 * 且檢舉理由自由文字（reason）絕不得以 console.log / info / debug / warn 輸出至主控台，以策資安與隱私。
 */
export interface ReportLogItem {
  id: string;
  targetId: string;
  reason?: string;
  createdAt: number;
}

/**
 * 新增本地檢舉紀錄（純本地紀錄，不輸出 console，不發送外部網路）。
 */
export function appendLocalReportLog(
  state: Record<string, unknown>,
  entry: { id?: string; targetId: string; reason?: string; createdAt?: number }
): void {
  if (!Array.isArray(state.reportLog)) {
    state.reportLog = [];
  }
  const reportItem: ReportLogItem = {
    id: entry.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rep_${Date.now()}`),
    targetId: entry.targetId,
    reason: entry.reason,
    createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
  };
  (state.reportLog as ReportLogItem[]).push(reportItem);
}

/**
 * Migration seed rule:
 * 今天 App 尚無補卡功能，且 CheckinLogEntry 僅記錄 { dayKey, timestamp, annotation? }，
 * 並無 backfill 標記。目前系統中唯一的打卡寫入點是 economyRules.ts 的當日 checkin()，
 * 因此既有的 checkinDayKeys 與 checkinLogs 可可靠地視為有效之即時打卡（非補卡）。
 *
 * 種子計算規則：
 * 統計 checkinDayKeys 與 checkinLogs 中所有不重複且 dayKey >= joinDayKey 的天數。
 * 當 joinDayKey 為真實 YYYY-MM-DD 時，早於加入日之紀錄不計入；
 * 若 joinDayKey 為舊玩家哨兵值 '1970-01-01'，該值僅代表非新手（不享有 rookie floor），
 * 其打卡仍是由 checkin() 即時寫入，故全數計入。
 * 若無任何符合紀錄，則種子為 0。已持久化之計數絕不縮減。
 */
export function calculateSeedUnlockCheckinDays(state: Record<string, unknown>): number {
  const dayKeySet = new Set<string>();
  if (Array.isArray(state.checkinDayKeys)) {
    for (const key of state.checkinDayKeys) {
      if (typeof key === 'string' && key.trim()) {
        dayKeySet.add(key.trim());
      }
    }
  }
  if (Array.isArray(state.checkinLogs)) {
    for (const log of state.checkinLogs) {
      if (log && typeof log === 'object' && typeof (log as any).dayKey === 'string' && (log as any).dayKey.trim()) {
        dayKeySet.add((log as any).dayKey.trim());
      }
    }
  }

  const rawJoinDayKey = typeof state.joinDayKey === 'string' ? state.joinDayKey.trim() : '';
  const isRealYmd = /^\d{4}-\d{2}-\d{2}$/.test(rawJoinDayKey);
  const isSentinel = rawJoinDayKey === '1970-01-01';

  let count = 0;
  for (const day of dayKeySet) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (isSentinel || !isRealYmd || day >= rawJoinDayKey) {
      count++;
    }
  }
  return count;
}

/**
 * 確保狀態具備所有 V3 欄位與預設值（冪等函式）。
 * 若欄位已存在且型別正確，則保留現有值（絕不洗掉、重新產生或洗牌）。
 */
export function ensureV3Defaults(
  state: Record<string, unknown>,
  now?: number
): Record<string, unknown> {
  const clockNow = typeof now === 'number' ? now : Date.now();

  // 1. 保留並補齊既有 D3 組隊基礎欄位
  if (!Array.isArray(state.squadInvites)) {
    state.squadInvites = [];
  }
  if (typeof state.currentSquadId !== 'string' || !state.currentSquadId) {
    state.currentSquadId = 'squad_self';
  }
  if (typeof state.isSquadLeader !== 'boolean') {
    state.isSquadLeader = true;
  }
  if (typeof state.devMinorTestAccount !== 'boolean') {
    state.devMinorTestAccount = false;
  }

  // 2. playerCode（試玩用，第 2 階段由伺服器產生；僅在缺失時生成，已存在絕不覆寫）
  if (typeof state.playerCode !== 'string' || !state.playerCode.trim()) {
    state.playerCode = generatePlayerCode(); // 試玩用，第 2 階段由伺服器產生
    state.playerCodeGeneratedAt = null;
  } else if (
    typeof state.playerCodeGeneratedAt !== 'number' ||
    !Number.isFinite(state.playerCodeGeneratedAt) ||
    state.playerCodeGeneratedAt <= 0
  ) {
    state.playerCodeGeneratedAt = null;
  }

  // 3. 好友邀請／請求佇列
  // 舊存檔之 friendIds 視為已確認之好友，不得轉換為待處理 friendRequests，保留原陣列不予更動。
  if (!Array.isArray(state.friendRequests)) {
    state.friendRequests = [];
  }

  // 4. 最近隊友（新存檔預設 []；舊存檔依當前 squadMembers 種子化，已存在非空陣列不覆寫）
  if (!Array.isArray(state.recentTeammates)) {
    const effectiveTeammateNow = typeof now === 'number' ? now : 0;
    if (Array.isArray(state.squadMembers) && state.squadMembers.length > 0) {
      state.recentTeammates = state.squadMembers
        .filter((m: any) => m && typeof m === 'object' && typeof m.id === 'string' && m.id !== DEMO_PLAYER_ID)
        .map((m: any) => ({
          id: m.id as string,
          lastTogetherAt: effectiveTeammateNow,
        }));
    } else {
      state.recentTeammates = [];
    }
  }

  // 5. 通知清單（保留 30 天內，上限 50 筆，新到舊排序）
  if (!Array.isArray(state.notifications)) {
    state.notifications = [];
  } else {
    const notifCutoff = clockNow - NOTIFICATIONS_KEEP_MS;
    state.notifications = (state.notifications as NotificationItem[])
      .filter((n) => n && typeof n.createdAt === 'number' && Number.isFinite(n.createdAt) && n.createdAt >= notifCutoff)
      .sort((a, b) => (b.createdAt - a.createdAt) || (b.id || '').localeCompare(a.id || ''))
      .slice(0, NOTIFICATIONS_CAP);
  }

  // 6. 邀請送出記錄（保留 7 天內，新到舊排序）
  if (!Array.isArray(state.inviteSendLog)) {
    state.inviteSendLog = [];
  } else {
    const logCutoff = clockNow - INVITE_SEND_LOG_KEEP_MS;
    state.inviteSendLog = (state.inviteSendLog as InviteSendLogItem[])
      .filter((item) => item && typeof item.sentAt === 'number' && Number.isFinite(item.sentAt) && item.sentAt >= logCutoff)
      .sort((a, b) => (b.sentAt - a.sentAt) || (b.targetId || '').localeCompare(a.targetId || ''));
  }

  // 7. 隱私設定（未成年強制鎖定 MINOR_PRIVACY；成年依設定常數預設）
  const isMinor = state.devMinorTestAccount === true;
  if (!state.privacy || typeof state.privacy !== 'object') {
    state.privacy = isMinor
      ? { ...MINOR_PRIVACY }
      : {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        };
  } else {
    const p = state.privacy as Record<string, unknown>;
    if (isMinor) {
      p.inviteFrom = MINOR_PRIVACY.inviteFrom;
      p.discoverableByCode = MINOR_PRIVACY.discoverableByCode;
    } else {
      if (p.inviteFrom !== 'everyone' && p.inviteFrom !== 'friends') {
        p.inviteFrom = DEFAULT_ADULT_INVITE_FROM;
      }
      if (typeof p.discoverableByCode !== 'boolean') {
        p.discoverableByCode = DEFAULT_ADULT_DISCOVERABLE_BY_CODE;
      }
    }
  }

  // 8. 封鎖名單（本地持久化欄位）
  if (!Array.isArray(state.blockedIds)) {
    state.blockedIds = [];
  }

  // 9. 檢舉紀錄（本地持久化欄位，絕不傳送伺服器，且檢舉理由自由文字絕不輸出 console）
  if (!Array.isArray(state.reportLog)) {
    state.reportLog = [];
  }

  // 10. 戰隊加入順序（含本地玩家 DEMO_PLAYER_ID 在首位，非空時不覆寫）
  if (!Array.isArray(state.squadJoinOrder) || state.squadJoinOrder.length === 0) {
    const memberIds = (Array.isArray(state.squadMembers) ? state.squadMembers : [])
      .filter((m: any) => m && typeof m === 'object' && typeof m.id === 'string' && m.id !== DEMO_PLAYER_ID)
      .map((m: any) => m.id as string);
    state.squadJoinOrder = [DEMO_PLAYER_ID, ...memberIds];
  }

  // 11. 每週 Boss 獎勵領取週標記（null 表示未領）
  if (state.bossRewardClaimedWeekKey === undefined) {
    state.bossRewardClaimedWeekKey = null;
  }

  // 12. 運動解鎖天數進度（只增不減）
  if (typeof state.unlockCheckinDays !== 'number' || !Number.isFinite(state.unlockCheckinDays)) {
    state.unlockCheckinDays = calculateSeedUnlockCheckinDays(state);
  } else {
    state.unlockCheckinDays = Math.max(0, state.unlockCheckinDays);
  }

  // 13. 解鎖之動作與套裝清單（門檻 3/7/14 與 5/15/30；只增不減）
  const eligiblePoseIds = unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, state.unlockCheckinDays as number);
  if (!Array.isArray(state.unlockedPoseIds)) {
    state.unlockedPoseIds = eligiblePoseIds;
  } else {
    const existingSet = new Set(state.unlockedPoseIds as string[]);
    const toAdd = eligiblePoseIds.filter((id) => !existingSet.has(id));
    if (toAdd.length > 0) {
      state.unlockedPoseIds = [...(state.unlockedPoseIds as string[]), ...toAdd];
    }
  }

  const eligibleOutfitIds = unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, state.unlockCheckinDays as number);
  if (!Array.isArray(state.unlockedOutfitIds)) {
    state.unlockedOutfitIds = eligibleOutfitIds;
  } else {
    const existingSet = new Set(state.unlockedOutfitIds as string[]);
    const toAdd = eligibleOutfitIds.filter((id) => !existingSet.has(id));
    if (toAdd.length > 0) {
      state.unlockedOutfitIds = [...(state.unlockedOutfitIds as string[]), ...toAdd];
    }
  }

  return state;
}

/**
 * 將歷史或未補全之 WorkoutSessionRecord 填補為合規之 V4 結構 (冪等函式)。
 * 規則：
 * - 補齊 sportType, source, loggingMode, endedUnwell, pauseSegments, totalDurationSec。
 * - 補齊 sets 之 plannedRestSec (from restSec)、completedAt (from timestamp)、distanceM (km)、durationSec (秒)。
 * - 舊資料絕不變更 weightKg 數值，亦不竄改 coinsEarned, expEarned, totalVolume。
 * - 缺 startedAt 或實際休息無法還原者，標記 timingIncomplete: true，不虛構 restShare。
 */
export function fillV4SessionDefaults<T extends Record<string, unknown>>(session: T): T {
  const s = session as Record<string, unknown>;

  if (!Array.isArray(s.exerciseLogs)) {
    s.exerciseLogs = [];
  } else {
    s.exerciseLogs = s.exerciseLogs.filter(
      (log: any) => log && typeof log === 'object' && !Array.isArray(log)
    );
  }

  const logs = s.exerciseLogs as Record<string, unknown>[];
  const firstLog = logs[0];
  const firstExId = typeof firstLog?.exerciseId === 'string' ? firstLog.exerciseId : undefined;
  const firstUnit = typeof firstLog?.unitLabel === 'string' ? firstLog.unitLabel : undefined;

  // sportType: 若已有有效型別則保留；否則透過對應函式推論
  if (
    typeof s.sportType !== 'string' ||
    !VALID_WORKOUT_SESSION_SPORT_TYPES.includes(s.sportType as WorkoutSessionSportType)
  ) {
    s.sportType = mapLegacyExerciseToSportType(firstExId, firstUnit);
  }

  // source: in_app 或 health_app；預設 in_app
  if (s.source !== 'in_app' && s.source !== 'health_app') {
    s.source = 'in_app';
  }

  // loggingMode: live_focus, after_the_fact, health_app；預設 live_focus
  if (
    s.loggingMode !== 'live_focus' &&
    s.loggingMode !== 'after_the_fact' &&
    s.loggingMode !== 'health_app'
  ) {
    s.loggingMode = 'live_focus';
  }

  // endedUnwell: 布林值；預設 false
  if (typeof s.endedUnwell !== 'boolean') {
    s.endedUnwell = false;
  }

  // pauseSegments: 陣列；預設 []
  if (!Array.isArray(s.pauseSegments)) {
    s.pauseSegments = [];
  } else {
    s.pauseSegments = s.pauseSegments.filter(
      (seg: any) =>
        seg &&
        typeof seg === 'object' &&
        typeof seg.startedAt === 'number' &&
        Number.isFinite(seg.startedAt) &&
        typeof seg.endedAt === 'number' &&
        Number.isFinite(seg.endedAt)
    );
  }

  // totalDurationSec: 若有有限數值保留；否則由 durationMinutes * 60 推算
  if (typeof s.totalDurationSec !== 'number' || !Number.isFinite(s.totalDurationSec)) {
    if (typeof s.durationMinutes === 'number' && Number.isFinite(s.durationMinutes)) {
      s.totalDurationSec = Math.round(s.durationMinutes * 60);
    }
  }

  let hasTimingIncomplete = false;

  for (const log of logs) {
    if (!Array.isArray(log.sets)) {
      log.sets = [];
    } else {
      log.sets = log.sets.filter((set: any) => set && typeof set === 'object' && !Array.isArray(set));
    }

    const unit = typeof log.unitLabel === 'string' ? log.unitLabel.trim() : '';

    for (const setItem of log.sets as Record<string, unknown>[]) {
      // plannedRestSec: 複製自 restSec (若 plannedRestSec 缺失且 restSec 為有效數值)
      if (
        setItem.plannedRestSec === undefined &&
        typeof setItem.restSec === 'number' &&
        Number.isFinite(setItem.restSec)
      ) {
        setItem.plannedRestSec = setItem.restSec;
      }

      // completedAt: 複製自 timestamp (若 completedAt 缺失且 timestamp 為有效數值)
      if (
        setItem.completedAt === undefined &&
        typeof setItem.timestamp === 'number' &&
        Number.isFinite(setItem.timestamp)
      ) {
        setItem.completedAt = setItem.timestamp;
      }

      // 距離與秒數回填 (舊資料不改動 weightKg 數值)
      if (unit === 'km') {
        if (
          setItem.distanceM === undefined &&
          typeof setItem.weightKg === 'number' &&
          Number.isFinite(setItem.weightKg)
        ) {
          setItem.distanceM = Math.round(setItem.weightKg * 1000);
        }
      } else if (unit === '秒') {
        if (
          setItem.durationSec === undefined &&
          typeof setItem.weightKg === 'number' &&
          Number.isFinite(setItem.weightKg)
        ) {
          setItem.durationSec = Math.round(setItem.weightKg);
        }
      }

      // 若缺 startedAt 或實際休息無法還原，設 timingIncomplete: true
      if (
        setItem.startedAt === undefined ||
        typeof setItem.startedAt !== 'number' ||
        !Number.isFinite(setItem.startedAt)
      ) {
        setItem.timingIncomplete = true;
        hasTimingIncomplete = true;
      } else if (setItem.timingIncomplete === true) {
        hasTimingIncomplete = true;
      }
    }
  }

  // 舊紀錄缺 startedAt 不虛構暫停/休息佔比，設 timingIncomplete: true
  if (hasTimingIncomplete || logs.length === 0) {
    s.timingIncomplete = true;
  }

  return session;
}

/**
 * 確保狀態具備所有 V4 欄位與預設值 (T4-D1 多種運動紀錄資料模型、T1/T5 本地存檔欄位)。
 * 具備完整冪等性：已存在之有效值絕不覆寫。
 */
export function ensureV4Defaults(
  state: Record<string, unknown>,
  _now?: number
): Record<string, unknown> {
  // 1. restDayKeys: 若非陣列設為 []；若是陣列僅保留非空字串
  if (!Array.isArray(state.restDayKeys)) {
    state.restDayKeys = [];
  } else {
    state.restDayKeys = state.restDayKeys.filter(
      (k: any) => typeof k === 'string' && k.trim().length > 0
    );
  }

  // 2. caringDayKeys: 若非陣列設為 []；若是陣列僅保留非空字串
  if (!Array.isArray(state.caringDayKeys)) {
    state.caringDayKeys = [];
  } else {
    state.caringDayKeys = state.caringDayKeys.filter(
      (k: any) => typeof k === 'string' && k.trim().length > 0
    );
  }

  // 3. unwellHalfUsedByWeek: 若非純物件設為 {}；丟棄非有限數字或 < 0 的鍵值
  if (
    !state.unwellHalfUsedByWeek ||
    typeof state.unwellHalfUsedByWeek !== 'object' ||
    Array.isArray(state.unwellHalfUsedByWeek)
  ) {
    state.unwellHalfUsedByWeek = {};
  } else {
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(state.unwellHalfUsedByWeek as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        cleaned[k] = v;
      }
    }
    state.unwellHalfUsedByWeek = cleaned;
  }

  // 4. selfCheckCompletedAt: 僅保留有限非空字串；否則為 null
  if (typeof state.selfCheckCompletedAt !== 'string' || !state.selfCheckCompletedAt.trim()) {
    state.selfCheckCompletedAt = null;
  }

  // 5. selfCheckAnyYes: 僅保留 true 或 false；否則為 null (絕不預設 false)
  if (typeof state.selfCheckAnyYes !== 'boolean') {
    state.selfCheckAnyYes = null;
  }

  // 6. unwellNudgeShownWeek: 僅保留非空字串；否則為 null
  if (typeof state.unwellNudgeShownWeek !== 'string' || !state.unwellNudgeShownWeek.trim()) {
    state.unwellNudgeShownWeek = null;
  }

  // 7. onboardingCompletedAt: 僅保留非空字串；否則為 null (絕不預設為已完成)
  if (typeof state.onboardingCompletedAt !== 'string' || !state.onboardingCompletedAt.trim()) {
    state.onboardingCompletedAt = null;
  }

  // 8. onboardingWorkoutHintSeenAt: 僅保留非空字串；否則為 null
  if (
    typeof state.onboardingWorkoutHintSeenAt !== 'string' ||
    !state.onboardingWorkoutHintSeenAt.trim()
  ) {
    state.onboardingWorkoutHintSeenAt = null;
  }

  // 9. onboardingSortieHintSeenAt: 僅保留非空字串；否則為 null
  if (
    typeof state.onboardingSortieHintSeenAt !== 'string' ||
    !state.onboardingSortieHintSeenAt.trim()
  ) {
    state.onboardingSortieHintSeenAt = null;
  }

  // 10. workoutHistory: 若非陣列設為 []；若是陣列則就地填補 V4 欄位
  if (!Array.isArray(state.workoutHistory)) {
    state.workoutHistory = [];
  } else {
    state.workoutHistory = state.workoutHistory
      .filter((session: any) => session && typeof session === 'object' && !Array.isArray(session))
      .map((session: any) => fillV4SessionDefaults(session));
  }

  return state;
}

/**
 * Zustand persist 遷移純函式。
 * 版本小於 2 的遷移邏輯維持完全不變；
 * 鏈式串行遷移：始終先執行 2→3 預設值 (ensureV3Defaults)，再執行 3→4 預設值 (ensureV4Defaults)。
 * 具備完整冪等性，即便是從 version 4 或 v2/v3 存檔載入皆保證正確執行。
 */
export function migratePersistedState(
  persistedState: unknown,
  fromVersion: number,
  now?: number
): Record<string, unknown> {
  if (!persistedState || typeof persistedState !== 'object') {
    return (persistedState as Record<string, unknown>) || {};
  }
  const state = persistedState as Record<string, unknown>;

  if (typeof state.soloStage !== 'number' || state.soloStage < 1) {
    state.soloStage = 1;
  }
  if (typeof state.squadStage !== 'number' || state.squadStage < 1) {
    state.squadStage = 1;
  }

  // Keep the existing version < 2 body unchanged
  if (fromVersion < 2) {
    // Delete old fields
    delete state.adventureCooldownUntil;
    delete state.dailyIapCooldownResetCount;
    delete state.dailyIapCooldownResetDate;
    delete state.todayWorkoutStatus;
    delete state.raidTickets;
    delete state.streakFreezes;
    delete state.doubleCoinActive;

    // Consumables: keep bcaa_water, remove old coupon/freeze/gacha ticket inventory
    const oldConsumables = (state.consumables as Record<string, number>) || {};
    state.consumables = {
      bcaa_water: typeof oldConsumables.bcaa_water === 'number' ? oldConsumables.bcaa_water : 1,
      double_coin_card: 0,
      gacha_ticket: 0,
    };

    // Defaults for new fields
    state.lastCheckinDate = null;
    state.lastBossDate = null;
    state.checkinDayKeys = [];
    state.joinDayKey = '1970-01-01'; // old players don't get rookie floor
    state.disclaimerAcceptedAt = null;
    state.coinsEarnedToday = 0;
    state.coinsEarnedDayKey = null;
    state.chestClaimedWeekKey = null;
    state.doubleCoinUntil = 0;
    state.checkinLogs = [];
    state.ownedCosmeticBuyoutIds = [];

    const existingStamina = typeof state.stamina === 'number' ? state.stamina : STAMINA_MAX;
    state.stamina = Math.min(STAMINA_MAX, Math.max(0, existingStamina));
  }

  // 串行 Stage 3: 套用 v3 預設值（幂等檢查並補齊缺失欄位）
  ensureV3Defaults(state, now);

  // 串行 Stage 4: 套用 v4 預設值 (T4-D1 多種運動紀錄資料模型與 T1/T5 本地存檔欄位)
  ensureV4Defaults(state, now);

  return state;
}
