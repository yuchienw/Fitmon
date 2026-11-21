import {
  calculateWorkoutExp,
  type WorkoutSetInput,
  type CalculationResult,
  type SupplementBuffs,
} from '../../../../packages/engine/src/index.ts';

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
 * 型錄動作與歷史 ID 對應運動類型查找表 (T4-D3)
 */
export const SPORT_TYPE_BY_EXERCISE_ID: Record<string, WorkoutSessionSportType> = {
  // 9 strength exercises
  barbell_squat: 'strength',
  barbell_bench_press: 'strength',
  conventional_deadlift: 'strength',
  overhead_press: 'strength',
  pull_ups: 'strength',
  barbell_row: 'strength',
  leg_press: 'strength',
  lateral_raise: 'strength',
  dumbbell_curl: 'strength',
  lat_pulldown: 'strength',

  // run
  cardio_incline_run: 'run',
  treadmill_run: 'run',

  // cycle
  cardio_hiit_bike: 'cycle',
  cycle: 'cycle',

  // bodyweight
  bw_plank_core: 'bodyweight',

  // yoga_stretch
  yoga_dynamic_flow: 'yoga_stretch',
  yoga_flow: 'yoga_stretch',
  yoga_stretch: 'yoga_stretch',

  // walk
  walk_brisk: 'walk',
  walk: 'walk',

  // swim
  swim_freestyle: 'swim',
  swim: 'swim',

  // ball
  ball_sports: 'ball',
  ball: 'ball',

  // circuit_hiit
  circuit_hiit: 'circuit_hiit',

  // custom
  custom_workout: 'custom',
  custom: 'custom',
};

/**
 * 舊項目／型錄運動類型對應純函式 (T4-D1 / T4-D3 規範)：
 * - 9 strength exercises → strength
 * - cardio_incline_run (及歷史 treadmill_run) → run
 * - cardio_hiit_bike → cycle
 * - bw_plank_core → bodyweight (維持 bodyweight)
 * - yoga_dynamic_flow → yoga_stretch
 * - walk_brisk → walk
 * - swim_freestyle → swim
 * - ball_sports → ball
 * - circuit_hiit → circuit_hiit
 * - custom_workout → custom
 * - 若 unitLabel 為 'km' 且 id 未知，推論為 run
 * - 若 unitLabel 為 '秒'，推論為 bodyweight
 * - 若 unitLabel 為 '公尺' 或 'm'，推論為 swim (絕不得誤判為 strength)
 * - 預設 strength
 */
export function mapLegacyExerciseToSportType(
  exerciseId?: string | null,
  unitLabel?: string | null
): WorkoutSessionSportType {
  const id = exerciseId ? exerciseId.trim() : '';
  const unit = unitLabel ? unitLabel.trim() : '';

  if (id && SPORT_TYPE_BY_EXERCISE_ID[id]) {
    return SPORT_TYPE_BY_EXERCISE_ID[id];
  }

  if (unit === 'km') {
    return 'run';
  }
  if (unit === '秒') {
    return 'bodyweight';
  }
  if (unit === '公尺' || unit === 'm') {
    return 'swim';
  }

  return 'strength';
}

/**
 * 裁決專注訓練模式起始時的 activeSessionSportType (T4-D3 修正)：
 * 1. 自由訓練 (no routine): 回傳 null，不強制指定為 strength。
 * 2. 由課表起始 (routine): 優先取 routine.sportType，次取課表首個動作的推論類型，並在 session 期間凍結。
 */
export function resolveInitialSessionSportType(routine?: {
  sportType?: WorkoutSessionSportType;
  exercises?: { exerciseId: string; unitLabel?: string }[];
} | null): WorkoutSessionSportType | null {
  if (!routine) return null;
  if (routine.sportType) return routine.sportType;
  const firstEx = routine.exercises?.[0];
  return mapLegacyExerciseToSportType(firstEx?.exerciseId, firstEx?.unitLabel);
}

/**
 * 裁決當切換／替換選定動作或首個隊列動作時的 activeSessionSportType (T4-D3 修正)：
 * 1. 若已經有記錄組數 (sessionSetsCount > 0)，不允許變更 (維持凍結)。
 * 2. 若為課表訓練 (isRoutineSession: true) 且原本已綁定課表類型，維持凍結，避免循環訓練內含深蹲時誤判為 strength。
 * 3. 自由訓練且尚未記錄任何組數時 (sessionSetsCount === 0)，依據替換／切換後的動作推論並更新類型。
 */
