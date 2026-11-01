import {
  AvatarBodyStage,
  AvatarExpression,
  EquipSlot,
  RoomSlot,
} from '../config/catalogConfig';

export interface VisitorAvatarConfig {
  nickname: string;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
}

export interface PixelRenderConfig {
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  isNight: boolean;
  frameTick: number;
  avatarX: number;
  avatarY: number;
  avatarState: 'IDLE' | 'WALK' | 'SQUAT' | 'CURL' | 'CHEER';
  expressionOverride?: AvatarExpression;
  facingRight: boolean;
  petHearts: { x: number; y: number; alpha: number }[];
  visitorAvatar?: VisitorAvatarConfig;
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function outlinedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  highlight?: string,
  shadow?: string,
  outline: string = '#181224'
) {
  px(ctx, x + 2, y, w - 4, h, outline);
  px(ctx, x, y + 2, w, h - 4, outline);
  px(ctx, x + 2, y + 2, w - 4, h - 4, fill);
  if (highlight) {
    px(ctx, x + 2, y + 2, w - 4, 3, highlight);
  }
  if (shadow) {
    px(ctx, x + 2, y + h - 5, w - 4, 3, shadow);
  }
}

/**
 * Draws any placeable Room Decor / Equipment / Pet at a given anchor (slotLeft, slotCenter, slotRight)
 */
export function drawRoomDecorItemAt(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  anchorX: number,
  floorBaseY: number,
  t: number
) {
  if (!itemId || itemId === 'empty') return;

  if (itemId === 'rack_classic_cage' || itemId === 'rack_crimson_pro') {
    const isCrimson = itemId === 'rack_crimson_pro';
    const rackMain = isCrimson ? '#dc2626' : '#475569';
    const rackHi = isCrimson ? '#f87171' : '#94a3b8';
    const rackDark = isCrimson ? '#7f1d1d' : '#1e293b';
    const rx = anchorX;
    const ry = floorBaseY - 156;

    outlinedBox(ctx, rx + 12, ry + 6, 9, 144, rackDark);
    outlinedBox(ctx, rx + 82, ry + 6, 9, 144, rackDark);
    outlinedBox(ctx, rx, ry, 11, 154, rackMain, rackHi, rackDark);
    outlinedBox(ctx, rx + 72, ry, 11, 154, rackMain, rackHi, rackDark);
    outlinedBox(ctx, rx - 4, ry - 4, 96, 11, rackMain, rackHi, rackDark);
    outlinedBox(ctx, rx - 6, ry + 148, 102, 10, '#334155', '#64748b', '#0f172a');

    // Loaded Olympic Barbell
    const barY = ry + 70;
    px(ctx, rx - 16, barY, 118, 5, '#181224');
    px(ctx, rx - 14, barY + 1, 114, 3, '#e2e8f0');
    outlinedBox(ctx, rx - 12, barY - 16, 8, 38, '#dc2626', '#fca5a5', '#991b1b');
    outlinedBox(ctx, rx - 5, barY - 13, 7, 32, '#2563eb', '#93c5fd', '#1d4ed8');
    outlinedBox(ctx, rx + 88, barY - 16, 8, 38, '#dc2626', '#fca5a5', '#991b1b');
    outlinedBox(ctx, rx + 82, barY - 13, 7, 32, '#2563eb', '#93c5fd', '#1d4ed8');
    return;
  }

  if (itemId === 'prop_arcade_cabinet') {
    const pxProp = anchorX + 12;
    const pyProp = floorBaseY - 122;
    outlinedBox(ctx, pxProp, pyProp, 58, 122, '#6d28d9', '#8b5cf6', '#4c1d95');
    outlinedBox(ctx, pxProp - 2, pyProp - 4, 62, 16, '#f43f5e', '#fda4af', '#be123c');
    px(ctx, pxProp + 8, pyProp + 2, 42, 5, '#fef08a');
    outlinedBox(ctx, pxProp + 6, pyProp + 16, 46, 36, '#090d16');
    const arcadeScreen = Math.floor(t / 12) % 2 === 0 ? '#10b981' : '#06b6d4';
    px(ctx, pxProp + 10, pyProp + 20, 38, 28, '#111c2d');
    px(ctx, pxProp + 15, pyProp + 26, 12, 12, arcadeScreen);
    px(ctx, pxProp + 31, pyProp + 30, 10, 8, '#f59e0b');
    outlinedBox(ctx, pxProp - 4, pyProp + 54, 66, 11, '#334155', '#64748b');
    px(ctx, pxProp + 12, pyProp + 47, 6, 6, '#ef4444');
    px(ctx, pxProp + 34, pyProp + 52, 6, 4, '#facc15');
    px(ctx, pxProp + 44, pyProp + 52, 6, 4, '#22c55e');
    return;
  }

  if (itemId === 'prop_dumbbell_tower') {
    const pxProp = anchorX + 14;
    const pyProp = floorBaseY - 114;
    outlinedBox(ctx, pxProp + 10, pyProp + 6, 40, 108, '#334155', '#64748b', '#1e293b');
    for (let i = 0; i < 5; i++) {
      const dy = pyProp + 16 + i * 19;
      outlinedBox(ctx, pxProp + 2, dy, 13, 11, '#1e293b', '#475569');
      outlinedBox(ctx, pxProp + 45, dy, 13, 11, '#1e293b', '#475569');
      px(ctx, pxProp + 15, dy + 4, 30, 4, '#cbd5e1');
      px(ctx, pxProp + 5, dy + 4, 5, 3, '#38bdf8');
      px(ctx, pxProp + 49, dy + 4, 5, 3, '#38bdf8');
    }
    return;
  }

  if (itemId === 'prop_cardio_treadmill') {
    const tx = anchorX + 4;
    const ty = floorBaseY - 96;
    // Running belt base
    outlinedBox(ctx, tx, ty + 72, 78, 22, '#1e293b', '#475569', '#090d16');
    px(ctx, tx + 8, ty + 78, 62, 8, '#0f172a');
    // Upright console frame
    outlinedBox(ctx, tx + 54, ty + 14, 12, 62, '#334155', '#94a3b8');
    outlinedBox(ctx, tx + 42, ty, 34, 20, '#0f172a', '#38bdf8');
    px(ctx, tx + 48, ty + 6, 22, 8, '#22d3ee');
    return;
  }

  if (itemId === 'prop_plant_monstera') {
    const pxPlant = anchorX + 22;
    const pyPlant = floorBaseY - 78;
    // Terracotta pot
    outlinedBox(ctx, pxPlant + 8, pyPlant + 44, 32, 34, '#c2410c', '#fb923c', '#7c2d12');
    // Lush Monstera Leaves
    outlinedBox(ctx, pxPlant - 4, pyPlant + 12, 26, 24, '#15803d', '#4ade80');
    outlinedBox(ctx, pxPlant + 22, pyPlant + 8, 28, 26, '#166534', '#22c55e');
    outlinedBox(ctx, pxPlant + 8, pyPlant - 4, 28, 26, '#15803d', '#86efac');
    return;
  }

  if (itemId === 'pet_shiba_dog' || itemId === 'pet_black_cat' || itemId === 'pet_whey_bot') {
    drawChibiPetById(ctx, itemId, anchorX + 20, floorBaseY - 40, t);
  }
}

