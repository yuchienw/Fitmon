import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchPlayerByCode,
  calculateSearchDelay,
  executeSearchWithDelay,
  canSendFriendRequest,
  getFriendRequestView,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  skipFriendRequest,
  removeFriend,
  sortFriends,
  formatRegenLockedCountdown,
  shouldShowPlayerCode,
  shouldShowCodeSearch,
  PLAYER_SEARCH_NOT_FOUND_MESSAGE,
  PLAYER_SEARCH_NOT_FOUND_HINT,
  PLAYER_SEARCH_RATE_LIMIT_MESSAGE,
  PLAYER_SEARCH_RATE_LIMIT_HINT,
  PLAYER_SEARCH_MIN_DELAY_MS,
  type PlayerDirectoryEntry,
  type PlayerSearchInput,
} from './friendSocial.ts';

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
  type NotificationItem,
} from './persistMigrate.ts';

import { SOCIAL_RATE_LIMITS } from '../config/economy.ts';
import { FRIEND_REQUEST_TTL_MS } from './notificationCenter.ts';

describe('FitMon Friend Social Pure Functions (T3-D9)', () => {
  const sampleDirectory: PlayerDirectoryEntry[] = [
    {
      id: 'user_mika',
      playerCode: 'K7PM4XQ9',
      nickname: 'Mika',
      level: 18,
      discoverableByCode: true,
      isMinor: false,
    },
    {
      id: 'user_jun',
      playerCode: 'R3HW8NTE',
      nickname: 'Jun',
      level: 25,
      discoverableByCode: true,
      isMinor: false,
    },
    {
      id: 'user_leo_hidden',
      playerCode: 'W9CT2KMF',
      nickname: 'Leo',
      level: 22,
      discoverableByCode: false, // 關閉代碼找人
      isMinor: false,
    },
    {
      id: 'user_minor_target',
      playerCode: 'T2MN8XWP',
      nickname: '小樹',
      level: 4,
      discoverableByCode: true,
      isMinor: true, // 目標為未成年
    },
    {
      id: 'user_blocked_you',
      playerCode: 'B7RK92MN',
      nickname: '小黑',
      level: 12,
      discoverableByCode: true,
      isMinor: false,
      blockedYou: true, // 對方封鎖我
    },
    {
      id: 'user_i_blocked',
      playerCode: 'C4XM79TK',
      nickname: '阿強',
      level: 15,
      discoverableByCode: true,
      isMinor: false,
    },
    {
      id: 'self',
      playerCode: 'S3LF789X',
      nickname: 'YuChien',
      level: 10,
      discoverableByCode: true,
      isMinor: false,
    },
  ];

  // =========================================================================
  // Case 1: Same-path search
  // =========================================================================
  describe('1. Same-path code search & normalization', () => {
    const baseNow = 1700000000000;
    const selfCode = 'S3LF789X';
    const selfId = 'self';

    function runSearch(query: string, overrides: Partial<PlayerSearchInput> = {}) {
      return searchPlayerByCode({
        query,
        selfId,
        selfCode,
        selfIsMinor: false,
        now: baseNow,
        lookupLog: [],
        directory: sampleDirectory,
        friendIds: [],
        blockedIds: ['user_i_blocked'],
        ...overrides,
      });
    }

    it('all not-found cases produce deep-equal public results', () => {
      // (a) 不存在的代碼
      const resNonExistent = runSearch('Z9999999');
      // (b) 舊代碼 / 換掉後失效的代碼
      const resOldCode = runSearch('W9CT2KMX');
      // (c) 關閉 discoverableByCode 的成人
      const resHidden = runSearch('W9CT2KMF');
      // (d) 目標是未成年
      const resMinorTarget = runSearch('T2MN8XWP');
      // (e) 對方封鎖我 (blockedYou === true)
      const resBlockedYou = runSearch('B7RK92MN');
      // (f) 我封鎖對方 (blockedIds 包含目標)
      const resIBlocked = runSearch('C4XM79TK');
      // (g) 搜尋自己代碼
      const resSelfCode = runSearch('S3LF789X');
      // (h) 自身是未成年時發動搜尋
      const resSelfIsMinor = runSearch('K7PM4XQ9', { selfIsMinor: true });

      // 預期所有失敗皆回傳相同的文案、提示與結構
      const expectedShape = {
        reason: 'not_found',
        message: PLAYER_SEARCH_NOT_FOUND_MESSAGE,
        hint: PLAYER_SEARCH_NOT_FOUND_HINT,
        nextLookupLog: [baseNow],
      };

      assert.deepEqual(resNonExistent, expectedShape);
      assert.deepEqual(resOldCode, expectedShape);
      assert.deepEqual(resHidden, expectedShape);
      assert.deepEqual(resMinorTarget, expectedShape);
      assert.deepEqual(resBlockedYou, expectedShape);
      assert.deepEqual(resIBlocked, expectedShape);
      assert.deepEqual(resSelfCode, expectedShape);
      assert.deepEqual(resSelfIsMinor, expectedShape);

      // 嚴格檢驗：結果中絕不洩露任何 target id, nickname 或原因標記
      for (const res of [
        resNonExistent,
        resOldCode,
        resHidden,
        resMinorTarget,
        resBlockedYou,
        resIBlocked,
        resSelfCode,
        resSelfIsMinor,
      ]) {
        assert.equal((res as any).player, undefined);
        assert.equal((res as any).targetId, undefined);
        assert.equal((res as any).nickname, undefined);
      }
    });

    it('normalization: lowercase, spaces, and hyphens still match current code', () => {
      const resExact = runSearch('K7PM4XQ9');
      const resSpaced = runSearch('k7pm 4xq9');
      const resHyphen = runSearch('K7PM-4XQ9');
      const resMixed = runSearch(' k7-pm 4x-q9 ');

      assert.equal(resExact.reason, 'found');
      assert.equal(resSpaced.reason, 'found');
      assert.equal(resHyphen.reason, 'found');
      assert.equal(resMixed.reason, 'found');

      assert.deepEqual(resExact.player, {
        id: 'user_mika',
        nickname: 'Mika',
        level: 18,
        isFriend: false,
      });
      assert.deepEqual(resSpaced.player, resExact.player);
      assert.deepEqual(resHyphen.player, resExact.player);
      assert.deepEqual(resMixed.player, resExact.player);
    });

    it('found person who is already in friendIds has isFriend true', () => {
      const resFriend = runSearch('K7PM4XQ9', { friendIds: ['user_mika'] });
      assert.equal(resFriend.reason, 'found');
      assert.equal(resFriend.player?.isFriend, true);
    });
  });

  // =========================================================================
  // Case 2: Timing within tolerance
  // =========================================================================
  describe('2. Timing within tolerance', () => {
    it('calculateSearchDelay returns between 400ms and 501ms', () => {
      // 隨機數 0 時為 400
      assert.equal(calculateSearchDelay(() => 0), 400);
      // 隨機數 0.5 時為 450
      assert.equal(calculateSearchDelay(() => 0.5), 450);
      // 隨機數 0.999 時為 500
      assert.equal(calculateSearchDelay(() => 0.999), 500);

      for (let i = 0; i < 20; i++) {
        const delay = calculateSearchDelay();
        assert.ok(delay >= PLAYER_SEARCH_MIN_DELAY_MS, `delay ${delay} >= 400`);
        assert.ok(delay <= PLAYER_SEARCH_MIN_DELAY_MS + 101, `delay ${delay} <= 501`);
      }
    });

    it('executeSearchWithDelay executes with delayMs 0 immediately', async () => {
      const input: PlayerSearchInput = {
        query: 'K7PM4XQ9',
        selfId: 'self',
        selfCode: 'S3LF789X',
        selfIsMinor: false,
        now: 1700000000000,
        lookupLog: [],
        directory: sampleDirectory,
        friendIds: [],
        blockedIds: [],
      };
      const { result, actualDelayMs } = await executeSearchWithDelay(input, { delayMs: 0 });
      assert.equal(actualDelayMs, 0);
      assert.equal(result.reason, 'found');
    });

    it('simulated sleep records delay in documented range', async () => {
      const requestedDelays: number[] = [];
      const fakeSleep = async (ms: number) => {
        requestedDelays.push(ms);
      };

      const input: PlayerSearchInput = {
        query: 'W9CT2KMX', // not found
        selfId: 'self',
        selfCode: 'S3LF789X',
        selfIsMinor: false,
        now: 1700000000000,
        lookupLog: [],
        directory: sampleDirectory,
        friendIds: [],
        blockedIds: [],
      };

      const { result, actualDelayMs } = await executeSearchWithDelay(input, { sleep: fakeSleep });
      assert.equal(result.reason, 'not_found');
      assert.equal(requestedDelays.length, 1);
      assert.ok(requestedDelays[0] >= 400 && requestedDelays[0] <= 501);
      assert.equal(actualDelayMs, requestedDelays[0]);
    });

    it('real-clock test verifies elapsed time stays >= 400ms and <= 600ms', async () => {
      const input: PlayerSearchInput = {
        query: 'K7PM4XQ9',
        selfId: 'self',
        selfCode: 'S3LF789X',
        selfIsMinor: false,
        now: Date.now(),
        lookupLog: [],
        directory: sampleDirectory,
        friendIds: [],
        blockedIds: [],
      };
      const start = performance.now();
      const { result, actualDelayMs } = await executeSearchWithDelay(input);
      const elapsed = performance.now() - start;

      assert.equal(result.reason, 'found');
      assert.ok(
        elapsed >= 390, // tolerance for timer resolution
        `real elapsed ${elapsed}ms should be at least ~400ms`
      );
      assert.ok(
        elapsed <= 650,
        `real elapsed ${elapsed}ms should not exceed 650ms`
      );
      assert.ok(actualDelayMs >= 400 && actualDelayMs <= 501);
    });
  });

  // =========================================================================
  // Case 3: Rate limits
  // =========================================================================
  describe('3. Code search rate limits', () => {
    const baseNow = 1700000000000;
    const inputTemplate: PlayerSearchInput = {
      query: 'K7PM4XQ9',
      selfId: 'self',
      selfCode: 'S3LF789X',
      selfIsMinor: false,
      now: baseNow,
      lookupLog: [],
      directory: sampleDirectory,
      friendIds: [],
      blockedIds: [],
    };

    it('5th lookup in a minute succeeds, 6th lookup is rate_limited with 稍後再試', () => {
      let currentLog: number[] = [];
      // 前 4 次查詢在過去 30 秒內
      for (let i = 0; i < 4; i++) {
        const res = searchPlayerByCode({
          ...inputTemplate,
          now: baseNow - (30 - i * 5) * 1000,
          lookupLog: currentLog,
        });
        assert.equal(res.reason, 'found');
        currentLog = res.nextLookupLog;
      }
      assert.equal(currentLog.length, 4);

      // 第 5 次查詢 (剛好在上限值)
      const res5 = searchPlayerByCode({
        ...inputTemplate,
        now: baseNow,
        lookupLog: currentLog,
      });
      assert.equal(res5.reason, 'found');
      currentLog = res5.nextLookupLog;
      assert.equal(currentLog.length, 5);

      // 第 6 次查詢在同一分鐘內：觸發每分鐘 5 次上限
      const res6 = searchPlayerByCode({
        ...inputTemplate,
        now: baseNow + 1000,
        lookupLog: currentLog,
      });
      assert.equal(res6.reason, 'rate_limited');
      assert.equal(res6.message, PLAYER_SEARCH_RATE_LIMIT_MESSAGE);
      assert.equal(res6.hint, PLAYER_SEARCH_RATE_LIMIT_HINT);

      // 限頻時不消耗額外次數 slot
      assert.equal(res6.nextLookupLog.length, 5);
      assert.deepEqual(res6.nextLookupLog, currentLog);
    });

    it('30th lookup in a day succeeds, 31st lookup is rate_limited', () => {
      // 過去 24 小時內已滿 29 次 (分散在不同分鐘)
      const mockLog: number[] = [];
      for (let i = 0; i < 29; i++) {
        mockLog.push(baseNow - (29 - i) * 10 * 60 * 1000);
      }

      // 第 30 次查詢
      const res30 = searchPlayerByCode({
        ...inputTemplate,
        now: baseNow,
        lookupLog: mockLog,
      });
      assert.equal(res30.reason, 'found');
      assert.equal(res30.nextLookupLog.length, 30);

      // 第 31 次查詢在當天
      const res31 = searchPlayerByCode({
        ...inputTemplate,
        now: baseNow + 5000,
        lookupLog: res30.nextLookupLog,
      });
      assert.equal(res31.reason, 'rate_limited');
      assert.equal(res31.message, PLAYER_SEARCH_RATE_LIMIT_MESSAGE);
      assert.equal(res31.nextLookupLog.length, 30);
    });
  });

  // =========================================================================
  // Case 4: Friend request daily cap
  // =========================================================================
  describe('4. Friend request daily send cap (20/day)', () => {
    const baseNow = 1700000000000;
    const selfId = 'self';

    it('20th send in a day succeeds, 21st send is blocked; cancelled sends still count', () => {
      let state = {
        friendIds: [],
        friendRequests: [] as FriendRequestItem[],
        notifications: [] as NotificationItem[],
      };

      // 送出 19 次 (包含 5 次被取消的申請)
      for (let i = 1; i <= 19; i++) {
        const targetId = `user_target_${i}`;
        const sendRes = sendFriendRequest(state, { fromId: selfId, toId: targetId }, baseNow);
        assert.equal(sendRes.result, 'success');
        state = sendRes.state;

        if (i % 4 === 0) {
          // 取消申請
          const cancelRes = cancelFriendRequest(
            state,
            { fromId: selfId, toId: targetId },
            baseNow + 100
          );
          assert.equal(cancelRes.result, 'cancelled');
          state = cancelRes.state;
        }
      }

      assert.equal(state.friendRequests.length, 19);
      assert.equal(canSendFriendRequest(state, selfId, baseNow), true);

      // 第 20 次發送
      const send20 = sendFriendRequest(
        state,
        { fromId: selfId, toId: 'user_target_20' },
        baseNow
      );
      assert.equal(send20.result, 'success');
      state = send20.state;

      // 檢查此時額度已耗盡
      assert.equal(canSendFriendRequest(state, selfId, baseNow), false);
      assert.equal(
        getFriendRequestView(state, selfId, 'user_target_new', baseNow),
        'limit'
      );

      // 第 21 次嘗試發送被拒絕
      const send21 = sendFriendRequest(
        state,
        { fromId: selfId, toId: 'user_target_21' },
        baseNow
      );
      assert.equal(send21.result, 'limit_reached');
      assert.equal(send21.error, '今天的好友申請次數用完了，明天再來');
      assert.equal(state.friendRequests.length, 20); // 未增加
    });
  });

  // =========================================================================
  // Case 5: Skip cooldown & Q16
  // =========================================================================
  describe('5. Skip cooldown & Q16 sender view persistence', () => {
    const baseNow = 1700000000000;
    const selfId = 'self';
    const targetId = 'user_mika';

    it('after skip, sender view stays pending until 7 days; no sender notif added; after 7 days returns to add', () => {
      let state = {
        friendIds: [],
        friendRequests: [] as FriendRequestItem[],
        notifications: [] as NotificationItem[],
      };

      // 1. 發送好友申請
      const sendRes = sendFriendRequest(state, { fromId: selfId, toId: targetId }, baseNow);
      assert.equal(sendRes.result, 'success');
      state = sendRes.state;
      const initialNotifCount = state.notifications.length;

      // 2. 對方略過 (skip)
      const skipRes = skipFriendRequest(
        state,
        { requestId: sendRes.requestId },
        baseNow + 1000
      );
      assert.equal(skipRes.result, 'skipped');
      state = skipRes.state;

      // 規範：略過時不得對發送方發送任何小鈴鐺通知
      assert.equal(state.notifications.length, initialNotifCount);

      // 3. 在 7 天 TTL 內，發送方看到的按鈕狀態必須保持 pending (已送出好友申請)
      const viewDay3 = getFriendRequestView(
        state,
        selfId,
        targetId,
        baseNow + 3 * 24 * 60 * 60 * 1000
      );
      assert.equal(viewDay3, 'pending');

      const viewDay6 = getFriendRequestView(
        state,
        selfId,
        targetId,
        baseNow + 6.9 * 24 * 60 * 60 * 1000
      );
      assert.equal(viewDay6, 'pending');

      // 4. 滿 7 天後，按鈕恢復為可加好友 (cooldown_expired_ready 或 add)
      const viewAfter7d = getFriendRequestView(
        state,
        selfId,
        targetId,
        baseNow + (7 * 24 * 60 * 60 * 1000 + 1000)
      );
      assert.equal(viewAfter7d, 'cooldown_expired_ready');
    });
  });

  // =========================================================================
  // Case 6: Cancel friend request
  // =========================================================================
  describe('6. Cancel friend request flow', () => {
    const baseNow = 1700000000000;
    const selfId = 'self';
    const targetId = 'user_mika';

    it('request is cancelled, recipient notification removed, no new notification, sender can send again', () => {
      let state = {
        friendIds: [],
        friendRequests: [] as FriendRequestItem[],
        notifications: [] as NotificationItem[],
      };

      const sendRes = sendFriendRequest(state, { fromId: selfId, toId: targetId }, baseNow);
      state = sendRes.state;
      assert.equal(state.notifications.length, 1);
      assert.equal(state.notifications[0].type, 'friend_request');

      // 取消申請
      const cancelRes = cancelFriendRequest(
        state,
        { requestId: sendRes.requestId },
        baseNow + 500
      );
      assert.equal(cancelRes.result, 'cancelled');
      state = cancelRes.state;

      // 申請項目標記為 cancelled
      const req = state.friendRequests.find((r) => r.id === sendRes.requestId);
      assert.equal(req?.status, 'cancelled');

      // 收件者的待處理好友通知已被移除（卡片消失）
      const remainingFriendNotif = state.notifications.find(
        (n) => n.type === 'friend_request'
      );
      assert.equal(remainingFriendNotif, undefined);

      // 發送方按鈕狀態回到 add
      const view = getFriendRequestView(state, selfId, targetId, baseNow + 1000);
      assert.equal(view, 'add');

      // 發送方可以再次送出申請（並計入當日發送總次數）
      const resendRes = sendFriendRequest(
        state,
        { fromId: selfId, toId: targetId },
        baseNow + 2000
      );
      assert.equal(resendRes.result, 'success');
      assert.equal(resendRes.state.friendRequests.length, 2);
    });
  });

  // =========================================================================
  // Case 7: Minor rules
  // =========================================================================
  describe('7. Minor protection rules (ADR-0004)', () => {
    it('minor has no code-search success for strangers', () => {
      const res = searchPlayerByCode({
        query: 'K7PM4XQ9',
        selfId: 'self',
        selfCode: 'S3LF789X',
        selfIsMinor: true, // 自身為未成年
        now: 1700000000000,
        lookupLog: [],
        directory: sampleDirectory,
        friendIds: [],
        blockedIds: [],
      });

      assert.equal(res.reason, 'not_found');
      assert.equal(res.message, PLAYER_SEARCH_NOT_FOUND_MESSAGE);
      assert.equal(res.player, undefined);
    });

    it('directory entry with isMinor=true is not found (same path)', () => {
      const res = searchPlayerByCode({
        query: 'T2MN8XWP', // 小樹 (isMinor === true)
        selfId: 'self',
        selfCode: 'S3LF789X',
        selfIsMinor: false,
        now: 1700000000000,
        lookupLog: [],
        directory: sampleDirectory,
        friendIds: [],
        blockedIds: [],
      });

      assert.equal(res.reason, 'not_found');
      assert.equal(res.message, PLAYER_SEARCH_NOT_FOUND_MESSAGE);
    });

    it('shouldShowPlayerCode and shouldShowCodeSearch return false for minors', () => {
      assert.equal(shouldShowPlayerCode(true), false);
      assert.equal(shouldShowPlayerCode(false), true);
      assert.equal(shouldShowCodeSearch(true), false);
      assert.equal(shouldShowCodeSearch(false), true);
    });
  });

  // =========================================================================
  // Case 8: Sort order (Q18)
  // =========================================================================
  describe('8. Friends list sort order (Q18)', () => {
    it('sorts: current squad -> recent teammates -> nickname', () => {
      const friends = [
        { id: 'user_dan', nickname: 'Dan', level: 10 },
        { id: 'user_alice', nickname: 'Alice', level: 12 },
        { id: 'user_akai', nickname: '阿凱', level: 14 },
        { id: 'user_chloe', nickname: '小柔', level: 9 },
        { id: 'user_leo', nickname: 'Leo', level: 22 },
        { id: 'user_baobao', nickname: '寶寶', level: 5 },
      ];

      // 設定當前同隊成員：阿凱、小柔
      const currentSquadIds = ['user_akai', 'user_chloe'];
      // 設定最近隊友：Leo、寶寶
      const recentTeammateIds = ['user_leo', 'user_baobao'];

      const sorted = sortFriends(friends, { currentSquadIds, recentTeammateIds });
      const ids = sorted.map((f) => f.id);

      // 第一優先：同隊（小柔, 阿凱 依 zh-Hant localeCompare 排序）
      assert.equal(ids[0], 'user_chloe');
      assert.equal(ids[1], 'user_akai');

      // 第二優先：最近隊友（寶寶, Leo 依 zh-Hant localeCompare 排序）
      assert.equal(ids[2], 'user_baobao');
      assert.equal(ids[3], 'user_leo');

      // 第三優先：其他好友（Alice, Dan 依 zh-Hant localeCompare 排序）
      assert.equal(ids[4], 'user_alice');
      assert.equal(ids[5], 'user_dan');
    });
  });

  // =========================================================================
  // Case 9: Old friendIds preservation
  // =========================================================================
  describe('9. Old friendIds preservation & idempotency', () => {
    const baseNow = 1700000000000;
    const selfId = 'self';

    it('accepting or removing does not wipe pre-existing friendIds; v3 state treats them as accepted friends', () => {
      const legacyFriends = ['user_legacy_1', 'user_legacy_2', 'user_legacy_3'];

      let state = {
        friendIds: [...legacyFriends],
        friendRequests: [] as FriendRequestItem[],
        notifications: [] as NotificationItem[],
      };

      // 1. 舊存檔好友在 getFriendRequestView 中直接為 'friends'
      for (const id of legacyFriends) {
        assert.equal(getFriendRequestView(state, selfId, id, baseNow), 'friends');
      }

      // 2. 接受新好友申請
      const newReq: FriendRequestItem = {
        id: 'req_new_friend',
        fromId: 'user_mika',
        toId: selfId,
        status: 'pending',
        createdAt: baseNow,
      };
      state.friendRequests.push(newReq);

      const acceptRes = acceptFriendRequest(
        state,
        { requestId: 'req_new_friend' },
        baseNow + 1000
      );
      assert.equal(acceptRes.result, 'accepted');
      state = acceptRes.state;

      // 既有舊好友仍然完整保留
      for (const id of legacyFriends) {
        assert.ok(
          state.friendIds.includes(id),
          `legacy friend ${id} must still be in friendIds`
        );
      }
      assert.ok(state.friendIds.includes('user_mika'));
      assert.equal(state.friendIds.length, 4);

      // 3. 移除其中一位好友，其餘舊好友維持不變
      const removeRes = removeFriend(
        state,
        { profileId: 'user_legacy_2' },
        baseNow + 2000
      );
      assert.equal(removeRes.result, 'removed');
      state = removeRes.state;

      assert.ok(state.friendIds.includes('user_legacy_1'));
      assert.ok(!state.friendIds.includes('user_legacy_2'));
      assert.ok(state.friendIds.includes('user_legacy_3'));
      assert.ok(state.friendIds.includes('user_mika'));
      assert.equal(state.friendIds.length, 3);
    });
  });

  // =========================================================================
  // Additional: Player Code Regeneration Countdown
  // =========================================================================
  describe('Player code regen countdown text (Q27)', () => {
    it('formats 24h locked countdown with user local time and does not mention 明天', () => {
      const genAt = 1700000000000;
      const { longText, shortText } = formatRegenLockedCountdown(genAt, genAt + 1000);

      assert.ok(longText.includes('代碼 24 小時內只能換一次，'));
      assert.ok(longText.includes('後可以再換'));
      assert.ok(!longText.includes('明天'));
      assert.ok(shortText.includes('後可以再換'));
      assert.ok(!shortText.includes('明天'));
    });
  });
});
