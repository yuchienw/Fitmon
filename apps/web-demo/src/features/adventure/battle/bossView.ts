import { ADVENTURE_BOSS_CATALOG, AdventureBoss } from '../../../config/catalogConfig';

export function bossForStage(stage: number): AdventureBoss {
  const index = (Math.max(1, stage) - 1) % ADVENTURE_BOSS_CATALOG.length;
  return ADVENTURE_BOSS_CATALOG[index];
}

/**
 * Display HP for the current stage. This is the same view math Plaza already used.
 * It is not the damage, EXP, or coin formula.
 */
export function displayedBossMaxHp(
  boss: AdventureBoss,
  stage: number,
  mode: 'solo' | 'squad',
): number {
  const scaled = boss.maxHp * (1 + (stage - 1) * 0.25);
  return Math.round(mode === 'solo' ? scaled : scaled * 1.8);
}
