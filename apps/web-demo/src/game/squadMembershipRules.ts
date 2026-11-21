/**
 * FitMon Pure Squad Membership Rules (T3-D4)
 *
 * All squad membership mutations (leave, kick, transfer, disband) are pure functions:
 *   applySquadMembershipAction(state, action, now) => { ok, reason?, patch?, result? }
 *
 * Rules:
 * - `now` is passed in; never call Date.now() inside this pure module.
 * - `reason` is an INTERNAL code for tests only. Never surface `reason` in UI or console.
 * - Neutral copy only; no blame, shame, or guilt.
 * - Player always ends with a valid squad (never a "no squad" empty state).
 */

import { DEMO_PLAYER_ID, type SquadMemberState, type SquadInviteItem } from './squadInviteRules.ts';
import type { RecentTeammateItem, NotificationItem } from './persistMigrate.ts';
import { pruneNotifications } from './notificationCenter.ts';
import {
  getSquadBossMaxHp,
  hasClaimedSquadBossRewardThisWeek,
} from './economyRules.ts';

export const YOU_LEFT_SQUAD_MESSAGE = '你已離開這支隊伍';
export const LEAVE_TRANSFER_CONFIRM = (successorName: string) =>
  `你離開後，${successorName} 會成為隊長。確定離開？`;
export const LEAVE_DISBAND_CONFIRM = '隊伍會解散。確定離開？';
export const LEAVE_MEMBER_CONFIRM = (squadName: string) => `確定離開「${squadName}」？`;
export const BOSS_REWARD_ALREADY_CLAIMED_NOTE =
  '本週的 Boss 獎勵你已經領過，這週在新隊伍打倒 Boss 不會再拿到賞金。';
export const DEFAULT_EMPTY_SQUAD_NAME = '我的隊伍';
export const KICKED_MEMBER_LEFT_TOAST = (name: string) => `${name} 已離開這支隊伍`;

export const RECENT_TEAMMATES_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SquadMembershipInternalReason =
  | 'not_leader'
  | 'not_member'
  | 'not_found'
  | 'no_successor'
  | 'not_solo'
  | 'self';

export interface SquadMembershipStateSnapshot {
  playerId: string; // DEMO_PLAYER_ID ('self')
  currentSquadId: string;
  isSquadLeader: boolean;
  squadName: string;
  squadMembers: SquadMemberState[];
  squadInvites: SquadInviteItem[];
  squadJoinOrder: string[];
  recentTeammates: RecentTeammateItem[];
  notifications?: NotificationItem[];
  squadStage: number;
  squadBossHp: number;
  bossRewardClaimedWeekKey: string | null;
}

export type SquadMembershipAction =
  | { type: 'leave'; actorId: string; newSquadId?: string }
  | { type: 'kick'; actorId: string; memberId: string; newSquadId?: string }
  | { type: 'transfer'; actorId: string; toMemberId?: string }
  | { type: 'disband'; actorId: string; newSquadId?: string };

export interface SquadMembershipPatch {
  currentSquadId?: string;
  isSquadLeader?: boolean;
  squadName?: string;
  squadMembers?: SquadMemberState[];
  squadInvites?: SquadInviteItem[];
  squadJoinOrder?: string[];
  recentTeammates?: RecentTeammateItem[];
  notifications?: NotificationItem[];
  squadStage?: number;
  squadBossHp?: number;
}

export interface SquadMembershipResultData {
  type?: 'leave' | 'kick' | 'transfer' | 'disband';
  toastMessage?: string;
  successorId?: string;
  successorName?: string;
}

export interface SquadMembershipRuleResult {
  ok: boolean;
  reason?: SquadMembershipInternalReason;
  patch?: SquadMembershipPatch;
  result?: SquadMembershipResultData;
}

/**
 * Upsert former teammates into recentTeammates and prune entries older than 30 days.
 * Excludes self (DEMO_PLAYER_ID).
 */
