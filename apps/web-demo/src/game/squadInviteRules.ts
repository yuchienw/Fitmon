/**
 * FitMon Pure Squad Invite & Join Request Rules (T3-D3)
 *
 * All join / invite / request mutations are one pure function:
 *   applySquadSocialAction(state, action, now, fakeSquads?) => { ok, reason?, patch?, result? }
 *
 * Rules:
 * - `now` is passed in; never call Date.now() inside the pure module.
 * - `reason` is an INTERNAL code for tests only. Never surface `reason` in UI or console.
 * - Export `PUBLIC_JOIN_FAILURE = '對方目前無法加入'` and `publicJoinFailureMessage(_reason?: string) => PUBLIC_JOIN_FAILURE`.
 * - All failure paths map to `PUBLIC_JOIN_FAILURE`.
 * - SQUAD_CAP = 4 (including the leader).
 * - INVITE_TTL_MS = 24 * 60 * 60 * 1000.
 * - DEMO_PLAYER_ID = 'self'.
 * - DEMO_PLAYER_SQUAD_ID = 'squad_self'.
 * - Auto-reply default rate: AUTO_REPLY_ACCEPT_RATE = 0.8.
 */

import {
  type AvatarBodyStage,
  type EquipSlot,
  resolveFriendProfileId,
} from '../config/catalogConfig.ts';
import {
  IS_DEMO,
  DEMO_FAKE_SQUADS as DEMO_FAKE_SQUADS_RAW,
  type DemoFakeSquad,
  DEMO_PLAYER_DIRECTORY,
  type DemoSearchablePlayer,
} from '../config/demo.ts';
import { SOCIAL_RATE_LIMITS } from '../config/economy.ts';
import type {
  RecentTeammateItem,
  NotificationItem,
  InviteSendLogItem,
  PlayerPrivacySettings,
} from './persistMigrate.ts';
import { isSameTaipeiDay, pruneNotifications } from './notificationCenter.ts';
import {
  getEarliestSuccessor,
  upsertRecentTeammates,
  BOSS_REWARD_ALREADY_CLAIMED_NOTE,
  DEFAULT_EMPTY_SQUAD_NAME,
} from './squadMembershipRules.ts';
import {
  hasClaimedSquadBossRewardThisWeek,
  getSquadBossMaxHp,
} from './economyRules.ts';

export const SQUAD_CAP = 4;
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
export const DEMO_PLAYER_ID = 'self';
export const DEMO_PLAYER_SQUAD_ID = 'squad_self';
export const PUBLIC_JOIN_FAILURE = '對方目前無法加入';
export const AUTO_REPLY_ACCEPT_RATE = 0.8;

export const DAILY_INVITE_CAP_REACHED_MESSAGE = '今天的邀請次數用完了，明天再來';
export const COOLDOWN_MESSAGE = '稍後再邀請這位玩家';
export const INVITE_CANCELLED_TOAST = '已取消邀請';
export const SQUAD_FULL_INVITE_MESSAGE = '隊伍已滿，暫時不能再邀請。';

export function publicJoinFailureMessage(_reason?: string): string {
  return PUBLIC_JOIN_FAILURE;
}

/**
 * 試玩用，S1 以伺服器亂數碼取代
 * QA-07 戰隊邀請碼單一真相來源：依 squadName 雜湊產生 FITxxx，無隊名時為 FIT732
 */
export function getSquadInviteCode(squadName?: string | null): string {
  if (!squadName) return 'FIT732';
  const hash = Math.abs(
    squadName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 732)
  );
  return `FIT${(hash % 900) + 100}`;
}

export interface SquadMemberAvatarCache {
  bodyStage: AvatarBodyStage;
  equipped: Partial<Record<EquipSlot, string>>;
  updatedAt: number;
}

export interface SquadMemberState {
  id: string;
  nameZh: string;
  roleType: 'phy' | 'mag' | 'support';
  roleBadgeZh: string;
  gearDescZh: string;
  hasWorkedOutToday: boolean;
  workoutAuditZh: string;
  isSuspectedCheater?: boolean;
  comboSkillAppliedZh?: string;
  damageDealt: number;
  nudgedCount: number;
  bodyStage?: AvatarBodyStage;
  equipped?: Partial<Record<EquipSlot, string>>;
  avatarCache?: SquadMemberAvatarCache;
  currentSquadId?: string;
  isMinor?: boolean;
}

// 假角色候選池（測試用）
// 資安規定：假角色不得使用真實個資（無真實姓名、電話、Email 或真人照片）。
export const SQUAD_CANDIDATE_POOL: SquadMemberState[] = IS_DEMO
  ? [
  {
    id: 'friend_akai',
    nameZh: '重訓狂人 · 阿凱',
    roleType: 'phy',
    roleBadgeZh: '🥊 物攻專精',
    gearDescZh: '紅黑競技健力服 + 24K 奧林匹亞金槓',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 胸背重訓 8組 · 組間計時完整 (38分鐘)',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔨 連攜技【破甲重擊】：使下位隊友魔攻 ×2.0 倍',
    damageDealt: 650,
    nudgedCount: 0,
    bodyStage: 'powerlifter',
    equipped: {
      hair: 'hair_maple_cap',
      face: 'face_pixel_shades',
      top: 'top_pump_cover',
      bottom: 'bottom_camo_joggers',
      accessory: 'acc_protein_shaker',
    },
  },
  {
    id: 'friend_alice',
    nameZh: '有氧女神 · 小愛',
    roleType: 'mag',
    roleBadgeZh: '🪄 魔攻破盾',
    gearDescZh: '綠光泵感寬T + 暗夜迷彩束口褲',
    hasWorkedOutToday: false,
    workoutAuditZh: '⚠️ 今日尚未運動打卡（可敲她提醒上線）',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔥 連攜技【燃脂魔焰】：引爆破甲並融化高糖護盾',
    damageDealt: 0,
    nudgedCount: 0,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_ headband_red',
      face: 'face_confident_smile',
      top: 'top_crimson_sbd',
      bottom: 'bottom_gold_tights',
      accessory: 'acc_iron_dumbbell',
    },
  },
  {
    id: 'user_leo',
    nameZh: '街頭健體 · Leo',
    roleType: 'phy',
    roleBadgeZh: '🥊 力量型',
    gearDescZh: '黑魂訓練吊嘎 + 鑄鐵 20kg 啞鈴',
    hasWorkedOutToday: true,
    workoutAuditZh: '🤥 耗時 5 秒狂按 6 組深蹲 (組間休息 0秒 · 疑似空氣健身)',
    isSuspectedCheater: true,
    comboSkillAppliedZh: '⚠️ 未通過組間休息驗證（無法觸發連攜技）',
    damageDealt: 15,
    nudgedCount: 0,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_spiky_gold',
      face: 'face_confident_smile',
      top: 'top_bare_muscles',
      bottom: 'bottom_camo_joggers',
      accessory: 'acc_iron_dumbbell',
    },
  },
  {
    id: 'celeb_titan_chen',
    nameZh: '健力金牌 · 陳巨石',
    roleType: 'phy',
    roleBadgeZh: '👑 泰坦物攻王',
    gearDescZh: '斯巴達戰神披風 + 24K 奧林匹亞金槓',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 大重量深蹲硬舉 10組 · 組間計時完整 (52分鐘)',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔨 連攜技【泰坦破甲】：全隊物攻與破甲倍率大幅提升',
    damageDealt: 920,
    nudgedCount: 0,
    bodyStage: 'titan',
    equipped: {
      hair: 'hair_titan_crown',
      face: 'face_fierce_grit',
      top: 'top_bare_muscles',
      bottom: 'bottom_navy_shorts',
      accessory: 'acc_gold_barbell',
    },
  },
  {
    id: 'celeb_aesthetic_lin',
    nameZh: '古典健體 · 林健美',
    roleType: 'mag',
    roleBadgeZh: '✨ 魔攻暴擊手',
    gearDescZh: '超賽亞金焰髮 + 賽博金邊壓縮褲',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 肩臂超級組 + 飛輪燃脂 35分鐘 · 組間完整',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔥 連攜技【燃脂魔焰】：對護盾型 Boss 造成 2.0 倍魔傷',
    damageDealt: 780,
    nudgedCount: 0,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_spiky_gold',
      face: 'face_pixel_shades',
      top: 'top_bare_muscles',
      bottom: 'bottom_gold_tights',
      accessory: 'acc_protein_shaker',
    },
  },
  {
    id: 'friend_chloe',
    nameZh: '核心瑜珈 · 小柔',
    roleType: 'support',
    roleBadgeZh: '🛡️ 輔助增益',
    gearDescZh: '熱血赤紅頭帶 + 翡翠乳清搖搖杯',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 核心棒式與徒手流瑜珈 6組 · 組間計時完整 (30分鐘)',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🌪️ 連攜技【聚氣暴擊】：全隊掉寶率 ×2 倍、弱點暴擊加成',
    damageDealt: 540,
    nudgedCount: 0,
    bodyStage: 'beginner',
    equipped: {
      hair: 'hair_ headband_red',
      face: 'face_confident_smile',
      top: 'top_pump_cover',
      bottom: 'bottom_navy_shorts',
      accessory: 'acc_protein_shaker',
    },
  },
] : [];

