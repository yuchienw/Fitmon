import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blockPlayer,
  unblockPlayer,
  reportPlayer,
  updatePrivacySettings,
  isPlayerDiscoverableByCode,
  isSamePlayerId,
  type PrivacySafetyState,
} from './privacySafety.ts';
import {
  DEFAULT_ADULT_INVITE_FROM,
  DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
  MINOR_PRIVACY,
} from '../config/economy.ts';
import {
  visibleNotifications,
  unreadCount,
  type RecipientNotifyContext,
  type NotificationItem,
} from './notificationCenter.ts';
import {
  applySquadSocialAction,
  PUBLIC_JOIN_FAILURE,
  type SquadSocialStateSnapshot,
} from './squadInviteRules.ts';
import { sendFriendRequest } from './friendSocial.ts';

describe('T3-D10 Privacy, Block & Report Suite', () => {
  const baseNow = 1732100000000;

  // --------------------------------------------------------------------------
  // 1. Block Filtering & Side Effects
  // --------------------------------------------------------------------------
  describe('1. Block Filtering & Side Effects', () => {
    test('blockPlayer adds targetId to blockedIds idempotently without duplicates', () => {
      const state: PrivacySafetyState = {
        blockedIds: ['existing_blocked'],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
      };

      const res1 = blockPlayer(state, { targetId: 'user_mika' }, baseNow);
      assert.deepEqual(res1.state.blockedIds, ['existing_blocked', 'user_mika']);

      // Repeated block is idempotent
      const res2 = blockPlayer(res1.state, { targetId: 'user_mika' }, baseNow);
      assert.deepEqual(res2.state.blockedIds, ['existing_blocked', 'user_mika']);

      // Variant prefix demo_mika is also recognized as duplicate
      const res3 = blockPlayer(res2.state, { targetId: 'demo_mika' }, baseNow);
      assert.deepEqual(res3.state.blockedIds, ['existing_blocked', 'user_mika']);
    });

    test('blockPlayer quietly removes target from friendIds and recentTeammates', () => {
      const state: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
        friendIds: ['friend_akai', 'user_mika', 'friend_chloe'],
        recentTeammates: [
          { id: 'user_mika', lastTogetherAt: baseNow - 1000 },
          { id: 'friend_akai', lastTogetherAt: baseNow - 2000 },
        ],
      };

      const res = blockPlayer(state, { targetId: 'user_mika' }, baseNow);
      assert.deepEqual(res.state.friendIds, ['friend_akai', 'friend_chloe']);
      assert.equal(res.state.recentTeammates?.length, 1);
      assert.equal(res.state.recentTeammates?.[0].id, 'friend_akai');
      // Neutral message only, never reveals "被封鎖"
      assert.equal(res.result.publicMessage, '已封鎖此玩家');
    });

    test('blockPlayer invalidates pending squad invites, friend requests, and notifications', () => {
      const state: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
        squadInvites: [
          {
            id: 'inv_1',
            kind: 'invite',
            status: 'pending',
            fromId: 'user_mika',
            toId: 'self',
            targetId: 'self',
            squadId: 'squad_mika',
            squadName: 'Mika Squad',
            createdAt: baseNow,
            expiresAt: baseNow + 86400000,
            source: 'code',
            notificationId: null,
          },
          {
            id: 'inv_2',
            kind: 'invite',
            status: 'pending',
            fromId: 'self',
            toId: 'user_mika',
            targetId: 'user_mika',
            squadId: 'squad_self',
            squadName: 'Self Squad',
            createdAt: baseNow,
            expiresAt: baseNow + 86400000,
            source: 'code',
            notificationId: null,
          },
          {
            id: 'inv_3',
            kind: 'invite',
            status: 'pending',
            fromId: 'friend_akai',
            toId: 'self',
            targetId: 'self',
            squadId: 'squad_akai',
            squadName: 'Akai Squad',
            createdAt: baseNow,
            expiresAt: baseNow + 86400000,
            source: 'code',
            notificationId: null,
          },
        ],
        friendRequests: [
          { id: 'fr_1', fromId: 'user_mika', toId: 'self', status: 'pending', createdAt: baseNow },
          { id: 'fr_2', fromId: 'self', toId: 'user_mika', status: 'pending', createdAt: baseNow },
          { id: 'fr_3', fromId: 'friend_akai', toId: 'self', status: 'pending', createdAt: baseNow },
        ],
        notifications: [
          { id: 'n_1', type: 'squad_invite', actorId: 'user_mika', status: 'pending', createdAt: baseNow },
          { id: 'n_2', type: 'friend_request', actorId: 'user_mika', status: 'pending', createdAt: baseNow },
          { id: 'n_3', type: 'squad_invite', actorId: 'friend_akai', status: 'pending', createdAt: baseNow },
        ],
      };

      const res = blockPlayer(state, { targetId: 'user_mika' }, baseNow);

      // Invalidation of squad invites
      assert.equal(res.state.squadInvites?.find((i) => i.id === 'inv_1')?.status, 'invalid');
      assert.equal(res.state.squadInvites?.find((i) => i.id === 'inv_2')?.status, 'invalid');
      assert.equal(res.state.squadInvites?.find((i) => i.id === 'inv_3')?.status, 'pending');

      // Cancellation of friend requests
      assert.equal(res.state.friendRequests?.find((r) => r.id === 'fr_1')?.status, 'cancelled');
      assert.equal(res.state.friendRequests?.find((r) => r.id === 'fr_2')?.status, 'cancelled');
      assert.equal(res.state.friendRequests?.find((r) => r.id === 'fr_3')?.status, 'pending');

      // Notifications set to invalid
      assert.equal(res.state.notifications?.find((n) => n.id === 'n_1')?.status, 'invalid');
      assert.equal(res.state.notifications?.find((n) => n.id === 'n_2')?.status, 'invalid');
      assert.equal(res.state.notifications?.find((n) => n.id === 'n_3')?.status, 'pending');
    });

    test('notifications from blocked actor are hidden at display and do not count toward unread count', () => {
      const items: NotificationItem[] = [
        { id: 'n_blocked_inv', type: 'squad_invite', actorId: 'user_mika', createdAt: baseNow, status: 'pending' },
        { id: 'n_blocked_res', type: 'result_success', actorId: 'user_mika', createdAt: baseNow },
        { id: 'n_normal', type: 'squad_invite', actorId: 'friend_akai', createdAt: baseNow, status: 'pending' },
      ];

      const ctx: RecipientNotifyContext = {
        isRestDay: false,
        isCaringForBody: false,
        isPaused: false,
        isMinor: false,
        friendIds: ['friend_akai'],
        blockedIds: ['user_mika'],
      };

      const res = visibleNotifications(items, ctx, baseNow);
      assert.equal(res.all.length, 1);
      assert.equal(res.all[0].id, 'n_normal');
      assert.equal(unreadCount(res.all), 1);
    });

    test('blocked player cannot be sent a friend request (neutral failure)', () => {
      const state = {
        friendIds: [],
        friendRequests: [],
        notifications: [],
        blockedIds: ['user_mika'],
      };

      const res = sendFriendRequest(state, { fromId: 'self', toId: 'user_mika' }, baseNow);
      assert.equal(res.result, 'error');
      assert.equal(res.error, '對方目前無法加入');
    });

    test('blocked player incoming squad invite fails with neutral failure PUBLIC_JOIN_FAILURE', () => {
      const snap: SquadSocialStateSnapshot = {
        playerId: 'self',
        currentSquadId: 'squad_self',
        isSquadLeader: true,
        squadName: 'Self Squad',
        squadMembers: [{ id: 'self', nameZh: 'Self', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 }],
        squadInvites: [],
        friendIds: [],
        devMinorTestAccount: false,
        blockedIds: ['user_mika'],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
      };

      const action = {
        type: 'sendInvite' as const,
        id: 'inv_mika_1',
        fromId: 'user_mika',
        toId: 'self',
        squadId: 'squad_mika',
        source: 'code' as const,
      };

      const res = applySquadSocialAction(snap, action, baseNow);
      assert.equal(res.ok, false);
      assert.equal(res.reason, 'blocked');
      assert.equal(res.result?.publicMessage, PUBLIC_JOIN_FAILURE);
    });

    test('unblockPlayer removes target from blockedIds without restoring friendship or invalid items', () => {
      const state: PrivacySafetyState = {
        blockedIds: ['user_mika', 'user_jun'],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
        friendIds: [], // Mika was removed when blocked
      };

      const res = unblockPlayer(state, { targetId: 'user_mika' }, baseNow);
      assert.deepEqual(res.state.blockedIds, ['user_jun']);
      // Friendship is NOT automatically restored
      assert.deepEqual(res.state.friendIds, []);
      assert.equal(res.result.publicMessage, '已解除封鎖');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Report Player & alsoBlock Logic
  // --------------------------------------------------------------------------
  describe('2. Report Player & alsoBlock Logic', () => {
    test('reportPlayer with alsoBlock: true appends to reportLog and executes blockPlayer', () => {
      const state: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
        friendIds: ['user_mika'],
      };

      const res = reportPlayer(
        state,
        {
          targetId: 'user_mika',
          reason: '垃圾邀請',
          alsoBlock: true,
        },
        baseNow
      );

      // Appended to reportLog
      assert.equal(res.state.reportLog.length, 1);
      assert.equal(res.state.reportLog[0].targetId, 'user_mika');
      assert.equal(res.state.reportLog[0].reason, '垃圾邀請');
      assert.equal(res.state.reportLog[0].createdAt, baseNow);

      // Blocked as well
      assert.deepEqual(res.state.blockedIds, ['user_mika']);
      assert.deepEqual(res.state.friendIds, []);
      assert.equal(res.result.publicMessage, '已收到檢舉');
    });

    test('reportPlayer defaults alsoBlock to true when omitted', () => {
      const state: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
        friendIds: ['user_jun'],
      };

      const res = reportPlayer(
        state,
        {
          targetId: 'user_jun',
          reason: '騷擾',
        },
        baseNow
      );

      assert.equal(res.state.reportLog.length, 1);
      assert.deepEqual(res.state.blockedIds, ['user_jun']);
      assert.deepEqual(res.state.friendIds, []);
    });

    test('reportPlayer with alsoBlock: false only logs report and does not block', () => {
      const state: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
        friendIds: ['user_jun'],
      };

      const res = reportPlayer(
        state,
        {
          targetId: 'user_jun',
          reason: '其他',
          alsoBlock: false,
        },
        baseNow
      );

      assert.equal(res.state.reportLog.length, 1);
      assert.deepEqual(res.state.blockedIds, []);
      assert.deepEqual(res.state.friendIds, ['user_jun']);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Security Review: Console Spy on Report Text
  // --------------------------------------------------------------------------
  describe('3. Security Review: Console Spy on Report Reason and Free Text', () => {
    test('reportPlayer NEVER outputs reason or free-text details to console.*', () => {
      const consoleMethods = [
        'log',
        'info',
        'debug',
        'warn',
        'error',
        'dir',
        'table',
      ] as const;

      const calls: { method: string; args: unknown[] }[] = [];
      const originals: Record<string, Function> = {};

      for (const m of consoleMethods) {
        originals[m] = console[m];
        console[m] = (...args: unknown[]) => {
          calls.push({ method: m, args });
        };
      }

      try {
        const state: PrivacySafetyState = {
          blockedIds: [],
          reportLog: [],
          privacy: {
            inviteFrom: DEFAULT_ADULT_INVITE_FROM,
            discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
          },
        };

        const secretDetails = 'TOP_SECRET_HARASSMENT_TEXT_98765';
        const secretReason = 'SENSITIVE_REASON_CATEGORY_4321';

        reportPlayer(
          state,
          {
            targetId: 'bad_actor_99',
            reason: secretReason,
            details: secretDetails,
            alsoBlock: true,
          },
          baseNow
        );

        // Verify no console method was called with secretDetails or secretReason
        for (const call of calls) {
          const callStr = JSON.stringify(call.args);
          assert.ok(
            !callStr.includes(secretDetails),
            `Security violation: ${call.method} was called containing report details: ${callStr}`
          );
          assert.ok(
            !callStr.includes(secretReason),
            `Security violation: ${call.method} was called containing report reason: ${callStr}`
          );
        }
        // Even better: zero console calls during reportPlayer
        assert.equal(calls.length, 0, 'reportPlayer should make zero console calls');
      } finally {
        for (const m of consoleMethods) {
          console[m] = originals[m] as any;
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. Minor Account Lock
  // --------------------------------------------------------------------------
  describe('4. Minor Account Lock (devMinorTestAccount)', () => {
    test('minor account privacy is locked to MINOR_PRIVACY and ignores update patches', () => {
      const minorState: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: { ...MINOR_PRIVACY },
        devMinorTestAccount: true,
      };

      assert.equal(minorState.privacy.inviteFrom, 'friends');
      assert.equal(minorState.privacy.discoverableByCode, false);

      // Attempt to change to 'everyone' and discoverable: true
      const res = updatePrivacySettings(
        minorState,
        { inviteFrom: 'everyone', discoverableByCode: true },
        { isMinor: true }
      );

      assert.equal(res.result.ok, false);
      assert.equal(res.state.privacy.inviteFrom, 'friends');
      assert.equal(res.state.privacy.discoverableByCode, false);
      assert.deepEqual(res.state.privacy, MINOR_PRIVACY);
    });

    test('isPlayerDiscoverableByCode returns false for minors', () => {
      const minorState = {
        privacy: { ...MINOR_PRIVACY },
        devMinorTestAccount: true,
        blockedIds: [],
      };

      assert.equal(isPlayerDiscoverableByCode(minorState, 'any_viewer'), false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Adult Settings Change & Incoming Invite Filtering
  // --------------------------------------------------------------------------
  describe('5. Adult Settings Change & Incoming Invite Filtering', () => {
    test('adult defaults dynamically derive from DEFAULT_ADULT constants', () => {
      const defaultState: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        },
        devMinorTestAccount: false,
      };

      assert.equal(defaultState.privacy.inviteFrom, DEFAULT_ADULT_INVITE_FROM);
      assert.equal(defaultState.privacy.discoverableByCode, DEFAULT_ADULT_DISCOVERABLE_BY_CODE);
      assert.equal(isPlayerDiscoverableByCode(defaultState), DEFAULT_ADULT_DISCOVERABLE_BY_CODE);
    });

    test('adult can switch inviteFrom to friends, which rejects stranger squad invites', () => {
      const adultState: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: 'everyone',
          discoverableByCode: true,
        },
        devMinorTestAccount: false,
      };

      // 1. Update privacy to friends-only
      const updated = updatePrivacySettings(adultState, { inviteFrom: 'friends' }, { isMinor: false });
      assert.equal(updated.result.ok, true);
      assert.equal(updated.state.privacy.inviteFrom, 'friends');

      // 2. Incoming squad invite from stranger
      const snap: SquadSocialStateSnapshot = {
        playerId: 'self',
        currentSquadId: 'squad_self',
        isSquadLeader: true,
        squadName: 'Self Squad',
        squadMembers: [{ id: 'self', nameZh: 'Self', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 }],
        squadInvites: [],
        friendIds: [], // sender is NOT friend
        devMinorTestAccount: false,
        blockedIds: [],
        privacy: updated.state.privacy,
      };

      const strangerInviteAction = {
        type: 'sendInvite' as const,
        id: 'inv_stranger_1',
        fromId: 'user_stranger',
        toId: 'self',
        squadId: 'squad_stranger',
        source: 'code' as const,
      };

      const res = applySquadSocialAction(snap, strangerInviteAction, baseNow);
      assert.equal(res.ok, false);
      assert.equal(res.reason, 'privacy_friends_only');
      assert.equal(res.result?.publicMessage, PUBLIC_JOIN_FAILURE);

      // 3. But incoming invite from an existing friend is accepted!
      const friendSnap: SquadSocialStateSnapshot = {
        ...snap,
        friendIds: ['user_stranger'], // now a friend
      };
      const friendRes = applySquadSocialAction(friendSnap, strangerInviteAction, baseNow);
      assert.equal(friendRes.ok, true);
    });

    test('turning discoverableByCode off makes isPlayerDiscoverableByCode return false', () => {
      const adultState: PrivacySafetyState = {
        blockedIds: [],
        reportLog: [],
        privacy: {
          inviteFrom: 'everyone',
          discoverableByCode: true,
        },
        devMinorTestAccount: false,
      };

      assert.equal(isPlayerDiscoverableByCode(adultState, 'viewer_1'), true);

      // Turn off discoverability
      const offState = updatePrivacySettings(adultState, { discoverableByCode: false }, { isMinor: false });
      assert.equal(offState.result.ok, true);
      assert.equal(offState.state.privacy.discoverableByCode, false);
      assert.equal(isPlayerDiscoverableByCode(offState.state, 'viewer_1'), false);
    });

    test('isPlayerDiscoverableByCode returns false if viewerId is blocked', () => {
      const state = {
        privacy: {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: true,
        },
        devMinorTestAccount: false,
        blockedIds: ['viewer_blocked'],
      };

      // General viewer can discover
      assert.equal(isPlayerDiscoverableByCode(state, 'normal_viewer'), true);
      // Blocked viewer cannot discover
      assert.equal(isPlayerDiscoverableByCode(state, 'viewer_blocked'), false);
    });
  });
});
