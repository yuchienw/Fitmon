import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Lock,
  Check,
  ChevronRight,
  Coins,
} from 'lucide-react';
import { useGameStore, resolveSquadMemberAvatar } from '../../../stores/useGameStore';
import { drawCreamChibiSilhouette, drawMapleChibiAvatar, drawZzz } from '../../../game/pixelSpriteDrawer';
import { GYM_VENUES, getFloorForStage } from './venueConfig';
import { ADVENTURE_BOSS_CATALOG } from '../../../config/catalogConfig';

interface GymIslandMapScreenProps {
  mode: 'solo' | 'squad';
  onBack: () => void;
  onEnterVenueTower: (venueIndex: number) => void;
  onBackToSquadConfirm?: () => void;
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

export interface IslandTeammatesClusterResult {
  positions: Array<{ tx: number; ty: number }>;
  clusterHitRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export function getIslandTeammatesCluster(
  standX: number,
  standY: number,
  facingRight: boolean,
  total: number,
  w: number = 390,
  h: number = 600,
  teammateScale: number = 0.68,
  heroScale: number = 1.05,
): IslandTeammatesClusterResult {
  if (total <= 0) {
    return {
      positions: [],
      clusterHitRect: { left: 0, top: 0, width: 0, height: 0 },
    };
  }

  const safeW = w > 0 ? w : 390;
  const safeH = h > 0 ? h : 600;

  // 舞台寬高 = 島上主角繪製高度 ÷ 戰鬥中主角高度占戰鬥畫布高的比例（簡化為 stageW = stageH = 主角繪製高度 × 2.4）
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

  const sign = facingRight ? 1 : -1;
  const rawPos = offsets.slice(0, total).map((off, idx) => {
    let tx = Math.round(standX + off.dx * stageW * sign);
    const ty = Math.round(standY + off.dy * stageH);

    // 隊友腳底 x ≤ 主角腳底-0.16 單位（朝主角後方）
    if (facingRight) {
      const maxX = Math.round(standX - 0.16 * stageW);
      if (tx > maxX) tx = maxX;
      // 只 clamp 最左側
      if (idx === 0) {
        const minLeft = Math.round(28 * teammateScale + 8);
        if (tx < minLeft) tx = minLeft;
      }
    } else {
      const minX = Math.round(standX + 0.16 * stageW);
      if (tx < minX) tx = minX;
      // 只 clamp 最右側（向左看時，後方最外側為最右側）
      if (idx === 0) {
        const maxRight = Math.round(safeW - (28 * teammateScale + 8));
        if (tx > maxRight) tx = maxRight;
      }
    }

    return { tx, ty };
  });

  // 紙娃娃與 Zzz 邊界（Zzz 浮動約在頭頂上方 30px）
  const boxes = rawPos.map(({ tx, ty }) => ({
    left: tx - 28 * teammateScale,
    right: tx + Math.max(28 * teammateScale, 26),
    top: ty - 60 * teammateScale - 30,
    bottom: ty,
  }));

  const clusterLeft = Math.min(...boxes.map((b) => b.left));
  const clusterRight = Math.max(...boxes.map((b) => b.right));
  const clusterTop = Math.min(...boxes.map((b) => b.top));
  const clusterBottom = Math.max(...boxes.map((b) => b.bottom));

  let shiftX = 0;
  let shiftY = 0;
  const pad = 8;

  // 1. 確保所有紙娃娃與 Zzz 完整在島畫布內（超出時整個叢集一起平移進來）
  if (clusterLeft + shiftX < pad) {
    shiftX = pad - clusterLeft;
  }
  if (clusterRight + shiftX > safeW - pad) {
    shiftX = safeW - pad - clusterRight;
  }
  if (clusterTop + shiftY < pad) {
    shiftY = pad - clusterTop;
  }
  if (clusterBottom + shiftY > safeH - pad) {
    shiftY = safeH - pad - clusterBottom;
  }

  // 2. 不壓到『你在這裡』pin 以外的節點標籤（GYM_VENUES 節點標籤）
  const nodePad = 4;
  for (const v of GYM_VENUES) {
    const vx = (v.mapCoords.x / 100) * safeW;
    const vy = (v.mapCoords.y / 100) * safeH;
    const nLeft = vx - 40;
    const nRight = vx + 40;
    const nTop = vy - 30;
    const nBottom = vy + 30;

    const curL = clusterLeft + shiftX;
    const curR = clusterRight + shiftX;
    const curT = clusterTop + shiftY;
    const curB = clusterBottom + shiftY;

    const overlapX = Math.min(curR, nRight) - Math.max(curL, nLeft);
    const overlapY = Math.min(curB, nBottom) - Math.max(curT, nTop);

    if (overlapX > 0 && overlapY > 0) {
      if (vx < standX) {
        shiftX += nRight - curL + nodePad;
      } else {
        shiftX -= curR - nLeft + nodePad;
      }
    }
  }

  // 節點避讓後再次 clamp 至畫布邊緣
  if (clusterLeft + shiftX < pad) {
    shiftX = pad - clusterLeft;
  }
  if (clusterRight + shiftX > safeW - pad) {
    shiftX = safeW - pad - clusterRight;
  }
  if (clusterTop + shiftY < pad) {
    shiftY = pad - clusterTop;
  }
  if (clusterBottom + shiftY > safeH - pad) {
    shiftY = safeH - pad - clusterBottom;
  }

  const positions = rawPos.map(({ tx, ty }) => ({
    tx: Math.round(tx + shiftX),
    ty: Math.round(ty + shiftY),
  }));

  const finalBoxes = positions.map(({ tx, ty }) => ({
    left: tx - 28 * teammateScale - 8,
    top: ty - 60 * teammateScale - 8,
    width: 56 * teammateScale + 16,
    height: 65 * teammateScale + 16,
  }));

  const hitMinX = Math.min(...finalBoxes.map((b) => b.left));
  const hitMinY = Math.min(...finalBoxes.map((b) => b.top));
  const hitMaxX = Math.max(...finalBoxes.map((b) => b.left + b.width));
  const hitMaxY = Math.max(...finalBoxes.map((b) => b.top + b.height));

  return {
    positions,
    clusterHitRect: {
      left: Math.round(hitMinX),
      top: Math.round(hitMinY),
      width: Math.round(hitMaxX - hitMinX),
      height: Math.round(hitMaxY - hitMinY),
    },
  };
}

export function getIslandTeammatePos(
  standX: number,
  standY: number,
  facingRight: boolean,
  idx: number,
  total: number,
  w: number = 390,
  h: number = 600,
  teammateScale: number = 0.68,
  heroScale: number = 1.05,
) {
  const cluster = getIslandTeammatesCluster(
    standX,
    standY,
    facingRight,
    total,
    w,
    h,
    teammateScale,
    heroScale,
  );
  return cluster.positions[idx] || { tx: standX, ty: standY };
}

export interface GymIslandPartyLayout {
  standX: number;
  standY: number;
  facingRight: boolean;
  heroScale: number;
  teammateScale: number;
  teammatePositions: Array<{ tx: number; ty: number }>;
  partyBoundingBox: { left: number; top: number; right: number; bottom: number };
  clusterHitRect: { left: number; top: number; width: number; height: number };
  choice: 'default_below' | 'left_side' | 'right_side' | 'outer_0.85';
}

export function calculateGymIslandPartyLayout(
  venueIdx: number,
  w: number,
  h: number,
  teammates: Array<{ id: string; nameZh: string; hasWorkedOutToday?: boolean }>,
  isSolo: boolean,
  getCardBox: (idx: number) => { left: number; right: number; top: number; bottom: number; cx: number; cy: number; width: number; height: number },
): GymIslandPartyLayout {
  const safeW = w > 0 ? w : 390;
  const safeH = h > 0 ? h : 600;
  const currentCard = getCardBox(venueIdx);
  const venue = GYM_VENUES[venueIdx];
  const totalTeammates = isSolo ? 0 : Math.min(teammates.length, 3);

  const islandLeft = 0.07 * safeW;
  const islandRight = 0.93 * safeW;
  const islandTop = 0.08 * safeH;
  const islandBottom = 0.90 * safeH;

  const offsets =
    totalTeammates === 1
      ? [{ dx: -0.20, dy: -0.12 }]
      : totalTeammates === 2
      ? [
          { dx: -0.24, dy: -0.10 },
          { dx: -0.14, dy: -0.16 },
        ]
      : [
          { dx: -0.28, dy: -0.10 },
          { dx: -0.20, dy: -0.17 },
          { dx: -0.16, dy: -0.13 },
        ];

  function evaluateCandidate(
    standX: number,
    standY: number,
    heroScale: number,
    facingRight: boolean,
    choice: 'default_below' | 'left_side' | 'right_side' | 'outer_0.85'
  ): GymIslandPartyLayout {
    const heroDrawH = 60 * heroScale;
    const teammateScale = heroScale * 0.65;
    const stageW = heroDrawH * 2.4;
    const stageH = heroDrawH * 2.4;
    const sign = facingRight ? 1 : -1;

    const teammatePositions: Array<{ tx: number; ty: number }> = [];
    let minL = standX - 28 * heroScale;
    let maxR = standX + 28 * heroScale;
    let minT = standY - heroDrawH;
    let maxB = standY;

    for (let i = 0; i < totalTeammates; i++) {
      const off = offsets[i];
      let tx = Math.round(standX + off.dx * stageW * sign);
      const ty = Math.round(standY + off.dy * stageH);

      if (facingRight) {
        const maxX = Math.round(standX - 0.16 * stageW);
        if (tx > maxX) tx = maxX;
      } else {
        const minX = Math.round(standX + 0.16 * stageW);
        if (tx < minX) tx = minX;
      }

      teammatePositions.push({ tx, ty });

      const tm = teammates[i];
      const zMargin = tm && !tm.hasWorkedOutToday ? 20 * teammateScale : 0;
      minL = Math.min(minL, tx - 28 * teammateScale);
      maxR = Math.max(maxR, tx + 28 * teammateScale);
      minT = Math.min(minT, ty - 60 * teammateScale - zMargin);
      maxB = Math.max(maxB, ty);
    }

    const hitBoxes = teammatePositions.map(({ tx, ty }) => ({
      left: tx - 28 * teammateScale - 8,
      top: ty - 60 * teammateScale - 8,
      width: 56 * teammateScale + 16,
      height: 65 * teammateScale + 16,
    }));

    const hitMinX = hitBoxes.length > 0 ? Math.min(...hitBoxes.map((b) => b.left)) : 0;
    const hitMinY = hitBoxes.length > 0 ? Math.min(...hitBoxes.map((b) => b.top)) : 0;
    const hitMaxX = hitBoxes.length > 0 ? Math.max(...hitBoxes.map((b) => b.left + b.width)) : 0;
    const hitMaxY = hitBoxes.length > 0 ? Math.max(...hitBoxes.map((b) => b.top + b.height)) : 0;

    return {
      standX,
      standY,
      facingRight,
      heroScale,
      teammateScale,
      teammatePositions,
      partyBoundingBox: { left: minL, right: maxR, top: minT, bottom: maxB },
      clusterHitRect: {
        left: Math.round(hitMinX),
        top: Math.round(hitMinY),
        width: Math.round(hitMaxX - hitMinX),
        height: Math.round(hitMaxY - hitMinY),
      },
      choice,
    };
  }

  function collides(box: { left: number; right: number; top: number; bottom: number }) {
    if (
      box.left < islandLeft ||
      box.right > islandRight ||
      box.top < islandTop ||
      box.bottom > islandBottom
    ) {
      return true;
    }
    for (let i = 0; i < GYM_VENUES.length; i++) {
      const c = getCardBox(i);
      const ox = Math.min(box.right, c.right) - Math.max(box.left, c.left);
      const oy = Math.min(box.bottom, c.bottom) - Math.max(box.top, c.top);
      if (ox > 0 && oy > 0) return true;
    }
    return false;
  }

  const baseScale = 1.05;

  // QA-08 (1): Default anchor (or partyAnchor from venueConfig)
  if (venue.partyAnchor) {
    const ax = venue.partyAnchor.x <= 100 ? (venue.partyAnchor.x / 100) * safeW : venue.partyAnchor.x;
    const ay = venue.partyAnchor.y <= 100 ? (venue.partyAnchor.y / 100) * safeH : venue.partyAnchor.y;
    const facingRight = ax < safeW * 0.5;
    const cand = evaluateCandidate(ax, ay, baseScale, facingRight, 'default_below');
    if (!collides(cand.partyBoundingBox)) return cand;
  } else {
    // Default: card bottom edge center + 10px down
    const facingRight = currentCard.cx > safeW * 0.5;
    const testCand = evaluateCandidate(currentCard.cx, 200, baseScale, facingRight, 'default_below');
    const partyH = 200 - testCand.partyBoundingBox.top;
    const standY = currentCard.bottom + 10 + partyH;
    const standX = currentCard.cx;
    const cand = evaluateCandidate(standX, standY, baseScale, facingRight, 'default_below');
    if (!collides(cand.partyBoundingBox)) return cand;
  }

  // QA-08 (2): Try left side of card
  {
    const facingRight = true;
    const standY = currentCard.cy + 30 * baseScale;
    const testCand = evaluateCandidate(200, standY, baseScale, facingRight, 'left_side');
    const pWidth = testCand.partyBoundingBox.right - 200;
    const standX = currentCard.left - 10 - pWidth;
    const cand = evaluateCandidate(standX, standY, baseScale, facingRight, 'left_side');
    if (!collides(cand.partyBoundingBox)) return cand;
  }

  // QA-08 (2): Try right side of card
  {
    const facingRight = false;
    const standY = currentCard.cy + 30 * baseScale;
    const testCand = evaluateCandidate(200, standY, baseScale, facingRight, 'right_side');
    const pWidth = 200 - testCand.partyBoundingBox.left;
    const standX = currentCard.right + 10 + pWidth;
    const cand = evaluateCandidate(standX, standY, baseScale, facingRight, 'right_side');
    if (!collides(cand.partyBoundingBox)) return cand;
  }

  // QA-08 (2): Outer side with scale = 0.85 if still colliding
  {
    const scale = 0.85;
    const isOuterLeft = currentCard.cx < safeW * 0.5;
    const facingRight = isOuterLeft;
    const standY = currentCard.cy + 30 * scale;
    const testCand = evaluateCandidate(200, standY, scale, facingRight, 'outer_0.85');
    let standX: number;
    if (isOuterLeft) {
      const pWidth = testCand.partyBoundingBox.right - 200;
      standX = Math.max(islandLeft + 28 * scale, currentCard.left - 8 - pWidth);
    } else {
      const pWidth = 200 - testCand.partyBoundingBox.left;
      standX = Math.min(islandRight - 28 * scale, currentCard.right + 8 + pWidth);
    }
    return evaluateCandidate(standX, standY, scale, facingRight, 'outer_0.85');
  }
}

export const GymIslandMapScreen: React.FC<GymIslandMapScreenProps> = ({
  mode,
  onBack,
  onEnterVenueTower,
  onBackToSquadConfirm,
}) => {
  const store = useGameStore();
  const isSolo = mode === 'solo';
  const stage = isSolo ? store.soloStage : store.squadStage;

  const currentVenueIdx = Math.max(0, (stage - 1) % GYM_VENUES.length);
  const currentFloor = getFloorForStage(stage);

  const [selectedVenueIdx, setSelectedVenueIdx] = useState<number>(currentVenueIdx);
  const [wrapSize, setWrapSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const selectedVenue = GYM_VENUES[selectedVenueIdx];
  const selectedBoss = ADVENTURE_BOSS_CATALOG[selectedVenue.bossIndex];

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paperdollCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const venueCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [partyLayout, setPartyLayout] = useState<GymIslandPartyLayout | null>(null);

  // Teammates data
  const teammates = isSolo
    ? []
    : store.squadMembers.slice(0, 3);

  // Calculate status for each venue
  const getNodeStatus = (venueIdx: number): 'cleared' | 'current' | 'locked' => {
    if (venueIdx === currentVenueIdx) return 'current';
    if (venueIdx < currentVenueIdx) return 'cleared';
    return 'locked';
  };

  const selectedStatus = getNodeStatus(selectedVenueIdx);
  const currentStandPercent = getAvatarStandPercent(currentVenueIdx);

  const getVenueCardBox = (venueIdx: number) => {
    const venue = GYM_VENUES[venueIdx];
    const w = wrapSize.w > 0 ? wrapSize.w : 390;
    const h = wrapSize.h > 0 ? wrapSize.h : 600;
    const el = venueCardRefs.current[venueIdx];
    const wrap = wrapRef.current;
    if (el && wrap) {
      const eRect = el.getBoundingClientRect();
      const wRect = wrap.getBoundingClientRect();
      const left = eRect.left - wRect.left;
      const top = eRect.top - wRect.top;
      const width = eRect.width;
      const height = eRect.height;
      if (width > 0 && height > 0) {
        return {
          left,
          right: left + width,
          top,
          bottom: top + height,
          cx: left + width / 2,
          cy: top + height / 2,
          width,
          height,
        };
      }
    }
    const cx = (venue.mapCoords.x / 100) * w;
    const cy = (venue.mapCoords.y / 100) * h;
    const cardW = 84;
    const cardH = 60;
    return {
      left: cx - cardW / 2,
      right: cx + cardW / 2,
      top: cy - cardH / 2,
      bottom: cy + cardH / 2,
      cx,
      cy,
      width: cardW,
      height: cardH,
    };
  };

  // Draw Island Map, Landmarks & Characters
  useEffect(() => {
    let frame = 0;
    const mapCanvas = mapCanvasRef.current;
    const paperdollCanvas = paperdollCanvasRef.current;
    const wrap = wrapRef.current;
    if (!mapCanvas || !paperdollCanvas || !wrap) return;
    const mapCtx = mapCanvas.getContext('2d');
    const paperdollCtx = paperdollCanvas.getContext('2d');
    if (!mapCtx || !paperdollCtx) return;

    const syncSize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (mapCanvas.width !== targetW || mapCanvas.height !== targetH) {
        mapCanvas.width = targetW;
        mapCanvas.height = targetH;
      }
      if (paperdollCanvas.width !== targetW || paperdollCanvas.height !== targetH) {
        paperdollCanvas.width = targetW;
        paperdollCanvas.height = targetH;
      }
      setWrapSize((prev) =>
        prev.w === rect.width && prev.h === rect.height
          ? prev
          : { w: rect.width, h: rect.height }
      );
    };
    syncSize();
    window.addEventListener('resize', syncSize);

    const render = (now: number) => {
      syncSize();
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = rect.width;
      const h = rect.height;

      const layout = calculateGymIslandPartyLayout(
        currentVenueIdx,
        w,
        h,
        teammates,
        isSolo,
        getVenueCardBox,
      );

      setPartyLayout((prev) => {
        if (
          prev &&
          prev.standX === layout.standX &&
          prev.standY === layout.standY &&
          prev.heroScale === layout.heroScale &&
          prev.facingRight === layout.facingRight &&
          prev.teammatePositions.length === layout.teammatePositions.length &&
          prev.teammatePositions.every((p, i) => p.tx === layout.teammatePositions[i]?.tx && p.ty === layout.teammatePositions[i]?.ty)
        ) {
          return prev;
        }
        return layout;
      });

      mapCtx.save();
      mapCtx.scale(dpr, dpr);
      mapCtx.clearRect(0, 0, w, h);

      // 1. Cream Sky Band + Warm Soft Ocean Background (PR #2 QA Spec)
      const oceanGrad = mapCtx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#FAF6F0');
      oceanGrad.addColorStop(0.12, '#F5E6C8');
      oceanGrad.addColorStop(0.24, '#D9E8DF');
      oceanGrad.addColorStop(0.60, '#A8C9C0');
      oceanGrad.addColorStop(1.0, '#7FA8A0');
      mapCtx.fillStyle = oceanGrad;
      mapCtx.fillRect(0, 0, w, h);

      // Animated soft wave lines
      mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      mapCtx.lineWidth = 1.6;
      for (let i = 0; i < 7; i++) {
        const wy = 30 + i * 58;
        const offset = Math.sin(now / 1100 + i * 1.2) * 8;
        mapCtx.beginPath();
        mapCtx.moveTo(10, wy + offset);
        mapCtx.quadraticCurveTo(w * 0.35, wy - 7 + offset, w * 0.65, wy + 4 + offset);
        mapCtx.quadraticCurveTo(w * 0.85, wy - 5 + offset, w - 10, wy + offset);
        mapCtx.stroke();
      }

      // 2. Island Landmass Layers
      // Drop Shadow into deep sea
      mapCtx.save();
      mapCtx.fillStyle = 'rgba(12, 74, 110, 0.28)';
      mapCtx.translate(0, 7);
      drawOrganicIslandPath(mapCtx, w, h, 0);
      mapCtx.fill();
      mapCtx.restore();

      // Layer A: Rocky Cliff Edge
      mapCtx.fillStyle = '#7a6042';
      mapCtx.strokeStyle = '#5a422a';
      mapCtx.lineWidth = 4;
      drawOrganicIslandPath(mapCtx, w, h, 0);
      mapCtx.fill();
      mapCtx.stroke();

      // Layer B: Coastal Sand Beach (#E8D4A8 per PR #2 spec)
      mapCtx.fillStyle = '#E8D4A8';
      mapCtx.strokeStyle = '#d6be8e';
      mapCtx.lineWidth = 2;
      drawOrganicIslandPath(mapCtx, w, h, 7);
      mapCtx.fill();
      mapCtx.stroke();

      // Foam Crest line hugging coastline
      mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      mapCtx.lineWidth = 2;
      drawOrganicIslandPath(mapCtx, w, h, 3.5);
      mapCtx.stroke();

      // Layer C: Warm Olive Interior (#C5C07A -> #9E9A56 per PR #2 spec)
      const grassGrad = mapCtx.createLinearGradient(0, 0, 0, h);
      grassGrad.addColorStop(0, '#C5C07A');
      grassGrad.addColorStop(1, '#9E9A56');
      mapCtx.fillStyle = grassGrad;
      mapCtx.strokeStyle = '#6e6c38';
      mapCtx.lineWidth = 3;
      drawOrganicIslandPath(mapCtx, w, h, 15);
      mapCtx.fill();
      mapCtx.stroke();

      // Layer D: Topographic Sunny Plateau
      mapCtx.fillStyle = 'rgba(215, 210, 145, 0.35)';
      drawOrganicIslandPath(mapCtx, w, h, 26);
      mapCtx.fill();

      // Mini palm trees at capes
      drawMiniPalm(mapCtx, w * 0.08, h * 0.28, 0.65);
      drawMiniPalm(mapCtx, w * 0.92, h * 0.30, 0.65);
      drawMiniPalm(mapCtx, w * 0.09, h * 0.88, 0.65);
      drawMiniPalm(mapCtx, w * 0.90, h * 0.88, 0.65);

      // 3. Sandy Trails Connecting the 6 Venues
      const pts = GYM_VENUES.map((v) => ({
        x: (v.mapCoords.x / 100) * w,
        y: (v.mapCoords.y / 100) * h,
      }));

      // Main Winding Sandy Trail
      mapCtx.save();
      mapCtx.strokeStyle = '#E8D4A8';
      mapCtx.lineWidth = 9;
      mapCtx.lineCap = 'round';
      mapCtx.lineJoin = 'round';

      mapCtx.beginPath();
      mapCtx.moveTo(pts[0].x, pts[0].y);
      mapCtx.quadraticCurveTo(w * 0.5, h * 0.12, pts[1].x, pts[1].y);
      mapCtx.quadraticCurveTo(w * 0.74, h * 0.34, pts[3].x, pts[3].y);
      mapCtx.quadraticCurveTo(w * 0.50, h * 0.46, pts[2].x, pts[2].y);
      mapCtx.quadraticCurveTo(w * 0.32, h * 0.64, pts[4].x, pts[4].y);
      mapCtx.quadraticCurveTo(w * 0.52, h * 0.73, pts[5].x, pts[5].y);
      mapCtx.stroke();

      // Wooden Plank / Trail Dashes
      mapCtx.strokeStyle = '#8d754b';
      mapCtx.lineWidth = 2;
      mapCtx.setLineDash([4, 6]);
      mapCtx.stroke();
      mapCtx.setLineDash([]);
      mapCtx.restore();

      // 4. Draw 6 Canvas Landmarks Beside the Venues
      // Venue 0: Couch Lounge (left of button)
      drawSofaLandmark(mapCtx, w * 0.12, h * 0.16, 1.0);
      // Venue 1: Boba Station (right of button)
      drawBobaLandmark(mapCtx, w * 0.88, h * 0.19, 1.0);
      // Venue 2: Phone-Ghost Booth (left of button)
      drawPhoneBoothLandmark(mapCtx, w * 0.12, h * 0.46, 1.0);
      // Venue 3: Running Track Hall (right of button)
      drawTrackLandmark(mapCtx, w * 0.88, h * 0.49, 1.0);
      // Venue 4: Alarm-Clock Climbing Tower (left of button)
      drawClockTowerLandmark(mapCtx, w * 0.12, h * 0.78, 1.0);
      // Venue 5: Fried-Chicken Throne Gym (right of button)
      drawChickenThroneLandmark(mapCtx, w * 0.88, h * 0.80, 1.0);

      // 5. Active Avatar Staging Clearing Platform
      const standX = layout.standX;
      const standY = layout.standY;
      const currentPos = pts[currentVenueIdx];

      // Feeder trail connecting current venue button to the avatar platform
      if (currentPos) {
        mapCtx.save();
        mapCtx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
        mapCtx.lineWidth = 4;
        mapCtx.setLineDash([3, 4]);
        mapCtx.beginPath();
        mapCtx.moveTo(currentPos.x, currentPos.y);
        mapCtx.lineTo(standX, standY);
        mapCtx.stroke();
        mapCtx.restore();
      }

      // Wooden staging deck & pulsing amber halo
      const scaleMultiplier = layout.heroScale / 1.05;
      mapCtx.save();
      mapCtx.fillStyle = '#E8D4A8';
      mapCtx.strokeStyle = '#b59e74';
      mapCtx.lineWidth = 3;
      mapCtx.beginPath();
      mapCtx.ellipse(standX, standY + 2, 40 * scaleMultiplier, 15 * scaleMultiplier, 0, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.stroke();

      mapCtx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
      mapCtx.lineWidth = 1.5;
      mapCtx.beginPath();
      mapCtx.ellipse(standX, standY + 2, 28 * scaleMultiplier, 10.5 * scaleMultiplier, 0, 0, Math.PI * 2);
      mapCtx.stroke();

      const pulse = Math.sin(now / 350) * 3;
      mapCtx.strokeStyle = '#f97316';
      mapCtx.lineWidth = 2.2;
      mapCtx.beginPath();
      mapCtx.ellipse(standX, standY + 2, (44 + pulse) * scaleMultiplier, (17 + pulse * 0.4) * scaleMultiplier, 0, 0, Math.PI * 2);
      mapCtx.stroke();
      mapCtx.restore();

      mapCtx.restore(); // Restore mapCtx dpr scale

      // ==========================================
      // 2. PAPERDOLL CANVAS (Top Layer, z-30, pointer-events: none)
      // ==========================================
      paperdollCtx.save();
      paperdollCtx.scale(dpr, dpr);
      paperdollCtx.clearRect(0, 0, w, h);

      // Draw Teammates in rear (sorted by ty ascending)
      if (!isSolo && teammates.length > 0) {
        const positioned = teammates.map((tm, idx) => {
          const avatar = resolveSquadMemberAvatar(tm);
          const pos = layout.teammatePositions[idx] || { tx: standX, ty: standY };
          return { tm, avatar, idx, pos };
        });

        // Draw in order of ty ascending (higher up on screen drawn first)
        const sorted = [...positioned].sort((a, b) => a.pos.ty - b.pos.ty);

        sorted.forEach(({ tm, avatar, idx, pos }) => {
          const { tx, ty } = pos;

          // Soft shadow underneath
          paperdollCtx.save();
          paperdollCtx.fillStyle = 'rgba(0, 0, 0, 0.12)';
          paperdollCtx.beginPath();
          paperdollCtx.ellipse(tx, ty + 2, 16 * layout.teammateScale, 5 * layout.teammateScale, 0, 0, Math.PI * 2);
          paperdollCtx.fill();
          paperdollCtx.restore();

          paperdollCtx.save();
          paperdollCtx.translate(tx, ty);
          paperdollCtx.scale(layout.teammateScale, layout.teammateScale);

          if (!tm.hasWorkedOutToday) {
            paperdollCtx.filter = 'grayscale(1)';
            paperdollCtx.globalAlpha = 0.72;
          }

          if (avatar.status === 'syncing' || !avatar.bodyStage) {
            drawCreamChibiSilhouette(paperdollCtx, {
              x: 0,
              y: 0,
              facingRight: layout.facingRight,
              nameZh: tm.nameZh,
            });
          } else {
            drawMapleChibiAvatar(paperdollCtx, {
              x: -28,
              y: -60,
              bodyStage: avatar.bodyStage,
              equipped: avatar.equipped || {},
              state: 'IDLE',
              facingRight: layout.facingRight,
              frameTick: Math.floor(now / 16),
            });
          }

          paperdollCtx.restore();

          // QA-09: Shared drawZzz for unworked teammate
          if (!tm.hasWorkedOutToday) {
            const headTopY = ty - 60 * layout.teammateScale;
            const zOff = Math.sin(now / 300 + idx * 1.5) * 3;
            drawZzz(paperdollCtx, tx, headTopY + zOff, layout.teammateScale);
          }
        });
      }

      // Draw Hero in front
      paperdollCtx.save();
      paperdollCtx.translate(standX, standY);
      paperdollCtx.scale(layout.heroScale, layout.heroScale);
      drawMapleChibiAvatar(paperdollCtx, {
        x: -28,
        y: -60,
        bodyStage: store.bodyStage,
        equipped: store.equipped,
        state: 'IDLE',
        facingRight: layout.facingRight,
        frameTick: Math.floor(now / 16),
      });
      paperdollCtx.restore();

      paperdollCtx.restore(); // Restore paperdollCtx dpr scale

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
                第 {stage} 關
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
      {/* QA-08 (4): Layer hierarchy: bottom is map canvas, middle is venue cards, top is paperdoll canvas (pointer-events: none) */}
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#A8C9C0]">
        {/* Layer 1: Map Canvas (Lowest, z-0) */}
        <canvas
          ref={mapCanvasRef}
          className="absolute inset-0 block h-full w-full z-0"
        />

        {/* Layer 2: Teammates Paper Dolls Cluster Hit Areas (Lower transparent hit area, z-10) */}
        {!isSolo && teammates.length > 0 && partyLayout && (
          <>
            {/* Team Cluster Bounding Area (opens first teammate in cluster) */}
            <button
              type="button"
              onClick={() => store.setInspectMemberId(teammates[0].id)}
              aria-label="檢視隊伍小隊成員"
              style={{
                left: `${partyLayout.clusterHitRect.left}px`,
                top: `${partyLayout.clusterHitRect.top}px`,
                width: `${partyLayout.clusterHitRect.width}px`,
                height: `${partyLayout.clusterHitRect.height}px`,
              }}
              className="absolute z-10 cursor-pointer rounded-2xl border border-transparent transition-transform duration-120 active:scale-95"
            />

            {/* Individual Teammates Hit Rects (opens that specific teammate) */}
            {teammates.map((tm, idx) => {
              const pos = partyLayout.teammatePositions[idx];
              if (!pos) return null;
              const { tx, ty } = pos;
              const hitW = 56 * partyLayout.teammateScale + 16;
              const hitH = 65 * partyLayout.teammateScale + 16;
              const hitX = tx - 28 * partyLayout.teammateScale - 8;
              const hitY = ty - 60 * partyLayout.teammateScale - 8;

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
                  className="absolute z-10 cursor-pointer rounded-2xl border border-transparent transition-transform duration-120 active:scale-95 hover:border-amber-400/40"
                />
              );
            })}
          </>
        )}

        {/* Layer 2: QA-08 (3) "你在這裡" Badge (z-20, centered horizontally at current venue card, 10px above top edge) */}
        {(() => {
          const cardBox = getVenueCardBox(currentVenueIdx);
          return (
            <div
              style={{
                left: `${cardBox.cx}px`,
                top: `${cardBox.top - 10}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className="pointer-events-none absolute z-20 whitespace-nowrap"
            >
              <div className="flex h-[20px] items-center justify-center rounded-md bg-[#EA580C] px-2 text-[11px] font-bold text-white shadow-md">
                <span>你在這裡</span>
              </div>
            </div>
          );
        })()}

        {/* Layer 2: 6 Interactive Venue Nodes Overlay (z-20) */}
        {GYM_VENUES.map((venue) => {
          const status = getNodeStatus(venue.index);
          const isSelected = selectedVenueIdx === venue.index;
          const isCurrent = status === 'current';
          const isCleared = status === 'cleared';
          const isLocked = status === 'locked';

          return (
            <div
              key={venue.index}
              ref={(el) => {
                venueCardRefs.current[venue.index] = el;
              }}
              style={{
                left: `${venue.mapCoords.x}%`,
                top: `${venue.mapCoords.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-20 select-none"
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

        {/* Layer 3: Paper-doll Canvas (Top Layer, z-30, pointer-events: none) */}
        <canvas
          ref={paperdollCanvasRef}
          className="pointer-events-none absolute inset-0 block h-full w-full z-30"
        />
      </div>

      {/* Selected Venue Preview Sheet / Bottom Card */}
      <div className="z-10 shrink-0 border-t-2 border-border bg-card p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-black text-primary-foreground">
                第 {selectedVenue.index + 1 + (currentFloor - 1) * 6} 關
              </span>
              <h2 className="truncate text-sm font-black text-foreground">
                {selectedVenue.nameZh}
              </h2>
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