// 測試用，上線前移除
export type { DemoFakeSquad };
// inviteCode 必須等於 getSquadInviteCode(name)，否則輸入測試代碼會對不上。
export const DEMO_FAKE_SQUADS: DemoFakeSquad[] = IS_DEMO
  ? DEMO_FAKE_SQUADS_RAW.map((s) => ({
      ...s,
      inviteCode: getSquadInviteCode(s.name),
    }))
  : [];

export type SquadSocialSource = 'friend' | 'recent' | 'code' | 'link';
export type SquadSocialKind = 'invite' | 'request';
export type SquadSocialStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'invalid';

export interface SquadInviteItem {
  id: string;
  kind: SquadSocialKind;
  status: SquadSocialStatus;
  fromId: string;
  toId: string;
  squadId: string;
  squadName: string;
  createdAt: number;
  expiresAt: number;
  // Reserved fields for T3-D8:
  targetId: string;
  source: SquadSocialSource;
  notificationId: string | null;
}

export interface SquadSocialStateSnapshot {
  playerId: string; // DEMO_PLAYER_ID ('self')
  currentSquadId: string;
  isSquadLeader: boolean;
  squadName: string;
  squadMembers: SquadMemberState[];
  squadInvites: SquadInviteItem[];
  friendIds: string[];
  devMinorTestAccount: boolean;
  squadJoinOrder?: string[];
  recentTeammates?: RecentTeammateItem[];
  inviteSendLog?: InviteSendLogItem[];
  privacy?: PlayerPrivacySettings;
  blockedIds?: string[];
  bossRewardClaimedWeekKey?: string | null;
  notifications?: NotificationItem[];
  squadStage?: number;
  squadBossHp?: number;
}

export type SquadSocialAction =
  | {
      type: 'sendInvite';
      id: string;
      fromId: string;
      toId: string;
      squadId: string;
      source: SquadSocialSource;
    }
  | {
      type: 'sendJoinRequest';
      id: string;
      fromId: string;
      squadId: string;
      source: SquadSocialSource;
      toId?: string;
    }
  | {
      type: 'acceptInvite';
      id: string;
      actorId: string;
      joinerSquadId?: string;
    }
  | {
      type: 'acceptRequest';
      id: string;
      actorId: string;
      joinerSquadId?: string;
    }
  | {
      type: 'declineInvite';
      id: string;
      actorId: string;
    }
  | {
      type: 'declineRequest';
      id: string;
      actorId: string;
    }
  | {
      type: 'cancelPending';
      id: string;
      actorId: string;
    }
  | {
      type: 'expireDue';
    }
  | {
      type: 'submitInviteCode';
      id: string;
      actorId: string;
      code: string;
      source: 'code';
    };

export type SquadSocialInternalReason =
  | 'rejected'
  | 'full'
  | 'in_other_squad'
  | 'expired'
  | 'cancelled'
  | 'already_pending'
  | 'no_open_slot_for_invite'
  | 'minor_blocked'
  | 'not_found'
  | 'self'
  | 'already_member'
  | 'no_consent'
  | 'not_leader'
  | 'not_pending'
  | 'empty'
  | 'daily_cap_reached'
  | 'non_friend_daily_cap_reached'
  | 'cooldown'
  | '7day_limit_reached'
  | 'blocked'
  | 'minor_sender_non_friend'
  | 'target_minor_non_friend'
  | 'squad_has_minor'
  | 'privacy_friends_only'
  | 'code_hidden';

export interface SquadSocialActionResult {
  type?: string;
  toastMessage?: string;
  publicMessage?: string;
  [key: string]: unknown;
}

export interface SquadSocialResult {
  ok: boolean;
  reason?: SquadSocialInternalReason;
  patch?: Partial<SquadSocialStateSnapshot>;
  result?: SquadSocialActionResult;
}

function isSameMember(a: string, b: string): boolean {
  if (a === b) return true;
  const resA = resolveFriendProfileId(a) || a;
  const resB = resolveFriendProfileId(b) || b;
  return resA === resB;
}

function findCandidate(id: string): SquadMemberState | undefined {
  const resolved = resolveFriendProfileId(id) || id;
  return SQUAD_CANDIDATE_POOL.find(
    (c) => c.id === id || c.id === resolved || (resolveFriendProfileId(c.id) || c.id) === resolved
  );
}

function isJoinerInOtherSquad(
  joinerId: string,
  targetSquadId: string,
  fakeSquads: DemoFakeSquad[],
  explicitJoinerSquadId?: string
): boolean {
  if (explicitJoinerSquadId && explicitJoinerSquadId !== targetSquadId) {
    return true;
  }
  const candidate = findCandidate(joinerId);
  if (candidate?.currentSquadId && candidate.currentSquadId !== targetSquadId) {
    return true;
  }
  for (const sq of fakeSquads) {
    if (sq.id !== targetSquadId) {
      if (isSameMember(sq.leaderId, joinerId)) return true;
      if (sq.members.some((m) => isSameMember(m.id, joinerId))) return true;
    }
  }
  return false;
}

function pruneExcessOutgoingInvites(
  invites: SquadInviteItem[],
  squadId: string,
  currentMembersCount: number
): SquadInviteItem[] {
  const openSlots = Math.max(0, SQUAD_CAP - currentMembersCount);
  const outgoingPending = invites.filter(
    (i) => i.status === 'pending' && i.kind === 'invite' && i.squadId === squadId
  );
  if (outgoingPending.length <= openSlots) {
    return invites;
  }
  const excessCount = outgoingPending.length - openSlots;
  const sortedByNewest = [...outgoingPending].sort((a, b) => b.createdAt - a.createdAt);
  const toExpireIds = new Set(sortedByNewest.slice(0, excessCount).map((i) => i.id));
  return invites.map((i) => (toExpireIds.has(i.id) ? { ...i, status: 'expired' as const } : i));
}

