/**
 * FitMon 小鈴鐺通知中心純函式庫 (T3-D7)
 *
 * 規範：
 * - 純函式 (input, now) => output
 * - 沿用 persistMigrate.ts 常數 (NOTIFICATIONS_CAP = 50, NOTIFICATIONS_KEEP_MS = 30天)
 * - 收件端催促過濾 (Q19 / 資安 11/20 19:20)：休息日 / 照顧身體中 / 暫停中 靜默過濾隊友提醒
 * - 未成年保護：過濾非好友之組隊邀請與入隊申請
 * - 視圖白名單 (NOTIFICATION_VIEW_WHITELIST)：嚴禁洩漏健康/運動/個資等敏感數據
 * - 台北時區 (Asia/Taipei) 顯示有效期限與當天 23:59 截止判定
 */

import {
  NOTIFICATIONS_CAP,
  NOTIFICATIONS_KEEP_MS,
  type NotificationItem,
} from './persistMigrate.ts';

export { NOTIFICATIONS_CAP, NOTIFICATIONS_KEEP_MS };
export type { NotificationItem };

/** 組隊邀請與入隊申請有效期：24 小時 */
export const SQUAD_INVITE_TTL_MS = 24 * 60 * 60 * 1000;
/** 好友申請有效期：7 天 */
export const FRIEND_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 通知類型常數 */
export type NotificationType =
  | 'squad_invite'
  | 'join_request'
  | 'result_success'
  | 'result_failure'
  | 'squad_change'
  | 'friend_request'
  | 'friend_accepted'
  | 'nudge';

/** 通知處理狀態 */
export type NotificationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'skipped'
  | 'expired'
  | 'invalid'
  | 'info';

/** 收件人上下文 (Q19 / 資安 11/20 19:20) */
export type RecipientNotifyContext = {
  isRestDay: boolean;          // 當天休息日
  isCaringForBody: boolean;    // 照顧身體中 / 我不舒服
  isPaused: boolean;           // 暫停中
  isMinor: boolean;            // devMinorTestAccount 或伺服器未成年判斷
  friendIds: string[];         // 好友 ID 清單
  blockedIds: string[];        // 封鎖名單 ID 清單 (T3-D10)
};

/**
 * 視圖欄位白名單 (凍結清單)。
 * 視圖模型中嚴格禁止出現任何白名單以外的鍵值。
 */
export const NOTIFICATION_VIEW_WHITELIST = Object.freeze([
  'id',
  'type',
  'actorId',
  'refId',
  'squadName',
  'createdAt',
  'readAt',
  'status',
  'expiresAt',
  'nickname',
  'avatar',
  'actorLevel',
  'memberCount',
  'bossName',
  'isStranger',
  'isExpired',
  'isInvalid',
  'isHandled',
  'expiryLabel',
  'relativeTimeLabel',
  'title',
  'subtitle',
  'handledLabel',
  'actionType',
] as const);

export type NotificationViewKey = (typeof NOTIFICATION_VIEW_WHITELIST)[number];

/** 嚴格禁止出現在通知文案、視圖或序列化中的敏感詞 */
export const FORBIDDEN_NOTIFICATION_SUBSTRINGS = Object.freeze([
  '照顧身體中',
  '我不舒服',
  '休息日',
  '休息原因',
  '暫停中',
  '被拒絕',
  '被踢',
  '被封鎖',
  '快回覆',
  '別讓隊友等',
  '陌生人警告',
]);

/** 視圖模型型別定義 */
export interface NotificationView {
  id: string;
  type: string;
  actorId?: string;
  refId?: string;
  squadName?: string;
  createdAt: number;
  readAt?: number | null;
  status: string;
  expiresAt?: number | null;
  nickname: string;
  avatar?: string;
  actorLevel?: number;
  memberCount?: number;
  bossName?: string;
  isStranger: boolean;
  isExpired: boolean;
  isInvalid: boolean;
  isHandled: boolean;
  expiryLabel?: string;
  relativeTimeLabel: string;
  title: string;
  subtitle?: string;
  handledLabel?: string;
  actionType:
    | 'invite'
    | 'join_request'
    | 'friend_request'
    | 'nudge'
    | 'goto_squad'
    | 'find_squad'
    | 'none';
}

