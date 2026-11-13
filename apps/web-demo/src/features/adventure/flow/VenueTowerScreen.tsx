import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Lock,
  Check,
  ChevronRight,
  Flame,
  Dumbbell,
  Zap,
  Coins,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useGameStore, resolveSquadMemberAvatar } from '../../../stores/useGameStore';
import { drawCreamChibiSilhouette, drawMapleChibiAvatar, bossSpriteUrl, drawZzz } from '../../../game/pixelSpriteDrawer';
import {
  GYM_VENUES,
  GymVenueInfo,
  getFloorForStage,
  getStageForVenueFloor,
  getBossForStage,
} from './venueConfig';
import { ADVENTURE_BOSS_CATALOG, AdventureBoss } from '../../../config/catalogConfig';

interface VenueTowerScreenProps {
  venueIndex: number;
  mode: 'solo' | 'squad';
  onBack: () => void;
  onEnterBattle: () => void;
  onJumpToVenue?: (venueIndex: number) => void;
}

const WEAKNESS = {
  phy: { label: '物攻', Icon: Dumbbell, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  mag: { label: '魔攻', Icon: Flame, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  balanced: { label: '協同', Icon: Zap, color: 'text-purple-600 bg-purple-50 border-purple-200' },
} as const;

export interface TowerTeammatesClusterResult {
  positions: Array<{ tx: number; ty: number }>;
  clusterHitRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export function getTowerTeammatesCluster(
  heroX: number,
  heroY: number,
  total: number,
  w: number = 112,
  h: number = 80,
  heroScale: number = 1.05,
): TowerTeammatesClusterResult {
  if (total <= 0) {
    return {
      positions: [],
      clusterHitRect: { left: 0, top: 0, width: 0, height: 0 },
    };
  }

  const tmScale = heroScale * 0.65;
  const heroDrawHeight = 60 * heroScale;
  const stageW = heroDrawHeight * 2.4;
  const stageH = heroDrawHeight * 2.4;

  const offsets =
    total === 1
      ? [{ dx: -0.20, dy: -0.12 }]
      : total === 2
      ? [
          { dx: -0.24, dy: -0.10 },
          { dx: -0.14, dy: -0.16 },
        ]
      : [
          { dx: -0.28, dy: -0.10 },
          { dx: -0.20, dy: -0.17 },
          { dx: -0.16, dy: -0.13 },
        ];

  const rawPos = offsets.slice(0, total).map((off, idx) => {
    let tx = Math.round(heroX + off.dx * stageW);
    const ty = Math.round(heroY + off.dy * stageH);

    const maxX = Math.round(heroX - 0.16 * stageW);
    if (tx > maxX) tx = maxX;
    if (idx === 0) {
      const minLeft = Math.round(28 * tmScale + 4);
      if (tx < minLeft) tx = minLeft;
    }
    return { tx, ty };
  });

  const boxes = rawPos.map(({ tx, ty }) => ({
    left: tx - 28 * tmScale,
    right: tx + 28 * tmScale,
    top: ty - 56 * tmScale - 20,
    bottom: ty,
  }));

  const clusterLeft = Math.min(...boxes.map((b) => b.left));
  const clusterRight = Math.max(...boxes.map((b) => b.right));
  const clusterTop = Math.min(...boxes.map((b) => b.top));
  const clusterBottom = Math.max(...boxes.map((b) => b.bottom));

  let shiftX = 0;
  let shiftY = 0;
  const pad = 2;

  if (clusterLeft + shiftX < pad) shiftX = pad - clusterLeft;
  if (clusterRight + shiftX > w - pad) shiftX = w - pad - clusterRight;
  if (clusterTop + shiftY < pad) shiftY = pad - clusterTop;
  if (clusterBottom + shiftY > h - pad) shiftY = h - pad - clusterBottom;

  const positions = rawPos.map(({ tx, ty }) => ({
    tx: Math.round(tx + shiftX),
    ty: Math.round(ty + shiftY),
  }));

  const finalBoxes = positions.map(({ tx, ty }) => ({
    left: tx - 28 * tmScale - 4,
    top: ty - 56 * tmScale - 4,
    width: 56 * tmScale + 8,
    height: 60 * tmScale + 8,
  }));

  const hitMinX = Math.min(...finalBoxes.map((b) => b.left));
  const hitMinY = Math.min(...finalBoxes.map((b) => b.top));
  const hitMaxX = Math.max(...finalBoxes.map((b) => b.left + b.width));
  const hitMaxY = Math.max(...finalBoxes.map((b) => b.top + b.height));

  return {
    positions,
    clusterHitRect: {
      left: Math.max(0, Math.round(hitMinX)),
      top: Math.max(0, Math.round(hitMinY)),
      width: Math.round(hitMaxX - hitMinX),
      height: Math.round(hitMaxY - hitMinY),
    },
  };
}

export const VenueTowerScreen: React.FC<VenueTowerScreenProps> = ({
  venueIndex,
  mode,
  onBack,
  onEnterBattle,
  onJumpToVenue,
}) => {
  const store = useGameStore();
  const isSolo = mode === 'solo';
  const playerStage = isSolo ? store.soloStage : store.squadStage;

  const venue = GYM_VENUES[venueIndex];
  const currentFloorForPlayer = getFloorForStage(playerStage);
  const playerVenueIdx = (playerStage - 1) % GYM_VENUES.length;
  const currentVenue = GYM_VENUES[playerVenueIdx];

  // Determine which floor stage is the current challenge stage
  const playerIsAtThisVenue = playerVenueIdx === venueIndex;

  // Generate floor list to display (from max floor down to 1)
  const maxDisplayFloor = Math.max(3, currentFloorForPlayer + 1);
  const floors = Array.from({ length: maxDisplayFloor }, (_, i) => maxDisplayFloor - i);

  // Selected stage defaults to player's current stage if here, or highest cleared stage
  const defaultSelectedFloor = playerIsAtThisVenue
    ? currentFloorForPlayer
    : playerVenueIdx > venueIndex
    ? currentFloorForPlayer
    : Math.max(1, currentFloorForPlayer - 1);

  const [selectedFloor, setSelectedFloor] = useState<number>(defaultSelectedFloor);
  const selectedStage = getStageForVenueFloor(venueIndex, selectedFloor);
  const selectedBoss = getBossForStage(selectedStage);

  const getFloorStatus = (floor: number): 'cleared' | 'current' | 'locked' => {
    const stage = getStageForVenueFloor(venueIndex, floor);
    if (stage === playerStage) return 'current';
    if (stage < playerStage) return 'cleared';
    return 'locked';
  };

  const selectedStatus = getFloorStatus(selectedFloor);
  const weakness = WEAKNESS[selectedBoss.weakness];
  const WeaknessIcon = weakness.Icon;

  // Canvas for avatar standing on the current floor card
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const teammates = store.squadMembers.slice(0, 3);
  const isSquadTeam = !isSolo && teammates.length > 0;
  const canvasW = isSquadTeam ? 112 : 80;
  const canvasH = 80;

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

      if (isSquadTeam) {
        // Squad mode: draw teammates (scale 0.65 of hero, back row first)
        const heroScale = 1.05;
        const tmScale = heroScale * 0.65;
        const total = teammates.length;
        const heroX = total === 1 ? Math.round(w * 0.68) : total === 2 ? Math.round(w * 0.72) : Math.round(w * 0.76);
        const heroY = Math.round(h * 0.88);
        const towerCluster = getTowerTeammatesCluster(heroX, heroY, total, w, h, heroScale);

        const positioned = teammates.map((tm, idx) => {
          const pos = towerCluster.positions[idx] || { tx: heroX, ty: heroY };
          const avatar = resolveSquadMemberAvatar(tm);
          return { tm, avatar, idx, tx: pos.tx, ty: pos.ty };
        });

        // Draw in order of ty ascending (farthest / highest first)
        const sorted = [...positioned].sort((a, b) => a.ty - b.ty);

        sorted.forEach(({ tm, avatar, idx, tx, ty }) => {
          // Small warm pedestal
          ctx.save();
          ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
          ctx.beginPath();
          ctx.ellipse(tx, ty + 2, 16 * tmScale, 5 * tmScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.translate(tx, ty);
          ctx.scale(tmScale, tmScale);

          if (!tm.hasWorkedOutToday) {
            ctx.filter = 'grayscale(1)';
            ctx.globalAlpha = 0.72;
          }

          if (avatar.status === 'syncing' || !avatar.bodyStage) {
            drawCreamChibiSilhouette(ctx, {
              x: 0,
              y: 0,
              facingRight: true,
              nameZh: tm.nameZh,
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

          if (!tm.hasWorkedOutToday) {
            const headTopY = ty - 60 * tmScale;
            drawZzz(ctx, tx, headTopY, tmScale);
          }
        });

        // Hero on front right
        ctx.save();
        const pulse = Math.sin(now / 350) * 2;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.beginPath();
        ctx.ellipse(heroX, heroY, 20 + pulse, 8 + pulse * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(heroX, heroY);
        ctx.scale(heroScale, heroScale);
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
      } else {
        // Solo Mode: Hero alone on center pedestal
        ctx.save();
        const pulse = Math.sin(now / 350) * 3;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.85, 26 + pulse, 10 + pulse * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.85, 20 + pulse * 0.5, 8 + pulse * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Avatar
        ctx.save();
        ctx.translate(w * 0.5, h * 0.85);
        ctx.scale(1.4, 1.4);
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
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [store.bodyStage, store.equipped, isSquadTeam, teammates]);

  const handleSelectFloor = (floor: number) => {
    const status = getFloorStatus(floor);
    if (status === 'locked') {
      store.showToast('🔒 該樓層尚未解鎖，請先通過前置關卡！');
      return;
    }
    setSelectedFloor(floor);
  };

  return (
    <div className="adventure-shell flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 py-3 pb-8">
      {/* Top Header */}
      <header className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回健身房島"
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-sm active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-foreground">{venue.nameZh}</h1>
              <span className="text-[10px] font-bold text-muted-foreground">
                ({venue.nameEn})
              </span>
            </div>
            <div className="text-[10px] font-bold text-primary">
              第 {venueIndex + 1} 場館 · 爬塔樓層清單
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-black font-mono text-foreground shadow-sm">
          <Coins className="h-3.5 w-3.5 text-amber-500" />
          <span>{store.coins.toLocaleString()}</span>
        </div>
      </header>

      {/* Venue Banner */}
      <div className="retro-box mb-3 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-3 border-amber-200">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] font-black text-amber-900">
              VENUE SELECT · {venue.nameZh}
            </div>
            <div className="text-[10px] font-bold text-amber-800">
              {venue.descriptionZh}
            </div>
          </div>
        </div>
      </div>

      {/* Tower Floors List (Highest on top, like 03-venue-tower.jpg) */}
      <div className="space-y-2">
        {floors.map((floor) => {
          const status = getFloorStatus(floor);
          const stageNumber = getStageForVenueFloor(venueIndex, floor);
          const isSelected = selectedFloor === floor;
          const isCurrent = status === 'current';
          const isCleared = status === 'cleared';
          const isLocked = status === 'locked';

          if (isCurrent) {
            // CURRENT FLOOR (Prominent Card with Avatar & Boss Preview)
            return (
              <div
                key={floor}
                onClick={() => handleSelectFloor(floor)}
                className={`retro-box relative overflow-hidden rounded-2xl p-3 transition-all duration-150 cursor-pointer ${
                  isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-amber-300'
                } bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-100/90`}
              >
                {/* Stage Ribbon */}
                <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-0.5 text-[10px] font-black text-primary-foreground shadow-sm">
                  STAGE {stageNumber} · 當前進度
                </div>

                <div className="flex items-center justify-between">
                  {/* Avatar standing on pedestal */}
                  <div className={`relative shrink-0 overflow-hidden ${isSquadTeam ? 'h-20 w-28' : 'h-20 w-20'}`}>
                    <canvas
                      ref={canvasRef}
                      width={canvasW}
                      height={canvasH}
                      className="block h-20 w-full"
                    />

                    {/* In squad mode: Paper dolls hit buttons */}
                    {isSquadTeam && (() => {
                      const heroScale = 1.05;
                      const tmScale = heroScale * 0.65;
                      const total = teammates.length;
                      const heroX = total === 1 ? Math.round(canvasW * 0.68) : total === 2 ? Math.round(canvasW * 0.72) : Math.round(canvasW * 0.76);
                      const heroY = Math.round(canvasH * 0.88);
                      const towerCluster = getTowerTeammatesCluster(heroX, heroY, total, canvasW, canvasH, heroScale);

                      return (
                        <>
                          {/* Cluster hit area */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              store.setInspectMemberId(teammates[0].id);
                            }}
                            aria-label="檢視小隊成員"
                            style={{
                              left: `${towerCluster.clusterHitRect.left}px`,
                              top: `${towerCluster.clusterHitRect.top}px`,
                              width: `${towerCluster.clusterHitRect.width}px`,
                              height: `${towerCluster.clusterHitRect.height}px`,
                            }}
                            className="absolute z-10 cursor-pointer rounded-xl border border-transparent transition-transform duration-120 active:scale-95"
                          />

                          {/* Individual teammates */}
                          {teammates.map((tm, idx) => {
                            const pos = towerCluster.positions[idx];
                            if (!pos) return null;
                            const hitW = 56 * tmScale + 8;
                            const hitH = 60 * tmScale + 8;
                            const hitX = pos.tx - 28 * tmScale - 4;
                            const hitY = pos.ty - 56 * tmScale - 4;

                            return (
                              <button
                                key={tm.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.setInspectMemberId(tm.id);
                                }}
                                aria-label={`檢視隊友 ${tm.nameZh}`}
                                style={{
                                  left: `${hitX}px`,
                                  top: `${hitY}px`,
                                  width: `${hitW}px`,
                                  height: `${hitH}px`,
                                }}
                                className="absolute z-20 cursor-pointer rounded-xl border border-transparent transition-transform duration-120 active:scale-95"
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>

                  {/* Floor info */}
                  <div className="flex-1 px-3">
                    <div className="text-2xl font-black font-mono tracking-tight text-orange-950">
                      F{floor}
                    </div>
                    <div className="text-xs font-bold text-orange-800">
                      {floor === 1 ? '入門挑戰' : floor === 2 ? '進階突破' : '極限狂熱'}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="rounded-full bg-orange-200/80 px-2 py-0.2 text-[9px] font-black text-orange-900">
                        正在挑戰
                      </span>
                    </div>
                  </div>

                  {/* Boss Miniature Illustration Preview (SVG image, no emoji!) */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white p-1 shadow-sm">
                    <img
                      src={bossSpriteUrl(selectedBoss.spriteKey)}
                      alt={selectedBoss.nameZh}
                      className="h-14 w-14 object-contain"
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (isCleared) {
            // CLEARED FLOOR (Green Checkmark, Clickable to replay)
            return (
              <div
                key={floor}
                onClick={() => handleSelectFloor(floor)}
                className={`retro-box flex items-center justify-between rounded-xl p-3 transition-all cursor-pointer ${
                  isSelected ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50' : 'bg-card hover:bg-muted/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono text-foreground">F{floor}</span>
                    <span className="text-xs font-bold text-muted-foreground">
                      STAGE {stageNumber} · 已通關
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">已通關 · 點擊查看關卡資訊</div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <Check className="h-5 w-5 stroke-[3]" />
                </div>
              </div>
            );
          }

          // LOCKED FLOOR
          return (
            <div
              key={floor}
              onClick={() => handleSelectFloor(floor)}
              className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/40 p-3 opacity-60 cursor-not-allowed"
            >
              <div>
                <div className="text-lg font-black font-mono text-muted-foreground">F{floor}</div>
                <div className="text-xs font-bold text-muted-foreground">
                  STAGE {stageNumber} · 尚未解鎖
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Boss Preview Sheet & Enter Battle CTA (as in 03-venue-tower.jpg) */}
      <div className="retro-box mt-4 rounded-2xl bg-card p-3 shadow-lg">
        <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          BOSS PREVIEW · 樓層關卡預覽
        </div>

        <div className="flex items-center gap-3">
          {/* Boss SVG illustration */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-[#faf6f0] p-1 shadow-sm">
            <img
              src={bossSpriteUrl(selectedBoss.spriteKey)}
              alt={selectedBoss.nameZh}
              className="h-14 w-14 object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-black text-foreground">
                {selectedBoss.nameZh}
              </h2>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.2 text-[9px] font-black ${weakness.color}`}
              >
                <WeaknessIcon className="h-2.5 w-2.5" />
                <span>弱{weakness.label}</span>
              </span>
            </div>
            <div className="mt-0.5 line-clamp-1 text-[11px] font-bold text-muted-foreground">
              {selectedBoss.subtitleZh}
            </div>
            <div className="text-[10px] text-muted-foreground">
              通關獎勵：+{selectedBoss.rewardCoins} 🪙 · 有機會打落【{selectedBoss.hiddenLoot.nameZh}】
            </div>
          </div>
        </div>

        {/* Enter Battle CTA Button / Progression Action */}
        {selectedStatus === 'current' ? (
          <button
            type="button"
            onClick={() => onEnterBattle()}
            className="retro-btn mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-black text-white shadow-lg active:translate-y-0.5 bg-gradient-to-b from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            <span className="text-sm">進入戰鬥（挑戰 STAGE {playerStage}）</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : selectedStatus === 'cleared' ? (
          <div className="mt-3 space-y-2">
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center rounded-2xl border-2 border-border bg-muted py-2.5 text-xs font-black text-muted-foreground opacity-80 cursor-not-allowed"
            >
              <span>✅ 已通關此樓層（無須重複討伐）</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (playerVenueIdx !== venueIndex) {
                  onJumpToVenue?.(playerVenueIdx);
                } else {
                  setSelectedFloor(currentFloorForPlayer);
                }
              }}
              className="retro-btn flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-orange-500 to-amber-500 py-2.5 text-xs font-black text-white shadow active:translate-y-0.5"
            >
              <span>前往目前進度（STAGE {playerStage} · {currentVenue.nameZh} F{currentFloorForPlayer}）</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center rounded-2xl border-2 border-border bg-muted py-2.5 text-xs font-black text-muted-foreground opacity-60 cursor-not-allowed"
            >
              <span>🔒 樓層尚未解鎖</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (playerVenueIdx !== venueIndex) {
                  onJumpToVenue?.(playerVenueIdx);
                } else {
                  setSelectedFloor(currentFloorForPlayer);
                }
              }}
              className="retro-btn flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-orange-500 to-amber-500 py-2.5 text-xs font-black text-white shadow active:translate-y-0.5"
            >
              <span>前往目前進度（STAGE {playerStage} · {currentVenue.nameZh} F{currentFloorForPlayer}）</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