export function pruneInviteSendLog(
  log: InviteSendLogItem[] | undefined | null,
  now: number
): InviteSendLogItem[] {
  const cutoff = now - SOCIAL_RATE_LIMITS.squadInvite.window7DaysMs;
  return (Array.isArray(log) ? log : []).filter((entry) => entry && entry.sentAt >= cutoff);
}

export function getTodaySquadInviteCount(
  log: InviteSendLogItem[] | undefined | null,
  now: number
): number {
  return (Array.isArray(log) ? log : []).filter(
    (entry) => entry && typeof entry.sentAt === 'number' && isSameTaipeiDay(entry.sentAt, now)
  ).length;
}

export function getTodayNonFriendSquadInviteCount(
  log: InviteSendLogItem[] | undefined | null,
  friendIds: string[] | undefined | null,
  now: number
): number {
  const currentFriends = Array.isArray(friendIds) ? friendIds : [];
  return (Array.isArray(log) ? log : []).filter((entry) => {
    if (!entry || typeof entry.sentAt !== 'number') return false;
    if (!isSameTaipeiDay(entry.sentAt, now)) return false;
    if (entry.outcome === 'non_friend') return true;
    if (entry.outcome === 'friend') return false;
    return !currentFriends.some((f) => isSameMember(f, entry.targetId));
  }).length;
}

export function get7DaySquadInviteCountForPerson(
  log: InviteSendLogItem[] | undefined | null,
  targetId: string,
  now: number
): number {
  const cutoff = now - SOCIAL_RATE_LIMITS.squadInvite.window7DaysMs;
  return (Array.isArray(log) ? log : []).filter(
    (entry) =>
      entry &&
      typeof entry.sentAt === 'number' &&
      entry.sentAt >= cutoff &&
      isSameMember(entry.targetId, targetId)
  ).length;
}

export function isPersonInSquadInviteCooldown(
  invites: SquadInviteItem[] | undefined | null,
  targetId: string,
  now: number
): boolean {
  if (!Array.isArray(invites)) return false;
  const pastInvites = invites.filter(
    (i) =>
      (isSameMember(i.targetId, targetId) || isSameMember(i.toId, targetId)) &&
      (i.status === 'declined' || i.status === 'cancelled' || i.status === 'expired')
  );
  if (pastInvites.length === 0) return false;
  for (const inv of pastInvites) {
    const eventTime = inv.expiresAt;
    if (now - eventTime < SOCIAL_RATE_LIMITS.squadInvite.perPersonCooldownMs) {
      return true;
    }
  }
  return false;
}

export function isDailySquadInviteCapReached(
  log: InviteSendLogItem[] | undefined | null,
  now: number
): boolean {
  return getTodaySquadInviteCount(log, now) >= SOCIAL_RATE_LIMITS.squadInvite.maxPerDay;
}

export function isNonFriendDailySquadInviteCapReached(
  log: InviteSendLogItem[] | undefined | null,
  friendIds: string[] | undefined | null,
  now: number
): boolean {
  return (
    getTodayNonFriendSquadInviteCount(log, friendIds, now) >=
    SOCIAL_RATE_LIMITS.squadInvite.maxNonFriendPerDay
  );
}

export type SquadInviteRowButtonState =
  | 'in_squad'
  | 'pending'
  | 'cooldown'
  | 'squad_full'
  | 'daily_limit'
  | 'open_slots_exhausted'
  | 'can_invite';

export function getSquadInviteRowState(
  state: SquadSocialStateSnapshot,
  targetId: string,
  now: number
): SquadInviteRowButtonState {
  if (
    isSameMember(targetId, state.playerId) ||
    state.squadMembers.some((m) => isSameMember(m.id, targetId))
  ) {
    return 'in_squad';
  }
  const pending = (state.squadInvites || []).some(
    (i) =>
      i.status === 'pending' &&
      i.kind === 'invite' &&
      i.squadId === state.currentSquadId &&
      isSameMember(i.targetId, targetId)
  );
  if (pending) {
    return 'pending';
  }
  if (
    isPersonInSquadInviteCooldown(state.squadInvites || [], targetId, now) ||
    get7DaySquadInviteCountForPerson(state.inviteSendLog || [], targetId, now) >=
      SOCIAL_RATE_LIMITS.squadInvite.maxPerPersonPer7Days
  ) {
    return 'cooldown';
  }
  if (1 + state.squadMembers.length >= SQUAD_CAP) {
    return 'squad_full';
  }
  if (isDailySquadInviteCapReached(state.inviteSendLog || [], now)) {
    return 'daily_limit';
  }
  const isFriend = state.friendIds.some((f) => isSameMember(f, targetId));
  if (
    !isFriend &&
    isNonFriendDailySquadInviteCapReached(state.inviteSendLog || [], state.friendIds, now)
  ) {
    return 'daily_limit';
  }
  const openSlots = SQUAD_CAP - (1 + state.squadMembers.length);
  const pendingOutgoing = (state.squadInvites || []).filter(
    (i) => i.status === 'pending' && i.kind === 'invite' && i.squadId === state.currentSquadId
  );
  if (pendingOutgoing.length >= openSlots) {
    return 'open_slots_exhausted';
  }
  return 'can_invite';
}

/**
 * PM Q23 Share Copy
 * 站外分享文字格式：
 * 含邀請碼：
 * {nickname} 邀你加入 FitMon 隊伍「{squadName}」，一起打這週的 Boss！輸入邀請碼 {code}，或點連結：https://yuchienw.github.io/Fitmon/
 * 無邀請碼（討伐召集等）：
 * {nickname} 邀你加入 FitMon 隊伍「${squadName}」，一起打這週的 Boss！點連結：https://yuchienw.github.io/Fitmon/
 */
export function formatSquadShareText(nickname: string, squadName: string, code?: string): string {
  if (code && code.trim().length > 0) {
    return `${nickname} 邀你加入 FitMon 隊伍「${squadName}」，一起打這週的 Boss！輸入邀請碼 ${code}，或點連結：https://yuchienw.github.io/Fitmon/`;
  }
  return `${nickname} 邀你加入 FitMon 隊伍「${squadName}」，一起打這週的 Boss！點連結：https://yuchienw.github.io/Fitmon/`;
}

export interface PreviewSwitchSquadResult {
  kind: 'expired' | 'invalid' | 'confirm_5b' | 'confirm_5c' | 'join_immediately';
  targetSquadName?: string;
  targetSquadId?: string;
  currentSquadName?: string;
  successorName?: string;
  alreadyClaimedThisWeek?: boolean;
  claimedNote?: string;
  pendingInvitesCount?: number;
  confirmTitle?: string;
  confirmBody?: string;
  footerText?: string;
  message?: string;
}

