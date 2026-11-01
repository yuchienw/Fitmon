import { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig';

export interface PixelRenderConfig {
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  isNight: boolean;
  frameTick: number;
  avatarX: number;
  avatarY: number;
  avatarState: 'IDLE' | 'WALK' | 'SQUAT' | 'CURL';
  facingRight: boolean;
  petHearts: { x: number; y: number; alpha: number }[];
}

/** Helper to draw crisp integer pixel rectangles */
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

/**
 * Draws the entire 240x150 virtual pixel gym scene
 */
export function drawPixelGymScene(ctx: CanvasRenderingContext2D, cfg: PixelRenderConfig) {
  const W = 240;
  const H = 150;
  const wallH = 98;
  const t = cfg.frameTick;

  // 1. WALLPAPER
  if (cfg.room.wallpaper === 'wall_cyber_neon') {
    rect(ctx, 0, 0, W, wallH, '#161130');
    // Brick pattern
    for (let y = 10; y < wallH; y += 12) {
      rect(ctx, 0, y, W, 1, '#231c47');
    }
    // Neon strip
    const neonPulse = Math.sin(t * 0.08) > 0 ? '#d946ef' : '#a855f7';
    rect(ctx, 0, 18, W, 2, neonPulse);
    rect(ctx, 0, wallH - 3, W, 2, '#06b6d4');
  } else if (cfg.room.wallpaper === 'wall_zen_wood') {
    rect(ctx, 0, 0, W, wallH, '#3b2314');
    for (let x = 0; x < W; x += 20) {
      rect(ctx, x, 0, 1, wallH, '#29170c');
    }
    rect(ctx, 0, wallH - 4, W, 4, '#78350f');
  } else {
    // Default industrial concrete
    rect(ctx, 0, 0, W, wallH, '#1b2230');
    for (let y = 16; y < wallH; y += 20) {
      rect(ctx, 0, y, W, 1, '#141923');
    }
    rect(ctx, 0, wallH - 4, W, 4, '#334155');
  }

  // 2. WINDOW (Day / Night Sky)
  const winX = 148;
  const winY = 22;
  const winW = 42;
  const winH = 38;
  rect(ctx, winX - 2, winY - 2, winW + 4, winH + 4, '#334155');
  if (cfg.isNight) {
    rect(ctx, winX, winY, winW, winH, '#090d16');
    // Moon & Stars
    rect(ctx, winX + 28, winY + 8, 6, 6, '#fef08a');
    rect(ctx, winX + 30, winY + 9, 4, 4, '#090d16');
    if (Math.floor(t / 15) % 2 === 0) {
      rect(ctx, winX + 10, winY + 10, 2, 2, '#fff');
      rect(ctx, winX + 18, winY + 24, 2, 2, '#38bdf8');
    }
  } else {
    rect(ctx, winX, winY, winW, winH, '#38bdf8');
    // Sun & Clouds
    rect(ctx, winX + 8, winY + 7, 7, 7, '#fde047');
    const cloudOffset = Math.floor((t * 0.15) % 30);
    rect(ctx, winX + 6 + cloudOffset * 0.5, winY + 22, 14, 5, '#f8fafc');
  }
  // Window frame crossbars
  rect(ctx, winX + winW / 2 - 1, winY, 2, winH, '#334155');
  rect(ctx, winX, winY + winH / 2 - 1, winW, 2, '#334155');

  // 3. TROPHY & DAILY WHITEBOARD (Center-left wall)
  const wbX = 88;
  const wbY = 25;
  rect(ctx, wbX - 2, wbY - 2, 48, 32, '#475569');
  rect(ctx, wbX, wbY, 44, 28, '#f1f5f9');
  // Whiteboard scribbles & sticky note
  rect(ctx, wbX + 4, wbY + 5, 22, 2, '#0f172a');
  rect(ctx, wbX + 4, wbY + 10, 16, 2, '#10b981');
  rect(ctx, wbX + 4, wbY + 15, 20, 2, '#64748b');
  rect(ctx, wbX + 30, wbY + 6, 10, 10, '#facc15'); // yellow science note
  // Top Trophy Shelf
  rect(ctx, wbX + 2, wbY - 12, 40, 3, '#64748b');
  rect(ctx, wbX + 8, wbY - 19, 6, 7, '#f59e0b'); // Gold cup
  rect(ctx, wbX + 22, wbY - 17, 5, 5, '#38bdf8'); // Diamond badge

  // 4. FLOOR
  const floorY = wallH;
  const floorH = H - wallH;
  if (cfg.room.floor === 'floor_turf_green') {
    rect(ctx, 0, floorY, W, floorH, '#064e3b');
    for (let x = 20; x < W; x += 35) {
      rect(ctx, x, floorY + 6, 2, floorH - 12, '#10b981');
    }
  } else if (cfg.room.floor === 'floor_gold_marble') {
    rect(ctx, 0, floorY, W, floorH, '#18181b');
    for (let x = 0; x < W; x += 24) {
      rect(ctx, x, floorY, 1, floorH, '#ca8a04');
    }
    rect(ctx, 0, floorY + 22, W, 1, '#ca8a04');
  } else {
    // Rubber mat
    rect(ctx, 0, floorY, W, floorH, '#111622');
    for (let x = 0; x < W; x += 24) {
      rect(ctx, x, floorY, 1, floorH, '#1e293b');
    }
  }

  // 5. MAIN SQUAT RACK (Left side)
  const rackColor = cfg.room.mainRack === 'rack_crimson_pro' ? '#dc2626' : '#475569';
  const rackX = 18;
  const rackY = 34;
  // Uprights
  rect(ctx, rackX, rackY, 5, 74, rackColor);
  rect(ctx, rackX + 42, rackY, 5, 74, rackColor);
  // Top pull-up bar
  rect(ctx, rackX, rackY, 47, 4, '#94a3b8');
  // Base feet
  rect(ctx, rackX - 4, rackY + 70, 55, 5, '#334155');
  // Barbell on rack with 20kg blue/red bumper plates
  const barY = rackY + 34;
  rect(ctx, rackX - 8, barY, 63, 2, '#cbd5e1');
  const plateColor = cfg.room.mainRack === 'rack_crimson_pro' ? '#ef4444' : '#2563eb';
  rect(ctx, rackX - 5, barY - 7, 4, 16, plateColor);
  rect(ctx, rackX - 1, barY - 5, 3, 12, '#facc15');
  rect(ctx, rackX + 48, barY - 7, 4, 16, plateColor);
  rect(ctx, rackX + 45, barY - 5, 3, 12, '#facc15');

  // 6. SIDE PROP (Right side)
  const propX = 198;
  const propY = 48;
  if (cfg.room.sideProp === 'prop_arcade_cabinet') {
    // Retro Arcade Machine
    rect(ctx, propX, propY, 28, 60, '#5b21b6');
    rect(ctx, propX + 2, propY + 4, 24, 7, '#f43f5e'); // Marquee
    const screenColor = Math.floor(t / 10) % 2 === 0 ? '#10b981' : '#06b6d4';
    rect(ctx, propX + 4, propY + 14, 20, 16, '#0f172a');
    rect(ctx, propX + 7, propY + 18, 14, 8, screenColor);
    rect(ctx, propX + 2, propY + 32, 24, 4, '#facc15'); // Joystick deck
  } else {
    // 10-Tier Dumbbell Tower
    rect(ctx, propX + 6, propY + 6, 16, 54, '#334155');
    for (let i = 0; i < 5; i++) {
      const dy = propY + 12 + i * 9;
      rect(ctx, propX + 2, dy, 24, 4, '#94a3b8');
      rect(ctx, propX + 4, dy + 1, 20, 2, '#0f172a');
    }
  }

  // 7. PET COMPANION (Bottom-Right area)
  const petX = 165;
  const petY = 104 + (Math.floor(t / 12) % 2);
  if (cfg.room.pet === 'pet_black_cat') {
    // Black Cat
    rect(ctx, petX, petY, 14, 10, '#0f172a');
    rect(ctx, petX + 2, petY - 6, 10, 8, '#0f172a');
    rect(ctx, petX + 2, petY - 9, 3, 3, '#0f172a'); // Left ear
    rect(ctx, petX + 9, petY - 9, 3, 3, '#0f172a'); // Right ear
    rect(ctx, petX + 4, petY - 4, 2, 2, '#facc15'); // Yellow eyes
    rect(ctx, petX + 8, petY - 4, 2, 2, '#facc15');
    const tailWag = Math.floor(t / 10) % 2 === 0 ? -2 : 2;
    rect(ctx, petX + 14, petY - 4 + tailWag, 3, 8, '#0f172a');
  } else if (cfg.room.pet === 'pet_whey_bot') {
    // Floating Whey Bot
    const hoverY = petY - 8 + Math.round(Math.sin(t * 0.12) * 3);
    rect(ctx, petX, hoverY, 16, 14, '#0891b2');
    rect(ctx, petX + 2, hoverY + 3, 12, 6, '#0f172a');
    rect(ctx, petX + 4, hoverY + 5, 3, 2, '#22d3ee');
    rect(ctx, petX + 9, hoverY + 5, 3, 2, '#22d3ee');
    rect(ctx, petX + 6, hoverY - 4, 4, 4, '#f43f5e'); // Antenna
    rect(ctx, petX + 5, hoverY + 15, 6, 2, '#38bdf8'); // Thruster glow
  } else {
    // Shiba Inu Dog
    rect(ctx, petX, petY, 16, 11, '#d97706'); // Body
    rect(ctx, petX + 2, petY + 4, 12, 7, '#fef3c7'); // Cream belly
    rect(ctx, petX - 2, petY - 7, 13, 10, '#d97706'); // Head
    rect(ctx, petX, petY - 2, 9, 5, '#fef3c7'); // Snout/cheeks
    rect(ctx, petX - 1, petY - 10, 3, 3, '#b45309'); // Ear L
    rect(ctx, petX + 7, petY - 10, 3, 3, '#b45309'); // Ear R
    rect(ctx, petX + 1, petY - 5, 2, 2, '#0f172a'); // Eye L
    rect(ctx, petX + 6, petY - 5, 2, 2, '#0f172a'); // Eye R
    rect(ctx, petX + 3, petY - 2, 2, 2, '#0f172a'); // Nose
    // Red gym bandana
    rect(ctx, petX - 1, petY + 1, 11, 2, '#ef4444');
    // Wagging curled tail
    const wag = Math.floor(t / 8) % 2 === 0 ? 0 : 2;
    rect(ctx, petX + 14, petY - 4 + wag, 4, 5, '#d97706');
  }

  // 8. 5-LAYER 32x32 PIXEL AVATAR
  drawPixelAvatar(ctx, cfg);

  // 9. FLOATING HEARTS
  cfg.petHearts.forEach((h) => {
    if (h.alpha > 0) {
      rect(ctx, h.x, h.y, 3, 3, '#f43f5e');
      rect(ctx, h.x + 4, h.y, 3, 3, '#f43f5e');
      rect(ctx, h.x + 1, h.y + 3, 5, 3, '#f43f5e');
      rect(ctx, h.x + 2, h.y + 6, 3, 2, '#f43f5e');
    }
  });
}

/**
 * Draws the 5-Layer 32x32 Pixel Avatar
 */
export function drawPixelAvatar(ctx: CanvasRenderingContext2D, cfg: PixelRenderConfig) {
  const t = cfg.frameTick;
  const isSquat = cfg.avatarState === 'SQUAT' && Math.floor(t / 14) % 2 === 1;
  const isWalk = cfg.avatarState === 'WALK';
  const bounceY = isSquat ? 6 : isWalk ? (Math.floor(t / 6) % 2) * 2 : Math.floor(t / 20) % 2;

  const x = Math.floor(cfg.avatarX);
  const y = Math.floor(cfg.avatarY + bounceY);

  // Titan Golden Aura
  if (cfg.bodyStage === 'titan') {
    const auraOffset = Math.floor(t / 6) % 2;
    rect(ctx, x - 4, y - 4 - auraOffset, 36, 42, 'rgba(250, 204, 21, 0.18)');
    rect(ctx, x - 2, y - 2 + auraOffset, 32, 38, 'rgba(245, 158, 11, 0.25)');
  }

  // Spartan Cape (Back layer)
  if (cfg.equipped.top === 'top_spartan_cape') {
    rect(ctx, x + 2, y + 12, 24, 18, '#b91c1c');
  }

  // Torso width based on Body Evolution Stage
  const torsoW = cfg.bodyStage === 'titan' ? 20 : cfg.bodyStage === 'powerlifter' ? 18 : cfg.bodyStage === 'aesthetic' ? 16 : 14;
  const torsoX = x + Math.floor((28 - torsoW) / 2);

  // Skin tone
  const skin = '#fbbd8c';
  const skinShadow = '#e59866';

  // LEGS & SHOES
  const legSpread = isSquat ? 3 : 0;
  const legH = isSquat ? 7 : 10;
  const legY = y + 24 - (isSquat ? 3 : 0);
  rect(ctx, x + 7 - legSpread, legY, 5, legH, skin);
  rect(ctx, x + 16 + legSpread, legY, 5, legH, skin);
  // Shoes
  rect(ctx, x + 6 - legSpread, legY + legH - 2, 6, 3, '#ef4444');
  rect(ctx, x + 16 + legSpread, legY + legH - 2, 6, 3, '#ef4444');

  // LAYER 3: BOTTOMS (Shorts / Joggers / Tights)
  let bottomColor = '#1e3a8a';
  if (cfg.equipped.bottom === 'bottom_camo_joggers') bottomColor = '#3f6212';
  if (cfg.equipped.bottom === 'bottom_gold_tights') bottomColor = '#312e81';
  rect(ctx, x + 6 - legSpread, y + 20, 16 + legSpread * 2, 6, bottomColor);
  if (cfg.equipped.bottom === 'bottom_gold_tights') {
    rect(ctx, x + 6 - legSpread, y + 22, 16 + legSpread * 2, 1, '#facc15');
  }

  // LAYER 1 & 2: TORSO & TOP
  rect(ctx, torsoX, y + 11, torsoW, 10, skin);
  // Pecs / Abs shading for aesthetic & titan
  if (cfg.bodyStage === 'aesthetic' || cfg.bodyStage === 'titan') {
    rect(ctx, x + 10, y + 14, 8, 1, skinShadow);
    rect(ctx, x + 13, y + 14, 2, 5, skinShadow);
  }

  if (cfg.equipped.top === 'top_crimson_sbd') {
    rect(ctx, torsoX + 1, y + 11, torsoW - 2, 10, '#991b1b');
    rect(ctx, torsoX + 3, y + 13, torsoW - 6, 3, '#ef4444');
  } else if (cfg.equipped.top === 'top_pump_cover') {
    rect(ctx, torsoX - 1, y + 11, torsoW + 2, 10, '#065f46');
    rect(ctx, torsoX + 3, y + 14, torsoW - 6, 3, '#34d399');
  } else if (cfg.equipped.top === 'top_black_tank') {
    rect(ctx, torsoX + 2, y + 11, torsoW - 4, 10, '#1e293b');
    rect(ctx, torsoX + 4, y + 14, torsoW - 8, 2, '#10b981');
  }

  // ARMS
  const curlUp = cfg.avatarState === 'CURL' && Math.floor(t / 10) % 2 === 1;
  rect(ctx, torsoX - 4, y + 12, 4, 8, skin);
  rect(ctx, torsoX + torsoW, y + (curlUp ? 8 : 12), 4, 8, skin);

  // HEAD
  rect(ctx, x + 8, y + 1, 12, 10, skin);
  // Eyes
  const eyeX = cfg.facingRight ? x + 11 : x + 9;
  rect(ctx, eyeX, y + 5, 2, 2, '#0f172a');
  rect(ctx, eyeX + 5, y + 5, 2, 2, '#0f172a');

  // LAYER 4: HAIR & HEADGEAR
  if (cfg.equipped.hair === 'hair_spiky_gold') {
    rect(ctx, x + 7, y - 3, 14, 5, '#facc15');
    rect(ctx, x + 9, y - 6, 4, 3, '#eab308');
    rect(ctx, x + 15, y - 5, 4, 3, '#fde047');
  } else if (cfg.equipped.hair === 'hair_titan_crown') {
    rect(ctx, x + 8, y - 1, 12, 3, '#1e293b');
    rect(ctx, x + 8, y - 5, 12, 4, '#f59e0b');
    rect(ctx, x + 13, y - 6, 2, 2, '#ef4444'); // Crown jewel
  } else if (cfg.equipped.hair === 'hair_pixel_shades') {
    rect(ctx, x + 8, y - 1, 12, 3, '#0f172a');
    // Deal With It sunglasses
    rect(ctx, x + 8, y + 4, 12, 3, '#0f172a');
    rect(ctx, x + 10, y + 5, 2, 1, '#38bdf8');
    rect(ctx, x + 16, y + 5, 2, 1, '#38bdf8');
  } else {
    // Default dark hair + Red sweatband
    rect(ctx, x + 8, y - 1, 12, 3, '#1e293b');
    rect(ctx, x + 8, y + 2, 12, 2, '#ef4444');
  }

  // LAYER 5: HANDHELD ACCESSORY
  const handX = torsoX + torsoW + 1;
  const handY = y + (curlUp ? 7 : 16);
  if (cfg.equipped.accessory === 'acc_protein_shaker') {
    rect(ctx, handX, handY - 2, 5, 8, '#10b981');
    rect(ctx, handX, handY - 4, 5, 2, '#f8fafc');
  } else if (cfg.equipped.accessory === 'acc_gold_barbell') {
    rect(ctx, x - 2, y + (isSquat ? 11 : 10), 32, 2, '#facc15');
    rect(ctx, x - 4, y + 6, 4, 10, '#f59e0b');
    rect(ctx, x + 28, y + 6, 4, 10, '#f59e0b');
  } else {
    // Iron Dumbbell
    rect(ctx, handX - 2, handY, 8, 2, '#94a3b8');
    rect(ctx, handX - 3, handY - 2, 2, 6, '#475569');
    rect(ctx, handX + 5, handY - 2, 2, 6, '#475569');
  }

  // Sweat droplets when squatting
  if (cfg.avatarState === 'SQUAT' && Math.floor(t / 8) % 2 === 0) {
    rect(ctx, x + 5, y + 2, 2, 3, '#38bdf8');
    rect(ctx, x + 22, y + 4, 2, 3, '#38bdf8');
  }
}
