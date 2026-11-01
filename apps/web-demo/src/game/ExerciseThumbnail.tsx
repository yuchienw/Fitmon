import React, { useEffect, useRef } from 'react';
import { ExerciseItem } from '../config/catalogConfig';

interface ExerciseThumbnailProps {
  exercise: ExerciseItem;
  sizeClass?: string;
  size?: number;
}

export const ExerciseThumbnail: React.FC<ExerciseThumbnailProps> = ({
  exercise,
  sizeClass = 'w-11 h-11',
  size,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 48, 48);
    ctx.imageSmoothingEnabled = false;

    const px = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };

    // Background badge glow by sportType
    const bg =
      exercise.sportType === 'cardio'
        ? '#083344'
        : exercise.sportType === 'bodyweight'
        ? '#2e1065'
        : '#064e3b';
    px(0, 0, 48, 48, bg);

    const icon = exercise.iconType;
    if (icon === 'squat') {
      // Squat Rack + Loaded Barbell
      px(6, 16, 36, 4, '#e2e8f0');
      px(6, 8, 5, 20, '#ef4444');
      px(11, 10, 4, 16, '#3b82f6');
      px(37, 8, 5, 20, '#ef4444');
      px(33, 10, 4, 16, '#3b82f6');
      // Chibi figure squatting
      px(20, 12, 8, 8, '#ffdfc4');
      px(18, 20, 12, 10, '#10b981');
      px(14, 30, 6, 8, '#ffdfc4');
      px(28, 30, 6, 8, '#ffdfc4');
    } else if (icon === 'bench') {
      // Bench + Barbell press
      px(8, 30, 32, 5, '#475569');
      px(12, 35, 4, 8, '#334155');
      px(32, 35, 4, 8, '#334155');
      px(14, 24, 22, 6, '#ef4444');
      px(8, 14, 32, 3, '#f8fafc');
      px(8, 8, 5, 15, '#f59e0b');
      px(35, 8, 5, 15, '#f59e0b');
    } else if (icon === 'deadlift') {
      // Heavy Barbell on floor + Lifter
      px(20, 8, 8, 8, '#ffdfc4');
      px(17, 16, 14, 12, '#dc2626');
      px(4, 32, 40, 4, '#cbd5e1');
      px(6, 22, 6, 22, '#ef4444');
      px(12, 24, 5, 18, '#eab308');
      px(36, 22, 6, 22, '#ef4444');
      px(31, 24, 5, 18, '#eab308');
    } else if (icon === 'press') {
      // Overhead press
      px(8, 10, 32, 3, '#facc15');
      px(8, 5, 5, 13, '#f59e0b');
      px(35, 5, 5, 13, '#f59e0b');
      px(20, 18, 8, 8, '#ffdfc4');
      px(17, 26, 14, 14, '#3b82f6');
    } else if (icon === 'pull') {
      // Pull-up bar + figure
      px(6, 8, 36, 3, '#94a3b8');
      px(14, 11, 3, 10, '#ffdfc4');
      px(31, 11, 3, 10, '#ffdfc4');
      px(20, 14, 8, 8, '#ffdfc4');
      px(16, 22, 16, 14, '#10b981');
    } else if (icon === 'curl') {
      // Dumbbell bicep curl
      px(12, 22, 24, 4, '#cbd5e1');
      px(8, 14, 7, 20, '#38bdf8');
      px(33, 14, 7, 20, '#38bdf8');
    } else if (icon === 'run') {
      // Treadmill / Runner
      px(8, 36, 32, 5, '#22d3ee');
      px(32, 14, 4, 22, '#64748b');
      px(22, 10, 8, 8, '#ffdfc4');
      px(20, 18, 8, 10, '#f43f5e');
      px(16, 28, 6, 8, '#ffdfc4');
      px(26, 26, 6, 8, '#ffdfc4');
    } else if (icon === 'bike') {
      // Spin Bike wheels
      px(8, 26, 12, 12, '#22d3ee');
      px(10, 28, 8, 8, '#083344');
      px(28, 26, 12, 12, '#22d3ee');
      px(30, 28, 8, 8, '#083344');
      px(14, 18, 20, 8, '#f59e0b');
    } else {
      // Yoga / Core Plank
      px(6, 36, 36, 4, '#a855f7');
      px(10, 24, 8, 8, '#ffdfc4');
      px(18, 26, 16, 6, '#34d399');
      px(34, 28, 6, 8, '#ffdfc4');
    }
  }, [exercise]);

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={48}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      className={`${size ? '' : sizeClass} rounded-xl border border-white/15 pixel-canvas shrink-0 shadow`}
    />
  );
};