export function previewSwitchSquadFromInvite(
  state: SquadSocialStateSnapshot,
  inviteOrNotifId: string,
  now: number,
  fakeSquads: DemoFakeSquad[] = DEMO_FAKE_SQUADS,
  playerDirectory: DemoSearchablePlayer[] = IS_DEMO ? DEMO_PLAYER_DIRECTORY : []
): PreviewSwitchSquadResult {
  const invite = (state.squadInvites || []).find(
    (i) =>
      i.id === inviteOrNotifId ||
      i.notificationId === inviteOrNotifId ||
      i.squadId === inviteOrNotifId
  );
  const notif = (state.notifications || []).find(
    (n) => n.id === inviteOrNotifId || n.refId === inviteOrNotifId
  );

  const targetSquadId =
    invite?.squadId || notif?.refId || fakeSquads.find((s) => s.name === notif?.squadName)?.id;
  const fakeSquad = fakeSquads.find(
    (s) => s.id === targetSquadId || s.name === notif?.squadName
  );

  const isExpired =
    (invite && (invite.status === 'expired' || invite.expiresAt <= now)) ||
    (notif && (notif.status === 'expired' || (typeof notif.expiresAt === 'number' && notif.expiresAt <= now)));

  if (isExpired) {
    return { kind: 'expired', message: '這個邀請已過期' };
  }

  if (
    invite?.status === 'cancelled' ||
    invite?.status === 'declined' ||
    notif?.status === 'invalid' ||
    notif?.status === 'declined' ||
    !fakeSquad
  ) {
    return { kind: 'invalid', message: '這個邀請已失效' };
  }

  // Target squad full check
  if (fakeSquad.members.length + 1 >= SQUAD_CAP) {
    return { kind: 'invalid', message: '這個邀請已失效' };
  }

  // Blocked check
  const isBlocked =
    (state.blockedIds || []).includes(fakeSquad.leaderId) ||
    playerDirectory.find((d) => d.id === fakeSquad.leaderId)?.blockedYou === true;
  if (isBlocked) {
    return { kind: 'invalid', message: '這個邀請已失效' };
  }

  // Target squad has minor check
  const fakeSquadHasMinor =
    fakeSquad.members.some(
      (m) => m.isMinor || playerDirectory.find((d) => d.id === m.id || isSameMember(d.id, m.id))?.isMinor === true
    ) || playerDirectory.find((d) => d.id === fakeSquad.leaderId)?.isMinor === true;
  if (fakeSquadHasMinor) {
    const isFriendOfMinor = state.friendIds.some(
      (f) =>
        fakeSquad.members.some((m) => isSameMember(f, m.id)) ||
        isSameMember(f, fakeSquad.leaderId)
    );
    if (!isFriendOfMinor) {
      return { kind: 'invalid', message: '這個邀請已失效' };
    }
  }

  if (state.currentSquadId === fakeSquad.id) {
    return { kind: 'invalid', message: '這個邀請已失效' };
  }

  // Squad switch situation
  if (state.squadMembers.length > 0) {
    // 5b Confirm: Already in a squad with other members
    const alreadyClaimedThisWeek = hasClaimedSquadBossRewardThisWeek(
      state.bossRewardClaimedWeekKey,
      now
    );
    const claimedNote = alreadyClaimedThisWeek ? BOSS_REWARD_ALREADY_CLAIMED_NOTE : undefined;
    let successorName: string | undefined;
    if (state.isSquadLeader) {
      const remainingMembers = state.squadMembers.filter((m) => m.id !== state.playerId);
      const successor = getEarliestSuccessor(
        state.squadJoinOrder,
        remainingMembers.map((m) => m.id),
        remainingMembers
      );
      successorName = successor?.name;
    }
    const confirmTitle = `要加入『${fakeSquad.name}』嗎？`;
    let confirmBody = `加入後會離開『${state.squadName}』。`;
    if (state.isSquadLeader && successorName) {
      confirmBody += `你離開後，${successorName} 會成為隊長。`;
    }
    const footerText = '個人金幣、XP、打卡和紀錄都不受影響。';
    return {
      kind: 'confirm_5b',
      targetSquadName: fakeSquad.name,
      targetSquadId: fakeSquad.id,
      currentSquadName: state.squadName,
      successorName,
      alreadyClaimedThisWeek,
      claimedNote,
      confirmTitle,
      confirmBody,
      footerText,
    };
  }

  // 1/4 Empty squad check
  const pendingOutgoing = (state.squadInvites || []).filter(
    (i) =>
      i.status === 'pending' &&
      i.kind === 'invite' &&
      i.squadId === state.currentSquadId
  );
  if (pendingOutgoing.length > 0) {
    // 5c Light Confirm
    const confirmTitle = `要加入『${fakeSquad.name}』嗎？`;
    const confirmBody = `你送出的 ${pendingOutgoing.length} 個邀請會取消。`;
    const footerText = '個人金幣、XP、打卡和紀錄都不受影響。';
    return {
      kind: 'confirm_5c',
      targetSquadName: fakeSquad.name,
      targetSquadId: fakeSquad.id,
      pendingInvitesCount: pendingOutgoing.length,
      confirmTitle,
      confirmBody,
      footerText,
    };
  }

  // Empty squad with no pending outgoing invites: join immediately
  return {
    kind: 'join_immediately',
    targetSquadName: fakeSquad.name,
    targetSquadId: fakeSquad.id,
  };
}

