import React, { useEffect, useRef, useState } from 'react';
import { AdventureBoss, AvatarBodyStage, EquipSlot } from '../../../config/catalogConfig';
import { drawBossSprite, drawCreamChibiSilhouette, drawMapleChibiAvatar } from '../../../game/pixelSpriteDrawer';
import { TeammatePeekCard } from '../../../components/adventure/TeammatePeekCard';
import { useGameStore } from '../../../stores/useGameStore';

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
  avatarStatus?: 'ready' | 'partial' | 'syncing';
  bodyStage?: AvatarBodyStage;
  equipped?: Partial<Record<EquipSlot, string>>;
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
  peekMemberId?: string | null;
}

interface BattleStageCanvasProps extends DrawState {
  floatHit: StrikeFloat | null;
  hud: React.ReactNode;
  onPeekMember?: (id: string | null) => void;
}

export function getBattleTeammatePos(
  w: number,
  h: number,
  floorY: number,
  teammateScale: number,
  idx: number,
  total: number,
  heroBaseX: number = Math.round(w * 0.42),
) {
  let dx = -0.20 * w;
  let dy = -0.12 * h;

  if (total === 1) {
    dx = -0.20 * w;
    dy = -0.12 * h;
  } else if (total === 2) {
    if (idx === 0) {
      dx = -0.24 * w;
      dy = -0.10 * h;
    } else {
      dx = -0.14 * w;
      dy = -0.16 * h;
    }
  } else {
    if (idx === 0) {
      dx = -0.28 * w;
      dy = -0.10 * h;
    } else if (idx === 1) {
      dx = -0.20 * w;
      dy = -0.17 * h;
    } else {
      dx = -0.16 * w;
      dy = -0.13 * h;
    }
  }

  let tx = Math.round(heroBaseX + dx);
  const ty = Math.round(floorY + dy);

  // 每位隊友腳底 x ≤ heroBaseX-0.16w
  const maxX = Math.round(heroBaseX - 0.16 * w);
  if (tx > maxX) {
    tx = maxX;
  }

  // 若超出左緣只把最左側隊友 clamp 到 28*teammateScale+8，不得把右側隊友往主角擠
  if (idx === 0) {
    const minLeft = Math.round(28 * teammateScale + 8);
    if (tx < minLeft) {
      tx = minLeft;
    }
  }

  return { tx, ty };
}

