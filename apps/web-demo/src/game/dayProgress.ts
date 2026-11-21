/**
 * FitMon 當天未達門檻累加計算引擎 (T4-D5)
 *
 * 規則依據：
 * - /workspace/fitmon-tickets/T4-D5-progress-and-accumulation.md
 * - /workspace/fitmon-tickets/T1-daily-checkin-economy.md「有效運動紀錄規則」
 * - /workspace/fitmon-tickets/T4-multi-sport-logging.md (類型表)
 * - /workspace/fitmon-adventure/t1-t4-auto/spec.md §3.2 與 §5 progress 規格
 * - /workspace/fitmon-adventure/t1-t4-auto/copy-for-coach.md 第 55–59 條
 *
 * 註記：
 * - 判定與累加均為純函式，不在內部呼叫 Date.now()，由呼叫端傳入 now。
 * - 第 2 階段由伺服器以同一組鍵重算，不信任客戶端。
 * - 本單不發放任何金幣或經驗值獎勵 (T1-D2 才發獎)。
 */

import {
  type DayProgressConfig,
  resolveDayProgressConfig,
} from '../config/dayProgress.ts';
import { getLocalDayKey } from './day.ts';
import {
  type WorkoutSessionSportType,
  mapLegacyExerciseToSportType,
} from './workoutRecord.ts';
import {
  type ImplausibleCapsConfig,
} from '../config/implausibleCaps.ts';
import {
  evaluateImplausibleSession,
  type FlagReason,
} from './implausibleCapsEvaluator.ts';
import {
  evaluateStrengthSessionTiming,
  sortSetsChronologically,
  type EvaluatedSet,
} from './strengthSessionTiming.ts';

export interface DayProgressAltDistance {
  sportType: WorkoutSessionSportType;
  remaining_m: number;
  remainingM?: number;
}

export interface DayProgressStrengthHint {
  sets_done: number;
  sets_needed: number;
  rest_rule_unmet: boolean;
  setsDone?: number;
  setsNeeded?: number;
  restRuleUnmet?: boolean;
}

export interface DayProgressRecordSummary {
  id: string;
  sportType: WorkoutSessionSportType;
  durationSec: number;
  distanceM?: number;
  sets?: number;
  countsTowardCheckin: boolean;
  flagReason: FlagReason | null;
}

export interface DayProgressResult {
  /** 當天累加的有效分鐘數（已扣暫停、已排除不合理數據） */
  minutes_done: number;
  /** 當天所需分鐘門檻（預設 10，可覆寫） */
  minutes_needed: number;
  /** 當天累加的有效秒數 */
  seconds_done: number;
  /** 未達分鐘門檻時還差幾秒；達標為 0 */
  remaining_sec: number;
  /** 還差的分鐘，無條件進位到整數（給「再 X 分鐘就算數」）；達標為 0 */
  remaining_minutes_ceil: number;
  /** 替代距離門檻提示；只在當天最近一筆有效紀錄是有距離的類型時提供 */
  alt_distance: DayProgressAltDistance | null;
  /** 重訓／徒手提示（當天有重訓／徒手時提供） */
  strength_hint: DayProgressStrengthHint | null;
  /** 當天是否已達打卡門檻（本單只回傳，不發獎） */
  met: boolean;
  /** 當天各筆紀錄摘要 */
  records: DayProgressRecordSummary[];
  /** 主要剩餘提示（達標時為 null） */
  primary_hint: string | null;

  // 駝峰別名（相容不同呼叫端與測試）
  minutesDone: number;
  minutesNeeded: number;
  secondsDone: number;
  remainingSec: number;
  remainingMinutesCeil: number;
  altDistance: DayProgressAltDistance | null;
  strengthHint: DayProgressStrengthHint | null;
  primaryHint: string | null;
}

export interface DayProgressSessionInput {
  id?: string;
  timestamp?: number;
  daysAgo?: number;
  dateLabel?: string;
  sportType?: WorkoutSessionSportType | string;
  source?: 'in_app' | 'health_app' | string;
  loggingMode?: 'live_focus' | 'after_the_fact' | 'health_app' | string;
  durationMinutes?: number;
  durationSec?: number;
  totalDurationSec?: number;
  distanceM?: number;
  workoutElapsedSeconds?: number;
  totalSets?: number;
  timingIncomplete?: boolean;
  pauseSegments?: { startedAt: number; endedAt: number }[];
  sessionSets?: Array<EvaluatedSet & { distanceM?: number; durationSec?: number; weightKg?: number; reps?: number }>;
  sets?: Array<EvaluatedSet & { distanceM?: number; durationSec?: number; weightKg?: number; reps?: number }>;
  exerciseLogs?: Array<{
    exerciseId?: string;
    exerciseNameZh?: string;
    unitLabel?: string;
    sets: Array<EvaluatedSet & { distanceM?: number; durationSec?: number; weightKg?: number; reps?: number }>;
  }>;
}

