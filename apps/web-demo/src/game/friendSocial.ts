/**
 * FitMon 好友系統純函式庫 (T3-D9)
 *
 * 包含：
 * - 8 碼玩家代碼搜尋 (Q22 / 資安 11/20)
 * - 搜尋速率限制 (每分鐘 5 次、每日 30 次)
 * - 找不到玩家之單一路徑組裝 (deep-equal public result, 恆定回應時間延遲)
 * - 好友申請狀態機 (發送、取消、同意、略過、解除好友)
 * - 好友發送上限 (每日 20 則，含取消)
 * - 略過好友申請之 7 天冷卻保護 (Q16)
 * - 好友清單三級排序 (同隊 -> 最近隊友 -> 暱稱注音/字母)
 * - 玩家代碼 24 小時重新產生限制與顯示文案 (Q27)
 */

import {
  generatePlayerCode,
  formatPlayerCode,
  normalizePlayerCode,
  canRegeneratePlayerCode,
  regeneratePlayerCode,
  PLAYER_CODE_CHARSET,
  PLAYER_CODE_REGEN_COOLDOWN_MS,
  DEMO_PLAYER_ID,
  type FriendRequestItem,
  type RecentTeammateItem,
  type NotificationItem,
} from './persistMigrate.ts';
import { SOCIAL_RATE_LIMITS } from '../config/economy.ts';
import {
  FRIEND_REQUEST_TTL_MS,
  isSameTaipeiDay,
  getTaipeiParts,
  pruneNotifications,
} from './notificationCenter.ts';

// 重新匯出基礎代碼與速率常數，維持介面集中
export {
  generatePlayerCode,
  formatPlayerCode,
  normalizePlayerCode,
  canRegeneratePlayerCode,
  regeneratePlayerCode,
  PLAYER_CODE_CHARSET,
  PLAYER_CODE_REGEN_COOLDOWN_MS,
  SOCIAL_RATE_LIMITS,
  FRIEND_REQUEST_TTL_MS,
};

// =========================================================================
// 1a. 玩家代碼搜尋 (Q22 / 資安 11/20)
// =========================================================================

export const PLAYER_SEARCH_NOT_FOUND_MESSAGE = '找不到這位玩家';
export const PLAYER_SEARCH_NOT_FOUND_HINT = '請再確認一次代碼。';
export const PLAYER_SEARCH_RATE_LIMIT_MESSAGE = '稍後再試';
export const PLAYER_SEARCH_RATE_LIMIT_HINT = '過一會兒再找就可以了。';
export const PLAYER_SEARCH_MIN_DELAY_MS = 400;

export type PlayerSearchReason = 'found' | 'not_found' | 'rate_limited';

export type PlayerDirectoryEntry = {
  id: string;
  playerCode: string; // 當前代碼；舊代碼直接不在此目錄中
  nickname: string;
  level?: number;
  isMinor?: boolean;
  discoverableByCode?: boolean; // 成人預設 true
  blockedYou?: boolean; // 對方封鎖了當前玩家
};

export type PlayerSearchInput = {
  query: string;
  selfId: string;
  selfCode: string; // 當前玩家自身代碼
  selfIsMinor: boolean;
  now: number;
  lookupLog: number[]; // 過去查詢時間戳陣列 (純記憶體 log)
  directory: PlayerDirectoryEntry[]; // 可搜尋之玩家名錄
  friendIds: string[];
  blockedIds: string[];
};

export type PlayerSearchResult = {
  reason: PlayerSearchReason;
  message?: string;
  hint?: string;
  player?: {
    id: string;
    nickname: string;
    level: number;
    isFriend: boolean;
  };
  nextLookupLog: number[];
};

/**
 * 檢查代碼字串是否恰好為 8 碼且全由合法字元組成。
 */
export function isValidPlayerCode(code: string): boolean {
  if (typeof code !== 'string') return false;
  const normalized = normalizePlayerCode(code);
  if (normalized.length !== 8) return false;
  for (let i = 0; i < normalized.length; i++) {
    if (!PLAYER_CODE_CHARSET.includes(normalized[i])) {
      return false;
    }
  }
  return true;
}

