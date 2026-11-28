import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_ITEMS, ADVENTURE_BOSS_CATALOG } from '../config/catalogConfig.ts';
import { bossAttack, getDamageInfo, shouldShowRookieFloorBadge } from './economyRules.ts';

describe('Cosmetic Equipment & Honest Damage Rules (T7-A1 M2)', () => {
  describe('1. Catalog items are purely cosmetic', () => {
    it('asserts no avatar catalog item has any combatStat or numeric attack stat', () => {
      assert.ok(AVATAR_ITEMS.length >= 18, 'Expected at least 18 avatar items');
      for (const item of AVATAR_ITEMS) {
        assert.equal(
          (item as unknown as Record<string, unknown>).combatStat,
          undefined,
          `Item ${item.id} (${item.nameZh}) must not have combatStat`
        );
        assert.ok(
          !/物攻|魔攻|ATK|\+[0-9]/.test(item.nameZh),
          `Item ${item.id} nameZh (${item.nameZh}) should not encode attack stats`
        );
        if (item.badgeText) {
          assert.ok(
            !/物攻|魔攻|ATK|\+[0-9]/.test(item.badgeText),
            `Item ${item.id} badgeText (${item.badgeText}) should not encode attack stats`
          );
        }
      }
    });

    it('asserts boss loot statDescZh contains neutral cosmetic flavour without attack numbers', () => {
      for (const boss of ADVENTURE_BOSS_CATALOG) {
        assert.ok(
          !/物攻|魔攻|\+[0-9]/.test(boss.hiddenLoot.statDescZh),
          `Boss ${boss.nameZh} loot statDescZh should not claim attack bonuses`
        );
        assert.ok(
          boss.hiddenLoot.statDescZh.includes('只是紀念品，不會加傷害'),
          `Boss ${boss.nameZh} loot statDescZh should mention cosmetic souvenir status`
        );
      }
    });
  });

  describe('2. bossAttack damage is independent of equipped items', () => {
    function createTestState(equipped: Record<string, string>, sportType: 'strength' | 'cardio' | 'bodyweight' = 'strength') {
      return {
        lastCheckinDate: '2026-11-28',
        lastBossDate: null,
        checkinDayKeys: ['2026-11-28'],
        joinDayKey: '2026-11-23',
        soloStage: 1,
        soloBossHp: 1000,
        squadStage: 1,
        squadBossHp: 1800,
        equipped,
        quests: [],
        streakDays: 3,
        todaySportType: sportType,
        activeTeamComboBuff: 'none' as const,
        squadMembers: [],
        collectedBossLoots: [],
        devForceNextLootDrop: false,
        personalMaxStage: 1,
        squadMaxStage: 1,
        personalMaxDamage: 0,
        totalBossesDefeated: 0,
        totalFinalBlows: 0,
        totalStrikesCount: 0,
        totalDamageDealt: 0,
        coins: 100,
        coinsEarnedToday: 0,
        coinsEarnedDayKey: '2026-11-28',
        doubleCoinUntil: 0,
        bossRewardClaimedWeekKey: null,
      };
    }

    it('yields identical damage whether naked or wearing full legendary equipment (strength sport)', () => {
      const now = new Date('2026-11-28T12:00:00+08:00').getTime();
      const nakedState = createTestState({ hair: '', face: '', top: '', bottom: '', accessory: '' }, 'strength');
      const fullyEquippedState = createTestState({
        hair: 'hair_titan_crown',
        face: 'face_fierce_grit',
        top: 'top_spartan_cape',
        bottom: 'bottom_gold_tights',
        accessory: 'acc_gold_barbell',
      }, 'strength');

      const nakedRes = bossAttack(nakedState, { mode: 'solo' }, now);
      const equippedRes = bossAttack(fullyEquippedState, { mode: 'solo' }, now);

      assert.equal(nakedRes.ok, true);
      assert.equal(equippedRes.ok, true);
      assert.equal(nakedRes.result?.damage, equippedRes.result?.damage, 'Damage must be identical regardless of equipment');
    });

    it('yields identical damage whether naked or wearing full gear in cardio sport', () => {
      const now = new Date('2026-11-28T12:00:00+08:00').getTime();
      const nakedState = createTestState({ hair: '', face: '', top: '', bottom: '', accessory: '' }, 'cardio');
      const fullyEquippedState = createTestState({
        hair: 'hair_maple_cap',
        face: 'face_pixel_shades',
        top: 'top_pump_cover',
        bottom: 'bottom_camo_joggers',
        accessory: 'acc_protein_shaker',
      }, 'cardio');

      const nakedRes = bossAttack(nakedState, { mode: 'solo' }, now);
      const equippedRes = bossAttack(fullyEquippedState, { mode: 'solo' }, now);

      assert.equal(nakedRes.ok, true);
      assert.equal(equippedRes.ok, true);
      assert.equal(nakedRes.result?.damage, equippedRes.result?.damage);
    });

    it('yields identical damage in squad mode regardless of equipment', () => {
      const now = new Date('2026-11-28T12:00:00+08:00').getTime();
      const nakedState = createTestState({ hair: '', face: '', top: '', bottom: '', accessory: '' }, 'strength');
      const fullyEquippedState = createTestState({
        hair: 'hair_titan_crown',
        face: 'face_fierce_grit',
        top: 'top_spartan_cape',
        bottom: 'bottom_navy_shorts',
        accessory: 'acc_gold_barbell',
      }, 'strength');

      const nakedRes = bossAttack(nakedState, { mode: 'squad' }, now);
      const equippedRes = bossAttack(fullyEquippedState, { mode: 'squad' }, now);

      assert.equal(nakedRes.ok, true);
      assert.equal(equippedRes.ok, true);
      assert.equal(nakedRes.result?.damage, equippedRes.result?.damage);
    });
  });

  describe('3. shouldShowRookieFloorBadge visibility rule', () => {
    it('returns true when damageInfo.isRookieFloor is true', () => {
      assert.equal(
        shouldShowRookieFloorBadge({
          daysThisWeek: 1,
          damageMultiplier: 1.2,
          multiplierTier: '1',
          isRookieFloor: true,
        }),
        true
      );
    });

    it('returns false when damageInfo.isRookieFloor is false', () => {
      assert.equal(
        shouldShowRookieFloorBadge({
          daysThisWeek: 2,
          damageMultiplier: 1.2,
          multiplierTier: '2',
          isRookieFloor: false,
        }),
        false
      );
      assert.equal(
        shouldShowRookieFloorBadge({
          daysThisWeek: 3,
          damageMultiplier: 1.4,
          multiplierTier: '3+',
          isRookieFloor: false,
        }),
        false
      );
    });

    it('integrates with real getDamageInfo: rookie week day 1 shows badge; day 2 and beyond hides badge', () => {
      // Rookie joining Monday 2026-11-23
      const joinDayKey = '2026-11-23';

      // Day 1 (1 checkin on Monday): multiplier is bumped to 1.2 by floor, isRookieFloor=true
      const infoDay1 = getDamageInfo(
        {
          joinDayKey,
          checkinDayKeys: ['2026-11-23'],
        },
        new Date('2026-11-23T12:00:00+08:00')
      );
      assert.equal(infoDay1.daysThisWeek, 1);
      assert.equal(infoDay1.damageMultiplier, 1.2);
      assert.equal(infoDay1.isRookieFloor, true);
      assert.equal(shouldShowRookieFloorBadge(infoDay1), true);

      // Day 2 (2 checkins on Mon & Tue): multiplier is 1.2 naturally from days, isRookieFloor=false
      const infoDay2 = getDamageInfo(
        {
          joinDayKey,
          checkinDayKeys: ['2026-11-23', '2026-11-24'],
        },
        new Date('2026-11-24T12:00:00+08:00')
      );
      assert.equal(infoDay2.daysThisWeek, 2);
      assert.equal(infoDay2.damageMultiplier, 1.2);
      assert.equal(infoDay2.isRookieFloor, false);
      assert.equal(shouldShowRookieFloorBadge(infoDay2), false);

      // Day 3 (3 checkins): multiplier is 1.4, isRookieFloor=false
      const infoDay3 = getDamageInfo(
        {
          joinDayKey,
          checkinDayKeys: ['2026-11-23', '2026-11-24', '2026-11-25'],
        },
        new Date('2026-11-25T12:00:00+08:00')
      );
      assert.equal(infoDay3.daysThisWeek, 3);
      assert.equal(infoDay3.damageMultiplier, 1.4);
      assert.equal(infoDay3.isRookieFloor, false);
      assert.equal(shouldShowRookieFloorBadge(infoDay3), false);

      // Week 2 (non-rookie week, Monday 2026-11-30) with 1 checkin: multiplier 1.0, isRookieFloor=false
      const infoWeek2Day1 = getDamageInfo(
        {
          joinDayKey,
          checkinDayKeys: ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-30'],
        },
        new Date('2026-11-30T12:00:00+08:00')
      );
      assert.equal(infoWeek2Day1.daysThisWeek, 1);
      assert.equal(infoWeek2Day1.damageMultiplier, 1.0);
      assert.equal(infoWeek2Day1.isRookieFloor, false);
      assert.equal(shouldShowRookieFloorBadge(infoWeek2Day1), false);
    });
  });
});
