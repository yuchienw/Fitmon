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
  speechText?: string;
}

/**
 * Pixel-snapped rectangle helper (2px grid unit on 480x300 canvas for crisp 32-bit MapleStory sprite aesthetic)
 */
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

/**
 * Draws an outlined pixel box (MapleStory signature dark #181224 outline with inner fill & top highlight)
 */
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
  // Outer border
  px(ctx, x + 2, y, w - 4, h, outline);
  px(ctx, x, y + 2, w, h - 4, outline);
  // Inner fill
  px(ctx, x + 2, y + 2, w - 4, h - 4, fill);
  if (highlight) {
    px(ctx, x + 2, y + 2, w - 4, 3, highlight);
  }
  if (shadow) {
    px(ctx, x + 2, y + h - 5, w - 4, 3, shadow);
  }
}

/**
 * Renders the complete 480x300 MapleStory-style 2D Side-Scrolling Gym Room
 */
export function drawPixelGymScene(ctx: CanvasRenderingContext2D, cfg: PixelRenderConfig) {
  const W = 480;
  const H = 300;
  const wallH = 196;
  const t = cfg.frameTick;

  // =========================================================================
  // 1. WALLPAPER & WAINSCOTING (MapleStory Indoor Architecture)
  // =========================================================================
  if (cfg.room.wallpaper === 'wall_cyber_neon') {
    px(ctx, 0, 0, W, wallH, '#16112b');
    // Subtle brick texture
    for (let y = 16; y < wallH - 28; y += 22) {
      px(ctx, 0, y, W, 2, '#221a42');
      for (let x = (y % 44 === 0 ? 0 : 24); x < W; x += 48) {
        px(ctx, x, y, 2, 22, '#221a42');
      }
    }
    // Glowing Neon Trim
    const neonGlow = Math.sin(t * 0.08) > 0 ? '#f43f5e' : '#ec4899';
    px(ctx, 0, 26, W, 4, '#a855f7');
    px(ctx, 0, 27, W, 2, '#f3e8ff');
    px(ctx, 0, wallH - 30, W, 30, '#0f0b1e');
    px(ctx, 0, wallH - 32, W, 4, neonGlow);
    px(ctx, 0, wallH - 4, W, 4, '#06b6d4');
  } else if (cfg.room.wallpaper === 'wall_zen_wood') {
    px(ctx, 0, 0, W, wallH, '#f5e6d3');
    // Warm wooden pillars & wainscoting
    for (let x = 0; x < W; x += 80) {
      px(ctx, x, 0, 12, wallH, '#8c583a');
      px(ctx, x + 2, 0, 4, wallH, '#a66c49');
    }
    // Lower wooden wainscot
    px(ctx, 0, wallH - 44, W, 44, '#6e4228');
    px(ctx, 0, wallH - 46, W, 6, '#4a2a18');
    for (let x = 16; x < W; x += 32) {
      px(ctx, x, wallH - 38, 24, 30, '#855235');
    }
  } else {
    // Classic Maple Gym Loft (Slate blue-grey brick + dark wood wainscot)
    px(ctx, 0, 0, W, wallH, '#283142');
    for (let y = 20; y < wallH - 36; y += 20) {
      px(ctx, 0, y, W, 2, '#1f2633');
      for (let x = (y % 40 === 0 ? 12 : 36); x < W; x += 48) {
        px(ctx, x, y, 2, 20, '#1f2633');
      }
    }
    // Top ceiling beam
    px(ctx, 0, 0, W, 14, '#161b26');
    px(ctx, 0, 14, W, 3, '#0f131c');
    // Lower wainscot wall panel
    px(ctx, 0, wallH - 36, W, 36, '#1b2230');
    px(ctx, 0, wallH - 38, W, 4, '#3b4861');
    px(ctx, 0, wallH - 4, W, 4, '#0d1118');
  }

  // =========================================================================
  // 2. LARGE ARCHED WINDOW WITH SUNBEAMS / MOONLIGHT
  // =========================================================================
  const winX = 286;
  const winY = 34;
  const winW = 88;
  const winH = 84;
  outlinedBox(ctx, winX - 6, winY - 6, winW + 12, winH + 12, '#475569', '#64748b', '#1e293b');

  if (cfg.isNight) {
    px(ctx, winX, winY, winW, winH, '#0b1021');
    px(ctx, winX, winY + 50, winW, 34, '#151e38');
    // Distant city/mountain silhouette
    px(ctx, winX + 6, winY + 62, 24, 22, '#090d1a');
    px(ctx, winX + 34, winY + 54, 30, 30, '#090d1a');
    px(ctx, winX + 66, winY + 66, 22, 18, '#090d1a');
    // Crescent Moon
    px(ctx, winX + 56, winY + 14, 16, 16, '#fef08a');
    px(ctx, winX + 62, winY + 12, 12, 12, '#0b1021');
    // Twinkling stars
    const blink = Math.floor(t / 18) % 2 === 0;
    px(ctx, winX + 18, winY + 18, blink ? 4 : 2, blink ? 4 : 2, '#ffffff');
    px(ctx, winX + 38, winY + 30, 3, 3, '#38bdf8');
    px(ctx, winX + 16, winY + 42, 2, 2, '#fde047');
  } else {
    px(ctx, winX, winY, winW, winH, '#38bdf8');
    px(ctx, winX, winY + 46, winW, 38, '#7dd3fc');
    // Green Maple hills in distance
    px(ctx, winX, winY + 66, 48, 18, '#22c55e');
    px(ctx, winX + 36, winY + 60, 52, 24, '#16a34a');
    // Glowing Sun
    px(ctx, winX + 16, winY + 14, 18, 18, '#fef08a');
    px(ctx, winX + 18, winY + 16, 14, 14, '#facc15');
    // Fluffy Drifting Cloud
    const cx = winX + 34 + Math.floor((t * 0.25) % 28);
    px(ctx, cx, winY + 26, 28, 10, '#ffffff');
    px(ctx, cx + 6, winY + 22, 16, 6, '#ffffff');
    px(ctx, cx + 2, winY + 34, 24, 3, '#cbd5e1');
  }
  // Window wooden/metal panes
  px(ctx, winX + winW / 2 - 2, winY, 4, winH, '#334155');
  px(ctx, winX, winY + winH / 2 - 2, winW, 4, '#334155');
  // Window sill
  outlinedBox(ctx, winX - 10, winY + winH + 2, winW + 20, 10, '#64748b', '#94a3b8', '#334155');

  // =========================================================================
  // 3. TROPHY SHELF & DAILY BOARD (Center-left wall)
  // =========================================================================
  const shX = 166;
  const shY = 38;
  // Wooden shelf
  outlinedBox(ctx, shX, shY + 22, 92, 10, '#854d0e', '#a16207', '#422006');
  // Golden Trophy Cup
  px(ctx, shX + 14, shY + 4, 16, 14, '#facc15');
  px(ctx, shX + 16, shY + 6, 4, 10, '#fef08a');
  px(ctx, shX + 18, shY + 18, 8, 4, '#ca8a04');
  px(ctx, shX + 14, shY + 20, 16, 3, '#181224');
  // Protein Tub Jar
  outlinedBox(ctx, shX + 42, shY + 4, 18, 19, '#1e293b', '#334155');
  px(ctx, shX + 44, shY + 10, 14, 7, '#10b981');
  px(ctx, shX + 44, shY + 2, 14, 4, '#ef4444');
  // Medal Plaque
  outlinedBox(ctx, shX + 66, shY + 6, 18, 17, '#0284c7', '#38bdf8');
  px(ctx, shX + 72, shY + 11, 6, 6, '#facc15');

  // Hanging Gym Poster / Whiteboard below shelf
  outlinedBox(ctx, shX + 6, shY + 42, 80, 52, '#f8fafc', '#ffffff', '#cbd5e1');
  px(ctx, shX + 14, shY + 52, 42, 4, '#0f172a');
  px(ctx, shX + 14, shY + 60, 32, 4, '#10b981');
  px(ctx, shX + 14, shY + 68, 46, 4, '#64748b');
  px(ctx, shX + 14, shY + 76, 28, 4, '#f43f5e');
  // Cute yellow sticky note
  px(ctx, shX + 62, shY + 54, 16, 16, '#fde047');
  px(ctx, shX + 66, shY + 54, 8, 3, '#f59e0b');

  // =========================================================================
  // 4. FLOORING WITH PERSPECTIVE DEPTH
  // =========================================================================
  const floorY = wallH;
  const floorH = H - wallH;
  if (cfg.room.floor === 'floor_turf_green') {
    px(ctx, 0, floorY, W, floorH, '#065f46');
    px(ctx, 0, floorY, W, 8, '#047857');
    for (let y = floorY + 16; y < H; y += 20) {
      px(ctx, 0, y, W, 2, '#047857');
    }
    // White Sled Turf Sprint Markers
    for (let x = 40; x < W; x += 70) {
      px(ctx, x, floorY + 18, 6, floorH - 32, '#ecfdf5');
      px(ctx, x + 20, floorY + 28, 4, 16, '#6ee7b7');
    }
  } else if (cfg.room.floor === 'floor_gold_marble') {
    px(ctx, 0, floorY, W, floorH, '#18181b');
    px(ctx, 0, floorY, W, 6, '#27272a');
    for (let y = floorY + 24; y < H; y += 26) {
      px(ctx, 0, y, W, 2, '#ca8a04');
    }
    for (let x = 30; x < W; x += 64) {
      px(ctx, x, floorY, 2, floorH, '#854d0e');
    }
  } else {
    // Detailed Maple Gym Interlocking Rubber Tiles
    px(ctx, 0, floorY, W, floorH, '#161c28');
    px(ctx, 0, floorY, W, 6, '#222b3d');
    for (let y = floorY + 22; y < H; y += 24) {
      px(ctx, 0, y, W, 2, '#0f131c');
    }
    for (let x = 32; x < W; x += 56) {
      px(ctx, x, floorY + 6, 2, floorH - 6, '#1f2838');
    }
  }

  // =========================================================================
  // 5. MAIN SQUAT POWER CAGE (Left Side - Rich Metallic Shading & Bumper Plates)
  // =========================================================================
  const isCrimsonRack = cfg.room.mainRack === 'rack_crimson_pro';
  const rackMain = isCrimsonRack ? '#dc2626' : '#475569';
  const rackHi = isCrimsonRack ? '#f87171' : '#94a3b8';
  const rackDark = isCrimsonRack ? '#7f1d1d' : '#1e293b';

  const rx = 28;
  const ry = 54;
  // Back posts (darker for depth)
  outlinedBox(ctx, rx + 14, ry + 6, 10, 148, rackDark);
  outlinedBox(ctx, rx + 92, ry + 6, 10, 148, rackDark);
  // Front Uprights
  outlinedBox(ctx, rx, ry, 12, 160, rackMain, rackHi, rackDark);
  outlinedBox(ctx, rx + 80, ry, 12, 160, rackMain, rackHi, rackDark);
  // J-hook holes along uprights
  for (let hy = ry + 24; hy < ry + 140; hy += 12) {
    px(ctx, rx + 4, hy, 3, 3, '#0f172a');
    px(ctx, rx + 84, hy, 3, 3, '#0f172a');
  }
  // Top Pull-up Crossbeam
  outlinedBox(ctx, rx - 4, ry - 4, 108, 12, rackMain, rackHi, rackDark);
  // Base frame feet
  outlinedBox(ctx, rx - 8, ry + 152, 118, 12, '#334155', '#64748b', '#0f172a');

  // Heavy Olympic Barbell on Rack with IPF Competition Bumper Plates (Red 25kg, Blue 20kg, Yellow 15kg)
  const barY = ry + 74;
  px(ctx, rx - 20, barY, 134, 6, '#181224');
  px(ctx, rx - 18, barY + 1, 130, 4, '#e2e8f0');
  // Left Plates
  outlinedBox(ctx, rx - 14, barY - 18, 9, 42, '#dc2626', '#fca5a5', '#991b1b'); // 25kg Red
  outlinedBox(ctx, rx - 6, barY - 15, 8, 36, '#2563eb', '#93c5fd', '#1d4ed8');  // 20kg Blue
  outlinedBox(ctx, rx + 1, barY - 12, 7, 30, '#eab308', '#fef08a', '#a16207');  // 15kg Yellow
  // Right Plates
  outlinedBox(ctx, rx + 96, barY - 18, 9, 42, '#dc2626', '#fca5a5', '#991b1b');
  outlinedBox(ctx, rx + 89, barY - 15, 8, 36, '#2563eb', '#93c5fd', '#1d4ed8');
  outlinedBox(ctx, rx + 83, barY - 12, 7, 30, '#eab308', '#fef08a', '#a16207');

  // =========================================================================
  // 6. SIDE PROP (Right Side - Retro Arcade Cabinet OR Dumbbell Rack)
  // =========================================================================
  const pxProp = 398;
  const pyProp = 84;
  if (cfg.room.sideProp === 'prop_arcade_cabinet') {
    // Detailed MapleStory Arcade Machine
    outlinedBox(ctx, pxProp, pyProp, 60, 126, '#6d28d9', '#8b5cf6', '#4c1d95');
    // Top Neon Marquee
    outlinedBox(ctx, pxProp - 2, pyProp - 4, 64, 18, '#f43f5e', '#fda4af', '#be123c');
    px(ctx, pxProp + 8, pyProp + 2, 44, 6, '#fef08a');
    // CRT Glowing Screen
    outlinedBox(ctx, pxProp + 6, pyProp + 18, 48, 38, '#090d16');
    const arcadeScreen = Math.floor(t / 12) % 2 === 0 ? '#10b981' : '#06b6d4';
    px(ctx, pxProp + 10, pyProp + 22, 40, 30, '#111c2d');
    px(ctx, pxProp + 16, pyProp + 28, 12, 12, arcadeScreen);
    px(ctx, pxProp + 32, pyProp + 32, 10, 8, '#f59e0b');
    // Joystick Deck
    outlinedBox(ctx, pxProp - 4, pyProp + 58, 68, 12, '#334155', '#64748b');
    px(ctx, pxProp + 12, pyProp + 50, 6, 6, '#ef4444'); // Red ball top joystick
    px(ctx, pxProp + 14, pyProp + 56, 2, 4, '#cbd5e1');
    px(ctx, pxProp + 34, pyProp + 56, 6, 4, '#facc15');
    px(ctx, pxProp + 44, pyProp + 56, 6, 4, '#22c55e');
    // Coin Door
    outlinedBox(ctx, pxProp + 14, pyProp + 78, 32, 36, '#1e293b');
    px(ctx, pxProp + 20, pyProp + 86, 6, 10, '#f59e0b');
    px(ctx, pxProp + 34, pyProp + 86, 6, 10, '#f59e0b');
  } else {
    // Heavy-Duty A-Frame Chrome Dumbbell Rack
    outlinedBox(ctx, pxProp + 10, pyProp + 10, 42, 114, '#334155', '#64748b', '#1e293b');
    for (let i = 0; i < 5; i++) {
      const dy = pyProp + 20 + i * 20;
      // Left & Right Hex Dumbbell Heads
      outlinedBox(ctx, pxProp + 2, dy, 14, 12, '#1e293b', '#475569');
      outlinedBox(ctx, pxProp + 46, dy, 14, 12, '#1e293b', '#475569');
      // Chrome handle
      px(ctx, pxProp + 16, dy + 4, 30, 4, '#cbd5e1');
      px(ctx, pxProp + 6, dy + 4, 6, 4, '#38bdf8');
      px(ctx, pxProp + 50, dy + 4, 6, 4, '#38bdf8');
    }
  }

  // =========================================================================
  // 7. MAPLESTORY CHIBI PET COMPANION (Right Foreground)
  // =========================================================================
  drawChibiPet(ctx, cfg, 328, 206);

  // =========================================================================
  // 8. MAPLESTORY 2-HEAD CHIBI AVATAR (Center Foreground)
  // =========================================================================
  drawMapleChibiAvatar(ctx, cfg);

  // =========================================================================
  // 9. FLOATING PIXEL HEARTS
  // =========================================================================
  cfg.petHearts.forEach((h) => {
    if (h.alpha > 0) {
      const hx = Math.round(h.x * 2);
      const hy = Math.round(h.y * 2);
      // Outlined cute heart
      px(ctx, hx + 2, hy, 6, 2, '#181224');
      px(ctx, hx + 10, hy, 6, 2, '#181224');
      px(ctx, hx, hy + 2, 18, 6, '#181224');
      px(ctx, hx + 2, hy + 8, 14, 4, '#181224');
      px(ctx, hx + 6, hy + 12, 6, 4, '#181224');

      px(ctx, hx + 2, hy + 2, 6, 6, '#f43f5e');
      px(ctx, hx + 10, hy + 2, 6, 6, '#f43f5e');
      px(ctx, hx + 4, hy + 6, 10, 4, '#f43f5e');
      px(ctx, hx + 7, hy + 10, 4, 3, '#f43f5e');
      px(ctx, hx + 3, hy + 3, 2, 2, '#fda4af'); // Specular shine
    }
  });
}

