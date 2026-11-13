import { AvatarBodyStage, EquipSlot } from '../../../config/catalogConfig';
import { drawBossSprite, drawMapleChibiAvatar } from '../../../game/pixelSpriteDrawer';
import { PosterIdentity, RareLootPosterData, ShareAspect, VictoryPosterData } from './types';
import { drawFixedWatermark, watermarkSpec } from './watermark';

export function stripEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\uFE0F/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function drawVictoryPoster(
  ctx: CanvasRenderingContext2D,
  aspect: ShareAspect,
  data: VictoryPosterData,
  identity: PosterIdentity,
) {
  const { width: W, height: H } = ctx.canvas;
  const spec = watermarkSpec(aspect);
  const story = aspect === '9:16';
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#fff8ec');
  sky.addColorStop(0.55, '#f6d7a2');
  sky.addColorStop(1, '#e7b15a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  paintConfetti(ctx, W, H);
  paintWordmark(ctx, spec.safe, story ? 118 : 86);

  const stage = data.stage ?? data.clearedStage;
  const titleSize = story ? 88 : 64;
  const subTitleSize = Math.round(titleSize * 0.4);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a3412';
  ctx.font = `800 ${story ? 34 : 26}px "Barlow Condensed", "Noto Sans TC", sans-serif`;
  ctx.fillText('FINAL BLOW', W / 2, story ? 210 : 150);
  ctx.fillStyle = '#29221e';
  ctx.font = `900 ${titleSize}px "Noto Sans TC", sans-serif`;
  ctx.fillText(`第 ${stage} 關 通關！`, W / 2, story ? 302 : 216);
  ctx.fillStyle = 'rgba(41, 34, 30, 0.7)';
  ctx.font = `900 ${subTitleSize}px "Barlow Condensed", "Noto Sans TC", sans-serif`;
  ctx.fillText('STAGE CLEAR', W / 2, story ? 350 : 252);
  ctx.fillStyle = '#7c4a1e';
  ctx.font = `800 ${story ? 36 : 28}px "Noto Sans TC", sans-serif`;
  ctx.fillText(`你擊敗了 ${data.boss.nameZh}`, W / 2, story ? 400 : 292);

  const cardY = story ? 1160 : 720;
  const cardH = story ? 240 : 186;
  const ground = cardY - 8;
  const bossSize = story ? 430 : 300;
  const bossX = spec.safe + 10;
  const bossY = ground - bossSize + 30;
  const drew = drawBossSprite(ctx, data.boss.spriteKey, bossX, bossY, bossSize, { defeated: true });
  if (!drew) {
    paintNamePlate(ctx, bossX, bossY, bossSize, data.boss.nameZh);
  }
  paintStamp(ctx, bossX + bossSize * 0.5, bossY + bossSize * 0.78, '擊破');

  const podiumW = story ? 280 : 230;
  const podiumH = story ? 150 : 110;
  const podiumX = W - spec.safe - podiumW - 40;
  const podiumTop = ground - 8;
  paintPodium(ctx, podiumX, podiumTop, podiumW, podiumH);
  ctx.save();
  ctx.translate(podiumX + podiumW / 2, podiumTop + 6);
  ctx.scale(story ? 6.4 : 4.8, story ? 6.4 : 4.8);
  drawHero(ctx, identity.bodyStage, identity.equipped);
  ctx.restore();

  paintCard(ctx, spec.safe, cardY, W - spec.safe * 2, cardH, '#fffdf8');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9a3412';
  ctx.font = `800 ${story ? 28 : 24}px "Noto Sans TC", sans-serif`;
  ctx.fillText(stripEmoji(data.attackTypeLabel) || '最後一擊', spec.safe + 36, cardY + (story ? 58 : 48));
  ctx.fillStyle = '#f43f5e';
  ctx.font = `900 ${story ? 72 : 56}px "Barlow Condensed", sans-serif`;
  ctx.fillText(`-${data.finalBlowDamage.toLocaleString()} HP`, spec.safe + 36, cardY + (story ? 140 : 112));
  ctx.fillStyle = '#29221e';
  ctx.font = `800 ${story ? 30 : 24}px "Noto Sans TC", sans-serif`;
  const loot = stripEmoji(data.droppedLootName) || data.boss.hiddenLoot.nameZh;
  ctx.fillText(`戰利品  ${loot}`, spec.safe + 36, cardY + (story ? 200 : 164));

  if (story) {
    const squadY = cardY + cardH + 28;
    paintCard(ctx, spec.safe, squadY, W - spec.safe * 2, 230, 'rgba(255,253,248,0.92)');
    ctx.fillStyle = '#9a3412';
    ctx.font = '800 28px "Noto Sans TC", sans-serif';
    ctx.fillText(stripEmoji(identity.squadName) || identity.squadName, spec.safe + 36, squadY + 48);
    identity.rows.slice(0, 4).forEach((row, index) => {
      const y = squadY + 96 + index * 30;
      ctx.fillStyle = row.highlight ? '#047857' : '#29221e';
      ctx.font = `${row.highlight ? 800 : 700} 24px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${index + 1}. ${row.nameZh}`, spec.safe + 36, y);
      ctx.textAlign = 'right';
      ctx.fillText(row.damageText, W - spec.safe - 36, y);
    });
  }

  drawFixedWatermark(ctx, W, H, aspect, identity.brand, identity.level, identity.nickname);
  ctx.restore();
}

