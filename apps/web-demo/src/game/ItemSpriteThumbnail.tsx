import React, { useEffect, useRef } from 'react';
import { CosmeticItem } from '../config/catalogConfig';
import { drawSingleItemThumbnail } from './pixelSpriteDrawer';

interface ItemSpriteThumbnailProps {
  item: CosmeticItem;
  sizeClass?: string;
  size?: number;
}

export const ItemSpriteThumbnail: React.FC<ItemSpriteThumbnailProps> = ({
  item,
  sizeClass = 'w-12 h-12',
  size,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSingleItemThumbnail(ctx, item.id, item.slot, item.primaryColor, item.accentColor);
  }, [item]);

  return (
    <canvas
      ref={canvasRef}
      width={112}
      height={112}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      className={`${size ? '' : sizeClass} rounded-xl bg-amber-50 border border-amber-200/80 shrink-0 shadow-sm`}
    />
  );
};
