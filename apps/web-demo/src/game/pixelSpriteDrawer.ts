import { AvatarBodyStage, AvatarExpression, EquipSlot, RoomSlot } from '../config/catalogConfig';

export interface VisitorAvatarConfig {
  nickname: string;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
}

export interface RoomRenderState {
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  isNight: boolean;
  frameTick: number;
  avatarX: number; // Logical 0..240
  avatarY: number; // Logical 0..150
  avatarState: 'IDLE' | 'WALK' | 'SQUAT' | 'CURL' | 'CHEER';
  expressionOverride?: AvatarExpression;
  facingRight: boolean;
  petHearts: { x: number; y: number; alpha: number }[];
  visitorAvatar?: VisitorAvatarConfig;
}

const OUTLINE = '#2b1d16';

/**
 * Helper to draw a rounded rectangle with fill & optional stroke
 */
function fillStrokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
  stroke: string = OUTLINE,
  lineWidth: number = 1.2
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Helper to draw an ellipse with fill & optional stroke
 */
function fillStrokeEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
  stroke: string = OUTLINE,
  lineWidth: number = 1.2,
  rotation: number = 0
) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * ============================================================================
 * 1. HD 2D CEL-SHADED ROOM DECOR & PETS (Supports any of the 3 Anchor Slots)
 * ============================================================================
 */
