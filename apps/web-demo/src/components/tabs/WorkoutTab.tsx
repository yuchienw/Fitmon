import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell,
  Flame,
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
  ROUTINE_TAG_OPTIONS,
  RoutineTagZh,
  normalizeRoutineTag,
  SportType,
  WorkoutTemplate,
} from '../../config/catalogConfig';
import { ExerciseThumbnail } from '../../game/ExerciseThumbnail';
import { AvatarPortraitCanvas } from '../../game/AvatarPortraitCanvas';
import {
  evaluateImplausibleSession,
  type ImplausibleEvaluationResult,
} from '../../game/implausibleCapsEvaluator';
import {
  mapLegacyExerciseToSportType,
  type WorkoutSessionSportType,
} from '../../game/workoutRecord';
import { evaluateStrengthSessionTiming } from '../../game/strengthSessionTiming';
import { ImplausibleSheet } from '../modals/ImplausibleSheet';
import { WalkToRunSheet } from '../modals/WalkToRunSheet';
import { SportTypePicker } from '../workout/SportTypePicker';
import { SportSetupView } from '../workout/SportSetupView';
import { SportLiveLogger } from '../workout/SportLiveLogger';

type RoutineCategoryTab = 'favorite' | 'my_custom' | 'referenced' | 'recommended';

