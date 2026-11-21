/**
 * 即時重訓暫停、休息與有效性三條件計算引擎 (T4-D2)
 *
 * 規則依據：
 * - /workspace/fitmon-tickets/T4-D2-rest-and-pauses.md
 * - /workspace/fitmon-tickets/T4-multi-sport-logging.md (計算節)
 * - /workspace/fitmon-tickets/T1-daily-checkin-economy.md (重訓判定 7 例子)
 * - /workspace/fitmon-adventure/t1-t4-auto/spec.md §0 / §3.2
 *
 * 註記：
 * - 第 2 階段由伺服器重算，不信任客戶端 (Phase 2 will recompute timing & thresholds on server)。
 * - 本模組為純函式、確定性計算，不依賴內部 Date.now()，僅使用傳入的動作組時間戳。
 */

export const PAUSE_THRESHOLD_SEC = 600; // 單次間隔 > 10 分鐘 (嚴格大於 600 秒) 視為暫停
export const MIN_INTERVAL_SEC_FOR_QUALIFIED = 20; // 有效組間隔門檻 ≥ 20 秒
export const MIN_REST_SHARE_FOR_VALIDITY = 0.25; // 休息佔比下限 ≥ 25% (不設上限)
export const MIN_SET_COUNT_FOR_VALIDITY = 2; // 最少組數 ≥ 2 組

export interface EvaluatedSet {
  startedAt?: number | null;
  completedAt?: number | null;
  restTimerElapsedSec?: number | null;
  timingIncomplete?: boolean | null;
}

export interface EvaluateStrengthSessionTimingOptions {
  sportType?: string | null;
  activeSessionSportType?: string | null;
  loggingMode?: string | null;
}

export interface PauseSegment {
  startedAt: number; // 毫秒時間戳 (上一組 completedAt)
  endedAt: number; // 毫秒時間戳 (下一組 startedAt)
}

export interface StrengthSessionTimingConditions {
  atLeastTwoSets: boolean;
  halfIntervalsAtLeast20s: boolean;
  restShareAtLeast25: boolean;
}

export interface StrengthSessionTimingResult {
  timingIncomplete: boolean;
  totalDurationSec?: number;
  restSec?: number;
  restShare?: number;
  pauseSegments: PauseSegment[];
  appliesThreeConditions: boolean; // true 僅限 strength/bodyweight 即時記錄
  conditions?: StrengthSessionTimingConditions;
  passed: boolean | null; // null 若 timingIncomplete 或三條件不適用
}

/**
 * 將動作組依據時間順序 (startedAt 遞增，若相同則以 completedAt 遞增) 排序。
 * 缺少 startedAt 之動作組仍保留在陣列中，以供後續完整性驗證檢測。
 */
export function sortSetsChronologically(
  sets: Array<EvaluatedSet>
): Array<EvaluatedSet> {
  return [...sets].sort((a, b) => {
    const aStartValid =
      typeof a?.startedAt === 'number' && Number.isFinite(a.startedAt);
    const bStartValid =
      typeof b?.startedAt === 'number' && Number.isFinite(b.startedAt);

    if (aStartValid && bStartValid) {
      if (a.startedAt !== b.startedAt) {
        return (a.startedAt as number) - (b.startedAt as number);
      }
    } else if (aStartValid && !bStartValid) {
      return -1;
    } else if (!aStartValid && bStartValid) {
      return 1;
    }

    const aCompValid =
      typeof a?.completedAt === 'number' && Number.isFinite(a.completedAt);
    const bCompValid =
      typeof b?.completedAt === 'number' && Number.isFinite(b.completedAt);

    if (aCompValid && bCompValid) {
      if (a.completedAt !== b.completedAt) {
        return (a.completedAt as number) - (b.completedAt as number);
      }
    } else if (aCompValid && !bCompValid) {
      return -1;
    } else if (!aCompValid && bCompValid) {
      return 1;
    }

    return 0;
  });
}