function drawRoomDecorItemAt(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  anchorX: number,
  floorY: number,
  frameTick: number
) {
  if (!itemId || itemId === 'empty') return;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Ground soft shadow
  fillStrokeEllipse(ctx, anchorX + 26, floorY + 22, 24, 5.5, 'rgba(15, 23, 42, 0.18)', '', 0);

  // ---------------- A. SQUAT RACKS ----------------
  if (itemId === 'rack_classic_cage' || itemId === 'rack_crimson_pro') {
    const isCrimson = itemId === 'rack_crimson_pro';
    const postMain = isCrimson ? '#ef4444' : '#475569';
    const postDark = isCrimson ? '#b91c1c' : '#334155';
    const accent = isCrimson ? '#facc15' : '#38bdf8';

    // Base rails
    fillStrokeRoundRect(ctx, anchorX + 2, floorY + 14, 48, 6, 3, postDark, OUTLINE, 1.2);
    // Back upright columns
    fillStrokeRoundRect(ctx, anchorX + 10, floorY - 54, 5, 68, 2, postDark, OUTLINE, 1.1);
    fillStrokeRoundRect(ctx, anchorX + 37, floorY - 54, 5, 68, 2, postDark, OUTLINE, 1.1);
    // Front upright columns
    fillStrokeRoundRect(ctx, anchorX + 5, floorY - 50, 5.5, 66, 2, postMain, OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, anchorX + 41.5, floorY - 50, 5.5, 66, 2, postMain, OUTLINE, 1.2);

    // Top pull-up crossbeam
    fillStrokeRoundRect(ctx, anchorX + 3, floorY - 54, 46, 6, 3, postMain, OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, anchorX + 16, floorY - 53, 20, 4, 2, accent, OUTLINE, 0.9);

    // J-Cups
    fillStrokeRoundRect(ctx, anchorX + 4, floorY - 24, 8, 5, 1.5, accent, OUTLINE, 1);
    fillStrokeRoundRect(ctx, anchorX + 40, floorY - 24, 8, 5, 1.5, accent, OUTLINE, 1);

    // Olympic Barbell resting on rack
    fillStrokeRoundRect(ctx, anchorX - 6, floorY - 26, 64, 3.2, 1.5, '#e2e8f0', OUTLINE, 1.1);
    // Bumper plates (Red 25kg + Blue 20kg)
    fillStrokeRoundRect(ctx, anchorX - 2, floorY - 36, 4.5, 22, 2, '#ef4444', OUTLINE, 1.1);
    fillStrokeRoundRect(ctx, anchorX + 2.5, floorY - 34, 4, 18, 1.8, '#3b82f6', OUTLINE, 1.1);
    fillStrokeRoundRect(ctx, anchorX + 49.5, floorY - 36, 4.5, 22, 2, '#ef4444', OUTLINE, 1.1);
    fillStrokeRoundRect(ctx, anchorX + 45.5, floorY - 34, 4, 18, 1.8, '#3b82f6', OUTLINE, 1.1);
    ctx.restore();
    return;
  }

  // ---------------- B. RETRO ARCADE CABINET ----------------
  if (itemId === 'prop_arcade_cabinet') {
    const bodyGrad = ctx.createLinearGradient(anchorX, floorY - 48, anchorX + 40, floorY + 20);
    bodyGrad.addColorStop(0, '#8b5cf6');
    bodyGrad.addColorStop(1, '#5b21b6');
    fillStrokeRoundRect(ctx, anchorX + 8, floorY - 46, 36, 66, 6, bodyGrad, OUTLINE, 1.3);

    // Top marquee sign
    fillStrokeRoundRect(ctx, anchorX + 6, floorY - 50, 40, 10, 4, '#f43f5e', OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, anchorX + 10, floorY - 48, 32, 6, 2, '#fde047', '', 0);

    // Glowing CRT Screen
    const screenGlow = frameTick % 40 < 20 ? '#38bdf8' : '#22d3ee';
    fillStrokeRoundRect(ctx, anchorX + 12, floorY - 35, 28, 20, 4, '#0f172a', OUTLINE, 1.1);
    fillStrokeRoundRect(ctx, anchorX + 14, floorY - 33, 24, 16, 3, screenGlow, '', 0);
    // Screen shine
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(anchorX + 18, floorY - 29, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Control deck & joystick
    fillStrokeRoundRect(ctx, anchorX + 6, floorY - 13, 40, 8, 3, '#c084fc', OUTLINE, 1.1);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(anchorX + 16, floorY - 13);
    ctx.lineTo(anchorX + 16, floorY - 19);
    ctx.stroke();
    fillStrokeEllipse(ctx, anchorX + 16, floorY - 20, 2.8, 2.8, '#ef4444', OUTLINE, 1);
    fillStrokeEllipse(ctx, anchorX + 28, floorY - 10, 2.2, 1.5, '#facc15', OUTLINE, 0.8);
    fillStrokeEllipse(ctx, anchorX + 34, floorY - 11, 2.2, 1.5, '#22c55e', OUTLINE, 0.8);
    ctx.restore();
    return;
  }

  // ---------------- C. DUMBBELL TOWER ----------------
  if (itemId === 'prop_dumbbell_tower') {
    // A-Frame rack
    ctx.beginPath();
    ctx.moveTo(anchorX + 22, floorY - 34);
    ctx.lineTo(anchorX + 10, floorY + 20);
    ctx.lineTo(anchorX + 42, floorY + 20);
    ctx.lineTo(anchorX + 30, floorY - 34);
    ctx.closePath();
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // 4 tiers of glossy hex dumbbells
    for (let i = 0; i < 4; i++) {
      const y = floorY - 26 + i * 11;
      const w = 16 + i * 3;
      const x = anchorX + 26 - w / 2;
      fillStrokeRoundRect(ctx, x + 3, y + 1.5, w - 6, 2.5, 1, '#e2e8f0', OUTLINE, 0.9);
      fillStrokeRoundRect(ctx, x, y, 5, 5.5, 1.5, '#1e293b', OUTLINE, 1);
      fillStrokeRoundRect(ctx, x + w - 5, y, 5, 5.5, 1.5, '#1e293b', OUTLINE, 1);
    }
    ctx.restore();
    return;
  }

  // ---------------- D. TREADMILL ----------------
  if (itemId === 'prop_cardio_treadmill') {
    // Running deck
    fillStrokeRoundRect(ctx, anchorX + 4, floorY + 10, 44, 9, 4, '#334155', OUTLINE, 1.3);
    fillStrokeRoundRect(ctx, anchorX + 8, floorY + 12, 36, 5, 2.5, '#0f172a', '', 0);
    // Moving belt stripes
    const offset = Math.floor(frameTick / 4) % 8;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    for (let bx = anchorX + 12 + offset; bx < anchorX + 40; bx += 8) {
      ctx.beginPath();
      ctx.moveTo(bx, floorY + 12.5);
      ctx.lineTo(bx, floorY + 16.5);
      ctx.stroke();
    }
    // Upright mast & console
    ctx.beginPath();
    ctx.moveTo(anchorX + 36, floorY + 12);
    ctx.lineTo(anchorX + 42, floorY - 24);
    ctx.lineTo(anchorX + 46, floorY - 24);
    ctx.lineTo(anchorX + 41, floorY + 12);
    ctx.closePath();
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    fillStrokeRoundRect(ctx, anchorX + 30, floorY - 32, 18, 10, 3, '#1e293b', OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, anchorX + 33, floorY - 30, 12, 6, 1.5, '#22d3ee', '', 0);
    ctx.restore();
    return;
  }

  // ---------------- E. MONSTERA PLANT ----------------
  if (itemId === 'prop_plant_monstera') {
    // Cute ceramic pot
    fillStrokeRoundRect(ctx, anchorX + 16, floorY + 4, 20, 17, 4, '#f59e0b', OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, anchorX + 14, floorY + 2, 24, 5, 2.5, '#d97706', OUTLINE, 1.2);
    // Lush curved leaves
    const leaves = [
      { cx: anchorX + 15, cy: floorY - 10, rx: 10, ry: 7, rot: -0.5, col: '#22c55e' },
      { cx: anchorX + 36, cy: floorY - 10, rx: 10, ry: 7, rot: 0.5, col: '#16a34a' },
      { cx: anchorX + 26, cy: floorY - 20, rx: 11, ry: 8, rot: 0, col: '#4ade80' },
    ];
    leaves.forEach((lf) => {
      fillStrokeEllipse(ctx, lf.cx, lf.cy, lf.rx, lf.ry, lf.col, OUTLINE, 1.2, lf.rot);
    });
    ctx.restore();
    return;
  }

  // ---------------- F. CUTE PETS (Shiba Inu / Black Cat / Whey Bot) ----------------
  const bounce = Math.sin(frameTick * 0.12) * 1.4;
  const cx = anchorX + 26;
  const cy = floorY + 10 + bounce;

  if (itemId === 'pet_shiba_dog') {
    // Wagging curly tail
    const tailWag = Math.sin(frameTick * 0.25) * 2.5;
    fillStrokeEllipse(ctx, cx + 11 + tailWag * 0.4, cy - 2, 5.5, 5.5, '#f59e0b', OUTLINE, 1.2);
    fillStrokeEllipse(ctx, cx + 11 + tailWag * 0.4, cy - 2, 2.8, 2.8, '#fef3c7', '', 0);

    // Plump Shiba body
    fillStrokeRoundRect(ctx, cx - 10, cy - 4, 20, 14, 7, '#f59e0b', OUTLINE, 1.2);
    // White chest fur
    fillStrokeEllipse(ctx, cx - 2, cy + 4, 6.5, 5, '#fffbeb', '', 0);
    // Cute paws
    fillStrokeEllipse(ctx, cx - 6, cy + 10, 3.2, 2.2, '#fffbeb', OUTLINE, 1);
    fillStrokeEllipse(ctx, cx + 4, cy + 10, 3.2, 2.2, '#fffbeb', OUTLINE, 1);

    // Big adorable Shiba head
    // Pointed ears
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 12);
    ctx.lineTo(cx - 14, cy - 23);
    ctx.lineTo(cx - 4, cy - 17);
    ctx.closePath();
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 11, cy - 12);
    ctx.lineTo(cx + 14, cy - 23);
    ctx.lineTo(cx + 4, cy - 17);
    ctx.closePath();
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.stroke();

    // Head base
    fillStrokeEllipse(ctx, cx, cy - 10, 12.5, 10.5, '#f59e0b', OUTLINE, 1.3);
    // White Shiba cheeks & muzzle
    fillStrokeEllipse(ctx, cx - 5, cy - 7, 5.5, 4.5, '#fffbeb', '', 0);
    fillStrokeEllipse(ctx, cx + 5, cy - 7, 5.5, 4.5, '#fffbeb', '', 0);
    fillStrokeEllipse(ctx, cx, cy - 6.5, 5, 4, '#fffbeb', '', 0);
    // Cute white Shiba eyebrow dots (豆助!)
    fillStrokeEllipse(ctx, cx - 4.5, cy - 14.5, 2, 1.3, '#fffbeb', '', 0);
    fillStrokeEllipse(ctx, cx + 4.5, cy - 14.5, 2, 1.3, '#fffbeb', '', 0);

    // Red Gym Sweatband on Shiba
    fillStrokeRoundRect(ctx, cx - 11.5, cy - 18, 23, 3.2, 1.5, '#ef4444', OUTLINE, 1);

    // Glossy eyes & nose
    fillStrokeEllipse(ctx, cx - 4.8, cy - 10.5, 1.8, 2.1, '#1e1410', '', 0);
    fillStrokeEllipse(ctx, cx + 4.8, cy - 10.5, 1.8, 2.1, '#1e1410', '', 0);
    fillStrokeEllipse(ctx, cx - 5.3, cy - 11.2, 0.7, 0.7, '#ffffff', '', 0);
    fillStrokeEllipse(ctx, cx + 4.3, cy - 11.2, 0.7, 0.7, '#ffffff', '', 0);
    // Blush
    fillStrokeEllipse(ctx, cx - 8, cy - 8, 2.2, 1.2, 'rgba(251, 113, 133, 0.55)', '', 0);
    fillStrokeEllipse(ctx, cx + 8, cy - 8, 2.2, 1.2, 'rgba(251, 113, 133, 0.55)', '', 0);
    // Nose & happy mouth
    fillStrokeEllipse(ctx, cx, cy - 8, 1.8, 1.3, '#1e1410', '', 0);
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy - 6.5, 1.5, 0, Math.PI);
    ctx.arc(cx + 1.5, cy - 6.5, 1.5, 0, Math.PI);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (itemId === 'pet_black_cat') {
    // Sleek curving tail
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy + 5);
    ctx.quadraticCurveTo(cx + 19, cy - 2, cx + 15, cy - 12);
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Cat body & head
    fillStrokeRoundRect(ctx, cx - 8, cy - 3, 16, 13, 6, '#1e1b4b', OUTLINE, 1.2);
    // Gold collar bell
    fillStrokeRoundRect(ctx, cx - 6, cy - 3, 12, 2.5, 1, '#ef4444', OUTLINE, 0.8);
    fillStrokeEllipse(ctx, cx, cy - 1, 2.2, 2.2, '#facc15', OUTLINE, 0.8);

    // Ears
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 11);
    ctx.lineTo(cx - 12, cy - 22);
    ctx.lineTo(cx - 3, cy - 16);
    ctx.moveTo(cx + 10, cy - 11);
    ctx.lineTo(cx + 12, cy - 22);
    ctx.lineTo(cx + 3, cy - 16);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    fillStrokeEllipse(ctx, cx, cy - 10, 11, 9.5, '#1e1b4b', OUTLINE, 1.2);
    // Glowing golden cat eyes
    fillStrokeEllipse(ctx, cx - 4.2, cy - 10, 2.6, 2.2, '#facc15', OUTLINE, 0.8);
    fillStrokeEllipse(ctx, cx + 4.2, cy - 10, 2.6, 2.2, '#facc15', OUTLINE, 0.8);
    fillStrokeEllipse(ctx, cx - 4.2, cy - 10, 0.8, 1.8, '#0f172a', '', 0);
    fillStrokeEllipse(ctx, cx + 4.2, cy - 10, 0.8, 1.8, '#0f172a', '', 0);
    // Pink nose
    fillStrokeEllipse(ctx, cx, cy - 7.5, 1.4, 1, '#fb7185', '', 0);
    ctx.restore();
    return;
  }

  if (itemId === 'pet_whey_bot') {
    const hover = Math.sin(frameTick * 0.15) * 3;
    const by = cy - 8 + hover;
    // Glow ring on floor
    fillStrokeEllipse(ctx, cx, floorY + 20, 10, 3, 'rgba(34, 211, 238, 0.45)', '#06b6d4', 1);
    // Cute rounded capsule bot
    fillStrokeRoundRect(ctx, cx - 11, by - 10, 22, 20, 9, '#f8fafc', OUTLINE, 1.3);
    fillStrokeRoundRect(ctx, cx - 8, by - 7, 16, 11, 5, '#0f172a', OUTLINE, 1);
    // Happy LED digital eyes `^ ^`
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx - 3.8, by - 1, 2.2, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 3.8, by - 1, 2.2, Math.PI, 0);
    ctx.stroke();
    // Antenna
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx, by - 10);
    ctx.lineTo(cx, by - 16);
    ctx.stroke();
    fillStrokeEllipse(ctx, cx, by - 17, 2.5, 2.5, '#22d3ee', OUTLINE, 1);
  }

  ctx.restore();
}

