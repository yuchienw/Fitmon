import React, { useState } from 'react';
import { X, BookOpen, ShieldCheck, Trophy, Dumbbell, Target, Sparkles } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { EXERCISE_LIBRARY } from '../../config/catalogConfig';
import { ExerciseThumbnail } from '../../game/ExerciseThumbnail';

export const ExerciseGuideModal: React.FC = () => {
  const store = useGameStore();
  const exerciseId = store.inspectedExerciseId;
  const [imgError0, setImgError0] = useState(false);
  const [imgError1, setImgError1] = useState(false);

  if (!exerciseId) return null;

  const exercise = EXERCISE_LIBRARY.find((e) => e.id === exerciseId);
  if (!exercise) return null;

  const pr = store.personalRecords[exercise.id] || 0;
  const photoBase = exercise.freeExerciseDbId
    ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exercise.freeExerciseDbId}`
    : null;

  return (
    <div
      onClick={() => store.setInspectedExerciseId(null)}
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3.5 border-2 border-cyan-400/70 shadow-2xl max-h-[88vh] flex flex-col"
      >
        {/* 1. HEADER */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <ExerciseThumbnail exercise={exercise} size={52} disableGuideModal />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black">
                  {exercise.muscleLabelZh}
                </span>
                {exercise.equipmentZh && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                    {exercise.equipmentZh}
                  </span>
                )}
                {pr > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-black flex items-center gap-0.5">
                    <Trophy className="w-2.5 h-2.5" />
                    PR {pr} {exercise.unitLabel}
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white mt-1 break-words leading-snug">{exercise.nameZh}</h3>
              <p className="text-[11px] font-mono text-slate-400 break-words">{exercise.nameEn}</p>
            </div>
          </div>

          <button
            onClick={() => store.setInspectedExerciseId(null)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {/* 2. STEP-BY-STEP REAL DEMONSTRATION PHOTOS (if available) */}
          {photoBase && (!imgError0 || !imgError1) && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-black text-cyan-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>真人分解動作圖解（起始姿勢 ➔ 頂峰收縮）</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {!imgError0 && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3]">
                    <img
                      src={`${photoBase}/0.jpg`}
                      alt={`${exercise.nameZh} 起始動作`}
                      onError={() => setImgError0(true)}
                      className="w-full h-full object-cover"
                    />
                    <span className="game-stage-dark absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/85 text-[10px] font-black text-cyan-300 border border-cyan-500/30">
                      STEP 1 · 起始準備
                    </span>
                  </div>
                )}
                {!imgError1 && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3]">
                    <img
                      src={`${photoBase}/1.jpg`}
                      alt={`${exercise.nameZh} 發力頂峰`}
                      onError={() => setImgError1(true)}
                      className="w-full h-full object-cover"
                    />
                    <span className="game-stage-dark absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/85 text-[10px] font-black text-emerald-300 border border-emerald-500/30">
                      STEP 2 · 發力收縮
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. TARGET MUSCLE ANATOMY & RECOMMENDED LOAD */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>目標肌群與訓練參數</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex items-start justify-between gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-bold shrink-0">🎯 主働肌群</span>
                <span className="text-rose-300 font-black text-right">
                  {exercise.primaryMusclesZh || exercise.muscleLabelZh}
                </span>
              </div>
              {exercise.secondaryMusclesZh && (
                <div className="flex items-start justify-between gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 font-bold shrink-0">⚡ 協同肌群</span>
                  <span className="text-amber-300 font-bold text-right">
                    {exercise.secondaryMusclesZh}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-cyan-400" />
                  建議起始組數
                </span>
                <span className="font-mono font-black text-cyan-300">
                  {exercise.defaultWeightKg} {exercise.unitLabel} × {exercise.defaultReps} 次
                </span>
              </div>
            </div>
          </div>

          {/* 4. BIOMECHANICAL SAFETY CUES & COACHING TIPS */}
          <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>動作標準要領與防受傷細節</span>
            </div>
            <div className="space-y-1.5">
              {exercise.safetyCues.map((cue, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 bg-slate-950/75 px-2.5 py-2 rounded-lg border border-slate-800/90 text-xs"
                >
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 font-bold leading-relaxed">{cue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. FOOTER CTA */}
        <button
          onClick={() => store.setInspectedExerciseId(null)}
          className="w-full retro-btn py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>了解動作要領 · 返回</span>
        </button>
      </div>
    </div>
  );
};
