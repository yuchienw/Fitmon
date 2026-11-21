/**
 * FitMon 隱私設定、封鎖與檢舉純函式庫 (T3-D10)
 *
 * 規範：
 * - 純函式 (state, action, now) => { state, result }
 * - 成人預設值嚴格引用 DEFAULT_ADULT_INVITE_FROM 與 DEFAULT_ADULT_DISCOVERABLE_BY_CODE
 * - 未成年保護：devMinorTestAccount 開啟時鎖定為 MINOR_PRIVACY，且忽略任何修改請求
 * - 封鎖 (blockPlayer)：雙向生效、自好友清單與最近隊友靜默移除、失效相關待處理邀請與申請、中性文案、絕不透露「被封鎖」
 * - 檢舉 (reportPlayer)：純本地 reportLog 紀錄，預設同時封鎖；資安規範：自由文字與原因絕不以任何 console.* 輸出
 * - 搜尋與發現判定：isPlayerDiscoverableByCode 依據設定、未成年與封鎖名單中性判定
 */

import {
  DEFAULT_ADULT_INVITE_FROM,
  DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
  MINOR_PRIVACY,
} from '../config/economy.ts';
import {
  appendLocalReportLog,
  type PlayerPrivacySettings,
  type ReportLogItem,
  type NotificationItem,
  type FriendRequestItem,
  type RecentTeammateItem,
} from './persistMigrate.ts';
import { resolveFriendProfileId } from '../config/catalogConfig.ts';
import type { SquadInviteItem } from './squadInviteRules.ts';

export type { SquadInviteItem };

export interface PrivacySafetyState {
  blockedIds: string[];
  reportLog: ReportLogItem[];
  privacy: PlayerPrivacySettings;
  friendIds?: string[];
  recentTeammates?: RecentTeammateItem[];
  notifications?: NotificationItem[];
  friendRequests?: FriendRequestItem[];
  squadInvites?: SquadInviteItem[];
  devMinorTestAccount?: boolean;
}

/**
 * 比較兩玩家 ID 是否視為同一人（容許前綴 user_ / friend_ / demo_ 及 resolveFriendProfileId 對應）。
 */
export function isSamePlayerId(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const resA = resolveFriendProfileId(a) || a;
  const resB = resolveFriendProfileId(b) || b;
  if (resA === resB) return true;
  const cleanA = a.replace(/^(user_|friend_|demo_)/, '');
  const cleanB = b.replace(/^(user_|friend_|demo_)/, '');
  return Boolean(cleanA && cleanB && cleanA === cleanB);
}

/**
 * 封鎖玩家純函式 (T3-D10 / Q25 / 資安 11/20)。
 * - 將 targetId 加入 blockedIds（冪等、不重複）
 * - 待處理的小鈴鐺通知設為 'invalid'
 * - 雙向待處理的組隊邀請設為 'invalid'
 * - 雙向待處理的好友申請設為 'cancelled'
 * - 從最近隊友 (recentTeammates) 靜默移除
 * - 從好友清單 (friendIds) 靜默移除（不發送解除或封鎖通知）
 * - 回傳中性成功訊息，絕不寫入「被封鎖」
 */
export function blockPlayer<T extends PrivacySafetyState>(
  state: T,
  action: { targetId: string },
  now: number = Date.now()
): { state: T; result: { ok: true; publicMessage: string } } {
  const { targetId } = action;
  if (!targetId) {
    return { state, result: { ok: true, publicMessage: '已封鎖此玩家' } };
  }

  // 1. 加入封鎖名單（避免重複）
  const currentBlocked = Array.isArray(state.blockedIds) ? state.blockedIds : [];
  const nextBlocked = currentBlocked.some((id) => isSamePlayerId(id, targetId))
    ? currentBlocked
    : [...currentBlocked, targetId];

  // 2. 從好友清單靜默移除
  const currentFriends = Array.isArray(state.friendIds) ? state.friendIds : [];
  const nextFriends = currentFriends.filter((id) => !isSamePlayerId(id, targetId));

  // 3. 從最近隊友清單移除
  const currentRecent = Array.isArray(state.recentTeammates) ? state.recentTeammates : [];
  const nextRecent = currentRecent.filter((item) => !isSamePlayerId(item.id, targetId));

  // 4. 雙向待處理組隊邀請失效
  const currentSquadInvites = Array.isArray(state.squadInvites) ? state.squadInvites : [];
  const nextSquadInvites = currentSquadInvites.map((inv) => {
    if (
      inv.status === 'pending' &&
      (isSamePlayerId(inv.fromId, targetId) || (inv.toId && isSamePlayerId(inv.toId, targetId)))
    ) {
      return { ...inv, status: 'invalid' };
    }
    return inv;
  });

  // 5. 雙向待處理好友申請取消/失效
  const currentFriendRequests = Array.isArray(state.friendRequests) ? state.friendRequests : [];
  const nextFriendRequests = currentFriendRequests.map((req) => {
    if (
      req.status === 'pending' &&
      (isSamePlayerId(req.fromId, targetId) || isSamePlayerId(req.toId, targetId))
    ) {
      return { ...req, status: 'cancelled' };
    }
    return req;
  });

  // 6. 既有待處理小鈴鐺通知設為失效
  const currentNotifications = Array.isArray(state.notifications) ? state.notifications : [];
  const nextNotifications = currentNotifications.map((notif) => {
    if (
      (!notif.status || notif.status === 'pending') &&
      notif.actorId &&
      isSamePlayerId(notif.actorId, targetId)
    ) {
      return { ...notif, status: 'invalid' };
    }
    return notif;
  });

  return {
    state: {
      ...state,
      blockedIds: nextBlocked,
      friendIds: nextFriends,
      recentTeammates: nextRecent,
      squadInvites: nextSquadInvites,
      friendRequests: nextFriendRequests,
      notifications: nextNotifications,
    },
    result: { ok: true, publicMessage: '已封鎖此玩家' },
  };
}