export function resolveSportTypeOnExerciseChange(
  currentSportType: WorkoutSessionSportType | null,
  newExerciseId: string,
  options: {
    sessionSetsCount: number;
    isRoutineSession?: boolean;
    unitLabel?: string | null;
  }
): WorkoutSessionSportType | null {
  if (options.sessionSetsCount > 0) {
    return currentSportType;
  }
  if (options.isRoutineSession && currentSportType !== null) {
    return currentSportType;
  }
  return mapLegacyExerciseToSportType(newExerciseId, options.unitLabel);
}

/**
 * 裁決記錄第一組動作時的 activeSessionSportType (T4-D3 修正)：
 * 1. 若 activeSessionSportType 已有值 (例如來自課表或組前替換)，維持該值並凍結。
 * 2. 若仍為 null (自由訓練且未更換動作)，以該組動作的推論類型填入並凍結。
 */
export function resolveSportTypeOnFirstSetLogged(
  currentSportType: WorkoutSessionSportType | null,
  loggedExerciseId: string,
  unitLabel?: string | null
): WorkoutSessionSportType {
  return currentSportType || mapLegacyExerciseToSportType(loggedExerciseId, unitLabel);
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
 * - 公尺 / m: distanceM = inputWeightKg, weightKg = 0 (游泳等公尺單位)
 * - 分鐘: durationSec = inputWeightKg * 60, weightKg = 0 (瑜珈、球類、HIIT等分鐘單位)
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
  if (unitLabel === '公尺' || unitLabel === 'm') {
    return {
      weightKg: 0,
      distanceM: Math.round(numericVal),
    };
  }
  if (unitLabel === '分鐘') {
    return {
      weightKg: 0,
      durationSec: Math.round(numericVal * 60),
    };
  }
  return {
    weightKg: numericVal,
  };
}

export interface SettlementSetInputSource {
  exerciseId: string;
  muscleGroup?: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
  category?: any;
  unitLabel?: string;
  weightKg?: number;
  reps: number;
  distanceM?: number;
  durationSec?: number;
}

/**
 * 純函式：將新格式動作組還原為舊版結算輸入格式 (toLegacySettlementInput - T4-D3)
 * 讀取 distanceM / durationSec (與 unitLabel)，還原過去存放在 weightKg 的數值：
 * - km: distanceM / 1000
 * - 秒: durationSec
 * - 其他: weightKg
 */
export function toLegacySettlementInput(set: SettlementSetInputSource): WorkoutSetInput {
  let reconstructedWeight = typeof set.weightKg === 'number' ? set.weightKg : 0;
  if (set.unitLabel === 'km' && typeof set.distanceM === 'number') {
    reconstructedWeight = set.distanceM / 1000;
  } else if (set.unitLabel === '秒' && typeof set.durationSec === 'number') {
    reconstructedWeight = set.durationSec;
  }

  return {
    exerciseId: set.exerciseId,
    muscleGroup: set.muscleGroup || 'core',
    category: set.category || 'isolation',
    weightKg: reconstructedWeight,
    reps: typeof set.reps === 'number' ? set.reps : 0,
  };
}

/**
 * 既有 12 項可參與結算發獎之動作 ID (包含歷史別名)
 */
export const LEGACY_EARNING_EXERCISE_IDS = new Set([
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
  'cardio_incline_run',
  'treadmill_run',
  'cardio_hiit_bike',
  'bw_plank_core',
]);

export function isLegacyEarningExercise(exerciseId?: string | null): boolean {
  if (!exerciseId) return false;
  return LEGACY_EARNING_EXERCISE_IDS.has(exerciseId.trim());
}

/**
 * 訓練結算計算純函式 (calculateWorkoutSessionSettlement - T4-D3)
 * - 對於既有 12 項動作：透過 toLegacySettlementInput 轉換後由 calculateWorkoutExp 結算，
 *   保證結算金幣、經驗值與總生容量與改版前 100% 完全相同。
 * - 對於新類型 (walk, swim, ball, circuit_hiit, custom 以及新拆分的動態流瑜珈)：
 *   // TODO: 待 T4-D3 運動容量與負荷公式定案 (Pending product capacity decision)
 *   目前為 non-earning：結算金幣 0、經驗值 0。
 *   避免因 calculateWorkoutExp 之 Math.max(1, floor(exp/10)) 誤發底限 1 金幣。
 */
export function calculateWorkoutSessionSettlement(
  sets: SettlementSetInputSource[],
  buffs: SupplementBuffs = { hasWheyProtein: true }
): CalculationResult {
  const earningSets = sets.filter((s) => isLegacyEarningExercise(s.exerciseId));

  if (earningSets.length === 0) {
    // TODO: T4-D3 運動容量公式待定案，新類型暫不發放結算金幣與經驗值 (non-earning)
    return {
      totalRawVolume: 0,
      totalExperience: 0,
      totalCoins: 0,
      isCriticalHit: false,
      setBreakdowns: [],
    };
  }

  const legacyInputs = earningSets.map(toLegacySettlementInput);
  return calculateWorkoutExp(legacyInputs, buffs);
}

