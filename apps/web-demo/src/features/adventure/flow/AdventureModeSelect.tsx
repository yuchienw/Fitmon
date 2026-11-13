import React, { useEffect, useRef } from 'react';
import { Sparkles, Users, User, ChevronRight, Trophy, Gift, Wrench } from 'lucide-react';
import { useGameStore, resolveSquadMemberAvatar } from '../../../stores/useGameStore';
import { drawCreamChibiSilhouette, drawMapleChibiAvatar } from '../../../game/pixelSpriteDrawer';
import { getVenueForStage } from './venueConfig';
import { AvatarBodyStage, EquipSlot } from '../../../config/catalogConfig';

interface ModeIslandCanvasProps {
  hero: {
    bodyStage: AvatarBodyStage;
    equipped: Record<EquipSlot, string>;
  };
  teammates?: {
    id: string;
    avatarStatus?: 'ready' | 'partial' | 'syncing';
    bodyStage?: AvatarBodyStage;
    equipped?: Partial<Record<EquipSlot, string>>;
    hasWorkedOutToday: boolean;
  }[];
}

const ModeIslandCanvas: React.FC<ModeIslandCanvasProps> = ({ hero, teammates }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Sky & Sun
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#fef9ec');
      skyGrad.addColorStop(1, '#f7e6ca');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun
      ctx.save();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.22, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Sun rays
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + now / 2400;
        const x1 = w * 0.82 + Math.cos(angle) * 18;
        const y1 = h * 0.22 + Math.sin(angle) * 18;
        const x2 = w * 0.82 + Math.cos(angle) * 23;
        const y2 = h * 0.22 + Math.sin(angle) * 23;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(w * 0.2, h * 0.26, 28, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.26, h * 0.22, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Floating Island
      const islandY = h * 0.72;
      // Cliff base (dirt/rock)
      ctx.fillStyle = '#8c6742';
      ctx.strokeStyle = '#5a3d24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, islandY);
      ctx.bezierCurveTo(w * 0.12, islandY + 36, w * 0.88, islandY + 36, w * 0.9, islandY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rock details
      ctx.fillStyle = '#6b4c2d';
      for (let rx = w * 0.2; rx < w * 0.82; rx += 28) {
        ctx.fillRect(rx, islandY + 10, 16, 12);
      }

      // Top grass platform
      ctx.fillStyle = '#65a30d';
      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, islandY, w * 0.42, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Grass fringe
      ctx.fillStyle = '#84cc16';
      for (let gx = w * 0.14; gx <= w * 0.86; gx += 12) {
        ctx.fillRect(gx, islandY + 2, 8, 4);
      }

      // 3. Palm Trees on flanks
      drawMiniPalm(ctx, w * 0.16, islandY - 6, 0.55);
      drawMiniPalm(ctx, w * 0.84, islandY - 6, 0.5, true);

      // 4. Characters
      const isSquad = teammates && teammates.length > 0;

      if (isSquad) {
        // Draw Teammates in back
        const activeTeammates = teammates.slice(0, 3);
        activeTeammates.forEach((tm, idx) => {
          let tx = w * 0.32;
          let ty = islandY - 8;
          if (activeTeammates.length === 1) {
            tx = w * 0.34;
            ty = islandY - 8;
          } else if (activeTeammates.length === 2) {
            tx = idx === 0 ? w * 0.28 : w * 0.72;
            ty = islandY - 8;
          } else {
            if (idx === 0) tx = w * 0.25;
            else if (idx === 1) tx = w * 0.75;
            else tx = w * 0.38;
            ty = islandY - 10;
          }

          ctx.save();
          ctx.translate(tx, ty);
          ctx.scale(1.3, 1.3);

          if (!tm.hasWorkedOutToday) {
            ctx.filter = 'grayscale(1)';
            ctx.globalAlpha = 0.72;
          }

          if (tm.avatarStatus === 'syncing' || !tm.bodyStage) {
            drawCreamChibiSilhouette(ctx, {
              x: 0,
              y: 0,
              facingRight: idx === 0,
            });
          } else {
            drawMapleChibiAvatar(ctx, {
              x: -28,
              y: -60,
              bodyStage: tm.bodyStage,
              equipped: tm.equipped || {},
              state: 'IDLE',
              facingRight: idx === 0,
              frameTick: Math.floor(now / 16),
            });
          }
          ctx.restore();

          if (!tm.hasWorkedOutToday) {
            ctx.save();
            ctx.font = '900 13px "Noto Sans TC", sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#ffffff';
            ctx.strokeText('Zzz', tx + 6, ty - 70);
            ctx.fillStyle = '#B45309';
            ctx.fillText('Zzz', tx + 6, ty - 70);
            ctx.restore();
          }
        });

        // Hero in front
        ctx.save();
        ctx.translate(w * 0.5, islandY + 6);
        ctx.scale(1.9, 1.9);
        drawMapleChibiAvatar(ctx, {
          x: -28,
          y: -60,
          bodyStage: hero.bodyStage,
          equipped: hero.equipped,
          state: 'IDLE',
          facingRight: true,
          frameTick: Math.floor(now / 16),
        });
        ctx.restore();
      } else {
        // Solo: Single Hero standing proud in center
        ctx.save();
        ctx.translate(w * 0.5, islandY + 4);
        ctx.scale(2.1, 2.1);
        drawMapleChibiAvatar(ctx, {
          x: -28,
          y: -60,
          bodyStage: hero.bodyStage,
          equipped: hero.equipped,
          state: 'IDLE',
          facingRight: true,
          frameTick: Math.floor(now / 16),
        });
        ctx.restore();
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [hero, teammates]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={180}
      className="block h-44 w-full rounded-2xl object-cover"
    />
  );
};

function drawMiniPalm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  flip = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -scale : scale, scale);
  // Trunk
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.quadraticCurveTo(-2, -30, 4, -60);
  ctx.lineTo(10, -58);
  ctx.quadraticCurveTo(4, -28, 7, 0);
  ctx.fill();
  // Leaves
  ctx.fillStyle = '#15803d';
  for (const angle of [-2.4, -1.8, -1.2, -0.6, 0.1]) {
    ctx.save();
    ctx.translate(6, -60);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -18, 5, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

interface AdventureModeSelectProps {
  onSelectMode: (mode: 'solo' | 'squad') => void;
  onOpenSubTab: (tab: 'combat_stats' | 'squad_invite' | 'ladder') => void;
  onOpenLootBag: () => void;
  onOpenDevCheat: () => void;
}

export const AdventureModeSelect: React.FC<AdventureModeSelectProps> = ({
  onSelectMode,
  onOpenSubTab,
  onOpenLootBag,
  onOpenDevCheat,
}) => {
  const store = useGameStore();

  const soloVenue = getVenueForStage(store.soloStage);
  const squadVenue = getVenueForStage(store.squadStage);

  const squadTeammates = store.squadMembers.slice(0, 3).map((m) => {
    const avatar = resolveSquadMemberAvatar(m);
    return {
      id: m.id,
      avatarStatus: avatar.status,
      bodyStage: avatar.bodyStage,
      equipped: avatar.equipped,
      hasWorkedOutToday: m.hasWorkedOutToday,
    };
  });

  return (
    <div className="adventure-shell flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 py-3 pb-8">
      {/* Top Header / Quick Nav */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black text-foreground">冒險之島</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenSubTab('combat_stats')}
            className="flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] font-black text-foreground shadow-sm active:scale-95"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            <span>素質</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenSubTab('ladder')}
            className="flex h-7 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] font-black text-foreground shadow-sm active:scale-95"
          >
            <Trophy className="h-3 w-3 text-secondary" />
            <span>天梯</span>
          </button>
          <button
            type="button"
            onClick={onOpenLootBag}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm active:scale-95"
            title="寶物袋"
          >
            <Gift className="h-3.5 w-3.5 text-rose-500" />
          </button>
          <button
            type="button"
            onClick={onOpenDevCheat}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm active:scale-95"
            title="測試外掛"
          >
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="mb-3.5 text-center">
        <h1 className="flex items-center justify-center gap-2 text-xl font-black tracking-tight text-foreground">
          <span className="text-primary">✦</span>
          <span>選擇冒險模式</span>
          <span className="text-primary">✦</span>
        </h1>
        <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
          單人專注推進，或與戰友組隊連攜狂暴討伐
        </p>
      </div>

      {/* Mode Cards */}
      <div className="space-y-3.5">
        {/* 1. SOLO ADVENTURE CARD */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectMode('solo')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectMode('solo');
          }}
          className="retro-box group relative block cursor-pointer overflow-hidden rounded-2xl transition-all duration-150 active:translate-y-0.5 hover:border-primary"
        >
          {/* Card Badge Ribbon */}
          <div className="absolute left-0 top-0 z-10 rounded-br-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 shadow-md">
            <span className="flex items-center gap-1 text-[11px] font-black text-white">
              <User className="h-3 w-3" />
              單人冒險
            </span>
          </div>

          {/* Island Canvas */}
          <div className="overflow-hidden bg-[#faf6f0]">
            <ModeIslandCanvas hero={{ bodyStage: store.bodyStage, equipped: store.equipped }} />
          </div>

          {/* Card Footer Bar */}
          <div className="flex items-center justify-between border-t-2 border-border bg-card px-3.5 py-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-black text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>自己挑戰</span>
              </div>
              <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                進度：第 {store.soloStage} 關 · {soloVenue.nameZh}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-700 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <span>出發</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* 2. SQUAD ADVENTURE CARD */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectMode('squad')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectMode('squad');
          }}
          className="retro-box group relative block cursor-pointer overflow-hidden rounded-2xl transition-all duration-150 active:translate-y-0.5 hover:border-primary"
        >
          {/* Card Badge Ribbon */}
          <div className="absolute left-0 top-0 z-10 rounded-br-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-1 shadow-md">
            <span className="flex items-center gap-1 text-[11px] font-black text-white">
              <Users className="h-3 w-3" />
              組隊冒險
            </span>
          </div>

          {/* Island Canvas */}
          <div className="overflow-hidden bg-[#faf6f0]">
            <ModeIslandCanvas
              hero={{ bodyStage: store.bodyStage, equipped: store.equipped }}
              teammates={squadTeammates}
            />
          </div>

          {/* Card Footer Bar */}
          <div className="flex items-center justify-between border-t-2 border-border bg-card px-3.5 py-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-black text-foreground">
                <Users className="h-4 w-4 text-emerald-600" />
                <span>和朋友一起打</span>
              </div>
              <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                進度：第 {store.squadStage} 關 · {squadVenue.nameZh}（{1 + store.squadMembers.length}/4 人）
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <span>組隊確認</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
