import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test, describe } from 'node:test';
import {
  getFreshInitialSaveSlice,
  applyDemoSeedData,
  DEMO_SEED_WORKOUT_HISTORY,
  DEMO_SEED_PERSONAL_RECORDS,
  DEMO_SEED_BIOMETRICS,
  DEMO_SEED_POSTS,
  DEMO_SEED_FRIEND_IDS,
  DEMO_SEED_CAREER_STATS,
  DEMO_SEED_SQUAD,
  DEMO_SEED_EQUIPPED_TOP,
  FRESH_INITIAL_WORKOUT_HISTORY,
  FRESH_INITIAL_PERSONAL_RECORDS,
  FRESH_INITIAL_BIOMETRICS,
  FRESH_INITIAL_POSTS,
  FRESH_INITIAL_FRIEND_IDS,
  FRESH_INITIAL_CAREER_STATS,
  FRESH_INITIAL_SQUAD,
  FRESH_INITIAL_EQUIPPED_TOP,
} from './freshSave.ts';
import { ADVENTURE_BOSS_CATALOG } from '../config/catalogConfig.ts';
import { ECONOMY_CONFIG } from '../config/economyConfig.ts';
import { migratePersistedState } from './persistMigrate.ts';

describe('T7-A2 Fresh Save Initial Defaults (PRODUCT-AUDIT A3 / B10)', () => {
  test('Fresh save defaults start with zero/empty history, social, career, and unfilled biometrics', () => {
    const slice = getFreshInitialSaveSlice();

    // 1. workoutHistory is empty []
    assert.deepEqual(slice.workoutHistory, []);
    assert.equal(slice.workoutHistory.length, 0);

    // 2. personalRecords is empty {}
    assert.deepEqual(slice.personalRecords, {});
    assert.equal(Object.keys(slice.personalRecords).length, 0);

    // 3. biometrics: heightCm, weightKg, bodyFatPct, age, gender all null
    assert.equal(slice.biometrics.heightCm, null);
    assert.equal(slice.biometrics.weightKg, null);
    assert.equal(slice.biometrics.bodyFatPct, null);
    assert.equal(slice.biometrics.age, null);
    assert.equal(slice.biometrics.gender, null);
    assert.equal(slice.biometrics.activityMultiplier, 1.55);
    assert.equal(slice.biometrics.goal, 'maintain');

    // 4. posts: [] and friendIds: []
    assert.deepEqual(slice.posts, []);
    assert.deepEqual(slice.friendIds, []);

    // 5. Career stats all 0; personalMaxStage 1, squadMaxStage 1 (was 2)
    assert.equal(slice.personalMaxStage, 1);
    assert.equal(slice.squadMaxStage, 1);
    assert.equal(slice.personalMaxDamage, 0);
    assert.equal(slice.totalBossesDefeated, 0);
    assert.equal(slice.totalFinalBlows, 0);
    assert.equal(slice.totalStrikesCount, 0);
    assert.equal(slice.totalDamageDealt, 0);

    // 6. Squad: squadName '我的隊伍', squadStage 1, soloStage 1, boss HP equals stage 1 catalog maxHp (1000)
    assert.equal(slice.squadName, '我的隊伍');
    assert.equal(slice.squadStage, 1);
    assert.equal(slice.soloStage, 1);
    const stage1BossMaxHp = ADVENTURE_BOSS_CATALOG[0].maxHp;
    assert.equal(stage1BossMaxHp, 1000);
    assert.equal(slice.soloBossHp, stage1BossMaxHp);
    assert.equal(slice.squadBossHp, stage1BossMaxHp);
    assert.deepEqual(slice.squadMembers, []);

    // 7. Default equipped top is 'top_black_tank'; ownedItemIds still includes 'top_bare_muscles'
    assert.equal(slice.equipped.top, 'top_black_tank');
    assert.ok(slice.ownedItemIds.includes('top_bare_muscles'));
    assert.ok(slice.ownedItemIds.includes('top_black_tank'));

    // 8. Coins equal ftueStarterCoins (350), checkinDayKeys empty []
    assert.equal(slice.coins, ECONOMY_CONFIG.ftueStarterCoins);
    assert.equal(slice.coins, 350);
    assert.deepEqual(slice.checkinDayKeys, []);
  });
});