export function drawChibiPetById(
  ctx: CanvasRenderingContext2D,
  petId: string,
  baseX: number,
  baseY: number,
  t: number
) {
  const bob = Math.floor(t / 12) % 2 === 0 ? 0 : 2;
  const x = baseX;
  const y = baseY + bob;

  px(ctx, x - 4, baseY + 34, 48, 6, 'rgba(0,0,0,0.35)');

  if (petId === 'pet_black_cat') {
    outlinedBox(ctx, x + 8, y + 16, 26, 20, '#1e1b4b', '#312e81', '#0f172a');
    px(ctx, x + 10, y + 32, 6, 4, '#f8fafc');
    px(ctx, x + 24, y + 32, 6, 4, '#f8fafc');
    outlinedBox(ctx, x + 2, y - 6, 36, 26, '#1e1b4b', '#312e81', '#0f172a');
    outlinedBox(ctx, x + 4, y - 14, 10, 10, '#1e1b4b');
    px(ctx, x + 7, y - 10, 4, 4, '#f472b6');
    outlinedBox(ctx, x + 26, y - 14, 10, 10, '#1e1b4b');
    px(ctx, x + 29, y - 10, 4, 4, '#f472b6');
    px(ctx, x + 8, y + 4, 7, 7, '#facc15');
    px(ctx, x + 10, y + 5, 3, 5, '#0f172a');
    px(ctx, x + 25, y + 4, 7, 7, '#facc15');
    px(ctx, x + 27, y + 5, 3, 5, '#0f172a');
    px(ctx, x + 8, y + 18, 24, 4, '#ef4444');
    px(ctx, x + 18, y + 19, 5, 5, '#facc15');
    const tailOffset = Math.floor(t / 10) % 2 === 0 ? -3 : 3;
    outlinedBox(ctx, x + 32, y + 10 + tailOffset, 10, 16, '#1e1b4b');
  } else if (petId === 'pet_whey_bot') {
    const hoverY = baseY - 12 + Math.round(Math.sin(t * 0.1) * 5);
    outlinedBox(ctx, x + 2, hoverY, 38, 32, '#0891b2', '#22d3ee', '#155e75');
    outlinedBox(ctx, x + 6, hoverY + 6, 30, 16, '#090d16');
    px(ctx, x + 11, hoverY + 12, 6, 3, '#22d3ee');
    px(ctx, x + 25, hoverY + 12, 6, 3, '#22d3ee');
    px(ctx, x + 18, hoverY + 16, 6, 2, '#f43f5e');
    px(ctx, x + 19, hoverY - 8, 4, 8, '#cbd5e1');
    px(ctx, x + 17, hoverY - 12, 8, 6, '#f43f5e');
    px(ctx, x + 14, hoverY + 32, 14, 5, '#38bdf8');
  } else {
    // Shiba Inu
    outlinedBox(ctx, x + 8, y + 14, 30, 22, '#d97706', '#f59e0b', '#b45309');
    px(ctx, x + 12, y + 20, 18, 12, '#fef3c7');
    outlinedBox(ctx, x + 10, y + 30, 8, 7, '#fef3c7');
    outlinedBox(ctx, x + 24, y + 30, 8, 7, '#fef3c7');
    const wag = Math.floor(t / 7) % 2 === 0 ? 0 : 3;
    outlinedBox(ctx, x + 32, y + 4 + wag, 12, 12, '#d97706', '#fef3c7');
    outlinedBox(ctx, x, y - 10, 36, 28, '#d97706', '#f59e0b', '#b45309');
    outlinedBox(ctx, x + 2, y - 18, 10, 10, '#b45309', '#d97706');
    px(ctx, x + 5, y - 14, 4, 4, '#fef3c7');
    outlinedBox(ctx, x + 24, y - 18, 10, 10, '#b45309', '#d97706');
    px(ctx, x + 27, y - 14, 4, 4, '#fef3c7');
    px(ctx, x + 9, y - 3, 4, 2, '#fef3c7');
    px(ctx, x + 23, y - 3, 4, 2, '#fef3c7');
    px(ctx, x + 4, y + 5, 28, 11, '#fef3c7');
    px(ctx, x + 8, y + 1, 5, 6, '#181224');
    px(ctx, x + 9, y + 2, 2, 2, '#ffffff');
    px(ctx, x + 23, y + 1, 5, 6, '#181224');
    px(ctx, x + 24, y + 2, 2, 2, '#ffffff');
    px(ctx, x + 5, y + 7, 4, 2, '#fda4af');
    px(ctx, x + 27, y + 7, 4, 2, '#fda4af');
    px(ctx, x + 16, y + 5, 4, 3, '#181224');
    px(ctx, x + 16, y + 9, 4, 5, '#fb7185');
    px(ctx, x + 6, y + 16, 24, 5, '#ef4444');
  }
}