/**
 * 單一找不到路徑結果產生器。
 * 規範要求：所有 hide / not-found 案例必須回傳一模一樣的物件結構與文案，
 * 嚴禁夾帶 target id、nickname 或洩漏失敗原因。
 */
function makeNotFoundResult(nextLookupLog: number[]): PlayerSearchResult {
  return Object.freeze({
    reason: 'not_found' as const,
    message: PLAYER_SEARCH_NOT_FOUND_MESSAGE,
    hint: PLAYER_SEARCH_NOT_FOUND_HINT,
    nextLookupLog,
  });
}

/**
 * 代碼搜尋核心純函式 (無任何外部 I/O 或非同步延遲)。
 */
export function searchPlayerByCode(input: PlayerSearchInput): PlayerSearchResult {
  const {
    query,
    selfId,
    selfCode,
    selfIsMinor,
    now,
    lookupLog,
    directory,
    friendIds,
    blockedIds,
  } = input;

  // 1. 先檢驗速率限制 (每分鐘 5 次、每日 30 次)
  // 過去 1 分鐘 (60,000 ms) 與過去 24 小時 (86,400,000 ms)
  const minuteWindow = SOCIAL_RATE_LIMITS.codeLookup.minuteWindowMs;
  const dayWindow = SOCIAL_RATE_LIMITS.codeLookup.dayWindowMs;

  const lookupsLastMinute = lookupLog.filter((t) => now - t < minuteWindow).length;
  const lookupsLastDay = lookupLog.filter((t) => now - t < dayWindow).length;

  if (
    lookupsLastMinute >= SOCIAL_RATE_LIMITS.codeLookup.maxPerMinute ||
    lookupsLastDay >= SOCIAL_RATE_LIMITS.codeLookup.maxPerDay
  ) {
    // 規範：限頻時不消耗新額度，nextLookupLog 維持原樣
    return {
      reason: 'rate_limited',
      message: PLAYER_SEARCH_RATE_LIMIT_MESSAGE,
      hint: PLAYER_SEARCH_RATE_LIMIT_HINT,
      nextLookupLog: [...lookupLog],
    };
  }

  // 2. 未被限頻：本次嘗試消耗 1 次名額（保留 24 小時內之記錄以維持記憶體整潔）
  const nextLookupLog = lookupLog
    .filter((t) => now - t < dayWindow)
    .concat(now);

  // 3. 所有「找不到」之情況一律走統一回傳物件
  const normalizedQuery = normalizePlayerCode(query);
  if (!isValidPlayerCode(normalizedQuery)) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 發送方自身為未成年者：搜尋陌生人一律回傳找不到
  if (selfIsMinor) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 搜尋自己當前代碼：回傳找不到（不洩露自己代碼存在性）
  if (normalizedQuery === normalizePlayerCode(selfCode)) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 在名錄中查找比對
  const target = directory.find(
    (entry) => normalizePlayerCode(entry.playerCode) === normalizedQuery
  );

  if (!target) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 目標為自己 id
  if (target.id === selfId) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 目標為未成年者 (isMinor === true)
  if (target.isMinor === true) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 目標關閉「可以用代碼找到我」(discoverableByCode === false)
  if (target.discoverableByCode === false) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 雙向封鎖判定：對方封鎖我 (blockedYou === true) 或我封鎖對方 (blockedIds 包含目標 id)
  if (target.blockedYou === true || blockedIds.includes(target.id)) {
    return makeNotFoundResult(nextLookupLog);
  }

  // 4. 找到目標玩家 (僅回傳白名單最少資訊：id, nickname, level, isFriend)
  const isFriend =
    friendIds.includes(target.id) ||
    (target.id.startsWith('user_') && friendIds.includes(target.id.replace('user_', 'friend_'))) ||
    (target.id.startsWith('friend_') && friendIds.includes(target.id.replace('friend_', 'user_')));

  return {
    reason: 'found',
    player: {
      id: target.id,
      nickname: target.nickname,
      level: target.level ?? 1,
      isFriend,
    },
    nextLookupLog,
  };
}

/**
 * 計算搜尋回應延遲時間：固定 400ms 加上小幅隨機 (0~100ms)。
 */
