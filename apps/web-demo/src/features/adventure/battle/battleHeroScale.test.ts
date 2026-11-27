import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBattleHeroScale,
  getBattleHeroFeetY,
  getBattleHeroHeadTopY,
  BATTLE_HUD_HP_BAR_BOTTOM,
  BATTLE_HEAD_SAFE_GAP,
  BATTLE_HERO_HEAD_EXTENT,
} from './battleHeroScale.ts';

describe('QA-17 Battle Hero Scale & Head Overlap', () => {
  it('short canvas (375x600 expanded: w=373, h=159.5) scales down below 1.85 and head top stays below HP bar bottom', () => {
    const w = 373;
    const h = 159.5;
    const scale = getBattleHeroScale(w, h);

    // Scale must be well below the old 1.85 floor
    assert.ok(scale < 1.85, `Scale ${scale} should be < 1.85`);
    assert.ok(Math.abs(scale - 1.08) < 1e-4, `Expected scale ~1.08, got ${scale}`);

    // Head top Y (feetY - 70*scale) must be strictly below HP bar bottom (50px from top)
    const feetY = getBattleHeroFeetY(h);
    const headTopY = getBattleHeroHeadTopY(h, scale);
    assert.ok(Math.abs(feetY - 129.6) < 1e-4);
    assert.ok(headTopY >= BATTLE_HUD_HP_BAR_BOTTOM + BATTLE_HEAD_SAFE_GAP - 1e-4);
    assert.ok(Math.abs(headTopY - 54) < 1e-4);
    assert.ok(headTopY > BATTLE_HUD_HP_BAR_BOTTOM, 'head top must be below HP bar bottom (y=50)');
  });

  it('tall canvas (390x844 collapsed: w=388, h=536.25) keeps fitted scale without being shrunk by cap or floor', () => {
    const w = 388;
    const h = 536.25;
    const expected = Math.min(w / 165, h / 210, 2.5); // ~2.3515
    const scale = getBattleHeroScale(w, h);

    assert.equal(scale, expected);
    assert.ok(scale > 2.3, `Scale ${scale} should be ~2.35`);

    const headTopY = getBattleHeroHeadTopY(h, scale);
    assert.ok(headTopY > BATTLE_HUD_HP_BAR_BOTTOM);
  });

  it('mid canvas (375x600 collapsed: w=373, h=292.25) keeps 1.85 floor without overlap', () => {
    const w = 373;
    const h = 292.25;
    const scale = getBattleHeroScale(w, h);

    assert.equal(scale, 1.85);

    const headTopY = getBattleHeroHeadTopY(h, scale);
    assert.ok(headTopY > BATTLE_HUD_HP_BAR_BOTTOM);
  });

  it('handles degenerate tiny canvas heights by clamping to small positive scale', () => {
    const scale = getBattleHeroScale(300, 40);
    assert.ok(scale > 0, 'scale must be positive');
    assert.equal(scale, 0.5);
  });
});