export type AdventureSportSkillType = 'strength' | 'cardio' | 'bodyweight';

/**
 * 訓練類型轉換至冒險技能類型純函式 (toAdventureSportSkillType - T4-D3)
 * - strength → strength
 * - run, cycle (原 catalog cardio) → cardio (觸發有氧技)
 * - bodyweight (bw_plank_core) → bodyweight (觸發核心技)
 * - walk, swim, yoga_stretch, ball, circuit_hiit, custom → 維持當前今日冒險技能不變 (待教練/產品定案)
 */
export function toAdventureSportSkillType(
  sportType: WorkoutSessionSportType | string | null | undefined,
  currentSkillType: AdventureSportSkillType = 'cardio'
): AdventureSportSkillType {
  switch (sportType) {
    case 'strength':
      return 'strength';
    case 'run':
    case 'cycle':
    case 'cardio':
      return 'cardio';
    case 'bodyweight':
      return 'bodyweight';
    case 'walk':
    case 'swim':
    case 'yoga_stretch':
    case 'ball':
    case 'circuit_hiit':
    case 'custom':
    default:
      // 教練與產品尚未定案：保持原有的冒險技能類型不變
      return currentSkillType;
  }
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

/**
 * 動作組顯示量數值計算 (純函式)
 * 依 unitLabel 解析該組應顯示之數值：
 * - km: distanceM / 1000（數字型），否則退回 weightKg
 * - 秒: durationSec（數字型），否則退回 weightKg
 * - 分鐘: durationSec / 60（數字型），否則退回 weightKg
 * - 公尺 或 m: distanceM（數字型），否則退回 weightKg
 * - 其他（kg 等）：weightKg
 */
export function getSetDisplayAmount(
  set?: {
    weightKg?: number | null;
    distanceM?: number | null;
    durationSec?: number | null;
  } | null,
  unitLabel?: string | null
): number {
  if (!set || typeof set !== 'object') return 0;
  const unit = (unitLabel || '').trim();
  const lowerUnit = unit.toLowerCase();
  const fallbackWeight =
    typeof set.weightKg === 'number' && Number.isFinite(set.weightKg) ? set.weightKg : 0;

  if (unit === 'km' || lowerUnit === 'km') {
    if (typeof set.distanceM === 'number' && Number.isFinite(set.distanceM)) {
      return set.distanceM / 1000;
    }
    return fallbackWeight;
  }

  if (unit === '秒') {
    if (typeof set.durationSec === 'number' && Number.isFinite(set.durationSec)) {
      return set.durationSec;
    }
    return fallbackWeight;
  }

  if (unit === '分鐘') {
    if (typeof set.durationSec === 'number' && Number.isFinite(set.durationSec)) {
      return set.durationSec / 60;
    }
    return fallbackWeight;
  }

  if (unit === '公尺' || unit === 'm' || lowerUnit === 'm') {
    if (typeof set.distanceM === 'number' && Number.isFinite(set.distanceM)) {
      return set.distanceM;
    }
    return fallbackWeight;
  }

  return fallbackWeight;
}

/**
 * 格式化顯示數值純函式：
 * 去除多餘小數與浮點誤差（例如 6.5、10），保留至多 2 位小數
 */
export function formatDisplayAmount(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
  return String(rounded);
}

/**
 * 動作紀錄摘要格式化純函式 (formatExerciseLogSummary)
 * 供歷史記錄列表卡片 UI 顯示：
 * 回傳像 `1組 · 10km`、`1組 · 45秒`、`4組 · 100kg`。
 * 空組時避免 Math.max 產生 -Infinity，回傳 `0組` 或 `0組 · 0{unit}`。
 */
export function formatExerciseLogSummary(log?: {
  unitLabel?: string | null;
  sets?: Array<{
    weightKg?: number | null;
    distanceM?: number | null;
    durationSec?: number | null;
  }> | null;
} | null): string {
  const sets = Array.isArray(log?.sets) ? log.sets : [];
  const unit = (log?.unitLabel || '').trim();

  if (sets.length === 0) {
    return unit ? `0組 · 0${unit}` : '0組';
  }

  const values = sets.map((s) => getSetDisplayAmount(s, unit));
  const maxVal = Math.max(...values);
  const formattedVal = formatDisplayAmount(maxVal);

  return `${sets.length}組 · ${formattedVal}${unit}`;
}
