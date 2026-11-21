/**
 * FitMon 多種運動紀錄資料模型純函式與選擇器 (T4-D1)
 */

export type WorkoutSessionSportType =
  | 'strength'
  | 'bodyweight'
  | 'run'
  | 'walk'
  | 'swim'
  | 'cycle'
  | 'yoga_stretch'
  | 'ball'
  | 'circuit_hiit'
  | 'custom';

export const VALID_WORKOUT_SESSION_SPORT_TYPES: readonly WorkoutSessionSportType[] = [
  'strength',
  'bodyweight',
  'run',
  'walk',
  'swim',
  'cycle',
  'yoga_stretch',
  'ball',
  'circuit_hiit',
  'custom',
] as const;

/**
 * 9 項既有型錄重訓器材 ID 清單 (加舊紀錄可能之 lat_pulldown)
 */
export const STRENGTH_EXERCISE_IDS = new Set([
  'barbell_squat',
  'barbell_bench_press',
  'conventional_deadlift',
  'overhead_press',
  'pull_ups',
  'barbell_row',
  'leg_press',
  'lateral_raise',
  'dumbbell_curl',
  'lat_pulldown',
]);

/**
 * 舊項目／型錄運動類型對應純函式 (T4-D1 提案規範)：
 * - 9 strength exercises → strength
 * - cardio_incline_run (及歷史 treadmill_run) → run
 * - cardio_hiit_bike → cycle
 * - bw_plank_core → bodyweight (本單不拆分瑜珈；由 T4-D3 處理)
 * - 若 unitLabel 為 'km' 且 id 未知，推論為 run
 * - 若 unitLabel 為 '秒'，推論為 bodyweight
 * - 預設 strength
 */
export function mapLegacyExerciseToSportType(
  exerciseId?: string | null,
  unitLabel?: string | null
): WorkoutSessionSportType {
  const id = exerciseId ? exerciseId.trim() : '';
  const unit = unitLabel ? unitLabel.trim() : '';

  if (STRENGTH_EXERCISE_IDS.has(id)) {
    return 'strength';
  }
  if (id === 'cardio_incline_run' || id === 'treadmill_run') {
    return 'run';
  }
  if (id === 'cardio_hiit_bike') {
    return 'cycle';
  }
  if (id === 'bw_plank_core') {
    return 'bodyweight';
  }

  if (unit === 'km') {
    return 'run';
  }
  if (unit === '秒') {
    return 'bodyweight';
  }

  return 'strength';
}

/**
 * 檢查單組動作計時是否完整。
 * 必須具備有效 startedAt (毫秒) 與 completedAt (毫秒)，且 timingIncomplete 不為 true。
 */
export function isLoggedSetTimingComplete(set: {
  startedAt?: number | null;
  completedAt?: number | null;
  timingIncomplete?: boolean | null;
}): boolean {
  if (!set || typeof set !== 'object') return false;
  if (set.timingIncomplete === true) return false;
  if (typeof set.startedAt !== 'number' || !Number.isFinite(set.startedAt) || set.startedAt <= 0) {
    return false;
  }
  if (
    typeof set.completedAt !== 'number' ||
    !Number.isFinite(set.completedAt) ||
    set.completedAt < set.startedAt
  ) {
    return false;
  }
  return true;
}

/**
 * 檢查整次訓練紀錄計時是否完整。
 * - 舊紀錄缺 startedAt 標記為 incomplete。
 * - 需所有組皆完成 set timing。
 * - 最後一組允許不具備 trailing rest (restTimerElapsedSec)，不因最後一組無後續休息而判定整次不完整。
 * - 非最後一組若遺漏 restTimerElapsedSec 則視為不完整。
 */
