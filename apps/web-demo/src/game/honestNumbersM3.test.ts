import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUIZ_COINS,
  CHECKIN_COINS,
  CHECKIN_XP,
  DAILY_COIN_CAP,
  COIN_CAP_REACHED_COPY,
  WEEKLY_CHEST_DAYS_REQUIRED,
} from '../config/economy.ts';
import { HIDE_UNFINISHED } from '../config/demo.ts';
import { filterVisibleQuests, isVisibleQuest, IGNORED_QUEST_ID } from './questFilter.ts';
import {
  isWeeklyChestClaimable,
  bossAttack,
  previewCappedReward,
} from './economyRules.ts';
import { getLocalDayKey, getWeekKey } from './day.ts';

describe('T7-A1 Milestone 3: Honest Numbers & Pure Rule Helpers', () => {
  describe('Economy Constants', () => {
    it('QUIZ_COINS must be 10 (YuChien approved)', () => {
      assert.equal(QUIZ_COINS, 10);
    });

    it('CHECKIN_COINS must be 70 and CHECKIN_XP must be 100', () => {
      assert.equal(CHECKIN_COINS, 70);
      assert.equal(CHECKIN_XP, 100);
    });

    it('DAILY_COIN_CAP must be 90', () => {
      assert.equal(DAILY_COIN_CAP, 90);
    });

    it('COIN_CAP_REACHED_COPY matches canonical wording', () => {
      assert.equal(COIN_CAP_REACHED_COPY, '今天的遊戲幣拿滿了');
    });

    it('HIDE_UNFINISHED is true by default', () => {
      assert.equal(HIDE_UNFINISHED, true);
    });
  });

  describe('Quest Filter (Old save with q_daily_workout vs New save)', () => {
    it('isVisibleQuest rejects q_daily_workout and accepts other quests', () => {
      assert.equal(isVisibleQuest({ id: 'q_daily_workout' }), false);
      assert.equal(isVisibleQuest({ id: 'q_interact_pet' }), true);
      assert.equal(isVisibleQuest({ id: 'q_social_cheer' }), true);
      assert.equal(isVisibleQuest({ id: 'q_create_meme' }), true);
      assert.equal(isVisibleQuest(null), false);
      assert.equal(isVisibleQuest(undefined), false);
    });

    it('filterVisibleQuests removes q_daily_workout from legacy save array', () => {
      const legacyQuests = [
        { id: 'q_interact_pet', progress: 1, target: 1, claimed: false },
        { id: 'q_daily_workout', progress: 1, target: 1, claimed: true },
        { id: 'q_social_cheer', progress: 0, target: 1, claimed: false },
        { id: 'q_create_meme', progress: 0, target: 1, claimed: false },
      ];

      const visible = filterVisibleQuests(legacyQuests);
      assert.equal(visible.length, 3);
      assert.ok(!visible.some((q) => q.id === IGNORED_QUEST_ID));
      assert.deepEqual(
        visible.map((q) => q.id),
        ['q_interact_pet', 'q_social_cheer', 'q_create_meme']
      );
    });

    it('filterVisibleQuests preserves modern save without q_daily_workout', () => {
      const modernQuests = [
        { id: 'q_interact_pet', progress: 0, target: 1, claimed: false },
        { id: 'q_social_cheer', progress: 1, target: 1, claimed: true },
        { id: 'q_create_meme', progress: 0, target: 1, claimed: false },
      ];

      const visible = filterVisibleQuests(modernQuests);
      assert.equal(visible.length, 3);
      assert.deepEqual(visible, modernQuests);
    });

    it('handles empty or non-array quests gracefully', () => {
      assert.deepEqual(filterVisibleQuests([]), []);
      assert.deepEqual(filterVisibleQuests(null), []);
      assert.deepEqual(filterVisibleQuests(undefined), []);
    });

    it('bossAttack ignores completed q_daily_workout from legacy save', () => {
      const baseState = {
        lastCheckinDate: '2026-11-28',
        lastBossDate: null,
        soloStage: 1,
        squadStage: 1,
        soloBossHp: 1000,
        squadBossHp: 2000,
        activeTeamComboBuff: null,
        todaySportType: null,
        coinsEarnedToday: 0,
        coinsEarnedDayKey: '2026-11-28',
        coins: 100,
        doubleCoinUntil: 0,
        checkinDayKeys: ['2026-11-28'],
      };

      // Legacy save with 1 normal completed quest + completed q_daily_workout
      const legacyState = {
        ...baseState,
        quests: [
          { id: 'q_interact_pet', progress: 1, target: 1 },
          { id: 'q_daily_workout', progress: 1, target: 1 },
        ],
      };

      // Modern save with only the 1 normal completed quest
      const modernState = {
        ...baseState,
        quests: [{ id: 'q_interact_pet', progress: 1, target: 1 }],
      };

      const now = new Date('2026-11-28T12:00:00Z').getTime();
      const resLegacy = bossAttack(legacyState as any, { mode: 'solo' }, now);
      const resModern = bossAttack(modernState as any, { mode: 'solo' }, now);

      assert.equal(resLegacy.ok, true);
      assert.equal(resModern.ok, true);
      assert.ok(resLegacy.result && resModern.result);
      // Both should calculate identical damage ignoring q_daily_workout
      assert.equal(resLegacy.result.damage, resModern.result.damage);
    });
  });

  describe('previewCappedReward & Daily Cap', () => {
    it('returns exact amount when under daily cap', () => {
      const state = {
        coinsEarnedDayKey: '2026-11-28',
        coinsEarnedToday: 20,
        doubleCoinUntil: 0,
      };
      const now = new Date('2026-11-28T10:00:00Z').getTime();
      assert.equal(previewCappedReward(state, QUIZ_COINS, now), 10);
    });

    it('returns clamped amount when approaching daily cap', () => {
      const state = {
        coinsEarnedDayKey: '2026-11-28',
        coinsEarnedToday: 85,
        doubleCoinUntil: 0,
      };
      const now = new Date('2026-11-28T10:00:00Z').getTime();
      assert.equal(previewCappedReward(state, QUIZ_COINS, now), 5);
    });

    it('returns 0 when daily cap (90) is reached', () => {
      const state = {
        coinsEarnedDayKey: '2026-11-28',
        coinsEarnedToday: 90,
        doubleCoinUntil: 0,
      };
      const now = new Date('2026-11-28T10:00:00Z').getTime();
      assert.equal(previewCappedReward(state, QUIZ_COINS, now), 0);
    });

    it('accounts for 2x coupon doubling cap and amount', () => {
      const now = new Date('2026-11-28T10:00:00Z').getTime();
      const state = {
        coinsEarnedDayKey: '2026-11-28',
        coinsEarnedToday: 100, // exceeds 90, but double cap is 180
        doubleCoinUntil: now + 3600000,
      };
      // 10 * 2 = 20; 180 - 100 = 80 capacity -> grants 20
      assert.equal(previewCappedReward(state, QUIZ_COINS, now), 20);
    });
  });

  describe('isWeeklyChestClaimable Pure Helper', () => {
    const fixedNow = new Date('2026-11-28T10:00:00Z').getTime();
    const currentWeek = getWeekKey(getLocalDayKey(fixedNow));

    it('returns false when daysThisWeek < WEEKLY_CHEST_DAYS_REQUIRED (3)', () => {
      assert.equal(
        isWeeklyChestClaimable({ chestClaimedWeekKey: null }, 0, fixedNow),
        false
      );
      assert.equal(
        isWeeklyChestClaimable({ chestClaimedWeekKey: null }, 2, fixedNow),
        false
      );
    });

    it('returns true when daysThisWeek >= 3 and not claimed this week', () => {
      assert.equal(
        isWeeklyChestClaimable({ chestClaimedWeekKey: null }, 3, fixedNow),
        true
      );
      assert.equal(
        isWeeklyChestClaimable({ chestClaimedWeekKey: null }, 5, fixedNow),
        true
      );
      // Claimed on a previous week
      assert.equal(
        isWeeklyChestClaimable({ chestClaimedWeekKey: '2026-W40' }, 3, fixedNow),
        true
      );
    });

    it('returns false when already claimed this week', () => {
      assert.equal(
        isWeeklyChestClaimable({ chestClaimedWeekKey: currentWeek }, 3, fixedNow),
        false
      );
      assert.equal(
        isWeeklyChestClaimable({ chestClaimedWeekKey: currentWeek }, 7, fixedNow),
        false
      );
    });
  });
});