describe('T7-A2 Demo Seed Data & Pure applyDemoSeedData helper', () => {
  test('applyDemoSeedData restores all demo seed values onto fresh state', () => {
    const fresh = getFreshInitialSaveSlice();

    // Verify it is fresh before apply
    assert.equal(fresh.workoutHistory.length, 0);
    assert.equal(fresh.friendIds.length, 0);
    assert.equal(fresh.personalMaxDamage, 0);
    assert.equal(fresh.squadName, '我的隊伍');
    assert.equal(fresh.equipped.top, 'top_black_tank');

    // Apply demo seed
    const seeded = applyDemoSeedData(fresh);

    // 1. 5 history sessions restored
    assert.equal(seeded.workoutHistory.length, 5);
    assert.equal(seeded.workoutHistory[0].routineName, '🔥 黃金臀腿增肌主課表');
    assert.equal(seeded.workoutHistory[1].routineName, '💪 下班快速推日');
    assert.equal(seeded.workoutHistory[2].routineName, '🦅 倒三角背部拉日');
    assert.equal(seeded.workoutHistory[3].routineName, '🔥 黃金臀腿增肌主課表');
    assert.equal(seeded.workoutHistory[4].routineName, '🏃 有氧燃脂＋核心恢復');

    // 2. Personal records squat 100 / bench 75 / deadlift 120 / press 45 / pull-up 75
    assert.deepEqual(seeded.personalRecords, {
      barbell_squat: 100,
      barbell_bench_press: 75,
      conventional_deadlift: 120,
      overhead_press: 45,
      pull_ups: 75,
    });

    // 3. Friends 阿凱 & 艾莉絲
    assert.deepEqual(seeded.friendIds, ['friend_akai', 'friend_alice']);

    // 4. Social posts restored (5 seed posts)
    assert.equal(seeded.posts.length, 5);

    // 5. Career stats: 3 bosses defeated, 2 final blows, 11 strikes, 6420 damage, 680 max damage
    assert.equal(seeded.personalMaxDamage, 680);
    assert.equal(seeded.totalBossesDefeated, 3);
    assert.equal(seeded.totalFinalBlows, 2);
    assert.equal(seeded.totalStrikesCount, 11);
    assert.equal(seeded.totalDamageDealt, 6420);
    assert.equal(seeded.personalMaxStage, 1);
    assert.equal(seeded.squadMaxStage, 2);

    // 6. Squad restored: 腿日絕不缺席, squadStage 2, squadBossHp 1150, soloStage 1, soloBossHp 720
    assert.equal(seeded.squadName, '🔥 腿日絕不缺席戰隊');
    assert.equal(seeded.squadStage, 2);
    assert.equal(seeded.squadBossHp, 1150);
    assert.equal(seeded.soloStage, 1);
    assert.equal(seeded.soloBossHp, 720);

    // 7. Biometrics restored: 175cm, 72kg, 16.5%, 27yo male
    assert.deepEqual(seeded.biometrics, {
      heightCm: 175,
      weightKg: 72,
      bodyFatPct: 16.5,
      age: 27,
      gender: 'male',
      activityMultiplier: 1.55,
      goal: 'maintain',
    });

    // 8. Equipped top restored to bare muscles
    assert.equal(seeded.equipped.top, 'top_bare_muscles');
  });
});