export function applyAcceptInviteFromNotification(
  state: SquadSocialStateSnapshot,
  inviteOrNotifId: string,
  now: number,
  fakeSquads: DemoFakeSquad[] = DEMO_FAKE_SQUADS,
  playerDirectory: DemoSearchablePlayer[] = IS_DEMO ? DEMO_PLAYER_DIRECTORY : []
): SquadSocialResult {
  const preview = previewSwitchSquadFromInvite(
    state,
    inviteOrNotifId,
    now,
    fakeSquads,
    playerDirectory
  );

  if (preview.kind === 'expired') {
    const updatedInvites = (state.squadInvites || []).map((i) =>
      i.id === inviteOrNotifId || i.notificationId === inviteOrNotifId
        ? { ...i, status: 'expired' as const }
        : i
    );
    const updatedNotifs = (state.notifications || []).map((n) =>
      n.id === inviteOrNotifId || n.refId === inviteOrNotifId
        ? { ...n, status: 'expired' }
        : n
    );
    return {
      ok: false,
      reason: 'expired',
      patch: {
        squadInvites: updatedInvites,
        ...(state.notifications ? { notifications: updatedNotifs } : {}),
      },
      result: { publicMessage: '這個邀請已過期' },
    };
  }

  if (preview.kind === 'invalid') {
    const updatedInvites = (state.squadInvites || []).map((i) =>
      i.id === inviteOrNotifId || i.notificationId === inviteOrNotifId
        ? { ...i, status: 'cancelled' as const }
        : i
    );
    const updatedNotifs = (state.notifications || []).map((n) =>
      n.id === inviteOrNotifId || n.refId === inviteOrNotifId
        ? { ...n, status: 'invalid' }
        : n
    );
    return {
      ok: false,
      reason: 'rejected',
      patch: {
        squadInvites: updatedInvites,
        ...(state.notifications ? { notifications: updatedNotifs } : {}),
      },
      result: { publicMessage: '這個邀請已失效' },
    };
  }

  const targetSquad = fakeSquads.find(
    (s) => s.id === preview.targetSquadId || s.name === preview.targetSquadName
  );
  if (!targetSquad) {
    return {
      ok: false,
      reason: 'not_found',
      result: { publicMessage: PUBLIC_JOIN_FAILURE },
    };
  }

  // 1. Leave old squad via D4 leave logic: upsert former teammates into recentTeammates
  const formerTeammateIds = state.squadMembers
    .map((m) => m.id)
    .filter((id) => id !== state.playerId);
  const updatedRecent = upsertRecentTeammates(
    state.recentTeammates,
    formerTeammateIds,
    now
  );

  // 2. Target squad members & join order
  const targetMembers = targetSquad.members.filter((m) => m.id !== state.playerId);
  const targetMemberIds = targetMembers.map((m) => m.id);
  const newJoinOrder = Array.from(
    new Set([targetSquad.leaderId, ...targetMemberIds, state.playerId])
  );

  // 3. Invites patch:
  // - Accepted invite becomes 'accepted'
  // - All other pending invites where player is recipient or sender, or for old squad, become 'cancelled'
  const updatedInvites = (state.squadInvites || []).map((inv) => {
    if (
      inv.id === inviteOrNotifId ||
      inv.notificationId === inviteOrNotifId ||
      (inv.squadId === targetSquad.id && isSameMember(inv.toId, state.playerId))
    ) {
      return { ...inv, status: 'accepted' as const };
    }
    if (
      inv.status === 'pending' &&
      (isSameMember(inv.toId, state.playerId) ||
        isSameMember(inv.fromId, state.playerId) ||
        inv.squadId === state.currentSquadId)
    ) {
      return { ...inv, status: 'cancelled' as const };
    }
    return inv;
  });

  // 4. Notifications patch:
  // - Notification for this invite becomes 'accepted'
  // - All other pending squad_invite notifications become 'invalid'
  let updatedNotifications = state.notifications;
  if (state.notifications) {
    updatedNotifications = state.notifications.map((n) => {
      if (n.id === inviteOrNotifId || n.refId === inviteOrNotifId) {
        return { ...n, status: 'accepted' };
      }
      if (n.type === 'squad_invite' && (!n.status || n.status === 'pending')) {
        return { ...n, status: 'invalid' };
      }
      return n;
    });
  }

  return {
    ok: true,
    patch: {
      currentSquadId: targetSquad.id,
      isSquadLeader: false,
      squadName: targetSquad.name,
      squadMembers: targetMembers,
      squadJoinOrder: newJoinOrder,
      recentTeammates: updatedRecent,
      squadInvites: updatedInvites,
      ...(updatedNotifications ? { notifications: updatedNotifications } : {}),
      squadStage: (targetSquad as any).stage ?? state.squadStage ?? 1,
      squadBossHp:
        (targetSquad as any).bossHp ??
        getSquadBossMaxHp((targetSquad as any).stage ?? state.squadStage ?? 1),
    },
    result: {
      type: 'joined',
      squadName: targetSquad.name,
      toastMessage: `歡迎加入『${targetSquad.name}』！`,
    },
  };
}

/**
 * Pure state reducer for squad invites and join requests.
 * All mutations pass through this single function.
 */