export function calculateSearchDelay(rng: () => number = Math.random): number {
  return PLAYER_SEARCH_MIN_DELAY_MS + Math.floor(rng() * 101);
}

/**
 * 包含最低延遲的非同步代碼搜尋封裝。
 */
export async function executeSearchWithDelay(
  input: PlayerSearchInput,
  options?: {
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
    rng?: () => number;
  }
): Promise<{ result: PlayerSearchResult; actualDelayMs: number }> {
  const delay =
    options?.delayMs !== undefined
      ? options.delayMs
      : calculateSearchDelay(options?.rng);

  const sleepFn =
    options?.sleep ||
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  if (delay > 0) {
    await sleepFn(delay);
  }

  const result = searchPlayerByCode(input);
  return { result, actualDelayMs: delay };
}

// =========================================================================
// 1b. 好友申請狀態機與防騷擾規則 (Q15, Q16, Q17)
// =========================================================================

export interface FriendSocialState {
  friendIds: string[];
  friendRequests: FriendRequestItem[];
  notifications: NotificationItem[];
  blockedIds?: string[];
}

export type FriendRequestViewStatus =
  | 'friends'
  | 'pending'
  | 'limit'
  | 'cooldown_expired_ready'
  | 'add';

/**
 * 檢查發送者今日是否仍有名額可送出好友申請 (每日上限 20 則，含已取消者)。
 */
export function canSendFriendRequest(
  state: { friendRequests?: FriendRequestItem[] },
  selfId: string,
  now: number = Date.now()
): boolean {
  const requests = Array.isArray(state.friendRequests) ? state.friendRequests : [];
  const countToday = requests.filter(
    (r) => r.fromId === selfId && isSameTaipeiDay(r.createdAt, now)
  ).length;
  return countToday < SOCIAL_RATE_LIMITS.friendRequest.maxPerDay;
}

/**
 * 取得發送者視角應看到的加好友按鈕狀態。
 * 規範約束：
 * - 絕不向發送方回傳 'skipped' 或透露對方已略過。
 * - 對方略過後，發送方在 7 天 TTL 內依然看到 'pending'。
 * - TTL 過後回傳 'cooldown_expired_ready' 或 'add'。
 */
