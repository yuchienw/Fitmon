import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Brain,
  Camera,
  Dumbbell,
  Coins,
  X,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { DAILY_SCIENCE_QUIZZES } from '../../config/catalogConfig';

export const HomeTab: React.FC = () => {
  const store = useGameStore();
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedQuizIdx, setSelectedQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const currentQuiz = DAILY_SCIENCE_QUIZZES[selectedQuizIdx % DAILY_SCIENCE_QUIZZES.length];
  const isQuizAnswered = store.answeredQuizIds.includes(currentQuiz.id);

  return (
    <div className="p-3.5 space-y-3.5 pb-8">
      {/* 1. HERO: MAPLESTORY CHIBI 2D GYM ROOM */}
      <PixelRoomCanvas isActive={store.activeTab === 'home'} />

      {/* 2. TWO CLEAN VISUAL CTA BUTTONS */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => store.setActiveTab('workout')}
          className="retro-btn py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
        >
          <Dumbbell className="w-5 h-5 stroke-[2.5px]" />
          <span>開始運動打卡</span>
        </button>

        <button
          onClick={() => store.setMemeStudioOpen(true)}
          className="retro-btn py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black text-sm flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5 text-amber-400" />
          <span>迷因拍貼工坊</span>
        </button>
      </div>

      {/* 3. ULTRA-CLEAN SINGLE-LINE DAILY QUESTS */}
      <div className="retro-box rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs font-black text-slate-300 tracking-wide">📋 今日任務</h3>
          <button
            onClick={() => setQuizOpen(true)}
            className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1 hover:bg-cyan-500/25 transition"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>每日問答 +15🪙</span>
          </button>
        </div>

        <div className="space-y-1.5">
          {store.quests.map((q) => {
            const isReady = q.progress >= q.target && !q.claimed;
            return (
              <div
                key={q.id}
                className={`px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                  q.claimed
                    ? 'bg-slate-900/40 border-slate-800/50 opacity-50'
                    : isReady
                    ? 'bg-amber-950/30 border-amber-500/60'
                    : 'bg-slate-900/90 border-slate-800/90'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-white truncate">{q.titleZh}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                    +{q.rewardCoins * (store.doubleCoinActive ? 2 : 1)}🪙
                  </span>
                </div>

                {q.claimed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isReady ? (
                  <button
                    onClick={() => store.claimQuest(q.id)}
                    className="retro-btn px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1 animate-bounce"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    領取
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
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold shrink-0 flex items-center gap-1 hover:text-white"
                  >
                    <span>前往</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. OPTIONAL POPUP MODAL FOR DAILY QUIZ (Zero Screen Clutter!) */}
      {quizOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm retro-box rounded-2xl p-4 space-y-3 border-2 border-cyan-500/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-cyan-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4" />
                每日運動科普問答 (+15🪙)
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