export function upsertRecentTeammates(
  list: RecentTeammateItem[] | undefined | null,
  ids: string[],
  now: number
): RecentTeammateItem[] {
  const cutoff = now - RECENT_TEAMMATES_TTL_MS;
  const currentList = Array.isArray(list) ? list : [];

  const map = new Map<string, number>();

  // Retain unexpired entries (excluding self)
  for (const item of currentList) {
    if (item && item.id && item.id !== DEMO_PLAYER_ID && item.lastTogetherAt >= cutoff) {
      map.set(item.id, item.lastTogetherAt);
    }
  }

  // Upsert new ids with lastTogetherAt = now
  for (const id of ids) {
    if (id && id !== DEMO_PLAYER_ID) {
      map.set(id, now);
    }
  }

  const result: RecentTeammateItem[] = [];
  for (const [id, lastTogetherAt] of map.entries()) {
    result.push({ id, lastTogetherAt });
  }

  return result;
}

/**
 * Finds the earliest joiner among remaining members.
 * - Earliest joiner = first id in squadJoinOrder that is still in remainingMemberIds and exists in members.
 * - If squadJoinOrder is missing some current member ids, append missing ones in current members array order.
 * - If squadJoinOrder contains stale ids, ignore them.
 */
export function getEarliestSuccessor(
  joinOrder: string[] | undefined | null,
  remainingMemberIds: string[],
  members: SquadMemberState[]
): { id: string; name: string; nameZh: string; member: SquadMemberState } | null {
  const remainingSet = new Set(remainingMemberIds);
  const memberMap = new Map<string, SquadMemberState>();
  for (const m of members) {
    if (remainingSet.has(m.id)) {
      memberMap.set(m.id, m);
    }
  }

  if (memberMap.size === 0) return null;

  const effectiveOrder: string[] = [];
  const added = new Set<string>();

  if (Array.isArray(joinOrder)) {
    for (const id of joinOrder) {
      if (memberMap.has(id) && !added.has(id)) {
        effectiveOrder.push(id);
        added.add(id);
      }
    }
  }

  for (const m of members) {
    if (memberMap.has(m.id) && !added.has(m.id)) {
      effectiveOrder.push(m.id);
      added.add(m.id);
    }
  }

  if (effectiveOrder.length === 0) return null;
  const pickedId = effectiveOrder[0];
  const found = memberMap.get(pickedId);
  if (!found) return null;

  return {
    id: found.id,
    name: found.nameZh,
    nameZh: found.nameZh,
    member: found,
  };
}

/**
 * Pure preview helper for leaving squad confirm dialog.
 */
export function previewLeaveSquad(
  state: SquadMembershipStateSnapshot,
  now: number = Date.now()
): {
  kind: 'transfer' | 'disband' | 'member';
  successorId?: string;
  successorName?: string;
  confirmText: string;
  alreadyClaimedThisWeek: boolean;
  claimedNote?: string;
} {
  const alreadyClaimedThisWeek = hasClaimedSquadBossRewardThisWeek(
    state.bossRewardClaimedWeekKey,
    now
  );
  const claimedNote = alreadyClaimedThisWeek ? BOSS_REWARD_ALREADY_CLAIMED_NOTE : undefined;

  // Situation C: Member leave
  if (!state.isSquadLeader) {
    return {
      kind: 'member',
      confirmText: LEAVE_MEMBER_CONFIRM(state.squadName),
      alreadyClaimedThisWeek,
      claimedNote,
    };
  }

  // Situation B: Solo leader disband
  const remainingMembers = state.squadMembers.filter((m) => m.id !== state.playerId);
  if (remainingMembers.length === 0) {
    return {
      kind: 'disband',
      confirmText: LEAVE_DISBAND_CONFIRM,
      alreadyClaimedThisWeek,
      claimedNote,
    };
  }

  // Situation A: Leader leave with successor
  const successor = getEarliestSuccessor(
    state.squadJoinOrder,
    remainingMembers.map((m) => m.id),
    remainingMembers
  );
  const successorName = successor?.name || '隊員';

  return {
    kind: 'transfer',
    successorId: successor?.id,
    successorName,
    confirmText: LEAVE_TRANSFER_CONFIRM(successorName),
    alreadyClaimedThisWeek,
    claimedNote,
  };
}

