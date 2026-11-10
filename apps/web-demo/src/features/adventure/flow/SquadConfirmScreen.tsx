import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  Share2,
  Users,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { useGameStore, resolveSquadMemberAvatar, SquadMemberState } from '../../../stores/useGameStore';
import { drawMapleChibiAvatar } from '../../../game/pixelSpriteDrawer';
import { AvatarBodyStage, EquipSlot } from '../../../config/catalogConfig';

interface SquadConfirmScreenProps {
  onBack: () => void;
  onEnterGymIsland: () => void;
  onOpenSquadManage?: () => void;
}

export const SquadConfirmScreen: React.FC<SquadConfirmScreenProps> = ({
  onBack,
  onEnterGymIsland,
  onOpenSquadManage,
}) => {
  const store = useGameStore();
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const inviteCode = store.squadName ? `FIT${(Math.abs(store.squadName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 732)) % 900 + 100)}` : 'FIT732';

  const copyInviteCode = () => {
    navigator.clipboard?.writeText(inviteCode).catch(() => undefined);
    setCopied(true);
    store.showToast(`📋 已複製邀請碼：${inviteCode}，快發給朋友一起組隊！`);
    setTimeout(() => setCopied(false), 2000);
  };

  const teammates = store.squadMembers.slice(0, 3);
  const totalSlots = 3; // Max 3 teammates + 1 hero = 4 members

  // Canvas render for the paper-doll squad on a cozy wooden deck with mountain view
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
      const deckY = h * 0.76;
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
      ctx.save();
      ctx.translate(w * 0.86, deckY - 42);
      ctx.fillStyle = '#a07246';
      ctx.fillRect(-2, 0, 5, 42);
      ctx.fillStyle = '#fff9ed';
      ctx.strokeStyle = '#6e4420';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-28, -26, 56, 26, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a2810';
      ctx.font = 'bold 8px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Fitmon', 0, -14);
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('GYM ISLAND', 0, -5);
      ctx.restore();

      // 2. Draw Teammates FIRST (scale 0.65, in background, spread out)
      const baseScale = Math.min(w / 140, 2.5);
      const tmScale = baseScale * 0.65;

      teammates.forEach((tm, idx) => {
        const avatar = resolveSquadMemberAvatar(tm);
        const bodyStage = tm.bodyStage || avatar.bodyStage;
        const equipped = tm.equipped || avatar.equipped;

        let tx = w * 0.22;
        let ty = deckY - 10;
        if (teammates.length === 1) {
          tx = w * 0.24;
        } else if (teammates.length === 2) {
          tx = idx === 0 ? w * 0.2 : w * 0.78;
        } else {
          if (idx === 0) tx = w * 0.16;
          else if (idx === 1) tx = w * 0.68;
          else tx = w * 0.84;
        }

        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(tmScale, tmScale);

        if (!tm.hasWorkedOutToday) {
          ctx.filter = 'grayscale(0.40)';
        }

        drawMapleChibiAvatar(ctx, {
          x: -28,
          y: -60,
          bodyStage,
          equipped,
          state: 'IDLE',
          facingRight: tx < w * 0.5,
          frameTick: Math.floor(now / 16),
        });

        ctx.restore();

        // If unattended: draw cute Zzz
        if (!tm.hasWorkedOutToday) {
          ctx.save();
          const headTopY = ty - 64 * tmScale;
          const zOff = Math.sin(now / 320 + idx) * 3;
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Zzz', tx, headTopY + zOff);
          ctx.restore();
        }
      });

      // 3. Draw Hero in Front (scale 1.0)
      ctx.save();
      ctx.translate(w * 0.44, deckY + 4);
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

      {/* Main Chibi Canvas */}
      <div className="retro-box overflow-hidden rounded-2xl bg-[#faf6f0]">
        <canvas
          ref={canvasRef}
          width={360}
          height={210}
          className="block h-52 w-full object-cover"
        />
      </div>

      {/* Attendance & Name Capsules Row */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {/* Hero Card */}
        <div className="retro-box rounded-xl bg-card p-1.5">
          <div className="truncate text-[11px] font-black text-foreground">
            {store.nickname || '你'}
          </div>
          <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>隊長</span>
          </div>
        </div>

        {/* Teammates Cards */}
        {teammates.map((tm) => (
          <div key={tm.id} className="retro-box rounded-xl bg-card p-1.5">
            <div className="truncate text-[11px] font-black text-foreground">
              {tm.nameZh.split('·')[1]?.trim() || tm.nameZh}
            </div>
            {tm.hasWorkedOutToday ? (
              <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span>已運動</span>
              </div>
            ) : (
              <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                <Clock className="h-3 w-3" />
                <span>未運動</span>
              </div>
            )}
          </div>
        ))}

        {/* Empty Slots (Allowed! Can still enter gym island) */}
        {Array.from({ length: Math.max(0, totalSlots - teammates.length) }).map((_, idx) => (
          <div
            key={`empty_${idx}`}
            onClick={onOpenSquadManage}
            role="button"
            tabIndex={0}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 p-1.5 text-muted-foreground hover:bg-muted"
          >
            <UserPlus className="h-3.5 w-3.5 opacity-60" />
            <span className="mt-1 text-[10px] font-bold">尚有空槽</span>
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