/**
 * Renders the 480x300 MapleStory-style 2D Side-Scrolling Gym Room
 * Supports 3 Universal Decor Slots (slotLeft, slotCenter, slotRight) + Dual-Avatar Co-Presence (V2-07 & V2-08)
 */
export function drawPixelGymScene(ctx: CanvasRenderingContext2D, cfg: PixelRenderConfig) {
  const W = 480;
  const H = 300;
  const wallH = 196;
  const t = cfg.frameTick;

  // 1. WALLPAPER
  if (cfg.room.wallpaper === 'wall_cyber_neon') {
    px(ctx, 0, 0, W, wallH, '#16112b');
    for (let y = 16; y < wallH - 28; y += 22) {
      px(ctx, 0, y, W, 2, '#221a42');
    }
    const neonGlow = Math.sin(t * 0.08) > 0 ? '#f43f5e' : '#ec4899';
    px(ctx, 0, 26, W, 4, '#a855f7');
    px(ctx, 0, wallH - 30, W, 30, '#0f0b1e');
    px(ctx, 0, wallH - 32, W, 4, neonGlow);
  } else if (cfg.room.wallpaper === 'wall_zen_wood') {
    px(ctx, 0, 0, W, wallH, '#f5e6d3');
    for (let x = 0; x < W; x += 80) {
      px(ctx, x, 0, 12, wallH, '#8c583a');
    }
    px(ctx, 0, wallH - 44, W, 44, '#6e4228');
    px(ctx, 0, wallH - 46, W, 6, '#4a2a18');
  } else {
    px(ctx, 0, 0, W, wallH, '#283142');
    for (let y = 20; y < wallH - 36; y += 20) {
      px(ctx, 0, y, W, 2, '#1f2633');
    }
    px(ctx, 0, 0, W, 14, '#161b26');
    px(ctx, 0, wallH - 36, W, 36, '#1b2230');
    px(ctx, 0, wallH - 38, W, 4, '#3b4861');
  }

  // 2. WINDOW
  const winX = 286;
  const winY = 30;
  const winW = 84;
  const winH = 76;
  outlinedBox(ctx, winX - 6, winY - 6, winW + 12, winH + 12, '#475569', '#64748b', '#1e293b');
  if (cfg.isNight) {
    px(ctx, winX, winY, winW, winH, '#0b1021');
    px(ctx, winX + 54, winY + 12, 14, 14, '#fef08a');
    px(ctx, winX + 60, winY + 10, 10, 10, '#0b1021');
    px(ctx, winX + 18, winY + 18, 3, 3, '#ffffff');
  } else {
    px(ctx, winX, winY, winW, winH, '#38bdf8');
    px(ctx, winX, winY + 52, winW, 24, '#22c55e');
    px(ctx, winX + 14, winY + 12, 16, 16, '#facc15');
    const cx = winX + 30 + Math.floor((t * 0.25) % 24);
    px(ctx, cx, winY + 24, 24, 8, '#ffffff');
  }
  px(ctx, winX + winW / 2 - 2, winY, 4, winH, '#334155');
  px(ctx, winX, winY + winH / 2 - 2, winW, 4, '#334155');

  // 3. FLOOR
  const floorY = wallH;
  const floorH = H - wallH;
  if (cfg.room.floor === 'floor_turf_green') {
    px(ctx, 0, floorY, W, floorH, '#065f46');
    for (let x = 40; x < W; x += 70) {
      px(ctx, x, floorY + 18, 6, floorH - 32, '#ecfdf5');
    }
  } else if (cfg.room.floor === 'floor_gold_marble') {
    px(ctx, 0, floorY, W, floorH, '#18181b');
    for (let y = floorY + 24; y < H; y += 26) {
      px(ctx, 0, y, W, 2, '#ca8a04');
    }
  } else {
    px(ctx, 0, floorY, W, floorH, '#161c28');
    px(ctx, 0, floorY, W, 6, '#222b3d');
    for (let y = floorY + 22; y < H; y += 24) {
      px(ctx, 0, y, W, 2, '#0f131c');
    }
  }

  // 4. UNIVERSAL 3 ROOM PLACEMENT SLOTS (V2-08: Left=24, Center=190, Right=366)
  drawRoomDecorItemAt(ctx, cfg.room.slotLeft, 24, 224, t);
  drawRoomDecorItemAt(ctx, cfg.room.slotRight, 372, 224, t);
  drawRoomDecorItemAt(ctx, cfg.room.slotCenter, 298, 242, t);

  // 5. MAIN HOST AVATAR
  if (cfg.visitorAvatar) {
    // When visiting a friend's room, Host stands on the left-center, Visitor (You) stands on the right-center!
    drawMapleChibiAvatar(ctx, {
      ...cfg,
      avatarX: 64,
      avatarY: 80,
      facingRight: true,
    });

    // Draw YOUR Visitor Avatar co-present in the same room! (V2-07)
    drawMapleChibiAvatar(ctx, {
      ...cfg,
      bodyStage: cfg.visitorAvatar.bodyStage,
      equipped: cfg.visitorAvatar.equipped,
      avatarX: 124,
      avatarY: 80,
      avatarState: 'CHEER',
      facingRight: false,
    });

    // Draw cute co-op tag above visitor
    outlinedBox(ctx, 236, 108, 76, 20, '#065f46', '#10b981');
    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold 10px "Noto Sans TC", sans-serif';
    ctx.fillText('👋 我來串門！', 244, 122);
  } else {
    drawMapleChibiAvatar(ctx, cfg);
  }

  // 6. FLOATING HEARTS
  cfg.petHearts.forEach((h) => {
    if (h.alpha > 0) {
      const hx = Math.round(h.x * 2);
      const hy = Math.round(h.y * 2);
      px(ctx, hx + 2, hy, 6, 2, '#181224');
      px(ctx, hx + 10, hy, 6, 2, '#181224');
      px(ctx, hx, hy + 2, 18, 6, '#181224');
      px(ctx, hx + 2, hy + 2, 6, 6, '#f43f5e');
      px(ctx, hx + 10, hy + 2, 6, 6, '#f43f5e');
      px(ctx, hx + 4, hy + 6, 10, 4, '#f43f5e');
    }
  });
}

