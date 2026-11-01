import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../stores/useGameStore';
import { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig';
import { drawPixelGymScene } from './pixelSpriteDrawer';

const SPEECH_LINES = [
  '再一組深蹲就喝乳清！💪',
  '豆助在看，今天絕不偷懶！🐕',
  '核心繃緊，準備破 PR！🔥',
  '練腿日，明天坐輪椅！♿',
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
    x: 92,
    y: 78,
    vx: 0.4,
    facingRight: true,
    stateTimer: 0,
    currentState: 'SQUAT' as 'WALK' | 'SQUAT' | 'CURL' | 'IDLE',
    hearts: [] as { x: number; y: number; alpha: number }[],
  });

  useEffect(() => {
    animRef.current.currentState = aiState;
  }, [aiState]);

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

      if (st.stateTimer > 260) {
        st.stateTimer = 0;
        const states: ('WALK' | 'SQUAT' | 'CURL' | 'IDLE')[] = ['WALK', 'SQUAT', 'CURL', 'IDLE'];
        const next = states[Math.floor(Math.random() * states.length)];
        st.currentState = next;
        setAiState(next);
      }

      if (st.currentState === 'WALK') {
        st.x += st.vx;
        if (st.x > 124) {
          st.vx = -0.4;
          st.facingRight = false;
        } else if (st.x < 56) {
          st.vx = 0.4;
          st.facingRight = true;
        }
      }

      st.hearts = st.hearts
        .map((h) => ({ x: h.x, y: h.y - 0.35, alpha: h.alpha - 0.022 }))
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

    if (clickX > 145) {
      animRef.current.hearts.push({
        x: 168 + (Math.random() * 10 - 5),
        y: 92,
        alpha: 1.0,
      });
      store.interactWithRoomEntity('pet');
      setSpeechBubble('🐶 豆助開心地搖尾巴！(+互動)');
    } else {
      const order: ('SQUAT' | 'CURL' | 'WALK' | 'IDLE')[] = ['SQUAT', 'CURL', 'WALK', 'IDLE'];
      const next = order[(order.indexOf(aiState) + 1) % order.length];
      setAiState(next);
      animRef.current.stateTimer = 0;
      setSpeechBubble(SPEECH_LINES[Math.floor(Math.random() * SPEECH_LINES.length)]);
      store.interactWithRoomEntity('avatar');
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700/90 bg-[#0d111a] shadow-2xl">
      {/* Top Floating Room Controls (Minimal Icons Only) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-white shadow">
          {customOverride ? `🏠 ${customOverride.ownerName}` : `💬 ${speechBubble}`}
        </div>

        {!compact && (
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => store.toggleNightModeRoom()}
              className="p-1.5 rounded-full bg-slate-950/80 border border-white/15 text-amber-300 hover:bg-slate-800 active:scale-95 transition"
            >
              {store.isNightModeRoom ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => store.toggleSound()}
              className="p-1.5 rounded-full bg-slate-950/80 border border-white/15 text-emerald-400 hover:bg-slate-800 active:scale-95 transition"
            >
              {store.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* High-Detail 480x300 MapleStory Chibi Scene Canvas */}
      <canvas
        ref={canvasRef}
        width={480}
        height={300}
        onClick={handleCanvasInteraction}
        className={`w-full ${
          compact ? 'h-48' : 'h-64 sm:h-72'
        } object-cover pixel-canvas cursor-pointer block`}
      />

      {/* Sleek Bottom Action & Body Stage Bar */}
      {!compact && (
        <div className="bg-slate-900/95 border-t border-slate-800 px-3 py-2 flex items-center justify-between gap-2">
          {/* Action Switcher */}
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'SQUAT', label: '🏋️ 深蹲' },
                { id: 'CURL', label: '💪 彎舉' },
                { id: 'WALK', label: '🚶 散步' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setAiState(m.id);
                  animRef.current.stateTimer = 0;
                  store.interactWithRoomEntity('avatar');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  aiState === m.id
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Compact Body Evolution Stage Pills */}
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'beginner', label: '新手' },
                { id: 'powerlifter', label: '巨力' },
                { id: 'aesthetic', label: '美學' },
                { id: 'titan', label: '👑泰坦' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => store.setBodyStage(st.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                  store.bodyStage === st.id
                    ? 'bg-amber-400/20 border border-amber-400 text-amber-300'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