/**
 * Draws a MapleStory-style Chibi Pet (Shiba Inu / Black Cat / Floating Whey Bot)
 */
function drawChibiPet(
  ctx: CanvasRenderingContext2D,
  cfg: PixelRenderConfig,
  baseX: number,
  baseY: number
) {
  const t = cfg.frameTick;
  const bob = Math.floor(t / 12) % 2 === 0 ? 0 : 2;
  const x = baseX;
  const y = baseY + bob;

  // Floor drop shadow
  px(ctx, x - 4, baseY + 34, 48, 6, 'rgba(0,0,0,0.35)');

  if (cfg.room.pet === 'pet_black_cat') {
    // Chibi Black Cat Coach
    // Body
    outlinedBox(ctx, x + 8, y + 16, 26, 20, '#1e1b4b', '#312e81', '#0f172a');
    // Cute white paws
    px(ctx, x + 10, y + 32, 6, 4, '#f8fafc');
    px(ctx, x + 24, y + 32, 6, 4, '#f8fafc');
    // Big Chibi Cat Head
    outlinedBox(ctx, x + 2, y - 6, 36, 26, '#1e1b4b', '#312e81', '#0f172a');
    // Pointy Cat Ears with pink inner ear
    outlinedBox(ctx, x + 4, y - 14, 10, 10, '#1e1b4b');
    px(ctx, x + 7, y - 10, 4, 4, '#f472b6');
    outlinedBox(ctx, x + 26, y - 14, 10, 10, '#1e1b4b');
    px(ctx, x + 29, y - 10, 4, 4, '#f472b6');
    // Glowing Golden Anime Eyes
    px(ctx, x + 8, y + 4, 7, 7, '#facc15');
    px(ctx, x + 10, y + 5, 3, 5, '#0f172a');
    px(ctx, x + 9, y + 4, 2, 2, '#ffffff');
    px(ctx, x + 25, y + 4, 7, 7, '#facc15');
    px(ctx, x + 27, y + 5, 3, 5, '#0f172a');
    px(ctx, x + 26, y + 4, 2, 2, '#ffffff');
    // Red Collar with Gold Bell
    px(ctx, x + 8, y + 18, 24, 4, '#ef4444');
    px(ctx, x + 18, y + 19, 5, 5, '#facc15');
    // Swaying Tail
    const tailOffset = Math.floor(t / 10) % 2 === 0 ? -3 : 3;
    outlinedBox(ctx, x + 32, y + 10 + tailOffset, 10, 16, '#1e1b4b');
  } else if (cfg.room.pet === 'pet_whey_bot') {
    // Floating Chibi Whey Bot
    const hoverY = baseY - 12 + Math.round(Math.sin(t * 0.1) * 5);
    outlinedBox(ctx, x + 2, hoverY, 38, 32, '#0891b2', '#22d3ee', '#155e75');
    // Digital Visor Screen
    outlinedBox(ctx, x + 6, hoverY + 6, 30, 16, '#090d16');
    // Happy ^ ^ pixel LED eyes
    px(ctx, x + 11, hoverY + 12, 6, 3, '#22d3ee');
    px(ctx, x + 25, hoverY + 12, 6, 3, '#22d3ee');
    px(ctx, x + 18, hoverY + 16, 6, 2, '#f43f5e');
    // Top Antenna
    px(ctx, x + 19, hoverY - 8, 4, 8, '#cbd5e1');
    px(ctx, x + 17, hoverY - 12, 8, 6, '#f43f5e');
    // Jet Thruster Flame
    px(ctx, x + 14, hoverY + 32, 14, 5, '#38bdf8');
    px(ctx, x + 17, hoverY + 37, 8, 4, '#fef08a');
  } else {
    // MapleStory Chibi Shiba Inu (豆助)
    // Plump Body
    outlinedBox(ctx, x + 8, y + 14, 30, 22, '#d97706', '#f59e0b', '#b45309');
    px(ctx, x + 12, y + 20, 18, 12, '#fef3c7'); // Cream chest fur
    // Cute Paws
    outlinedBox(ctx, x + 10, y + 30, 8, 7, '#fef3c7');
    outlinedBox(ctx, x + 24, y + 30, 8, 7, '#fef3c7');
    // Curled Wagging Shiba Tail
    const wag = Math.floor(t / 7) % 2 === 0 ? 0 : 3;
    outlinedBox(ctx, x + 32, y + 4 + wag, 12, 12, '#d97706', '#fef3c7');

    // Big Cute Shiba Head
    outlinedBox(ctx, x, y - 10, 36, 28, '#d97706', '#f59e0b', '#b45309');
    // Pointed Shiba Ears
    outlinedBox(ctx, x + 2, y - 18, 10, 10, '#b45309', '#d97706');
    px(ctx, x + 5, y - 14, 4, 4, '#fef3c7');
    outlinedBox(ctx, x + 24, y - 18, 10, 10, '#b45309', '#d97706');
    px(ctx, x + 27, y - 14, 4, 4, '#fef3c7');

    // White Shiba Eyebrow Dots & Cream Cheeks
    px(ctx, x + 9, y - 3, 4, 2, '#fef3c7');
    px(ctx, x + 23, y - 3, 4, 2, '#fef3c7');
    px(ctx, x + 4, y + 5, 28, 11, '#fef3c7');

    // Shiny MapleStory Eyes with White Sparkle
    px(ctx, x + 8, y + 1, 5, 6, '#181224');
    px(ctx, x + 9, y + 2, 2, 2, '#ffffff');
    px(ctx, x + 23, y + 1, 5, 6, '#181224');
    px(ctx, x + 24, y + 2, 2, 2, '#ffffff');

    // Cute Blush, Black Nose & Happy Pink Tongue
    px(ctx, x + 5, y + 7, 4, 2, '#fda4af');
    px(ctx, x + 27, y + 7, 4, 2, '#fda4af');
    px(ctx, x + 16, y + 5, 4, 3, '#181224');
    px(ctx, x + 16, y + 9, 4, 5, '#fb7185');

    // Red Gym Bandana Scarf
    px(ctx, x + 6, y + 16, 24, 5, '#ef4444');
    px(ctx, x + 14, y + 21, 6, 4, '#dc2626');
  }
}

