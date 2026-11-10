import React, { useEffect, useRef } from 'react';
import { AdventureBoss, AvatarBodyStage, EquipSlot } from '../../../config/catalogConfig';
import { drawBossSprite, drawMapleChibiAvatar } from '../../../game/pixelSpriteDrawer';

export const LUNGE_MS = 180;
export const BOSS_HIT_MS = 200;
export const SHAKE_MS = 120;
export const FLOAT_MS = 700;

export interface StrikeFloat {
  id: number;
  damage: number;
  isCrit: boolean;
  isCheatPenalty?: boolean;
  droppedLootName?: string;
}

export interface TeammateDrawConfig {
  id: string;
  nameZh: string;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  hasWorkedOutToday: boolean;
}

interface DrawState {
  boss: AdventureBoss;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  teammates?: TeammateDrawConfig[];
  phase: 'idle' | 'lunge' | 'hit';
  lungeAt: number | null;
  hitAt: number | null;
  reducedMotion: boolean;
}

interface BattleStageCanvasProps extends DrawState {
  floatHit: StrikeFloat | null;
  hud: React.ReactNode;
}

export const BattleStageCanvas: React.FC<BattleStageCanvasProps> = ({
  floatHit,
  hud,
  reducedMotion,
  ...drawProps
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const drawRef = useRef<DrawState>({ ...drawProps, reducedMotion });
  drawRef.current = { ...drawProps, reducedMotion };

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const apply = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const canvas = canvasRef.current;
      const { w, h, dpr } = sizeRef.current;
      if (canvas && w > 2 && h > 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          paintArena(ctx, w, h, now, drawRef.current, drawRef.current.teammates);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="adventure-arena adventure-battle-canvas relative min-h-0 w-full flex-1"
      data-testid="battle-stage"
      data-arena="warm-daylight"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
      {floatHit && (
        <div
          key={floatHit.id}
          data-testid="damage-float"
          className={`pointer-events-none absolute left-[68%] top-[34%] z-[2] ${reducedMotion ? '-translate-x-1/2' : 'adv-float'}`}
        >
          <span
            className={`block text-center font-mono font-black ${
              floatHit.isCrit && !reducedMotion ? 'adv-crit' : ''
            } ${
              floatHit.isCheatPenalty
                ? 'text-lg text-muted-foreground'
                : floatHit.isCrit
                ? 'text-3xl text-secondary'
                : 'text-2xl text-destructive'
            }`}
          >
            -{floatHit.damage}
          </span>
          {floatHit.droppedLootName && (
            <span className="adv-loot-flash mt-1 block whitespace-nowrap rounded-full bg-secondary px-2 py-0.5 text-center text-[11px] font-black text-secondary-foreground">
              噴裝
            </span>
          )}
        </div>
      )}
      {hud}
    </div>
  );
};

export function paintArena(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  state: DrawState,
  teammates: TeammateDrawConfig[] = state.teammates || [],
) {
  const hitElapsed = state.hitAt == null ? Number.POSITIVE_INFINITY : now - state.hitAt;
  const lungeElapsed = state.lungeAt == null ? 0 : now - state.lungeAt;
  ctx.save();
  if (!state.reducedMotion && hitElapsed >= 0 && hitElapsed < SHAKE_MS) {
    const amp = 3 * (1 - hitElapsed / SHAKE_MS);
    ctx.translate(Math.sin(hitElapsed / 18) * amp, Math.cos(hitElapsed / 21) * amp * 0.4);
  }

  const floorY = h * 0.8;
  const floor = ctx.createLinearGradient(0, floorY, 0, h);
  floor.addColorStop(0, '#f3d7a4');
  floor.addColorStop(1, '#e4c08a');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = 'rgba(146, 98, 48, 0.28)';
  ctx.lineWidth = 1.5;
  for (let y = floorY + 12; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  drawPalm(ctx, 18, floorY, 0.72);
  drawPalm(ctx, w - 8, floorY, 0.58);

  let squash = 1;
  let flash = 0;
  if (hitElapsed >= 0 && hitElapsed < BOSS_HIT_MS) {
    const progress = hitElapsed / BOSS_HIT_MS;
    flash = Math.sin(progress * Math.PI);
    if (!state.reducedMotion) squash = 1 - Math.sin(progress * Math.PI) * 0.14;
  }

  const bossSize = Math.min(w * 0.44, h * 0.48);
  const bossX = w - bossSize - Math.max(6, w * 0.02);
  const bossY = floorY - bossSize + bossSize * 0.06;
  const drewBoss = drawBossSprite(ctx, state.boss.spriteKey, bossX, bossY, bossSize, {
    squash,
    defeated: false,
  });
  if (!drewBoss) {
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = '#3f2e27';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bossX + bossSize * 0.12, bossY + bossSize * 0.16, bossSize * 0.76, bossSize * 0.7, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#29221e';
    ctx.font = '700 18px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.boss.nameZh.slice(0, 8), bossX + bossSize / 2, bossY + bossSize * 0.5);
  }
  if (flash > 0.05) {
    ctx.save();
    ctx.globalAlpha = flash * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(bossX + bossSize * 0.1, bossY + bossSize * 0.12, bossSize * 0.8, bossSize * 0.76, 36);
    ctx.fill();
    ctx.restore();
  }

  let lunge = 0;
  if (state.phase === 'lunge' || state.phase === 'hit') {
    if (state.reducedMotion) {
      lunge = 36;
    } else {
      const t = Math.min(1, Math.max(0, lungeElapsed / LUNGE_MS));
      lunge = 36 * (1 - Math.pow(1 - t, 3));
    }
  }

  const scale = Math.max(1.85, Math.min(w / 165, h / 210, 2.5));
  const heroBaseX = Math.round(w * 0.33);

  // 1. Draw Teammates FIRST (scale 0.65, in back-left and direct-rear, floor higher by ~8-12% h)
  if (teammates && teammates.length > 0) {
    const activeTeammates = teammates.slice(0, 3);
    const teammateScale = scale * 0.65;
    activeTeammates.forEach((teammate, idx) => {
      let tx = Math.round(w * 0.16);
      let ty = floorY - Math.round(h * 0.10);

      if (activeTeammates.length === 1) {
        tx = Math.round(w * 0.16);
        ty = floorY - Math.round(h * 0.10);
      } else if (activeTeammates.length === 2) {
        tx = idx === 0 ? Math.max(Math.round(20 * teammateScale), Math.round(w * 0.11)) : Math.round(w * 0.22);
        ty = floorY - Math.round(h * (idx === 0 ? 0.09 : 0.11));
      } else {
        // 3 Teammates: spread horizontally on left-rear (idx 0, 1) and direct-rear (idx 2)
        if (idx === 0) {
          tx = Math.max(Math.round(20 * teammateScale), Math.round(w * 0.095));
          ty = floorY - Math.round(h * 0.09);
        } else if (idx === 1) {
          tx = Math.round(w * 0.175);
          ty = floorY - Math.round(h * 0.11);
        } else {
          tx = Math.round(w * 0.255);
          ty = floorY - Math.round(h * 0.09);
        }
      }

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(teammateScale, teammateScale);

      if (!teammate.hasWorkedOutToday) {
        ctx.filter = 'grayscale(0.40)';
      }

      drawMapleChibiAvatar(ctx, {
        x: -28,
        y: -60,
        bodyStage: teammate.bodyStage,
        equipped: teammate.equipped,
        state: state.phase === 'hit' ? 'CHEER' : 'IDLE',
        facingRight: true,
        frameTick: Math.floor(now / 16),
      });

      ctx.restore();

      // Unattended teammate: draw bold and crisp Zzz above head
      if (!teammate.hasWorkedOutToday) {
        ctx.save();
        const headTopY = ty - 56 * teammateScale;
        const zOff = state.reducedMotion ? 0 : Math.sin(now / 300 + idx * 1.5) * 3;
        const zX = tx + 4;
        const zY = headTopY - 4 + zOff;
        ctx.font = '900 13px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText('Zzz', zX, zY);
        ctx.fillStyle = '#4f46e5';
        ctx.fillText('Zzz', zX, zY);
        ctx.restore();
      }
    });
  }

  // 2. Draw Hero in front (scale 1.0)
  ctx.save();
  ctx.translate(heroBaseX + lunge, floorY + 2);
  ctx.scale(scale, scale);
  drawMapleChibiAvatar(ctx, {
    x: -28,
    y: -60,
    bodyStage: state.bodyStage,
    equipped: state.equipped,
    state: state.phase === 'idle' ? 'CURL' : 'CHEER',
    facingRight: true,
    frameTick: Math.floor(now / 16),
  });
  ctx.restore();
  ctx.restore();
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, floorY: number, scale: number) {
  ctx.save();
  ctx.translate(x, floorY);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#8d5a32';
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-2, -40, 4, -78);
  ctx.lineTo(12, -74);
  ctx.quadraticCurveTo(4, -36, 8, 0);
  ctx.fill();
  ctx.fillStyle = '#3f9a62';
  for (const angle of [-2.4, -1.8, -1.15, -0.55, 0.15]) {
    ctx.save();
    ctx.translate(6, -78);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -22, 7, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