export function getFriendRequestView(
  state: {
    friendIds: string[];
    friendRequests?: FriendRequestItem[];
  },
  selfId: string,
  otherId: string,
  now: number = Date.now()
): FriendRequestViewStatus {
  const friendIds = Array.isArray(state.friendIds) ? state.friendIds : [];
  const isFriend =
    friendIds.includes(otherId) ||
    (otherId.startsWith('user_') && friendIds.includes(otherId.replace('user_', 'friend_'))) ||
    (otherId.startsWith('friend_') && friendIds.includes(otherId.replace('friend_', 'user_')));

  if (isFriend) {
    return 'friends';
  }

  const requests = Array.isArray(state.friendRequests) ? state.friendRequests : [];
  // 找出由 selfId 送給 otherId 的最新一筆好友申請
  const sentRequests = requests
    .filter((r) => r.fromId === selfId && r.toId === otherId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (sentRequests.length > 0) {
    const latest = sentRequests[0];
    const isWithinTTL = now < latest.createdAt + FRIEND_REQUEST_TTL_MS;

    if (latest.status === 'pending') {
      if (isWithinTTL) {
        return 'pending';
      }
      return canSendFriendRequest(state, selfId, now) ? 'cooldown_expired_ready' : 'limit';
    }

    if (latest.status === 'skipped') {
      // Q16：對方略過後，發送方 7 天內依舊顯示「已送出好友申請」(pending)
      if (isWithinTTL) {
        return 'pending';
      }
      return canSendFriendRequest(state, selfId, now) ? 'cooldown_expired_ready' : 'limit';
    }

    if (latest.status === 'cancelled') {
      return canSendFriendRequest(state, selfId, now) ? 'add' : 'limit';
    }
  }

  // 檢查發送方每日額度
  if (!canSendFriendRequest(state, selfId, now)) {
    return 'limit';
  }

  return 'add';
}

/**
 * 送出好友申請純函式。
 */
export function sendFriendRequest<T extends FriendSocialState>(
  state: T,
  action: { fromId: string; toId: string },
  now: number = Date.now()
): {
  state: T;
  result: 'success' | 'already_friends' | 'already_pending' | 'limit_reached' | 'error';
  requestId?: string;
  error?: string;
} {
  const { fromId, toId } = action;

  // 1. 已是好友
  const isFriend =
    state.friendIds.includes(toId) ||
    (toId.startsWith('user_') && state.friendIds.includes(toId.replace('user_', 'friend_'))) ||
    (toId.startsWith('friend_') && state.friendIds.includes(toId.replace('friend_', 'user_')));
  if (isFriend) {
    return { state, result: 'already_friends' };
  }

  // 1.5 檢查封鎖狀態 (雙向封鎖皆中性失敗，文案一致回傳「對方目前無法加入」)
  const isBlocked =
    (state.blockedIds || []).some(
      (b) =>
        b === toId ||
        (toId.startsWith('user_') && b === toId.replace('user_', 'friend_')) ||
        (toId.startsWith('friend_') && b === toId.replace('friend_', 'user_'))
    );
  if (isBlocked) {
    return {
      state,
      result: 'error',
      error: '對方目前無法加入',
    };
  }

  // 2. 檢查每日發送上限 (20 則)
  if (!canSendFriendRequest(state, fromId, now)) {
    return {
      state,
      result: 'limit_reached',
      error: '今天的好友申請次數用完了，明天再來',
    };
  }

  // 3. 檢查是否已在有效 pending 狀態中
  const requests = Array.isArray(state.friendRequests) ? state.friendRequests : [];
  const existingPending = requests.find(
    (r) =>
      r.fromId === fromId &&
      r.toId === toId &&
      r.status === 'pending' &&
      now < r.createdAt + FRIEND_REQUEST_TTL_MS
  );
  if (existingPending) {
    return { state, result: 'already_pending', requestId: existingPending.id };
  }

  // 檢查是否處於略過後的 7 天冷卻保護中
  const existingSkipped = requests.find(
    (r) =>
      r.fromId === fromId &&
      r.toId === toId &&
      r.status === 'skipped' &&
      now < r.createdAt + SOCIAL_RATE_LIMITS.friendRequest.skipCooldownMs
  );
  if (existingSkipped) {
    return { state, result: 'already_pending', requestId: existingSkipped.id };
  }

  // 4. 產生新申請紀錄
  const requestId = `freq_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const newRequest: FriendRequestItem = {
    id: requestId,
    fromId,
    toId,
    status: 'pending',
    createdAt: now,
  };

  // 5. 產生收件者的小鈴鐺通知
  const newNotification: NotificationItem = {
    id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'friend_request',
    actorId: fromId,
    createdAt: now,
    expiresAt: now + FRIEND_REQUEST_TTL_MS,
    status: 'pending',
    refId: requestId,
  };

  const nextNotifications = pruneNotifications(
    [...(state.notifications || []), newNotification],
    now
  );

  return {
    state: {
      ...state,
      friendRequests: [...requests, newRequest],
      notifications: nextNotifications,
    },
    result: 'success',
    requestId,
  };
}

/**
 * 取消好友申請純函式 (Q15)。
 * 發送者取消已送出的好友申請：
 * - 不通知對方
 * - 收件者的 friend_request 通知移除
 * - request 標記為 cancelled (保留以計入發送方當日額度)
 */
export function cancelFriendRequest<T extends FriendSocialState>(
  state: T,
  action: { requestId?: string; fromId?: string; toId?: string },
  now: number = Date.now()
): {
  state: T;
  result: 'cancelled' | 'not_found';
} {
  const requests = Array.isArray(state.friendRequests) ? state.friendRequests : [];
  const targetReq = requests.find((r) => {
    if (action.requestId) return r.id === action.requestId;
    if (action.fromId && action.toId) {
      return r.fromId === action.fromId && r.toId === action.toId && r.status === 'pending';
    }
    return false;
  });

  if (!targetReq) {
    return { state, result: 'not_found' };
  }

  // 標記為 cancelled
  const updatedRequests = requests.map((r) =>
    r.id === targetReq.id ? { ...r, status: 'cancelled' } : r
  );

  // 移除收件者的對應待處理通知 (卡片消失)
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const updatedNotifications = notifications.filter((n) => {
    if (n.type === 'friend_request') {
      if (n.refId === targetReq.id) return false;
      if (n.actorId === targetReq.fromId && n.status === 'pending') return false;
    }
    return true;
  });

  return {
    state: {
      ...state,
      friendRequests: updatedRequests,
      notifications: updatedNotifications,
    },
    result: 'cancelled',
  };
}

/**
 * 同意好友申請純函式。
 * - 雙方成為好友 (friendIds 更新，舊好友絕不洗掉)
 * - request 標記為 accepted
 * - 雙方鈴鐺新增 friend_accepted 通知：「你和 ○○ 已成為好友」
 */
export function acceptFriendRequest<T extends FriendSocialState>(
  state: T,
  action: { requestId?: string; actorId?: string },
  now: number = Date.now()
): {
  state: T;
  result: 'accepted' | 'not_found';
} {
  const requests = Array.isArray(state.friendRequests) ? state.friendRequests : [];
  const targetReq = requests.find((r) => {
    if (action.requestId) return r.id === action.requestId;
    if (action.actorId) {
      return (
        (r.fromId === action.actorId || r.toId === action.actorId) &&
        r.status === 'pending'
      );
    }
    return false;
  });

  if (!targetReq) {
    return { state, result: 'not_found' };
  }

  // 決定新好友之 ID
  const otherPartyId =
    targetReq.fromId === DEMO_PLAYER_ID ? targetReq.toId : targetReq.fromId;

  // 更新好友陣列 (保留舊好友)
  const currentFriendIds = Array.isArray(state.friendIds) ? state.friendIds : [];
  const nextFriendIds = currentFriendIds.includes(otherPartyId)
    ? currentFriendIds
    : [...currentFriendIds, otherPartyId];

  // 更新 request 狀態
  const updatedRequests = requests.map((r) =>
    r.id === targetReq.id ? { ...r, status: 'accepted' } : r
  );

  // 更新通知：原申請標為 accepted，並為雙方加入 friend_accepted
  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const handledNotifications = notifications.map((n) => {
    if (
      n.type === 'friend_request' &&
      (n.refId === targetReq.id || (n.actorId === otherPartyId && n.status === 'pending'))
    ) {
      return { ...n, status: 'accepted' };
    }
    return n;
  });

  const acceptedNotif: NotificationItem = {
    id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'friend_accepted',
    actorId: otherPartyId,
    createdAt: now,
    status: 'info',
  };

  const nextNotifications = pruneNotifications(
    [...handledNotifications, acceptedNotif],
    now
  );

  return {
    state: {
      ...state,
      friendIds: nextFriendIds,
      friendRequests: updatedRequests,
      notifications: nextNotifications,
    },
    result: 'accepted',
  };
}

/**
 * 略過好友申請純函式 (Q16)。
 * - request 標記為 skipped
 * - 收件方卡片顯示已處理 (已略過)
 * - 不向發送方發送通知
 */
export function skipFriendRequest<T extends FriendSocialState>(
  state: T,
  action: { requestId?: string; actorId?: string },
  now: number = Date.now()
): {
  state: T;
  result: 'skipped' | 'not_found';
} {
  const requests = Array.isArray(state.friendRequests) ? state.friendRequests : [];
  const targetReq = requests.find((r) => {
    if (action.requestId) return r.id === action.requestId;
    if (action.actorId) {
      return (
        (r.fromId === action.actorId || r.toId === action.actorId) &&
        r.status === 'pending'
      );
    }
    return false;
  });

  if (!targetReq) {
    return { state, result: 'not_found' };
  }

  const updatedRequests = requests.map((r) =>
    r.id === targetReq.id ? { ...r, status: 'skipped' } : r
  );

  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const updatedNotifications = notifications.map((n) => {
    if (
      n.type === 'friend_request' &&
      (n.refId === targetReq.id || (n.actorId === targetReq.fromId && n.status === 'pending'))
    ) {
      return { ...n, status: 'skipped' };
    }
    return n;
  });

  return {
    state: {
      ...state,
      friendRequests: updatedRequests,
      notifications: updatedNotifications,
    },
    result: 'skipped',
  };
}

/**
 * 解除好友關係純函式 (Q17)。
 * 安靜移除：不發通知，不影響戰隊關係。
 */
export function removeFriend<T extends FriendSocialState>(
  state: T,
  action: { profileId: string },
  now: number = Date.now()
): {
  state: T;
  result: 'removed';
} {
  const { profileId } = action;
  const friendIds = Array.isArray(state.friendIds) ? state.friendIds : [];

  const nextFriendIds = friendIds.filter((id) => {
    if (id === profileId) return false;
    if (profileId.startsWith('user_') && id === profileId.replace('user_', 'friend_')) return false;
    if (profileId.startsWith('friend_') && id === profileId.replace('friend_', 'user_')) return false;
    return true;
  });

  return {
    state: {
      ...state,
      friendIds: nextFriendIds,
    },
    result: 'removed',
  };
}

// =========================================================================
// 1c. 好友排序純函式 (Q18)
// =========================================================================

export interface FriendSortItem {
  id: string;
  nickname: string;
  level?: number;
  [key: string]: unknown;
}

/**
 * 好友清單三級排序：
 * 1. 同隊成員置頂
 * 2. 其次 30 天內最近隊友 (未封鎖)
 * 3. 其餘照暱稱 zh-Hant 繁中/拉丁字母升序
 */
export function sortFriends<T extends FriendSortItem>(
  friends: T[],
  context: {
    currentSquadIds?: string[];
    recentTeammateIds?: string[];
  }
): T[] {
  const squadSet = new Set(context.currentSquadIds || []);
  const teammateSet = new Set(context.recentTeammateIds || []);

  const isSameSquad = (id: string): boolean => {
    if (squadSet.has(id)) return true;
    if (id.startsWith('user_') && squadSet.has(id.replace('user_', 'friend_'))) return true;
    if (id.startsWith('friend_') && squadSet.has(id.replace('friend_', 'user_'))) return true;
    return false;
  };

  const isRecentTeammate = (id: string): boolean => {
    if (teammateSet.has(id)) return true;
    if (id.startsWith('user_') && teammateSet.has(id.replace('user_', 'friend_'))) return true;
    if (id.startsWith('friend_') && teammateSet.has(id.replace('friend_', 'user_'))) return true;
    return false;
  };

  return [...friends].sort((a, b) => {
    const aSquad = isSameSquad(a.id);
    const bSquad = isSameSquad(b.id);
    if (aSquad && !bSquad) return -1;
    if (!aSquad && bSquad) return 1;

    const aTeam = isRecentTeammate(a.id);
    const bTeam = isRecentTeammate(b.id);
    if (aTeam && !bTeam) return -1;
    if (!aTeam && bTeam) return 1;

    return (a.nickname || '').localeCompare(b.nickname || '', 'zh-Hant');
  });
}

// =========================================================================
// 1d. 玩家代碼 UI 輔助純函式 (Q27 / 未成年規則)
// =========================================================================

/**
 * 格式化代碼鎖定狀態提示字串 (滿 24 小時解除，禁止寫「明天」)。
 */
export function formatRegenLockedCountdown(
  generatedAt: number,
  now: number = Date.now()
): { longText: string; shortText: string } {
  const unlockTime = (generatedAt || 0) + PLAYER_CODE_REGEN_COOLDOWN_MS;
  const parts = getTaipeiParts(unlockTime);
  const hh = String(parts.hours).padStart(2, '0');
  const mm = String(parts.minutes).padStart(2, '0');
  return {
    longText: `代碼 24 小時內只能換一次，${parts.month}月${parts.day}日 ${hh}:${mm} 後可以再換`,
    shortText: `${hh}:${mm} 後可以再換`,
  };
}

/**
 * 判斷是否應顯示玩家代碼卡 (未成年帳號嚴格隱藏代碼)。
 */
export function shouldShowPlayerCode(isMinor: boolean): boolean {
  return !isMinor;
}

/**
 * 判斷是否應提供玩家代碼搜尋入口 (未成年帳號嚴格隱藏代碼搜尋)。
 */
export function shouldShowCodeSearch(isMinor: boolean): boolean {
  return !isMinor;
}