/**
 * 斷言通知字串不含任何敏感詞彙（健康狀態、羞辱催促等）。
 */
export function assertNoSensitiveNotificationText(text: string): void {
  if (typeof text !== 'string') return;
  for (const forbidden of FORBIDDEN_NOTIFICATION_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(
        `Sensitive text violation: notification text contains forbidden substring "${forbidden}"`
      );
    }
  }
}

/**
 * 取得台北時間 (UTC+8) 的年、月、日、時、分。
 */
export function getTaipeiParts(timestamp: number): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
  const d = new Date(timestamp + TAIPEI_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
  };
}

/**
 * 判斷兩個時間戳是否為台北時間同一天。
 */
export function isSameTaipeiDay(t1: number, t2: number): boolean {
  const p1 = getTaipeiParts(t1);
  const p2 = getTaipeiParts(t2);
  return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day;
}

/**
 * 計算該時間戳所在台北日期的 23:59:59.999 時間戳。
 */
export function getTaipeiDayEnd(timestamp: number): number {
  const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
  const d = new Date(timestamp + TAIPEI_OFFSET_MS);
  return (
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999) -
    TAIPEI_OFFSET_MS
  );
}

/**
 * 格式化台北時間字串。
 */
export function formatTaipeiDate(timestamp: number, includeTime = true): string {
  const parts = getTaipeiParts(timestamp);
  if (!includeTime) {
    return `${parts.month}/${parts.day}`;
  }
  const hh = String(parts.hours).padStart(2, '0');
  const mm = String(parts.minutes).padStart(2, '0');
  return `${parts.month}/${parts.day} ${hh}:${mm}`;
}

/**
 * 計算卡片角落相對時間標籤（剛剛 / n 分鐘前 / n 小時前 / 昨天 / M/D）。
 */