export interface AccumulateDayProgressOptions {
  dayKey?: string;
  now?: number | Date;
  caps?: Partial<ImplausibleCapsConfig>;
  thresholds?: Partial<DayProgressConfig>;
  other?: Record<string, unknown>;
}

/**
 * 取得單筆運動紀錄之當地日期鍵 (YYYY-MM-DD)。
 * 優先使用 timestamp，若無則依據 daysAgo／dateLabel 與基準時間推算。
 * 純函式，不呼叫 Date.now()。
 */
export function getSessionDayKey(
  session: { timestamp?: number; daysAgo?: number; dateLabel?: string },
  idx = 0,
  now?: number | Date
): string {
  if (
    typeof session?.timestamp === 'number' &&
    Number.isFinite(session.timestamp) &&
    session.timestamp > 0
  ) {
    return getLocalDayKey(session.timestamp);
  }

  const baseDate =
    now !== undefined
      ? typeof now === 'number'
        ? new Date(now)
        : new Date(now.getTime())
      : new Date(0);

  const dAgo =
    typeof session?.daysAgo === 'number'
      ? session.daysAgo
      : session?.dateLabel?.includes('今日') || session?.dateLabel?.includes('剛剛')
      ? 0
      : session?.dateLabel?.includes('昨天')
      ? 1
      : idx + 1;

  const d = new Date(baseDate.getTime());
  d.setDate(baseDate.getDate() - dAgo);
  return getLocalDayKey(d);
}

/**
 * 解析運動紀錄之有效時長 (秒)。
 * 依據 Rule 3：
 * 時長一律優先用暫停扣除後的 totalDurationSec（T4-D2 evaluateStrengthSessionTiming 已算的或可重算的）。
 * 缺 totalDurationSec 再退 durationSec／durationMinutes。
 */
export function resolveSessionDurationSec(
  session: DayProgressSessionInput,
  sportType: WorkoutSessionSportType
): number {
  if (typeof session.totalDurationSec === 'number' && Number.isFinite(session.totalDurationSec)) {
    return session.totalDurationSec;
  }
  const isStrength = sportType === 'strength' || sportType === 'bodyweight';
  const sets =
    session.sets ||
    session.sessionSets ||
    (session.exerciseLogs ? session.exerciseLogs.flatMap((l) => l.sets || []) : []);
  if ((isStrength || sets.length > 0) && sets.some((st) => typeof st?.startedAt === 'number')) {
    const timing = evaluateStrengthSessionTiming(session as any);
    if (typeof timing.totalDurationSec === 'number' && Number.isFinite(timing.totalDurationSec)) {
      return timing.totalDurationSec;
    }
  }
  if (typeof session.durationSec === 'number' && Number.isFinite(session.durationSec)) {
    let dur = session.durationSec;
    if (session.pauseSegments) {
      const pauseDeductions = session.pauseSegments.reduce((sum, p) => {
        const diffMs = p.endedAt - p.startedAt;
        return diffMs > 600000 ? sum + Math.round(diffMs / 1000) : sum;
      }, 0);
      dur = Math.max(0, dur - pauseDeductions);
    }
    return dur;
  }
  if (typeof session.durationMinutes === 'number' && Number.isFinite(session.durationMinutes)) {
    return session.durationMinutes * 60;
  }
  if (typeof session.workoutElapsedSeconds === 'number' && Number.isFinite(session.workoutElapsedSeconds)) {
    return session.workoutElapsedSeconds;
  }
  return 0;
}

/**
 * 格式化副提示之距離字串 (例如「再快走 0.6 公里也可以」)。
 */
export function formatAltDistanceHint(alt: DayProgressAltDistance): string {
  const sportNames: Record<string, string> = {
    walk: '快走',
    run: '跑步',
    cycle: '單車',
    swim: '游泳',
  };
  const name = sportNames[alt.sportType] || alt.sportType;
  if (alt.sportType === 'swim') {
    return `再${name} ${alt.remaining_m} 公尺也可以`;
  }
  const km = Math.round((alt.remaining_m / 1000) * 10) / 10;
  return `再${name} ${km} 公里也可以`;
}