export function applySquadSocialAction(
  state: SquadSocialStateSnapshot,
  action: SquadSocialAction,
  now: number,
  fakeSquads: DemoFakeSquad[] = DEMO_FAKE_SQUADS,
  playerDirectory: DemoSearchablePlayer[] = IS_DEMO ? DEMO_PLAYER_DIRECTORY : []
): SquadSocialResult {
  // 1. Expire any pending items due at `now`
  let invites = (state.squadInvites || []).map((item) => {
    if (item.status === 'pending' && item.expiresAt <= now) {
      return { ...item, status: 'expired' as const };
    }
    return item;
  });

  const defaultJoinOrder = [state.playerId, ...state.squadMembers.map((m) => m.id)];
  const currentJoinOrder =
    Array.isArray(state.squadJoinOrder) && state.squadJoinOrder.length > 0
      ? state.squadJoinOrder
      : defaultJoinOrder;
  const currentRecentTeammates = Array.isArray(state.recentTeammates)
    ? state.recentTeammates
    : [];
  const inviteSendLog = pruneInviteSendLog(state.inviteSendLog || [], now);

  if (action.type === 'expireDue') {
    return {
      ok: true,
      patch: { squadInvites: invites, inviteSendLog },
      result: { type: 'expire_due' },
    };
  }

  switch (action.type) {
    case 'sendInvite': {
      const { id, fromId, toId, squadId, source } = action;

      if (fromId === toId || isSameMember(fromId, toId)) {
        return {
          ok: false,
          reason: 'self',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      // If player is the sender
      if (fromId === state.playerId) {
        if (!state.isSquadLeader || state.currentSquadId !== squadId) {
          return {
            ok: false,
            reason: 'not_leader',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if (state.squadMembers.some((m) => isSameMember(m.id, toId))) {
          return {
            ok: false,
            reason: 'already_member',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        const currentCount = 1 + state.squadMembers.length;
        if (currentCount >= SQUAD_CAP) {
          return {
            ok: false,
            reason: 'full',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        const openSlots = SQUAD_CAP - currentCount;
        const pendingOutgoing = invites.filter(
          (i) => i.status === 'pending' && i.kind === 'invite' && i.squadId === squadId
        );
        if (pendingOutgoing.length >= openSlots) {
          return {
            ok: false,
            reason: 'no_open_slot_for_invite',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }

        // Duplicate pending item check
        const duplicate = invites.find(
          (i) =>
            i.status === 'pending' &&
            i.squadId === squadId &&
            (isSameMember(i.targetId, toId) ||
              isSameMember(i.fromId, toId) ||
              isSameMember(i.toId, toId))
        );
        if (duplicate) {
          return {
            ok: false,
            reason: 'already_pending',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }

        const isTargetFriend = (state.friendIds || []).some((f) => isSameMember(f, toId));

        // Sender-side rate limit caps (do NOT append to log when already capped or in cooldown)
        if (isDailySquadInviteCapReached(inviteSendLog, now)) {
          return {
            ok: false,
            reason: 'daily_cap_reached',
            result: { publicMessage: DAILY_INVITE_CAP_REACHED_MESSAGE },
          };
        }
        if (
          !isTargetFriend &&
          isNonFriendDailySquadInviteCapReached(inviteSendLog, state.friendIds, now)
        ) {
          return {
            ok: false,
            reason: 'non_friend_daily_cap_reached',
            result: { publicMessage: DAILY_INVITE_CAP_REACHED_MESSAGE },
          };
        }
        if (isPersonInSquadInviteCooldown(invites, toId, now)) {
          return {
            ok: false,
            reason: 'cooldown',
            result: { publicMessage: COOLDOWN_MESSAGE },
          };
        }
        if (
          get7DaySquadInviteCountForPerson(inviteSendLog, toId, now) >=
          SOCIAL_RATE_LIMITS.squadInvite.maxPerPersonPer7Days
        ) {
          return {
            ok: false,
            reason: '7day_limit_reached',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }

        // Target-side checks (Q25: target-side failures still COUNT toward daily / non-friend / 7-day limits!)
        const targetPlayer = playerDirectory.find((p) => isSameMember(p.id, toId));
        const newLogOnTargetFailure: InviteSendLogItem[] = [
          ...inviteSendLog,
          {
            targetId: toId,
            sentAt: now,
            outcome: isTargetFriend ? 'friend' : 'non_friend',
          },
        ];

        // 1. Blocked check
        const isBlocked =
          (state.blockedIds || []).some((b) => isSameMember(b, toId)) ||
          targetPlayer?.blockedYou === true;
        if (isBlocked) {
          return {
            ok: false,
            reason: 'blocked',
            patch: { inviteSendLog: newLogOnTargetFailure },
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }

        // 2. Minor sender check
        const isSenderMinor = state.devMinorTestAccount === true;
        if (isSenderMinor && !isTargetFriend) {
          return {
            ok: false,
            reason: 'minor_sender_non_friend',
            patch: { inviteSendLog: newLogOnTargetFailure },
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }

        // 3. Squad with a minor member check
        const squadHasMinorMember = state.squadMembers.some(
          (m) => m.isMinor || playerDirectory.find((p) => isSameMember(p.id, m.id))?.isMinor
        );
        if (squadHasMinorMember && !isTargetFriend) {
          return {
            ok: false,
            reason: 'squad_has_minor',
            patch: { inviteSendLog: newLogOnTargetFailure },
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }

        // 4. Target privacy checks
        if (targetPlayer) {
          if (targetPlayer.isMinor && !isTargetFriend) {
            return {
              ok: false,
              reason: 'target_minor_non_friend',
              patch: { inviteSendLog: newLogOnTargetFailure },
              result: { publicMessage: PUBLIC_JOIN_FAILURE },
            };
          }
          if (
            (targetPlayer.inviteFrom === 'friends' || targetPlayer.privacy?.inviteFrom === 'friends') &&
            !isTargetFriend
          ) {
            return {
              ok: false,
              reason: 'privacy_friends_only',
              patch: { inviteSendLog: newLogOnTargetFailure },
              result: { publicMessage: PUBLIC_JOIN_FAILURE },
            };
          }
          if (
            source === 'code' &&
            (targetPlayer.discoverableByCode === false || targetPlayer.privacy?.discoverableByCode === false)
          ) {
            return {
              ok: false,
              reason: 'code_hidden',
              patch: { inviteSendLog: newLogOnTargetFailure },
              result: { publicMessage: PUBLIC_JOIN_FAILURE },
            };
          }
        }

        // All checks passed!
        const newLog: InviteSendLogItem[] = [
          ...inviteSendLog,
          {
            targetId: toId,
            sentAt: now,
            outcome: isTargetFriend ? 'friend' : 'non_friend',
          },
        ];
        const newItem: SquadInviteItem = {
          id,
          kind: 'invite',
          status: 'pending',
          fromId,
          toId,
          targetId: toId,
          squadId,
          squadName: state.squadName,
          source,
          notificationId: null,
          createdAt: now,
          expiresAt: now + INVITE_TTL_MS,
        };

        return {
          ok: true,
          patch: {
            squadInvites: [...invites, newItem],
            inviteSendLog: newLog,
          },
          result: {
            type: 'invite_sent',
            invite: newItem,
            toastMessage: '已送出組隊邀請',
          },
        };
      }

      // If player is the invitee (incoming invite simulation)
      if (toId === state.playerId) {
        if (state.currentSquadId === squadId) {
          return {
            ok: false,
            reason: 'already_member',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if ((state.blockedIds || []).some((b) => isSameMember(b, fromId))) {
          return {
            ok: false,
            reason: 'blocked',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        const isSenderFriend = (state.friendIds || []).some((f) => isSameMember(f, fromId));
        if (state.devMinorTestAccount && !isSenderFriend) {
          return {
            ok: false,
            reason: 'minor_blocked',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if (state.privacy?.inviteFrom === 'friends' && !isSenderFriend) {
          return {
            ok: false,
            reason: 'privacy_friends_only',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if (source === 'code' && state.privacy?.discoverableByCode === false) {
          return {
            ok: false,
            reason: 'code_hidden',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
      }

      // Non-player sender duplicate check
      const duplicate = invites.find(
        (i) =>
          i.status === 'pending' &&
          i.squadId === squadId &&
          (isSameMember(i.targetId, toId) ||
            isSameMember(i.fromId, toId) ||
            isSameMember(i.toId, toId))
      );
      if (duplicate) {
        return {
          ok: false,
          reason: 'already_pending',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      let squadName = state.squadName;
      if (squadId !== state.currentSquadId) {
        const fakeSquad = fakeSquads.find((s) => s.id === squadId);
        if (fakeSquad) squadName = fakeSquad.name;
      }

      const isIncomingToPlayer = toId === state.playerId || isSameMember(toId, state.playerId);
      let notifId: string | null = null;
      let nextNotifications = state.notifications;
      if (isIncomingToPlayer) {
        notifId = `notif_invite_${id}`;
        const newNotif: NotificationItem = {
          id: notifId,
          type: 'squad_invite',
          actorId: fromId,
          squadName,
          createdAt: now,
          status: 'pending',
          expiresAt: now + INVITE_TTL_MS,
          refId: id,
        };
        nextNotifications = pruneNotifications(
          [...(state.notifications || []), newNotif],
          now
        );
      }

      const newItem: SquadInviteItem = {
        id,
        kind: 'invite',
        status: 'pending',
        fromId,
        toId,
        targetId: toId,
        squadId,
        squadName,
        source,
        notificationId: notifId,
        createdAt: now,
        expiresAt: now + INVITE_TTL_MS,
      };

      return {
        ok: true,
        patch: {
          squadInvites: [...invites, newItem],
          ...(isIncomingToPlayer && nextNotifications ? { notifications: nextNotifications } : {}),
        },
        result: {
          type: 'invite_sent',
          invite: newItem,
          toastMessage: '已送出組隊邀請',
        },
      };
    }

    case 'sendJoinRequest': {
      const { id, fromId, squadId, source, toId: passedToId } = action;

      if (fromId === state.playerId && state.currentSquadId === squadId) {
        return {
          ok: false,
          reason: 'already_member',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      let toId = passedToId;
      let targetSquadName = state.squadName;

      // If requesting to join player's squad
      if (squadId === state.currentSquadId) {
        toId = state.playerId;
        if ((state.blockedIds || []).some((b) => isSameMember(b, fromId))) {
          return {
            ok: false,
            reason: 'blocked',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        const isFriend = (state.friendIds || []).some((f) => isSameMember(f, fromId));
        if (state.devMinorTestAccount && !isFriend) {
          return {
            ok: false,
            reason: 'minor_blocked',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        const squadHasMinorMember = state.squadMembers.some(
          (m) => m.isMinor || playerDirectory.find((p) => isSameMember(p.id, m.id))?.isMinor
        );
        if (squadHasMinorMember && !isFriend) {
          return {
            ok: false,
            reason: 'squad_has_minor',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if (1 + state.squadMembers.length >= SQUAD_CAP) {
          return {
            ok: false,
            reason: 'full',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if (state.squadMembers.some((m) => isSameMember(m.id, fromId))) {
          return {
            ok: false,
            reason: 'already_member',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
      } else {
        // Requesting to join a fake squad
        const fakeSquad = fakeSquads.find((s) => s.id === squadId);
        if (!fakeSquad) {
          return {
            ok: false,
            reason: 'not_found',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        toId = fakeSquad.leaderId;
        targetSquadName = fakeSquad.name;
        if (fakeSquad.members.length + 1 > SQUAD_CAP) {
          return {
            ok: false,
            reason: 'full',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
      }

      if (!toId) {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      // Duplicate pending item check
      const duplicate = invites.find(
        (i) =>
          i.status === 'pending' &&
          i.squadId === squadId &&
          (isSameMember(i.targetId, fromId) ||
            isSameMember(i.fromId, fromId) ||
            isSameMember(i.toId, fromId))
      );
      if (duplicate) {
        return {
          ok: false,
          reason: 'already_pending',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      const isIncomingToPlayer = toId === state.playerId || isSameMember(toId, state.playerId);
      let notifId: string | null = null;
      let nextNotifications = state.notifications;
      if (isIncomingToPlayer) {
        notifId = `notif_req_${id}`;
        const newNotif: NotificationItem = {
          id: notifId,
          type: 'join_request',
          actorId: fromId,
          squadName: targetSquadName,
          createdAt: now,
          status: 'pending',
          expiresAt: now + INVITE_TTL_MS,
          refId: id,
        };
        nextNotifications = pruneNotifications(
          [...(state.notifications || []), newNotif],
          now
        );
      }

      const newItem: SquadInviteItem = {
        id,
        kind: 'request',
        status: 'pending',
        fromId,
        toId,
        targetId: fromId,
        squadId,
        squadName: targetSquadName,
        source,
        notificationId: notifId,
        createdAt: now,
        expiresAt: now + INVITE_TTL_MS,
      };

      return {
        ok: true,
        patch: {
          squadInvites: [...invites, newItem],
          ...(isIncomingToPlayer && nextNotifications ? { notifications: nextNotifications } : {}),
        },
        result: {
          type: 'request_sent',
          request: newItem,
          toastMessage: '已送出入隊請求',
        },
      };
    }

    case 'acceptInvite': {
      const { id, actorId, joinerSquadId } = action;
      const item = invites.find((i) => i.id === id);
      if (!item || item.kind !== 'invite') {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      if (item.status === 'expired' || item.expiresAt <= now) {
        return {
          ok: false,
          reason: 'expired',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status === 'declined') {
        return {
          ok: false,
          reason: 'rejected',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status === 'cancelled') {
        return {
          ok: false,
          reason: 'cancelled',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status !== 'pending') {
        return {
          ok: false,
          reason: 'not_pending',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      // Consent check: actor must be invitee
      if (!isSameMember(actorId, item.toId)) {
        return {
          ok: false,
          reason: 'no_consent',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      const joinerId = item.toId;

      // Case 1: Player is the joiner
      if (isSameMember(joinerId, state.playerId)) {
        return applyAcceptInviteFromNotification(state, item.id, now, fakeSquads, playerDirectory);
      }

      // Case 2: Candidate is joining player's squad
      if (item.squadId !== state.currentSquadId) {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (1 + state.squadMembers.length >= SQUAD_CAP) {
        return {
          ok: false,
          reason: 'full',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (state.squadMembers.some((m) => isSameMember(m.id, joinerId))) {
        return {
          ok: false,
          reason: 'already_member',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      // Minor check if squad has minor: joiner must be friend
      const isFriend = (state.friendIds || []).some((f) => isSameMember(f, joinerId));
      if (state.devMinorTestAccount && !isFriend) {
        return {
          ok: false,
          reason: 'minor_blocked',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const squadHasMinorMember = state.squadMembers.some(
        (m) => m.isMinor || playerDirectory.find((p) => isSameMember(p.id, m.id))?.isMinor
      );
      if (squadHasMinorMember && !isFriend) {
        return {
          ok: false,
          reason: 'squad_has_minor',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      if (isJoinerInOtherSquad(joinerId, state.currentSquadId, fakeSquads, joinerSquadId)) {
        return {
          ok: false,
          reason: 'in_other_squad',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const candidate = findCandidate(joinerId);
      if (!candidate) {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      const newMembers = [...state.squadMembers, { ...candidate }];
      let updatedInvites = invites.map((inv) =>
        inv.id === item.id ? { ...inv, status: 'accepted' as const } : inv
      );
      updatedInvites = pruneExcessOutgoingInvites(
        updatedInvites,
        state.currentSquadId,
        1 + newMembers.length
      );

      const newJoinOrder = currentJoinOrder.includes(candidate.id)
        ? currentJoinOrder
        : [...currentJoinOrder, candidate.id];
      const newRecentTeammates = upsertRecentTeammates(
        currentRecentTeammates,
        [candidate.id],
        now
      );

      return {
        ok: true,
        patch: {
          squadMembers: newMembers,
          squadInvites: updatedInvites,
          squadJoinOrder: newJoinOrder,
          recentTeammates: newRecentTeammates,
        },
        result: {
          type: 'joined',
          candidate,
          toastMessage: `🎉 【${candidate.nameZh}】已加入戰隊！`,
        },
      };
    }

    case 'acceptRequest': {
      const { id, actorId, joinerSquadId } = action;
      const item = invites.find((i) => i.id === id);
      if (!item || item.kind !== 'request') {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      if (item.status === 'expired' || item.expiresAt <= now) {
        return {
          ok: false,
          reason: 'expired',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status === 'declined') {
        return {
          ok: false,
          reason: 'rejected',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status === 'cancelled') {
        return {
          ok: false,
          reason: 'cancelled',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status !== 'pending') {
        return {
          ok: false,
          reason: 'not_pending',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      // Consent check: actor must be squad leader
      if (!isSameMember(actorId, item.toId)) {
        return {
          ok: false,
          reason: 'no_consent',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      const joinerId = item.fromId;

      // Case 1: Player is the joiner (fake leader accepted player's request)
      if (isSameMember(joinerId, state.playerId)) {
        if (joinerSquadId && joinerSquadId !== item.squadId) {
          return {
            ok: false,
            reason: 'in_other_squad',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        const fakeSquad = fakeSquads.find((s) => s.id === item.squadId);
        if (!fakeSquad) {
          return {
            ok: false,
            reason: 'not_found',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if (fakeSquad.members.length + 1 > SQUAD_CAP) {
          return {
            ok: false,
            reason: 'full',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }
        if (state.currentSquadId === fakeSquad.id) {
          return {
            ok: false,
            reason: 'already_member',
            result: { publicMessage: PUBLIC_JOIN_FAILURE },
          };
        }

        const updatedInvites = invites.map((inv) => {
          if (inv.id === item.id) {
            return { ...inv, status: 'accepted' as const };
          }
          if (
            inv.status === 'pending' &&
            (isSameMember(inv.toId, state.playerId) || isSameMember(inv.fromId, state.playerId))
          ) {
            return { ...inv, status: 'cancelled' as const };
          }
          return inv;
        });

        const fakeMemberIds = fakeSquad.members
          .map((m) => m.id)
          .filter((id) => id !== state.playerId);
        const newJoinOrder = Array.from(
          new Set([fakeSquad.leaderId, ...fakeMemberIds, state.playerId])
        );
        const newRecentTeammates = upsertRecentTeammates(
          currentRecentTeammates,
          Array.from(new Set([fakeSquad.leaderId, ...fakeMemberIds])),
          now
        );

        return {
          ok: true,
          patch: {
            currentSquadId: fakeSquad.id,
            isSquadLeader: false,
            squadName: fakeSquad.name,
            squadMembers: fakeSquad.members,
            squadInvites: updatedInvites,
            squadJoinOrder: newJoinOrder,
            recentTeammates: newRecentTeammates,
          },
          result: {
            type: 'joined',
            squadName: fakeSquad.name,
            toastMessage: `🎉 【${fakeSquad.name}】已同意你的入隊請求！`,
          },
        };
      }

      // Case 2: Candidate is joining player's squad
      if (!state.isSquadLeader || item.squadId !== state.currentSquadId) {
        return {
          ok: false,
          reason: 'not_leader',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (1 + state.squadMembers.length >= SQUAD_CAP) {
        return {
          ok: false,
          reason: 'full',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (state.squadMembers.some((m) => isSameMember(m.id, joinerId))) {
        return {
          ok: false,
          reason: 'already_member',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      // Minor check if squad has minor: joiner must be friend
      const isFriend = (state.friendIds || []).some((f) => isSameMember(f, joinerId));
      if (state.devMinorTestAccount && !isFriend) {
        return {
          ok: false,
          reason: 'minor_blocked',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const squadHasMinorMember = state.squadMembers.some(
        (m) => m.isMinor || playerDirectory.find((p) => isSameMember(p.id, m.id))?.isMinor
      );
      if (squadHasMinorMember && !isFriend) {
        return {
          ok: false,
          reason: 'squad_has_minor',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      if (isJoinerInOtherSquad(joinerId, state.currentSquadId, fakeSquads, joinerSquadId)) {
        return {
          ok: false,
          reason: 'in_other_squad',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const candidate = findCandidate(joinerId);
      if (!candidate) {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      const newMembers = [...state.squadMembers, { ...candidate }];
      let updatedInvites = invites.map((inv) =>
        inv.id === item.id ? { ...inv, status: 'accepted' as const } : inv
      );
      updatedInvites = pruneExcessOutgoingInvites(
        updatedInvites,
        state.currentSquadId,
        1 + newMembers.length
      );

      const newJoinOrder = currentJoinOrder.includes(candidate.id)
        ? currentJoinOrder
        : [...currentJoinOrder, candidate.id];
      const newRecentTeammates = upsertRecentTeammates(
        currentRecentTeammates,
        [candidate.id],
        now
      );

      let updatedNotifications = state.notifications;
      if (state.notifications) {
        updatedNotifications = state.notifications.map((n) => {
          if (n.id === item.id || n.refId === item.id || (item.notificationId && n.id === item.notificationId)) {
            return { ...n, status: 'accepted' };
          }
          return n;
        });
      }

      return {
        ok: true,
        patch: {
          squadMembers: newMembers,
          squadInvites: updatedInvites,
          squadJoinOrder: newJoinOrder,
          recentTeammates: newRecentTeammates,
          ...(updatedNotifications ? { notifications: updatedNotifications } : {}),
        },
        result: {
          type: 'joined',
          candidate,
          toastMessage: `🎉 已同意【${candidate.nameZh}】加入戰隊！`,
        },
      };
    }

    case 'declineInvite': {
      const { id, actorId } = action;
      const item = invites.find((i) => i.id === id);
      if (!item || item.kind !== 'invite') {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status !== 'pending') {
        return {
          ok: false,
          reason: 'not_pending',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (!isSameMember(actorId, item.toId)) {
        return {
          ok: false,
          reason: 'no_consent',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const updatedInvites = invites.map((inv) =>
        inv.id === id ? { ...inv, status: 'declined' as const, expiresAt: now } : inv
      );
      let updatedNotifications = state.notifications;
      if (state.notifications) {
        updatedNotifications = state.notifications.map((n) => {
          if (n.id === id || n.refId === id || (item.notificationId && n.id === item.notificationId)) {
            return { ...n, status: 'declined' };
          }
          return n;
        });
      }
      return {
        ok: true,
        patch: {
          squadInvites: updatedInvites,
          ...(updatedNotifications ? { notifications: updatedNotifications } : {}),
        },
        result: {
          type: 'declined',
          toastMessage: '已拒絕邀請',
        },
      };
    }

    case 'declineRequest': {
      const { id, actorId } = action;
      const item = invites.find((i) => i.id === id);
      if (!item || item.kind !== 'request') {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status !== 'pending') {
        return {
          ok: false,
          reason: 'not_pending',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (!isSameMember(actorId, item.toId)) {
        return {
          ok: false,
          reason: 'no_consent',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const updatedInvites = invites.map((inv) =>
        inv.id === id ? { ...inv, status: 'declined' as const, expiresAt: now } : inv
      );
      let updatedNotifications = state.notifications;
      if (state.notifications) {
        updatedNotifications = state.notifications.map((n) => {
          if (n.id === id || n.refId === id || (item.notificationId && n.id === item.notificationId)) {
            return { ...n, status: 'declined' };
          }
          return n;
        });
      }
      return {
        ok: true,
        patch: {
          squadInvites: updatedInvites,
          ...(updatedNotifications ? { notifications: updatedNotifications } : {}),
        },
        result: {
          type: 'declined',
          toastMessage: '已拒絕請求',
        },
      };
    }

    case 'cancelPending': {
      const { id, actorId } = action;
      const item = invites.find((i) => i.id === id);
      if (!item) {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (item.status !== 'pending') {
        return {
          ok: false,
          reason: 'not_pending',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (!isSameMember(actorId, item.fromId)) {
        return {
          ok: false,
          reason: 'no_consent',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const updatedInvites = invites.map((inv) =>
        inv.id === id ? { ...inv, status: 'cancelled' as const, expiresAt: now } : inv
      );
      let updatedNotifications = state.notifications;
      if (state.notifications) {
        updatedNotifications = state.notifications.map((n) => {
          if (n.id === id || n.refId === id || (item.notificationId && n.id === item.notificationId)) {
            return { ...n, status: 'invalid' };
          }
          return n;
        });
      }
      return {
        ok: true,
        patch: {
          squadInvites: updatedInvites,
          ...(updatedNotifications ? { notifications: updatedNotifications } : {}),
        },
        result: {
          type: 'cancelled',
          toastMessage: '已取消',
        },
      };
    }

    case 'submitInviteCode': {
      const { id, actorId, code } = action;
      const trimmed = (code || '').trim().toUpperCase();
      if (!trimmed) {
        return {
          ok: false,
          reason: 'empty',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const ownCode = getSquadInviteCode(state.squadName);
      if (trimmed === ownCode) {
        return {
          ok: false,
          reason: 'self',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      const fakeSquad = fakeSquads.find((s) => s.inviteCode.toUpperCase() === trimmed);
      if (!fakeSquad) {
        return {
          ok: false,
          reason: 'not_found',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }
      if (state.currentSquadId === fakeSquad.id) {
        return {
          ok: false,
          reason: 'already_member',
          result: { publicMessage: PUBLIC_JOIN_FAILURE },
        };
      }

      // Check if player has a pending invite FROM that squad
      const pendingFromSquad = invites.find(
        (i) =>
          i.status === 'pending' &&
          i.kind === 'invite' &&
          i.squadId === fakeSquad.id &&
          isSameMember(i.toId, actorId)
      );
      if (pendingFromSquad) {
        return applySquadSocialAction(
          state,
          {
            type: 'acceptInvite',
            id: pendingFromSquad.id,
            actorId,
          },
          now,
          fakeSquads
        );
      }

      // Otherwise send a join request to that squad
      return applySquadSocialAction(
        state,
        {
          type: 'sendJoinRequest',
          id,
          fromId: actorId,
          squadId: fakeSquad.id,
          toId: fakeSquad.leaderId,
          source: 'code',
        },
        now,
        fakeSquads
      );
    }

    default:
      return {
        ok: false,
        reason: 'not_found',
        result: { publicMessage: PUBLIC_JOIN_FAILURE },
      };
  }
}