/**
 * 解除封鎖玩家純函式。
 * - 從 blockedIds 移除目標
 * - 不通知對方
 * - 不自動復原好友關係、邀請或通知
 */
export function unblockPlayer<T extends PrivacySafetyState>(
  state: T,
  action: { targetId: string },
  _now: number = Date.now()
): { state: T; result: { ok: true; publicMessage: string } } {
  const { targetId } = action;
  const currentBlocked = Array.isArray(state.blockedIds) ? state.blockedIds : [];
  const nextBlocked = currentBlocked.filter((id) => !isSamePlayerId(id, targetId));

  return {
    state: {
      ...state,
      blockedIds: nextBlocked,
    },
    result: { ok: true, publicMessage: '已解除封鎖' },
  };
}

/**
 * 檢舉玩家純函式 (T3-D10 / 資安 11/20 規範)。
 * - 寫入本地 reportLog
 * - 理由類別存入 reason，自由文字 details（若有）僅保留於 state.reportLog，嚴禁以 console.* 輸出或發送至外部
 * - alsoBlock 預設為 true，若為 true 則一併執行 blockPlayer 之完整副作用
 */
export function reportPlayer<T extends PrivacySafetyState>(
  state: T,
  action: {
    targetId: string;
    reason: string;
    details?: string;
    alsoBlock?: boolean;
  },
  now: number = Date.now()
): { state: T; result: { ok: true; publicMessage: string } } {
  const { targetId, reason, details, alsoBlock = true } = action;

  const currentReportLog = Array.isArray(state.reportLog) ? [...state.reportLog] : [];
  const nextState: T = {
    ...state,
    reportLog: currentReportLog,
  };

  appendLocalReportLog(nextState as unknown as Record<string, unknown>, {
    targetId,
    reason: details ? `${reason}: ${details}` : reason,
    createdAt: now,
  });

  if (alsoBlock) {
    const blockRes = blockPlayer(nextState, { targetId }, now);
    return {
      state: blockRes.state,
      result: { ok: true, publicMessage: '已收到檢舉' },
    };
  }

  return {
    state: nextState,
    result: { ok: true, publicMessage: '已收到檢舉' },
  };
}

/**
 * 更新隱私設定純函式 (T3-D10 8a/8b/8e)。
 * - 若 isMinor 為 true，鎖定為 MINOR_PRIVACY，忽略修改請求
 * - 否則套用 patch，未設定值預設來自 DEFAULT_ADULT_INVITE_FROM / DEFAULT_ADULT_DISCOVERABLE_BY_CODE
 */
export function updatePrivacySettings<T extends PrivacySafetyState>(
  state: T,
  patch: Partial<PlayerPrivacySettings>,
  options?: { isMinor?: boolean }
): { state: T; result: { ok: boolean } } {
  const isMinor = options?.isMinor ?? state.devMinorTestAccount ?? false;

  if (isMinor) {
    return {
      state: {
        ...state,
        privacy: { ...MINOR_PRIVACY },
      },
      result: { ok: false },
    };
  }

  const currentPrivacy = state.privacy || {
    inviteFrom: DEFAULT_ADULT_INVITE_FROM,
    discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
  };

  const nextPrivacy: PlayerPrivacySettings = {
    inviteFrom: patch.inviteFrom ?? currentPrivacy.inviteFrom ?? DEFAULT_ADULT_INVITE_FROM,
    discoverableByCode:
      patch.discoverableByCode !== undefined
        ? patch.discoverableByCode
        : currentPrivacy.discoverableByCode !== undefined
        ? currentPrivacy.discoverableByCode
        : DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
  };

  return {
    state: {
      ...state,
      privacy: nextPrivacy,
    },
    result: { ok: true },
  };
}

/**
 * 判定當前玩家是否可被特定檢視者以代碼搜尋到 (T3-D10)。
 * - 未成年：不可被搜尋 (false)
 * - 關閉「可以用代碼找到我」：不可被搜尋 (false)
 * - 檢視者在封鎖名單中：不可被搜尋 (false)
 */
export function isPlayerDiscoverableByCode(
  state: {
    privacy?: PlayerPrivacySettings;
    devMinorTestAccount?: boolean;
    blockedIds?: string[];
  },
  viewerId?: string
): boolean {
  if (state.devMinorTestAccount) return false;
  if (state.privacy?.discoverableByCode === false) return false;
  if (
    viewerId &&
    Array.isArray(state.blockedIds) &&
    state.blockedIds.some((b) => isSamePlayerId(b, viewerId))
  ) {
    return false;
  }
  return true;
}
