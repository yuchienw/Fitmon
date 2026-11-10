import { ShareAspect } from './types';

export interface WatermarkSpec {
  fontSize: number;
  marginRight: number;
  marginBottom: number;
  safe: number;
}

export function watermarkSpec(aspect: ShareAspect): WatermarkSpec {
  if (aspect === '9:16') {
    return { fontSize: 40, marginRight: 48, marginBottom: 96, safe: 64 };
  }
  return { fontSize: 34, marginRight: 40, marginBottom: 56, safe: 48 };
}

export function watermarkCopy(brand: string, level: number, nickname: string): string {
  return `⚡ ${brand} · Lv.${level} ${nickname}`;
}

/**
 * Fixed brand watermark. There is no switch: every adventure poster calls this last.
 * Position is the gap from the canvas edge to the capsule (IG-safe corner).
 */
export function drawFixedWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  aspect: ShareAspect,
  brand: string,
  level: number,
  nickname: string,
) {
  const spec = watermarkSpec(aspect);
  const minFont = aspect === '9:16' ? 36 : 32;
  const family = '"Barlow Condensed", "Noto Sans TC", sans-serif';
  let fontSize = spec.fontSize;
  let nick = nickname;
  let label = `${brand} · Lv.${level} ${nick}`;
  const maxWidth = width - spec.marginRight - spec.safe;

  const measure = (size: number, text: string) => {
    ctx.font = `800 ${size}px ${family}`;
    return ctx.measureText(text).width;
  };

  while (fontSize > minFont && measure(fontSize, label) + 88 > maxWidth) {
    fontSize -= 2;
  }
  if (measure(fontSize, label) + 88 > maxWidth) {
    const prefix = `${brand} · Lv.${level} `;
    while (nick.length > 1 && measure(fontSize, `${prefix}${nick}…`) + 88 > maxWidth) {
      nick = nick.slice(0, -1);
    }
    label = `${prefix}${nick}…`;
  }

  ctx.save();
  ctx.font = `800 ${fontSize}px ${family}`;
  const textWidth = ctx.measureText(label).width;
  const padX = 28;
  const bolt = Math.round(fontSize * 0.72);
  const boxW = textWidth + padX * 2 + bolt;
  const boxH = fontSize + 22;
  const x = width - spec.marginRight - boxW;
  const y = height - spec.marginBottom - boxH;

  ctx.fillStyle = 'rgba(41, 34, 30, 0.7)';
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, boxH / 2);
  ctx.fill();

  const boltX = x + padX;
  const midY = y + boxH / 2;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(boltX + bolt * 0.45, midY - bolt * 0.5);
  ctx.lineTo(boltX + bolt * 0.05, midY + bolt * 0.02);
  ctx.lineTo(boltX + bolt * 0.42, midY + bolt * 0.02);
  ctx.lineTo(boltX + bolt * 0.18, midY + bolt * 0.5);
  ctx.lineTo(boltX + bolt * 0.72, midY - bolt * 0.08);
  ctx.lineTo(boltX + bolt * 0.34, midY - bolt * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, boltX + bolt + 8, midY + 1);
  ctx.restore();
}
