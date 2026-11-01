import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Brain,
  Camera,
  Dumbbell,
  ShieldCheck,
  Coins,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { AvatarBodyStage, DAILY_SCIENCE_QUIZZES } from '../../config/catalogConfig';

const BODY_STAGES: { id: AvatarBodyStage; label: string; desc: string }[] = [
  { id: 'beginner', label: '🌱 新手學徒', desc: '基礎素體' },
  { id: 'powerlifter', label: '🦍 維京巨力', desc: '厚實三項霸主' },
  { id: 'aesthetic', label: '✨ 古典美學', desc: '倒三角精實線條' },
  { id: 'titan', label: '👑 重裝泰坦', desc: '黃金燃燒氣場' },
];

export const HomeTab: React.FC = () => {
  const store = useGameStore();
  const [selectedQuizIdx, setSelectedQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const currentQuiz = DAILY_SCIENCE_QUIZZES[selectedQuizIdx % DAILY_SCIENCE_QUIZZES.length];
  const isQuizAnswered = store.answeredQuizIds.includes(currentQuiz.id);

  const handleAnswerQuiz = (optIndex: number) => {
    setSelectedOption(optIndex);
    const isCorrect = optIndex === currentQuiz.correctIndex;
    store.answerQuiz(currentQuiz.id, isCorrect);
  };

  return (
    <div className="p-3.5 space-y-4 pb-8">
      {/* 1. EMBEDDED 2D PIXEL GYM ISLAND */}
      <PixelRoomCanvas isActive={store.activeTab === 'home'} />

      {/* 2. AVATAR EVOLUTION STAGE SWITCHER (Instant Visual Feel Test) */}
      <div className="retro-box rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            角色體態演化預覽（點擊即時切換畫布小人體格）
          </span>
          <span className="text-[10px] font-mono text-emerald-400">5層紙娃娃渲染</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {BODY_STAGES.map((st) => {
            const active = store.bodyStage === st.id;
            return (
              <button
                key={st.id}
                onClick={() => store.setBodyStage(st.id)}
                className={`p-2 rounded-lg border text-left transition ${
                  active
                    ? 'bg-emerald-500/20 border-emerald-400 text-white'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] font-bold truncate">{st.label}</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">{st.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STREAK & QUICK START CTA CARD */}
      <div className="retro-box-emerald rounded-xl p-3.5 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-orange-400" />
              連續運動 {store.streakDays} 天
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              冰凍保護 ×{store.streakFreezes}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            今日剩餘體力 <strong className="text-emerald-400 font-mono">{store.stamina}/100 ⚡</strong>，完成運動即享街機噴幣！
          </p>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => store.setActiveTab('workout')}
            className="retro-btn px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            去運動打卡
          </button>
          <button
            onClick={() => store.setMemeStudioOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-[11px] flex items-center justify-center gap-1"
          >
            <Camera className="w-3 h-3 text-amber-400" />
            迷因拍貼
          </button>
        </div>
      </div>

      {/* 4. DAILY QUESTS BOARD (3-Tier Quest System) */}
      <div className="retro-box rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <span>📋 每日冒險任務</span>
            <span className="text-[11px] font-mono font-normal text-slate-400">
              ({store.quests.filter((q) => q.claimed).length}/{store.quests.length})
            </span>
          </h3>
          <span className="text-[11px] text-amber-400 font-mono">
            {store.doubleCoinActive ? '⚡ 2X 金幣加成中' : '每日 00:00 重置'}
          </span>
        </div>

        <div className="space-y-2">
          {store.quests.map((q) => {
            const isReady = q.progress >= q.target && !q.claimed;
            return (
              <div
                key={q.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition ${
                  q.claimed
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : isReady
                    ? 'bg-amber-950/30 border-amber-500/60'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100 truncate">{q.titleZh}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                      +{q.rewardCoins * (store.doubleCoinActive ? 2 : 1)} 🪙
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{q.descZh}</p>
                </div>

                {q.claimed ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0 px-2">
                    <CheckCircle2 className="w-4 h-4" />
                    已領取
                  </span>
                ) : isReady ? (
                  <button
                    onClick={() => store.claimQuest(q.id)}
                    className="retro-btn px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1 animate-bounce"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    領取獎勵
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
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0 flex items-center gap-1 border border-slate-700"
                  >
                    <span>去完成</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. DAILY SCIENCE WHITEBOARD & MYTH-BUSTER QUIZ */}
      <div className="retro-box rounded-xl p-3.5 space-y-2.5 border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white">白板每日科普：破除迷思領金幣</h3>
          </div>
          <button
            onClick={() => {
              setSelectedOption(null);
              setSelectedQuizIdx((i) => i + 1);
            }}
            className="text-[11px] text-cyan-400 hover:underline font-mono"
          >
            換一題 ↻
          </button>
        </div>

        <p className="text-xs font-bold text-slate-200 leading-relaxed bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
          Q: {currentQuiz.question}
        </p>

        <div className="space-y-1.5">
          {currentQuiz.options.map((opt, idx) => {
            const isCorrect = idx === currentQuiz.correctIndex;
            const isChosen = selectedOption === idx || (isQuizAnswered && isCorrect);
            return (
              <button
                key={idx}
                disabled={isQuizAnswered}
                onClick={() => handleAnswerQuiz(idx)}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-medium border transition ${
                  isChosen
                    ? isCorrect
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold'
                      : 'bg-rose-950/60 border-rose-500 text-rose-200'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {(selectedOption !== null || isQuizAnswered) && (
          <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/40 text-[11px] text-cyan-200 leading-relaxed">
            💡 <strong>運動科學解析：</strong> {currentQuiz.explanation}
          </div>
        )}
      </div>
    </div>
  );
};