/**
 * Creates a new empty self-led squad patch for the local player.
 * Guarantees that the player always has a squad (never a "no squad" empty state).
 */
function createNewEmptySquadPatch(
  state: SquadMembershipStateSnapshot,
  newSquadId: string,
  now: number,
  formerTeammateIds: string[],
  invitesToCancelOrExpire: 'cancel' | 'expire',
  newNotification?: NotificationItem
): SquadMembershipPatch {
  const updatedRecentTeammates = upsertRecentTeammates(
    state.recentTeammates,
    formerTeammateIds,
    now
  );

  const updatedInvites = (state.squadInvites || []).map((inv) => {
    if (inv.squadId === state.currentSquadId && inv.status === 'pending') {
      return {
        ...inv,
        status: (invitesToCancelOrExpire === 'expire' ? 'expired' : 'cancelled') as any,
      };
    }
    return inv;
  });

  let updatedNotifications = state.notifications;
  if (newNotification && state.notifications) {
    updatedNotifications = pruneNotifications(
      [newNotification, ...state.notifications],
      now
    );
  }

  return {
    currentSquadId: newSquadId,
    isSquadLeader: true,
    squadName: DEFAULT_EMPTY_SQUAD_NAME,
    squadMembers: [],
    squadJoinOrder: [state.playerId],
    squadBossHp: getSquadBossMaxHp(state.squadStage),
    squadStage: state.squadStage,
    recentTeammates: updatedRecentTeammates,
    squadInvites: updatedInvites,
    ...(updatedNotifications ? { notifications: updatedNotifications } : {}),
  };
}

/**
 * Main Pure Reducer: applySquadMembershipAction
 */
