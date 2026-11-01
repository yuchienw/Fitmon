import React, { useEffect, useRef } from 'react';
import { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig';
import { drawMapleChibiAvatar } from './pixelSpriteDrawer';

interface AvatarPortraitCanvasProps {
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
}

export const AvatarPortraitCanvas: React.FC<AvatarPortraitCanvasProps> = ({
  bodyStage,
  equipped,
  room,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 96, 96);

    // Subtle dark gradient backdrop
    ctx.fillStyle = '#151c2c';
    ctx.fillRect(0, 0, 96, 96);

    drawMapleChibiAvatar(ctx, {
      bodyStage,
      equipped,
      room,
      isNight: false,
      frameTick: 4,
      avatarX: 8,
      avatarY: 16,
      avatarState: 'IDLE',
      facingRight: true,
      petHearts: [],
    });
  }, [bodyStage, equipped, room]);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={96}
      className="w-12 h-12 rounded-xl border border-slate-700 pixel-canvas shrink-0 bg-slate-900"
    />
  );
};
