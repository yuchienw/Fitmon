import React, { useState } from 'react';
import {
  Dumbbell,
  Timer,
  Check,
  ShieldAlert,
  Trophy,
  Plus,
  Minus,
  ClipboardList,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Flame,
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
  const [showSafetyCard, setShowSafetyCard] = useState<boolean>(true);

  const currentExercise =
    EXERCISE_LIBRARY.find((e) => e.id === store.selectedExerciseId) || EXERCISE_LIBRARY[0];

  const filteredExercises =
    muscleFilter === 'all'
      ? EXERCISE_LIBRARY
      : EXERCISE_LIBRARY.filter((e) => e.muscleGroup === muscleFilter);

  const muscleSetCount = store.sessionSets.filter(
    (s) => s.muscleGroup === currentExercise.muscleGroup
  ).length;

  const personalBest = store.personalRecords[currentExercise.id] || 0;

  return (
    <div className="p-3.5 space-y-4 pb-10">
      {/* 1. TOP SUB-MODE SWITCHER */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setSubMode('logger')}
          className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
            subMode === 'logger'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>專業組數打卡</span>
        </button>
        <button
          onClick={() => setSubMode('templates')}
          className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
            subMode === 'templates'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>課表與名人庫</span>
        </button>
        <button
          onClick={() => setSubMode('quick3s')}
          className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
            subMode === 'quick3s'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>3秒極速補登</span>
        </button>
      </div>

      {/* 2. STAMINA & ANTI-PUNISHMENT GOLDEN RULE BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-300 leading-tight">
          <span className="text-emerald-400 font-bold">🛡️ 免費記錄金律：</span>
          體力 <strong className="font-mono text-white">{store.stamina}/100⚡</strong>
          {store.stamina === 0
            ? '（已耗盡，運動日誌與 PR 仍 100% 免費記錄！）'
            : '（每組 -5⚡ 並掉落金幣）'}
        </div>
        {store.stamina < 100 && (
          <button
            onClick={() => store.useConsumableItem('bcaa_water')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/30"
          >
            🧪 喝活力水 ({store.consumables.bcaa_water})
          </button>
        )}
      </div>

      {/* ================= SUB-MODE A: LIVE SET LOGGER ================= */}
      {subMode === 'logger' && (
        <>
          {/* Active Template Queue Banner */}
          {store.activeTemplateName && (
            <div className="retro-box-amber rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300">
                  📋 當前執行課表：{store.activeTemplateName}
                </span>
                <span className="text-[10px] font-mono text-amber-200">點擊項目切換動作</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {store.templateQueue.map((item) => {
                  const ex = EXERCISE_LIBRARY.find((e) => e.id === item.exerciseId);
                  if (!ex) return null;
                  const done = item.completedSets >= item.targetSets;
                  const selected = store.selectedExerciseId === item.exerciseId;
                  return (
                    <button
                      key={item.exerciseId}
                      onClick={() => {
                        store.selectExercise(item.exerciseId);
                        store.setCurrentWeight(item.weightKg);
                        store.setCurrentReps(item.reps);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-left shrink-0 transition ${
                        selected
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                          : done
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900/90 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{ex.nameZh}</div>
                      <div className="text-[10px] font-mono opacity-80">
                        進度 {item.completedSets}/{item.targetSets} 組 · {item.weightKg}kg
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rest Countdown Timer Bar (Keep-Alive across tabs!) */}
          {store.isRestRunning && (
            <div className="retro-box-emerald rounded-xl p-3 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-emerald-200">組間休息倒數計時中（切頁不中斷）</div>
                  <div className="text-lg font-mono font-black text-white">
                    {Math.floor(store.restSecondsLeft / 60)}:
                    {String(store.restSecondsLeft % 60).padStart(2, '0')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => store.setRestTimer(store.restSecondsLeft + 30)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-mono font-bold text-slate-200"
                >
                  +30s
                </button>
                <button
                  onClick={() => store.setRestTimer(0)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black"
                >
                  跳過休息
                </button>
              </div>
            </div>
          )}

          {/* Exercise Filter & Selector */}
          <div className="retro-box rounded-xl p-3 space-y-2.5">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {[
                { id: 'all', label: '全部動作' },
                { id: 'legs', label: '🦵 腿臀' },
                { id: 'chest', label: '🦍 胸部' },
                { id: 'back', label: '🦅 背部' },
                { id: 'shoulders', label: '🥥 肩部' },
                { id: 'arms', label: '💪 手臂' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setMuscleFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                    muscleFilter === cat.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredExercises.map((ex) => {
                const active = ex.id === currentExercise.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => store.selectExercise(ex.id)}
                    className={`p-2 rounded-lg border text-left transition ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">{ex.nameZh}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 shrink-0">
                        {ex.neuralMultiplier}x
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{ex.nameEn}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exercise Science Safety Card (free-exercise-db) */}
          <div className="retro-box rounded-xl p-3 border-cyan-500/30">
            <button
              onClick={() => setShowSafetyCard(!showSafetyCard)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black text-cyan-300">
                  動作安全保命卡：{currentExercise.nameZh} ({currentExercise.muscleLabelZh})
                </span>
              </div>
              {showSafetyCard ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showSafetyCard && (
              <div className="mt-2.5 space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-2">
                {currentExercise.safetyCues.map((cue, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">0{idx + 1}.</span>
                    <span>{cue}</span>
                  </div>
                ))}
                <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded p-1.5 mt-1">
                  🔬 {currentExercise.scienceNote}
                </div>
              </div>
            )}
          </div>

          {/* BIG BLIND-FRIENDLY WEIGHT & REPS LOGGER */}
          <div className="retro-box rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold">當前選擇動作</span>
                <h3 className="text-base font-black text-white">{currentExercise.nameZh}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1 justify-end">
                  <Trophy className="w-3.5 h-3.5" />
                  歷史最高 PR: {personalBest} kg
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  本部位已練 {muscleSetCount} 組{' '}
                  {muscleSetCount >= 8 ? '⚠️ 疲勞遞減區' : '🟢 100% 黃金刺激區'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Weight Control */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center space-y-2">
                <span className="text-xs font-bold text-slate-400">重量 (KG)</span>
                <div className="text-2xl font-mono font-black text-white">
                  {store.currentWeightKg}
                  <span className="text-xs text-slate-400 ml-1">kg</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => store.setCurrentWeight(store.currentWeightKg - 2.5)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => store.setCurrentWeight(store.currentWeightKg + 2.5)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reps Control */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center space-y-2">
                <span className="text-xs font-bold text-slate-400">次數 (REPS)</span>
                <div className="text-2xl font-mono font-black text-white">
                  {store.currentReps}
                  <span className="text-xs text-slate-400 ml-1">下</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => store.setCurrentReps(store.currentReps - 1)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => store.setCurrentReps(store.currentReps + 1)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Big Complete Set CTA */}
            <button
              onClick={() => store.logWorkoutSet()}
              className="retro-btn w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-5 h-5 stroke-[3px]" />
              <span>
                完成第 {store.sessionSets.length + 1} 組（{store.currentWeightKg}kg × {store.currentReps}下）
              </span>
            </button>
          </div>

          {/* SESSION LOGGED SETS & FINISH WORKOUT BUTTON */}
          <div className="retro-box rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">
                本次訓練已記錄 ({store.sessionSets.length} 組)
              </span>
              <span className="text-xs font-mono text-emerald-400">
                累積容量:{' '}
                {store.sessionSets
                  .reduce((acc, s) => acc + s.weightKg * s.reps, 0)
                  .toLocaleString()}{' '}
                kg
              </span>
            </div>

            {store.sessionSets.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                尚未記錄組數，點擊上方「完成第 1 組」開始累積訓練容量！
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {store.sessionSets.map((s, i) => (
                  <div
                    key={s.id}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">#{i + 1}</span>
                      <span className="font-bold text-slate-200">{s.exerciseNameZh}</span>
                      {s.isPR && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[10px]">
                          NEW PR!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">
                        {s.weightKg}kg × {s.reps}
                      </span>
                      <span className="text-amber-400">+{s.coinsEarned}🪙</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => store.finishWorkoutSession()}
              disabled={store.sessionSets.length === 0}
              className={`retro-btn w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 ${
                store.sessionSets.length > 0
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>完成本次訓練・街機 VICTORY 結算噴幣！</span>
            </button>
          </div>
        </>
      )}

      {/* ================= SUB-MODE B: WORKOUT TEMPLATES & CELEBRITY ROUTINES ================= */}
      {subMode === 'templates' && (
        <div className="space-y-3">
          <div className="retro-box-amber rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-amber-300">官方認證運動員・名人專屬課表</h3>
            </div>
            {CELEBRITY_SHOWCASES.map((celeb) => (
              <div
                key={celeb.id}
                className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
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
                    className="retro-btn px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shrink-0"
                  >
                    一鍵帶入課表
                  </button>
                </div>
                <p className="text-xs text-slate-400">{celeb.routineTemplate.descZh}</p>
              </div>
            ))}
          </div>

          <div className="retro-box rounded-xl p-3.5 space-y-2.5">
            <h3 className="text-sm font-black text-white">經典分化課表模板 (推 / 拉 / 腿)</h3>
            {WORKOUT_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      {tpl.tagZh}
                    </span>
                    <h4 className="text-sm font-black text-white mt-1">{tpl.nameZh}</h4>
                  </div>
                  <button
                    onClick={() => {
                      store.loadWorkoutTemplate(tpl);
                      setSubMode('logger');
                    }}
                    className="retro-btn px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs shrink-0"
                  >
                    載入課表
                  </button>
                </div>
                <p className="text-xs text-slate-400">{tpl.descZh}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SUB-MODE C: 3-SECOND EXPRESS LOG ================= */}
      {subMode === 'quick3s' && (
        <div className="retro-box rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black text-white">事後 3 秒極速補登（零摩擦保連勝）</h3>
              <p className="text-xs text-slate-400">
                運動當下沒帶手機？一鍵選擇今日完成的部位，立即完成結算與領取金幣！
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {[
              { title: '🔥 上肢推日 (胸/肩/三頭 45分鐘)', vol: 4500, group: 'chest' as const },
              { title: '🦅 背部拉日 (引體/划船/二頭 45分鐘)', vol: 4800, group: 'back' as const },
              { title: '♿ 硬派腿日 (深蹲/腿推 50分鐘)', vol: 6200, group: 'legs' as const },
              { title: '🏃 燃脂有氧與核心訓練 (30分鐘)', vol: 3000, group: 'core' as const },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => store.quickLog3SecWorkout(item.title, item.vol, item.group)}
                className="retro-btn p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-between text-left"
              >
                <div>
                  <div className="text-xs font-black text-white">{item.title}</div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                    預估容量 {item.vol.toLocaleString()} kg · 消耗 50⚡
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                  一鍵打卡 ➔
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