export const WorkoutTab: React.FC = () => {
  const store = useGameStore();
  const [routineTab, setRoutineTab] = useState<RoutineCategoryTab>('favorite');
  const [routineTagFilter, setRoutineTagFilter] = useState<'all' | RoutineTagZh>('all');
  const [detailRoutine, setDetailRoutine] = useState<WorkoutTemplate | null>(null);

  // Routine Builder Modal state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineTag, setNewRoutineTag] = useState<RoutineTagZh>('臀腿訓練');
  const [builderSportFilter, setBuilderSportFilter] = useState<'all' | SportType>('all');
  const [builderSearch, setBuilderSearch] = useState('');
  const [builderItems, setBuilderItems] = useState<RoutineExerciseConfig[]>([
    { exerciseId: 'barbell_squat', sets: 4, reps: 8, weightKg: 80, restSeconds: 120 },
  ]);

  // Mid-workout Swap / Add Exercise Modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapSportFilter, setSwapSportFilter] = useState<'all' | SportType>('all');
  const [swapSearch, setSwapSearch] = useState('');

  // Focus mode derived & UI states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [implausibleSheetState, setImplausibleSheetState] = useState<{
    isOpen: boolean;
    evaluation: ImplausibleEvaluationResult | null;
    sessionSummary?: {
      durationMinutes?: number;
      distanceKm?: number;
      weightKg?: number;
      reps?: number;
      totalSets?: number;
      sportType?: string;
    };
  }>({ isOpen: false, evaluation: null });
  const [walkToRunSheetState, setWalkToRunSheetState] = useState<{
    isOpen: boolean;
    evaluation: ImplausibleEvaluationResult | null;
  }>({ isOpen: false, evaluation: null });
  const [restMenuOpen, setRestMenuOpen] = useState(false);
  const [showGoldFlash, setShowGoldFlash] = useState(false);
  const [isCardInputFocused, setIsCardInputFocused] = useState(false);
  const [floatingPlusOnes, setFloatingPlusOnes] = useState<{ id: number }[]>([]);
  const wasSkippedRef = useRef<boolean>(false);
  const prevRestRunningRef = useRef<boolean>(store.isRestRunning);
  const initialRestSecRef = useRef<number>(store.currentRestConfigSec || 60);
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus-mode card input layout & scroll management
  const focusedCardInputRef = useRef<HTMLInputElement | null>(null);
  const currentSetRowRef = useRef<HTMLDivElement | null>(null);
  const weightInputRef = useRef<HTMLInputElement | null>(null);
  const repsInputRef = useRef<HTMLInputElement | null>(null);
  const scrollTimeoutsRef = useRef<number[]>([]);
  const scrollRafRef = useRef<number | null>(null);

  const clearScrollTimeouts = () => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    scrollTimeoutsRef.current.forEach((id) => clearTimeout(id));
    scrollTimeoutsRef.current = [];
  };

  const scrollCurrentSetIntoView = () => {
    if (isCardInputFocused) return;

    const row =
      currentSetRowRef.current ||
      document.querySelector<HTMLElement>('[data-testid="focus-current-set-row"]');
    if (!row || !row.isConnected) return;

    const main = document.querySelector('main');
    if (!main || !main.contains(row)) return;

    if (typeof window !== 'undefined' && (window.scrollX !== 0 || window.scrollY !== 0)) {
      window.scrollTo(0, 0);
    }

    const stickyBar = main.querySelector<HTMLElement>('[data-testid="focus-sticky-top-bar"]');
    const actionArea = main.querySelector<HTMLElement>('[data-testid="focus-action-area"]');

    const mainRect = main.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const stickyBarRect = stickyBar ? stickyBar.getBoundingClientRect() : null;
    const actionAreaRect = actionArea ? actionArea.getBoundingClientRect() : null;

    const topLimit = stickyBarRect ? stickyBarRect.bottom + 8 : mainRect.top + 68;
    const bottomLimit = actionAreaRect ? actionAreaRect.top - 8 : mainRect.bottom - 120;

    if (rowRect.bottom > bottomLimit) {
      const delta = rowRect.bottom - bottomLimit;
      main.scrollTop += delta;
    } else if (rowRect.top < topLimit) {
      const delta = rowRect.top - topLimit;
      main.scrollTop += delta;
    }
  };

  const scrollFocusedCardInputIntoView = (targetInput?: HTMLElement | null) => {
    const target =
      targetInput ||
      focusedCardInputRef.current ||
      (document.activeElement instanceof HTMLInputElement ? document.activeElement : null);

    if (!target || !target.isConnected) return;

    const main = document.querySelector('main');
    if (!main || !main.contains(target)) return;

    // Keep window/document pinned to (0, 0)
    if (typeof window !== 'undefined' && (window.scrollX !== 0 || window.scrollY !== 0)) {
      window.scrollTo(0, 0);
    }

    const stickyBar = (main.querySelector('[data-testid="focus-sticky-top-bar"]') ||
      main.querySelector('.sticky.top-0')) as HTMLElement | null;

    const mainRect = main.getBoundingClientRect();
    const inputRect = target.getBoundingClientRect();
    const stickyBarRect = stickyBar ? stickyBar.getBoundingClientRect() : null;

    // Top boundary: sticky focus top bar bottom (or mainRect.top + ~72px)
    const topLimit = stickyBarRect ? stickyBarRect.bottom : mainRect.top + 72;

    // Bottom boundary: top of BottomNav or main bottom
    const nav = document.querySelector('nav');
    const navRect = nav ? nav.getBoundingClientRect() : null;
    const bottomLimit = navRect ? Math.min(mainRect.bottom, navRect.top) : mainRect.bottom;

    const visibleHeight = bottomLimit - topLimit;
    if (visibleHeight > 0) {
      const targetCenter = (topLimit + bottomLimit) / 2;
      const currentCenter = inputRect.top + inputRect.height / 2;
      const delta = currentCenter - targetCenter;

      if (Math.abs(delta) > 1) {
        main.scrollTop += delta;
      }
    }

    if (typeof window !== 'undefined' && (window.scrollX !== 0 || window.scrollY !== 0)) {
      window.scrollTo(0, 0);
    }
  };

  const scheduleScroll = (target?: HTMLElement | null) => {
    clearScrollTimeouts();
    const rafId = requestAnimationFrame(() => {
      scrollFocusedCardInputIntoView(target);
    });
    scrollRafRef.current = rafId;

    const t1 = window.setTimeout(() => scrollFocusedCardInputIntoView(target), 50);
    const t2 = window.setTimeout(() => scrollFocusedCardInputIntoView(target), 150);
    const t3 = window.setTimeout(() => scrollFocusedCardInputIntoView(target), 400);
    scrollTimeoutsRef.current.push(t1, t2, t3);
  };

  // Scroll into view & handle resize events when card input is focused
  useEffect(() => {
    if (!isCardInputFocused) return;

    const handleResize = () => {
      scrollFocusedCardInputIntoView();
      requestAnimationFrame(() => {
        scrollFocusedCardInputIntoView();
      });
    };

    scheduleScroll();

    window.addEventListener('resize', handleResize);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleResize);
    }

    return () => {
      clearScrollTimeouts();
      window.removeEventListener('resize', handleResize);
      if (vv) {
        vv.removeEventListener('resize', handleResize);
      }
    };
  }, [isCardInputFocused]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearScrollTimeouts();
    };
  }, []);

  const handleCardInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    focusedCardInputRef.current = e.currentTarget;
    setIsCardInputFocused(true);
    scheduleScroll(e.currentTarget);
  };

  const handleCardInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && (related === weightInputRef.current || related === repsInputRef.current)) {
      return;
    }
    if (focusedCardInputRef.current === e.currentTarget) {
      focusedCardInputRef.current = null;
    }
    setIsCardInputFocused(false);
    clearScrollTimeouts();
    setTimeout(() => {
      scrollCurrentSetIntoView();
    }, 50);
  };

  // Measure sticky focus top bar height for CSS variable
  useEffect(() => {
    if (!store.isWorkoutFocusActive) return;
    const updateBarHeight = () => {
      const bar = document.querySelector<HTMLElement>('[data-testid="focus-sticky-top-bar"]');
      if (bar) {
        document.documentElement.style.setProperty('--focus-sticky-bar-height', `${bar.offsetHeight}px`);
      }
    };
    updateBarHeight();
    window.addEventListener('resize', updateBarHeight);
    return () => {
      window.removeEventListener('resize', updateBarHeight);
      document.documentElement.style.removeProperty('--focus-sticky-bar-height');
    };
  }, [store.isWorkoutFocusActive]);

  // Scroll current set row fully into view on entry or exercise switch
  useEffect(() => {
    if (!store.isWorkoutFocusActive) return;

    const runScroll = () => {
      scrollCurrentSetIntoView();
    };

    const rafId = requestAnimationFrame(runScroll);
    const t1 = window.setTimeout(runScroll, 50);
    const t2 = window.setTimeout(runScroll, 150);
    const t3 = window.setTimeout(runScroll, 300);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [store.isWorkoutFocusActive, store.selectedExerciseId, store.selectedQueueItemId]);

  useEffect(() => {
    if (!store.isWorkoutFocusActive) return;
    const handleResize = () => {
      if (!isCardInputFocused) {
        scrollCurrentSetIntoView();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [store.isWorkoutFocusActive, isCardInputFocused]);

  // Monitor rest transition for natural end flash & vibration
  useEffect(() => {
    if (!prevRestRunningRef.current && store.isRestRunning) {
      wasSkippedRef.current = false;
      setShowGoldFlash(false);
      initialRestSecRef.current = Math.max(store.restSecondsLeft, store.currentRestConfigSec || 60);
    } else if (prevRestRunningRef.current && !store.isRestRunning) {
      if (!wasSkippedRef.current) {
        setShowGoldFlash(true);
        try {
          navigator.vibrate?.([100, 50, 100]);
        } catch (_) {}
      } else {
        wasSkippedRef.current = false;
      }
    }
    prevRestRunningRef.current = store.isRestRunning;
  }, [store.isRestRunning, store.restSecondsLeft, store.currentRestConfigSec]);

  // Auto-dismiss gold flash after 1500ms
  useEffect(() => {
    if (!showGoldFlash) return;
    const timer = setTimeout(() => {
      setShowGoldFlash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [showGoldFlash]);

  // Keep restMenuOpen closed on Escape key
  useEffect(() => {
    if (!restMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRestMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restMenuOpen]);

  // Focus cancel continue button when confirm dialog opens
  useEffect(() => {
    if (showCancelConfirm) {
      const focusBtn = () => continueBtnRef.current?.focus();
      focusBtn();
      const t1 = setTimeout(focusBtn, 50);
      const t2 = setTimeout(focusBtn, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [showCancelConfirm]);

  const handlePlus30 = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = store.restSecondsLeft + 30;
    initialRestSecRef.current = Math.max(initialRestSecRef.current, next);
    store.setRestTimer(next);
  };

  const handleSkipRest = (e: React.MouseEvent) => {
    e.stopPropagation();
    wasSkippedRef.current = true;
    store.setRestTimer(0);
  };

  const handleLogWorkoutSet = () => {
    if (store.isRestRunning) {
      wasSkippedRef.current = true;
    }
    store.logWorkoutSet();
    const id = Date.now();
    setFloatingPlusOnes((prev) => [...prev, { id }]);
    setTimeout(() => {
      setFloatingPlusOnes((prev) => prev.filter((p) => p.id !== id));
    }, 800);
  };

  const handleCancelWorkout = () => {
    if (store.sessionSets.length === 0) {
      store.discardWorkoutSession();
    } else {
      setShowCancelConfirm(true);
    }
  };

  const handleSettleWorkout = () => {
    if (store.sessionSets.length === 0) {
      store.showToast('請至少完成 1 組動作再結算');
      return;
    }

    const sessionSportType: WorkoutSessionSportType =
      store.activeSessionSportType ||
      mapLegacyExerciseToSportType(
        store.sessionSets[0]?.exerciseId,
        store.sessionSets[0]?.unitLabel
      );

    const timingResult = evaluateStrengthSessionTiming(store.sessionSets, {
      sportType: sessionSportType,
      activeSessionSportType: sessionSportType,
      loggingMode: 'live_focus',
    });

    const computedTotalDurationSec =
      !timingResult.timingIncomplete && typeof timingResult.totalDurationSec === 'number'
        ? timingResult.totalDurationSec
        : Math.max(0, store.workoutElapsedSeconds);

    const totalDistanceM = store.sessionSets.reduce((acc, s) => acc + (s.distanceM || 0), 0);
    const totalDurationSecFromSets = store.sessionSets.reduce(
      (acc, s) => acc + (s.durationSec || 0),
      0
    );

    const evaluation = evaluateImplausibleSession(
      {
        sportType: sessionSportType,
        totalDurationSec: computedTotalDurationSec,
        durationSec: totalDurationSecFromSets > 0 ? totalDurationSecFromSets : computedTotalDurationSec,
        distanceM: totalDistanceM,
        sets: store.sessionSets,
        totalSets: store.sessionSets.length,
        timestamp: Date.now(),
      },
      {
        otherDaySessions: store.workoutHistory,
      }
    );

    if (evaluation.flagReason !== null) {
      const maxWeight = Math.max(...store.sessionSets.map((s) => s.weightKg || 0));
      const maxReps = Math.max(...store.sessionSets.map((s) => s.reps || 0));
      setImplausibleSheetState({
        isOpen: true,
        evaluation,
        sessionSummary: {
          durationMinutes: Math.max(1, Math.round(computedTotalDurationSec / 60)),
          distanceKm: totalDistanceM > 0 ? Math.round((totalDistanceM / 1000) * 10) / 10 : undefined,
          weightKg: maxWeight > 0 ? maxWeight : undefined,
          reps: maxReps > 0 ? maxReps : undefined,
          totalSets: store.sessionSets.length,
          sportType: sessionSportType,
        },
      });
      return;
    }

    if (evaluation.suggestSportType === 'run') {
      setWalkToRunSheetState({
        isOpen: true,
        evaluation,
      });
      return;
    }

    store.finishWorkoutSession();
  };

  const handleEditImplausible = () => {
    setImplausibleSheetState({ isOpen: false, evaluation: null });
  };

  const handleSaveAnywayImplausible = () => {
    setImplausibleSheetState({ isOpen: false, evaluation: null });
    store.finishWorkoutSession();
  };

  const handleChangeToRun = () => {
    setWalkToRunSheetState({ isOpen: false, evaluation: null });
    store.showToast('已改成跑步，這筆照樣算數');
    store.finishWorkoutSession({ sportTypeOverride: 'run' });
  };

  const handleKeepWalk = () => {
    setWalkToRunSheetState({ isOpen: false, evaluation: null });
    store.finishWorkoutSession();
  };

  const evaluationSheets = (
    <>
      {/* T4-D6: Implausible and Walk-to-Run Sheets */}
      <ImplausibleSheet
        isOpen={implausibleSheetState.isOpen}
        evaluation={implausibleSheetState.evaluation}
        sessionSummary={implausibleSheetState.sessionSummary}
        onEdit={handleEditImplausible}
        onSaveAnyway={handleSaveAnywayImplausible}
      />

      <WalkToRunSheet
        isOpen={walkToRunSheetState.isOpen}
        evaluation={walkToRunSheetState.evaluation}
        onChangeToRun={handleChangeToRun}
        onKeepWalk={handleKeepWalk}
      />
    </>
  );

  const selectedExercise: ExerciseItem =
    EXERCISE_LIBRARY.find((e) => e.id === store.selectedExerciseId) || EXERCISE_LIBRARY[0];

  const currentPR = store.personalRecords[selectedExercise.id] || 0;

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered routines for current tab + tag filter
  const getTagDisplay = (tagZh?: string, routineId?: string) => {
    const normalized = normalizeRoutineTag(tagZh, routineId);
    return (
      ROUTINE_TAG_OPTIONS.find((t) => t.id === normalized) || {
        id: normalized,
        label: normalized,
      }
    );
  };

  const matchesTagFilter = (r: WorkoutTemplate) =>
    routineTagFilter === 'all' || normalizeRoutineTag(r.tagZh, r.id) === routineTagFilter;

  const filteredRoutines = store.savedRoutines.filter(
    (r) => r.category === routineTab && matchesTagFilter(r)
  );

  const otherTabMatchedRoutines =
    routineTagFilter !== 'all' && filteredRoutines.length === 0
      ? store.savedRoutines.filter((r) => r.category !== routineTab && matchesTagFilter(r))
      : [];

  const handleCreateCustomRoutine = (startImmediately: boolean) => {
    if (builderItems.length === 0) {
      store.showToast('請至少加入 1 個動作！');
      return;
    }
    const created: WorkoutTemplate = {
      id: `custom_${Date.now()}`,
      nameZh: newRoutineName.trim() || `我的${newRoutineTag}課表`,
      nameEn: 'Custom Workout Routine',
      category: 'my_custom',
      authorName: store.nickname,
      tagZh: newRoutineTag,
      exercises: builderItems,
    };
    store.saveCustomRoutine(created);
    setBuilderOpen(false);
    setNewRoutineName('');
    setRoutineTagFilter('all');
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
    const progressPct = Math.min(
      100,
      Math.max(
        0,
        (store.restSecondsLeft / (initialRestSecRef.current || store.currentRestConfigSec || 60)) * 100
      )
    );
    const isLast10 = store.restSecondsLeft <= 10;

    return (
      <div className="flex-none min-h-full flex flex-col justify-between relative bg-[#171412]">
        {/* 1. FOCUS TOP BAR (Sticky at top) */}
        <div
          data-testid="focus-sticky-top-bar"
          className="sticky top-0 z-20 shrink-0 p-3 bg-slate-900/95 border-b border-emerald-500/40 backdrop-blur-md flex items-center justify-between gap-2 shadow-md"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                訓練中 · {formatMMSS(store.workoutElapsedSeconds)}
              </span>
            </div>
            <h2 className="text-sm font-black text-white break-words leading-snug mt-0.5">
              📋 {store.activeTemplateName || '自由訓練'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="focus-cancel"
              onClick={handleCancelWorkout}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSettleWorkout}
              disabled={store.sessionSets.length === 0}
              className={`retro-btn px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition ${
                store.sessionSets.length > 0
                  ? 'bg-amber-400 text-slate-950 shadow-md active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>結算 · {store.sessionSets.length}組</span>
            </button>
          </div>
        </div>

        {/* Scrollable Middle Content */}
        <div
          className="flex-1 shrink-0 p-3.5 space-y-3.5"
          style={{ paddingBottom: 'calc(112px + var(--safe-bottom, 0px) + 1.5rem)' }}
        >
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
                  const isCurrent = store.selectedQueueItemId
                    ? store.selectedQueueItemId === q.id
                    : store.selectedExerciseId === q.exerciseId && qIdx === 0;
                  const isDone = q.completedSets >= q.targetSets;
                  return (
                    <button
                      key={q.id || `${q.exerciseId}_${qIdx}`}
                      onClick={() => store.selectQueueItem(q.id)}
                      className={`p-2 rounded-xl border text-left shrink-0 flex items-center gap-2 transition ${
                        isDone
                          ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                          : isCurrent
                          ? 'bg-cyan-950/80 border-cyan-400 text-white ring-1 ring-cyan-400/50 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <ExerciseThumbnail exercise={ex} size={34} />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black whitespace-nowrap">{ex.nameZh}</span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            #{qIdx + 1}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-300">
                          {q.completedSets}/{q.targetSets}組 · {q.weightKg}{ex.unitLabel}
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

          {/* 3. CURRENT EXERCISE VISUAL CARD + DIRECT NUMBER INPUTS */}
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
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition mt-0.5 break-words leading-snug flex items-center gap-1 flex-wrap">
                    <span>{selectedExercise.nameZh}</span>
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  </h3>
                  {selectedExercise.primaryMusclesZh && (
                    <p className="text-[11px] text-slate-400 break-words leading-snug">
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
            <div
              ref={currentSetRowRef}
              data-testid="focus-current-set-row"
              className="grid grid-cols-2 gap-2.5"
            >
              {/* Weight / Distance / Intensity Input */}
              <div
                style={{ scrollMarginTop: '80px', scrollMarginBottom: '140px' }}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center"
              >
                <span className="text-xs text-slate-300 font-black mb-1">
                  {selectedExercise.unitLabel === 'kg'
                    ? '重量 kg'
                    : selectedExercise.unitLabel === 'km'
                    ? '距離 km'
                    : selectedExercise.unitLabel === '公尺'
                    ? '距離 公尺'
                    : selectedExercise.unitLabel === '秒'
                    ? '秒數 秒'
                    : selectedExercise.unitLabel === '分鐘'
                    ? '時長 分鐘'
                    : `數值 ${selectedExercise.unitLabel}`}
                </span>
                <div className="flex items-center justify-between w-full gap-1">
                  <button
                    onClick={() => {
                      const stepVal =
                        selectedExercise.unitLabel === 'km'
                          ? 0.5
                          : selectedExercise.unitLabel === '公尺'
                          ? 50
                          : selectedExercise.unitLabel === '分鐘'
                          ? 5
                          : selectedExercise.unitLabel === '秒'
                          ? 5
                          : 2.5;
                      store.setCurrentWeight(
                        Math.max(0, Number((store.currentWeightKg - stepVal).toFixed(1)))
                      );
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    ref={weightInputRef}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={store.currentWeightKg}
                    onFocus={handleCardInputFocus}
                    onBlur={handleCardInputBlur}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      store.setCurrentWeight(Number.isNaN(val) ? 0 : val);
                    }}
                    style={{ scrollMarginTop: '80px', scrollMarginBottom: '140px' }}
                    className="w-full text-center bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg py-1.5 text-xl font-black font-mono text-white outline-none"
                  />
                  <button
                    onClick={() => {
                      const stepVal =
                        selectedExercise.unitLabel === 'km'
                          ? 0.5
                          : selectedExercise.unitLabel === '公尺'
                          ? 50
                          : selectedExercise.unitLabel === '分鐘'
                          ? 5
                          : selectedExercise.unitLabel === '秒'
                          ? 5
                          : 2.5;
                      store.setCurrentWeight(
                        Number((store.currentWeightKg + stepVal).toFixed(1))
                      );
                    }}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reps / Minutes Input */}
              <div
                style={{ scrollMarginTop: '80px', scrollMarginBottom: '140px' }}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center"
              >
                <span className="text-xs text-slate-300 font-black mb-1">
                  {['cardio', 'run', 'cycle', 'swim'].includes(selectedExercise.sportType)
                    ? '趟數 / 組數'
                    : '次數 Reps'}
                </span>
                <div className="flex items-center justify-between w-full gap-1">
                  <button
                    onClick={() => store.setCurrentReps(Math.max(1, store.currentReps - 1))}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    ref={repsInputRef}
                    type="number"
                    inputMode="numeric"
                    value={store.currentReps}
                    onFocus={handleCardInputFocus}
                    onBlur={handleCardInputBlur}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      store.setCurrentReps(Number.isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    style={{ scrollMarginTop: '80px', scrollMarginBottom: '140px' }}
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
          </div>

          {/* 4. COMPLETED SETS LOG LIST WITH VISUAL EXERCISE THUMBNAILS */}
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
                點擊下方「完成本組」開始紀錄
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
                            <span className="font-black text-white break-words">
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
        </div>

        {/* 5. PINNED BOTTOM ACTION AREA (Total height 112px, Row 1 = 36px, Row 2 = 56px) */}
        <div
          data-testid="focus-action-area"
          style={{ display: isCardInputFocused ? 'none' : undefined }}
          className="sticky bottom-0 z-20 shrink-0 w-full h-[112px] min-h-[112px] max-h-[112px] bg-[#171412]/95 backdrop-blur-md border-t border-slate-800/80 p-2 flex flex-col justify-between box-border mt-auto select-none"
        >
          {/* Rest Menu Popover */}
          {restMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30 bg-black/40"
                onClick={() => setRestMenuOpen(false)}
              />
              <div
                role="dialog"
                aria-label="組間休息設定"
                className="absolute bottom-[116px] left-3 right-3 z-40 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                  <span>組間休息時間</span>
                  <button
                    type="button"
                    onClick={() => setRestMenuOpen(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  {[60, 90, 120, 180].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        store.setCurrentRestConfigSec(sec);
                        setRestMenuOpen(false);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                        store.currentRestConfigSec === sec
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
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
                    className="w-14 text-center bg-slate-950 border border-slate-700 rounded-lg py-1.5 text-xs font-mono font-black text-cyan-300 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </>
          )}

          {/* Row 1: Rest Row (36px) */}
          <div
            data-testid="focus-rest-row"
            className="h-[36px] min-h-[36px] max-h-[36px] w-full relative"
          >
            {showGoldFlash ? (
              <div
                style={{ backgroundColor: '#FBBF24' }}
                className="w-full h-full rounded-xl text-slate-950 font-black text-xs flex items-center justify-center shadow-md animate-pulse border border-amber-300"
              >
                休息好了！下一組 💪
              </div>
            ) : store.isRestRunning ? (
              <div
                className={`w-full h-full rounded-xl border relative overflow-hidden flex items-center justify-between px-2.5 transition-colors ${
                  isLast10
                    ? 'bg-orange-950/40 border-orange-500/50'
                    : 'bg-cyan-950/40 border-cyan-500/40'
                }`}
              >
                {/* Draining progress bar */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-300 pointer-events-none rounded-xl"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: isLast10 ? 'rgba(249, 115, 22, 0.45)' : 'rgba(6, 182, 212, 0.35)',
                  }}
                />

                {/* Left: 休息中 MM:SS */}
                <div
                  className={`relative z-10 text-xs font-mono font-bold flex items-center gap-1.5 ${
                    isLast10 ? 'text-amber-300' : 'text-cyan-300'
                  }`}
                >
                  <Timer className={`w-3.5 h-3.5 ${isLast10 ? 'text-amber-400 animate-pulse' : 'text-cyan-400 animate-spin'}`} />
                  <span>休息中 {formatMMSS(store.restSecondsLeft)}</span>
                </div>

                {/* Right: +30s and 跳過 pills */}
                <div className="relative z-10 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePlus30}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95 transition"
                  >
                    +30s
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipRest}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95 transition"
                  >
                    跳過
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRestMenuOpen((v) => !v)}
                className="w-full h-full rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition select-none"
              >
                <span>⏱ 組間休息 {store.currentRestConfigSec}s ▾</span>
              </button>
            )}
          </div>

          {/* Row 2: Main Log Set Button (56px) */}
          <button
            type="button"
            data-testid="focus-log-set"
            onClick={handleLogWorkoutSet}
            className="h-[56px] min-h-[56px] max-h-[56px] w-full retro-btn rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.96] transition-transform relative select-none"
          >
            <Check className="w-5 h-5 stroke-[3px]" />
            <span>
              完成本組 · {store.currentWeightKg}
              {selectedExercise.unitLabel} × {store.currentReps}
            </span>
            {floatingPlusOnes.map((item) => (
              <span
                key={item.id}
                style={{
                  animation: 'adv-float 0.8s ease-out forwards',
                  left: '50%',
                }}
                className="absolute -top-3 pointer-events-none text-xs font-black text-emerald-300 bg-emerald-950/95 border border-emerald-400/80 px-2 py-0.5 rounded-full shadow-xl"
              >
                +1 組
              </span>
            ))}
          </button>
        </div>

        {/* 6. CANCEL CONFIRM MODAL (Card 320 wide, radius 20, cream with wood frame, 64px chibi hero with 😅) */}
        {showCancelConfirm && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCancelConfirm(false);
              }
            }}
          >
            <div
              data-testid="focus-cancel-dialog"
              style={{
                background: 'linear-gradient(180deg, #FFFDF8 0%, #F5E6C8 100%)',
                borderColor: '#8B5A2B',
                boxShadow: '0 6px 0 #5C3A21, 0 16px 32px rgba(0,0,0,0.3)',
              }}
              className="relative w-[320px] max-w-[90vw] rounded-[20px] border-2 p-5 text-[#29221E] flex flex-col items-center text-center space-y-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 64px Chibi hero with sweat 😅 */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <AvatarPortraitCanvas
                  bodyStage={store.bodyStage}
                  equipped={store.equipped}
                  size={64}
                />
                <span className="absolute -top-1.5 -right-1.5 text-xl select-none filter drop-shadow">
                  😅
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-black text-[#29221E]">
                要取消這次訓練嗎？
              </h3>

              {/* Body */}
              <p className="text-xs font-bold text-[#786B63] leading-relaxed">
                已完成的 {store.sessionSets.length} 組紀錄會刪除，不會拿到經驗值；已經拿到的遊戲幣會保留。
              </p>

              {/* Buttons: top to bottom */}
              <div className="w-full space-y-2 pt-1">
                {/* 1. 繼續訓練 (Green primary, autoFocus) */}
                <button
                  ref={continueBtnRef}
                  type="button"
                  data-testid="focus-cancel-continue"
                  autoFocus
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md active:scale-95 transition"
                >
                  繼續訓練
                </button>

                {/* 2. 先結算這 {n} 組 (Gold outline) */}
                <button
                  type="button"
                  data-testid="focus-cancel-settle"
                  onClick={() => {
                    setShowCancelConfirm(false);
                    handleSettleWorkout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 font-black text-sm active:scale-95 transition"
                >
                  先結算這 {store.sessionSets.length} 組
                </button>

                {/* 3. 取消並刪除紀錄 (Red text button, no solid red) */}
                <button
                  type="button"
                  data-testid="focus-cancel-delete"
                  onClick={() => {
                    setShowCancelConfirm(false);
                    store.discardWorkoutSession();
                  }}
                  className="w-full py-2 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50/60 font-bold text-xs rounded-lg active:scale-95 transition"
                >
                  取消並刪除紀錄
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(
                  [
                    { id: 'all', label: '全部' },
                    { id: 'strength', label: '🏋️ 重訓' },
                    { id: 'bodyweight', label: '🤸 徒手' },
                    { id: 'run', label: '🏃 跑步' },
                    { id: 'walk', label: '🚶 快走' },
                    { id: 'cycle', label: '🚴 單車' },
                    { id: 'swim', label: '🏊 游泳' },
                    { id: 'yoga_stretch', label: '🧘 瑜珈' },
                    { id: 'ball', label: '⚽ 球類' },
                    { id: 'circuit_hiit', label: '⚡ 循環HIIT' },
                    { id: 'custom', label: '🎯 自訂' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSwapSportFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 whitespace-nowrap ${
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
                        <div className="text-xs font-black text-white break-words">{ex.nameZh}</div>
                        <div className="text-[10px] text-slate-400">
                          {ex.muscleLabelZh} · {ex.defaultWeightKg}
                          {ex.unitLabel} × {ex.defaultReps}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          store.swapActiveExercise(selectedExercise.id, ex.id, store.selectedQueueItemId || undefined);
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

        {/* T4-D6: Implausible and Walk-to-Run Sheets in Focus Mode */}
        {evaluationSheets}
      </div>
    );
  }

  if (store.workoutSubView === 'setup' && store.activeSportSession) {
    return (
      <SportSetupView
        sportType={store.activeSportSession.sportType}
        onBack={() => store.setWorkoutSubView('picker')}
        onStartLive={(draft) => {
          store.setActiveSportSession(draft);
          store.setWorkoutSubView('live');
        }}
        onDirectInput={(draft) => {
          store.setActiveSportSession(draft);
          store.setWorkoutSubView('finish');
        }}
      />
    );
  }

  if (store.workoutSubView === 'live' && store.activeSportSession) {
    return (
      <SportLiveLogger
        draft={store.activeSportSession}
        onFinish={(completedDraft) => {
          store.setActiveSportSession(completedDraft);
          store.setWorkoutSubView('finish');
        }}
      />
    );
  }

  if (store.workoutSubView === 'picker') {
    return <SportTypePicker />;
  }

  // ============================================================================
  // MODE B: DEFAULT ROUTINE HUB (課表管理中心 V2-14, V2-15, V2-17)
  // ============================================================================
  return (
    <div data-testid="strength-plan-root" className="p-3.5 space-y-3.5 pb-10">
      {/* 0. Top Bar to switch back to SportTypePicker */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => store.setWorkoutSubView('picker')}
          className="flex items-center gap-1 text-[13px] font-extrabold text-[#C2410C] hover:underline cursor-pointer"
        >
          <span>← 換類型</span>
        </button>
        <span className="text-xs font-bold text-[#786B63]">重訓課表</span>
      </div>

      {/* 1. HEADER & NEW ROUTINE / FREE WORKOUT CTAs */}
      <div className="retro-box rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            運動課表
          </h2>
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
          const count = store.savedRoutines.filter(
            (r) => r.category === tab.id && matchesTagFilter(r)
          ).length;
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

      {/* 2B. STANDARDIZED ROUTINE TAG FILTER BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setRoutineTagFilter('all')}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black shrink-0 border transition ${
            routineTagFilter === 'all'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          🏷️ 全部標籤
        </button>
        {ROUTINE_TAG_OPTIONS.map((tagOpt) => {
          const active = routineTagFilter === tagOpt.id;
          const totalWithTag = store.savedRoutines.filter(
            (r) => normalizeRoutineTag(r.tagZh, r.id) === tagOpt.id
          ).length;
          return (
            <button
              key={tagOpt.id}
              onClick={() => setRoutineTagFilter(active ? 'all' : tagOpt.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black shrink-0 border flex items-center gap-1 transition ${
                active
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              <span>{tagOpt.label}</span>
              <span
                className={`text-[10px] font-mono ${
                  active ? 'text-slate-900 font-black' : 'text-slate-500'
                }`}
              >
                {totalWithTag}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. ROUTINE CARDS LIST */}
      <div className="space-y-3">
        {filteredRoutines.length === 0 && otherTabMatchedRoutines.length === 0 ? (
          <div className="retro-box rounded-2xl p-6 text-center space-y-2">
            <p className="text-xs font-bold text-slate-400">
              {routineTagFilter === 'all'
                ? '此分類尚無課表'
                : `目前沒有「${routineTagFilter}」標籤的課表`}
            </p>
            <div className="flex items-center justify-center gap-2">
              {routineTagFilter !== 'all' && (
                <button
                  onClick={() => setRoutineTagFilter('all')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-black border border-slate-700"
                >
                  顯示全部標籤
                </button>
              )}
              <button
                onClick={() => {
                  if (routineTagFilter !== 'all') setNewRoutineTag(routineTagFilter);
                  setBuilderOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black"
              >
                ＋ 建立課表
              </button>
            </div>
          </div>
        ) : (
          <>
            {filteredRoutines.length === 0 && otherTabMatchedRoutines.length > 0 && (
              <div className="px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-[11px] text-cyan-200">
                <span>
                  目前頁籤無「{routineTagFilter}」，已為您顯示其他分類符合的課表：
                </span>
                <button
                  onClick={() => setRoutineTagFilter('all')}
                  className="text-cyan-400 font-black underline ml-2 shrink-0"
                >
                  重置篩選
                </button>
              </div>
            )}
            {(filteredRoutines.length > 0 ? filteredRoutines : otherTabMatchedRoutines).map(
              (routine) => (
                <div
                  key={routine.id}
                  className="retro-box rounded-2xl p-3.5 space-y-3 hover:border-slate-700 transition"
                >
                  {/* Title + Author + Favorite Star */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() =>
                            setRoutineTagFilter(normalizeRoutineTag(routine.tagZh, routine.id))
                          }
                          className="px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-black transition"
                          title="點擊以此標籤篩選"
                        >
                          {getTagDisplay(routine.tagZh, routine.id).label}
                        </button>
                        {routine.authorName && (
                          <span className="text-[10px] text-cyan-300 font-bold">
                            👤 {routine.authorName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-white mt-1">{routine.nameZh}</h3>
                    </div>

                <div className="flex items-center gap-1.5 shrink-0">
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
                  <button
                    onClick={() => store.deleteRoutine(routine.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 transition"
                    title="刪除此課表"
                  >
                    <Trash2 className="w-4 h-4" />
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
                        <span className="font-bold text-white group-hover:text-cyan-300 break-words leading-snug">
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

                  {/* Action Button: Start Focus Workout */}
                  <div className="pt-1">
                    <button
                      onClick={() => store.startWorkoutFocus(routine)}
                      className="retro-btn w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>開始訓練</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* =====================================================================
          MODAL 2: ROUTINE DETAIL VIEW
         ===================================================================== */}
      {detailRoutine && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3 border-2 border-emerald-500/40 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400">
                  {getTagDisplay(detailRoutine.tagZh, detailRoutine.id).label}
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
                  const id = detailRoutine.id;
                  setDetailRoutine(null);
                  store.deleteRoutine(id);
                }}
                className="py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/50 text-rose-300 text-xs font-black flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除課表</span>
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
          MODAL 3: CREATE NEW CUSTOM ROUTINE BUILDER (Fixed Max Height + 50/50 Split + Selectable Tag)
         ===================================================================== */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="w-full max-w-md retro-box rounded-2xl p-3.5 border-2 border-cyan-500/50 h-[90vh] max-h-[90vh] flex flex-col gap-2.5 overflow-hidden">
            {/* Top Bar: Title + Close */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-cyan-300">＋ 建立課表</h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  上下對半配置 · 點選分類標籤
                </span>
              </div>
              <button
                onClick={() => setBuilderOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Routine Name + Selectable Standardized Tag Chips (shrink-0) */}
            <div className="space-y-1.5 shrink-0">
              <input
                type="text"
                value={newRoutineName}
                onChange={(e) => setNewRoutineName(e.target.value)}
                placeholder="輸入課表名稱（未填預設為「我的＋標籤課表」）"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400">
                    🏷️ 選擇課表分類標籤（作為運動菜單分類與篩選條件）
                  </span>
                  <span className="text-[10px] font-black text-emerald-300">
                    目前：{newRoutineTag}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {ROUTINE_TAG_OPTIONS.map((tagOpt) => {
                    const selected = newRoutineTag === tagOpt.id;
                    return (
                      <button
                        key={tagOpt.id}
                        type="button"
                        onClick={() => setNewRoutineTag(tagOpt.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-black border transition flex items-center justify-center gap-1 ${
                          selected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/40'
                        }`}
                      >
                        <span>{tagOpt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 50% / 50% Equal Vertical Split Workspace */}
            <div className="flex-1 min-h-0 grid grid-rows-2 gap-2.5">
              {/* TOP HALF (50%): Added Exercises Sequence */}
              <div className="min-h-0 flex flex-col rounded-xl bg-slate-950/80 border border-cyan-500/35 p-2.5">
                <div className="flex items-center justify-between shrink-0 mb-1.5">
                  <span className="text-[11px] font-black text-cyan-300">
                    📋 已安排進課表的動作 · {builderItems.length} 項
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    共 {builderItems.reduce((sum, item) => sum + item.sets, 0)} 組
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {builderItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                      <p className="text-xs font-bold">尚未安排任何動作</p>
                      <p className="text-[10px] mt-0.5">
                        請從下方動作庫點擊「＋ 加入」將項目排入課表
                      </p>
                    </div>
                  ) : (
                    builderItems.map((item, idx) => {
                      const ex =
                        EXERCISE_LIBRARY.find((e) => e.id === item.exerciseId) ||
                        EXERCISE_LIBRARY[0];
                      return (
                        <div
                          key={`${item.exerciseId}_${idx}`}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <ExerciseThumbnail exercise={ex} size={28} />
                              <span className="text-xs font-black text-white truncate">
                                {idx + 1}. {ex.nameZh}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setBuilderItems((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-1 text-slate-500 hover:text-rose-400 shrink-0"
                              title="移除此動作"
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
                                    prev.map((row, i) =>
                                      i === idx ? { ...row, weightKg: v } : row
                                    )
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
                    })
                  )}
                </div>
              </div>

              {/* BOTTOM HALF (50%): Search & Add Exercise Library */}
              <div className="min-h-0 flex flex-col rounded-xl bg-slate-950/80 border border-slate-800 p-2.5">
                <div className="flex items-center justify-between gap-1 shrink-0 mb-1.5">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {(
                      [
                        { id: 'all', label: '全部' },
                        { id: 'strength', label: '重訓' },
                        { id: 'bodyweight', label: '徒手' },
                        { id: 'run', label: '跑步' },
                        { id: 'walk', label: '快走' },
                        { id: 'cycle', label: '單車' },
                        { id: 'swim', label: '游泳' },
                        { id: 'yoga_stretch', label: '瑜珈' },
                        { id: 'ball', label: '球類' },
                        { id: 'circuit_hiit', label: '循環HIIT' },
                        { id: 'custom', label: '自訂' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setBuilderSportFilter(f.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 whitespace-nowrap ${
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
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white outline-none w-36 focus:border-cyan-400"
                  />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
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
                  }).map((ex) => {
                    const addedCount = builderItems.filter(
                      (item) => item.exerciseId === ex.id
                    ).length;
                    return (
                      <div
                        key={ex.id}
                        className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ExerciseThumbnail exercise={ex} size={30} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white break-words">
                                {ex.nameZh}
                              </span>
                              {addedCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[9px] font-black shrink-0">
                                  已排 ×{addedCount}
                                </span>
                              )}
                            </div>
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
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black shrink-0"
                        >
                          ＋ 加入
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions (shrink-0) */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
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

      {/* T4-D6: Implausible and Walk-to-Run Sheets */}
      {evaluationSheets}
    </div>
  );
};