/**
 * Draws the MapleStory-style 2-Head Chibi Character
 */
export function drawMapleChibiAvatar(ctx: CanvasRenderingContext2D, cfg: PixelRenderConfig) {
  const t = cfg.frameTick;
  const isSquat = cfg.avatarState === 'SQUAT' && Math.floor(t / 15) % 2 === 1;
  const isWalk = cfg.avatarState === 'WALK';
  const isCurl = cfg.avatarState === 'CURL' && Math.floor(t / 11) % 2 === 1;
  const isCheer = cfg.avatarState === 'CHEER';

  const baseX = Math.round(cfg.avatarX * 2);
  const baseY = Math.round(cfg.avatarY * 2) - 24;

  const squatDrop = isSquat ? 14 : 0;
  const walkBob = isWalk ? (Math.floor(t / 6) % 2) * 4 : Math.floor(t / 20) % 2 === 0 ? 0 : 2;

  const x = baseX;
  const y = baseY + squatDrop + walkBob;

  // Floor Drop Shadow
  px(ctx, x + 4, baseY + 100, 56, 8, 'rgba(0,0,0,0.42)');

  // Titan Golden Aura
  if (cfg.bodyStage === 'titan') {
    const flameRise = (t % 16) * 1.5;
    px(ctx, x - 10, y - 14, 84, 114, 'rgba(250, 204, 21, 0.16)');
    px(ctx, x - 4, y - 8, 72, 102, 'rgba(245, 158, 11, 0.26)');
    px(ctx, x - 6, y + 70 - flameRise, 6, 8, '#fde047');
    px(ctx, x + 64, y + 55 - flameRise, 6, 8, '#f59e0b');
  }

  // Spartan Cape
  if (cfg.equipped.top === 'top_spartan_cape') {
    const wave = Math.floor(t / 10) % 2 === 0 ? 0 : 4;
    outlinedBox(ctx, x - 2 - wave, y + 44, 68 + wave, 46, '#dc2626', '#ef4444', '#991b1b');
  }

  const skinBase = '#ffdfc4';
  const skinHi = '#fff0e3';
  const skinShadow = '#eab692';
  const blush = '#fda4af';

  const bodyW =
    cfg.bodyStage === 'titan'
      ? 42
      : cfg.bodyStage === 'powerlifter'
      ? 38
      : cfg.bodyStage === 'aesthetic'
      ? 34
      : 30;
  const bodyX = x + Math.round((64 - bodyW) / 2);

  // LEGS & SNEAKERS
  const legSpread = isSquat ? 6 : 0;
  const legY = y + 74 - (isSquat ? 8 : 0);
  const legH = isSquat ? 16 : 22;
  const walkStepL = isWalk && Math.floor(t / 6) % 2 === 0 ? -4 : 0;
  const walkStepR = isWalk && Math.floor(t / 6) % 2 === 1 ? -4 : 0;

  outlinedBox(ctx, x + 14 - legSpread, legY + walkStepL, 14, legH, skinBase, skinHi, skinShadow);
  outlinedBox(ctx, x + 36 + legSpread, legY + walkStepR, 14, legH, skinBase, skinHi, skinShadow);

  outlinedBox(ctx, x + 10 - legSpread, legY + legH - 4 + walkStepL, 18, 10, '#ef4444', '#f87171', '#ffffff');
  outlinedBox(ctx, x + 36 + legSpread, legY + legH - 4 + walkStepR, 18, 10, '#ef4444', '#f87171', '#ffffff');

  // BOTTOMS
  let shortsFill = '#1e3a8a';
  let shortsHi = '#3b82f6';
  let shortsTrim = '#93c5fd';
  if (cfg.equipped.bottom === 'bottom_camo_joggers') {
    shortsFill = '#3f6212';
    shortsHi = '#65a30d';
    shortsTrim = '#bef264';
  } else if (cfg.equipped.bottom === 'bottom_gold_tights') {
    shortsFill = '#312e81';
    shortsHi = '#4f46e5';
    shortsTrim = '#facc15';
  }
  outlinedBox(ctx, bodyX - legSpread, y + 66 - (isSquat ? 4 : 0), bodyW + legSpread * 2, 15, shortsFill, shortsHi);
  px(ctx, bodyX + 2 - legSpread, y + 68 - (isSquat ? 4 : 0), bodyW - 4 + legSpread * 2, 3, shortsTrim);

  // TORSO & TOP
  outlinedBox(ctx, bodyX, y + 42, bodyW, 28, skinBase, skinHi, skinShadow);
  px(ctx, x + 22, y + 51, 8, 2, skinShadow);
  px(ctx, x + 34, y + 51, 8, 2, skinShadow);
  px(ctx, x + 31, y + 48, 2, 16, skinShadow);

  if (cfg.equipped.top === 'top_crimson_sbd') {
    outlinedBox(ctx, bodyX + 2, y + 42, bodyW - 4, 27, '#991b1b', '#dc2626', '#7f1d1d');
    px(ctx, bodyX + 8, y + 46, bodyW - 16, 8, '#f87171');
    outlinedBox(ctx, bodyX - 2, y + 60, bodyW + 4, 8, '#18181b', '#3f3f46');
    px(ctx, x + 28, y + 61, 8, 6, '#facc15');
  } else if (cfg.equipped.top === 'top_pump_cover') {
    outlinedBox(ctx, bodyX - 4, y + 42, bodyW + 8, 27, '#065f46', '#10b981', '#064e3b');
    px(ctx, x + 22, y + 50, 20, 6, '#34d399');
  } else if (cfg.equipped.top === 'top_black_tank') {
    outlinedBox(ctx, bodyX + 4, y + 43, bodyW - 8, 26, '#1e293b', '#334155', '#0f172a');
    px(ctx, x + 25, y + 50, 14, 5, '#10b981');
  } else if (cfg.equipped.top === 'top_spartan_cape') {
    px(ctx, bodyX + 2, y + 43, 8, 6, '#facc15');
    px(ctx, bodyX + bodyW - 10, y + 43, 8, 6, '#facc15');
    outlinedBox(ctx, bodyX, y + 61, bodyW, 7, '#78350f', '#b45309');
  }

  // ARMS
  const armW = cfg.bodyStage === 'titan' || cfg.bodyStage === 'powerlifter' ? 14 : 11;
  const leftArmY = isCheer ? y + 28 : y + 44;
  const rightArmY = isCurl || isCheer ? y + 32 : y + 44;
  outlinedBox(ctx, bodyX - armW + 2, leftArmY, armW, 20, skinBase, skinHi, skinShadow);
  outlinedBox(ctx, bodyX + bodyW - 2, rightArmY, armW, 20, skinBase, skinHi, skinShadow);

  // HEAD & EXPRESSION (V2-03 & V2-13)
  const headW = 48;
  const headH = 42;
  const headX = x + 8;
  const headY = y + 4;

  outlinedBox(ctx, headX - 5, headY + 18, 8, 12, skinBase, skinHi, skinShadow);
  outlinedBox(ctx, headX + headW - 3, headY + 18, 8, 12, skinBase, skinHi, skinShadow);
  outlinedBox(ctx, headX, headY, headW, headH, skinBase, skinHi, skinShadow);

  px(ctx, headX + 6, headY + 28, 8, 4, blush);
  px(ctx, headX + headW - 14, headY + 28, 8, 4, blush);

  const eyeShift = cfg.facingRight ? 2 : -2;
  const faceItem = cfg.equipped.face || 'face_confident_smile';
  const effectiveExp: AvatarExpression =
    cfg.expressionOverride ||
    (faceItem === 'face_pixel_shades'
      ? 'cool'
      : faceItem === 'face_fierce_grit' || isSquat
      ? 'strain'
      : 'smile');

  if (effectiveExp === 'strain') {
    // > < Grit Effort Eyes
    px(ctx, headX + 10 + eyeShift, headY + 18, 4, 3, '#181224');
    px(ctx, headX + 14 + eyeShift, headY + 21, 4, 3, '#181224');
    px(ctx, headX + 10 + eyeShift, headY + 24, 4, 3, '#181224');
    px(ctx, headX + 34 + eyeShift, headY + 18, 4, 3, '#181224');
    px(ctx, headX + 30 + eyeShift, headY + 21, 4, 3, '#181224');
    px(ctx, headX + 34 + eyeShift, headY + 24, 4, 3, '#181224');
    outlinedBox(ctx, headX + 18 + eyeShift, headY + 30, 14, 7, '#ffffff');
    px(ctx, headX + 20 + eyeShift, headY + 33, 10, 2, '#181224');
  } else if (effectiveExp === 'cry') {
    // T_T Crying Leg-Day Eyes with waterfall tears!
    const lx = headX + 10 + eyeShift;
    const rxEye = headX + 30 + eyeShift;
    px(ctx, lx, headY + 18, 9, 4, '#181224');
    px(ctx, rxEye, headY + 18, 9, 4, '#181224');
    px(ctx, lx + 2, headY + 22, 5, 14, '#38bdf8');
    px(ctx, rxEye + 2, headY + 22, 5, 14, '#38bdf8');
    px(ctx, headX + 20 + eyeShift, headY + 32, 10, 4, '#e11d48');
  } else {
    // Sparkling MapleStory Anime Eyes
    const lx = headX + 10 + eyeShift;
    const rxEye = headX + 30 + eyeShift;
    const ey = headY + 17;
    px(ctx, lx - 1, ey - 4, 10, 3, '#181224');
    px(ctx, rxEye - 1, ey - 4, 10, 3, '#181224');
    px(ctx, lx, ey, 9, 11, '#181224');
    px(ctx, rxEye, ey, 9, 11, '#181224');
    px(ctx, lx + 2, ey + 6, 5, 4, '#38bdf8');
    px(ctx, rxEye + 2, ey + 6, 5, 4, '#38bdf8');
    px(ctx, lx + 1, ey + 1, 4, 4, '#ffffff');
    px(ctx, rxEye + 1, ey + 1, 4, 4, '#ffffff');
    px(ctx, headX + 21 + eyeShift, headY + 32, 8, 3, '#e11d48');
  }

  // Cool Pixel Shades Overlay
  if (effectiveExp === 'cool' || faceItem === 'face_pixel_shades') {
    px(ctx, headX + 4, headY + 16, headW - 8, 4, '#090d16');
    px(ctx, headX + 8 + eyeShift, headY + 18, 14, 9, '#090d16');
    px(ctx, headX + 26 + eyeShift, headY + 18, 14, 9, '#090d16');
    px(ctx, headX + 10 + eyeShift, headY + 20, 4, 2, '#38bdf8');
    px(ctx, headX + 28 + eyeShift, headY + 20, 4, 2, '#38bdf8');
  }

  // HAIR & HEADGEAR
  if (cfg.equipped.hair === 'hair_spiky_gold') {
    outlinedBox(ctx, headX - 4, headY - 8, headW + 8, 18, '#eab308', '#fef08a', '#ca8a04');
    outlinedBox(ctx, headX + 2, headY - 18, 14, 14, '#facc15', '#fef08a');
    outlinedBox(ctx, headX + 18, headY - 22, 16, 18, '#facc15', '#fef08a');
    outlinedBox(ctx, headX + 34, headY - 16, 14, 12, '#eab308', '#fef08a');
  } else if (cfg.equipped.hair === 'hair_titan_crown') {
    outlinedBox(ctx, headX - 2, headY - 4, headW + 4, 14, '#1e293b', '#475569', '#0f172a');
    outlinedBox(ctx, headX + 6, headY - 18, 36, 16, '#f59e0b', '#fef08a', '#b45309');
    px(ctx, headX + 21, headY - 13, 6, 6, '#ef4444');
  } else if (cfg.equipped.hair === 'hair_maple_cap') {
    outlinedBox(ctx, headX - 2, headY - 6, headW + 4, 16, '#0284c7', '#38bdf8', '#0369a1');
    outlinedBox(ctx, headX + 16, headY + 4, 38, 6, '#0369a1', '#38bdf8');
  } else {
    outlinedBox(ctx, headX - 3, headY - 7, headW + 6, 17, '#271c19', '#573f38', '#181224');
    outlinedBox(ctx, headX + 6, headY - 13, 18, 9, '#382824', '#573f38');
    outlinedBox(ctx, headX - 2, headY + 6, headW + 4, 8, '#ef4444', '#fca5a5', '#b91c1c');
  }

  // HANDHELD ACCESSORY
  const handX = bodyX + bodyW + armW - 8;
  const handY = rightArmY + (isCurl ? 2 : 14);

  if (cfg.equipped.accessory === 'acc_protein_shaker') {
    outlinedBox(ctx, handX - 2, handY - 10, 16, 24, '#10b981', '#6ee7b7', '#047857');
    outlinedBox(ctx, handX - 4, handY - 15, 20, 7, '#0f172a', '#334155');
  } else if (cfg.equipped.accessory === 'acc_gold_barbell') {
    const barYPos = y + 40;
    px(ctx, x - 22, barYPos, 108, 6, '#181224');
    px(ctx, x - 20, barYPos + 1, 104, 4, '#fef08a');
    outlinedBox(ctx, x - 26, barYPos - 14, 12, 34, '#f59e0b', '#fef08a', '#b45309');
    outlinedBox(ctx, x + 78, barYPos - 14, 12, 34, '#f59e0b', '#fef08a', '#b45309');
  } else {
    px(ctx, handX - 10, handY + 2, 26, 6, '#cbd5e1');
    outlinedBox(ctx, handX - 14, handY - 6, 10, 22, '#334155', '#94a3b8', '#0f172a');
    outlinedBox(ctx, handX + 10, handY - 6, 10, 22, '#334155', '#94a3b8', '#0f172a');
  }
}

