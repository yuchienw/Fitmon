/**
 * Battle Hero & Teammate Stage Scale Calculation (QA-17)
 *
 * Keeps hero/teammate scaling aligned between DOM hit-areas and canvas painting.
 * Caps scaling on short canvases (e.g. 375x600 with SkillDeck expanded) so the hero's
 * head (including tall hair / crown) never overlaps the Boss HP bar.
 */

export const BATTLE_HERO_HEAD_EXTENT = 70; // unscaled extent from feet to top of head/crown
export const BATTLE_HUD_HP_BAR_BOTTOM = 50; // px from canvas top (HP bar bottom in canvas coordinates)
export const BATTLE_HEAD_SAFE_GAP = 4; // px gap between HP bar bottom and topmost hero head
export const BATTLE_HERO_MIN_SCALE = 0.5; // positive floor for degenerate canvas heights

export function getBattleHeroFeetY(h: number): number {
  return h * 0.8 + 2;
}

export function getBattleHeroHeadTopY(h: number, scale: number): number {
  return getBattleHeroFeetY(h) - BATTLE_HERO_HEAD_EXTENT * scale;
}

export function getBattleHeroScale(w: number, h: number): number {
  const fitted = Math.min(w / 165, h / 210, 2.5);
  const baseScale = Math.max(1.85, fitted);

  // Feet baseline is at h * 0.8 + 2
  const feetY = getBattleHeroFeetY(h);
  // HP bar bottom is 50px below canvas top. With safe gap, topmost head extent must be >= safeTopY.
  const safeTopY = BATTLE_HUD_HP_BAR_BOTTOM + BATTLE_HEAD_SAFE_GAP;
  const maxSafeScale = (feetY - safeTopY) / BATTLE_HERO_HEAD_EXTENT;

  const scale = Math.min(baseScale, maxSafeScale);
  return Math.max(BATTLE_HERO_MIN_SCALE, scale);
}