export const BattleStageCanvas: React.FC<BattleStageCanvasProps> = ({
  floatHit,
  hud,
  reducedMotion,
  peekMemberId,
  onPeekMember,
  ...drawProps
}) => {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const [layoutTick, setLayoutTick] = useState(0);

  const effectivePeekId = peekMemberId !== undefined ? peekMemberId : store.peekMemberId;
  const peekMember = effectivePeekId
    ? store.squadMembers.find((m) => m.id === effectivePeekId)
    : null;

  const drawRef = useRef<DrawState>({ ...drawProps, reducedMotion, peekMemberId: effectivePeekId });
  drawRef.current = { ...drawProps, reducedMotion, peekMemberId: effectivePeekId };

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
      setLayoutTick((t) => t + 1);
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

  const handleStageClick = () => {
    if (onPeekMember) {
      onPeekMember(null);
    } else {
      store.setPeekMemberId(null);
    }
  };

  const handleTeammateClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextId = effectivePeekId === id ? null : id;
    if (onPeekMember) {
      onPeekMember(nextId);
    } else {
      store.setPeekMemberId(nextId);
    }
  };

  return (
    <div
      ref={wrapRef}
      onClick={handleStageClick}
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

      {/* DOM Hit Areas for Back-row Teammates (8px outer expanded) */}
      {sizeRef.current.w > 0 &&
        drawProps.teammates &&
        drawProps.teammates.slice(0, 3).map((tm, idx) => {
          const w = sizeRef.current.w;
          const h = sizeRef.current.h;
          const floorY = h * 0.8;
          const scale = Math.max(1.85, Math.min(w / 165, h / 210, 2.5));
          const teammateScale = scale * 0.65;
          const total = Math.min(3, drawProps.teammates!.length);
          const heroBaseX = Math.round(w * 0.42);
          const { tx, ty } = getBattleTeammatePos(w, h, floorY, teammateScale, idx, total, heroBaseX);
          const hitW = 56 * teammateScale + 16;
          const hitH = 65 * teammateScale + 16;
          const hitX = tx - 28 * teammateScale - 8;
          const hitY = ty - 60 * teammateScale - 8;

          return (
            <button
              key={tm.id}
              type="button"
              onClick={(e) => handleTeammateClick(tm.id, e)}
              aria-label={`預覽隊友 ${tm.nameZh}`}
              style={{
                left: `${hitX}px`,
                top: `${hitY}px`,
                width: `${hitW}px`,
                height: `${hitH}px`,
              }}
              className="absolute z-10 cursor-pointer rounded-2xl border border-transparent transition-transform duration-120 active:scale-95"
            />
          );
        })}

      {/* TeammatePeekCard at bottom-left */}
      {peekMember && (
        <TeammatePeekCard
          member={peekMember}
          onClose={() => {
            if (onPeekMember) onPeekMember(null);
            else store.setPeekMemberId(null);
          }}
        />
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
  const heroBaseX = Math.round(w * 0.42);

  // 1. Draw Teammates FIRST (scale 0.65, in back-left and direct-rear, sorted by ty ascending)
  if (teammates && teammates.length > 0) {
    const activeTeammates = teammates.slice(0, 3);
    const teammateScale = scale * 0.65;
    const positionedTeammates = activeTeammates.map((teammate, originalIdx) => {
      const pos = getBattleTeammatePos(
        w,
        h,
        floorY,
        teammateScale,
        originalIdx,
        activeTeammates.length,
        heroBaseX,
      );
      return { teammate, originalIdx, pos };
    });

    // Draw in order of ty ascending (smaller ty = higher up / farther away drawn first)
    const sortedTeammates = [...positionedTeammates].sort((a, b) => a.pos.ty - b.pos.ty);

    sortedTeammates.forEach(({ teammate, originalIdx, pos }) => {
      const { tx, ty } = pos;

      // Selected Teammate primary 2px aura ring (mockup 09)
      if (state.peekMemberId === teammate.id) {
        ctx.save();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(249, 115, 22, 0.7)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(tx, ty + 2, 22 * teammateScale, 7.5 * teammateScale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(tx, ty - 28 * teammateScale, 18 * teammateScale, 32 * teammateScale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(teammateScale, teammateScale);

      if (!teammate.hasWorkedOutToday) {
        ctx.filter = 'grayscale(1)';
        ctx.globalAlpha = 0.72;
      }

      if (teammate.avatarStatus === 'syncing' || !teammate.bodyStage) {
        drawCreamChibiSilhouette(ctx, {
          x: 0,
          y: 0,
          facingRight: true,
          nameZh: teammate.nameZh,
        });
      } else {
        drawMapleChibiAvatar(ctx, {
          x: -28,
          y: -60,
          bodyStage: teammate.bodyStage,
          equipped: teammate.equipped || {},
          state: state.phase === 'hit' ? 'CHEER' : 'IDLE',
          facingRight: true,
          frameTick: Math.floor(now / 16),
        });
      }

      ctx.restore();

      // Unattended teammate: draw bold and crisp Zzz 18-20px font-weight 900, white 4px stroke, fill #B45309
      if (!teammate.hasWorkedOutToday) {
        ctx.save();
        const headTopY = ty - 60 * teammateScale;
        const zOff = state.reducedMotion ? 0 : Math.sin(now / 300 + originalIdx * 1.5) * 3;
        const zX = tx + 10;
        const zY = headTopY - 8 + zOff;
        ctx.font = '900 18px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText('Zzz', zX, zY);
        ctx.fillStyle = '#B45309';
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
