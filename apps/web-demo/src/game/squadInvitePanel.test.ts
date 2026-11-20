import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applySquadSocialAction,
  applyAcceptInviteFromNotification,
  previewSwitchSquadFromInvite,
  getSquadInviteRowState,
  isPersonInSquadInviteCooldown,
  isDailySquadInviteCapReached,
  isNonFriendDailySquadInviteCapReached,
  pruneInviteSendLog,
  PUBLIC_JOIN_FAILURE,
  DAILY_INVITE_CAP_REACHED_MESSAGE,
  COOLDOWN_MESSAGE,
  SQUAD_CAP,
  DEMO_PLAYER_ID,
  type SquadSocialStateSnapshot,
  type SquadInviteItem,
  type DemoFakeSquad,
} from './squadInviteRules.ts';

import { SOCIAL_RATE_LIMITS } from '../config/economy.ts';
import { type DemoSearchablePlayer } from '../config/demo.ts';
import { BOSS_REWARD_ALREADY_CLAIMED_NOTE } from './squadMembershipRules.ts';
import { getBossRewardWeekKey } from './economyRules.ts';

const BASE_TIME = 1774000000000; // Fixed timestamp for deterministic tests

function createBaseSnapshot(overrides: Partial<SquadSocialStateSnapshot> = {}): SquadSocialStateSnapshot {
  return {
    playerId: DEMO_PLAYER_ID,
    currentSquadId: 'squad_alpha',
    isSquadLeader: true,
    squadName: '阿爾法戰隊',
    squadMembers: [],
    squadInvites: [],
    friendIds: ['friend_alice'],
    devMinorTestAccount: false,
    squadJoinOrder: [DEMO_PLAYER_ID],
    recentTeammates: [],
    inviteSendLog: [],
    privacy: {
      inviteFrom: 'everyone',
      discoverableByCode: true,
    },
    blockedIds: [],
    bossRewardClaimedWeekKey: null,
    notifications: [],
    squadStage: 1,
    squadBossHp: 1000,
    ...overrides,
  };
}

const mockDirectory: DemoSearchablePlayer[] = [
  {
    id: 'user_privacy_friends',
    playerCode: 'PRIV0001',
    nickname: '隱私玩家',
    level: 10,
    isMinor: false,
    discoverableByCode: true,
    inviteFrom: 'friends',
  },
  {
    id: 'user_hidden_code',
    playerCode: 'HIDE0002',
    nickname: '隱藏代碼玩家',
    level: 12,
    isMinor: false,
    discoverableByCode: false,
    inviteFrom: 'everyone',
  },
  {
    id: 'user_minor_target',
    playerCode: 'MINO0003',
    nickname: '未成年玩家',
    level: 8,
    isMinor: true,
    discoverableByCode: false,
    inviteFrom: 'friends',
  },
  {
    id: 'user_blocked_you',
    playerCode: 'BLOK0004',
    nickname: '封鎖你玩家',
    level: 15,
    isMinor: false,
    discoverableByCode: true,
    inviteFrom: 'everyone',
    blockedYou: true,
  },
  {
    id: 'user_normal_adult',
    playerCode: 'NORM0005',
    nickname: '一般成人',
    level: 20,
    isMinor: false,
    discoverableByCode: true,
    inviteFrom: 'everyone',
  },
];

const mockFakeSquads: DemoFakeSquad[] = [
  {
    id: 'squad_beta',
    name: '貝塔力量隊',
    leaderId: 'leader_beta',
    leaderNameZh: '隊長貝塔',
    members: [
      {
        id: 'member_b1',
        nameZh: '隊員B1',
        roleType: 'phy',
        roleBadgeZh: '物攻',
        gearDescZh: '裝備',
        hasWorkedOutToday: true,
        workoutAuditZh: '30m',
        damageDealt: 500,
        nudgedCount: 0,
      },
    ],
    inviteCode: 'BETA12',
  },
  {
    id: 'squad_full_gamma',
    name: '伽瑪滿員隊',
    leaderId: 'leader_gamma',
    leaderNameZh: '隊長伽瑪',
    members: [
      { id: 'm1', nameZh: 'M1', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 },
      { id: 'm2', nameZh: 'M2', roleType: 'mag', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 },
      { id: 'm3', nameZh: 'M3', roleType: 'support', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 },
    ],
    inviteCode: 'GAMMA4',
  },
];

