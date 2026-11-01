import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Sparkles, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { useGameStore } from '../stores/useGameStore';
import { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig';
import { drawPixelGymScene } from './pixelSpriteDrawer';

const SPEECH_LINES = [
  '💪 再做一組深蹲就喝乳清！',
  '🔥 脊椎保持中立，核心繃緊！',
  '🐕 豆助看著我，今天絕不能偷懶！',
  '⚡ 睡眠充足 8 小時，肌肉正在合成中！',
  '🏆 離突破個人 PR 只差 2.5 公斤了！',
  '🦵 今天練腿，明天請幫我叫輪椅！',
];

interface PixelRoomCanvasProps {
  isActive: boolean;
  customOverride?: {
    ownerName: string;
    ownerBadge?: string;
    bodyStage: AvatarBodyStage;
    equipped: Record<EquipSlot, string>;
    room: Record<RoomSlot, string>;
  };
  compact?: boolean;
}

export const PixelRoomCanvas: React.FC<PixelRoomCanvasProps> = ({
  isActive,
  customOverride,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const store = useGameStore();

  const bodyStage = customOverride ? customOverride.bodyStage : store.bodyStage;
  const equipped = customOverride ? customOverride.equipped : store.equipped;
  const room = customOverride ? customOverride.room : store.room;

  const [aiState, setAiState] = useState<'WALK' | 'SQUAT' | 'CURL' | 'IDLE'>('SQUAT');
  const [speechBubble, setSpeechBubble] = useState<string>(SPEECH_LINES[0]);

  const animRef = useRef({
    tick: 0,
    x: 96,
    y: 84,
    vx: 0.45,
    facingRight: true,
    stateTimer: 0,
    currentState: 'SQUAT' as 'WALK' | 'SQUAT' | 'CURL' | 'IDLE',
    hearts: [] as { x: number; y: number; alpha: number }[],
  });

  // Sync manual state trigger
  useEffect(() => {
    animRef.current.currentState = aiState;
  }, [aiState]);

  // ADR-0002: Canvas Resource Lifecycle (Auto-sleep when off-tab!)
  useEffect(() => {
    if (!isActive) return;

    let rafId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const renderLoop = () => {
      const st = animRef.current;
      st.tick += 1;
      st.stateTimer += 1;

      // Autonomous AI transitions every ~240 frames (4 seconds)
      if (st.stateTimer > 240) {
        st.stateTimer = 0;
        const states: ('WALK' | 'SQUAT' | 'CURL' | 'IDLE')[] = ['WALK', 'SQUAT', 'CURL', 'IDLE'];
        const next = states[Math.floor(Math.random() * states.length)];
        st.currentState = next;
        setAiState(next);
      }

      if (st.currentState === 'WALK') {
        st.x += st.vx;
        if (st.x > 136) {
          st.vx = -0.45;
          st.facingRight = false;
        } else if (st.x < 58) {
          st.vx = 0.45;
          st.facingRight = true;
        }
      }

      // Update floating hearts
      st.hearts = st.hearts
        .map((h) => ({ x: h.x, y: h.y - 0.35, alpha: h.alpha - 0.02 }))
        .filter((h) => h.alpha > 0);

      drawPixelGymScene(ctx, {
        bodyStage,
        equipped,
        room,
        isNight: store.isNightModeRoom,
        frameTick: st.tick,
        avatarX: st.x,
        avatarY: st.y,
        avatarState: st.currentState,
        facingRight: st.facingRight,
        petHearts: st.hearts,
      });

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, bodyStage, equipped, room, store.isNightModeRoom]);

  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 240;

    // Check if clicked near Pet (right side x > 145)
    if (clickX > 145) {
      animRef.current.hearts.push({
        x: 166 + (Math.random() * 10 - 5),
        y: 92,
        alpha: 1.0,
      });
      store.interactWithRoomEntity('pet');
      setSpeechBubble('🐶 汪！豆助幫你加油！（完成每日互動）');
    } else {
      // Cycle avatar action
      const order: ('SQUAT' | 'CURL' | 'WALK' | 'IDLE')[] = ['SQUAT', 'CURL', 'WALK', 'IDLE'];
      const next = order[(order.indexOf(aiState) + 1) % order.length];
      setAiState(next);
      animRef.current.stateTimer = 0;
      const randomLine = SPEECH_LINES[Math.floor(Math.random() * SPEECH_LINES.length)];
      setSpeechBubble(randomLine);
      store.interactWithRoomEntity('avatar');
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-slate-700/80 bg-[#0d111a] shadow-2xl">
      {/* Top Floating Room Status Bar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/70 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-bold">
            {customOverride ? `${customOverride.ownerName} 的訓練室` : '2D 像素訓練室'}
          </span>
          <span className="text-emerald-400 font-mono text-[10px]">[{aiState}]</span>
        </div>

        {!compact && (
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => store.toggleNightModeRoom()}
              title="切換日夜窗景"
              className="p-1.5 rounded-lg bg-slate-950/85 border border-slate-700/70 text-amber-400 hover:bg-slate-800 active:scale-95 transition"
            >
              {store.isNightModeRoom ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => store.toggleSound()}
              title="切換 8-Bit 音效"
              className="p-1.5 rounded-lg bg-slate-950/85 border border-slate-700/70 text-emerald-400 hover:bg-slate-800 active:scale-95 transition"
            >
              {store.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>
        )}
      </div>

      {/* Crisp 240x150 Logical Pixel Canvas */}
      <canvas
        ref={canvasRef}
        width={240}
        height={150}
        onClick={handleCanvasInteraction}
        className={`w-full ${compact ? 'h-40' : 'h-56 sm:h-60'} object-cover pixel-canvas cursor-pointer block`}
      />

      {/* Bottom Dialogue Bubble & Quick Action Bar */}
      {!compact && (
        <div className="bg-slate-900/95 border-t border-slate-800 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-xs text-slate-200 truncate">{speechBubble}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(['SQUAT', 'CURL', 'WALK'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setAiState(mode);
                  animRef.current.stateTimer = 0;
                  store.interactWithRoomEntity('avatar');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                  aiState === mode
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'SQUAT' ? '深蹲' : mode === 'CURL' ? '彎舉' : '巡邏'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
