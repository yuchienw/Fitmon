import React, { useState } from 'react';
import {
  Dumbbell,
  Flame,
  Zap,
  Timer,
  Check,
  Trophy,
  Plus,
  Minus,
  Sparkles,
  Play,
  Star,
  Search,
  RefreshCw,
  Eye,
  X,
  FolderHeart,
  Bookmark,
  Award,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  EXERCISE_LIBRARY,
  ExerciseItem,
  RoutineExerciseConfig,
  SportType,
  WorkoutTemplate,
} from '../../config/catalogConfig';
import { ExerciseThumbnail } from '../../game/ExerciseThumbnail';

type RoutineCategoryTab = 'favorite' | 'my_custom' | 'referenced' | 'recommended';

export const WorkoutTab: React.FC = () => {
  const store = useGameStore();
  const [routineTab, setRoutineTab] = useState<RoutineCategoryTab>('favorite');
  const [detailRoutine, setDetailRoutine] = useState<WorkoutTemplate | null>(null);
  const [quickEditRoutine, setQuickEditRoutine] = useState<WorkoutTemplate | null>(null);
  const [quickEditExercises, setQuickEditExercises] = useState<RoutineExerciseConfig[]>([]);

  // Routine Builder Modal state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineTag, setNewRoutineTag] = useState('自訂課表');
  const [builderSportFilter, setBuilderSportFilter] = useState<'all' | SportType>('all');
  const [builderSearch, setBuilderSearch] = useState('');
  const [builderItems, setBuilderItems] = useState<RoutineExerciseConfig[]>([
    { exerciseId: 'barbell_squat', sets: 4, reps: 8, weightKg: 80, restSeconds: 120 },
  ]);

  // Mid-workout Swap / Add Exercise Modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapSportFilter, setSwapSportFilter] = useState<'all' | SportType>('all');
  const [swapSearch, setSwapSearch] = useState('');

  const selectedExercise: ExerciseItem =
    EXERCISE_LIBRARY.find((e) => e.id === store.selectedExerciseId) || EXERCISE_LIBRARY[0];

  const currentPR = store.personalRecords[selectedExercise.id] || 0;

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered routines for current tab
  const filteredRoutines = store.savedRoutines.filter((r) => r.category === routineTab);

  // Open Quick-Log / Modify-Before-Log modal
  const handleOpenQuickLogModal = (routine: WorkoutTemplate) => {
    setQuickEditRoutine(routine);
    setQuickEditExercises(routine.exercises.map((e) => ({ ...e })));
  };

  const handleConfirmQuickLog = () => {
    if (!quickEditRoutine) return;
    const modifiedRoutine: WorkoutTemplate = {
      ...quickEditRoutine,
      exercises: quickEditExercises,
    };
    store.quickLogSavedRoutine(modifiedRoutine);
    setQuickEditRoutine(null);
  };

  const handleCreateCustomRoutine = (startImmediately: boolean) => {
    if (builderItems.length === 0) {
      store.showToast('請至少加入 1 個動作！');
      return;
    }
    const created: WorkoutTemplate = {
      id: `custom_${Date.now()}`,
      nameZh: newRoutineName.trim() || '我的專屬訓練課表',
      nameEn: 'Custom Workout Routine',
      category: 'my_custom',
      authorName: store.nickname,
      tagZh: newRoutineTag || '自訂課表',
      exercises: builderItems,
    };
    store.saveCustomRoutine(created);
    setBuilderOpen(false);
    setNewRoutineName('');
    if (startImmediately) {
      store.startWorkoutFocus(created);
    } else {
      setRoutineTab('my_custom');
    }
  };

  // ============================================================================
  // MODE A: ACTIVE WORKOUT FOCUS MODE (專注訓練模式 V2-02, V2-06, V2-14, V2-15)
  // ============================================================================
  if (store.isWorkoutFocusActive) {
    return (
      <div className="p-3.5 space-y-3.5 pb-10">
        {/* 1. FOCUS TOP BAR */}
        <div className="retro-box rounded-2xl p-3 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-emerald-500/50 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                訓練中 · {formatMMSS(store.workoutElapsedSeconds)}
              </span>
            </div>
            <h2 className="text-sm font-black text-white truncate mt-0.5">
              📋 {store.activeTemplateName || '自由訓練'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => store.discardWorkoutSession()}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold"
            >
              退出
            </button>
            <button
              onClick={() => store.finishWorkoutSession()}
              disabled={store.sessionSets.length === 0}
              className={`retro-btn px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 ${
                store.sessionSets.length > 0
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>結算 · {store.sessionSets.length}組</span>
            </button>
          </div>
        </div>

        {/* 2. ROUTINE EXERCISE QUEUE + MID-WORKOUT ADD / SWAP */}
        {store.templateQueue.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-black text-slate-300">課表動作</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSwapModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-[11px] font-black text-cyan-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 stroke-[3px]" />
                  <span>新增 / 換動作</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {store.templateQueue.map((q, qIdx) => {
                const ex = EXERCISE_LIBRARY.find((e) => e.id === q.exerciseId);
                if (!ex) return null;
                const isCurrent = store.selectedExerciseId === q.exerciseId;
                const isDone = q.completedSets >= q.targetSets;
                return (
                  <button
                    key={`${q.exerciseId}_${qIdx}`}
                    onClick={() => store.selectExercise(q.exerciseId)}
                    className={`p-2 rounded-xl border text-left shrink-0 flex items-center gap-2 transition ${
                      isDone
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                        : isCurrent
                        ? 'bg-cyan-950/80 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ExerciseThumbnail exercise={ex} size={34} />
                    <div>
                      <div className="text-xs font-black truncate max-w-[105px]">{ex.nameZh}</div>
                      <div className="text-[10px] font-mono text-slate-300">
                        {q.completedSets}/{q.targetSets}組
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => setSwapModalOpen(true)}
                className="px-3 py-2.5 rounded-xl border border-dashed border-cyan-500/50 bg-slate-900/70 text-cyan-300 text-xs font-black shrink-0 flex items-center gap-1 hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                <span>新增</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. ACTIVE REST TIMER BANNER */}
        {store.restSecondsLeft > 0 && (
          <div className="retro-box rounded-2xl p-3 bg-cyan-950/60 border-cyan-400/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Timer className="w-5 h-5 text-cyan-400 animate-spin" />
              <div>
                <div className="text-xs font-black text-cyan-200">休息倒數</div>
                <div className="text-lg font-mono font-black text-white">
                  {formatMMSS(store.restSecondsLeft)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => store.setRestTimer(store.restSecondsLeft + 30)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-cyan-300 text-xs font-bold border border-cyan-500/30"
              >
                +30s
              </button>
              <button
                onClick={() => store.setRestTimer(0)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30"
              >
                跳過
              </button>
            </div>
          </div>
        )}

        {/* 4. CURRENT EXERCISE VISUAL CARD + DIRECT NUMBER INPUTS */}
        <div className="retro-box rounded-2xl p-3.5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => store.setInspectedExerciseId(selectedExercise.id)}
              className="flex items-center gap-3 min-w-0 cursor-pointer group"
            >
              <ExerciseThumbnail exercise={selectedExercise} size={54} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black">
                    {selectedExercise.muscleLabelZh}
                  </span>
                  {currentPR > 0 && (
                    <span className="text-[10px] font-mono text-amber-300 font-bold">
                      🏆 PR {currentPR} {selectedExercise.unitLabel}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition mt-0.5 truncate flex items-center gap-1">
                  <span>{selectedExercise.nameZh}</span>
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                </h3>
                {selectedExercise.primaryMusclesZh && (
                  <p className="text-[11px] text-slate-400 truncate">
                    🎯 {selectedExercise.primaryMusclesZh}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => store.setInspectedExerciseId(selectedExercise.id)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>說明</span>
              </button>
              <button
                onClick={() => setSwapModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-black flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>換動作</span>
              </button>
            </div>
          </div>

          {/* Direct Keyboard Input + Stepper for Weight/Distance & Reps/Duration */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Weight / Distance / Intensity Input */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
              <span className="text-xs text-slate-300 font-black mb-1">
                {selectedExercise.unitLabel === 'kg'
                  ? '重量 kg'
                  : selectedExercise.unitLabel === 'km'
                  ? '距離 km'
                  : `數值 ${selectedExercise.unitLabel}`}
              </span>
              <div className="flex items-center justify-between w-full gap-1">
                <button
                  onClick={() =>
                    store.setCurrentWeight(
                      Math.max(0, Number((store.currentWeightKg - (selectedExercise.unitLabel === 'km' ? 0.5 : 2.5)).toFixed(1)))
                    )
                  }
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={store.currentWeightKg}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    store.setCurrentWeight(Number.isNaN(val) ? 0 : val);
                  }}
                  className="w-full text-center bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg py-1.5 text-xl font-black font-mono text-white outline-none"
                />
                <button
                  onClick={() =>
                    store.setCurrentWeight(
                      Number((store.currentWeightKg + (selectedExercise.unitLabel === 'km' ? 0.5 : 2.5)).toFixed(1))
                    )
                  }
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reps / Minutes Input */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
              <span className="text-xs text-slate-300 font-black mb-1">
                {selectedExercise.sportType === 'cardio' ? '趟數 / 組數' : '次數 Reps'}
              </span>
              <div className="flex items-center justify-between w-full gap-1">
                <button
                  onClick={() => store.setCurrentReps(Math.max(1, store.currentReps - 1))}
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={store.currentReps}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    store.setCurrentReps(Number.isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  className="w-full text-center bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg py-1.5 text-xl font-black font-mono text-emerald-400 outline-none"
                />
                <button
                  onClick={() => store.setCurrentReps(store.currentReps + 1)}
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Per-Exercise Rest Timer Setting */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-bold text-slate-300">組間休息</span>
            </div>
            <div className="flex items-center gap-1">
              {[60, 90, 120, 180].map((sec) => (
                <button
                  key={sec}
                  onClick={() => store.setCurrentRestConfigSec(sec)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition ${
                    store.currentRestConfigSec === sec
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
              <input
                type="number"
                inputMode="numeric"
                value={store.currentRestConfigSec}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  store.setCurrentRestConfigSec(Number.isNaN(val) ? 60 : Math.max(10, val));
                }}
                className="w-14 text-center bg-slate-950 border border-slate-700 rounded-lg py-1 text-xs font-mono font-black text-cyan-300"
              />
            </div>
          </div>

          {/* Primary Log Set Action Button */}
          <button
            onClick={() => store.logWorkoutSet()}
            className="w-full retro-btn py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Check className="w-5 h-5 stroke-[3px]" />
            <span>
              完成本組 · {store.currentWeightKg}
              {selectedExercise.unitLabel} × {store.currentReps}
            </span>
          </button>
        </div>

        {/* 5. COMPLETED SETS LOG LIST WITH VISUAL EXERCISE THUMBNAILS */}
        <div className="retro-box rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              已完成 {store.sessionSets.length} 組
            </span>
            {store.sessionSets.length > 0 && (
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                總量{' '}
                {store.sessionSets
                  .reduce((acc, s) => acc + s.weightKg * s.reps, 0)
                  .toLocaleString()}{' '}
                kg
              </span>
            )}
          </div>

          {store.sessionSets.length === 0 ? (
            <div className="text-center py-5 text-xs text-slate-500">
              點擊上方「完成本組」開始紀錄
            </div>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {store.sessionSets.map((s, idx) => {
                const exObj =
                  EXERCISE_LIBRARY.find((e) => e.id === s.exerciseId) || EXERCISE_LIBRARY[0];
                return (
                  <div
                    key={s.id}
                    onClick={() => store.setInspectedExerciseId(exObj.id)}
                    className="px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between text-xs gap-2 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ExerciseThumbnail exercise={exObj} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="font-black text-white truncate">
                            {s.exerciseNameZh}
                          </span>
                          <span className="text-[10px] text-cyan-400 font-bold">📖</span>
                          {s.isPR && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black">
                              🏆 PR
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-300 font-bold mt-0.5">
                          {s.weightKg} {s.unitLabel} × {s.reps}次{' '}
                          <span className="text-slate-500">· 休{s.restSec}s</span>
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-amber-300 font-black shrink-0">
                      +{s.coinsEarned}🪙
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MID-WORKOUT ADD OR SWAP EXERCISE MODAL (Item 1 Fixed: Distinct 替換 vs ＋新增 buttons!) */}
        {swapModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3 border-2 border-cyan-500/40 max-h-[82vh] flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">
                    新增或替換動作
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    點「＋新增」加進今日序列，或點「替換」換掉 {selectedExercise.nameZh}
                  </p>
                </div>
                <button
                  onClick={() => setSwapModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter & Search */}
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: '全部' },
                    { id: 'strength', label: '🏋️ 重訓' },
                    { id: 'cardio', label: '🏃 有氧' },
                    { id: 'bodyweight', label: '🤸 徒手' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSwapSportFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                      swapSportFilter === t.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={swapSearch}
                  onChange={(e) => setSwapSearch(e.target.value)}
                  placeholder="搜尋動作名稱或部位..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {EXERCISE_LIBRARY.filter((ex) => {
                  if (swapSportFilter !== 'all' && ex.sportType !== swapSportFilter) return false;
                  if (
                    swapSearch.trim() &&
                    !ex.nameZh.includes(swapSearch.trim()) &&
                    !ex.muscleLabelZh.includes(swapSearch.trim())
                  ) {
                    return false;
                  }
                  return true;
                }).map((ex) => (
                  <div
                    key={ex.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ExerciseThumbnail exercise={ex} size={40} />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">{ex.nameZh}</div>
                        <div className="text-[10px] text-slate-400">
                          {ex.muscleLabelZh} · {ex.defaultWeightKg}
                          {ex.unitLabel} × {ex.defaultReps}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          store.swapActiveExercise(selectedExercise.id, ex.id);
                          setSwapModalOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-black"
                      >
                        替換
                      </button>
                      <button
                        onClick={() => {
                          store.addExerciseToActiveQueue(ex.id);
                          setSwapModalOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black"
                      >
                        ＋新增
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // MODE B: DEFAULT ROUTINE HUB (課表管理中心 V2-14, V2-15, V2-17)
  // ============================================================================
  return (
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. HEADER & NEW ROUTINE / FREE WORKOUT CTAs */}
      <div className="retro-box rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            運動課表
          </h2>
          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
            ⚡ 體力 {store.stamina}/{store.maxStamina}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setBuilderOpen(true)}
            className="retro-btn py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            <span>建立課表</span>
          </button>
          <button
            onClick={() => store.startWorkoutFocus()}
            className="retro-btn py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-black text-xs flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>自由訓練</span>
          </button>
        </div>
      </div>

      {/* 2. FOUR ROUTINE CATEGORY TABS */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {(
          [
            { id: 'favorite', label: '最愛', icon: Star },
            { id: 'my_custom', label: '我的', icon: FolderHeart },
            { id: 'referenced', label: '引用', icon: Bookmark },
            { id: 'recommended', label: '推薦', icon: Award },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = routineTab === tab.id;
          const count = store.savedRoutines.filter((r) => r.category === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setRoutineTab(tab.id)}
              className={`py-2 px-1 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. ROUTINE CARDS LIST */}
      <div className="space-y-3">
        {filteredRoutines.length === 0 ? (
          <div className="retro-box rounded-2xl p-6 text-center space-y-2">
            <p className="text-xs font-bold text-slate-400">此分類尚無課表</p>
            <button
              onClick={() => setBuilderOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black"
            >
              ＋ 建立課表
            </button>
          </div>
        ) : (
          filteredRoutines.map((routine) => (
            <div
              key={routine.id}
              className="retro-box rounded-2xl p-3.5 space-y-3 hover:border-slate-700 transition"
            >
              {/* Title + Author + Favorite Star */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                      {routine.tagZh}
                    </span>
                    {routine.authorName && (
                      <span className="text-[10px] text-cyan-300 font-bold">
                        👤 {routine.authorName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-white mt-1">{routine.nameZh}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailRoutine(routine)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    title="課表詳情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => store.toggleFavoriteRoutine(routine.id)}
                    className={`p-1.5 rounded-lg border ${
                      routine.category === 'favorite'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300'
                    }`}
                    title="最愛"
                  >
                    <Star
                      className={`w-4 h-4 ${routine.category === 'favorite' ? 'fill-amber-300' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Visual Exercise List inside Routine */}
              <div className="space-y-1.5">
                {routine.exercises.map((item, idx) => {
                  const ex = EXERCISE_LIBRARY.find((e) => e.id === item.exerciseId);
                  if (!ex) return null;
                  return (
                    <div
                      key={`${routine.id}_${item.exerciseId}_${idx}`}
                      onClick={() => store.setInspectedExerciseId(ex.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-cyan-500/40 flex items-center justify-between text-xs cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ExerciseThumbnail exercise={ex} size={32} />
                        <span className="font-bold text-white group-hover:text-cyan-300 truncate">
                          {ex.nameZh}
                        </span>
                        <BookOpen className="w-3 h-3 text-cyan-400/80 shrink-0" />
                      </div>
                      <div className="font-mono text-[11px] text-cyan-300 shrink-0">
                        {item.sets}組×{item.reps} ·{' '}
                        <span className="text-amber-300 font-bold">
                          {item.weightKg}
                          {ex.unitLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons: 3-Sec Quick Log vs Start Focus Workout */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleOpenQuickLogModal(routine)}
                  className="retro-btn py-2.5 px-3 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ 3秒速記</span>
                </button>
                <button
                  onClick={() => store.startWorkoutFocus(routine)}
                  className="retro-btn py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>開始訓練</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* =====================================================================
          MODAL 1: 3-SECOND QUICK LOG / MODIFY BEFORE LOG
         ===================================================================== */}
      {quickEditRoutine && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3.5 border-2 border-amber-400/60 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-300 uppercase">
                  ⚡ 課表速記 · 可微調數值
                </span>
                <h3 className="text-base font-black text-white">{quickEditRoutine.nameZh}</h3>
              </div>
              <button
                onClick={() => setQuickEditRoutine(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {quickEditExercises.map((cfg, idx) => {
                const ex =
                  EXERCISE_LIBRARY.find((e) => e.id === cfg.exerciseId) || EXERCISE_LIBRARY[0];
                return (
                  <div
                    key={`${cfg.exerciseId}_${idx}`}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <ExerciseThumbnail exercise={ex} size={36} />
                      <div>
                        <div className="text-xs font-black text-white">{ex.nameZh}</div>
                        <div className="text-[10px] text-slate-400">{ex.muscleLabelZh}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">組數</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={cfg.sets}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setQuickEditExercises((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, sets: val } : item))
                            );
                          }}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded-lg py-1 text-xs font-mono font-black text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">
                          重量 {ex.unitLabel}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={cfg.weightKg}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setQuickEditExercises((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, weightKg: val } : item
                              )
                            );
                          }}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded-lg py-1 text-xs font-mono font-black text-amber-300"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">次數</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={cfg.reps}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setQuickEditExercises((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, reps: val } : item))
                            );
                          }}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded-lg py-1 text-xs font-mono font-black text-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirmQuickLog}
              className="w-full retro-btn py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>確認速記</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ROUTINE DETAIL VIEW
         ===================================================================== */}
      {detailRoutine && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3 border-2 border-emerald-500/40 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400">
                  {detailRoutine.tagZh}
                </span>
                <h3 className="text-base font-black text-white">{detailRoutine.nameZh}</h3>
              </div>
              <button
                onClick={() => setDetailRoutine(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
              {detailRoutine.exercises.map((cfg, idx) => {
                const ex =
                  EXERCISE_LIBRARY.find((e) => e.id === cfg.exerciseId) || EXERCISE_LIBRARY[0];
                return (
                  <div
                    key={`${cfg.exerciseId}_${idx}`}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <ExerciseThumbnail exercise={ex} size={46} showPhotoToggle />
                        <div>
                          <div className="text-xs font-black text-white">
                            {idx + 1}. {ex.nameZh}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-300">
                            {cfg.sets}組 × {cfg.reps}次 · {cfg.weightKg} {ex.unitLabel} · 休{cfg.restSeconds}s
                          </div>
                          {ex.primaryMusclesZh && (
                            <div className="text-[10px] text-rose-400 font-bold mt-0.5">
                              🎯 {ex.primaryMusclesZh}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {ex.freeExerciseDbId && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <img
                          src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ex.freeExerciseDbId}/0.jpg`}
                          alt={`${ex.nameZh} 起始動作`}
                          className="w-full h-24 object-cover rounded-lg border border-slate-700 bg-slate-950"
                          loading="lazy"
                        />
                        <img
                          src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ex.freeExerciseDbId}/1.jpg`}
                          alt={`${ex.nameZh} 頂峰收縮`}
                          className="w-full h-24 object-cover rounded-lg border border-slate-700 bg-slate-950"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-lg space-y-0.5">
                      {ex.safetyCues.map((cue, cIdx) => (
                        <div key={cIdx}>• {cue}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const r = detailRoutine;
                  setDetailRoutine(null);
                  handleOpenQuickLogModal(r);
                }}
                className="py-2.5 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-black"
              >
                ⚡ 3秒速記
              </button>
              <button
                onClick={() => {
                  const r = detailRoutine;
                  setDetailRoutine(null);
                  store.startWorkoutFocus(r);
                }}
                className="py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black"
              >
                ▶️ 開始訓練
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: CREATE NEW CUSTOM ROUTINE BUILDER
         ===================================================================== */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3 border-2 border-cyan-500/50 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-cyan-300">
                ＋ 建立課表
              </h3>
              <button
                onClick={() => setBuilderOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Routine Name & Tag */}
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newRoutineName}
                onChange={(e) => setNewRoutineName(e.target.value)}
                placeholder="課表名稱"
                className="col-span-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={newRoutineTag}
                onChange={(e) => setNewRoutineTag(e.target.value)}
                placeholder="標籤"
                className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-emerald-300 outline-none"
              />
            </div>

            {/* Added Exercises Sequence with Direct Inputs */}
            <div className="space-y-2 overflow-y-auto max-h-48 pr-1 border-b border-slate-800 pb-2">
              <div className="text-[11px] font-black text-slate-400">
                課表動作 · {builderItems.length} 項
              </div>
              {builderItems.map((item, idx) => {
                const ex =
                  EXERCISE_LIBRARY.find((e) => e.id === item.exerciseId) || EXERCISE_LIBRARY[0];
                return (
                  <div
                    key={`${item.exerciseId}_${idx}`}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ExerciseThumbnail exercise={ex} size={30} />
                        <span className="text-xs font-black text-white">
                          {idx + 1}. {ex.nameZh}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setBuilderItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 block">組數</span>
                        <input
                          type="number"
                          value={item.sets}
                          onChange={(e) => {
                            const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setBuilderItems((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, sets: v } : row))
                            );
                          }}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">
                          重量 {ex.unitLabel}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={item.weightKg}
                          onChange={(e) => {
                            const v = Math.max(0, parseFloat(e.target.value) || 0);
                            setBuilderItems((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, weightKg: v } : row))
                            );
                          }}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono text-amber-300"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">次數</span>
                        <input
                          type="number"
                          value={item.reps}
                          onChange={(e) => {
                            const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setBuilderItems((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, reps: v } : row))
                            );
                          }}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono text-emerald-400"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">休息秒</span>
                        <input
                          type="number"
                          value={item.restSeconds}
                          onChange={(e) => {
                            const v = Math.max(10, parseInt(e.target.value, 10) || 60);
                            setBuilderItems((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, restSeconds: v } : row
                              )
                            );
                          }}
                          className="w-full text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-mono text-cyan-300"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Search & Add Exercise Library */}
            <div className="space-y-1.5 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'all', label: '全部' },
                      { id: 'strength', label: '重訓' },
                      { id: 'cardio', label: '有氧' },
                      { id: 'bodyweight', label: '徒手' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setBuilderSportFilter(f.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        builderSportFilter === f.id
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={builderSearch}
                  onChange={(e) => setBuilderSearch(e.target.value)}
                  placeholder="搜尋動作..."
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white outline-none w-36"
                />
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
                {EXERCISE_LIBRARY.filter((ex) => {
                  if (builderSportFilter !== 'all' && ex.sportType !== builderSportFilter)
                    return false;
                  if (
                    builderSearch.trim() &&
                    !ex.nameZh.includes(builderSearch.trim()) &&
                    !ex.muscleLabelZh.includes(builderSearch.trim())
                  )
                    return false;
                  return true;
                }).map((ex) => (
                  <div
                    key={ex.id}
                    className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ExerciseThumbnail exercise={ex} size={32} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{ex.nameZh}</div>
                        <div className="text-[10px] text-slate-400">
                          {ex.muscleLabelZh} · {ex.defaultWeightKg}
                          {ex.unitLabel}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setBuilderItems((prev) => [
                          ...prev,
                          {
                            exerciseId: ex.id,
                            sets: 4,
                            reps: ex.defaultReps,
                            weightKg: ex.defaultWeightKg,
                            restSeconds: ex.defaultRestSec,
                          },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black shrink-0"
                    >
                      ＋ 加入
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleCreateCustomRoutine(false)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700"
              >
                💾 儲存課表
              </button>
              <button
                onClick={() => handleCreateCustomRoutine(true)}
                className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-black"
              >
                ▶️ 儲存並開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
