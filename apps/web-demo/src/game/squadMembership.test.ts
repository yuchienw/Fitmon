import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applySquadMembershipAction,
  previewLeaveSquad,
  getEarliestSuccessor,
  upsertRecentTeammates,
  YOU_LEFT_SQUAD_MESSAGE,
  LEAVE_TRANSFER_CONFIRM,
  LEAVE_DISBAND_CONFIRM,
  LEAVE_MEMBER_CONFIRM,
  BOSS_REWARD_ALREADY_CLAIMED_NOTE,
  DEFAULT_EMPTY_SQUAD_NAME,
  KICKED_MEMBER_LEFT_TOAST,
  RECENT_TEAMMATES_TTL_MS,
  type SquadMembershipStateSnapshot,
} from './squadMembershipRules.ts';

import {
  bossAttack,
  getBossRewardWeekKey,
  hasClaimedSquadBossRewardThisWeek,
  getSquadBossMaxHp,
  type BossAttackStateSnapshot,
} from './economyRules.ts';

import {
  SQUAD_CANDIDATE_POOL,
  DEMO_PLAYER_ID,
  type SquadMemberState,
  type SquadInviteItem,
} from './squadInviteRules.ts';

import { ADVENTURE_BOSS_CATALOG } from '../config/catalogConfig.ts';
import { getBossClearBounty } from '../config/economy.ts';

// Helper to create sample members
function createMockMembers(): SquadMemberState[] {
  return [
    {
      id: 'friend_akai',
      nameZh: '阿凱',
      roleType: 'phy',
      roleBadgeZh: '🥊 重訓',
      gearDescZh: '金槓',
      hasWorkedOutToday: true,
      workoutAuditZh: '胸背 38m',
      damageDealt: 650,
      nudgedCount: 0,
    },
    {
      id: 'friend_leo',
      nameZh: 'Leo',
      roleType: 'support',
      roleBadgeZh: '💚 輔助',
      gearDescZh: '腰帶',
      hasWorkedOutToday: true,
      workoutAuditZh: '深蹲 45m',
      damageDealt: 400,
      nudgedCount: 0,
    },
    {
      id: 'friend_alice',
      nameZh: '小愛',
      roleType: 'mag',
      roleBadgeZh: '🪄 有氧',
      gearDescZh: '跑鞋',
      hasWorkedOutToday: false,
      workoutAuditZh: '休息中',
      damageDealt: 200,
      nudgedCount: 1,
    },
  ];
}

function createBaseState(overrides: Partial<SquadMembershipStateSnapshot> = {}): SquadMembershipStateSnapshot {
  return {
    playerId: DEMO_PLAYER_ID,
    currentSquadId: 'squad_alpha',
    isSquadLeader: true,
    squadName: '阿特拉斯健力隊',
    squadMembers: createMockMembers(),
    squadInvites: [],
    squadJoinOrder: [DEMO_PLAYER_ID, 'friend_akai', 'friend_leo', 'friend_alice'],
    recentTeammates: [],
    notifications: [],
    squadStage: 2,
    squadBossHp: 300, // damaged HP in mid-fight
    bossRewardClaimedWeekKey: null,
    ...overrides,
  };
}