/**
 * ============================================================================
 * 2. MAPLESTORY-STYLE HD 2D CHIBI PAPER-DOLL AVATAR RENDERER
 *    (Big Cute Head, Glossy Anime Eyes, Cel-Shaded Hair & Gear, Zero Blocky Pixels!)
 * ============================================================================
 */
export function drawMapleChibiAvatar(
  ctx: CanvasRenderingContext2D,
  options: {
    x: number;
    y: number;
    bodyStage: AvatarBodyStage;
    equipped: Record<EquipSlot, string>;
    state: 'IDLE' | 'WALK' | 'SQUAT' | 'CURL' | 'CHEER';
    expressionOverride?: AvatarExpression;
    facingRight: boolean;
    frameTick: number;
  }
) {
  const {
    x,
    y,
    bodyStage,
    equipped,
    state,
    expressionOverride,
    facingRight,
    frameTick,
  } = options;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Center pivot at character's feet/waist
  const centerX = x + 28;
  const baseY = y + 60;
  ctx.translate(centerX, baseY);
  if (!facingRight) {
    ctx.scale(-1, 1);
  }

  // Dynamic skeletal animation offsets
  const isSquat = state === 'SQUAT' && Math.floor(frameTick / 22) % 2 === 1;
  const isCurl = state === 'CURL' && Math.floor(frameTick / 16) % 2 === 1;
  const isCheer = state === 'CHEER';
  const walkPhase = state === 'WALK' ? Math.sin(frameTick * 0.25) : 0;
  const breathY = Math.sin(frameTick * 0.1) * 1.1;
  const squatDrop = isSquat ? 7.5 : Math.abs(walkPhase) * 1.5;

  // Body width multiplier by physique stage
  const torsoW =
    bodyStage === 'titan'
      ? 25
      : bodyStage === 'powerlifter'
      ? 23
      : bodyStage === 'aesthetic'
      ? 20
      : 18;

  // 0. GROUND SHADOW & TITAN AURA
  fillStrokeEllipse(ctx, 0, 2, 18, 4.5, 'rgba(15, 23, 42, 0.24)', '', 0);

  if (bodyStage === 'titan') {
    const auraGrad = ctx.createRadialGradient(0, -28 + squatDrop, 6, 0, -28 + squatDrop, 34);
    auraGrad.addColorStop(0, 'rgba(250, 204, 21, 0.35)');
    auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    fillStrokeEllipse(ctx, 0, -28 + squatDrop, 32, 34, auraGrad, '', 0);
  }

  // ---------------- 1. BACK HAIR LAYER (If long/spiky) ----------------
  const headY = -41 + squatDrop + breathY;
  if (equipped.hair === 'hair_spiky_gold') {
    ctx.beginPath();
    ctx.moveTo(-16, headY - 2);
    ctx.lineTo(-24, headY - 12);
    ctx.lineTo(-14, headY - 15);
    ctx.lineTo(-19, headY - 25);
    ctx.lineTo(0, headY - 20);
    ctx.lineTo(19, headY - 25);
    ctx.lineTo(14, headY - 15);
    ctx.lineTo(24, headY - 12);
    ctx.lineTo(16, headY - 2);
    ctx.closePath();
    const goldGrad = ctx.createLinearGradient(0, headY - 26, 0, headY + 4);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.5, '#facc15');
    goldGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // ---------------- 2. LEGS, SHORTS & SNEAKERS (bottom) ----------------
  const leftLegX = -5.5 + walkPhase * 3.5 - (isSquat ? 2.5 : 0);
  const rightLegX = 5.5 - walkPhase * 3.5 + (isSquat ? 2.5 : 0);
  const hipY = -17 + squatDrop;

  let shortsMain = '#334155';
  let shortsTrim = '#38bdf8';
  if (equipped.bottom === 'bottom_neon_shorts') {
    shortsMain = '#0284c7';
    shortsTrim = '#a855f7';
  } else if (equipped.bottom === 'bottom_gold_tights') {
    shortsMain = '#1e1b4b';
    shortsTrim = '#facc15';
  }

  // Left & Right Legs + Sneakers
  [leftLegX, rightLegX].forEach((lx, idx) => {
    const legLift = idx === 0 ? Math.max(0, walkPhase * 2.5) : Math.max(0, -walkPhase * 2.5);
    // Thigh / Calf skin
    fillStrokeRoundRect(ctx, lx - 3.8, hipY + 3, 7.6, 11 - squatDrop * 0.4, 3.5, '#ffdfc4', OUTLINE, 1.2);
    // Shorts leg
    fillStrokeRoundRect(ctx, lx - 4.6, hipY, 9.2, 7.5, 3, shortsMain, OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, lx - 4.4, hipY + 5.5, 8.8, 1.8, 0.8, shortsTrim, '', 0);
    // White athletic socks
    fillStrokeRoundRect(ctx, lx - 3.6, -5 - legLift, 7.2, 3.5, 1.2, '#ffffff', OUTLINE, 1);
    // Chibi Rounded Sneakers
    fillStrokeRoundRect(ctx, lx - 4.5, -2.5 - legLift, 10, 5, 2.5, '#ef4444', OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, lx - 4.5, 1 - legLift, 10, 2, 1, '#f8fafc', OUTLINE, 0.9);
  });

  // ---------------- 3. TORSO & TOP APPAREL (top) ----------------
  const torsoY = -30 + squatDrop + breathY * 0.6;
  const torsoH = 15.5;

  // Skin upper chest/neck base
  fillStrokeRoundRect(
    ctx,
    -torsoW / 2,
    torsoY,
    torsoW,
    torsoH,
    6,
    '#ffdfc4',
    OUTLINE,
    1.3
  );

  if (equipped.top === 'top_crimson_sbd') {
    // Red & Black SBD Powerlifting Singlet
    fillStrokeRoundRect(ctx, -torsoW / 2, torsoY, torsoW, torsoH, 5.5, '#1e293b', OUTLINE, 1.3);
    fillStrokeRoundRect(ctx, -torsoW / 2 + 3, torsoY + 1, torsoW - 6, torsoH - 2, 4, '#dc2626', OUTLINE, 1);
    // SBD Lever Belt
    fillStrokeRoundRect(ctx, -torsoW / 2 - 0.5, torsoY + 10, torsoW + 1, 4.2, 1.5, '#0f172a', OUTLINE, 1.1);
    fillStrokeRoundRect(ctx, -3, torsoY + 10.2, 6, 3.8, 1, '#facc15', OUTLINE, 0.9);
  } else if (equipped.top === 'top_pump_hoodie') {
    // Cozy Streetwear Pump Cover Hoodie
    const hoodieGrad = ctx.createLinearGradient(0, torsoY, 0, torsoY + torsoH);
    hoodieGrad.addColorStop(0, '#64748b');
    hoodieGrad.addColorStop(1, '#334155');
    fillStrokeRoundRect(ctx, -torsoW / 2 - 1.5, torsoY - 1, torsoW + 3, torsoH + 2, 6.5, hoodieGrad, OUTLINE, 1.3);
    // White drawstrings & Cyan chest logo
    fillStrokeRoundRect(ctx, -5, torsoY + 4, 10, 2.5, 1.2, '#38bdf8', '', 0);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2.5, torsoY + 1);
    ctx.lineTo(-2.5, torsoY + 6);
    ctx.moveTo(2.5, torsoY + 1);
    ctx.lineTo(2.5, torsoY + 6);
    ctx.stroke();
  } else if (equipped.top === 'top_gold_armor') {
    // Titan Golden Armor
    const armorGrad = ctx.createLinearGradient(-torsoW / 2, torsoY, torsoW / 2, torsoY + torsoH);
    armorGrad.addColorStop(0, '#fef08a');
    armorGrad.addColorStop(0.5, '#f59e0b');
    armorGrad.addColorStop(1, '#b45309');
    fillStrokeRoundRect(ctx, -torsoW / 2 - 1, torsoY, torsoW + 2, torsoH + 1, 5.5, armorGrad, OUTLINE, 1.3);
    // Glowing cyan energy core
    fillStrokeEllipse(ctx, 0, torsoY + 7, 3.5, 3.5, '#22d3ee', OUTLINE, 1);
  } else {
    // Classic Obsidian Gym Stringer Tank
    fillStrokeRoundRect(ctx, -torsoW / 2 + 1.5, torsoY + 1, torsoW - 3, torsoH - 1, 5, '#1e293b', OUTLINE, 1.2);
    fillStrokeRoundRect(ctx, -4.5, torsoY + 5, 9, 2.2, 1, '#10b981', '', 0);
  }

  // ---------------- 4. ARMS & HELD GYM ACCESSORY (accessory) ----------------
  const shoulderY = torsoY + 3.5;
  const armAngle = isCheer ? -2.3 : isCurl ? -1.1 : isSquat ? -0.6 : walkPhase * 0.45;

  // Back Arm
  ctx.save();
  ctx.translate(-torsoW / 2 - 1, shoulderY);
  ctx.rotate(-armAngle * 0.7);
  fillStrokeRoundRect(ctx, -3.5, -1, 7, 11, 3.5, '#ffdfc4', OUTLINE, 1.2);
  fillStrokeEllipse(ctx, 0, 10.5, 3.6, 3.2, '#ffdfc4', OUTLINE, 1.2);
  ctx.restore();

  // Front Arm + Held Equipment
  ctx.save();
  ctx.translate(torsoW / 2 + 1, shoulderY);
  ctx.rotate(armAngle);
  fillStrokeRoundRect(ctx, -3.5, -1, 7, 11, 3.5, '#ffdfc4', OUTLINE, 1.2);
  fillStrokeEllipse(ctx, 0, 10.5, 3.8, 3.4, '#ffdfc4', OUTLINE, 1.2);

  // Held Accessory in Front Hand (when not doing Barbell Back Squat)
  if (state !== 'SQUAT') {
    const acc = equipped.accessory;
    if (acc === 'acc_iron_dumbbell' || acc === 'acc_hex_dumbbell') {
      fillStrokeRoundRect(ctx, -7, 9, 14, 2.6, 1, '#cbd5e1', OUTLINE, 1);
      fillStrokeRoundRect(ctx, -9, 6.5, 4.5, 7.5, 1.5, '#1e293b', OUTLINE, 1.1);
      fillStrokeRoundRect(ctx, 4.5, 6.5, 4.5, 7.5, 1.5, '#1e293b', OUTLINE, 1.1);
    } else if (acc === 'acc_protein_shaker') {
      fillStrokeRoundRect(ctx, -3.5, 5, 7, 10, 2, '#10b981', OUTLINE, 1.1);
      fillStrokeRoundRect(ctx, -4, 3, 8, 2.8, 1.2, '#0f172a', OUTLINE, 1);
      fillStrokeRoundRect(ctx, -2, 7, 4, 5, 1, 'rgba(255,255,255,0.65)', '', 0);
    }
  }
  ctx.restore();

  // If Squatting or Equipped 24K Gold Barbell: Draw Full Competition Barbell!
  if (state === 'SQUAT' || equipped.accessory === 'acc_gold_barbell') {
    const isGold = equipped.accessory === 'acc_gold_barbell';
    const barY = state === 'SQUAT' ? torsoY + 1 : torsoY + 11 - (isCurl ? 6 : 0);
    // Chrome or 24K Gold Bar
    fillStrokeRoundRect(
      ctx,
      -32,
      barY - 1.5,
      64,
      3,
      1.5,
      isGold ? '#fde047' : '#f1f5f9',
      OUTLINE,
      1.2
    );
    // Left & Right 25KG Red/Gold & 20KG Blue Competition Plates
    fillStrokeRoundRect(
      ctx,
      -28,
      barY - 10,
      4.5,
      20,
      2,
      isGold ? '#f59e0b' : '#ef4444',
      OUTLINE,
      1.2
    );
    fillStrokeRoundRect(ctx, -23.5, barY - 8.5, 3.8, 17, 1.8, '#2563eb', OUTLINE, 1.1);
    fillStrokeRoundRect(
      ctx,
      23.5,
      barY - 10,
      4.5,
      20,
      2,
      isGold ? '#f59e0b' : '#ef4444',
      OUTLINE,
      1.2
    );
    fillStrokeRoundRect(ctx, 19.7, barY - 8.5, 3.8, 17, 1.8, '#2563eb', OUTLINE, 1.1);
  }

  // ---------------- 5. MAPLESTORY BIG ADORABLE CHIBI HEAD & FACE ----------------
  // Cute side ears
  fillStrokeEllipse(ctx, -15.5, headY + 2, 3.5, 4.2, '#ffd8be', OUTLINE, 1.2);
  fillStrokeEllipse(ctx, 15.5, headY + 2, 3.5, 4.2, '#ffd8be', OUTLINE, 1.2);

  // Plump MapleStory Chibi Head Silhouette (wider soft cheeks!)
  const skinGrad = ctx.createLinearGradient(0, headY - 14, 0, headY + 14);
  skinGrad.addColorStop(0, '#fff3e8');
  skinGrad.addColorStop(1, '#ffd7ba');
  fillStrokeRoundRect(ctx, -16, headY - 13.5, 32, 26.5, 12.5, skinGrad, OUTLINE, 1.45);

  // Rosy Coral Cheek Blushes
  fillStrokeEllipse(ctx, -9.5, headY + 4.8, 3.6, 2, 'rgba(251, 113, 133, 0.5)', '', 0);
  fillStrokeEllipse(ctx, 9.5, headY + 4.8, 3.6, 2, 'rgba(251, 113, 133, 0.5)', '', 0);

  // Determine active expression
  const activeExpr: AvatarExpression =
    expressionOverride ||
    (equipped.face === 'face_pixel_shades'
      ? 'cool'
      : equipped.face === 'face_fierce_grit' || isSquat || isCurl
      ? 'strain'
      : 'smile');

  const isBlinking = frameTick % 140 > 134 && activeExpr === 'smile';

  // ---------------- 6. LAYERED ANIME EYES & EXPRESSIONS (face) ----------------
  if (activeExpr === 'cool') {
    // Sleek Deal-With-It / Maple Cool Shades with Glossy Reflection
    fillStrokeRoundRect(ctx, -13.5, headY - 3.5, 12, 7.5, 2.5, '#0f172a', OUTLINE, 1.3);
    fillStrokeRoundRect(ctx, 1.5, headY - 3.5, 12, 7.5, 2.5, '#0f172a', OUTLINE, 1.3);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-1.5, headY - 1.5);
    ctx.lineTo(1.5, headY - 1.5);
    ctx.stroke();

    // Diagonal white lens shine
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10.5, headY + 2);
    ctx.lineTo(-6.5, headY - 2);
    ctx.moveTo(4.5, headY + 2);
    ctx.lineTo(8.5, headY - 2);
    ctx.stroke();

    // Confident smirk
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-3, headY + 7.5);
    ctx.quadraticCurveTo(1, headY + 9, 4.5, headY + 6.2);
    ctx.stroke();
  } else {
    // Draw Left & Right Big Glossy MapleStory Anime Eyes
    [-6.8, 6.8].forEach((ex) => {
      if (isBlinking) {
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(ex, headY + 0.5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        // White sclera subtle backing
        fillStrokeEllipse(ctx, ex, headY + 0.5, 3.6, 4.2, '#ffffff', OUTLINE, 1.1);
        // Jewel Iris Gradient
        const irisGrad = ctx.createLinearGradient(ex, headY - 3, ex, headY + 4);
        irisGrad.addColorStop(0, '#1e1b4b');
        irisGrad.addColorStop(0.55, '#0284c7');
        irisGrad.addColorStop(1, '#38bdf8');
        fillStrokeEllipse(ctx, ex, headY + 0.7, 2.9, 3.5, irisGrad, '#1e1410', 0.9);
        // Deep pupil
        fillStrokeEllipse(ctx, ex, headY + 0.8, 1.4, 1.8, '#0f172a', '', 0);
        // Thick upper eyelash arc
        ctx.strokeStyle = '#1e1410';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(ex, headY + 0.5, 3.6, 1.1 * Math.PI, 1.9 * Math.PI);
        ctx.stroke();
        // Big top-left starlight catchlight + small bottom-right dot!
        fillStrokeEllipse(ctx, ex - 1.1, headY - 1.1, 1.25, 1.25, '#ffffff', '', 0);
        fillStrokeEllipse(ctx, ex + 1.1, headY + 2.1, 0.65, 0.65, '#ffffff', '', 0);
      }
    });

    if (activeExpr === 'strain') {
      // Determined angled eyebrows
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-10.5, headY - 5.5);
      ctx.lineTo(-3.5, headY - 3.5);
      ctx.moveTo(10.5, headY - 5.5);
      ctx.lineTo(3.5, headY - 3.5);
      ctx.stroke();

      // Clenched PR Grit Teeth
      fillStrokeRoundRect(ctx, -5, headY + 6.2, 10, 3.8, 1.6, '#ffffff', OUTLINE, 1.1);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, headY + 6.2);
      ctx.lineTo(0, headY + 10);
      ctx.stroke();

      // Shiny Anime Sweat Drop on Temple
      fillStrokeEllipse(ctx, 13.5, headY - 3, 2, 3.2, '#38bdf8', OUTLINE, 0.9);
      fillStrokeEllipse(ctx, 13.1, headY - 3.8, 0.7, 1, '#ffffff', '', 0);
    } else if (activeExpr === 'cry') {
      // Streaming Anime Tears
      fillStrokeRoundRect(ctx, -8.5, headY + 4, 3.2, 8, 1.5, '#38bdf8', '', 0);
      fillStrokeRoundRect(ctx, 5.3, headY + 4, 3.2, 8, 1.5, '#38bdf8', '', 0);
      // Wobbly mouth
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, headY + 9, 3, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else {
      // Happy eyebrows & adorable open cat/chibi smile
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(-6.8, headY - 4.2, 3, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(6.8, headY - 4.2, 3, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();

      // Cute open smile with pink tongue
      ctx.beginPath();
      ctx.arc(0, headY + 6.2, 3.4, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#fb7185';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // ---------------- 7. FRONT HAIRSTYLES & HEADGEAR (hair) ----------------
  if (equipped.hair === 'hair_spiky_gold') {
    // Front golden bangs + halo shine
    ctx.beginPath();
    ctx.moveTo(-16, headY - 4);
    ctx.quadraticCurveTo(-18, headY - 18, -8, headY - 19);
    ctx.lineTo(-4, headY - 8);
    ctx.lineTo(0, headY - 21);
    ctx.lineTo(5, headY - 8);
    ctx.lineTo(10, headY - 19);
    ctx.quadraticCurveTo(18, headY - 16, 16, headY - 4);
    ctx.quadraticCurveTo(8, headY - 12, 0, headY - 11);
    ctx.quadraticCurveTo(-8, headY - 12, -16, headY - 4);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else if (equipped.hair === 'hair_titan_crown') {
    // Silver-platinum bangs + Royal Gold Crown
    ctx.beginPath();
    ctx.moveTo(-16, headY - 4);
    ctx.quadraticCurveTo(-14, headY - 17, 0, headY - 17);
    ctx.quadraticCurveTo(14, headY - 17, 16, headY - 4);
    ctx.lineTo(10, headY - 9);
    ctx.lineTo(5, headY - 5);
    ctx.lineTo(0, headY - 10);
    ctx.lineTo(-5, headY - 5);
    ctx.lineTo(-10, headY - 9);
    ctx.closePath();
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Ornate 3-Peak Gold Crown
    ctx.beginPath();
    ctx.moveTo(-11, headY - 13);
    ctx.lineTo(-13, headY - 24);
    ctx.lineTo(-5, headY - 18);
    ctx.lineTo(0, headY - 27);
    ctx.lineTo(5, headY - 18);
    ctx.lineTo(13, headY - 24);
    ctx.lineTo(11, headY - 13);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Crown Ruby
    fillStrokeEllipse(ctx, 0, headY - 17, 2.2, 2.6, '#ef4444', OUTLINE, 0.9);
  } else if (equipped.hair === 'hair_maple_cap') {
    // Fluffy espresso side locks + Maple Streetwear Cap
    fillStrokeRoundRect(ctx, -16.5, headY - 15, 33, 9, 5, '#0284c7', OUTLINE, 1.3);
    // Cap visor brim
    fillStrokeRoundRect(ctx, -4, headY - 9.5, 23, 4, 2, '#38bdf8', OUTLINE, 1.2);
    // Maple emblem on cap
    fillStrokeEllipse(ctx, 0, headY - 11.5, 3, 3, '#facc15', OUTLINE, 0.9);
  } else {
    // Default: Fluffy Espresso Maple Hair + Red Athletic Headband
    ctx.beginPath();
    ctx.moveTo(-16.5, headY - 3);
    ctx.quadraticCurveTo(-18, headY - 18, -6, headY - 20);
    ctx.lineTo(-2, headY - 23);
    ctx.lineTo(4, headY - 20);
    ctx.quadraticCurveTo(18, headY - 18, 16.5, headY - 3);
    ctx.lineTo(11, headY - 8);
    ctx.lineTo(5, headY - 4);
    ctx.lineTo(0, headY - 9);
    ctx.lineTo(-5, headY - 4);
    ctx.lineTo(-11, headY - 8);
    ctx.closePath();
    ctx.fillStyle = '#3b251e';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Glossy hair angel-ring highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, headY - 7, 10, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();

    // Red Sweatband across forehead + fluttering ribbon tail
    fillStrokeRoundRect(ctx, -16.2, headY - 11.5, 32.4, 4.2, 2, '#ef4444', OUTLINE, 1.2);
    fillStrokeEllipse(ctx, 0, headY - 9.4, 2.2, 2.2, '#facc15', OUTLINE, 0.8);
  }

  ctx.restore();
}

/**
 * ============================================================================
 * 3. MAIN SCENE COMPOSITOR: HD 2D CEL-SHADED GYM ROOM (Scales smoothly to 960x600)
 * ============================================================================
 */
export function drawPixelGymScene(ctx: CanvasRenderingContext2D, state: RoomRenderState) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Logical coordinate system is 240 x 150, scaled smoothly to full HD canvas
  const scaleX = cw / 240;
  const scaleY = ch / 150;
  ctx.scale(scaleX, scaleY);

  const W = 240;
  const H = 150;
  const wallH = 98;

  // ---------------- 1. WARM SUNLIT / COZY WALLPAPER ----------------
  const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
  if (state.room.wallpaper === 'wall_cyber_neon') {
    wallGrad.addColorStop(0, '#312e81');
    wallGrad.addColorStop(1, '#4c1d95');
  } else if (state.room.wallpaper === 'wall_exposed_brick') {
    wallGrad.addColorStop(0, '#fed7aa');
    wallGrad.addColorStop(1, '#fdba74');
  } else {
    // Warm Cozy Maple Gym Cream/Sky Wall
    wallGrad.addColorStop(0, '#fef3c7');
    wallGrad.addColorStop(1, '#fde68a');
  }
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, wallH);

  // Subtle decorative wainscoting / wall paneling
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(0, wallH - 22, W, 20);
  // Baseboard molding
  fillStrokeRoundRect(ctx, -2, wallH - 4, W + 4, 5, 1, '#b45309', OUTLINE, 1.2);

  // ---------------- 2. LARGE SCENIC WINDOW (Day Sunlight vs Cozy Starry Night) ----------------
  const winX = 76;
  const winY = 12;
  const winW = 88;
  const winH = 54;

  const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
  if (state.isNight) {
    skyGrad.addColorStop(0, '#1e1b4b');
    skyGrad.addColorStop(1, '#312e81');
  } else {
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(1, '#bae6fd');
  }
  fillStrokeRoundRect(ctx, winX, winY, winW, winH, 6, skyGrad, OUTLINE, 1.6);

  if (state.isNight) {
    // Glowing Crescent Moon & Twinkling Stars
    fillStrokeEllipse(ctx, winX + 66, winY + 16, 7, 7, '#fef08a', '', 0);
    fillStrokeEllipse(ctx, winX + 63, winY + 14, 6, 6, '#1e1b4b', '', 0);
    fillStrokeEllipse(ctx, winX + 22, winY + 15, 1.5, 1.5, '#ffffff', '', 0);
    fillStrokeEllipse(ctx, winX + 44, winY + 24, 1.2, 1.2, '#fde047', '', 0);
  } else {
    // Warm Golden Sun & Fluffy White Maple Clouds
    fillStrokeEllipse(ctx, winX + 68, winY + 15, 8, 8, '#fde047', '#f59e0b', 1);
    const cloudOffset = (state.frameTick * 0.08) % 24;
    fillStrokeEllipse(ctx, winX + 20 + cloudOffset, winY + 24, 11, 5.5, '#ffffff', '', 0);
    fillStrokeEllipse(ctx, winX + 26 + cloudOffset, winY + 22, 8, 5, '#ffffff', '', 0);
  }
  // Distant rolling green hills in window
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(winX + 1, winY + 1, winW - 2, winH - 2, 5);
  ctx.clip();
  fillStrokeEllipse(
    ctx,
    winX + 28,
    winY + 56,
    38,
    16,
    state.isNight ? '#065f46' : '#4ade80',
    OUTLINE,
    1
  );
  fillStrokeEllipse(
    ctx,
    winX + 68,
    winY + 58,
    34,
    15,
    state.isNight ? '#047857' : '#22c55e',
    OUTLINE,
    1
  );
  ctx.restore();

  // Window wooden mullion bars & sill
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.stroke();
  fillStrokeRoundRect(ctx, winX - 3, winY + winH - 2, winW + 6, 5, 2, '#d97706', OUTLINE, 1.3);

  // ---------------- 3. WARM HONEY-WOOD / GYM FLOOR ----------------
  const floorGrad = ctx.createLinearGradient(0, wallH, 0, H);
  if (state.room.floor === 'floor_maple_wood') {
    floorGrad.addColorStop(0, '#fcd34d');
    floorGrad.addColorStop(1, '#f59e0b');
  } else if (state.room.floor === 'floor_gold_marble') {
    floorGrad.addColorStop(0, '#f8fafc');
    floorGrad.addColorStop(1, '#e2e8f0');
  } else {
    // Cozy Warm Oak Wood Gym Floor
    floorGrad.addColorStop(0, '#fed7aa');
    floorGrad.addColorStop(1, '#f59e0b');
  }
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, wallH, W, H - wallH);

  // Perspective plank lines
  ctx.strokeStyle = 'rgba(146, 64, 14, 0.22)';
  ctx.lineWidth = 1;
  for (let fy = wallH + 10; fy < H; fy += 12) {
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(W, fy);
    ctx.stroke();
  }

  // Warm sunlight beam on floor during daytime
  if (!state.isNight) {
    ctx.fillStyle = 'rgba(254, 249, 195, 0.26)';
    ctx.beginPath();
    ctx.moveTo(winX + 6, wallH);
    ctx.lineTo(winX + winW - 6, wallH);
    ctx.lineTo(winX + winW + 18, H);
    ctx.lineTo(winX - 18, H);
    ctx.closePath();
    ctx.fill();
  }

  // ---------------- 4. THREE FLEXIBLE FURNITURE & PET SLOTS ----------------
  drawRoomDecorItemAt(ctx, state.room.slotLeft, 10, 96, state.frameTick);
  drawRoomDecorItemAt(ctx, state.room.slotRight, 180, 96, state.frameTick);
  drawRoomDecorItemAt(ctx, state.room.slotCenter, 134, 104, state.frameTick);

  // ---------------- 5. VISITOR AVATAR (CO-PRESENCE WHEN VISITING FRIENDS!) ----------------
  if (state.visitorAvatar) {
    const visitX = 52;
    const visitY = 74;
    drawMapleChibiAvatar(ctx, {
      x: visitX,
      y: visitY,
      bodyStage: state.visitorAvatar.bodyStage,
      equipped: state.visitorAvatar.equipped,
      state: 'CHEER',
      facingRight: true,
      frameTick: state.frameTick + 15,
    });

    // Cute Visitor Speech Tag
    fillStrokeRoundRect(ctx, visitX + 2, visitY - 2, 54, 13, 6, '#ffffff', '#10b981', 1.2);
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 6.5px "Noto Sans TC", sans-serif';
    ctx.fillText('👋 我來串門！', visitX + 6, visitY + 6.8);
  }

  // ---------------- 6. MAIN HOST AVATAR ----------------
  drawMapleChibiAvatar(ctx, {
    x: state.visitorAvatar ? 104 : state.avatarX,
    y: state.avatarY,
    bodyStage: state.bodyStage,
    equipped: state.equipped,
    state: state.avatarState,
    expressionOverride: state.expressionOverride,
    facingRight: state.visitorAvatar ? false : state.facingRight,
    frameTick: state.frameTick,
  });

  // ---------------- 7. FLOATING INTERACTION HEARTS ----------------
  state.petHearts.forEach((h) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, h.alpha);
    ctx.translate(h.x, h.y);
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-5, -2, -6, -6, -3, -6);
    ctx.bezierCurveTo(-1, -6, 0, -4, 0, -3);
    ctx.bezierCurveTo(0, -4, 1, -6, 3, -6);
    ctx.bezierCurveTo(6, -6, 5, -2, 0, 3);
    ctx.fillStyle = '#fb7185';
    ctx.fill();
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  });

  ctx.restore();
}