/**
 * Draws an individual 56x56 Pixel Sprite Thumbnail for Shop & Wardrobe cards (V2-05)
 */
export function drawSingleItemThumbnail(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  slot: string,
  primaryColor: string,
  accentColor: string
) {
  ctx.clearRect(0, 0, 56, 56);
  ctx.imageSmoothingEnabled = false;

  if (slot === 'hair') {
    if (itemId === 'hair_titan_crown') {
      outlinedBox(ctx, 10, 16, 36, 22, '#f59e0b', '#fef08a', '#b45309');
      px(ctx, 25, 22, 6, 6, '#ef4444');
      px(ctx, 15, 23, 4, 4, '#38bdf8');
      px(ctx, 37, 23, 4, 4, '#38bdf8');
    } else if (itemId === 'hair_spiky_gold') {
      outlinedBox(ctx, 10, 22, 36, 18, '#eab308', '#fef08a');
      outlinedBox(ctx, 14, 10, 12, 14, '#facc15', '#fef08a');
      outlinedBox(ctx, 26, 8, 14, 16, '#facc15', '#fef08a');
    } else if (itemId === 'hair_maple_cap') {
      outlinedBox(ctx, 10, 18, 32, 18, '#0284c7', '#38bdf8');
      outlinedBox(ctx, 20, 30, 28, 6, '#0369a1', '#38bdf8');
    } else {
      outlinedBox(ctx, 10, 16, 36, 18, '#271c19', '#573f38');
      outlinedBox(ctx, 8, 28, 40, 8, '#ef4444', '#fca5a5');
    }
    return;
  }

  if (slot === 'face') {
    outlinedBox(ctx, 10, 10, 36, 34, '#ffdfc4', '#fff0e3', '#eab692');
    if (itemId === 'face_pixel_shades') {
      px(ctx, 12, 22, 32, 4, '#090d16');
      px(ctx, 14, 24, 12, 8, '#090d16');
      px(ctx, 30, 24, 12, 8, '#090d16');
      px(ctx, 16, 26, 4, 2, '#38bdf8');
      px(ctx, 32, 26, 4, 2, '#38bdf8');
    } else if (itemId === 'face_fierce_grit') {
      px(ctx, 16, 22, 6, 4, '#181224');
      px(ctx, 34, 22, 6, 4, '#181224');
      outlinedBox(ctx, 20, 32, 16, 7, '#ffffff');
    } else {
      px(ctx, 16, 22, 6, 8, '#181224');
      px(ctx, 34, 22, 6, 8, '#181224');
      px(ctx, 17, 23, 3, 3, '#ffffff');
      px(ctx, 35, 23, 3, 3, '#ffffff');
      px(ctx, 24, 34, 8, 3, '#e11d48');
    }
    return;
  }

  if (slot === 'top') {
    outlinedBox(ctx, 12, 12, 32, 32, primaryColor, accentColor);
    px(ctx, 20, 12, 16, 6, '#0f172a'); // Neckline cutout
    px(ctx, 18, 24, 20, 6, accentColor);
    return;
  }

  if (slot === 'bottom') {
    outlinedBox(ctx, 10, 14, 36, 16, primaryColor, accentColor);
    outlinedBox(ctx, 10, 26, 16, 18, primaryColor);
    outlinedBox(ctx, 30, 26, 16, 18, primaryColor);
    px(ctx, 12, 16, 32, 3, accentColor);
    return;
  }

  if (slot === 'accessory') {
    if (itemId === 'acc_protein_shaker') {
      outlinedBox(ctx, 18, 16, 20, 30, '#10b981', '#6ee7b7', '#047857');
      outlinedBox(ctx, 16, 10, 24, 8, '#0f172a', '#334155');
    } else if (itemId === 'acc_gold_barbell') {
      px(ctx, 4, 26, 48, 4, '#fef08a');
      outlinedBox(ctx, 6, 12, 10, 32, '#f59e0b', '#fef08a');
      outlinedBox(ctx, 40, 12, 10, 32, '#f59e0b', '#fef08a');
    } else {
      px(ctx, 12, 25, 32, 6, '#cbd5e1');
      outlinedBox(ctx, 8, 14, 12, 28, '#334155', '#94a3b8');
      outlinedBox(ctx, 36, 14, 12, 28, '#334155', '#94a3b8');
    }
    return;
  }

  if (itemId.startsWith('pet_')) {
    drawChibiPetById(ctx, itemId, 8, 16, 4);
    return;
  }

  // Room wallpaper / floor / furniture thumbnail
  outlinedBox(ctx, 8, 8, 40, 40, primaryColor, accentColor);
  px(ctx, 16, 20, 24, 16, accentColor);
}
