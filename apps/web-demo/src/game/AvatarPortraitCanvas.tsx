import React, { useEffect, useRef } from 'react';
import { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig';
import { drawMapleChibiAvatar } from './pixelSpriteDrawer';

interface AvatarPortraitCanvasProps {
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room?: Record<RoomSlot, string>;
}

export const AvatarPortraitCanvas: React.FC<AvatarPortraitCanvasProps> = ({
  bodyStage,
  equipped,
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
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, 128, 128);

    ctx.scale(2, 2);
    drawMapleChibiAvatar(ctx, {
      x: 4,
      y: 2,
      bodyStage,
      equipped,
      state: 'IDLE',
      facingRight: true,
      frameTick: 4,
    });
    ctx.restore();
  }, [bodyStage, equipped]);

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={128}
      className="w-12 h-12 rounded-xl border border-amber-300/80 shrink-0 bg-amber-50 shadow-sm"
    />
  );
};
