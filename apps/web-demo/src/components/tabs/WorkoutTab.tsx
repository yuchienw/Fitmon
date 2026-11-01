import React, { useState } from 'react';
import {
  Dumbbell,
  Timer,
  Check,
  Trophy,
  Plus,
  Minus,
  ClipboardList,
  Zap,
  Lightbulb,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  EXERCISE_LIBRARY,
  WORKOUT_TEMPLATES,
  CELEBRITY_SHOWCASES,
} from '../../config/catalogConfig';

export const WorkoutTab: React.FC = () => {
  const store = useGameStore();
  const [subMode, setSubMode] = useState<'logger' | 'templates' | 'quick3s'>('logger');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [showTips, setShowTips] = useState<boolean>(false);

  const currentExercise =
    EXERCISE_LIBRARY.find((e) => e.id === store.selectedExerciseId) || EXERCISE_LIBRARY[0];

  const filteredExercises =
    muscleFilter === 'all'
      ? EXERCISE_LIBRARY
      : EXERCISE_LIBRARY.filter((e) => e.muscleGroup === muscleFilter);

  const personalBest = store.personalRecords[currentExercise.id] || 0;

  return (
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. CLEAN SEGMENTED SWITCHER */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setSubMode('logger')}
          className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
            subMode === 'logger'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>計時打卡</span>
        </button>
        <button
          onClick={() => setSubMode('templates')}
          className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
            subMode === 'templates'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>課表模板</span>
        </button>
        <button
          onClick={() => setSubMode('quick3s')}
          className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
            subMode === 'quick3s'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>3秒速記</span>
        </button>
      </div>

      {/* ================= SUB-MODE A: CLEAN LIVE LOGGER ================= */}
      {subMode === 'logger' && (
        <>
          {/* Rest Timer Bar (Only when active) */}
          {store.isRestRunning && (
            <div className="retro-box-emerald rounded-xl px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold text-emerald-200">休息倒數</span>
                <span className="text-lg font-mono font-black text-white">
                  {Math.floor(store.restSecondsLeft / 60)}:
                  {String(store.restSecondsLeft % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => store.setRestTimer(store.restSecondsLeft + 30)}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-xs font-mono font-bold text-slate-200"
                >
                  +30s
                </button>
                <button
                  onClick={() => store.setRestTimer(0)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black"
                >
                  跳過
                </button>
              </div>
            </div>
          )}

          {/* Exercise Picker */}
          <div className="retro-box rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: '全部' },
                { id: 'legs', label: '腿臀' },
                { id: 'chest', label: '胸部' },
                { id: 'back', label: '背部' },
                { id: 'shoulders', label: '肩部' },
                { id: 'arms', label: '手臂' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setMuscleFilter(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition ${
                    muscleFilter === cat.id
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
              {filteredExercises.map((ex) => {
                const active = ex.id === currentExercise.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => store.selectExercise(ex.id)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-400 text-white font-black'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs truncate">{ex.nameZh}</span>
                    <span className="text-[10px] font-mono text-amber-300 shrink-0 ml-1">
                      {ex.neuralMultiplier}x
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BIG TACTILE WEIGHT & REPS COUNTER */}
          <div className="retro-box rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{currentExercise.nameZh}</h3>
                <button
                  onClick={() => setShowTips(!showTips)}
                  className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1"
                >
                  <Lightbulb className="w-3 h-3" />
                  <span>要訣</span>
                </button>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                PR {personalBest}kg
              </span>
            </div>

            {showTips && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-1 text-xs text-slate-300">
                {currentExercise.safetyCues.map((cue, idx) => (
                  <div key={idx}>• {cue}</div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Weight */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-400">重量 (KG)</span>
                <div className="text-3xl font-mono font-black text-white">
                  {store.currentWeightKg}
                </div>
                <div className="flex items-center justify-center gap-2.5">
                  <button
                    onClick={() => store.setCurrentWeight(store.currentWeightKg - 2.5)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => store.setCurrentWeight(store.currentWeightKg + 2.5)}
                    className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reps */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-400">次數 (REPS)</span>
                <div className="text-3xl font-mono font-black text-white">{store.currentReps}</div>
                <div className="flex items-center justify-center gap-2.5">
                  <button
                    onClick={() => store.setCurrentReps(store.currentReps - 1)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => store.setCurrentReps(store.currentReps + 1)}
                    className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => store.logWorkoutSet()}
              className="retro-btn w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-5 h-5 stroke-[3px]" />
              <span>完成第 {store.sessionSets.length + 1} 組</span>
            </button>
          </div>

          {/* LOGGED SETS & SETTLEMENT BUTTON */}
          {store.sessionSets.length > 0 && (
            <div className="retro-box rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-white">已完成 {store.sessionSets.length} 組</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {store.sessionSets
                    .reduce((acc, s) => acc + s.weightKg * s.reps, 0)
                    .toLocaleString()}{' '}
                  kg
                </span>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {store.sessionSets.map((s, i) => (
                  <div
                    key={s.id}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs shrink-0 flex items-center gap-1.5"
                  >
                    <span className="text-slate-400 font-mono">#{i + 1}</span>
                    <span className="font-bold text-white">
                      {s.weightKg}kg×{s.reps}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => store.finishWorkoutSession()}
                className="retro-btn w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>完成訓練・領取獎勵結算</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ================= SUB-MODE B: CLEAN TEMPLATES ================= */}
      {subMode === 'templates' && (
        <div className="space-y-2.5">
          {CELEBRITY_SHOWCASES.map((celeb) => (
            <div
              key={celeb.id}
              className="retro-box-amber rounded-2xl p-3.5 flex items-center justify-between gap-3"
            >
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                  {celeb.verifiedBadge}
                </span>
                <h4 className="text-sm font-black text-white mt-1">
                  {celeb.routineTemplate.nameZh}
                </h4>
              </div>
              <button
                onClick={() => {
                  store.loadWorkoutTemplate(celeb.routineTemplate);
                  setSubMode('logger');
                }}
                className="retro-btn px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shrink-0"
              >
                套用
              </button>
            </div>
          ))}

          {WORKOUT_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="retro-box rounded-2xl p-3.5 flex items-center justify-between gap-3"
            >
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {tpl.tagZh}
                </span>
                <h4 className="text-sm font-black text-white mt-1">{tpl.nameZh}</h4>
              </div>
              <button
                onClick={() => {
                  store.loadWorkoutTemplate(tpl);
                  setSubMode('logger');
                }}
                className="retro-btn px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shrink-0"
              >
                套用
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ================= SUB-MODE C: 3-SECOND EXPRESS LOG ================= */}
      {subMode === 'quick3s' && (
        <div className="grid grid-cols-1 gap-2.5">
          {[
            { title: '🔥 上肢推日 (胸/肩/三頭)', vol: 4500, group: 'chest' as const },
            { title: '🦅 背部拉日 (引體/划船)', vol: 4800, group: 'back' as const },
            { title: '♿ 硬派腿日 (深蹲/腿推)', vol: 6200, group: 'legs' as const },
            { title: '🏃 燃脂有氧與核心', vol: 3000, group: 'core' as const },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => store.quickLog3SecWorkout(item.title, item.vol, item.group)}
              className="retro-btn p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-between text-left"
            >
              <span className="text-sm font-black text-white">{item.title}</span>
              <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                一鍵完成
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