export function applySquadMembershipAction(
  state: SquadMembershipStateSnapshot,
  action: SquadMembershipAction,
  now: number
): SquadMembershipRuleResult {
  const newSquadId =
    'newSquadId' in action && action.newSquadId ? action.newSquadId : `squad_${now}`;

  switch (action.type) {
    case 'leave': {
      const isPlayer = action.actorId === state.playerId;
      if (!isPlayer && !state.squadMembers.some((m) => m.id === action.actorId)) {
        return { ok: false, reason: 'not_member' };
      }

      // Situation C: Player is a member (not leader)
      if (!state.isSquadLeader) {
        const formerIds = Array.from(
          new Set([
            ...state.squadMembers.map((m) => m.id),
            ...(state.squadJoinOrder || []),
          ])
        ).filter((id) => id !== state.playerId);

        const patch = createNewEmptySquadPatch(
          state,
          newSquadId,
          now,
          formerIds,
          'cancel'
        );

        return {
          ok: true,
          patch,
          result: {
            type: 'leave',
            toastMessage: YOU_LEFT_SQUAD_MESSAGE,
          },
        };
      }

      // Situation B: Player is leader AND solo (no other members) -> DISBAND
      if (state.squadMembers.length === 0) {
        let disbandNotif: NotificationItem | undefined;
        if (state.notifications) {
          disbandNotif = {
            id: `notif_${now}_disband`,
            type: 'squad_change',
            refId: 'disband',
            squadName: state.squadName,
            createdAt: now,
            status: 'info',
          };
        }

        const patch = createNewEmptySquadPatch(
          state,
          newSquadId,
          now,
          [],
          'expire',
          disbandNotif
        );

        return {
          ok: true,
          patch,
          result: {
            type: 'disband',
            toastMessage: YOU_LEFT_SQUAD_MESSAGE,
          },
        };
      }

      // Situation A: Player is leader AND there are members -> TRANSFER & LEAVE
      const remainingMembers = state.squadMembers.filter((m) => m.id !== state.playerId);
      const successor = getEarliestSuccessor(
        state.squadJoinOrder,
        remainingMembers.map((m) => m.id),
        remainingMembers
      );

      if (!successor) {
        return { ok: false, reason: 'no_successor' };
      }

      const formerIds = state.squadMembers
        .map((m) => m.id)
        .filter((id) => id !== state.playerId);

      const patch = createNewEmptySquadPatch(
        state,
        newSquadId,
        now,
        formerIds,
        'cancel'
      );

      return {
        ok: true,
        patch,
        result: {
          type: 'leave',
          toastMessage: YOU_LEFT_SQUAD_MESSAGE,
          successorId: successor.id,
          successorName: successor.name,
        },
      };
    }

    case 'kick': {
      if (action.memberId === action.actorId) {
        return { ok: false, reason: 'self' };
      }

      // Local player is the one being removed (e.g. fake leader kicked player)
      if (action.memberId === state.playerId) {
        const formerIds = Array.from(
          new Set([
            ...state.squadMembers.map((m) => m.id),
            ...(state.squadJoinOrder || []),
            action.actorId,
          ])
        ).filter((id) => id !== state.playerId);

        let kickedNotif: NotificationItem | undefined;
        if (state.notifications) {
          kickedNotif = {
            id: `notif_${now}_kicked`,
            type: 'squad_change',
            refId: 'kicked',
            squadName: state.squadName,
            createdAt: now,
            status: 'info',
          };
        }

        const patch = createNewEmptySquadPatch(
          state,
          newSquadId,
          now,
          formerIds,
          'cancel',
          kickedNotif
        );

        return {
          ok: true,
          patch,
          result: {
            type: 'kick',
            toastMessage: YOU_LEFT_SQUAD_MESSAGE,
          },
        };
      }

      // Player kicks another member
      if (!state.isSquadLeader) {
        return { ok: false, reason: 'not_leader' };
      }

      const target = state.squadMembers.find((m) => m.id === action.memberId);
      if (!target) {
        return { ok: false, reason: 'not_found' };
      }

      const newMembers = state.squadMembers.filter((m) => m.id !== action.memberId);
      const newJoinOrder = (state.squadJoinOrder || []).filter((id) => id !== action.memberId);
      const updatedRecentTeammates = upsertRecentTeammates(
        state.recentTeammates,
        [action.memberId],
        now
      );

      return {
        ok: true,
        patch: {
          squadMembers: newMembers,
          squadJoinOrder: newJoinOrder,
          recentTeammates: updatedRecentTeammates,
        },
        result: {
          type: 'kick',
          toastMessage: KICKED_MEMBER_LEFT_TOAST(target.nameZh),
        },
      };
    }

    case 'transfer': {
      if (!state.isSquadLeader) {
        return { ok: false, reason: 'not_leader' };
      }
      if (state.squadMembers.length === 0) {
        return { ok: false, reason: 'no_successor' };
      }

      let successor: { id: string; name: string } | null = null;
      if (action.toMemberId) {
        const target = state.squadMembers.find((m) => m.id === action.toMemberId);
        if (!target) {
          return { ok: false, reason: 'not_found' };
        }
        successor = { id: target.id, name: target.nameZh };
      } else {
        const earliest = getEarliestSuccessor(
          state.squadJoinOrder,
          state.squadMembers.map((m) => m.id),
          state.squadMembers
        );
        if (!earliest) {
          return { ok: false, reason: 'no_successor' };
        }
        successor = { id: earliest.id, name: earliest.name };
      }

      return {
        ok: true,
        patch: {
          isSquadLeader: false,
        },
        result: {
          type: 'transfer',
          successorId: successor.id,
          successorName: successor.name,
        },
      };
    }

    case 'disband': {
      if (!state.isSquadLeader) {
        return { ok: false, reason: 'not_leader' };
      }
      if (state.squadMembers.length > 0) {
        return { ok: false, reason: 'not_solo' };
      }

      let disbandNotif: NotificationItem | undefined;
      if (state.notifications) {
        disbandNotif = {
          id: `notif_${now}_disband`,
          type: 'squad_change',
          refId: 'disband',
          squadName: state.squadName,
          createdAt: now,
          status: 'info',
        };
      }

      const patch = createNewEmptySquadPatch(
        state,
        newSquadId,
        now,
        [],
        'expire',
        disbandNotif
      );

      return {
        ok: true,
        patch,
        result: {
          type: 'disband',
          toastMessage: YOU_LEFT_SQUAD_MESSAGE,
        },
      };
    }

    default:
      return { ok: false, reason: 'not_found' };
  }
}
