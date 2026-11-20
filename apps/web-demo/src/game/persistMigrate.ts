/**
 * FitMon 存檔遷移與 V3 預設值純函式庫 (T3-D3 資安 11/20)
 *
 * Persist key: fitmon-mvp-storage-v6
 * Persist version: 3
 *
 * YuChien 於 2026-11-20 決策：所有新欄位皆納入 v3（不升 v4，v4 由 T4-D1 擁有）。
 * 本模組提供純函式 migratePersistedState 及 ensureV3Defaults，
 * 確保從舊版（v0/v1/v2 或未含完整社群欄位的初始 v3 存檔）升級時具備完整冪等性，
 * 且不刪除或竄改任何金幣、等級、經驗值、打卡紀錄、好友名單或戰隊資訊。
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
  if (typeof generatedAt !== 'number' || isNaN(generatedAt) || generatedAt <= 0) {
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
  const lastGen = typeof rec.playerCodeGeneratedAt === 'number' ? rec.playerCodeGeneratedAt : 0;
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
    state.playerCodeGeneratedAt = clockNow;
  } else if (typeof state.playerCodeGeneratedAt !== 'number' || isNaN(state.playerCodeGeneratedAt)) {
    state.playerCodeGeneratedAt = clockNow;
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
 * Zustand persist 遷移純函式。
 * 版本小於 2 的遷移邏輯維持完全不變；
 * 版本小於 3（或現有 v3 存檔缺少新欄位時）補齊所有 v3 欄位預設值。
 * 注意：本版本為 v3，後續 T4-D1 遷移時將以鏈式遷移（3→4）方式銜接，切勿佔用 version 4。
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

  // 套用 v3 預設值（幂等檢查並補齊缺失欄位）
  // 注意：本版本為 v3，後續 T4-D1 遷移時將以鏈式遷移（3→4）方式銜接，切勿佔用 version 4。
  ensureV3Defaults(state, now);

  return state;
}