describe('T3-D8 Squad Invite Rules & Invite Panel Logic', () => {
  describe('1. Privacy & Code Discoverability', () => {
    it('adult target with inviteFrom="friends" blocks non-friend with PUBLIC_JOIN_FAILURE; succeeds for friend', () => {
      const state = createBaseSnapshot({ friendIds: [] });
      const resNonFriend = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_1',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_privacy_friends',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resNonFriend.ok, false);
      assert.equal(resNonFriend.reason, 'privacy_friends_only');
      assert.equal(resNonFriend.result?.publicMessage, PUBLIC_JOIN_FAILURE);
      // Q25: target failure appends to log
      assert.equal(resNonFriend.patch?.inviteSendLog?.length, 1);
      assert.equal(resNonFriend.patch?.inviteSendLog?.[0].targetId, 'user_privacy_friends');

      // Now add to friendIds -> send succeeds
      const stateWithFriend = createBaseSnapshot({ friendIds: ['user_privacy_friends'] });
      const resFriend = applySquadSocialAction(
        stateWithFriend,
        {
          type: 'sendInvite',
          id: 'inv_2',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_privacy_friends',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resFriend.ok, true);
      assert.equal(resFriend.patch?.squadInvites?.length, 1);
    });

    it('target with discoverableByCode=false fails when source="code"; succeeds when source="friend"', () => {
      const state = createBaseSnapshot({ friendIds: ['user_hidden_code'] });

      // Via code search -> blocked by discoverableByCode switch
      const resCode = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_code',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_hidden_code',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resCode.ok, false);
      assert.equal(resCode.reason, 'code_hidden');
      assert.equal(resCode.result?.publicMessage, PUBLIC_JOIN_FAILURE);
      assert.equal(resCode.patch?.inviteSendLog?.length, 1);

      // Via friend list -> succeeds
      const resFriend = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_friend',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_hidden_code',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resFriend.ok, true);
    });
  });

  describe('2. Minor Protection Rules (資安建議 2)', () => {
    it('minor sender (devMinorTestAccount=true) cannot invite non-friends; can invite friends', () => {
      const state = createBaseSnapshot({
        devMinorTestAccount: true,
        friendIds: ['friend_alice'],
      });

      // Try inviting non-friend stranger
      const resNonFriend = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_m1',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_normal_adult',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resNonFriend.ok, false);
      assert.equal(resNonFriend.reason, 'minor_sender_non_friend');
      assert.equal(resNonFriend.result?.publicMessage, PUBLIC_JOIN_FAILURE);
      // Q25: counted in log
      assert.equal(resNonFriend.patch?.inviteSendLog?.length, 1);

      // Invite friend Alice -> succeeds
      const resFriend = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_m2',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_alice',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resFriend.ok, true);
    });

    it('minor receiver: incoming invite fails unless sender is actually in friendIds (even if source was claimed "friend")', () => {
      const minorPlayerState = createBaseSnapshot({
        devMinorTestAccount: true,
        friendIds: ['friend_real'],
      });

      // Stranger claims source: 'friend'
      const resSpoofed = applySquadSocialAction(
        minorPlayerState,
        {
          type: 'sendInvite',
          id: 'inv_in1',
          fromId: 'stranger_attacker',
          toId: DEMO_PLAYER_ID,
          squadId: 'squad_beta',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resSpoofed.ok, false);
      assert.equal(resSpoofed.reason, 'minor_blocked');
      assert.equal(resSpoofed.result?.publicMessage, PUBLIC_JOIN_FAILURE);

      // Real friend sender
      const resRealFriend = applySquadSocialAction(
        minorPlayerState,
        {
          type: 'sendInvite',
          id: 'inv_in2',
          fromId: 'friend_real',
          toId: DEMO_PLAYER_ID,
          squadId: 'squad_beta',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(resRealFriend.ok, true);
    });

    it('squad with a minor member blocks invite and join request from non-friends', () => {
      // Squad contains minor member
      const stateWithMinorMember = createBaseSnapshot({
        squadMembers: [
          {
            id: 'minor_member_1',
            nameZh: '小明',
            roleType: 'phy',
            roleBadgeZh: '',
            gearDescZh: '',
            hasWorkedOutToday: true,
            workoutAuditZh: '',
            damageDealt: 0,
            nudgedCount: 0,
            isMinor: true,
          },
        ],
        friendIds: ['friend_alice'],
      });

      // Invite non-friend to this squad -> fails
      const resInvite = applySquadSocialAction(
        stateWithMinorMember,
        {
          type: 'sendInvite',
          id: 'inv_sm1',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_normal_adult',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(resInvite.ok, false);
      assert.equal(resInvite.reason, 'squad_has_minor');
      assert.equal(resInvite.result?.publicMessage, PUBLIC_JOIN_FAILURE);
      assert.equal(resInvite.patch?.inviteSendLog?.length, 1);

      // Non-friend sends join request to this squad -> fails
      const resRequest = applySquadSocialAction(
        stateWithMinorMember,
        {
          type: 'sendJoinRequest',
          id: 'req_sm1',
          fromId: 'stranger_bob',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(resRequest.ok, false);
      assert.equal(resRequest.reason, 'squad_has_minor');
      assert.equal(resRequest.result?.publicMessage, PUBLIC_JOIN_FAILURE);
    });
  });

  describe('3. Rate Limits (SOCIAL_RATE_LIMITS.squadInvite)', () => {
    it('20th send in a day succeeds, 21st fails with DAILY_INVITE_CAP_REACHED_MESSAGE', () => {
      const log = Array.from({ length: 19 }, (_, i) => ({
        targetId: `friend_${i}`,
        sentAt: BASE_TIME - i * 1000,
        outcome: 'friend',
      }));

      const state = createBaseSnapshot({
        friendIds: ['friend_20', 'friend_21'],
        inviteSendLog: log,
      });

      // 20th send
      const res20 = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_20',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_20',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(res20.ok, true);

      // Updated state with 20 items in log
      const updatedLog = res20.patch?.inviteSendLog || [];
      assert.equal(updatedLog.length, 20);
      const state20 = createBaseSnapshot({
        friendIds: ['friend_20', 'friend_21'],
        inviteSendLog: updatedLog,
      });

      // 21st send fails at sender level (no log addition)
      const res21 = applySquadSocialAction(
        state20,
        {
          type: 'sendInvite',
          id: 'inv_21',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_21',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(res21.ok, false);
      assert.equal(res21.reason, 'daily_cap_reached');
      assert.equal(res21.result?.publicMessage, DAILY_INVITE_CAP_REACHED_MESSAGE);
      assert.equal(res21.patch?.inviteSendLog, undefined);
    });

    it('10th non-friend send in a day succeeds, 11th non-friend fails; 11th send to a friend succeeds', () => {
      const log = Array.from({ length: 9 }, (_, i) => ({
        targetId: `stranger_${i}`,
        sentAt: BASE_TIME - i * 1000,
        outcome: 'non_friend',
      }));

      const state = createBaseSnapshot({
        friendIds: ['friend_charlie'],
        inviteSendLog: log,
      });

      // 10th non-friend send
      const res10 = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_nf_10',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_normal_adult',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(res10.ok, true);

      const state10 = createBaseSnapshot({
        friendIds: ['friend_charlie'],
        inviteSendLog: res10.patch?.inviteSendLog,
      });

      // 11th non-friend send fails
      const res11NonFriend = applySquadSocialAction(
        state10,
        {
          type: 'sendInvite',
          id: 'inv_nf_11',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_another_stranger',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(res11NonFriend.ok, false);
      assert.equal(res11NonFriend.reason, 'non_friend_daily_cap_reached');
      assert.equal(res11NonFriend.result?.publicMessage, DAILY_INVITE_CAP_REACHED_MESSAGE);

      // But 11th send to friend succeeds!
      const res11Friend = applySquadSocialAction(
        state10,
        {
          type: 'sendInvite',
          id: 'inv_f_11',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_charlie',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(res11Friend.ok, true);
    });

    it('per-person cooldown: declined / expired / cancelled invite sets 72h cooldown; send at 72h + 1ms succeeds', () => {
      const cooldownMs = SOCIAL_RATE_LIMITS.squadInvite.perPersonCooldownMs; // 72h
      const pastTime = BASE_TIME;

      const stateWithDeclined = createBaseSnapshot({
        squadInvites: [
          {
            id: 'inv_dec',
            kind: 'invite',
            status: 'declined',
            fromId: DEMO_PLAYER_ID,
            toId: 'friend_alice',
            targetId: 'friend_alice',
            squadId: 'squad_alpha',
            squadName: '阿爾法戰隊',
            source: 'friend',
            notificationId: null,
            createdAt: pastTime - 1000,
            expiresAt: pastTime, // Event happened at pastTime
          },
        ],
      });

      // 1 hour after decline (within 72h) -> cooldown active
      const resWithinCooldown = applySquadSocialAction(
        stateWithDeclined,
        {
          type: 'sendInvite',
          id: 'inv_retry1',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_alice',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        pastTime + 3600 * 1000,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(resWithinCooldown.ok, false);
      assert.equal(resWithinCooldown.reason, 'cooldown');
      assert.equal(resWithinCooldown.result?.publicMessage, COOLDOWN_MESSAGE);

      // Exactly at 72h + 1ms -> cooldown expired, succeeds!
      const resAfterCooldown = applySquadSocialAction(
        stateWithDeclined,
        {
          type: 'sendInvite',
          id: 'inv_retry2',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_alice',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        pastTime + cooldownMs + 1,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(resAfterCooldown.ok, true);
    });

    it('per-person 7-day cap: 3rd send within 7 days succeeds, 4th fails with PUBLIC_JOIN_FAILURE', () => {
      const log = [
        { targetId: 'friend_alice', sentAt: BASE_TIME - 1000, outcome: 'friend' },
        { targetId: 'friend_alice', sentAt: BASE_TIME - 2000, outcome: 'friend' },
      ];

      const state = createBaseSnapshot({
        friendIds: ['friend_alice'],
        inviteSendLog: log,
      });

      // 3rd send within 7 days succeeds
      const res3 = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_3',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_alice',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(res3.ok, true);

      // 4th send within 7 days fails
      const state3 = createBaseSnapshot({
        friendIds: ['friend_alice'],
        inviteSendLog: res3.patch?.inviteSendLog,
      });
      const res4 = applySquadSocialAction(
        state3,
        {
          type: 'sendInvite',
          id: 'inv_4',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_alice',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(res4.ok, false);
      assert.equal(res4.reason, '7day_limit_reached');
      assert.equal(res4.result?.publicMessage, PUBLIC_JOIN_FAILURE);
    });

    it('outgoing pending invites cannot exceed open slots (no_open_slot_for_invite)', () => {
      // Squad has leader + 2 members -> count = 3, openSlots = 1
      const state = createBaseSnapshot({
        squadMembers: [
          { id: 'm1', nameZh: 'M1', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 },
          { id: 'm2', nameZh: 'M2', roleType: 'mag', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 },
        ],
        squadInvites: [
          {
            id: 'inv_pending_1',
            kind: 'invite',
            status: 'pending',
            fromId: DEMO_PLAYER_ID,
            toId: 'friend_bob',
            targetId: 'friend_bob',
            squadId: 'squad_alpha',
            squadName: '阿爾法戰隊',
            source: 'friend',
            notificationId: null,
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
        ],
        friendIds: ['friend_alice', 'friend_bob'],
      });

      // Open slots = 1, and 1 pending outgoing already exists -> fails with no_open_slot_for_invite
      const res = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_overflow',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_alice',
          squadId: 'squad_alpha',
          source: 'friend',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );

      assert.equal(res.ok, false);
      assert.equal(res.reason, 'no_open_slot_for_invite');
      assert.equal(res.result?.publicMessage, PUBLIC_JOIN_FAILURE);
      // Sender-side failure -> does NOT append to log
      assert.equal(res.patch?.inviteSendLog, undefined);
    });
  });

  describe('4. Q25 Always-Tappable & Counted Target Failures', () => {
    it('target-side failures (blocked, privacy, minor) increment inviteSendLog and return patch with log', () => {
      const state = createBaseSnapshot({
        friendIds: [],
        blockedIds: ['user_blocked_local'],
      });

      // 1. Blocked target
      const resBlocked = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_b',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_blocked_local',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(resBlocked.ok, false);
      assert.equal(resBlocked.reason, 'blocked');
      assert.equal(resBlocked.patch?.inviteSendLog?.length, 1);
      assert.equal(resBlocked.patch?.inviteSendLog?.[0].targetId, 'user_blocked_local');

      // 2. Blocked by target (blockedYou in directory)
      const resBlockedYou = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_by',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_blocked_you',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(resBlockedYou.ok, false);
      assert.equal(resBlockedYou.reason, 'blocked');
      assert.equal(resBlockedYou.patch?.inviteSendLog?.length, 1);

      // 3. Target is minor stranger
      const resMinor = applySquadSocialAction(
        state,
        {
          type: 'sendInvite',
          id: 'inv_tm',
          fromId: DEMO_PLAYER_ID,
          toId: 'user_minor_target',
          squadId: 'squad_alpha',
          source: 'code',
        },
        BASE_TIME,
        mockFakeSquads,
        mockDirectory
      );
      assert.equal(resMinor.ok, false);
      assert.equal(resMinor.reason, 'target_minor_non_friend');
      assert.equal(resMinor.patch?.inviteSendLog?.length, 1);
    });

    it('getSquadInviteRowState returns "can_invite" for target-side error targets and only pre-disables sender-side states', () => {
      const state = createBaseSnapshot({
        friendIds: [],
        blockedIds: ['user_blocked_local'],
      });

      // Target is blocked or privacy-friends -> getSquadInviteRowState STILL returns 'can_invite'! (Q25)
      assert.equal(getSquadInviteRowState(state, 'user_blocked_local', BASE_TIME), 'can_invite');
      assert.equal(getSquadInviteRowState(state, 'user_privacy_friends', BASE_TIME), 'can_invite');
      assert.equal(getSquadInviteRowState(state, 'user_minor_target', BASE_TIME), 'can_invite');

      // But sender-side states ARE disabled:
      // a. Already member -> in_squad
      const stateWithMember = createBaseSnapshot({
        squadMembers: [{ id: 'friend_m1', nameZh: 'M1', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 }],
      });
      assert.equal(getSquadInviteRowState(stateWithMember, 'friend_m1', BASE_TIME), 'in_squad');

      // b. Pending invite -> pending
      const stateWithPending = createBaseSnapshot({
        squadInvites: [
          {
            id: 'inv_p',
            kind: 'invite',
            status: 'pending',
            fromId: DEMO_PLAYER_ID,
            toId: 'target_p',
            targetId: 'target_p',
            squadId: 'squad_alpha',
            squadName: '阿爾法戰隊',
            source: 'code',
            notificationId: null,
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
        ],
      });
      assert.equal(getSquadInviteRowState(stateWithPending, 'target_p', BASE_TIME), 'pending');

      // c. In cooldown -> cooldown
      const stateWithCooldown = createBaseSnapshot({
        squadInvites: [
          {
            id: 'inv_c',
            kind: 'invite',
            status: 'declined',
            fromId: DEMO_PLAYER_ID,
            toId: 'target_c',
            targetId: 'target_c',
            squadId: 'squad_alpha',
            squadName: '阿爾法戰隊',
            source: 'code',
            notificationId: null,
            createdAt: BASE_TIME - 1000,
            expiresAt: BASE_TIME - 500,
          },
        ],
      });
      assert.equal(getSquadInviteRowState(stateWithCooldown, 'target_c', BASE_TIME), 'cooldown');

      // d. Daily cap reached -> daily_limit
      const stateDailyCap = createBaseSnapshot({
        inviteSendLog: Array.from({ length: 20 }, (_, i) => ({
          targetId: `user_${i}`,
          sentAt: BASE_TIME - i * 1000,
          outcome: 'friend',
        })),
      });
      assert.equal(getSquadInviteRowState(stateDailyCap, 'user_target', BASE_TIME), 'daily_limit');
    });
  });

  describe('5. Atomic Switch (applyAcceptInviteFromNotification)', () => {
    it('in-squad player (with teammates) leaves old squad via D4 rules and joins target squad in ONE atomic patch', () => {
      const state = createBaseSnapshot({
        isSquadLeader: true,
        squadName: '舊戰隊',
        squadMembers: [
          { id: 'teammate_1', nameZh: '舊隊友1', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 },
          { id: 'teammate_2', nameZh: '舊隊友2', roleType: 'mag', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 },
        ],
        squadJoinOrder: [DEMO_PLAYER_ID, 'teammate_1', 'teammate_2'],
        squadInvites: [
          {
            id: 'inv_old_outgoing',
            kind: 'invite',
            status: 'pending',
            fromId: DEMO_PLAYER_ID,
            toId: 'friend_bob',
            targetId: 'friend_bob',
            squadId: 'squad_alpha',
            squadName: '舊戰隊',
            source: 'friend',
            notificationId: null,
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
          {
            id: 'inv_target_incoming',
            kind: 'invite',
            status: 'pending',
            fromId: 'leader_beta',
            toId: DEMO_PLAYER_ID,
            targetId: DEMO_PLAYER_ID,
            squadId: 'squad_beta',
            squadName: '貝塔力量隊',
            source: 'friend',
            notificationId: 'notif_beta_1',
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
        ],
        notifications: [
          {
            id: 'notif_beta_1',
            type: 'squad_invite',
            refId: 'inv_target_incoming',
            squadName: '貝塔力量隊',
            createdAt: BASE_TIME,
            status: 'pending',
          },
          {
            id: 'notif_other_invite',
            type: 'squad_invite',
            refId: 'inv_other',
            squadName: '其他隊伍',
            createdAt: BASE_TIME,
            status: 'pending',
          },
        ],
      });

      // Preview confirms 5b
      const preview = previewSwitchSquadFromInvite(state, 'notif_beta_1', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(preview.kind, 'confirm_5b');
      assert.equal(preview.targetSquadName, '貝塔力量隊');
      assert.equal(preview.successorName, '舊隊友1');
      assert.ok(preview.confirmBody?.includes('舊隊友1 會成為隊長'));

      // Apply switch
      const res = applyAcceptInviteFromNotification(state, 'notif_beta_1', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(res.ok, true);
      assert.equal(res.result?.type, 'joined');
      assert.equal(res.patch?.currentSquadId, 'squad_beta');
      assert.equal(res.patch?.squadName, '貝塔力量隊');
      assert.equal(res.patch?.isSquadLeader, false);

      // Old squad members were recorded into recentTeammates (D4 rule)
      assert.ok(res.patch?.recentTeammates?.some((r) => r.id === 'teammate_1'));
      assert.ok(res.patch?.recentTeammates?.some((r) => r.id === 'teammate_2'));

      // Target squad members in squadMembers
      assert.equal(res.patch?.squadMembers?.length, 1);
      assert.equal(res.patch?.squadMembers?.[0].id, 'member_b1');

      // Old outgoing invite cancelled
      const oldInv = res.patch?.squadInvites?.find((i) => i.id === 'inv_old_outgoing');
      assert.equal(oldInv?.status, 'cancelled');

      // Accepted invite accepted
      const acceptedInv = res.patch?.squadInvites?.find((i) => i.id === 'inv_target_incoming');
      assert.equal(acceptedInv?.status, 'accepted');

      // Other pending squad_invite notification marked invalid
      const otherNotif = res.patch?.notifications?.find((n) => n.id === 'notif_other_invite');
      assert.equal(otherNotif?.status, 'invalid');

      // Accepted notification marked accepted
      const acceptedNotif = res.patch?.notifications?.find((n) => n.id === 'notif_beta_1');
      assert.equal(acceptedNotif?.status, 'accepted');
    });

    it('empty squad (1/4) with 0 pending invites joins directly without confirm modal', () => {
      const state = createBaseSnapshot({
        squadMembers: [],
        squadInvites: [
          {
            id: 'inv_beta',
            kind: 'invite',
            status: 'pending',
            fromId: 'leader_beta',
            toId: DEMO_PLAYER_ID,
            targetId: DEMO_PLAYER_ID,
            squadId: 'squad_beta',
            squadName: '貝塔力量隊',
            source: 'friend',
            notificationId: 'notif_beta',
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
        ],
        notifications: [
          {
            id: 'notif_beta',
            type: 'squad_invite',
            refId: 'inv_beta',
            squadName: '貝塔力量隊',
            createdAt: BASE_TIME,
            status: 'pending',
          },
        ],
      });

      // Preview returns join_immediately
      const preview = previewSwitchSquadFromInvite(state, 'notif_beta', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(preview.kind, 'join_immediately');

      // Apply switch directly
      const res = applyAcceptInviteFromNotification(state, 'notif_beta', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(res.ok, true);
      assert.equal(res.patch?.currentSquadId, 'squad_beta');
    });

    it('empty squad (1/4) with pending outgoing invites returns 5c light confirm with cancelled count', () => {
      const state = createBaseSnapshot({
        squadMembers: [],
        squadInvites: [
          {
            id: 'inv_outgoing_1',
            kind: 'invite',
            status: 'pending',
            fromId: DEMO_PLAYER_ID,
            toId: 'friend_a',
            targetId: 'friend_a',
            squadId: 'squad_alpha',
            squadName: '阿爾法戰隊',
            source: 'friend',
            notificationId: null,
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
          {
            id: 'inv_outgoing_2',
            kind: 'invite',
            status: 'pending',
            fromId: DEMO_PLAYER_ID,
            toId: 'friend_b',
            targetId: 'friend_b',
            squadId: 'squad_alpha',
            squadName: '阿爾法戰隊',
            source: 'friend',
            notificationId: null,
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
          {
            id: 'inv_incoming',
            kind: 'invite',
            status: 'pending',
            fromId: 'leader_beta',
            toId: DEMO_PLAYER_ID,
            targetId: DEMO_PLAYER_ID,
            squadId: 'squad_beta',
            squadName: '貝塔力量隊',
            source: 'friend',
            notificationId: 'notif_beta',
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
        ],
        notifications: [
          {
            id: 'notif_beta',
            type: 'squad_invite',
            refId: 'inv_incoming',
            squadName: '貝塔力量隊',
            createdAt: BASE_TIME,
            status: 'pending',
          },
        ],
      });

      const preview = previewSwitchSquadFromInvite(state, 'notif_beta', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(preview.kind, 'confirm_5c');
      assert.equal(preview.pendingInvitesCount, 2);
      assert.ok(preview.confirmBody?.includes('你送出的 2 個組隊邀請都會取消'));
    });

    it('boss reward gate: preview stacks exact claimed note when bossRewardClaimedWeekKey === current week key; omits when not claimed', () => {
      const currentWeekKey = getBossRewardWeekKey(BASE_TIME);

      // 1. Claimed in current week
      const stateClaimed = createBaseSnapshot({
        squadMembers: [{ id: 'tm1', nameZh: 'TM1', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 }],
        bossRewardClaimedWeekKey: currentWeekKey,
        notifications: [
          {
            id: 'notif_b',
            type: 'squad_invite',
            squadName: '貝塔力量隊',
            createdAt: BASE_TIME,
            status: 'pending',
          },
        ],
      });
      const previewClaimed = previewSwitchSquadFromInvite(stateClaimed, 'notif_b', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(previewClaimed.alreadyClaimedThisWeek, true);
      assert.equal(previewClaimed.claimedNote, BOSS_REWARD_ALREADY_CLAIMED_NOTE);

      // 2. Not claimed
      const stateUnclaimed = createBaseSnapshot({
        squadMembers: [{ id: 'tm1', nameZh: 'TM1', roleType: 'phy', roleBadgeZh: '', gearDescZh: '', hasWorkedOutToday: true, workoutAuditZh: '', damageDealt: 0, nudgedCount: 0 }],
        bossRewardClaimedWeekKey: null,
        notifications: [
          {
            id: 'notif_b',
            type: 'squad_invite',
            squadName: '貝塔力量隊',
            createdAt: BASE_TIME,
            status: 'pending',
          },
        ],
      });
      const previewUnclaimed = previewSwitchSquadFromInvite(stateUnclaimed, 'notif_b', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(previewUnclaimed.alreadyClaimedThisWeek, false);
      assert.equal(previewUnclaimed.claimedNote, undefined);
    });

    it('expired invite: does not switch squad; marks notification expired', () => {
      const state = createBaseSnapshot({
        squadInvites: [
          {
            id: 'inv_exp',
            kind: 'invite',
            status: 'pending',
            fromId: 'leader_beta',
            toId: DEMO_PLAYER_ID,
            targetId: DEMO_PLAYER_ID,
            squadId: 'squad_beta',
            squadName: '貝塔力量隊',
            source: 'friend',
            notificationId: 'notif_exp',
            createdAt: BASE_TIME - 100000,
            expiresAt: BASE_TIME - 10, // Expired
          },
        ],
        notifications: [
          {
            id: 'notif_exp',
            type: 'squad_invite',
            refId: 'inv_exp',
            squadName: '貝塔力量隊',
            createdAt: BASE_TIME - 100000,
            expiresAt: BASE_TIME - 10,
            status: 'pending',
          },
        ],
      });

      const res = applyAcceptInviteFromNotification(state, 'notif_exp', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(res.ok, false);
      assert.equal(res.reason, 'expired');
      assert.equal(res.result?.publicMessage, '這個邀請已過期');
      // Did NOT change squad
      assert.equal(res.patch?.currentSquadId, undefined);
      // Marked notification expired
      const notif = res.patch?.notifications?.find((n) => n.id === 'notif_exp');
      assert.equal(notif?.status, 'expired');
    });

    it('invalid invite (target squad full): does not switch squad; marks notification invalid with neutral copy', () => {
      const state = createBaseSnapshot({
        squadInvites: [
          {
            id: 'inv_gamma',
            kind: 'invite',
            status: 'pending',
            fromId: 'leader_gamma',
            toId: DEMO_PLAYER_ID,
            targetId: DEMO_PLAYER_ID,
            squadId: 'squad_full_gamma',
            squadName: '伽瑪滿員隊',
            source: 'friend',
            notificationId: 'notif_gamma',
            createdAt: BASE_TIME,
            expiresAt: BASE_TIME + 86400000,
          },
        ],
        notifications: [
          {
            id: 'notif_gamma',
            type: 'squad_invite',
            refId: 'inv_gamma',
            squadName: '伽瑪滿員隊',
            createdAt: BASE_TIME,
            status: 'pending',
          },
        ],
      });

      const res = applyAcceptInviteFromNotification(state, 'notif_gamma', BASE_TIME, mockFakeSquads, mockDirectory);
      assert.equal(res.ok, false);
      assert.equal(res.reason, 'rejected');
      assert.equal(res.result?.publicMessage, '這個邀請已失效');
      // Did NOT change squad
      assert.equal(res.patch?.currentSquadId, undefined);
      // Marked notification invalid
      const notif = res.patch?.notifications?.find((n) => n.id === 'notif_gamma');
      assert.equal(notif?.status, 'invalid');
    });
  });
});