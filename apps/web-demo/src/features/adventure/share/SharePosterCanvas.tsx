import React, { useEffect } from 'react';
import { loadBossSprite } from '../../../game/pixelSpriteDrawer';
import { drawRareLootPoster, drawVictoryPoster } from './drawPoster';
import {
  PosterIdentity,
  RareLootPosterData,
  SHARE_PIXELS,
  ShareAspect,
  VictoryPosterData,
} from './types';

interface SharePosterCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  aspect: ShareAspect;
  kind: 'victory' | 'loot';
  victory?: VictoryPosterData | null;
  loot?: RareLootPosterData | null;
  identity: PosterIdentity;
}

export const SharePosterCanvas: React.FC<SharePosterCanvasProps> = ({
  canvasRef,
  aspect,
  kind,
  victory,
  loot,
  identity,
}) => {
  const pixels = SHARE_PIXELS[aspect];
  const identityKey = [
    identity.brand,
    identity.level,
    identity.nickname,
    identity.squadName,
    identity.bodyStage,
    JSON.stringify(identity.equipped),
    identity.rows.map((row) => `${row.nameZh}:${row.damageText}:${row.highlight}`).join('|'),
  ].join('~');

  useEffect(() => {
    const canvas = canvasRef.current;
    const bossKey = kind === 'victory' ? victory?.boss.spriteKey : loot?.boss.spriteKey;
    if (!canvas || !bossKey) return;
    let cancelled = false;
    const paint = async () => {
      try {
        await loadBossSprite(bossKey);
      } catch {
        // A missing sprite falls back to a name plate inside the poster.
      }
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // Use the font already available to canvas.
        }
      }
      if (cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (kind === 'victory' && victory) drawVictoryPoster(ctx, aspect, victory, identity);
      if (kind === 'loot' && loot) drawRareLootPoster(ctx, aspect, loot, identity);
    };
    void paint();
    return () => {
      cancelled = true;
    };
    // identityKey covers the poster fields that should trigger a redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect, canvasRef, identityKey, kind, loot, victory]);

  return (
    <canvas
      ref={(node) => {
        (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
      }}
      width={pixels.width}
      height={pixels.height}
      data-testid="share-poster"
      data-export-width={pixels.width}
      data-export-height={pixels.height}
      data-watermark="fixed"
      className="mx-auto block h-auto max-h-[46dvh] w-full rounded-xl border border-border bg-card object-contain"
      style={{ aspectRatio: aspect === '9:16' ? '9 / 16' : '4 / 5' }}
    />
  );
};