/**
 * ============================================================================
 * 4. HD 2D ITEM THUMBNAIL RENDERER FOR SHOP & WARDROBE CARDS (Zero Blocky Pixels!)
 * ============================================================================
 */
export function drawSingleItemThumbnail(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  slot: string,
  primaryColor: string,
  accentColor: string
) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(cw / 56, ch / 56);

  // Soft warm studio card background
  const bgGrad = ctx.createLinearGradient(0, 0, 56, 56);
  bgGrad.addColorStop(0, '#fffbeb');
  bgGrad.addColorStop(1, '#fef3c7');
  fillStrokeRoundRect(ctx, 1, 1, 54, 54, 12, bgGrad, '#fde68a', 1);

  if (slot === 'hair') {
    fillStrokeEllipse(ctx, 28, 33, 13, 12, '#ffd8be', OUTLINE, 1.3);
    if (itemId === 'hair_spiky_gold') {
      ctx.beginPath();
      ctx.moveTo(12, 30);
      ctx.lineTo(15, 11);
      ctx.lineTo(23, 18);
      ctx.lineTo(28, 8);
      ctx.lineTo(34, 18);
      ctx.lineTo(42, 11);
      ctx.lineTo(44, 30);
      ctx.closePath();
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (itemId === 'hair_titan_crown') {
      ctx.beginPath();
      ctx.moveTo(15, 24);
      ctx.lineTo(14, 11);
      ctx.lineTo(22, 18);
      ctx.lineTo(28, 9);
      ctx.lineTo(34, 18);
      ctx.lineTo(42, 11);
      ctx.lineTo(41, 24);
      ctx.closePath();
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      fillStrokeEllipse(ctx, 28, 19, 3, 3.5, '#ef4444', OUTLINE, 1);
    } else if (itemId === 'hair_maple_cap') {
      fillStrokeRoundRect(ctx, 13, 16, 30, 12, 6, primaryColor, OUTLINE, 1.4);
      fillStrokeRoundRect(ctx, 22, 24, 24, 5, 2.5, accentColor, OUTLINE, 1.3);
      fillStrokeEllipse(ctx, 28, 21, 3.5, 3.5, '#facc15', OUTLINE, 1);
    } else {
      fillStrokeRoundRect(ctx, 13, 16, 30, 12, 6, '#3b251e', OUTLINE, 1.3);
      fillStrokeRoundRect(ctx, 13, 22, 30, 5.5, 2.5, '#ef4444', OUTLINE, 1.3);
      fillStrokeEllipse(ctx, 28, 24.8, 2.8, 2.8, '#facc15', OUTLINE, 1);
    }
  } else if (slot === 'face') {
    fillStrokeEllipse(ctx, 28, 28, 16, 15, '#ffd8be', OUTLINE, 1.4);
    if (itemId === 'face_pixel_shades') {
      fillStrokeRoundRect(ctx, 13, 22, 13, 9, 2.5, '#0f172a', OUTLINE, 1.3);
      fillStrokeRoundRect(ctx, 30, 22, 13, 9, 2.5, '#0f172a', OUTLINE, 1.3);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, 29);
      ctx.lineTo(22, 24);
      ctx.moveTo(33, 29);
      ctx.lineTo(39, 24);
      ctx.stroke();
    } else if (itemId === 'face_fierce_grit') {
      fillStrokeEllipse(ctx, 21, 25, 3, 3.5, '#1e1410', '', 0);
      fillStrokeEllipse(ctx, 35, 25, 3, 3.5, '#1e1410', '', 0);
      fillStrokeRoundRect(ctx, 20, 33, 16, 5, 2, '#ffffff', OUTLINE, 1.2);
      fillStrokeEllipse(ctx, 41, 21, 2.5, 4, '#38bdf8', OUTLINE, 1);
    } else {
      fillStrokeEllipse(ctx, 21, 26, 3.2, 4, '#0284c7', OUTLINE, 1);
      fillStrokeEllipse(ctx, 35, 26, 3.2, 4, '#0284c7', OUTLINE, 1);
      fillStrokeEllipse(ctx, 20, 24.5, 1.2, 1.2, '#ffffff', '', 0);
      fillStrokeEllipse(ctx, 34, 24.5, 1.2, 1.2, '#ffffff', '', 0);
      ctx.beginPath();
      ctx.arc(28, 33, 4.5, 0, Math.PI);
      ctx.fillStyle = '#fb7185';
      ctx.fill();
      ctx.stroke();
    }
  } else if (slot === 'top') {
    fillStrokeRoundRect(ctx, 14, 14, 28, 30, 7, primaryColor, OUTLINE, 1.5);
    fillStrokeRoundRect(ctx, 20, 22, 16, 8, 3, accentColor, OUTLINE, 1.1);
  } else if (slot === 'bottom') {
    fillStrokeRoundRect(ctx, 14, 16, 28, 14, 4, primaryColor, OUTLINE, 1.4);
    fillStrokeRoundRect(ctx, 14, 26, 12, 16, 3, primaryColor, OUTLINE, 1.4);
    fillStrokeRoundRect(ctx, 30, 26, 12, 16, 3, primaryColor, OUTLINE, 1.4);
    fillStrokeRoundRect(ctx, 14, 38, 12, 4, 1, accentColor, OUTLINE, 1);
    fillStrokeRoundRect(ctx, 30, 38, 12, 4, 1, accentColor, OUTLINE, 1);
  } else if (slot === 'accessory') {
    if (itemId === 'acc_protein_shaker') {
      fillStrokeRoundRect(ctx, 20, 16, 16, 28, 4, primaryColor, OUTLINE, 1.4);
      fillStrokeRoundRect(ctx, 18, 11, 20, 6, 2.5, accentColor, OUTLINE, 1.3);
    } else if (itemId === 'acc_gold_belt') {
      fillStrokeRoundRect(ctx, 8, 22, 40, 12, 4, primaryColor, OUTLINE, 1.4);
      fillStrokeEllipse(ctx, 28, 28, 6, 5, accentColor, OUTLINE, 1.2);
    } else {
      fillStrokeRoundRect(ctx, 6, 26, 44, 4, 2, '#e2e8f0', OUTLINE, 1.2);
      fillStrokeRoundRect(ctx, 10, 14, 6, 28, 2.5, primaryColor, OUTLINE, 1.3);
      fillStrokeRoundRect(ctx, 40, 14, 6, 28, 2.5, primaryColor, OUTLINE, 1.3);
    }
  } else if (slot === 'wallpaper' || slot === 'floor') {
    fillStrokeRoundRect(ctx, 10, 10, 36, 36, 8, primaryColor, OUTLINE, 1.4);
    fillStrokeRoundRect(ctx, 16, 22, 24, 12, 4, accentColor, OUTLINE, 1.1);
  } else {
    // Room furniture or pet preview
    drawRoomDecorItemAt(ctx, itemId, 2, 26, 12);
  }

  ctx.restore();
}