describe('FitMon Squad Membership Rules (T3-D4)', () => {
  const baseNow = 1763637168000; // 2025-11-20 approx

  describe('1. Leader leaving with members', () => {
    it('picks earliest joiner per squadJoinOrder (distinct from array order) and resets player to empty squad', () => {
      // In members array, order is: akai, leo, alice.
      // Set squadJoinOrder so leo joined before akai!
      const members = createMockMembers();
      const state = createBaseState({
        squadMembers: members,
        squadJoinOrder: [DEMO_PLAYER_ID, 'friend_leo', 'friend_akai', 'friend_alice'],
        squadStage: 2,
        squadBossHp: 250,
      });

      const res = applySquadMembershipAction(
        state,
        { type: 'leave', actorId: DEMO_PLAYER_ID, newSquadId: 'squad_custom_new' },
        baseNow
      );

      assert.equal(res.ok, true);
      assert.equal(res.result?.type, 'leave');
      assert.equal(res.result?.successorId, 'friend_leo');
      assert.equal(res.result?.successorName, 'Leo');
      assert.equal(res.result?.toastMessage, YOU_LEFT_SQUAD_MESSAGE);

      const patch = res.patch!;
      assert.equal(patch.currentSquadId, 'squad_custom_new');
      assert.equal(patch.isSquadLeader, true);
      assert.equal(patch.squadName, DEFAULT_EMPTY_SQUAD_NAME);
      assert.deepEqual(patch.squadMembers, []);
      assert.deepEqual(patch.squadJoinOrder, [DEMO_PLAYER_ID]);
      assert.equal(patch.squadStage, 2);

      const fullHpStage2 = getSquadBossMaxHp(2);
      assert.equal(patch.squadBossHp, fullHpStage2);
      assert.ok(patch.squadBossHp > 250);

      // Verify personal stats are NOT modified in patch
      const patchAny = patch as Record<string, unknown>;
      assert.equal(patchAny.coins, undefined);
      assert.equal(patchAny.exp, undefined);
      assert.equal(patchAny.level, undefined);
      assert.equal(patchAny.soloStage, undefined);
      assert.equal(patchAny.soloBossHp, undefined);

      // Verify recentTeammates includes former teammates and excludes self
      assert.ok(patch.recentTeammates);
      const recentIds = patch.recentTeammates.map((t) => t.id).sort();
      assert.deepEqual(recentIds, ['friend_akai', 'friend_alice', 'friend_leo']);
      assert.ok(!recentIds.includes(DEMO_PLAYER_ID));
    });
  });

  describe('2. Solo leader leave', () => {
    it('expires pending squad invites/requests and creates new empty squad', () => {
      const pendingInvites: SquadInviteItem[] = [
        {
          id: 'inv_1',
          kind: 'invite',
          status: 'pending',
          fromId: DEMO_PLAYER_ID,
          toId: 'friend_mika',
          squadId: 'squad_solo',
          squadName: '個人隊',
          createdAt: baseNow - 1000,
          expiresAt: baseNow + 86400000,
          targetId: 'friend_mika',
          source: 'friend',
          notificationId: null,
        },
        {
          id: 'inv_other',
          kind: 'invite',
          status: 'pending',
          fromId: 'stranger_1',
          toId: DEMO_PLAYER_ID,
          squadId: 'squad_other',
          squadName: '他隊',
          createdAt: baseNow - 1000,
          expiresAt: baseNow + 86400000,
          targetId: DEMO_PLAYER_ID,
          source: 'link',
          notificationId: null,
        },
      ];

      const state = createBaseState({
        currentSquadId: 'squad_solo',
        squadMembers: [],
        squadJoinOrder: [DEMO_PLAYER_ID],
        squadInvites: pendingInvites,
        notifications: [],
      });

      const res = applySquadMembershipAction(
        state,
        { type: 'leave', actorId: DEMO_PLAYER_ID, newSquadId: 'squad_after_disband' },
        baseNow
      );

      assert.equal(res.ok, true);
      assert.equal(res.result?.type, 'disband');
      assert.equal(res.result?.toastMessage, YOU_LEFT_SQUAD_MESSAGE);

      const patch = res.patch!;
      assert.equal(patch.currentSquadId, 'squad_after_disband');
      assert.equal(patch.isSquadLeader, true);
      assert.deepEqual(patch.squadMembers, []);

      // inv_1 for squad_solo should be expired; inv_other unaffected
      const inv1 = patch.squadInvites?.find((i) => i.id === 'inv_1');
      assert.equal(inv1?.status, 'expired');
      const invOther = patch.squadInvites?.find((i) => i.id === 'inv_other');
      assert.equal(invOther?.status, 'pending');

      // Notifications should have a disband notification appended
      const disbandNotif = patch.notifications?.find((n) => n.refId === 'disband');
      assert.ok(disbandNotif);
      assert.equal(disbandNotif?.type, 'squad_change');
    });
  });

  describe('3. Kick rules & neutral copy', () => {
    it('rejects non-leader kick and self-kick', () => {
      const nonLeaderState = createBaseState({ isSquadLeader: false });
      const res1 = applySquadMembershipAction(
        nonLeaderState,
        { type: 'kick', actorId: DEMO_PLAYER_ID, memberId: 'friend_akai' },
        baseNow
      );
      assert.equal(res1.ok, false);
      assert.equal(res1.reason, 'not_leader');

      const leaderState = createBaseState({ isSquadLeader: true });
      const res2 = applySquadMembershipAction(
        leaderState,
        { type: 'kick', actorId: DEMO_PLAYER_ID, memberId: DEMO_PLAYER_ID },
        baseNow
      );
      assert.equal(res2.ok, false);
      assert.equal(res2.reason, 'self');
    });

    it('leader removes a member: updates members, join order, recent teammates, and uses neutral toast', () => {
      const state = createBaseState({
        squadJoinOrder: [DEMO_PLAYER_ID, 'friend_akai', 'friend_leo', 'friend_alice'],
      });

      const res = applySquadMembershipAction(
        state,
        { type: 'kick', actorId: DEMO_PLAYER_ID, memberId: 'friend_leo' },
        baseNow
      );

      assert.equal(res.ok, true);
      assert.equal(res.result?.type, 'kick');
      const toast = res.result?.toastMessage || '';
      assert.equal(toast, KICKED_MEMBER_LEFT_TOAST('Leo'));
      assert.equal(toast, 'Leo 已離開這支隊伍');

      // Security requirement: copy must NEVER contain blame/punishment words
      assert.ok(!toast.includes('被踢'));
      assert.ok(!toast.includes('移出戰隊'));
      assert.ok(!toast.includes('招募'));
      assert.ok(!toast.includes('處罰'));

      const patch = res.patch!;
      assert.equal(patch.squadMembers?.some((m) => m.id === 'friend_leo'), false);
      assert.deepEqual(patch.squadJoinOrder, [DEMO_PLAYER_ID, 'friend_akai', 'friend_alice']);
      assert.ok(patch.recentTeammates?.some((t) => t.id === 'friend_leo' && t.lastTogetherAt === baseNow));
    });

    it('when local player is kicked by fake leader: receives YOU_LEFT_SQUAD_MESSAGE and new empty squad', () => {
      const state = createBaseState({
        isSquadLeader: false,
        notifications: [],
      });

      const res = applySquadMembershipAction(
        state,
        {
          type: 'kick',
          actorId: 'fake_captain',
          memberId: DEMO_PLAYER_ID,
          newSquadId: 'squad_kicked_res',
        },
        baseNow
      );

      assert.equal(res.ok, true);
      assert.equal(res.result?.type, 'kick');
      assert.equal(res.result?.toastMessage, YOU_LEFT_SQUAD_MESSAGE);
      assert.equal(res.result?.toastMessage, '你已離開這支隊伍');

      const patch = res.patch!;
      assert.equal(patch.currentSquadId, 'squad_kicked_res');
      assert.equal(patch.isSquadLeader, true);
      assert.deepEqual(patch.squadMembers, []);
      assert.deepEqual(patch.squadJoinOrder, [DEMO_PLAYER_ID]);

      const kickedNotif = patch.notifications?.find((n) => n.refId === 'kicked');
      assert.ok(kickedNotif);
      assert.equal(kickedNotif?.type, 'squad_change');
    });
  });

  describe('4. Transfer (standalone)', () => {
    it('sets earliest successor when toMemberId is omitted and player stays in squad as member', () => {
      const state = createBaseState({
        squadJoinOrder: [DEMO_PLAYER_ID, 'friend_alice', 'friend_akai', 'friend_leo'],
      });

      const res = applySquadMembershipAction(
        state,
        { type: 'transfer', actorId: DEMO_PLAYER_ID },
        baseNow
      );

      assert.equal(res.ok, true);
      assert.equal(res.result?.type, 'transfer');
      assert.equal(res.result?.successorId, 'friend_alice');
      assert.equal(res.result?.successorName, '小愛');
      assert.equal(res.patch?.isSquadLeader, false);
      // Player stays in the same squad
      assert.equal(res.patch?.currentSquadId, undefined);
    });

    it('transfers to explicit toMemberId', () => {
      const state = createBaseState();
      const res = applySquadMembershipAction(
        state,
        { type: 'transfer', actorId: DEMO_PLAYER_ID, toMemberId: 'friend_leo' },
        baseNow
      );

      assert.equal(res.ok, true);
      assert.equal(res.result?.successorId, 'friend_leo');
      assert.equal(res.result?.successorName, 'Leo');
      assert.equal(res.patch?.isSquadLeader, false);
    });
  });

  describe('5. Disband', () => {
    it('fails when squad still has members', () => {
      const state = createBaseState(); // has 3 members
      const res = applySquadMembershipAction(
        state,
        { type: 'disband', actorId: DEMO_PLAYER_ID },
        baseNow
      );

      assert.equal(res.ok, false);
      assert.equal(res.reason, 'not_solo');
    });

    it('succeeds when solo leader disbands', () => {
      const state = createBaseState({
        squadMembers: [],
        squadJoinOrder: [DEMO_PLAYER_ID],
      });

      const res = applySquadMembershipAction(
        state,
        { type: 'disband', actorId: DEMO_PLAYER_ID, newSquadId: 'squad_disbanded' },
        baseNow
      );

      assert.equal(res.ok, true);
      assert.equal(res.patch?.currentSquadId, 'squad_disbanded');
      assert.equal(res.patch?.isSquadLeader, true);
      assert.deepEqual(patchMembers(res.patch?.squadMembers), []);
    });
  });

  describe('6. Empty-squad guarantee across all 4 PM situations', () => {
    it('guarantees self-led 1/4 squad for Situation A (leader + members)', () => {
      const state = createBaseState();
      const res = applySquadMembershipAction(state, { type: 'leave', actorId: DEMO_PLAYER_ID }, baseNow);
      assert.equal(res.ok, true);
      assert.equal(res.patch?.isSquadLeader, true);
      assert.deepEqual(res.patch?.squadMembers, []);
      assert.deepEqual(res.patch?.squadJoinOrder, [DEMO_PLAYER_ID]);
      assert.equal(res.patch?.squadName, DEFAULT_EMPTY_SQUAD_NAME);
    });

    it('guarantees self-led 1/4 squad for Situation B (solo leader disband)', () => {
      const state = createBaseState({ squadMembers: [] });
      const res = applySquadMembershipAction(state, { type: 'leave', actorId: DEMO_PLAYER_ID }, baseNow);
      assert.equal(res.ok, true);
      assert.equal(res.patch?.isSquadLeader, true);
      assert.deepEqual(res.patch?.squadMembers, []);
      assert.deepEqual(res.patch?.squadJoinOrder, [DEMO_PLAYER_ID]);
    });

    it('guarantees self-led 1/4 squad for Situation C (member leave)', () => {
      const state = createBaseState({ isSquadLeader: false });
      const res = applySquadMembershipAction(state, { type: 'leave', actorId: DEMO_PLAYER_ID }, baseNow);
      assert.equal(res.ok, true);
      assert.equal(res.patch?.isSquadLeader, true);
      assert.deepEqual(res.patch?.squadMembers, []);
      assert.deepEqual(res.patch?.squadJoinOrder, [DEMO_PLAYER_ID]);
    });

    it('guarantees self-led 1/4 squad for Situation D (player kicked)', () => {
      const state = createBaseState({ isSquadLeader: false });
      const res = applySquadMembershipAction(
        state,
        { type: 'kick', actorId: 'fake_captain', memberId: DEMO_PLAYER_ID },
        baseNow
      );
      assert.equal(res.ok, true);
      assert.equal(res.patch?.isSquadLeader, true);
      assert.deepEqual(res.patch?.squadMembers, []);
      assert.deepEqual(res.patch?.squadJoinOrder, [DEMO_PLAYER_ID]);
    });
  });

  describe('7. Weekly Boss-defeat reward gate across squad switches', () => {
    function createBossAttackState(overrides: Partial<BossAttackStateSnapshot> = {}): BossAttackStateSnapshot {
      const today = '2026-11-20';
      return {
        lastCheckinDate: today,
        lastBossDate: null,
        checkinDayKeys: [today],
        joinDayKey: today,
        soloStage: 1,
        soloBossHp: 100,
        squadStage: 1,
        squadBossHp: 100, // low HP so single hit defeats
        equipped: { hair: '', face: '', top: '', bottom: '', accessory: '' } as any,
        quests: [],
        streakDays: 1,
        todaySportType: 'strength',
        activeTeamComboBuff: 'none',
        squadMembers: [],
        collectedBossLoots: [],
        devForceNextLootDrop: false,
        personalMaxStage: 1,
        squadMaxStage: 1,
        personalMaxDamage: 500,
        totalBossesDefeated: 0,
        totalFinalBlows: 0,
        totalStrikesCount: 0,
        totalDamageDealt: 0,
        coins: 1000,
        coinsEarnedToday: 0,
        coinsEarnedDayKey: today,
        doubleCoinUntil: 0,
        bossRewardClaimedWeekKey: null,
        ...overrides,
      };
    }

    it('first squad defeat grants bounty and sets week key; second defeat in same week gives 0 bounty; solo unaffected', () => {
      const fightTime = new Date('2026-11-20T14:00:00+08:00').getTime();
      const currentWeekKey = getBossRewardWeekKey(fightTime);

      // Fight 1: First squad defeat with unclaimed key
      const state1 = createBossAttackState({ bossRewardClaimedWeekKey: null });
      const res1 = bossAttack(state1, { mode: 'squad' }, fightTime);
      assert.equal(res1.ok, true);
      assert.equal(res1.result?.defeated, true);
      const bountyStage1 = getBossClearBounty(1);
      assert.equal(res1.result?.coinsGranted, bountyStage1);
      assert.equal(res1.patch?.coins, 1000 + bountyStage1);
      assert.equal(res1.patch?.bossRewardClaimedWeekKey, currentWeekKey);

      // Player switches squad in the same week (new squad, full HP, bossRewardClaimedWeekKey persisted)
      const state2 = createBossAttackState({
        coins: 1000 + bountyStage1,
        bossRewardClaimedWeekKey: currentWeekKey,
        squadBossHp: 100, // another damaged boss in new squad
      });

      // Fight 2: Defeating boss again in same week
      const res2 = bossAttack(state2, { mode: 'squad' }, fightTime + 3600000);
      assert.equal(res2.ok, true);
      assert.equal(res2.result?.defeated, true);
      // Bounty gate prevents double claiming!
      assert.equal(res2.result?.coinsGranted, 0);
      assert.equal(res2.patch?.coins, 1000 + bountyStage1); // no coins added
      assert.equal(res2.patch?.bossRewardClaimedWeekKey, undefined); // key unchanged

      // Fight 3: Solo boss defeat in the same week is completely unaffected by squad gate
      const state3 = createBossAttackState({
        coins: 1000 + bountyStage1,
        bossRewardClaimedWeekKey: currentWeekKey,
        soloBossHp: 100,
      });
      const res3 = bossAttack(state3, { mode: 'solo' }, fightTime + 7200000);
      assert.equal(res3.ok, true);
      assert.equal(res3.result?.defeated, true);
      assert.equal(res3.result?.coinsGranted, bountyStage1);
      assert.equal(res3.patch?.coins, 1000 + bountyStage1 + bountyStage1);
    });
  });

  describe('8. Week rollover allows a new claim', () => {
    it('grants bounty and updates week key when claimed in prior week', () => {
      // Prior week Monday: 2026-11-16
      const priorWeekKey = '2026-11-16';
      // New week Monday: 2026-11-23 10:00:00
      const nextMondayTime = new Date('2026-11-23T10:00:00+08:00').getTime();
      const nextMondayWeekKey = getBossRewardWeekKey(nextMondayTime);
      assert.equal(nextMondayWeekKey, '2026-11-23');

      assert.equal(hasClaimedSquadBossRewardThisWeek(priorWeekKey, nextMondayTime), false);

      const state = {
        lastCheckinDate: '2026-11-23',
        lastBossDate: null,
        checkinDayKeys: ['2026-11-23'],
        joinDayKey: '2026-11-16',
        soloStage: 1,
        soloBossHp: 100,
        squadStage: 2,
        squadBossHp: 100,
        equipped: { hair: '', face: '', top: '', bottom: '', accessory: '' } as any,
        quests: [],
        streakDays: 7,
        todaySportType: 'strength' as const,
        activeTeamComboBuff: 'none' as const,
        squadMembers: [],
        collectedBossLoots: [],
        devForceNextLootDrop: false,
        personalMaxStage: 2,
        squadMaxStage: 2,
        personalMaxDamage: 500,
        totalBossesDefeated: 1,
        totalFinalBlows: 1,
        totalStrikesCount: 1,
        totalDamageDealt: 500,
        coins: 1500,
        coinsEarnedToday: 0,
        coinsEarnedDayKey: '2026-11-23',
        doubleCoinUntil: 0,
        bossRewardClaimedWeekKey: priorWeekKey,
      };

      const res = bossAttack(state, { mode: 'squad' }, nextMondayTime);
      assert.equal(res.ok, true);
      assert.equal(res.result?.defeated, true);
      const bountyStage2 = getBossClearBounty(2);
      assert.equal(res.result?.coinsGranted, bountyStage2);
      assert.equal(res.patch?.coins, 1500 + bountyStage2);
      assert.equal(res.patch?.bossRewardClaimedWeekKey, '2026-11-23');
    });
  });

  describe('9. PreviewLeaveSquad helper', () => {
    const testNow = new Date('2026-11-20T12:00:00+08:00').getTime();
    const currentWeekKey = getBossRewardWeekKey(testNow);

    it('returns exact transfer confirm text for leader with members', () => {
      const state = createBaseState({
        isSquadLeader: true,
        squadMembers: createMockMembers(),
        squadJoinOrder: [DEMO_PLAYER_ID, 'friend_akai', 'friend_leo', 'friend_alice'],
        bossRewardClaimedWeekKey: null,
      });

      const preview = previewLeaveSquad(state, testNow);
      assert.equal(preview.kind, 'transfer');
      assert.equal(preview.successorName, '阿凱');
      assert.equal(preview.confirmText, LEAVE_TRANSFER_CONFIRM('阿凱'));
      assert.equal(preview.confirmText, '你離開後，阿凱 會成為隊長。確定離開？');
      assert.equal(preview.alreadyClaimedThisWeek, false);
      assert.equal(preview.claimedNote, undefined);
    });

    it('returns exact disband confirm text for solo leader', () => {
      const state = createBaseState({
        isSquadLeader: true,
        squadMembers: [],
        bossRewardClaimedWeekKey: null,
      });

      const preview = previewLeaveSquad(state, testNow);
      assert.equal(preview.kind, 'disband');
      assert.equal(preview.confirmText, LEAVE_DISBAND_CONFIRM);
      assert.equal(preview.confirmText, '隊伍會解散。確定離開？');
    });

    it('returns exact member confirm text for member leave', () => {
      const state = createBaseState({
        isSquadLeader: false,
        squadName: '傳奇重訓連盟',
        bossRewardClaimedWeekKey: null,
      });

      const preview = previewLeaveSquad(state, testNow);
      assert.equal(preview.kind, 'member');
      assert.equal(preview.confirmText, LEAVE_MEMBER_CONFIRM('傳奇重訓連盟'));
      assert.equal(preview.confirmText, '確定離開「傳奇重訓連盟」？');
    });

    it('stacks amber claimed note when weekly boss reward already claimed', () => {
      const state = createBaseState({
        isSquadLeader: true,
        squadMembers: createMockMembers(),
        bossRewardClaimedWeekKey: currentWeekKey,
      });

      const preview = previewLeaveSquad(state, testNow);
      assert.equal(preview.alreadyClaimedThisWeek, true);
      assert.equal(preview.claimedNote, BOSS_REWARD_ALREADY_CLAIMED_NOTE);
      assert.equal(
        preview.claimedNote,
        '本週的 Boss 獎勵你已經領過，這週在新隊伍打倒 Boss 不會再拿到賞金。'
      );
    });
  });

  describe('10. getSquadBossMaxHp and getEarliestSuccessor pure helpers', () => {
    it('getSquadBossMaxHp matches existing 1.8 formula for all stages', () => {
      for (let stage = 1; stage <= 10; stage++) {
        const boss = ADVENTURE_BOSS_CATALOG[(stage - 1) % ADVENTURE_BOSS_CATALOG.length];
        const expected = Math.round(boss.maxHp * 1.8 * (1 + (stage - 1) * 0.25));
        assert.equal(getSquadBossMaxHp(stage), expected);
      }
    });

    it('getEarliestSuccessor handles missing and stale ids gracefully', () => {
      const members = createMockMembers(); // akai, leo, alice
      // Stale id 'stranger_x' not in members; missing 'friend_alice'
      const joinOrder = ['self', 'stranger_x', 'friend_leo', 'friend_akai'];
      const remainingIds = ['friend_akai', 'friend_leo', 'friend_alice'];

      const successor = getEarliestSuccessor(joinOrder, remainingIds, members);
      assert.ok(successor);
      assert.equal(successor.id, 'friend_leo');
      assert.equal(successor.nameZh, 'Leo');
    });

    it('upsertRecentTeammates prunes entries older than 30 days and ignores self', () => {
      const now = baseNow;
      const initial = [
        { id: 'old_friend', lastTogetherAt: now - RECENT_TEAMMATES_TTL_MS - 1000 }, // expired
        { id: 'active_friend', lastTogetherAt: now - 5000 },
      ];

      const updated = upsertRecentTeammates(initial, ['active_friend', 'new_friend', DEMO_PLAYER_ID], now);
      assert.equal(updated.some((t) => t.id === 'old_friend'), false);
      assert.equal(updated.some((t) => t.id === DEMO_PLAYER_ID), false);

      const active = updated.find((t) => t.id === 'active_friend');
      assert.equal(active?.lastTogetherAt, now);

      const fresh = updated.find((t) => t.id === 'new_friend');
      assert.equal(fresh?.lastTogetherAt, now);
    });
  });
});

function patchMembers(members: SquadMemberState[] | undefined): SquadMemberState[] {
  return members || [];
}
