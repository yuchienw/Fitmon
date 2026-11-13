import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { useGameStore, resolveSquadMemberAvatar } from '../../../stores/useGameStore';
import { drawCreamChibiSilhouette, drawMapleChibiAvatar, drawZzz } from '../../../game/pixelSpriteDrawer';
import { TeammateStatusChip } from '../../../components/adventure/TeammateStatusChip';
import { TeammateHitRect } from '../../../components/adventure/memberStats';

interface SquadConfirmScreenProps {
  onBack: () => void;
  onEnterGymIsland: () => void;
  onOpenSquadManage?: () => void;
  onInspectTeammate?: (memberId: string) => void;
}

export const SquadConfirmScreen: React.FC<SquadConfirmScreenProps> = ({
  onBack,
  onEnterGymIsland,
  onOpenSquadManage,
  onInspectTeammate,
}) => {
  const store = useGameStore();
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const inviteCode = store.squadName
    ? `FIT${(Math.abs(store.squadName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 732)) % 900 + 100)}`
    : 'FIT732';

  const copyInviteCode = () => {
    navigator.clipboard?.writeText(inviteCode).catch(() => undefined);
    setCopied(true);
    store.showToast(`📋 已複製邀請碼：${inviteCode}，快發給朋友一起組隊！`);
    setTimeout(() => setCopied(false), 2000);
  };

  const teammates = store.squadMembers.slice(0, 3);
  const totalSlots = 3; // Max 3 teammates + 1 hero = 4 members

  // Slot x coordinates (canvas 360 x 210)
  // Slot 0: left rear (0.14), Slot 1: mid-right rear (0.58), Slot 2: far right rear (0.86)
  const slotXPositions = [360 * 0.14, 360 * 0.58, 360 * 0.86];
  const deckY = 210 * 0.76;
  const tmDeckY = deckY - 10;
  const baseScale = Math.min(360 / 140, 2.5);
  const tmScale = baseScale * 0.65;

  // Compute hit rects with 8px expansion (canvas coords -> percentage for DOM)
  const hitRects: TeammateHitRect[] = teammates.map((tm, idx) => {
    const tx = slotXPositions[idx];
    const ty = tmDeckY;
    const hitW = 56 * tmScale + 16;
    const hitH = 65 * tmScale + 16;
    const hitX = tx - 28 * tmScale - 8;
    const hitY = ty - 60 * tmScale - 8;
    return {
      memberId: tm.id,
      x: hitX,
      y: hitY,
      width: hitW,
      height: hitH,
    };
  });

  const handleInspect = (memberId: string) => {
    store.setInspectMemberId(memberId);
    onInspectTeammate?.(memberId);
  };

  // Canvas render for paper-doll squad on cozy terrace deck
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

      // 1. Cozy Daylight Terrace Background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#fefaf3');
      skyGrad.addColorStop(0.5, '#faedd7');
      skyGrad.addColorStop(1, '#ebd7ba');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Wooden Deck Floor
      ctx.fillStyle = '#caa373';
      ctx.fillRect(0, deckY, w, h - deckY);
      // Deck Planks
      ctx.strokeStyle = '#a47e4f';
      ctx.lineWidth = 1.5;
      for (let y = deckY; y < h; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Wooden Railing
      ctx.fillStyle = '#b6895b';
      ctx.fillRect(0, deckY - 14, w, 6);
      ctx.fillRect(0, deckY - 26, w, 5);
      for (let rx = 18; rx < w; rx += 48) {
        ctx.fillRect(rx, deckY - 26, 6, 26);
      }

      // Wooden Signpost "Fitmon GYM ISLAND" on right
      // QA-08 (5): When slot 3 (index 2, ~0.86w) has a teammate, move sign to ~0.95w and draw behind teammates, never overlapping standing slots (including silhouettes)
      const hasSlot3 = Boolean(teammates[2]);
      const signX = hasSlot3 ? Math.round(w * 0.95) : Math.round(w * 0.88);
      ctx.save();
      ctx.translate(signX, deckY - 42);
      ctx.fillStyle = '#a07246';
      ctx.fillRect(-2, 0, 5, 42);
      ctx.fillStyle = '#fff9ed';
      ctx.strokeStyle = '#6e4420';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const boardW = hasSlot3 ? 36 : 52;
      const boardLeft = hasSlot3 ? -18 : -26;
      ctx.roundRect(boardLeft, -26, boardW, 26, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a2810';
      ctx.font = 'bold 8px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Fitmon', boardLeft + boardW / 2, -14);
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('GYM ISLAND', boardLeft + boardW / 2, -5);
      ctx.restore();

      // 2. Draw Teammates & Empty Dashed Pedestals
      for (let i = 0; i < totalSlots; i++) {
        const tx = slotXPositions[i];
        const tm = teammates[i];

        if (tm) {
          // Soft pedestal underneath
          ctx.save();
          ctx.fillStyle = 'rgba(164, 126, 79, 0.3)';
          ctx.beginPath();
          ctx.ellipse(tx, tmDeckY + 2, 22 * tmScale, 8 * tmScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          const avatar = resolveSquadMemberAvatar(tm);

          ctx.save();
          ctx.translate(tx, tmDeckY);
          ctx.scale(tmScale, tmScale);

          if (!tm.hasWorkedOutToday) {
            ctx.filter = 'grayscale(1)';
            ctx.globalAlpha = 0.72;
          }

          if (avatar.status === 'syncing' || !avatar.bodyStage) {
            drawCreamChibiSilhouette(ctx, {
              x: 0,
              y: 0,
              facingRight: tx < w * 0.5,
              nameZh: tm.nameZh,
            });
          } else {
            drawMapleChibiAvatar(ctx, {
              x: -28,
              y: -60,
              bodyStage: avatar.bodyStage,
              equipped: avatar.equipped || {},
              state: 'IDLE',
              facingRight: tx < w * 0.5,
              frameTick: Math.floor(now / 16),
            });
          }

          ctx.restore();

          // QA-09: Shared drawZzz for unworked teammate
          if (!tm.hasWorkedOutToday) {
            const headTopY = tmDeckY - 60 * tmScale;
            const zOff = Math.sin(now / 320 + i) * 3;
            drawZzz(ctx, tx, headTopY + zOff, tmScale);
          }
        } else {
          // Empty slot: Dashed pedestal on deck
          ctx.save();
          ctx.strokeStyle = '#a47e4f';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(tx, tmDeckY - 4, 26, 9, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Draw Hero in Front (scale 1.0)
      const heroX = w * 0.44;
      const heroY = deckY + 4;
      ctx.save();
      ctx.fillStyle = 'rgba(164, 126, 79, 0.4)';
      ctx.beginPath();
      ctx.ellipse(heroX, heroY + 2, 28 * baseScale, 9 * baseScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(heroX, heroY);
      ctx.scale(baseScale, baseScale);
      drawMapleChibiAvatar(ctx, {
        x: -28,
        y: -60,
        bodyStage: store.bodyStage,
        equipped: store.equipped,
        state: 'IDLE',
        facingRight: true,
        frameTick: Math.floor(now / 16),
      });
      ctx.restore();

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [store.bodyStage, store.equipped, teammates]);

  return (
    <div className="adventure-shell flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 py-3 pb-8">
      {/* Top Header */}
      <div className="relative mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回選單"
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-sm active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="flex items-center gap-1.5 text-base font-black text-foreground">
          <span>確認隊伍</span>
          <span className="text-primary">🍁</span>
        </h1>
        <div className="w-8" />
      </div>

      {/* Main Chibi Canvas & Hit Areas */}
      <div className="retro-box relative overflow-hidden rounded-2xl bg-[#faf6f0]">
        <canvas
          ref={canvasRef}
          width={360}
          height={210}
          className="block h-52 w-full object-cover"
        />

        {/* DOM Hit Areas for Teammate Paper Dolls (8px outer expanded) */}
        {hitRects.map((rect, idx) => (
          <button
            key={rect.memberId}
            type="button"
            onClick={() => handleInspect(rect.memberId)}
            aria-label={`檢視隊友 ${teammates[idx]?.nameZh || ''} 的配裝與素質`}
            style={{
              left: `${(rect.x / 360) * 100}%`,
              top: `${(rect.y / 210) * 100}%`,
              width: `${(rect.width / 360) * 100}%`,
              height: `${(rect.height / 210) * 100}%`,
            }}
            className="absolute z-10 cursor-pointer rounded-2xl border border-transparent transition-transform duration-120 active:scale-95 hover:border-amber-400/40"
          />
        ))}

        {/* Chips placed at the feet of each teammate on the deck */}
        {slotXPositions.map((tx, idx) => {
          const tm = teammates[idx];
          if (tm) {
            return (
              <div
                key={`chip_${tm.id}`}
                style={{
                  left: `${(tx / 360) * 100}%`,
                  top: `${((deckY + 12) / 210) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
                className="absolute z-10"
              >
                <TeammateStatusChip
                  member={tm}
                  variant="combined"
                  onClick={() => handleInspect(tm.id)}
                />
              </div>
            );
          }
          return (
            <div
              key={`empty_chip_${idx}`}
              style={{
                left: `${(tx / 360) * 100}%`,
                top: `${((deckY + 12) / 210) * 100}%`,
                transform: 'translateX(-50%)',
              }}
              className="absolute z-10"
            >
              <TeammateStatusChip variant="empty" onClick={copyInviteCode} />
            </div>
          );
        })}
      </div>

      {/* Attendance & Name Capsules Row (Secondary Accessibility Touch Targets) */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {/* Hero Card (Click does NOT open teammate sheet) */}
        <div className="retro-box rounded-xl bg-card p-1.5">
          <div className="truncate text-[11px] font-black text-foreground">
            {store.nickname || '你'}
          </div>
          <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>隊長</span>
          </div>
        </div>

        {/* Teammates Cards (Clickable: opens same inspect sheet) */}
        {teammates.map((tm) => (
          <div
            key={tm.id}
            onClick={() => handleInspect(tm.id)}
            role="button"
            tabIndex={0}
            className="retro-box cursor-pointer rounded-xl bg-card p-1.5 transition-transform active:scale-95 hover:border-amber-400"
          >
            <div className="truncate text-[11px] font-black text-foreground">
              {tm.nameZh.split('·')[1]?.trim() || tm.nameZh}
            </div>
            <div className="mt-1">
              <TeammateStatusChip
                member={tm}
                variant="combined"
                onClick={() => handleInspect(tm.id)}
              />
            </div>
          </div>
        ))}

        {/* Empty Slots */}
        {Array.from({ length: Math.max(0, totalSlots - teammates.length) }).map((_, idx) => (
          <div
            key={`empty_slot_${idx}`}
            onClick={copyInviteCode}
            role="button"
            tabIndex={0}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 p-1.5 text-muted-foreground hover:bg-muted active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5 opacity-60 text-amber-700" />
            <span className="mt-1 text-[10px] font-bold text-amber-800">＋邀請</span>
          </div>
        ))}
      </div>

      {teammates.length < totalSlots && (
        <p className="mt-1.5 text-center text-[10px] font-bold text-muted-foreground">
          ℹ️ 空槽允許！隊伍未滿 4 人也能直接進入健身房島冒險。
        </p>
      )}

      {/* Invite Code Box */}
      <div className="retro-box mt-3.5 rounded-2xl bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-muted-foreground">
                邀請碼（分享給朋友）
              </div>
              <div className="font-mono text-lg font-black tracking-wider text-foreground">
                {inviteCode}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={copyInviteCode}
            aria-label="複製邀請碼"
            className="retro-btn flex h-9 items-center gap-1 rounded-xl bg-muted px-3 text-xs font-black text-foreground hover:bg-muted/80 active:translate-y-0.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">已複製</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>複製</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Enter Island CTA Button */}
      <div className="mt-4">
        <button
          type="button"
          onClick={onEnterGymIsland}
          className="retro-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 py-3.5 font-black text-white shadow-lg active:translate-y-0.5"
        >
          <span className="text-sm">進入健身房島</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