export function getRelativeTimeLabel(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < 60 * 1000) {
    return '剛剛';
  }
  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / (60 * 1000));
    return `${mins} 分鐘前`;
  }
  const partsNow = getTaipeiParts(now);
  const partsThen = getTaipeiParts(timestamp);
  if (
    partsNow.year === partsThen.year &&
    partsNow.month === partsThen.month &&
    partsNow.day === partsThen.day
  ) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} 小時前`;
  }
  // 檢查是否為昨天
  const yesterdayParts = getTaipeiParts(now - 24 * 60 * 60 * 1000);
  if (
    yesterdayParts.year === partsThen.year &&
    yesterdayParts.month === partsThen.month &&
    yesterdayParts.day === partsThen.day
  ) {
    return '昨天';
  }
  return `${partsThen.month}/${partsThen.day}`;
}

/**
 * 判斷 actorId 是否為好友（相容 friend_* 與 user_* 前綴）。
 */
export function isActorFriend(
  actorId: string | undefined,
  friendIds: string[] = []
): boolean {
  if (!actorId) return false;
  if (friendIds.includes(actorId)) return true;
  if (actorId.startsWith('friend_')) {
    const u = actorId.replace(/^friend_/, 'user_');
    if (friendIds.includes(u)) return true;
  }
  if (actorId.startsWith('user_')) {
    const f = actorId.replace(/^user_/, 'friend_');
    if (friendIds.includes(f)) return true;
  }
  return false;
}

/**
 * 試玩版假角色暱稱與等級映射（IS_DEMO  fallback）。
 */
export const DEMO_NICKNAME_FALLBACKS: Record<string, { nickname: string; level: number }> = {
  friend_akai: { nickname: '阿凱', level: 14 },
  user_akai: { nickname: '阿凱', level: 14 },
  friend_alice: { nickname: '艾莉絲', level: 19 },
  user_alice: { nickname: '艾莉絲', level: 19 },
  friend_chloe: { nickname: '小柔', level: 9 },
  user_chloe: { nickname: '小柔', level: 9 },
  user_leo: { nickname: 'Leo', level: 22 },
  friend_leo: { nickname: 'Leo', level: 22 },
  demo_mika: { nickname: 'Mika', level: 18 },
  user_mika: { nickname: 'Mika', level: 18 },
  demo_jun: { nickname: 'Jun', level: 25 },
  user_jun: { nickname: 'Jun', level: 25 },
  celeb_titan_chen: { nickname: '陳巨石', level: 42 },
  celeb_aesthetic_lin: { nickname: '林健美', level: 36 },
};

/**
 * 從名稱字串中提取乾淨暱稱（例如 "深蹲救星・阿凱" -> "阿凱"）。
 */
export function extractCleanNickname(rawName?: string, actorId?: string): string {
  if (actorId && DEMO_NICKNAME_FALLBACKS[actorId]) {
    return DEMO_NICKNAME_FALLBACKS[actorId].nickname;
  }
  if (!rawName) {
    if (actorId) {
      const cleanId = actorId.replace(/^(friend_|user_|demo_)/, '');
      return cleanId ? cleanId.charAt(0).toUpperCase() + cleanId.slice(1) : '隊友';
    }
    return '隊友';
  }
  if (rawName.includes('・')) {
    const parts = rawName.split('・');
    return parts[parts.length - 1].trim();
  }
  if (rawName.includes(' · ')) {
    const parts = rawName.split(' · ');
    return parts[parts.length - 1].trim();
  }
  return rawName.trim();
}

/**
 * 計算通知是否已過期。
 */
export function isNotificationExpired(
  item: NotificationItem,
  now: number = Date.now()
): boolean {
  if (item.status === 'expired') return true;

  if (item.type === 'squad_invite' || item.type === 'join_request') {
    const expiresAt =
      typeof item.expiresAt === 'number'
        ? item.expiresAt
        : item.createdAt + SQUAD_INVITE_TTL_MS;
    return now >= expiresAt;
  }

  if (item.type === 'friend_request') {
    const expiresAt =
      typeof item.expiresAt === 'number'
        ? item.expiresAt
        : item.createdAt + FRIEND_REQUEST_TTL_MS;
    return now >= expiresAt;
  }

  if (item.type === 'nudge') {
    const dayEnd = getTaipeiDayEnd(item.createdAt);
    return now > dayEnd;
  }

  return false;
}

/**
 * 判斷發送者是否在封鎖名單中 (T3-D10)。
 */
export function isActorBlocked(
  actorId: string | undefined,
  blockedIds: string[] | undefined
): boolean {
  if (!actorId || !Array.isArray(blockedIds) || blockedIds.length === 0) return false;
  if (blockedIds.includes(actorId)) return true;
  const cleanId = actorId.replace(/^(user_|friend_|demo_)/, '');
  return blockedIds.some((b) => {
    if (b === actorId) return true;
    const cleanB = b.replace(/^(user_|friend_|demo_)/, '');
    return Boolean(cleanId && cleanB && cleanId === cleanB);
  });
}

/**
 * 1a / 1b: 判斷單一通知項目是否應對收件者靜默隱藏。
 * T3-D10: 若 item.actorId 在 ctx.blockedIds 中，一律過濾隱藏。
 */
export function isNotificationHiddenByContext(
  item: NotificationItem,
  ctx: RecipientNotifyContext
): boolean {
  if (!item) return true;

  // 封鎖名單過濾 (T3-D10)：若發送者在封鎖名單中，所有通知一律隱藏且不計紅點
  if (isActorBlocked(item.actorId, ctx.blockedIds)) {
    return true;
  }

  // 手動標記略過者永遠不顯示
  if (item.status === 'skipped' && item.type === 'nudge') {
    return true;
  }

  // 1a. 隊友提醒過濾 (Q19)
  if (item.type === 'nudge') {
    if (ctx.isRestDay || ctx.isCaringForBody || ctx.isPaused) {
      return true;
    }
  }

  // 1b. 未成年保護過濾陌生人組隊邀請與入隊申請
  if (ctx.isMinor) {
    if (item.type === 'squad_invite' || item.type === 'join_request' || item.type === 'friend_request') {
      const isFriend = isActorFriend(item.actorId, ctx.friendIds);
      if (!isFriend) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 1c. 修剪通知清單：
 * - 丟棄大於 30 天的通知
 * - 依 createdAt 降序（最新在前），同時間依 id 排序
 * - 截取上限 50 筆
 */
export function pruneNotifications(
  list: NotificationItem[],
  now: number = Date.now()
): NotificationItem[] {
  if (!Array.isArray(list)) return [];
  const cutoff = now - NOTIFICATIONS_KEEP_MS;
  return list
    .filter((n) => n && typeof n.createdAt === 'number' && n.createdAt >= cutoff)
    .sort((a, b) => (b.createdAt - a.createdAt) || (b.id || '').localeCompare(a.id || ''))
    .slice(0, NOTIFICATIONS_CAP);
}

export interface VisibleNotificationsResult {
  pendingActionable: NotificationItem[];
  general: NotificationItem[];
  all: NotificationItem[];
}

/**
 * 1e. 取得可見通知清單並區分「需要處理」與「一般」。
 * - 先 pruneNotifications
 * - 依收件者 context 過濾隊友提醒及未成年陌生人邀請
 * - 需要處理 (pendingActionable)：組隊邀請 / 入隊申請 / 好友申請 且 status === 'pending' 且未過期
 * - 其餘（過期、已處理、結果、變動、催促等）歸入一般 (general)，依時間新到舊排序
 */
export function visibleNotifications(
  list: NotificationItem[],
  ctx: RecipientNotifyContext,
  now: number = Date.now()
): VisibleNotificationsResult {
  const pruned = pruneNotifications(list, now);
  const visible = pruned.filter((item) => !isNotificationHiddenByContext(item, ctx));

  const pendingActionable: NotificationItem[] = [];
  const general: NotificationItem[] = [];

  const ACTIONABLE_TYPES = new Set(['squad_invite', 'join_request', 'friend_request']);

  for (const item of visible) {
    const isPending = !item.status || item.status === 'pending';
    const expired = isNotificationExpired(item, now);

    if (ACTIONABLE_TYPES.has(item.type) && isPending && !expired) {
      pendingActionable.push(item);
    } else {
      general.push(item);
    }
  }

  // pendingActionable 亦維持新到舊排序
  pendingActionable.sort((a, b) => (b.createdAt - a.createdAt) || (b.id || '').localeCompare(a.id || ''));
  general.sort((a, b) => (b.createdAt - a.createdAt) || (b.id || '').localeCompare(a.id || ''));

  return {
    pendingActionable,
    general,
    all: [...pendingActionable, ...general],
  };
}

/**
 * 計算未讀通知數量（僅計算可見清單中 readAt == null 者）。
 */
export function unreadCount(
  visibleList: NotificationItem[]
): number {
  if (!Array.isArray(visibleList)) return 0;
  return visibleList.reduce((count, item) => {
    return (item && (item.readAt == null || item.readAt === undefined)) ? count + 1 : count;
  }, 0);
}

/**
 * 未讀紅點顯示字串：0 -> '' (隱藏), 1~9 -> 數字, 10+ -> '9+'
 */
export function getUnreadBadgeText(count: number): string {
  if (count <= 0) return '';
  if (count > 9) return '9+';
  return String(count);
}

/**
 * 將所有當前可見之未讀通知標記為已讀（不影響隱藏之通知）。
 */
export function markAllRead(
  list: NotificationItem[],
  visibleIds: Set<string> | string[],
  now: number = Date.now()
): NotificationItem[] {
  if (!Array.isArray(list)) return [];
  const targetIds = visibleIds instanceof Set ? visibleIds : new Set(visibleIds);
  return list.map((item) => {
    if (targetIds.has(item.id) && (item.readAt == null || item.readAt === undefined)) {
      return { ...item, readAt: now };
    }
    return item;
  });
}

/** Profile lookup 介面 */
export type ProfileLookupArg =
  | {
      getProfile?: (id: string) => { nameZh?: string; level?: number } | undefined;
      friendIds?: string[];
    }
  | ((actorId?: string) => { nickname?: string; level?: number } | undefined);

/**
 * 1d. 建構通知卡片之視圖模型，並嚴格剝除未在白名單中之鍵值。
 */
export function toNotificationView(
  item: NotificationItem,
  lookup?: ProfileLookupArg,
  now: number = Date.now()
): NotificationView {
  // 解析暱稱與等級
  let resolvedNickname: string | undefined;
  let resolvedLevel: number | undefined;
  let friendIds: string[] = [];

  if (typeof lookup === 'function') {
    const prof = lookup(item.actorId);
    if (prof) {
      resolvedNickname = prof.nickname;
      resolvedLevel = prof.level;
    }
  } else if (lookup && typeof lookup === 'object') {
    if (Array.isArray(lookup.friendIds)) {
      friendIds = lookup.friendIds;
    }
    if (typeof lookup.getProfile === 'function' && item.actorId) {
      const prof = lookup.getProfile(item.actorId);
      if (prof) {
        resolvedNickname = prof.nameZh;
        resolvedLevel = prof.level;
      }
    }
  }

  // 嘗試從 DEMO_NICKNAME_FALLBACKS 補充
  if (item.actorId && DEMO_NICKNAME_FALLBACKS[item.actorId]) {
    if (!resolvedNickname) {
      resolvedNickname = DEMO_NICKNAME_FALLBACKS[item.actorId].nickname;
    }
    if (resolvedLevel === undefined) {
      resolvedLevel = DEMO_NICKNAME_FALLBACKS[item.actorId].level;
    }
  }

  const nickname = extractCleanNickname(resolvedNickname, item.actorId);
  const actorLevel = resolvedLevel ?? 6;

  const isStranger =
    ['squad_invite', 'join_request', 'friend_request'].includes(item.type) &&
    item.actorId &&
    item.actorId !== 'self'
      ? !isActorFriend(item.actorId, friendIds)
      : false;
  const isExpired = isNotificationExpired(item, now);
  const isInvalid = item.status === 'invalid';
  const isHandled = ['accepted', 'declined', 'skipped'].includes(item.status || '');

  // 依類型決定標題、副行與動作按鈕
  let title = '';
  let subtitle: string | undefined;
  let expiryLabel: string | undefined;
  let handledLabel: string | undefined;
  let actionType: NotificationView['actionType'] = 'none';

  const expiresAt =
    typeof item.expiresAt === 'number'
      ? item.expiresAt
      : item.type === 'friend_request'
        ? item.createdAt + FRIEND_REQUEST_TTL_MS
        : item.createdAt + SQUAD_INVITE_TTL_MS;

  const effectiveStatus = isExpired
    ? 'expired'
    : isInvalid
      ? 'invalid'
      : item.status || 'pending';

  switch (item.type) {
    case 'squad_invite': {
      title = `${nickname} 邀請你加入組隊`;
      actionType = 'invite';
      if (effectiveStatus === 'expired') {
        subtitle = '這個邀請已過期';
      } else if (effectiveStatus === 'invalid') {
        subtitle = '這個邀請已失效';
      } else if (isHandled) {
        handledLabel = item.status === 'accepted' ? '已加入' : '已拒絕';
      } else {
        expiryLabel = `有效到 ${formatTaipeiDate(expiresAt, true)}`;
      }
      break;
    }

    case 'join_request': {
      title = `${nickname} 想加入你的隊伍`;
      actionType = 'join_request';
      if (effectiveStatus === 'expired') {
        subtitle = '這個申請已過期';
      } else if (effectiveStatus === 'invalid') {
        subtitle = '這個邀請已失效';
      } else if (isHandled) {
        handledLabel = item.status === 'accepted' ? '已同意' : '已拒絕';
      } else {
        expiryLabel = `有效到 ${formatTaipeiDate(expiresAt, true)}`;
      }
      break;
    }

    case 'friend_request': {
      title = `${nickname} 想加你為好友`;
      actionType = 'friend_request';
      if (effectiveStatus === 'expired') {
        subtitle = '這個好友申請已過期';
      } else if (effectiveStatus === 'invalid') {
        subtitle = '這個邀請已失效';
      } else if (isHandled) {
        handledLabel = item.status === 'accepted' ? '已同意' : '已略過';
      } else {
        expiryLabel = `有效到 ${formatTaipeiDate(expiresAt, false)}`;
      }
      break;
    }

    case 'friend_accepted': {
      title = `你和 ${nickname} 已成為好友`;
      actionType = 'none';
      break;
    }

    case 'nudge': {
      title = `${nickname} 約你一起打 Boss`;
      actionType = 'nudge';
      const dayEnd = getTaipeiDayEnd(item.createdAt);
      if (now > dayEnd) {
        // 過了當天 23:59，移除「看看 Boss」按鈕
        actionType = 'none';
      } else {
        expiryLabel = '今天 23:59 前有效';
      }
      break;
    }

    case 'result_success': {
      actionType = 'goto_squad';
      if (item.refId === 'self' || item.actorId === 'self') {
        title = `你已加入「${item.squadName || '隊伍'}」`;
      } else {
        title = `${nickname} 加入了隊伍`;
      }
      break;
    }

    case 'result_failure': {
      // 統一中性失敗文案，不論內部原因為何，絕不洩漏
      if (item.refId === 'self' || item.actorId === 'self') {
        title = '這次沒有加入成功';
        subtitle = '可以去找別的隊伍看看';
        actionType = 'find_squad';
      } else {
        title = `${nickname} 目前無法加入`;
        actionType = 'none';
      }
      break;
    }

    case 'squad_change': {
      if (item.refId === 'leader_transfer') {
        title = '你成為隊長';
        actionType = 'goto_squad';
      } else if (item.refId === 'disband') {
        title = `「${item.squadName || '隊伍'}」已解散`;
        actionType = 'find_squad';
      } else if (item.refId === 'kicked' || item.refId === 'left_self') {
        title = '你已離開這支隊伍';
        actionType = 'find_squad';
      } else if (item.refId === 'member_leave') {
        title = `${nickname} 離開了隊伍`;
        actionType = 'goto_squad';
      } else {
        title = `${nickname} 加入了隊伍`;
        actionType = 'goto_squad';
      }
      break;
    }

    default: {
      title = `${nickname} 傳送了新通知`;
      actionType = 'none';
      break;
    }
  }

  const relativeTimeLabel = getRelativeTimeLabel(item.createdAt, now);

  const rawView: Record<string, unknown> = {
    id: item.id,
    type: item.type,
    actorId: item.actorId,
    refId: item.refId,
    squadName: item.squadName,
    createdAt: item.createdAt,
    readAt: item.readAt,
    status: effectiveStatus,
    expiresAt: item.expiresAt,
    nickname,
    avatar: item.actorId ? nickname.charAt(0) : undefined,
    actorLevel,
    memberCount: (item as any).memberCount ?? 2,
    bossName: (item as any).bossName ?? '沙發馬鈴薯怪',
    isStranger,
    isExpired,
    isInvalid,
    isHandled,
    expiryLabel,
    relativeTimeLabel,
    title,
    subtitle,
    handledLabel,
    actionType,
  };

  // 嚴格白名單過濾，確保無任何健康、運動或敏感資訊鍵
  const filteredView: Record<string, unknown> = {};
  for (const key of NOTIFICATION_VIEW_WHITELIST) {
    if (rawView[key] !== undefined) {
      filteredView[key] = rawView[key];
    }
  }

  // 文案安全斷言
  assertNoSensitiveNotificationText(title);
  if (subtitle) assertNoSensitiveNotificationText(subtitle);
  if (expiryLabel) assertNoSensitiveNotificationText(expiryLabel);

  return filteredView as unknown as NotificationView;
}