export function isWorkoutSessionTimingComplete(session: {
  timingIncomplete?: boolean | null;
  exerciseLogs?: {
    sets?: {
      startedAt?: number | null;
      completedAt?: number | null;
      timingIncomplete?: boolean | null;
      restTimerElapsedSec?: number | null;
    }[];
  }[];
}): boolean {
  if (!session || typeof session !== 'object') return false;
  if (session.timingIncomplete === true) return false;
  if (!Array.isArray(session.exerciseLogs) || session.exerciseLogs.length === 0) return false;

  const allSets: {
    startedAt?: number | null;
    completedAt?: number | null;
    timingIncomplete?: boolean | null;
    restTimerElapsedSec?: number | null;
  }[] = [];

  for (const log of session.exerciseLogs) {
    if (!log || typeof log !== 'object' || !Array.isArray(log.sets)) return false;
    for (const set of log.sets) {
      if (!set || typeof set !== 'object') return false;
      allSets.push(set);
    }
  }

  if (allSets.length === 0) return false;

  for (let i = 0; i < allSets.length; i++) {
    const set = allSets[i];
    if (!isLoggedSetTimingComplete(set)) {
      return false;
    }
    // 非最後一組必須具備實際休息秒數
    if (i < allSets.length - 1) {
      if (typeof set.restTimerElapsedSec !== 'number' || !Number.isFinite(set.restTimerElapsedSec)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 純函式：計算寫入時的持久化欄位
 * - km: distanceM = inputWeightKg * 1000, weightKg = 0
 * - 秒: durationSec = inputWeightKg, weightKg = 0
 * - 其他 (如 kg): weightKg = inputWeightKg
 */
export function computePersistedSetFields(
  inputWeightKg: number,
  unitLabel: string
): {
  weightKg: number;
  distanceM?: number;
  durationSec?: number;
} {
  const numericVal = Math.max(0, Number(inputWeightKg) || 0);
  if (unitLabel === 'km') {
    return {
      weightKg: 0,
      distanceM: Math.round(numericVal * 1000),
    };
  }
  if (unitLabel === '秒') {
    return {
      weightKg: 0,
      durationSec: Math.round(numericVal),
    };
  }
  return {
    weightKg: numericVal,
  };
}

/**
 * 純函式：結算前一組的實際休息秒數與是否提早開始標記
 */
export function finalizePreviousSetRest<T extends object>(
  prevSet: T,
  restStartedAt: number | null | undefined,
  now: number,
  isCompletedNaturally: boolean
): T & { restTimerElapsedSec: number; startedEarly: boolean } {
  const startMs =
    typeof restStartedAt === 'number' && Number.isFinite(restStartedAt) ? restStartedAt : now;
  const elapsedSec = Math.max(0, Math.round((now - startMs) / 1000));
  return {
    ...prevSet,
    restTimerElapsedSec: elapsedSec,
    startedEarly: !isCompletedNaturally,
  };
}

// 選擇器 (Selectors)
export function selectIsRestDay(state: { restDayKeys?: string[] | null }, dayKey: string): boolean {
  return Array.isArray(state?.restDayKeys) && state.restDayKeys.includes(dayKey);
}

export function selectUnwellHalfUsed(
  state: { unwellHalfUsedByWeek?: Record<string, number> | null },
  weekKey: string
): number {
  if (!state?.unwellHalfUsedByWeek || typeof state.unwellHalfUsedByWeek !== 'object') {
    return 0;
  }
  const count = state.unwellHalfUsedByWeek[weekKey];
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

export function selectSelfCheckCompleted(state: { selfCheckCompletedAt?: string | null }): boolean {
  return (
    typeof state?.selfCheckCompletedAt === 'string' &&
    state.selfCheckCompletedAt.trim().length > 0
  );
}

export function selectOnboardingCompleted(state: {
  onboardingCompletedAt?: string | null;
}): boolean {
  return (
    typeof state?.onboardingCompletedAt === 'string' &&
    state.onboardingCompletedAt.trim().length > 0
  );
}

export function selectOnboardingWorkoutHintSeen(state: {
  onboardingWorkoutHintSeenAt?: string | null;
}): boolean {
  return (
    typeof state?.onboardingWorkoutHintSeenAt === 'string' &&
    state.onboardingWorkoutHintSeenAt.trim().length > 0
  );
}

export function selectOnboardingSortieHintSeen(state: {
  onboardingSortieHintSeenAt?: string | null;
}): boolean {
  return (
    typeof state?.onboardingSortieHintSeenAt === 'string' &&
    state.onboardingSortieHintSeenAt.trim().length > 0
  );
}