/**
 * Draws the MapleStory-style 2-Head Chibi Character with 5 Paper-Doll Layers
 * (1. Body Stage, 2. Hair/Headgear, 3. Top, 4. Bottom, 5. Handheld Weapon/Weight)
 */
export function drawMapleChibiAvatar(ctx: CanvasRenderingContext2D, cfg: PixelRenderConfig) {
  const t = cfg.frameTick;
  const isSquat = cfg.avatarState === 'SQUAT' && Math.floor(t / 15) % 2 === 1;
  const isWalk = cfg.avatarState === 'WALK';
  const isCurl = cfg.avatarState === 'CURL' && Math.floor(t / 11) % 2 === 1;

  // Map logical 240x150 coords to 480x300 high-detail canvas
  const baseX = Math.round(cfg.avatarX * 2);
  const baseY = Math.round(cfg.avatarY * 2) - 24;

  const squatDrop = isSquat ? 14 : 0;
  const walkBob = isWalk ? (Math.floor(t / 6) % 2) * 4 : Math.floor(t / 20) % 2 === 0 ? 0 : 2;

  const x = baseX;
  const y = baseY + squatDrop + walkBob;

  // Floor Drop Shadow
  px(ctx, x + 4, baseY + 100, 56, 8, 'rgba(0,0,0,0.42)');

  // =========================================================================
  // 0. TITAN GOLDEN BURNING AURA (Back Layer)
  // =========================================================================
  if (cfg.bodyStage === 'titan') {
    const flameRise = (t % 16) * 1.5;
    px(ctx, x - 10, y - 14, 84, 114, 'rgba(250, 204, 21, 0.16)');
    px(ctx, x - 4, y - 8, 72, 102, 'rgba(245, 158, 11, 0.26)');
    // Rising golden aura sparks
    px(ctx, x - 6, y + 70 - flameRise, 6, 8, '#fde047');
    px(ctx, x + 64, y + 55 - flameRise, 6, 8, '#f59e0b');
    px(ctx, x + 28, y - 16 - flameRise * 0.5, 6, 6, '#fef08a');
  }

  // Spartan Flowing Red Cape (Back Layer)
  if (cfg.equipped.top === 'top_spartan_cape') {
    const wave = Math.floor(t / 10) % 2 === 0 ? 0 : 4;
    outlinedBox(ctx, x - 2 - wave, y + 44, 68 + wave, 46, '#dc2626', '#ef4444', '#991b1b');
  }

  // Skin Palette (MapleStory warm peach tone with shadow & blush)
  const skinBase = '#ffdfc4';
  const skinHi = '#fff0e3';
  const skinShadow = '#eab692';
  const blush = '#fda4af';

  // Body Width based on Evolution Stage
  const bodyW =
    cfg.bodyStage === 'titan'
      ? 42
      : cfg.bodyStage === 'powerlifter'
      ? 38
      : cfg.bodyStage === 'aesthetic'
      ? 34
      : 30;
  const bodyX = x + Math.round((64 - bodyW) / 2);

  // =========================================================================
  // 1. LEGS, KNEES & SNEAKERS
  // =========================================================================
  const legSpread = isSquat ? 6 : 0;
  const legY = y + 74 - (isSquat ? 8 : 0);
  const legH = isSquat ? 16 : 22;
  const walkStepL = isWalk && Math.floor(t / 6) % 2 === 0 ? -4 : 0;
  const walkStepR = isWalk && Math.floor(t / 6) % 2 === 1 ? -4 : 0;

  // Left & Right Muscular Quads
  outlinedBox(ctx, x + 14 - legSpread, legY + walkStepL, 14, legH, skinBase, skinHi, skinShadow);
  outlinedBox(ctx, x + 36 + legSpread, legY + walkStepR, 14, legH, skinBase, skinHi, skinShadow);

  // High-top Red/White Gym Sneakers
  outlinedBox(
    ctx,
    x + 10 - legSpread,
    legY + legH - 4 + walkStepL,
    18,
    10,
    '#ef4444',
    '#f87171',
    '#ffffff'
  );
  outlinedBox(
    ctx,
    x + 36 + legSpread,
    legY + legH - 4 + walkStepR,
    18,
    10,
    '#ef4444',
    '#f87171',
    '#ffffff'
  );

  // =========================================================================
  // 2. EQUIPPED BOTTOMS (Shorts / Camo Joggers / Cyber Tights)
  // =========================================================================
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

  outlinedBox(
    ctx,
    bodyX - legSpread,
    y + 66 - (isSquat ? 4 : 0),
    bodyW + legSpread * 2,
    15,
    shortsFill,
    shortsHi
  );
  // Waistband & Side Stripe
  px(ctx, bodyX + 2 - legSpread, y + 68 - (isSquat ? 4 : 0), bodyW - 4 + legSpread * 2, 3, shortsTrim);

  // =========================================================================
  // 3. CHIBI MUSCULAR TORSO & EQUIPPED TOP
  // =========================================================================
  outlinedBox(ctx, bodyX, y + 42, bodyW, 28, skinBase, skinHi, skinShadow);

  // Sculpted Pecs & 6-Pack Abs Lines (Visible on bare chest or sculpted tops)
  px(ctx, x + 22, y + 51, 8, 2, skinShadow);
  px(ctx, x + 34, y + 51, 8, 2, skinShadow);
  px(ctx, x + 31, y + 48, 2, 16, skinShadow);
  if (cfg.bodyStage === 'aesthetic' || cfg.bodyStage === 'titan') {
    px(ctx, x + 25, y + 56, 14, 2, skinShadow);
    px(ctx, x + 25, y + 61, 14, 2, skinShadow);
  }

  // Top Outfit Layer
  if (cfg.equipped.top === 'top_crimson_sbd') {
    outlinedBox(ctx, bodyX + 2, y + 42, bodyW - 4, 27, '#991b1b', '#dc2626', '#7f1d1d');
    // Diagonal SBD stripe & leather power belt
    px(ctx, bodyX + 8, y + 46, bodyW - 16, 8, '#f87171');
    outlinedBox(ctx, bodyX - 2, y + 60, bodyW + 4, 8, '#18181b', '#3f3f46');
    px(ctx, x + 28, y + 61, 8, 6, '#facc15'); // Gold belt buckle
  } else if (cfg.equipped.top === 'top_pump_cover') {
    outlinedBox(ctx, bodyX - 4, y + 42, bodyW + 8, 27, '#065f46', '#10b981', '#064e3b');
    // Neon chest graphic
    px(ctx, x + 22, y + 50, 20, 6, '#34d399');
    px(ctx, x + 26, y + 52, 12, 2, '#064e3b');
  } else if (cfg.equipped.top === 'top_black_tank') {
    outlinedBox(ctx, bodyX + 4, y + 43, bodyW - 8, 26, '#1e293b', '#334155', '#0f172a');
    // Emerald emblem on tank
    px(ctx, x + 25, y + 50, 14, 5, '#10b981');
  } else if (cfg.equipped.top === 'top_spartan_cape') {
    // Bare muscular chest + Golden shoulder clasps & Power Belt
    px(ctx, bodyX + 2, y + 43, 8, 6, '#facc15');
    px(ctx, bodyX + bodyW - 10, y + 43, 8, 6, '#facc15');
    outlinedBox(ctx, bodyX, y + 61, bodyW, 7, '#78350f', '#b45309');
    px(ctx, x + 28, y + 62, 8, 5, '#facc15');
  }

  // =========================================================================
  // 4. ARMS, BICEPS & HANDHELD WEAPON / WEIGHT
  // =========================================================================
  const armW = cfg.bodyStage === 'titan' || cfg.bodyStage === 'powerlifter' ? 14 : 11;
  // Left Arm
  outlinedBox(ctx, bodyX - armW + 2, y + 44, armW, 20, skinBase, skinHi, skinShadow);
  px(ctx, bodyX - armW + 3, y + 56, armW - 2, 4, '#ef4444'); // Red wrist wrap

  // Right Arm (Pumps up during CURL!)
  const rightArmY = isCurl ? y + 34 : y + 44;
  outlinedBox(ctx, bodyX + bodyW - 2, rightArmY, armW, 20, skinBase, skinHi, skinShadow);
  px(ctx, bodyX + bodyW - 1, rightArmY + 12, armW - 2, 4, '#ef4444');

  // =========================================================================
  // 5. MAPLESTORY BIG 2-HEAD CHIBI FACE & EXPRESSIVE ANIME EYES
  // =========================================================================
  const headW = 48;
  const headH = 42;
  const headX = x + 8;
  const headY = y + 4;

  // Cute Chibi Ears
  outlinedBox(ctx, headX - 5, headY + 18, 8, 12, skinBase, skinHi, skinShadow);
  outlinedBox(ctx, headX + headW - 3, headY + 18, 8, 12, skinBase, skinHi, skinShadow);

  // Main Rounded Chibi Head
  outlinedBox(ctx, headX, headY, headW, headH, skinBase, skinHi, skinShadow);

  // Rosy MapleStory Cheeks
  px(ctx, headX + 6, headY + 28, 8, 4, blush);
  px(ctx, headX + headW - 14, headY + 28, 8, 4, blush);

  const eyeShift = cfg.facingRight ? 2 : -2;

  if (isSquat) {
    // Strained "> <" MapleStory Effort Eyes when squatting!
    // Left >
    px(ctx, headX + 10 + eyeShift, headY + 18, 4, 3, '#181224');
    px(ctx, headX + 14 + eyeShift, headY + 21, 4, 3, '#181224');
    px(ctx, headX + 10 + eyeShift, headY + 24, 4, 3, '#181224');
    // Right <
    px(ctx, headX + 34 + eyeShift, headY + 18, 4, 3, '#181224');
    px(ctx, headX + 30 + eyeShift, headY + 21, 4, 3, '#181224');
    px(ctx, headX + 34 + eyeShift, headY + 24, 4, 3, '#181224');
    // Gritted Teeth Mouth
    outlinedBox(ctx, headX + 18 + eyeShift, headY + 30, 14, 7, '#ffffff');
    px(ctx, headX + 20 + eyeShift, headY + 33, 10, 2, '#181224');
  } else {
    // Signature MapleStory Large Sparkling Anime Eyes!
    const lx = headX + 10 + eyeShift;
    const rxEye = headX + 30 + eyeShift;
    const ey = headY + 17;

    // Eyebrows
    px(ctx, lx - 1, ey - 4, 10, 3, '#181224');
    px(ctx, rxEye - 1, ey - 4, 10, 3, '#181224');

    // Eye Whites & Dark Iris
    px(ctx, lx, ey, 9, 11, '#181224');
    px(ctx, rxEye, ey, 9, 11, '#181224');
    // Lower Colored Iris (Emerald / Amber shine)
    px(ctx, lx + 2, ey + 6, 5, 4, '#38bdf8');
    px(ctx, rxEye + 2, ey + 6, 5, 4, '#38bdf8');
    // Big Upper-Left White Specular Highlight Dot (The MapleStory Soul!)
    px(ctx, lx + 1, ey + 1, 4, 4, '#ffffff');
    px(ctx, rxEye + 1, ey + 1, 4, 4, '#ffffff');
    // Tiny secondary lower-right sparkle
    px(ctx, lx + 6, ey + 7, 2, 2, '#ffffff');
    px(ctx, rxEye + 6, ey + 7, 2, 2, '#ffffff');

    // Confident Chibi Smile / Cat Mouth
    px(ctx, headX + 21 + eyeShift, headY + 32, 8, 3, '#e11d48');
    px(ctx, headX + 20 + eyeShift, headY + 31, 2, 2, '#181224');
    px(ctx, headX + 28 + eyeShift, headY + 31, 2, 2, '#181224');
  }

  // =========================================================================
  // 6. LAYERED HAIRSTYLE & HEADGEAR (MapleStory Spiky Hair / Crown / Shades)
  // =========================================================================
  if (cfg.equipped.hair === 'hair_spiky_gold') {
    // Super Saiyan Multi-Layered Golden Spikes with Angel Ring Highlight
    outlinedBox(ctx, headX - 4, headY - 8, headW + 8, 18, '#eab308', '#fef08a', '#ca8a04');
    // Upper spikes
    outlinedBox(ctx, headX + 2, headY - 18, 14, 14, '#facc15', '#fef08a');
    outlinedBox(ctx, headX + 18, headY - 22, 16, 18, '#facc15', '#fef08a');
    outlinedBox(ctx, headX + 34, headY - 16, 14, 12, '#eab308', '#fef08a');
    // Sideburns
    px(ctx, headX - 2, headY + 8, 6, 12, '#eab308');
    px(ctx, headX + headW - 4, headY + 8, 6, 12, '#eab308');
  } else if (cfg.equipped.hair === 'hair_titan_crown') {
    // Stylish Dark Spiky Hair + Royal Golden Crown
    outlinedBox(ctx, headX - 2, headY - 4, headW + 4, 14, '#1e293b', '#475569', '#0f172a');
    px(ctx, headX, headY + 8, 6, 10, '#1e293b');
    px(ctx, headX + headW - 6, headY + 8, 6, 10, '#1e293b');
    // Ornate Golden Crown
    outlinedBox(ctx, headX + 6, headY - 18, 36, 16, '#f59e0b', '#fef08a', '#b45309');
    px(ctx, headX + 21, headY - 13, 6, 6, '#ef4444'); // Center Ruby Gem
    px(ctx, headX + 11, headY - 12, 4, 4, '#38bdf8'); // Sapphire L
    px(ctx, headX + 33, headY - 12, 4, 4, '#38bdf8'); // Sapphire R
  } else if (cfg.equipped.hair === 'hair_pixel_shades') {
    // Cool Layered Dark Hair + Deal-With-It Pixel Sunglasses
    outlinedBox(ctx, headX - 2, headY - 6, headW + 4, 16, '#1e293b', '#475569', '#0f172a');
    outlinedBox(ctx, headX + 8, headY - 12, 32, 8, '#334155', '#64748b');
    // Thug Life Pixel Shades over eyes
    px(ctx, headX + 4, headY + 16, headW - 8, 4, '#090d16');
    px(ctx, headX + 8 + eyeShift, headY + 18, 14, 9, '#090d16');
    px(ctx, headX + 26 + eyeShift, headY + 18, 14, 9, '#090d16');
    // White diagonal pixel glint on lenses
    px(ctx, headX + 10 + eyeShift, headY + 20, 4, 2, '#38bdf8');
    px(ctx, headX + 12 + eyeShift, headY + 22, 4, 2, '#ffffff');
    px(ctx, headX + 28 + eyeShift, headY + 20, 4, 2, '#38bdf8');
    px(ctx, headX + 30 + eyeShift, headY + 22, 4, 2, '#ffffff');
  } else {
    // Signature MapleStory Spiky Dark-Brown Hair + Hero Red Sweatband
    outlinedBox(ctx, headX - 3, headY - 7, headW + 6, 17, '#271c19', '#573f38', '#181224');
    outlinedBox(ctx, headX + 6, headY - 13, 18, 9, '#382824', '#573f38');
    outlinedBox(ctx, headX + 24, headY - 11, 18, 8, '#271c19', '#573f38');
    // Hair shine band (Angel ring)
    px(ctx, headX + 8, headY - 3, 12, 2, '#785a50');
    px(ctx, headX + 26, headY - 3, 10, 2, '#785a50');
    // Red Sweatband across forehead
    outlinedBox(ctx, headX - 2, headY + 6, headW + 4, 8, '#ef4444', '#fca5a5', '#b91c1c');
    // Fluttering headband tail on left
    const tailWave = Math.floor(t / 8) % 2 === 0 ? 0 : 3;
    outlinedBox(ctx, headX - 10, headY + 8 + tailWave, 10, 6, '#dc2626');
  }

  // =========================================================================
  // 7. EQUIPPED HANDHELD WEAPON / FITNESS ITEM (Foreground Layer)
  // =========================================================================
  const handX = bodyX + bodyW + armW - 8;
  const handY = rightArmY + (isCurl ? 2 : 14);

  if (cfg.equipped.accessory === 'acc_protein_shaker') {
    // Glowing Emerald Whey Shaker Bottle
    outlinedBox(ctx, handX - 2, handY - 10, 16, 24, '#10b981', '#6ee7b7', '#047857');
    outlinedBox(ctx, handX - 4, handY - 15, 20, 7, '#0f172a', '#334155');
    px(ctx, handX + 2, handY - 4, 8, 8, '#ecfdf5');
  } else if (cfg.equipped.accessory === 'acc_gold_barbell') {
    // Oversized MapleStory Legendary 24K Golden Barbell across shoulders/chest!
    const barYPos = y + 40;
    px(ctx, x - 22, barYPos, 108, 6, '#181224');
    px(ctx, x - 20, barYPos + 1, 104, 4, '#fef08a');
    // Huge gleaming gold plates on both ends
    outlinedBox(ctx, x - 26, barYPos - 14, 12, 34, '#f59e0b', '#fef08a', '#b45309');
    outlinedBox(ctx, x - 14, barYPos - 10, 8, 26, '#eab308', '#fef08a', '#a16207');
    outlinedBox(ctx, x + 78, barYPos - 14, 12, 34, '#f59e0b', '#fef08a', '#b45309');
    outlinedBox(ctx, x + 70, barYPos - 10, 8, 26, '#eab308', '#fef08a', '#a16207');
  } else {
    // Classic Heavy Hex Iron Dumbbell
    px(ctx, handX - 10, handY + 2, 26, 6, '#cbd5e1');
    outlinedBox(ctx, handX - 14, handY - 6, 10, 22, '#334155', '#94a3b8', '#0f172a');
    outlinedBox(ctx, handX + 10, handY - 6, 10, 22, '#334155', '#94a3b8', '#0f172a');
  }

  // Flying Sweat Drops when Squatting!
  if (isSquat) {
    outlinedBox(ctx, headX - 12, headY + 6, 7, 10, '#38bdf8', '#bae6fd');
    outlinedBox(ctx, headX + headW + 6, headY + 10, 7, 10, '#38bdf8', '#bae6fd');
  }
}
