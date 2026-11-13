import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Brain,
  Camera,
  Dumbbell,
  Coins,
  Swords,
  Wrench,
  X,
  Sprout,
  Zap,
  Shield,
  Crown,
  Shirt,
  ScrollText,
  Flame,
} from 'lucide-react';
import { useGameStore, INITIAL_QUESTS } from '../../stores/useGameStore';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { TodayHeroCard } from '../home/TodayHeroCard';
import { DAILY_SCIENCE_QUIZZES, AvatarBodyStage } from '../../config/catalogConfig';

const STAGE_OPTIONS: {
  id: AvatarBodyStage;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'beginner', label: '菜鳥', icon: Sprout },
  { id: 'aesthetic', label: '精實', icon: Zap },
  { id: 'powerlifter', label: '巨巨', icon: Shield },
  { id: 'titan', label: '泰坦', icon: Crown },
];

export const HomeTab: React.FC = () => {
  const store = useGameStore();
  const [quizOpen, setQuizOpen] = useState(false);
  const [devPreviewOpen, setDevPreviewOpen] = useState(false);
  const [selectedQuizIdx, setSelectedQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const currentQuiz = DAILY_SCIENCE_QUIZZES[selectedQuizIdx % DAILY_SCIENCE_QUIZZES.length];
  const isQuizAnswered = store.answeredQuizIds.includes(currentQuiz.id);
  const isBareTop = store.equipped.top === 'top_bare_muscles';

  return (
    <div className="p-3 space-y-3 pb-8">
      {/* 1. HERO STAGE: MAPLESTORY CHIBI 2D GYM ROOM WITH FLOATING DEV PILL */}
      <div className="relative">
        <PixelRoomCanvas
          isActive={store.activeTab === 'home'}
          onOpenWardrobe={() => store.setWardrobeModalOpen(true)}
        />

        {/* Floating Corner Dev/Physique Preview Trigger (Hidden until tapped) */}
        <button
          onClick={() => setDevPreviewOpen((v) => !v)}
          className="game-stage-dark absolute bottom-14 right-2.5 z-20 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-400/50 text-amber-300 text-[10px] font-black flex items-center gap-1 shadow-lg active:scale-95 transition"
        >
          <Wrench className="w-3 h-3" aria-hidden="true" />
          <span>體態預覽</span>
        </button>

        {devPreviewOpen && (
          <div className="game-stage-dark absolute bottom-24 right-2.5 left-2.5 z-30 p-2.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border-2 border-amber-400 shadow-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                <span>MVP 體態進化與赤膊快速預覽</span>
              </span>
              <button
                onClick={() => setDevPreviewOpen(false)}
                aria-label="關閉體態預覽"
                className="p-0.5 rounded bg-slate-800 text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="grid grid-cols-4 gap-1 flex-1">
                {STAGE_OPTIONS.map((st) => {
                  const StageIcon = st.icon;
                  return (
                    <button
                      key={st.id}
                      onClick={() => store.setBodyStage(st.id)}
                      className={`py-1.5 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1 ${
                        store.bodyStage === st.id
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <StageIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() =>
                  store.equipOwnedAvatarItem(
                    'top',
                    isBareTop ? 'top_black_tank' : 'top_bare_muscles'
                  )
                }
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black shrink-0 border transition flex items-center gap-1 ${
                  isBareTop
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-900 text-amber-300 border-amber-500/40'
                }`}
              >
                {isBareTop ? (
                  <>
                    <Flame className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>赤膊</span>
                  </>
                ) : (
                  <>
                    <Shirt className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>背心</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. TODAY HERO CARD (Directly below PixelRoomCanvas) */}
      <TodayHeroCard />

      {/* 3. COMPACT RPG DAILY BOUNTY BOARD (今日懸賞) */}
      <div className="retro-box rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <ScrollText className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <h3 className="text-xs font-black text-white tracking-wide">今日懸賞任務</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => store.setMemeStudioOpen(true, 'workout_photo')}
              title="與我的娃合照"
              className="px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-black flex items-center gap-1 hover:text-white transition"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>合照</span>
            </button>
            <button
              onClick={() => setQuizOpen(true)}
              className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] font-black flex items-center gap-1 hover:bg-cyan-500/25 transition"
            >
              <Brain className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>科普問答</span>
              <span className="font-mono flex items-center gap-0.5 text-amber-300">
                +15
                <Coins className="w-3 h-3 text-amber-400" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {store.quests.map((q) => {
            const isReady = q.progress >= q.target && !q.claimed;
            const displayTitle = INITIAL_QUESTS.find((iq) => iq.id === q.id)?.titleZh || q.titleZh;
            return (
              <div
                key={q.id}
                className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                  q.claimed
                    ? 'bg-slate-900/40 border-slate-800/50 opacity-55'
                    : isReady
                    ? 'bg-amber-950/40 border-amber-400'
                    : 'bg-slate-900/90 border-slate-800/90'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-xs font-black text-white break-words leading-snug">{displayTitle}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black shrink-0">
                    +{q.rewardCoins * (store.doubleCoinUntil > Date.now() ? 2 : 1)}🪙
                  </span>
                </div>

                {q.claimed ? (
                  <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    已領
                  </span>
                ) : isReady ? (
                  <button
                    onClick={() => store.claimQuest(q.id)}
                    className="retro-btn px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1 animate-bounce"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    領賞
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (q.id === 'q_create_meme') {
                        store.setMemeStudioOpen(true);
                      } else {
                        store.setActiveTab(q.targetTab);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-black shrink-0 flex items-center gap-1 hover:text-white"
                  >
                    <span>GO</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. POPUP MODAL FOR DAILY QUIZ */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm retro-box rounded-2xl p-4 space-y-3 border-2 border-cyan-500/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-cyan-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4" />
                每日運動科普問答 · +15🪙
              </span>
              <button
                onClick={() => setQuizOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-white bg-slate-900 p-3 rounded-xl border border-slate-800">
              {currentQuiz.question}
            </p>

            <div className="space-y-2">
              {currentQuiz.options.map((opt, idx) => {
                const isCorrect = idx === currentQuiz.correctIndex;
                const isChosen = selectedOption === idx || (isQuizAnswered && isCorrect);
                return (
                  <button
                    key={idx}
                    disabled={isQuizAnswered}
                    onClick={() => {
                      setSelectedOption(idx);
                      store.answerQuiz(currentQuiz.id, isCorrect);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold border transition ${
                      isChosen
                        ? isCorrect
                          ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                          : 'bg-rose-950/70 border-rose-400 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {(selectedOption !== null || isQuizAnswered) && (
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200">
                💡 {currentQuiz.explanation}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setSelectedQuizIdx((i) => i + 1);
                }}
                className="text-xs text-cyan-400 font-bold hover:underline"
              >
                換下一題 ↻
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
