import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  NOTIFICATIONS_CAP,
  NOTIFICATIONS_KEEP_MS,
  SQUAD_INVITE_TTL_MS,
  FRIEND_REQUEST_TTL_MS,
  NOTIFICATION_VIEW_WHITELIST,
  FORBIDDEN_NOTIFICATION_SUBSTRINGS,
  type RecipientNotifyContext,
  type NotificationItem,
  pruneNotifications,
  visibleNotifications,
  unreadCount,
  getUnreadBadgeText,
  markAllRead,
  toNotificationView,
  assertNoSensitiveNotificationText,
  getTaipeiDayEnd,
  formatTaipeiDate,
  isSameTaipeiDay,
} from './notificationCenter.ts';

describe('NotificationCenter Pure Functions (T3-D7)', () => {
  const baseNow = 1763637168000; // 2025-11-20 19:12:48 UTC+8 approx

  // 1. Receiver-side filtering (Q19)
  describe('1. Receiver-side nudge filtering', () => {
    const friendNudge: NotificationItem = {
      id: 'nudge_1',
      type: 'nudge',
      actorId: 'friend_akai',
      createdAt: baseNow,
      status: 'pending',
    };

    const invite: NotificationItem = {
      id: 'invite_1',
      type: 'squad_invite',
      actorId: 'friend_akai',
      createdAt: baseNow,
      status: 'pending',
    };

    const baseCtx: RecipientNotifyContext = {
      isRestDay: false,
      isCaringForBody: false,
      isPaused: false,
      isMinor: false,
      friendIds: ['friend_akai'],
      blockedIds: [],
    };

    test('visible and counts as unread when all three receiver flags are false', () => {
      const res = visibleNotifications([friendNudge, invite], baseCtx, baseNow);
      assert.equal(res.all.length, 2);
      assert.ok(res.all.some((n) => n.id === 'nudge_1'));
      assert.equal(unreadCount(res.all), 2);
    });

    test('nudge is hidden and excluded from unread when isRestDay is true', () => {
      const ctx = { ...baseCtx, isRestDay: true };
      const res = visibleNotifications([friendNudge, invite], ctx, baseNow);
      assert.ok(!res.all.some((n) => n.id === 'nudge_1'));
      assert.ok(res.all.some((n) => n.id === 'invite_1'));
      assert.equal(unreadCount(res.all), 1);
    });

    test('nudge is hidden and excluded from unread when isCaringForBody is true', () => {
      const ctx = { ...baseCtx, isCaringForBody: true };
      const res = visibleNotifications([friendNudge, invite], ctx, baseNow);
      assert.ok(!res.all.some((n) => n.id === 'nudge_1'));
      assert.ok(res.all.some((n) => n.id === 'invite_1'));
      assert.equal(unreadCount(res.all), 1);
    });

    test('nudge is hidden and excluded from unread when isPaused is true', () => {
      const ctx = { ...baseCtx, isPaused: true };
      const res = visibleNotifications([friendNudge, invite], ctx, baseNow);
      assert.ok(!res.all.some((n) => n.id === 'nudge_1'));
      assert.ok(res.all.some((n) => n.id === 'invite_1'));
      assert.equal(unreadCount(res.all), 1);
    });

    test('other notification types (e.g. squad_invite, join_request) are not hidden by rest/body/paused flags', () => {
      const allFilteredCtx = {
        ...baseCtx,
        isRestDay: true,
        isCaringForBody: true,
        isPaused: true,
      };
      const res = visibleNotifications([friendNudge, invite], allFilteredCtx, baseNow);
      assert.equal(res.all.length, 1);
      assert.equal(res.all[0].id, 'invite_1');
    });

    test('hidden nudges stay hidden the next day and do not resurface', () => {
      // Day 1: recipient is resting, receives nudge
      const day1Ctx = { ...baseCtx, isRestDay: true };
      const day1Res = visibleNotifications([friendNudge], day1Ctx, baseNow);
      assert.equal(day1Res.all.length, 0);

      // Suppose the item was marked skipped or suppressed upon receipt, or on day 2 the day is ended
      const nextDayTime = baseNow + 24 * 60 * 60 * 1000;
      const day2Ctx = { ...baseCtx, isRestDay: false };
      // If item was stored with status: 'skipped' (silent drop):
      const skippedNudge = { ...friendNudge, status: 'skipped' };
      const day2Res = visibleNotifications([skippedNudge], day2Ctx, nextDayTime);
      assert.equal(day2Res.all.length, 0);
      assert.equal(unreadCount(day2Res.all), 0);
    });
  });

  // 2. Pruning
  describe('2. Pruning & limits', () => {
    test('drops items older than 30 days', () => {
      const oldTime = baseNow - (NOTIFICATIONS_KEEP_MS + 1000);
      const recentTime = baseNow - 1000;
      const list: NotificationItem[] = [
        { id: 'old_1', type: 'result_success', createdAt: oldTime },
        { id: 'recent_1', type: 'result_success', createdAt: recentTime },
      ];
      const pruned = pruneNotifications(list, baseNow);
      assert.equal(pruned.length, 1);
      assert.equal(pruned[0].id, 'recent_1');
    });

    test('caps at 50 newest notifications and sorts newest first', () => {
      const list: NotificationItem[] = [];
      for (let i = 0; i < 70; i++) {
        list.push({
          id: `item_${i}`,
          type: 'result_success',
          createdAt: baseNow - (70 - i) * 60 * 1000,
        });
      }
      const pruned = pruneNotifications(list, baseNow);
      assert.equal(pruned.length, NOTIFICATIONS_CAP);
      assert.equal(pruned.length, 50);
      assert.equal(pruned[0].id, 'item_69'); // newest
      assert.equal(pruned[49].id, 'item_20');
      for (let i = 0; i < pruned.length - 1; i++) {
        assert.ok(pruned[i].createdAt >= pruned[i + 1].createdAt);
      }
    });
  });

  // 3. Payload whitelist
  describe('3. Payload whitelist & security', () => {
    test('toNotificationView never includes health, rest, workout, coins, stamina, is_minor, or playerCode fields', () => {
      const maliciousItem = {
        id: 'mal_1',
        type: 'squad_invite',
        actorId: 'friend_akai',
        createdAt: baseNow,
        status: 'pending',
        // Malicious injected fields:
        coins: 999999,
        stamina: 100,
        is_minor: false,
        birth_date: '2000-01-01',
        email: 'test@example.com',
        playerCode: 'ABCD-EFGH',
        healthStatus: '照顧身體中',
        restReason: '我不舒服',
        workoutData: '30 sets 100kg deadlift',
        heartRate: 180,
      } as unknown as NotificationItem;

      const view = toNotificationView(maliciousItem, undefined, baseNow);
      const viewKeys = Object.keys(view);

      for (const forbiddenKey of [
        'coins',
        'stamina',
        'is_minor',
        'birth_date',
        'email',
        'playerCode',
        'healthStatus',
        'restReason',
        'workoutData',
        'heartRate',
      ]) {
        assert.ok(!viewKeys.includes(forbiddenKey), `View should not contain forbidden key: ${forbiddenKey}`);
      }

      for (const key of viewKeys) {
        assert.ok(
          (NOTIFICATION_VIEW_WHITELIST as readonly string[]).includes(key),
          `Key "${key}" must be in NOTIFICATION_VIEW_WHITELIST`
        );
      }
    });

    test('string search over serialized views contains none of the forbidden sensitive substrings', () => {
      const items: NotificationItem[] = [
        { id: '1', type: 'squad_invite', actorId: 'friend_akai', createdAt: baseNow },
        { id: '2', type: 'join_request', actorId: 'user_leo', createdAt: baseNow },
        { id: '3', type: 'result_failure', actorId: 'self', createdAt: baseNow },
        { id: '4', type: 'nudge', actorId: 'friend_akai', createdAt: baseNow },
        { id: '5', type: 'squad_change', refId: 'kicked', createdAt: baseNow },
      ];

      for (const item of items) {
        const view = toNotificationView(item, undefined, baseNow);
        const serialized = JSON.stringify(view);
        assertNoSensitiveNotificationText(serialized);
        for (const forbidden of FORBIDDEN_NOTIFICATION_SUBSTRINGS) {
          assert.ok(
            !serialized.includes(forbidden),
            `Serialized notification view should not contain forbidden substring "${forbidden}"`
          );
        }
      }
    });
  });

  // 4. Neutral failure copy
  describe('4. Neutral failure copy', () => {
    test('neutral failure copy is identical regardless of any internal reason', () => {
      const failureReason1 = {
        id: 'f1',
        type: 'result_failure',
        actorId: 'user_leo',
        createdAt: baseNow,
        internalReason: 'squad_full',
      } as unknown as NotificationItem;

      const failureReason2 = {
        id: 'f2',
        type: 'result_failure',
        actorId: 'user_leo',
        createdAt: baseNow,
        internalReason: 'blocked',
      } as unknown as NotificationItem;

      const failureReason3 = {
        id: 'f3',
        type: 'result_failure',
        actorId: 'user_leo',
        createdAt: baseNow,
        internalReason: 'declined',
      } as unknown as NotificationItem;

      const v1 = toNotificationView(failureReason1, undefined, baseNow);
      const v2 = toNotificationView(failureReason2, undefined, baseNow);
      const v3 = toNotificationView(failureReason3, undefined, baseNow);

      assert.equal(v1.title, 'Leo 目前無法加入');
      assert.equal(v2.title, 'Leo 目前無法加入');
      assert.equal(v3.title, 'Leo 目前無法加入');
      assert.equal(v1.title, v2.title);
      assert.equal(v2.title, v3.title);
      assert.equal(v1.subtitle, undefined);
      assert.equal(v2.subtitle, undefined);
      assert.equal(v3.subtitle, undefined);

      // Self failure copy
      const selfFailure = {
        id: 'f_self',
        type: 'result_failure',
        actorId: 'self',
        refId: 'self',
        createdAt: baseNow,
      };
      const vSelf = toNotificationView(selfFailure, undefined, baseNow);
      assert.equal(vSelf.title, '這次沒有加入成功');
      assert.equal(vSelf.subtitle, '可以去找別的隊伍看看');
    });
  });

  // 5. Minor protection
  describe('5. Minor context stranger filtering', () => {
    const friendInvite: NotificationItem = {
      id: 'inv_friend',
      type: 'squad_invite',
      actorId: 'friend_akai',
      createdAt: baseNow,
      status: 'pending',
    };

    const strangerInvite: NotificationItem = {
      id: 'inv_stranger',
      type: 'squad_invite',
      actorId: 'stranger_mika',
      createdAt: baseNow,
      status: 'pending',
    };

    const friendJoinReq: NotificationItem = {
      id: 'join_friend',
      type: 'join_request',
      actorId: 'friend_alice',
      createdAt: baseNow,
      status: 'pending',
    };

    const strangerJoinReq: NotificationItem = {
      id: 'join_stranger',
      type: 'join_request',
      actorId: 'stranger_jun',
      createdAt: baseNow,
      status: 'pending',
    };

    test('minor context drops stranger squad_invite and join_request, keeps friend-originated ones', () => {
      const minorCtx: RecipientNotifyContext = {
        isRestDay: false,
        isCaringForBody: false,
        isPaused: false,
        isMinor: true,
        friendIds: ['friend_akai', 'friend_alice'],
        blockedIds: [],
      };

      const res = visibleNotifications(
        [friendInvite, strangerInvite, friendJoinReq, strangerJoinReq],
        minorCtx,
        baseNow
      );

      assert.equal(res.all.length, 2);
      assert.ok(res.all.some((n) => n.id === 'inv_friend'));
      assert.ok(res.all.some((n) => n.id === 'join_friend'));
      assert.ok(!res.all.some((n) => n.id === 'inv_stranger'));
      assert.ok(!res.all.some((n) => n.id === 'join_stranger'));

      // Dropped items do not count toward unread
      assert.equal(unreadCount(res.all), 2);
    });

    test('non-minor context keeps stranger invites and join requests', () => {
      const adultCtx: RecipientNotifyContext = {
        isRestDay: false,
        isCaringForBody: false,
        isPaused: false,
        isMinor: false,
        friendIds: ['friend_akai', 'friend_alice'],
        blockedIds: [],
      };

      const res = visibleNotifications(
        [friendInvite, strangerInvite, friendJoinReq, strangerJoinReq],
        adultCtx,
        baseNow
      );

      assert.equal(res.all.length, 4);
      assert.equal(unreadCount(res.all), 4);
    });
  });

  // 6. Badge and Mark All Read
  describe('6. Badge count and markAllRead', () => {
    test('badge formatting: 0 is empty/hidden, 1-9 is digit, 10+ is 9+', () => {
      assert.equal(getUnreadBadgeText(0), '');
      assert.equal(getUnreadBadgeText(1), '1');
      assert.equal(getUnreadBadgeText(5), '5');
      assert.equal(getUnreadBadgeText(9), '9');
      assert.equal(getUnreadBadgeText(10), '9+');
      assert.equal(getUnreadBadgeText(42), '9+');
    });

    test('markAllRead zeroes unread count for visible items only', () => {
      const items: NotificationItem[] = [
        { id: '1', type: 'result_success', createdAt: baseNow },
        { id: '2', type: 'result_success', createdAt: baseNow },
        { id: '3', type: 'result_success', createdAt: baseNow, readAt: baseNow - 1000 },
        { id: 'hidden_nudge', type: 'nudge', actorId: 'friend_akai', createdAt: baseNow },
      ];

      const ctx: RecipientNotifyContext = {
        isRestDay: true, // hides nudge
        isCaringForBody: false,
        isPaused: false,
        isMinor: false,
        friendIds: ['friend_akai'],
        blockedIds: [],
      };

      const resBefore = visibleNotifications(items, ctx, baseNow);
      assert.equal(unreadCount(resBefore.all), 2); // items 1 and 2

      const visibleIds = resBefore.all.map((n) => n.id);
      const updatedList = markAllRead(items, visibleIds, baseNow);

      const resAfter = visibleNotifications(updatedList, ctx, baseNow);
      assert.equal(unreadCount(resAfter.all), 0);

      // Verify hidden_nudge did not get readAt
      const hiddenItem = updatedList.find((n) => n.id === 'hidden_nudge');
      assert.equal(hiddenItem?.readAt, undefined);
    });
  });

  // 7. Expiry
  describe('7. Expiry rules and behavior', () => {
    test('pending squad invite 25h old displays expired', () => {
      const invite25h: NotificationItem = {
        id: 'inv_old',
        type: 'squad_invite',
        actorId: 'friend_akai',
        createdAt: baseNow - 25 * 60 * 60 * 1000,
        status: 'pending',
      };

      const view = toNotificationView(invite25h, undefined, baseNow);
      assert.ok(view.isExpired);
      assert.equal(view.subtitle, '這個邀請已過期');
    });

    test('friend request 8 days old displays expired', () => {
      const friendReq8d: NotificationItem = {
        id: 'fr_old',
        type: 'friend_request',
        actorId: 'user_leo',
        createdAt: baseNow - 8 * 24 * 60 * 60 * 1000,
        status: 'pending',
      };

      const view = toNotificationView(friendReq8d, undefined, baseNow);
      assert.ok(view.isExpired);
      assert.equal(view.subtitle, '這個好友申請已過期');
    });

    test('same-day nudge has view action, after 23:59 it does not', () => {
      // 10:00 AM Taipei time today
      const endOfDay = getTaipeiDayEnd(baseNow);
      const morningTime = endOfDay - 12 * 60 * 60 * 1000;

      const sameDayNudge: NotificationItem = {
        id: 'nudge_today',
        type: 'nudge',
        actorId: 'friend_akai',
        createdAt: morningTime,
        status: 'pending',
      };

      // Checked at 14:00 today
      const afternoonTime = morningTime + 4 * 60 * 60 * 1000;
      const viewToday = toNotificationView(sameDayNudge, undefined, afternoonTime);
      assert.equal(viewToday.actionType, 'nudge');
      assert.equal(viewToday.expiryLabel, '今天 23:59 前有效');

      // Checked at 00:01 next day (past 23:59)
      const nextDayMidnight = endOfDay + 60 * 1000;
      const viewExpired = toNotificationView(sameDayNudge, undefined, nextDayMidnight);
      assert.equal(viewExpired.actionType, 'none');
      assert.equal(viewExpired.expiryLabel, undefined);
    });
  });

  // 8. Pending section pinning vs General section ordering
  describe('8. Pending section pinning vs general section ordering', () => {
    test('pending actionable items stay pinned in pendingActionable; expired leave to general', () => {
      const activeInvite: NotificationItem = {
        id: 'active_inv',
        type: 'squad_invite',
        actorId: 'friend_akai',
        createdAt: baseNow - 2 * 60 * 60 * 1000,
        status: 'pending',
      };

      const activeFriendReq: NotificationItem = {
        id: 'active_fr',
        type: 'friend_request',
        actorId: 'user_leo',
        createdAt: baseNow - 5 * 60 * 60 * 1000,
        status: 'pending',
      };

      const expiredInvite: NotificationItem = {
        id: 'expired_inv',
        type: 'squad_invite',
        actorId: 'friend_akai',
        createdAt: baseNow - 26 * 60 * 60 * 1000, // expired (> 24h)
        status: 'pending',
      };

      const handledInvite: NotificationItem = {
        id: 'handled_inv',
        type: 'squad_invite',
        actorId: 'friend_chloe',
        createdAt: baseNow - 1 * 60 * 60 * 1000,
        status: 'accepted',
      };

      const squadResult: NotificationItem = {
        id: 'result_1',
        type: 'result_success',
        actorId: 'friend_alice',
        createdAt: baseNow - 30 * 60 * 1000,
      };

      const ctx: RecipientNotifyContext = {
        isRestDay: false,
        isCaringForBody: false,
        isPaused: false,
        isMinor: false,
        friendIds: ['friend_akai', 'friend_alice', 'friend_chloe'],
        blockedIds: [],
      };

      const res = visibleNotifications(
        [activeInvite, activeFriendReq, expiredInvite, handledInvite, squadResult],
        ctx,
        baseNow
      );

      // Pending section has only still-actionable pending items
      assert.equal(res.pendingActionable.length, 2);
      assert.equal(res.pendingActionable[0].id, 'active_inv');
      assert.equal(res.pendingActionable[1].id, 'active_fr');

      // General section has the handled, expired, and result items
      assert.equal(res.general.length, 3);
      assert.ok(res.general.some((n) => n.id === 'expired_inv'));
      assert.ok(res.general.some((n) => n.id === 'handled_inv'));
      assert.ok(res.general.some((n) => n.id === 'result_1'));

      // In general section, order is newest first by createdAt
      assert.equal(res.general[0].id, 'result_1'); // 30m ago
      assert.equal(res.general[1].id, 'handled_inv'); // 1h ago
      assert.equal(res.general[2].id, 'expired_inv'); // 26h ago
    });

    test('T3-D10: blockedIds hides notifications of all types and does not count toward unread count', () => {
      const blockedActor = 'bad_user_99';
      const items: NotificationItem[] = [
        { id: 'inv_blocked', type: 'squad_invite', actorId: blockedActor, createdAt: baseNow, status: 'pending' },
        { id: 'join_blocked', type: 'join_request', actorId: blockedActor, createdAt: baseNow, status: 'pending' },
        { id: 'freq_blocked', type: 'friend_request', actorId: blockedActor, createdAt: baseNow, status: 'pending' },
        { id: 'nudge_blocked', type: 'nudge', actorId: blockedActor, createdAt: baseNow },
        { id: 'result_blocked', type: 'result_success', actorId: blockedActor, createdAt: baseNow },
        { id: 'normal_inv', type: 'squad_invite', actorId: 'friend_akai', createdAt: baseNow, status: 'pending' },
      ];

      const ctx: RecipientNotifyContext = {
        isRestDay: false,
        isCaringForBody: false,
        isPaused: false,
        isMinor: false,
        friendIds: ['friend_akai'],
        blockedIds: [blockedActor],
      };

      const res = visibleNotifications(items, ctx, baseNow);
      assert.equal(res.all.length, 1);
      assert.equal(res.all[0].id, 'normal_inv');
      assert.equal(unreadCount(res.all), 1);
    });
  });
});