export function drawRareLootPoster(
  ctx: CanvasRenderingContext2D,
  aspect: ShareAspect,
  data: RareLootPosterData,
  identity: PosterIdentity,
) {
  const { width: W, height: H } = ctx.canvas;
  const spec = watermarkSpec(aspect);
  const story = aspect === '9:16';
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#fff8ec');
  sky.addColorStop(0.5, '#f3e4ff');
  sky.addColorStop(1, '#d8b4fe');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  paintConfetti(ctx, W, H);
  paintWordmark(ctx, spec.safe, story ? 118 : 86);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6b21a8';
  ctx.font = `800 ${story ? 34 : 26}px "Barlow Condensed", "Noto Sans TC", sans-serif`;
  ctx.fillText('RARE LOOT', W / 2, story ? 210 : 150);
  ctx.fillStyle = '#29221e';
  fitCentered(ctx, data.boss.hiddenLoot.nameZh, W / 2, story ? 330 : 236, W - spec.safe * 2, story ? 64 : 48);

  const cardY = story ? 1180 : 760;
  const cardH = story ? 250 : 190;
  const ground = cardY - 8;
  const bossSize = story ? 360 : 260;
  const bossX = spec.safe + 20;
  const bossY = ground - bossSize + 20;
  if (!drawBossSprite(ctx, data.boss.spriteKey, bossX, bossY, bossSize, { defeated: false })) {
    paintNamePlate(ctx, bossX, bossY, bossSize, data.boss.nameZh);
  }

  const podiumW = story ? 260 : 210;
  const podiumX = W - spec.safe - podiumW - 30;
  paintPodium(ctx, podiumX, ground - 8, podiumW, story ? 140 : 100);
  ctx.save();
  ctx.translate(podiumX + podiumW / 2, ground - 2);
  ctx.scale(story ? 6 : 4.4, story ? 6 : 4.4);
  drawHero(ctx, identity.bodyStage, identity.equipped);
  ctx.restore();

  paintCard(ctx, spec.safe, cardY, W - spec.safe * 2, cardH, '#fffdf8');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6b21a8';
  ctx.font = `800 ${story ? 28 : 22}px "Noto Sans TC", sans-serif`;
  ctx.fillText(`STAGE ${data.stage}  ${data.boss.nameZh}`, spec.safe + 36, cardY + (story ? 64 : 52));
  ctx.fillStyle = '#29221e';
  ctx.font = `800 ${story ? 34 : 26}px "Noto Sans TC", sans-serif`;
  const stat = stripEmoji(data.boss.hiddenLoot.statDescZh);
  wrapText(ctx, stat, spec.safe + 36, cardY + (story ? 130 : 104), W - spec.safe * 2 - 72, story ? 40 : 34);
  ctx.fillStyle = '#9a3412';
  ctx.font = `800 ${story ? 28 : 22}px "Noto Sans TC", sans-serif`;
  ctx.fillText(`這一擊  -${data.strikeDamage.toLocaleString()} HP`, spec.safe + 36, cardY + cardH - (story ? 48 : 36));

  drawFixedWatermark(ctx, W, H, aspect, identity.brand, identity.level, identity.nickname);
  ctx.restore();
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  bodyStage: AvatarBodyStage,
  equipped: Record<EquipSlot, string>,
) {
  drawMapleChibiAvatar(ctx, {
    x: -28,
    y: -60,
    bodyStage,
    equipped,
    state: 'CHEER',
    expressionOverride: 'smile',
    facingRight: false,
    frameTick: 12,
  });
}

function paintWordmark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(x + 22, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 22px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FM', x + 22, y + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#29221e';
  ctx.font = '900 36px "Barlow Condensed", sans-serif';
  ctx.fillText('FitMon', x + 56, y + 1);
  ctx.restore();
}

function paintConfetti(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const specks: [number, number, number, string][] = [
    [0.12, 0.08, 16, '#f97316'],
    [0.84, 0.12, 22, '#f59e0b'],
    [0.2, 0.22, 10, '#fb7185'],
    [0.9, 0.28, 12, '#10b981'],
    [0.08, 0.4, 14, '#fbbf24'],
    [0.78, 0.18, 9, '#f43f5e'],
  ];
  specks.forEach(([px, py, r, color]) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(px * w, py * h, r, r * 0.62, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function paintCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#e5dccb';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 28);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function paintPodium(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#f5c451';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - 22, y + h);
  ctx.lineTo(x + 22, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe08a';
  ctx.fillRect(x + 8, y, w - 16, 16);
  ctx.fillStyle = '#8a5a12';
  ctx.font = '900 54px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', x + w / 2, y + h * 0.62);
  ctx.restore();
}

function paintStamp(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.16);
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.roundRect(-78, -28, 156, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

function paintNamePlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  name: string,
) {
  ctx.save();
  ctx.fillStyle = '#fffdf8';
  ctx.strokeStyle = '#3f2e27';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(x + size * 0.12, y + size * 0.18, size * 0.76, size * 0.64, 36);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#29221e';
  ctx.font = '800 36px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.slice(0, 8), x + size / 2, y + size * 0.5);
  ctx.restore();
}

function fitCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  px: number,
) {
  let size = px;
  ctx.font = `900 ${size}px "Noto Sans TC", sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px "Noto Sans TC", sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = Array.from(text);
  let line = '';
  let cursor = y;
  chars.forEach((ch) => {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = ch;
      cursor += lineHeight;
    } else {
      line = next;
    }
  });
  if (line) ctx.fillText(line, x, cursor);
}
