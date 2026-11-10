import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Lock,
  Check,
  MapPin,
  ChevronRight,
  Coins,
} from 'lucide-react';
import { useGameStore, resolveSquadMemberAvatar } from '../../../stores/useGameStore';
import { drawMapleChibiAvatar } from '../../../game/pixelSpriteDrawer';
import { GYM_VENUES, getFloorForStage } from './venueConfig';
import { ADVENTURE_BOSS_CATALOG } from '../../../config/catalogConfig';

interface GymIslandMapScreenProps {
  mode: 'solo' | 'squad';
  onBack: () => void;
  onEnterVenueTower: (venueIndex: number) => void;
}

export function getAvatarStandPercent(venueIdx: number): { x: number; y: number } {
  switch (venueIdx) {
    case 0:
      return { x: 48, y: 19 };
    case 1:
      return { x: 52, y: 22 };
    case 2:
      return { x: 48, y: 47 };
    case 3:
      return { x: 52, y: 49 };
    case 4:
      return { x: 48, y: 76 };
    case 5:
      return { x: 52, y: 78 };
    default:
      return { x: 50, y: 50 };
  }
}

export const GymIslandMapScreen: React.FC<GymIslandMapScreenProps> = ({
  mode,
  onBack,
  onEnterVenueTower,
}) => {
  const store = useGameStore();
  const isSolo = mode === 'solo';
  const stage = isSolo ? store.soloStage : store.squadStage;

  const currentVenueIdx = Math.max(0, (stage - 1) % GYM_VENUES.length);
  const currentFloor = getFloorForStage(stage);

  const [selectedVenueIdx, setSelectedVenueIdx] = useState<number>(currentVenueIdx);
  const selectedVenue = GYM_VENUES[selectedVenueIdx];
  const selectedBoss = ADVENTURE_BOSS_CATALOG[selectedVenue.bossIndex];

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Teammates data
  const teammates = isSolo
    ? []
    : store.squadMembers.slice(0, 3).map((m) => {
        const avatar = resolveSquadMemberAvatar(m);
        return {
          id: m.id,
          nameZh: m.nameZh,
          bodyStage: m.bodyStage || avatar.bodyStage,
          equipped: m.equipped || avatar.equipped,
          hasWorkedOutToday: m.hasWorkedOutToday,
        };
      });

  // Calculate status for each venue
  const getNodeStatus = (venueIdx: number): 'cleared' | 'current' | 'locked' => {
    if (venueIdx === currentVenueIdx) return 'current';
    if (venueIdx < currentVenueIdx) return 'cleared';
    return 'locked';
  };

  const selectedStatus = getNodeStatus(selectedVenueIdx);
  const currentStandPercent = getAvatarStandPercent(currentVenueIdx);

  // Draw Island Map, Landmarks & Characters
  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncSize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    syncSize();
    window.addEventListener('resize', syncSize);

    const render = (now: number) => {
      syncSize();
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = rect.width;
      const h = rect.height;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // 1. Tropical Ocean Water Background
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#bae6fd');
      oceanGrad.addColorStop(0.5, '#7dd3fc');
      oceanGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);

      // Animated soft wave lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 7; i++) {
        const wy = 30 + i * 58;
        const offset = Math.sin(now / 1100 + i * 1.2) * 8;
        ctx.beginPath();
        ctx.moveTo(10, wy + offset);
        ctx.quadraticCurveTo(w * 0.35, wy - 7 + offset, w * 0.65, wy + 4 + offset);
        ctx.quadraticCurveTo(w * 0.85, wy - 5 + offset, w - 10, wy + offset);
        ctx.stroke();
      }

      // 2. Island Landmass Layers
      // Drop Shadow into deep sea
      ctx.save();
      ctx.fillStyle = 'rgba(12, 74, 110, 0.28)';
      ctx.translate(0, 7);
      drawOrganicIslandPath(ctx, w, h, 0);
      ctx.fill();
      ctx.restore();

      // Layer A: Rocky Cliff Edge
      ctx.fillStyle = '#92400e';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      drawOrganicIslandPath(ctx, w, h, 0);
      ctx.fill();
      ctx.stroke();

      // Layer B: Coastal Sand Beach
      ctx.fillStyle = '#fde68a';
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 2;
      drawOrganicIslandPath(ctx, w, h, 7);
      ctx.fill();
      ctx.stroke();

      // Foam Crest line hugging coastline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      drawOrganicIslandPath(ctx, w, h, 3.5);
      ctx.stroke();

      // Layer C: Lush Green Interior
      const grassGrad = ctx.createLinearGradient(0, 0, 0, h);
      grassGrad.addColorStop(0, '#84cc16');
      grassGrad.addColorStop(1, '#65a30d');
      ctx.fillStyle = grassGrad;
      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 3;
      drawOrganicIslandPath(ctx, w, h, 15);
      ctx.fill();
      ctx.stroke();

      // Layer D: Topographic Sunny Plateau
      ctx.fillStyle = 'rgba(163, 230, 53, 0.35)';
      drawOrganicIslandPath(ctx, w, h, 26);
      ctx.fill();

      // Mini palm trees at capes
      drawMiniPalm(ctx, w * 0.08, h * 0.28, 0.65);
      drawMiniPalm(ctx, w * 0.92, h * 0.30, 0.65);
      drawMiniPalm(ctx, w * 0.09, h * 0.88, 0.65);
      drawMiniPalm(ctx, w * 0.90, h * 0.88, 0.65);

      // 3. Sandy Trails Connecting the 6 Venues
      const pts = GYM_VENUES.map((v) => ({
        x: (v.mapCoords.x / 100) * w,
        y: (v.mapCoords.y / 100) * h,
      }));

      // Main Winding Sandy Trail
      ctx.save();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.quadraticCurveTo(w * 0.5, h * 0.12, pts[1].x, pts[1].y);
      ctx.quadraticCurveTo(w * 0.74, h * 0.34, pts[3].x, pts[3].y);
      ctx.quadraticCurveTo(w * 0.50, h * 0.46, pts[2].x, pts[2].y);
      ctx.quadraticCurveTo(w * 0.32, h * 0.64, pts[4].x, pts[4].y);
      ctx.quadraticCurveTo(w * 0.52, h * 0.73, pts[5].x, pts[5].y);
      ctx.stroke();

      // Wooden Plank / Trail Dashes
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 4. Draw 6 Canvas Landmarks Beside the Venues
      // Venue 0: Couch Lounge (left of button)
      drawSofaLandmark(ctx, w * 0.12, h * 0.16, 1.0);
      // Venue 1: Boba Station (right of button)
      drawBobaLandmark(ctx, w * 0.88, h * 0.19, 1.0);
      // Venue 2: Phone-Ghost Booth (left of button)
      drawPhoneBoothLandmark(ctx, w * 0.12, h * 0.46, 1.0);
      // Venue 3: Running Track Hall (right of button)
      drawTrackLandmark(ctx, w * 0.88, h * 0.49, 1.0);
      // Venue 4: Alarm-Clock Climbing Tower (left of button)
      drawClockTowerLandmark(ctx, w * 0.12, h * 0.78, 1.0);
      // Venue 5: Fried-Chicken Throne Gym (right of button)
      drawChickenThroneLandmark(ctx, w * 0.88, h * 0.80, 1.0);

      // 5. Active Avatar Staging Clearing Platform
      const standPercent = getAvatarStandPercent(currentVenueIdx);
      const standX = (standPercent.x / 100) * w;
      const standY = (standPercent.y / 100) * h;
      const currentPos = pts[currentVenueIdx];

      // Feeder trail connecting current venue button to the avatar platform
      if (currentPos) {
        ctx.save();
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
        ctx.lineWidth = 4;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(currentPos.x, currentPos.y);
        ctx.lineTo(standX, standY);
        ctx.stroke();
        ctx.restore();
      }

      // Wooden staging deck & pulsing amber halo
      ctx.save();
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(standX, standY + 2, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(standX, standY + 2, 28, 10.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      const pulse = Math.sin(now / 350) * 3;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(standX, standY + 2, 44 + pulse, 17 + pulse * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 6. Draw Paper-Doll Chibi Avatars in the Clearing
      // Hero scale 1.05 in front, Teammates scale 0.65 in rear-left & rear-right
      const heroScale = 1.05;
      const teammateScale = heroScale * 0.65;
      const facingRight = currentVenueIdx % 2 === 1;

      if (!isSolo && teammates.length > 0) {
        teammates.forEach((tm, idx) => {
          let tx = standX - 24;
          let ty = standY - 8;

          if (teammates.length === 1) {
            tx = facingRight ? standX - 24 : standX + 24;
            ty = standY - 8;
          } else if (teammates.length === 2) {
            tx = idx === 0 ? standX - 24 : standX + 24;
            ty = standY - 8;
          } else {
            // 3 teammates: spread across rear left, rear right, and far side
            if (idx === 0) {
              tx = standX - 24;
              ty = standY - 8;
            } else if (idx === 1) {
              tx = standX + 24;
              ty = standY - 8;
            } else {
              tx = facingRight ? standX - 44 : standX + 44;
              ty = standY - 6;
            }
          }

          ctx.save();
          ctx.translate(tx, ty);
          ctx.scale(teammateScale, teammateScale);

          if (!tm.hasWorkedOutToday) {
            ctx.filter = 'grayscale(0.40)';
          }

          drawMapleChibiAvatar(ctx, {
            x: -28,
            y: -60,
            bodyStage: tm.bodyStage,
            equipped: tm.equipped,
            state: 'IDLE',
            facingRight,
            frameTick: Math.floor(now / 16),
          });
          ctx.restore();

          // Unworked teammate: crisp bold floating Zzz above head
          if (!tm.hasWorkedOutToday) {
            ctx.save();
            const headTopY = ty - 56 * teammateScale;
            const zOff = Math.sin(now / 300 + idx * 1.5) * 2.5;
            const zX = tx + 3;
            const zY = headTopY - 3 + zOff;
            ctx.font = '900 11px "Noto Sans TC", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ffffff';
            ctx.strokeText('Zzz', zX, zY);
            ctx.fillStyle = '#6366f1';
            ctx.fillText('Zzz', zX, zY);
            ctx.restore();
          }
        });
      }

      // Draw Hero in front
      ctx.save();
      ctx.translate(standX, standY);
      ctx.scale(heroScale, heroScale);
      drawMapleChibiAvatar(ctx, {
        x: -28,
        y: -60,
        bodyStage: store.bodyStage,
        equipped: store.equipped,
        state: 'IDLE',
        facingRight,
        frameTick: Math.floor(now / 16),
      });
      ctx.restore();

      ctx.restore(); // Restore dpr scale

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', syncSize);
    };
  }, [currentVenueIdx, isSolo, teammates, store.bodyStage, store.equipped]);

  return (
    <div className="adventure-shell relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top HUD */}
      <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b-2 border-border bg-card px-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回選單"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-transform active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-primary px-2 py-0.2 text-[10px] font-black text-primary-foreground">
                STAGE {stage}
              </span>
              <span className="text-xs font-black text-foreground">
                {GYM_VENUES[currentVenueIdx].nameZh}
              </span>
              <span className="rounded-md bg-muted px-1.5 text-[9px] font-bold text-muted-foreground">
                {isSolo ? '單人' : '組隊'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-black font-mono text-foreground">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span>{store.coins.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* Main Map Interactive Canvas & Overlay Nodes */}
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#7dd3fc]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
        />

        {/* YOU ARE HERE Pin floating safely above avatar squad in the clearing */}
        <div
          style={{
            left: `${currentStandPercent.x}%`,
            top: `${currentStandPercent.y}%`,
            transform: 'translate(-50%, -74px)',
          }}
          className="pointer-events-none absolute z-20 whitespace-nowrap animate-bounce"
        >
          <div className="flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-lg border border-white/80">
            <MapPin className="h-3 w-3 fill-white" />
            <span>你在這裡</span>
          </div>
          <div className="mx-auto -mt-0.5 h-1.5 w-1.5 rotate-45 bg-rose-500 border-r border-b border-white/80" />
        </div>

        {/* 6 Interactive Venue Nodes Overlay */}
        {GYM_VENUES.map((venue) => {
          const status = getNodeStatus(venue.index);
          const isSelected = selectedVenueIdx === venue.index;
          const isCurrent = status === 'current';
          const isCleared = status === 'cleared';
          const isLocked = status === 'locked';

          return (
            <div
              key={venue.index}
              style={{
                left: `${venue.mapCoords.x}%`,
                top: `${venue.mapCoords.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-10 select-none"
            >
              {/* Node Button Card */}
              <button
                type="button"
                onClick={() => setSelectedVenueIdx(venue.index)}
                className={`group flex flex-col items-center rounded-2xl p-1.5 transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'ring-4 ring-primary scale-105 shadow-xl'
                    : 'shadow-md hover:scale-102'
                } ${
                  isCurrent
                    ? 'border-2 border-orange-500 bg-orange-50 ring-4 ring-orange-300 shadow-xl text-foreground'
                    : isCleared
                    ? 'border-2 border-emerald-500 bg-white text-foreground'
                    : 'border-2 border-slate-300 bg-slate-100 text-slate-500 opacity-90'
                }`}
              >
                {/* Node Top Row: Number + Status */}
                <div className="flex items-center gap-1">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black shadow-sm ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isCleared
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-400 text-white'
                    }`}
                  >
                    {isCleared ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : venue.index + 1}
                  </div>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                </div>

                {/* Venue Name Pill */}
                <div
                  className={`mt-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                    isCurrent
                      ? 'bg-primary/10 text-primary font-bold'
                      : isCleared
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-500'
                  }`}
                >
                  {venue.nameZh}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Venue Preview Sheet / Bottom Card */}
      <div className="z-10 shrink-0 border-t-2 border-border bg-card p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-black text-primary-foreground">
                STAGE {selectedVenue.index + 1 + (currentFloor - 1) * 6}
              </span>
              <h2 className="truncate text-sm font-black text-foreground">
                {selectedVenue.nameZh}
              </h2>
              <span className="text-[10px] font-bold text-muted-foreground">
                ({selectedVenue.nameEn})
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {selectedVenue.descriptionZh}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-bold">
              <span className="text-foreground">駐場 Boss：{selectedBoss.nameZh}</span>
              <span
                className={`rounded px-1 text-[9px] font-black ${
                  selectedStatus === 'current'
                    ? 'bg-amber-100 text-amber-800'
                    : selectedStatus === 'cleared'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectedStatus === 'current'
                  ? '🎯 當前挑戰'
                  : selectedStatus === 'cleared'
                  ? '✅ 已解鎖通關'
                  : '🔒 尚未解鎖'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={selectedStatus === 'locked'}
            onClick={() => onEnterVenueTower(selectedVenueIdx)}
            className={`retro-btn flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-black shadow active:translate-y-0.5 ${
              selectedStatus === 'locked'
                ? 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed'
                : 'bg-gradient-to-b from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600'
            }`}
          >
            <span>
              {selectedStatus === 'current'
                ? '進入當前場館'
                : selectedStatus === 'cleared'
                ? '進入場館查看'
                : '場館尚未解鎖'}
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Helper Drawing Functions ---------------- */

/**
 * Organic multi-lobed gym island shape
 */
function drawOrganicIslandPath(ctx: CanvasRenderingContext2D, w: number, h: number, inset: number = 0) {
  ctx.beginPath();
  const topY = 0.08 * h + inset;
  const botY = 0.92 * h - inset;
  const leftX = 0.06 * w + inset;
  const rightX = 0.94 * w - inset;
  const midX = 0.50 * w;

  ctx.moveTo(midX, topY);
  // Cape 1 (Top-right Boba)
  ctx.bezierCurveTo(rightX * 0.78, topY, rightX, 0.12 * h, rightX, 0.22 * h);
  ctx.bezierCurveTo(rightX, 0.32 * h, rightX * 0.84, 0.36 * h, rightX * 0.88, 0.44 * h);
  // Cape 3 (Mid-right Track)
  ctx.bezierCurveTo(rightX, 0.48 * h, rightX, 0.56 * h, rightX * 0.88, 0.64 * h);
  // Cape 5 (Bot-right Throne)
  ctx.bezierCurveTo(rightX * 0.82, 0.72 * h, rightX, 0.78 * h, rightX * 0.88, 0.86 * h);
  ctx.bezierCurveTo(rightX * 0.76, botY, midX * 1.2, botY, midX, botY - 0.02 * h);
  // Cape 4 (Bot-left Tower)
  ctx.bezierCurveTo(midX * 0.8, botY, leftX * 1.3, botY, leftX, 0.86 * h);
  ctx.bezierCurveTo(leftX * 1.2, 0.76 * h, leftX * 0.9, 0.68 * h, leftX * 0.9, 0.62 * h);
  // Cape 2 (Mid-left Phone)
  ctx.bezierCurveTo(leftX * 0.8, 0.54 * h, leftX * 0.8, 0.44 * h, leftX * 1.1, 0.36 * h);
  // Cape 0 (Top-left Couch)
  ctx.bezierCurveTo(leftX * 0.8, 0.28 * h, leftX, 0.14 * h, leftX * 1.5, topY + 0.02 * h);
  ctx.bezierCurveTo(midX * 0.7, topY, midX * 0.9, topY, midX, topY);
  ctx.closePath();
}

/**
 * Mini Palm Tree for coastal capes
 */
function drawMiniPalm(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 0.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Trunk
  ctx.fillStyle = '#8d5a32';
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(-1, -18, 3, -36);
  ctx.lineTo(7, -34);
  ctx.quadraticCurveTo(3, -16, 4, 0);
  ctx.closePath();
  ctx.fill();
  // Fronds
  ctx.fillStyle = '#3f9a62';
  for (const angle of [-2.2, -1.5, -0.8, -0.1, 0.6]) {
    ctx.save();
    ctx.translate(4, -36);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -10, 3.5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Venue 0 Landmark: 懶人沙發 (Plush Retro Couch)
 */
function drawSofaLandmark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Ground shadow
  ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wooden feet
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-16, 10, 4, 5);
  ctx.fillRect(12, 10, 4, 5);

  // Sofa backrest
  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-18, -14, 36, 18, [8, 8, 4, 4]);
  ctx.fill();
  ctx.stroke();

  // Tufting indents
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(-8, -6, 2, 0, Math.PI * 2);
  ctx.arc(8, -6, 2, 0, Math.PI * 2);
  ctx.fill();

  // Seat cushion
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.roundRect(-19, 0, 38, 12, 5);
  ctx.fill();
  ctx.stroke();

  // Armrests
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(-22, -4, 8, 16, 4);
  ctx.roundRect(14, -4, 8, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Chip bag on couch
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(2, -8, 9, 10, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(4, -5, 5, 2);

  ctx.restore();
}

/**
 * Venue 1 Landmark: 珍奶補給站 (Giant Boba Cup)
 */
function drawBobaLandmark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Ground shadow
  ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cup body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-13, -8);
  ctx.lineTo(-9, 14);
  ctx.quadraticCurveTo(0, 17, 9, 14);
  ctx.lineTo(13, -8);
  ctx.closePath();
  const teaGrad = ctx.createLinearGradient(0, -8, 0, 15);
  teaGrad.addColorStop(0, '#fed7aa');
  teaGrad.addColorStop(0.5, '#fdba74');
  teaGrad.addColorStop(1, '#ea580c');
  ctx.fillStyle = teaGrad;
  ctx.fill();
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Tapioca pearls
  ctx.fillStyle = '#1e1b4b';
  for (const [px, py] of [[-5, 11], [0, 12], [5, 10], [-3, 6], [3, 7]]) {
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shine highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.roundRect(-10, -5, 3, 16, 1.5);
  ctx.fill();
  ctx.restore();

  // Dome lid
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -9, 13, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cup rim
  ctx.beginPath();
  ctx.roundRect(-15, -10, 30, 4, 2);
  ctx.fill();
  ctx.stroke();

  // Diagonal straw
  ctx.save();
  ctx.translate(1, -10);
  ctx.rotate(0.3);
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.roundRect(-3, -16, 6, 16, 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Venue 2 Landmark: 夜貓手機亭 (Stone Phone-Ghost Booth)
 */
function drawPhoneBoothLandmark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Ground shadow
  ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone kiosk main structure
  ctx.fillStyle = '#64748b';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-14, -14, 28, 28, 5);
  ctx.fill();
  ctx.stroke();

  // Roof cap
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.roundRect(-16, -18, 32, 6, 2);
  ctx.fill();
  ctx.stroke();

  // Antenna with glowing red tip
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -26);
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(0, -26, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Interior window (glowing blue screen)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-10, -10, 20, 22, 3);
  ctx.fill();
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(-8, -8, 16, 18, 2);
  ctx.fill();

  // Little Ghost inside
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, -2, 6, Math.PI, 0);
  ctx.lineTo(6, 6);
  ctx.quadraticCurveTo(3, 4, 0, 6);
  ctx.quadraticCurveTo(-3, 4, -6, 6);
  ctx.closePath();
  ctx.fill();

  // Ghost tired eyes & glowing smartphone
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4, -3, 2, 2);
  ctx.fillRect(2, -3, 2, 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-2, 2, 4, 5);

  ctx.restore();
}

/**
 * Venue 3 Landmark: 跑道館 (Athletic Running Track Oval)
 */
function drawTrackLandmark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Ground shadow
  ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Terracotta track oval
  ctx.fillStyle = '#ea580c';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner track lane lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 9.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner grass infield
  ctx.fillStyle = '#4ade80';
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Race finish flagpole
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(14, -14);
  ctx.stroke();

  // Red pennant flag
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(14, -14);
  ctx.lineTo(22, -10);
  ctx.lineTo(14, -6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Venue 4 Landmark: 攀岩爬梯館 (Alarm Clock Climbing Tower)
 */
function drawClockTowerLandmark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Ground shadow
  ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tower wooden body
  ctx.fillStyle = '#b45309';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, 14);
  ctx.lineTo(11, 14);
  ctx.lineTo(9, -8);
  ctx.lineTo(-9, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Climbing grips on the tower face
  const grips = [
    { x: -5, y: 10, color: '#ef4444' },
    { x: 4, y: 7, color: '#3b82f6' },
    { x: -3, y: 2, color: '#10b981' },
    { x: 5, y: -2, color: '#f59e0b' },
  ];
  for (const g of grips) {
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tower Roof Platform
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.roundRect(-12, -12, 24, 5, 2);
  ctx.fill();
  ctx.stroke();

  // Giant Alarm Clock head
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, -18, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Clock dial
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(0, -18, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // Clock hands (pointing to 7:00 wake up)
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -22);
  ctx.moveTo(0, -18);
  ctx.lineTo(-3, -15);
  ctx.stroke();

  // Twin bells on top
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(-7, -26, 3, 0, Math.PI * 2);
  ctx.arc(7, -26, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Venue 5 Landmark: 炸雞王座館 (Fried-Chicken Throne Gym)
 */
function drawChickenThroneLandmark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Ground shadow
  ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Golden Throne backrest
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-13, -14, 26, 20, [6, 6, 2, 2]);
  ctx.fill();
  ctx.stroke();

  // Crimson royal velvet cushion
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(-9, -10, 18, 14, 3);
  ctx.fill();

  // Throne seat cushion
  ctx.beginPath();
  ctx.roundRect(-13, 2, 26, 8, 3);
  ctx.fill();
  ctx.stroke();

  // Throne armrests
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.roundRect(-15, -2, 5, 12, 2);
  ctx.roundRect(10, -2, 5, 12, 2);
  ctx.fill();
  ctx.stroke();

  // Golden Fried Chicken Drumstick finial on throne peak
  ctx.save();
  ctx.translate(0, -18);
  ctx.fillStyle = '#ea580c';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, -2, 6, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.roundRect(-2, 2, 4, 5, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Pair of black dumbbells on ground
  ctx.fillStyle = '#1e293b';
  // Left dumbbell
  ctx.fillRect(-17, 12, 2, 5);
  ctx.fillRect(-12, 12, 2, 5);
  ctx.fillRect(-16, 14, 5, 1.5);
  // Right dumbbell
  ctx.fillRect(12, 12, 2, 5);
  ctx.fillRect(17, 12, 2, 5);
  ctx.fillRect(13, 14, 5, 1.5);

  ctx.restore();
}
