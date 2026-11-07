import React, { useEffect, useRef, useState } from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Music,
  Sparkles,
  User,
  Dumbbell,
  Flame,
  Footprints,
  Home,
  MessageCircle,
} from 'lucide-react';
import { useGameStore } from '../stores/useGameStore';
import { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig';
import { drawPixelGymScene, VisitorAvatarConfig } from './pixelSpriteDrawer';

const SPEECH_LINES = [
  '再一組深蹲就喝乳清！',
  '核心繃緊，準備破 PR！',
  '練腿日，訓練量拉滿！',
  '點擊左下角 BGM 開啟 8-Bit 音樂！',
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
  customAvatar?: {
    bodyStage: AvatarBodyStage;
    equipped: Record<EquipSlot, string>;
    room: Record<RoomSlot, string>;
  };
  visitorAvatar?: VisitorAvatarConfig;
  compact?: boolean;
  onOpenWardrobe?: () => void;
}

export const PixelRoomCanvas: React.FC<PixelRoomCanvasProps> = ({
  isActive,
  customOverride,
  customAvatar,
  visitorAvatar,
  compact = false,
  onOpenWardrobe,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const store = useGameStore();

  const activeCustom = customOverride || customAvatar;
  const bodyStage = activeCustom ? activeCustom.bodyStage : store.bodyStage;
  const equipped = activeCustom ? activeCustom.equipped : store.equipped;
  const room = activeCustom ? activeCustom.room : store.room;

  const initialPose = compact ? 'IDLE' : 'SQUAT';
  const [aiState, setAiState] = useState<'WALK' | 'SQUAT' | 'CURL' | 'IDLE'>(initialPose);
  const [speechBubble, setSpeechBubble] = useState<string>(SPEECH_LINES[0]);

  const animRef = useRef({
    tick: 0,
    x: 92,
    y: 78,
    vx: 0.4,
    facingRight: true,
    stateTimer: 0,
    currentState: initialPose as 'WALK' | 'SQUAT' | 'CURL' | 'IDLE',
    hearts: [] as { x: number; y: number; alpha: number }[],
  });

  useEffect(() => {
    animRef.current.currentState = aiState;
  }, [aiState]);

  useEffect(() => {
    let rafId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const drawCurrentFrame = () => {
      const st = animRef.current;
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
        visitorAvatar,
      });
    };

    // Always draw at least one immediate frame even if not actively animating
    drawCurrentFrame();

    if (!isActive) return;

    const renderLoop = () => {
      const st = animRef.current;
      st.tick += 1;
      st.stateTimer += 1;

      if (!compact && st.stateTimer > 260) {
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

      drawCurrentFrame();

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, bodyStage, equipped, room, store.isNightModeRoom, visitorAvatar]);

  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 240;

    if (clickX > 140) {
      animRef.current.hearts.push({
        x: 162 + (Math.random() * 10 - 5),
        y: 94,
        alpha: 1.0,
      });
      store.interactWithRoomEntity('pet');
      setSpeechBubble('❤️ 開心互動！');
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
    <div className="game-stage-dark relative rounded-2xl overflow-hidden border-2 border-slate-700/90 bg-[#0d111a] shadow-2xl">
      {/* Top Floating Room Controls: Left Speech Bubble + Right Pose Switcher Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-start justify-between pointer-events-none gap-1.5 flex-wrap">
        <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[11px] font-bold text-white shadow flex items-center gap-1.5 break-words">
          {customOverride ? (
            <>
              <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span>
                {customOverride.ownerName}
                {visitorAvatar ? ' · 同框串門' : ''}
              </span>
            </>
          ) : (
            <>
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{speechBubble}</span>
            </>
          )}
        </div>

        {/* Top-Right Pose Switcher Bar (Never blocks the character!) */}
        <div
          role="group"
          aria-label="角色動作切換"
          className="ml-auto flex items-center gap-0.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-white/20 pointer-events-auto shadow-lg"
        >
          {(
            [
              { id: 'IDLE', label: '站姿', icon: User },
              { id: 'SQUAT', label: '深蹲', icon: Dumbbell },
              { id: 'CURL', label: '彎舉', icon: Flame },
              ...(compact ? [] : ([{ id: 'WALK', label: '散步', icon: Footprints }] as const)),
            ] as const
          ).map((m) => {
            const PoseIcon = m.icon;
            const isSelected = aiState === m.id;
            return (
              <button
                key={m.id}
                aria-pressed={isSelected}
                onClick={() => {
                  setAiState(m.id);
                  animRef.current.stateTimer = 0;
                  if (m.id !== 'WALK') {
                    animRef.current.x = 92;
                    animRef.current.facingRight = true;
                  }
                  store.interactWithRoomEntity('avatar');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-black transition whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-400 text-slate-950 shadow'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <PoseIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 960x600 Retina HD MapleStory 2D Chibi Scene Canvas */}
      <canvas
        ref={canvasRef}
        width={960}
        height={600}
        onClick={handleCanvasInteraction}
        className={`w-full ${
          compact ? 'h-44 sm:h-48' : 'h-72 sm:h-80'
        } object-cover cursor-pointer block`}
      />

      {/* Bottom Corner Utility Controls (Audio/Day-Night on Left, Wardrobe on Right) */}
      {!compact && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
            <button
              onClick={() => store.toggleBgm()}
              title="切換 8-Bit 背景音樂 (BGM)"
              className={`px-2 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1 transition ${
                store.bgmEnabled
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                  : 'bg-slate-950/85 border-white/20 text-slate-200 hover:text-white'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>BGM</span>
            </button>
            <button
              onClick={() => store.toggleNightModeRoom()}
              title="切換日夜窗景"
              className="p-1.5 rounded-full bg-slate-950/85 border border-white/20 text-amber-300 hover:bg-slate-800 active:scale-95 transition"
            >
              {store.isNightModeRoom ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => store.toggleSound()}
              title="切換點擊音效 (SFX)"
              className="p-1.5 rounded-full bg-slate-950/85 border border-white/20 text-emerald-400 hover:bg-slate-800 active:scale-95 transition"
            >
              {store.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {onOpenWardrobe && (
            <button
              onClick={onOpenWardrobe}
              className="pointer-events-auto retro-btn px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1 shrink-0 shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>換裝佈置</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