describe('T7-A2 Persist Migration: Existing Saves Remain Completely Unchanged', () => {
  test('Fixture containing old seed values is UNCHANGED after migratePersistedState — version ends at 4, no field cleared', () => {
    const savePath = '/workspace/fitmon-qa-2026-11-14/t3-d2/oldsave-main-ae12c43.json';
    const fileContent = fs.readFileSync(savePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    assert.equal(parsed.version, 2, 'Fixture starts at version 2');

    const v2State = parsed.state;

    // Verify fixture contains old seed values prior to migration
    assert.equal(v2State.workoutHistory.length, 5);
    assert.equal(v2State.friendIds.length, 2);
    assert.deepEqual(v2State.friendIds, ['friend_akai', 'friend_alice']);
    assert.equal(v2State.biometrics.heightCm, 175);
    assert.equal(v2State.biometrics.weightKg, 72);
    assert.equal(v2State.biometrics.bodyFatPct, 16.5);
    assert.equal(v2State.biometrics.age, 27);
    assert.equal(v2State.biometrics.gender, 'male');
    assert.equal(v2State.squadName, '🔥 腿日絕不缺席戰隊');
    assert.equal(v2State.squadStage, 2);
    assert.equal(v2State.squadBossHp, 1150);
    assert.equal(v2State.personalMaxDamage, 680);
    assert.equal(v2State.totalBossesDefeated, 3);
    assert.equal(v2State.totalFinalBlows, 2);
    assert.equal(v2State.totalStrikesCount, 11);
    assert.equal(v2State.totalDamageDealt, 6420);
    assert.equal(v2State.coins, 420);
    assert.equal(v2State.level, 2);
    assert.equal(v2State.exp, 0);
    assert.equal(v2State.equipped.top, 'top_bare_muscles');

    // Perform migration from version 2 to latest (v4)
    const mockNow = 1763640000000;
    const migrated = migratePersistedState(v2State, 2, mockNow);

    // Old values MUST NOT be wiped, cleared, or replaced by fresh defaults
    assert.equal((migrated.workoutHistory as any[]).length, 5, 'History sessions must not be cleared');
    assert.equal((migrated.workoutHistory as any[])[0].routineName, '🔥 黃金臀腿增肌主課表');
    assert.deepEqual(migrated.personalRecords, {
      barbell_squat: 100,
      barbell_bench_press: 75,
      conventional_deadlift: 120,
      overhead_press: 45,
      pull_ups: 75,
    }, 'Personal records must be preserved');

    assert.deepEqual(migrated.friendIds, ['friend_akai', 'friend_alice'], 'Friends must not be cleared');

    assert.equal((migrated.biometrics as any).heightCm, 175);
    assert.equal((migrated.biometrics as any).weightKg, 72);
    assert.equal((migrated.biometrics as any).bodyFatPct, 16.5);
    assert.equal((migrated.biometrics as any).age, 27);
    assert.equal((migrated.biometrics as any).gender, 'male');

    assert.equal(migrated.squadName, '🔥 腿日絕不缺席戰隊', 'Squad name must remain as old seed');
    assert.equal(migrated.squadStage, 2, 'Squad stage must remain 2');
    assert.equal(migrated.squadBossHp, 1150, 'Squad boss HP must remain 1150');

    assert.equal(migrated.personalMaxDamage, 680, 'Career max damage must remain 680');
    assert.equal(migrated.totalBossesDefeated, 3, 'Career bosses defeated must remain 3');
    assert.equal(migrated.totalFinalBlows, 2, 'Career final blows must remain 2');
    assert.equal(migrated.totalStrikesCount, 11, 'Career strikes count must remain 11');
    assert.equal(migrated.totalDamageDealt, 6420, 'Career total damage dealt must remain 6420');

    assert.equal(migrated.coins, 420, 'Coins must remain 420');
    assert.equal(migrated.level, 2, 'Level must remain 2');
    assert.equal(migrated.exp, 0, 'Exp must remain 0');
    assert.equal((migrated.equipped as any).top, 'top_bare_muscles', 'Equipped top must remain top_bare_muscles');
  });
});