/**
 * 當天未達門檻累加計算純函式 (accumulateDayProgress)
 */
export function accumulateDayProgress(
  sessions: Array<DayProgressSessionInput | Record<string, any>>,
  options?: AccumulateDayProgressOptions
): DayProgressResult {
  const thresholds = resolveDayProgressConfig(options?.thresholds);
  const now = options?.now;

  // 1. 決定目標 dayKey
  const targetDayKey =
    options?.dayKey || (now !== undefined ? getLocalDayKey(now) : getLocalDayKey(new Date(0)));

  // 2. 篩選 targetDayKey 當天之紀錄 (Rule 1)
  const sessionList = Array.isArray(sessions) ? sessions : [];
  const daySessions: DayProgressSessionInput[] = [];

  for (let i = 0; i < sessionList.length; i++) {
    const s = sessionList[i];
    if (!s) continue;
    if (getSessionDayKey(s, i, now) === targetDayKey) {
      daySessions.push(s);
    }
  }

  // 3. 逐筆依據 T4-D6 判定是否合理 (Rule 2)
  const records: DayProgressRecordSummary[] = [];
  const validDaySessions: DayProgressSessionInput[] = [];

  for (let i = 0; i < daySessions.length; i++) {
    const s = daySessions[i];
    // 解析運動類型
    const sportType: WorkoutSessionSportType =
      (s.sportType as WorkoutSessionSportType) ||
      mapLegacyExerciseToSportType(
        s.exerciseLogs?.[0]?.exerciseId,
        s.exerciseLogs?.[0]?.unitLabel
      );

    // 解析時長 (秒) - 優先使用 pause-deducted totalDurationSec
    const rawSec = resolveSessionDurationSec(s, sportType);

    const evalResult = evaluateImplausibleSession(
      {
        ...s,
        sportType,
        totalDurationSec: rawSec,
      } as any,
      {
        caps: options?.caps,
        otherDaySessions: daySessions as any,
        now,
      }
    );

    // 解析組數
    const sets =
      s.sets ||
      s.sessionSets ||
      (s.exerciseLogs ? s.exerciseLogs.flatMap((l) => l.sets || []) : []);
    const setsCount = sets.length > 0 ? sets.length : s.totalSets || 0;

    // 解析距離 (公尺)
    let rawDistM = 0;
    if (typeof s.distanceM === 'number' && Number.isFinite(s.distanceM)) {
      rawDistM = s.distanceM;
    } else if (sets.length > 0) {
      rawDistM = sets.reduce((acc, st) => {
        const dm = typeof st.distanceM === 'number' && Number.isFinite(st.distanceM) ? st.distanceM : 0;
        return acc + dm;
      }, 0);
    }

    records.push({
      id: s.id || `session_${i}`,
      sportType,
      durationSec: rawSec,
      distanceM: rawDistM > 0 ? rawDistM : undefined,
      sets: setsCount > 0 ? setsCount : undefined,
      countsTowardCheckin: evalResult.countsTowardCheckin,
      flagReason: evalResult.flagReason,
    });

    if (evalResult.countsTowardCheckin) {
      validDaySessions.push(s);
    }
  }

  // 4. 有效紀錄累加
  let seconds_done = 0;
  const distanceBySport: Record<string, number> = {
    run: 0,
    walk: 0,
    swim: 0,
    cycle: 0,
  };

  let totalStrengthSets = 0;
  let liveStrengthPassed = false;
  let afterTheFactFallbackMet = false;
  let strengthRestRuleUnmet = false;
  let hasAnyStrengthToday = false;

  const allLiveStrengthSets: EvaluatedSet[] = [];

  for (const s of validDaySessions) {
    const sportType: WorkoutSessionSportType =
      (s.sportType as WorkoutSessionSportType) ||
      mapLegacyExerciseToSportType(
        s.exerciseLogs?.[0]?.exerciseId,
        s.exerciseLogs?.[0]?.unitLabel
      );

    const isStrength = sportType === 'strength' || sportType === 'bodyweight';
    const sets =
      s.sets ||
      s.sessionSets ||
      (s.exerciseLogs ? s.exerciseLogs.flatMap((l) => l.sets || []) : []);
    const setsCount = sets.length > 0 ? sets.length : s.totalSets || 0;

    if (isStrength) {
      hasAnyStrengthToday = true;
      totalStrengthSets += setsCount;

      const isAfterTheFactIncomplete =
        s.loggingMode === 'after_the_fact' &&
        (s.timingIncomplete === true ||
          sets.length === 0 ||
          sets.some((st) => typeof st.startedAt !== 'number'));

      if (isAfterTheFactIncomplete) {
        // Rule 4: 補記且 timingIncomplete 才用「組數 × strengthSetToMinutes」
        const backfillMinutes = setsCount * thresholds.strengthSetToMinutes;
        const backfillSec = backfillMinutes * 60;
        seconds_done += backfillSec;

        // 補記備援門檻：總時長 ≥ 10 分鐘且 ≥ 2 組 (Rule 7)
        const recordedSec =
          typeof s.totalDurationSec === 'number'
            ? s.totalDurationSec
            : typeof s.durationSec === 'number'
            ? s.durationSec
            : backfillSec;
        if (
          setsCount >= thresholds.strengthMinSets &&
          (recordedSec >= thresholds.minMinutes * 60 || backfillMinutes >= thresholds.minMinutes)
        ) {
          afterTheFactFallbackMet = true;
        }
      } else {
        // 即時重訓或具備每組時間之重訓 (Rule 3 & 7)
        const timingResult = evaluateStrengthSessionTiming(s as any);

        // 收集即時重訓組以供跨訓練合併重算
        if (sets.length > 0) {
          for (const st of sets) {
            allLiveStrengthSets.push(st as EvaluatedSet);
          }
        }

        // 時長優先順序：totalDurationSec (扣暫停) -> durationSec -> durationMinutes * 60
        const sessionSec = resolveSessionDurationSec(s, sportType);

        if (timingResult.passed === true) {
          liveStrengthPassed = true;
          seconds_done += sessionSec;
        }
        // 未通過三條件之即時重訓：時長不加入 seconds_done (Rule 7)
      }
    } else {
      // 非重訓類型 (run, walk, swim, cycle, yoga_stretch, ball, circuit_hiit, custom)
      const sessionSec = resolveSessionDurationSec(s, sportType);
      seconds_done += sessionSec;

      // 累加該運動距離
      let distM = 0;
      if (typeof s.distanceM === 'number' && Number.isFinite(s.distanceM)) {
        distM = s.distanceM;
      } else if (sets.length > 0) {
        distM = sets.reduce((acc, st) => {
          const dm = typeof st.distanceM === 'number' && Number.isFinite(st.distanceM) ? st.distanceM : 0;
          return acc + dm;
        }, 0);
      }
      if (distM > 0 && distanceBySport[sportType] !== undefined) {
        distanceBySport[sportType] += distM;
      }
    }
  }

  // 若單次即時重訓尚未達標，嘗試以當天所有即時重訓組合併重算 (Rule 7)
  if (!liveStrengthPassed && allLiveStrengthSets.length > 0) {
    const sortedSets = sortSetsChronologically(allLiveStrengthSets);
    const combinedTiming = evaluateStrengthSessionTiming(sortedSets, {
      sportType: 'strength',
      loggingMode: 'live_focus',
    });

    if (combinedTiming.passed === true) {
      liveStrengthPassed = true;
      if (typeof combinedTiming.totalDurationSec === 'number') {
        seconds_done += combinedTiming.totalDurationSec;
      }
    } else {
      // 組數夠 (≥ strengthMinSets) 但未通過三條件
      if (totalStrengthSets >= thresholds.strengthMinSets) {
        strengthRestRuleUnmet = true;
      }
    }
  }

  // 5. 門檻判定 (Rule 5, 6, 7, 8, 9)
  const minutesMet = seconds_done >= thresholds.minMinutes * 60;
  const runMet = distanceBySport.run >= thresholds.runWalkMinKm * 1000;
  const walkMet = distanceBySport.walk >= thresholds.runWalkMinKm * 1000;
  const swimMet = distanceBySport.swim >= thresholds.swimMinM;
  const cycleMet = distanceBySport.cycle >= thresholds.cycleMinKm * 1000;
  const strengthMet = liveStrengthPassed || afterTheFactFallbackMet;

  const met = minutesMet || runMet || walkMet || swimMet || cycleMet || strengthMet;

  // 6. 計算剩餘數值
  const minutes_done = Math.floor(seconds_done / 60);
  const minutes_needed = thresholds.minMinutes;
  const remaining_sec = met ? 0 : Math.max(0, thresholds.minMinutes * 60 - seconds_done);
  const remaining_minutes_ceil = met ? 0 : Math.ceil(remaining_sec / 60);

  // 7. 替代距離門檻提示 (alt_distance)
  // 只在當天最近一筆有效紀錄是有距離的類型（run／walk／cycle／swim）時提供
  let alt_distance: DayProgressAltDistance | null = null;
  if (validDaySessions.length > 0) {
    // 找出時間最近之一筆有效紀錄
    const sortedValidSessions = [...validDaySessions].sort((a, b) => {
      const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
      const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
      return aTime - bTime;
    });
    const latestValidSession = sortedValidSessions[sortedValidSessions.length - 1];
    const latestSport =
      (latestValidSession.sportType as WorkoutSessionSportType) ||
      mapLegacyExerciseToSportType(
        latestValidSession.exerciseLogs?.[0]?.exerciseId,
        latestValidSession.exerciseLogs?.[0]?.unitLabel
      );

    if (
      latestSport === 'run' ||
      latestSport === 'walk' ||
      latestSport === 'cycle' ||
      latestSport === 'swim'
    ) {
      let targetM = 0;
      if (latestSport === 'run' || latestSport === 'walk') {
        targetM = thresholds.runWalkMinKm * 1000;
      } else if (latestSport === 'swim') {
        targetM = thresholds.swimMinM;
      } else if (latestSport === 'cycle') {
        targetM = thresholds.cycleMinKm * 1000;
      }

      const doneM = distanceBySport[latestSport] || 0;
      const remM = Math.max(0, targetM - doneM);
      alt_distance = {
        sportType: latestSport,
        remaining_m: remM,
        remainingM: remM,
      };
    }
  }

  // 8. 重訓提示 (strength_hint)
  let strength_hint: DayProgressStrengthHint | null = null;
  if (hasAnyStrengthToday) {
    strength_hint = {
      sets_done: totalStrengthSets,
      sets_needed: thresholds.strengthMinSets,
      rest_rule_unmet: Boolean(strengthRestRuleUnmet),
      setsDone: totalStrengthSets,
      setsNeeded: thresholds.strengthMinSets,
      restRuleUnmet: Boolean(strengthRestRuleUnmet),
    };
  }

  // 9. 主要剩餘提示優先順序 (spec §3.2)
  let primary_hint: string | null = null;
  if (!met) {
    // 判斷當天最新紀錄是否為重訓／徒手，或當天只有重訓／徒手
    let latestIsStrength = false;
    if (daySessions.length > 0) {
      const sortedAllDay = [...daySessions].sort((a, b) => {
        const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
        const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
        return aTime - bTime;
      });
      const lastSession = sortedAllDay[sortedAllDay.length - 1];
      const lastSport =
        lastSession.sportType ||
        mapLegacyExerciseToSportType(
          lastSession.exerciseLogs?.[0]?.exerciseId,
          lastSession.exerciseLogs?.[0]?.unitLabel
        );
      latestIsStrength = lastSport === 'strength' || lastSport === 'bodyweight';
    }

    if (strength_hint !== null && latestIsStrength) {
      if (strength_hint.sets_done < strength_hint.sets_needed) {
        primary_hint = `再 ${strength_hint.sets_needed - strength_hint.sets_done} 組就算數`;
      } else if (strength_hint.rest_rule_unmet) {
        primary_hint =
          '組和組之間休息一下再按下一組，休息也是訓練的一部分，這次就會算數';
      } else {
        primary_hint = `再 ${remaining_minutes_ceil} 分鐘就算數`;
      }
    } else {
      primary_hint = `再 ${remaining_minutes_ceil} 分鐘就算數`;
    }
  }

  return {
    minutes_done,
    minutes_needed,
    seconds_done,
    remaining_sec,
    remaining_minutes_ceil,
    alt_distance,
    strength_hint,
    met,
    records,
    primary_hint,

    // 駝峰別名
    minutesDone: minutes_done,
    minutesNeeded: minutes_needed,
    secondsDone: seconds_done,
    remainingSec: remaining_sec,
    remainingMinutesCeil: remaining_minutes_ceil,
    altDistance: alt_distance,
    strengthHint: strength_hint,
    primaryHint: primary_hint,
  };
}
