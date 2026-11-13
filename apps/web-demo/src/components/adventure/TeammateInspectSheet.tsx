import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Bell,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import {
  useGameStore,
  SquadMemberState,
  SQUAD_CANDIDATE_POOL,
  resolveSquadMemberAvatar,
  resolveFriendProfileId,
} from '../../stores/useGameStore';
import { drawCreamChibiSilhouette, drawMapleChibiAvatar, drawZzz } from '../../game/pixelSpriteDrawer';
import { ItemSpriteThumbnail } from '../../game/ItemSpriteThumbnail';
import {
  calculateMemberStats,
  EQUIP_SLOTS_ORDER,
  getCosmeticItem,
} from './memberStats';
import { TeammateStatusChip } from './TeammateStatusChip';
import { usePrefersReducedMotion } from '../../features/adventure/battle/usePrefersReducedMotion';

export type InspectContext = 'squad_confirm' | 'island' | 'tower' | 'list';

interface TeammateInspectSheetProps {
  memberId: string | null;
  context?: InspectContext;
  onClose: () => void;
  onNavigateToSquadConfirm?: () => void;
  onSelectMember?: (memberId: string) => void;
}

export const TeammateInspectSheet: React.FC<TeammateInspectSheetProps> = ({
  memberId,
  context = 'squad_confirm',
  onClose,
  onNavigateToSquadConfirm,
  onSelectMember,
}) => {
  const store = useGameStore();
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Swipe-down dismiss gesture state
  const touchStartY = useRef<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);

  const squadMembers = store.squadMembers;
  const currentIdx = squadMembers.findIndex((m) => m.id === memberId);
  const member = currentIdx >= 0 ? squadMembers[currentIdx] : squadMembers[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (squadMembers.length <= 1) return;
    setIsSwitching(true);
    const nextIdx = (currentIdx - 1 + squadMembers.length) % squadMembers.length;
    onSelectMember?.(squadMembers[nextIdx].id);
    setTimeout(() => setIsSwitching(false), 160);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (squadMembers.length <= 1) return;
    setIsSwitching(true);
    const nextIdx = (currentIdx + 1) % squadMembers.length;
    onSelectMember?.(squadMembers[nextIdx].id);
    setTimeout(() => setIsSwitching(false), 160);
  };

  // Canvas drawing for center full-body chibi avatar (Scale 0.8)
  useEffect(() => {
    if (!member) return;
    let frame = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.86;

      // Soft sunlit pedestal
      ctx.save();
      ctx.fillStyle = 'rgba(217, 185, 142, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 38, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dfc8a8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      const avatar = resolveSquadMemberAvatar(member);

      // Draw Avatar (scale 0.8 display scale = 1.6 relative to standard canvas)
      const scale = 1.65;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      if (!member.hasWorkedOutToday) {
        ctx.filter = 'grayscale(1)';
        ctx.globalAlpha = 0.72;
      }

      if (avatar.status === 'syncing' || !avatar.bodyStage) {
        drawCreamChibiSilhouette(ctx, {
          x: 0,
          y: 0,
          facingRight: true,
          nameZh: member.nameZh,
        });
      } else {
        drawMapleChibiAvatar(ctx, {
          x: -28,
          y: -60,
          bodyStage: avatar.bodyStage,
          equipped: avatar.equipped || {},
          state: 'IDLE',
          facingRight: true,
          frameTick: Math.floor(now / 16),
        });
      }

      ctx.restore();

      // QA-09: Shared drawZzz for unworked teammate
      if (!member.hasWorkedOutToday) {
        const headTopY = cy - 60 * scale;
        const zOff = reducedMotion ? 0 : Math.sin(now / 320) * 3;
        drawZzz(ctx, cx, headTopY + zOff, scale);
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [member, reducedMotion]);

  if (!member) return null;

  const stats = calculateMemberStats(member);
  const worked = member.hasWorkedOutToday;

  // Touch handlers for swipe-down dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      setTouchDeltaY(dy);
    }
  };

  const handleTouchEnd = () => {
    if (touchDeltaY > 60) {
      onClose();
    }
    touchStartY.current = null;
    setTouchDeltaY(0);
  };

  // Replace Teammate action (cycles to candidate from pool)
  const handleReplace = () => {
    const candidates = SQUAD_CANDIDATE_POOL.filter(
      (c) =>
        !store.squadMembers.some(
          (m) => (resolveFriendProfileId(m.id) || m.id) === c.id
        )
    );
    if (candidates.length === 0) {
      store.showToast('ℹ️ 目前候選池中沒有其他隊友可替換！');
      return;
    }
    const nextCandidate = candidates[0];
    store.recruitSquadMember(nextCandidate);
    onSelectMember?.(nextCandidate.id);
  };

  // Refresh Teammate Avatar cache from id-exact sources (PR #2 QA Spec)
  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = store.refreshSquadMemberAvatar(member.id);
    if (success) {
      store.showToast('✅ 已成功更新隊友造型快取！');
    } else {
      store.showToast('⏳ 仍在同步最新造型資料，請稍候重試');
    }
  };

  const resolvedAvatar = resolveSquadMemberAvatar(member);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`隊友檢視：${member.nameZh}`}
      onClick={onClose}
      className="absolute inset-0 z-40 flex flex-col justify-end bg-[#29221E]/35 backdrop-blur-[2px] transition-opacity duration-180"
    >
      {/* Sheet Container: Max 72vh, rounded-t-[20px], card background, z-index above BottomNav */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : undefined,
          transition: touchDeltaY > 0 ? 'none' : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        }}
        className={`retro-box max-h-[72vh] w-full overflow-y-auto rounded-t-[20px] border-t-2 border-[#e5dccb] bg-[#ffffff] p-4 text-[#29221e] shadow-2xl ${
          reducedMotion ? 'animate-fade-in' : 'animate-slide-up'
        }`}
      >
        {/* Pull Indicator */}
        <div className="mx-auto -mt-1 mb-2.5 h-1.5 w-10 rounded-full bg-[#e5dccb]" />

        {/* 1. Header Bar: Nickname Capsule + Prev/Next Arrows + Close */}
        <div className="flex items-center justify-between gap-2">
          {/* Prev Button */}
          {squadMembers.length > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="檢視上一位隊友"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5dccb] bg-[#faf6f0] text-[#29221e] shadow-xs active:scale-90"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}

          {/* Nickname Pill Capsule */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#3d2d1d] px-4 py-1 text-xs font-black text-[#ffffff] shadow-sm">
            <span>{member.nameZh.split('·')[1]?.trim() || member.nameZh}</span>
            <span className="text-[10px] text-amber-300">🍁</span>
          </div>

          {/* Next & Close Buttons */}
          <div className="flex items-center gap-1.5">
            {squadMembers.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                aria-label="檢視下一位隊友"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5dccb] bg-[#faf6f0] text-[#29221e] shadow-xs active:scale-90"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5dccb] bg-[#faf6f0] text-[#786b63] hover:text-[#29221e] active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Crossfade Transition Wrapper */}
        <div className={`transition-opacity duration-160 ${isSwitching ? 'opacity-0' : 'opacity-100'}`}>
          {/* 2. Center Full-Body Chibi Avatar Canvas (Scale 0.8) */}
          <div className="mt-2 flex justify-center">
            <canvas
              ref={canvasRef}
              width={260}
              height={140}
              className="block h-36 w-64 object-contain"
            />
          </div>

          {/* Syncing indicator & Refresh CTA */}
          {resolvedAvatar.status === 'syncing' && (
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-900 shadow-xs">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-700" />
                <span>資料同步中</span>
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-950 shadow-xs active:scale-95 hover:bg-amber-200"
              >
                <RefreshCw className="h-3 w-3 text-amber-800" />
                <span>重新整理</span>
              </button>
            </div>
          )}

          {/* 3. Status Bar: Today workout chip + Damage contribution chip */}
          <div className="mt-1 flex items-center justify-center gap-2">
            <TeammateStatusChip member={member} variant="attendance" />
            <TeammateStatusChip member={member} variant="damage" />
          </div>

          {/* 4. Equipment 5 Slots Row */}
          <div className="mt-3.5">
            <div className="mb-1.5 text-center text-[11px] font-black text-muted-foreground">
              穿戴裝備（5 槽位）
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {EQUIP_SLOTS_ORDER.map(({ slot, labelZh }) => {
                const itemId = member.equipped?.[slot] || resolvedAvatar.equipped?.[slot];
                const item = getCosmeticItem(itemId);
                return (
                  <div
                    key={slot}
                    className="flex flex-col items-center rounded-xl border border-[#e5dccb] bg-[#faf6f0] p-1.5 shadow-xs"
                  >
                    {item ? (
                      <div className="h-10 w-10 overflow-hidden rounded-lg border border-amber-200 bg-amber-50 shadow-xs">
                        <ItemSpriteThumbnail item={item} size={40} />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-[#e5dccb] bg-[#efe8dc]/50 text-[9px] font-bold text-muted-foreground">
                        未裝備
                      </div>
                    )}
                    <span className="mt-1 block text-[10px] font-black text-[#29221e]">
                      {labelZh}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Base Combat Stats (Aligned with 個人素質) */}
          <div className="mt-3.5 rounded-xl border border-[#e5dccb] bg-[#faf6f0] p-2.5">
            <div className="grid grid-cols-3 divide-x divide-[#e5dccb] text-center">
              <div className="px-1">
                <div className="text-[10px] font-bold text-muted-foreground">🥊 物攻</div>
                <div className="font-mono text-sm font-black text-rose-700">
                  {stats.phyAtk}
                </div>
              </div>
              <div className="px-1">
                <div className="text-[10px] font-bold text-muted-foreground">🪄 魔攻</div>
                <div className="font-mono text-sm font-black text-indigo-700">
                  {stats.magAtk}
                </div>
              </div>
              <div className="px-1">
                <div className="text-[10px] font-bold text-muted-foreground">💚 輔助</div>
                <div className="font-mono text-sm font-black text-emerald-700">
                  {stats.supportAtk}
                </div>
              </div>
            </div>
            {member.workoutAuditZh && (
              <div className="mt-2 rounded-lg bg-white/80 p-1.5 text-[10px] text-muted-foreground">
                <span className="font-bold">驗證紀錄：</span>
                <span>{member.workoutAuditZh}</span>
              </div>
            )}
          </div>

          {/* 6. Management Action Area (Context-Aware) */}
          <div className="mt-3.5">
            {/* Context A: Squad Confirm Screen */}
            {context === 'squad_confirm' && (
              <div>
                {!worked ? (
                  <button
                    type="button"
                    onClick={() => store.nudgeSquadMember(member.id)}
                    className="retro-btn flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 py-2.5 text-xs font-black text-white shadow-md active:translate-y-0.5"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span>催促運動 ({member.nudgedCount})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReplace}
                    className="retro-btn flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5dccb] bg-[#faf6f0] py-2.5 text-xs font-black text-[#29221e] hover:bg-[#efe8dc] active:translate-y-0.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>更換隊員</span>
                  </button>
                )}
              </div>
            )}

            {/* Context B: Island Map or Tower (Only Urge + Navigate to Squad Confirm) */}
            {(context === 'island' || context === 'tower') && (
              <div className="space-y-2">
                {!worked && (
                  <button
                    type="button"
                    onClick={() => store.nudgeSquadMember(member.id)}
                    className="retro-btn flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 py-2.5 text-xs font-black text-white shadow-md active:translate-y-0.5"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span>催促運動 ({member.nudgedCount})</span>
                  </button>
                )}
                {onNavigateToSquadConfirm && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToSquadConfirm();
                    }}
                    className="retro-btn flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-primary bg-primary/10 py-2 text-xs font-black text-primary hover:bg-primary/20 active:translate-y-0.5"
                  >
                    <span>前往組隊確認</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Context C: Plaza Tab Secondary / Accessibility List */}
            {context === 'list' && (
              <div className="grid grid-cols-2 gap-2">
                {!worked ? (
                  <button
                    type="button"
                    onClick={() => store.nudgeSquadMember(member.id)}
                    className="retro-btn flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2.5 text-xs font-black text-white shadow active:translate-y-0.5"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span>敲他 ({member.nudgedCount})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => store.simulateFriendWorkoutJoin(member.id)}
                    className="retro-btn flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 py-2.5 text-xs font-black text-white shadow active:translate-y-0.5"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>模擬運動</span>
                  </button>
                )}

                {member.isSuspectedCheater ? (
                  <button
                    type="button"
                    onClick={() => store.reportCheatingMember(member.id)}
                    className="retro-btn flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 py-2.5 text-xs font-black text-white shadow active:translate-y-0.5"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>抓包作弊</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReplace}
                    className="retro-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#e5dccb] bg-[#faf6f0] py-2.5 text-xs font-black text-[#29221e] active:translate-y-0.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>更換隊員</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
