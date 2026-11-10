import React, { useEffect, useRef } from 'react';
import { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig';
import { drawCreamChibiSilhouette, drawMapleChibiAvatar } from './pixelSpriteDrawer';

interface AvatarPortraitCanvasProps {
  bodyStage?: AvatarBodyStage;
  equipped?: Partial<Record<EquipSlot, string>>;
  status?: 'ready' | 'partial' | 'syncing';
  room?: Record<RoomSlot, string>;
  size?: number;
}

export const AvatarPortraitCanvas: React.FC<AvatarPortraitCanvasProps> = ({
  bodyStage,
  equipped = {},
  status = 'ready',
  size = 48,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, 128, 128);

    // Warm sunlit portrait backdrop
    ctx.fillStyle = status === 'syncing' ? '#faf6f0' : '#fef3c7';
    ctx.fillRect(0, 0, 128, 128);

    ctx.scale(2, 2);
    if (status === 'syncing' || !bodyStage) {
      drawCreamChibiSilhouette(ctx, {
        x: 32,
        y: 58,
        facingRight: true,
      });
    } else {
      drawMapleChibiAvatar(ctx, {
        x: 4,
        y: 2,
        bodyStage,
        equipped,
        state: 'IDLE',
        facingRight: true,
        frameTick: 4,
      });
    }
    ctx.restore();
  }, [bodyStage, equipped, status]);

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={128}
      style={{ width: `${size}px`, height: `${size}px` }}
      className="rounded-xl border border-amber-300/80 shrink-0 bg-amber-50 shadow-sm"
    />
  );
};