/**
 * 評估重訓／徒手動作訓練的計時、暫停扣除、休息佔比與有效性三條件。
 *
 * 支援傳入扁平的 sets 陣列，或具備 exerciseLogs / sessionSets 結構之訓練紀錄物件。
 */
export function evaluateStrengthSessionTiming(
  setsOrSession:
    | Array<EvaluatedSet>
    | {
        exerciseLogs?: Array<{ sets?: Array<EvaluatedSet> }>;
        sessionSets?: Array<EvaluatedSet>;
        sets?: Array<EvaluatedSet>;
        sportType?: string | null;
        activeSessionSportType?: string | null;
        loggingMode?: string | null;
      },
  options?: EvaluateStrengthSessionTimingOptions
): StrengthSessionTimingResult {
  // 1. 萃取 sets 與選項 (支援 session-level activeSessionSportType)
  let sets: Array<EvaluatedSet>;
  let sportType: string;
  let loggingMode: string;

  if (Array.isArray(setsOrSession)) {
    sets = setsOrSession;
    sportType = options?.activeSessionSportType ?? options?.sportType ?? 'strength';
    loggingMode = options?.loggingMode ?? 'live_focus';
  } else if (setsOrSession && typeof setsOrSession === 'object') {
    if (Array.isArray(setsOrSession.sessionSets)) {
      sets = setsOrSession.sessionSets;
    } else if (Array.isArray(setsOrSession.sets)) {
      sets = setsOrSession.sets;
    } else if (Array.isArray(setsOrSession.exerciseLogs)) {
      sets = sortSetsChronologically(
        setsOrSession.exerciseLogs.flatMap((log) => log?.sets || [])
      );
    } else {
      sets = [];
    }
    sportType =
      options?.activeSessionSportType ??
      options?.sportType ??
      setsOrSession.activeSessionSportType ??
      setsOrSession.sportType ??
      'strength';
    loggingMode = options?.loggingMode ?? setsOrSession.loggingMode ?? 'live_focus';
  } else {
    sets = [];
    sportType = options?.activeSessionSportType ?? options?.sportType ?? 'strength';
    loggingMode = options?.loggingMode ?? 'live_focus';
  }

  // 三條件僅適用於即時記錄的重訓 (strength) 與徒手 (bodyweight)
  // 循環訓練／HIIT (circuit_hiit) 或有氧 (run, cycle 等) 不走重訓三條件
  // 事後補記 (after_the_fact) 若缺每組時間亦不套本三條件 (由 T4-D9 備援門檻處理)
  const appliesThreeConditions =
    (sportType === 'strength' || sportType === 'bodyweight') &&
    loggingMode !== 'after_the_fact';

  // 2. 驗證動作組計時完整性
  if (!Array.isArray(sets) || sets.length === 0) {
    return {
      timingIncomplete: true,
      pauseSegments: [],
      appliesThreeConditions,
      passed: null,
    };
  }

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    if (!s || typeof s !== 'object') {
      return {
        timingIncomplete: true,
        pauseSegments: [],
        appliesThreeConditions,
        passed: null,
      };
    }

    if (s.timingIncomplete === true) {
      return {
        timingIncomplete: true,
        pauseSegments: [],
        appliesThreeConditions,
        passed: null,
      };
    }

    if (
      typeof s.startedAt !== 'number' ||
      !Number.isFinite(s.startedAt) ||
      s.startedAt <= 0
    ) {
      return {
        timingIncomplete: true,
        pauseSegments: [],
        appliesThreeConditions,
        passed: null,
      };
    }

    if (
      typeof s.completedAt !== 'number' ||
      !Number.isFinite(s.completedAt) ||
      s.completedAt < s.startedAt
    ) {
      return {
        timingIncomplete: true,
        pauseSegments: [],
        appliesThreeConditions,
        passed: null,
      };
    }

    // 非最後一組必須具備合理的下組開始時間與實際休息秒數
    if (i < sets.length - 1) {
      const nextSet = sets[i + 1];
      if (
        !nextSet ||
        typeof nextSet.startedAt !== 'number' ||
        !Number.isFinite(nextSet.startedAt) ||
        nextSet.startedAt < s.completedAt
      ) {
        return {
          timingIncomplete: true,
          pauseSegments: [],
          appliesThreeConditions,
          passed: null,
        };
      }

      if (
        typeof s.restTimerElapsedSec !== 'number' ||
        !Number.isFinite(s.restTimerElapsedSec) ||
        s.restTimerElapsedSec < 0
      ) {
        return {
          timingIncomplete: true,
          pauseSegments: [],
          appliesThreeConditions,
          passed: null,
        };
      }
    }
  }

  // 3. 識別暫停段落、累積實際休息秒數與有效組間隔
  const pauseSegments: PauseSegment[] = [];
  let totalPauseMs = 0;
  let restSec = 0;
  let qualifiedIntervalCount = 0;
  const intervalCount = sets.length - 1;

  for (let i = 0; i < intervalCount; i++) {
    const s = sets[i];
    const nextSet = sets[i + 1];
    const completedAt = s.completedAt as number;
    const nextStartedAt = nextSet.startedAt as number;
    const gapMs = nextStartedAt - completedAt;
    const gapSec = gapMs / 1000;

    // 單次間隔 > 10 分鐘 (嚴格大於 600 秒) 視為暫停
    if (gapSec > PAUSE_THRESHOLD_SEC) {
      pauseSegments.push({
        startedAt: completedAt,
        endedAt: nextStartedAt,
      });
      totalPauseMs += gapMs;
      // 暫停段不加進休息，該組的 restTimerElapsedSec 亦不加進 restSec (整段均為暫停，如等器材 15 分鐘)
    } else {
      // 正常組間隔：計入該組記錄的實際休息計時
      restSec += Math.max(0, s.restTimerElapsedSec as number);
    }

    // 組間隔 ≥ 20 秒判定
    if (gapSec >= MIN_INTERVAL_SEC_FOR_QUALIFIED) {
      qualifiedIntervalCount++;
    }
  }

  // 4. 計算總時長 (第一組 startedAt 到最後一組 completedAt 扣除所有暫停段)
  const firstStartedAt = sets[0].startedAt as number;
  const lastCompletedAt = sets[sets.length - 1].completedAt as number;
  const rawDurationMs = lastCompletedAt - firstStartedAt;
  const netDurationMs = Math.max(0, rawDurationMs - totalPauseMs);
  const totalDurationSec = Math.max(0, Math.round(netDurationMs / 1000));

  // 5. 計算休息佔比 (僅在計時完整且總時長 > 0 時計算；只設下限，不設上限)
  const restShare =
    totalDurationSec > 0 ? restSec / totalDurationSec : undefined;

  // 6. 三條件判定
  if (!appliesThreeConditions) {
    return {
      timingIncomplete: false,
      totalDurationSec,
      restSec,
      restShare,
      pauseSegments,
      appliesThreeConditions: false,
      passed: null,
    };
  }

  // 條件 1：≥ 2 組
  const atLeastTwoSets = sets.length >= MIN_SET_COUNT_FOR_VALIDITY;

  // 條件 2：至少一半組間隔 ≥ 20 秒 (qualifiedCount >= intervalCount / 2 浮點判定)
  const halfIntervalsAtLeast20s =
    intervalCount > 0 && qualifiedIntervalCount >= intervalCount / 2;

  // 條件 3：休息佔比 ≥ 25% (容許微小浮點精度誤差)
  const restShareAtLeast25 =
    typeof restShare === 'number' &&
    (restShare >= MIN_REST_SHARE_FOR_VALIDITY ||
      Math.abs(restShare - MIN_REST_SHARE_FOR_VALIDITY) < 1e-9);

  const passed = Boolean(
    atLeastTwoSets && halfIntervalsAtLeast20s && restShareAtLeast25
  );

  return {
    timingIncomplete: false,
    totalDurationSec,
    restSec,
    restShare,
    pauseSegments,
    appliesThreeConditions: true,
    conditions: {
      atLeastTwoSets,
      halfIntervalsAtLeast20s,
      restShareAtLeast25,
    },
    passed,
  };
}
