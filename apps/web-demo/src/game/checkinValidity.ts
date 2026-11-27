/**
 * FitMon 有效運動判定引擎 (T1-D1)
 *
 * 規則依據：
 * - /workspace/fitmon-tickets/T1-D1-validity-engine.md
 * - /workspace/fitmon-tickets/T1-daily-checkin-economy.md「有效運動紀錄規則」
 * - /workspace/fitmon-tickets/T4-D8-unwell-half-threshold.md
 * - /workspace/fitmon-tickets/T1-S1-checkin-rpc.md（第 2 階段由伺服器重跑同一套）
 * - /workspace/fitmon-adventure/t1-t4-auto/spec.md
 *
 * 核心責任：
 * 給一筆或同一天多筆 T4 運動紀錄，回傳是否達到打卡門檻、還差多少、是否因不合理數據排除、
 * 是否適用「我不舒服」減半、是否為休息日、是否可打卡與發獎。
 *
 * 硬性限制與保證：
 * - 純函式，不在內部呼叫 Date.now()，時間一律由呼叫端傳入 now。
 * - 本單不發放任何金幣 (coins) 或經驗值 (xp) 獎勵（發獎歸 T1-D2）。
 * - 不重寫 T4-D2（evaluateStrengthSessionTiming）、T4-D6（evaluateImplausibleSession）、
 *   T4-D5（accumulateDayProgress），由本引擎呼叫並組裝結果。
 * - 不新增持久化欄位、不改動儲存版本。
 * - 第 2 階段由 T1-S1 在伺服器以同一套規則與鍵重算，不信任客戶端。
 */

import {
  type DayProgressConfig,
  resolveDayProgressConfig,
} from '../config/dayProgress.ts';
import {
  type ImplausibleCapsConfig,
  resolveImplausibleCaps,
} from '../config/implausibleCaps.ts';
import {
  type CheckinValidityConfig,
  resolveCheckinValidityConfig,
} from '../config/checkinValidity.ts';
import {
  getLocalDayKey,
  getWeekKey,
  parseDayKey,
} from './day.ts';
import {
  selectIsRestDay,
  selectUnwellHalfUsed,
  mapLegacyExerciseToSportType,
  type WorkoutSessionSportType,
} from './workoutRecord.ts';
import {
  accumulateDayProgress,
  getSessionDayKey,
  resolveSessionDurationSec,
  type DayProgressSessionInput,
  type DayProgressRecordSummary,
  type DayProgressAltDistance,
  type DayProgressStrengthHint,
} from './dayProgress.ts';
import { evaluateImplausibleSession } from './implausibleCapsEvaluator.ts';

export interface EvaluateCheckinValidityInput {
  /** 一筆或多筆運動紀錄（引擎只將屬於 dayKey 的紀錄納入判定） */
  sessions?: Array<DayProgressSessionInput | Record<string, any>> | null;
  /** 要判定的當地日期 (YYYY-MM-DD)；若未指定則以 now 所在之當地日為準 */
  dayKey?: string;
  /** 呼叫端傳入之基準現在時間（純函式，不使用內部 Date.now()） */
  now: number | Date;
  /** 使用者已標記為休息日之 dayKey 陣列 (v4 restDayKeys) */
  restDayKeys?: string[] | null;
  /** 使用者已標記為照顧身體中之 dayKey 陣列 (v4 caringDayKeys) */
  caringDayKeys?: string[] | null;
  /** 使用者各週已使用的減半次數 (v4 unwellHalfUsedByWeek) */
  unwellHalfUsedByWeek?: Record<string, number> | null;
  /** 使用者已打卡之 dayKey 陣列 (v4 checkinDayKeys) */
  checkinDayKeys?: string[] | null;
  /** 帳號建立之當地日期 (YYYY-MM-DD，若有提供則早於此日不算打卡) */
  joinDayKey?: string | null;
  /** 每日進度門檻覆寫設定 (可選) */
  thresholds?: Partial<DayProgressConfig>;
  /** 不合理數據上限覆寫設定 (可選) */
  caps?: Partial<ImplausibleCapsConfig>;
  /** 判定引擎整體可調設定覆寫 (可選) */
  config?: Partial<CheckinValidityConfig>;
}

export interface CheckinValidityResult {
  /** 是否達到打卡門檻（含一般門檻或合法減半後達標） */
  met: boolean;

  // 納入 T4-D5 進度欄位（提供 snake_case 與 camelCase）
  minutes_done: number;
  minutesDone: number;
  minutes_needed: number;
  minutesNeeded: number;
  seconds_done: number;
  secondsDone: number;
  remaining_sec: number;
  remainingSec: number;
  remaining_minutes_ceil: number;
  remainingMinutesCeil: number;
  alt_distance: DayProgressAltDistance | null;
  altDistance: DayProgressAltDistance | null;
  strength_hint: DayProgressStrengthHint | null;
  strengthHint: DayProgressStrengthHint | null;
  records: DayProgressRecordSummary[];
  primary_hint: string | null;
  primaryHint: string | null;

  // 不合理數據排除
  has_excluded_records: boolean;
  hasExcludedRecords: boolean;
  excluded_record_ids: string[];
  excludedRecordIds: string[];
  excluded_records: DayProgressRecordSummary[];
  excludedRecords: DayProgressRecordSummary[];

  // 「我不舒服」減半規則
  half_rule_applied: boolean;
  halfRuleApplied: boolean;
  half_rule_available: boolean;
  halfRuleAvailable: boolean;
  unwell_half_used: number;
  unwellHalfUsed: number;
  unwell_half_used_this_week: number;
  unwellHalfUsedThisWeek: number;
  unwell_half_per_week: number;
  unwellHalfPerWeek: number;

  // 日期與打卡狀態
  day_key: string;
  dayKey: string;
  today_key: string;
  todayKey: string;
  is_rest_day: boolean;
  isRestDay: boolean;
  rest_day_still_checks_in: boolean;
  restDayStillChecksIn: boolean;
  already_checked_in: boolean;
  alreadyCheckedIn: boolean;
  would_check_in: boolean;
  wouldCheckIn: boolean;
  is_backfill: boolean;
  isBackfill: boolean;
  would_grant_rewards: boolean;
  wouldGrantRewards: boolean;
  counts_toward_weekly_days: boolean;
  countsTowardWeeklyDays: boolean;
  is_future_date: boolean;
  isFutureDate: boolean;
  is_before_account: boolean;
  isBeforeAccount: boolean;
}

/**
 * 有效運動判定引擎純函式 (evaluateCheckinValidity)
 *
 * 供客戶端與第 2 階段 T1-S1 伺服器共用。
 */
export function evaluateCheckinValidity(
  input: EvaluateCheckinValidityInput
): CheckinValidityResult {
  const now = input.now;
  const todayKey = getLocalDayKey(now);
  const targetDayKey = input.dayKey || todayKey;

  // 1. 解析設定
  const resolvedThresholds = resolveDayProgressConfig(
    input.config?.thresholds || input.thresholds
  );
  const resolvedCaps = resolveImplausibleCaps(
    input.config?.caps || input.caps
  );
  const resolvedConfig = resolveCheckinValidityConfig({
    ...input.config,
    thresholds: resolvedThresholds,
    caps: resolvedCaps,
  });

  // 2. 日期邊界狀態
  const isFutureDate = targetDayKey > todayKey;
  const isBackfill = targetDayKey < todayKey;
  const isBeforeAccount = Boolean(
    input.joinDayKey && targetDayKey < input.joinDayKey
  );

  const targetWeekKey = getWeekKey(targetDayKey);
  const currentWeekKey = getWeekKey(todayKey);

  // 3. 篩選屬於 targetDayKey 之紀錄
  const rawSessions = Array.isArray(input.sessions) ? input.sessions : [];
  const targetDaySessions: DayProgressSessionInput[] = [];

  for (let i = 0; i < rawSessions.length; i++) {
    const s = rawSessions[i];
    if (!s) continue;

    // 若有明定 dayKey 或 local_date 但無 timestamp，補全 timestamp 以利 accumulateDayProgress
    let normalizedSession: DayProgressSessionInput = s as DayProgressSessionInput;
    const explicitDayKey = (s as any).dayKey || (s as any).local_date;
    if (
      explicitDayKey &&
      (typeof s.timestamp !== 'number' || !Number.isFinite(s.timestamp) || s.timestamp <= 0)
    ) {
      normalizedSession = {
        ...s,
        timestamp: parseDayKey(explicitDayKey).getTime(),
      };
    }

    const sessionDay = getSessionDayKey(normalizedSession, i, now);
    if (sessionDay === targetDayKey) {
      targetDaySessions.push(normalizedSession);
    }
  }

  // 4. 健康 App 過去日同步處理 (10:36／11:45 已定案)
  // 健康 App 若 source === 'health_app'（或 loggingMode 同等）且紀錄日期早於 now 的當地今天：不列入打卡
  const eligibleSessions: DayProgressSessionInput[] = [];
  const delayedHealthAppRecords: DayProgressRecordSummary[] = [];

  for (let i = 0; i < targetDaySessions.length; i++) {
    const s = targetDaySessions[i];
    const isHealthApp =
      s.source === 'health_app' || s.loggingMode === 'health_app';

    if (isHealthApp && isBackfill) {
      // 過去日期之健康 App 延遲同步：不列入打卡進度累加
      const sportType: WorkoutSessionSportType =
        (s.sportType as WorkoutSessionSportType) ||
        mapLegacyExerciseToSportType(
          s.exerciseLogs?.[0]?.exerciseId,
          s.exerciseLogs?.[0]?.unitLabel
        );
      const rawSec = resolveSessionDurationSec(s, sportType);
      const sets =
        s.sets ||
        s.sessionSets ||
        (s.exerciseLogs ? s.exerciseLogs.flatMap((l) => l.sets || []) : []);
      const setsCount = sets.length > 0 ? sets.length : s.totalSets || 0;
      let rawDistM = 0;
      if (typeof s.distanceM === 'number' && Number.isFinite(s.distanceM)) {
        rawDistM = s.distanceM;
      } else if (sets.length > 0) {
        rawDistM = sets.reduce((acc, st) => {
          const dm =
            typeof st.distanceM === 'number' && Number.isFinite(st.distanceM)
              ? st.distanceM
              : 0;
          return acc + dm;
        }, 0);
      }

      delayedHealthAppRecords.push({
        id: s.id || `health_app_delayed_${i}`,
        sportType,
        durationSec: rawSec,
        distanceM: rawDistM > 0 ? rawDistM : undefined,
        sets: setsCount > 0 ? setsCount : undefined,
        countsTowardCheckin: false,
        flagReason: null,
      });
    } else {
      eligibleSessions.push(s);
    }
  }

  // 5. 呼叫 T4-D5 accumulateDayProgress 進行當日累加與不合理數據判定
  const dayProgressResult = accumulateDayProgress(eligibleSessions, {
    dayKey: targetDayKey,
    now,
    caps: resolvedCaps,
    thresholds: resolvedThresholds,
  });

  // 合併延遲健康 App 摘要至總 records 清單
  const allRecords: DayProgressRecordSummary[] = [
    ...dayProgressResult.records,
    ...delayedHealthAppRecords,
  ];

  // 6. 不合理數據被排除項目 (T4-D6)
  // 快走 12~25 km/h 詢問路徑（countsTowardCheckin=true, flagReason=null）仍算數
  const implausibleExcluded = allRecords.filter(
    (r) => !r.countsTowardCheckin && r.flagReason !== null
  );
  const hasExcludedRecords = implausibleExcluded.length > 0;
  const excludedRecordIds = implausibleExcluded.map((r) => r.id);

  // 7. 「我不舒服」減半規則判定 (YuChien 11/14 11:00 已定案)
  const unwellHalfUsed = selectUnwellHalfUsed(
    { unwellHalfUsedByWeek: input.unwellHalfUsedByWeek },
    targetWeekKey
  );
  const halfRuleAvailable = unwellHalfUsed < resolvedConfig.unwellHalfPerWeek;

  const isCaringDay =
    Array.isArray(input.caringDayKeys) &&
    input.caringDayKeys.includes(targetDayKey);

  // 辨識訓練中中止之紀錄 (endedUnwell === true)
  const hasEndedUnwellSession = eligibleSessions.some(
    (s) => (s as any).endedUnwell === true || (s as any).ended_unwell === true
  );

  // 篩選當天經判定為合理有效之 session
  const validDaySessions: DayProgressSessionInput[] = [];
  for (const s of eligibleSessions) {
    const sportType: WorkoutSessionSportType =
      (s.sportType as WorkoutSessionSportType) ||
      mapLegacyExerciseToSportType(
        s.exerciseLogs?.[0]?.exerciseId,
        s.exerciseLogs?.[0]?.unitLabel
      );
    const rawSec = resolveSessionDurationSec(s, sportType);
    const evalRes = evaluateImplausibleSession(
      {
        ...s,
        sportType,
        totalDurationSec: rawSec,
      } as any,
      {
        caps: resolvedCaps,
        otherDaySessions: eligibleSessions as any,
        now,
      }
    );
    if (evalRes.countsTowardCheckin) {
      validDaySessions.push(s);
    }
  }

  // 只按「我不舒服」、當天完全沒有運動紀錄（或只有 caringDayKeys 標記、沒有紀錄）：不算打卡、不套減半達標
  const hasValidWorkoutRecords = validDaySessions.length > 0;
  const isUnwell =
    hasValidWorkoutRecords && (hasEndedUnwellSession || isCaringDay);

  let met = dayProgressResult.met;
  let halfRuleApplied = false;

  let finalRemainingSec = dayProgressResult.remaining_sec;
  let finalRemainingMinutesCeil = dayProgressResult.remaining_minutes_ceil;
  let finalPrimaryHint = dayProgressResult.primary_hint;

  if (met) {
    // 若當天已達完整門檻，則 met === true 且 halfRuleApplied === false（不必用減半）
    halfRuleApplied = false;
  } else if (isUnwell && halfRuleAvailable) {
    // 未達完整門檻，但符合「我不舒服」資格且每週減半額度尚有剩餘，檢查是否達該類型門檻之一半：
    // - 重訓／徒手 ≥ 1 組（不要求三條件）
    // - 其他類型 ≥ 5 分鐘，或距離達到一半（跑／走 0.5 公里、游泳 100 公尺、單車 1.5 公里）
    let totalStrengthSets = 0;
    const distanceBySport: Record<string, number> = {
      run: 0,
      walk: 0,
      swim: 0,
      cycle: 0,
    };

    for (const s of validDaySessions) {
      const sportType: WorkoutSessionSportType =
        (s.sportType as WorkoutSessionSportType) ||
        mapLegacyExerciseToSportType(
          s.exerciseLogs?.[0]?.exerciseId,
          s.exerciseLogs?.[0]?.unitLabel
        );
      const isStrength =
        sportType === 'strength' || sportType === 'bodyweight';
      const sets =
        s.sets ||
        s.sessionSets ||
        (s.exerciseLogs ? s.exerciseLogs.flatMap((l) => l.sets || []) : []);
      const setsCount = sets.length > 0 ? sets.length : s.totalSets || 0;

      if (isStrength) {
        totalStrengthSets += setsCount;
      } else {
        let distM = 0;
        if (typeof s.distanceM === 'number' && Number.isFinite(s.distanceM)) {
          distM = s.distanceM;
        } else if (sets.length > 0) {
          distM = sets.reduce((acc, st) => {
            const dm =
              typeof st.distanceM === 'number' && Number.isFinite(st.distanceM)
                ? st.distanceM
                : 0;
            return acc + dm;
          }, 0);
        }
        if (distM > 0 && distanceBySport[sportType] !== undefined) {
          distanceBySport[sportType] += distM;
        }
      }
    }

    const strengthHalfMet =
      totalStrengthSets >=
      Math.max(1, Math.ceil(resolvedThresholds.strengthMinSets / 2));
    const durationHalfMet =
      dayProgressResult.seconds_done >=
      (resolvedThresholds.minMinutes * 60) / 2;
    const runHalfMet =
      distanceBySport.run >= (resolvedThresholds.runWalkMinKm * 1000) / 2;
    const walkHalfMet =
      distanceBySport.walk >= (resolvedThresholds.runWalkMinKm * 1000) / 2;
    const swimHalfMet =
      distanceBySport.swim >= resolvedThresholds.swimMinM / 2;
    const cycleHalfMet =
      distanceBySport.cycle >= (resolvedThresholds.cycleMinKm * 1000) / 2;

    const halfThresholdMet =
      strengthHalfMet ||
      durationHalfMet ||
      runHalfMet ||
      walkHalfMet ||
      swimHalfMet ||
      cycleHalfMet;

    if (halfThresholdMet) {
      met = true;
      halfRuleApplied = true;
      finalRemainingSec = 0;
      finalRemainingMinutesCeil = 0;
      finalPrimaryHint = null;
    }
  }

  // 8. 休息日狀態 (11:44 已定：休息日又有有效運動，照樣判定達標與自動打卡)
  const isRestDay = selectIsRestDay(
    { restDayKeys: input.restDayKeys },
    targetDayKey
  );
  const restDayStillChecksIn = isRestDay && met;

  // 9. 打卡狀態判定
  const alreadyCheckedIn = Boolean(
    input.checkinDayKeys && input.checkinDayKeys.includes(targetDayKey)
  );

  // wouldCheckIn: 有效且該日尚未打卡，且不是未來日期，且不是帳號建立日以前
  const wouldCheckIn =
    met && !alreadyCheckedIn && !isFutureDate && !isBeforeAccount;

  // wouldGrantRewards: 只在「會記打卡、且是當天（不是補過去）」時為 true。
  // 補過去某一天：wouldCheckIn 可為 true，wouldGrantRewards 必須為 false（11:45／11:46）
  const wouldGrantRewards = wouldCheckIn && !isBackfill;

  // 10. 本週天數計入判定 (countsTowardWeeklyDays)
  // - 已結算的週（評估日的週鍵早於 now 所在週）一律不計入週天數（資安 11:48 凍結），不受開關影響。
  // - 本週過去日：依 countSameWeekBackfillTowardWeeklyDays 開關判定（待 YuChien 確認，預設 true）。
  // - 本週當天：達標即計入。
  const isCurrentWeek = targetWeekKey === currentWeekKey;
  const isSettledWeek = targetWeekKey < currentWeekKey;
  let countsTowardWeeklyDays = false;

  if (met && !isFutureDate && !isBeforeAccount) {
    if (isSettledWeek) {
      countsTowardWeeklyDays = false;
    } else if (isCurrentWeek) {
      if (!isBackfill) {
        countsTowardWeeklyDays = true;
      } else {
        countsTowardWeeklyDays = Boolean(
          resolvedConfig.countSameWeekBackfillTowardWeeklyDays
        );
      }
    }
  }

  return {
    met,

    // 進度欄位
    minutes_done: dayProgressResult.minutes_done,
    minutesDone: dayProgressResult.minutes_done,
    minutes_needed: dayProgressResult.minutes_needed,
    minutesNeeded: dayProgressResult.minutes_needed,
    seconds_done: dayProgressResult.seconds_done,
    secondsDone: dayProgressResult.seconds_done,
    remaining_sec: finalRemainingSec,
    remainingSec: finalRemainingSec,
    remaining_minutes_ceil: finalRemainingMinutesCeil,
    remainingMinutesCeil: finalRemainingMinutesCeil,
    alt_distance: dayProgressResult.alt_distance,
    altDistance: dayProgressResult.alt_distance,
    strength_hint: dayProgressResult.strength_hint,
    strengthHint: dayProgressResult.strength_hint,
    records: allRecords,
    primary_hint: finalPrimaryHint,
    primaryHint: finalPrimaryHint,

    // 不合理數據排除
    has_excluded_records: hasExcludedRecords,
    hasExcludedRecords,
    excluded_record_ids: excludedRecordIds,
    excludedRecordIds,
    excluded_records: implausibleExcluded,
    excludedRecords: implausibleExcluded,

    // 「我不舒服」減半
    half_rule_applied: halfRuleApplied,
    halfRuleApplied,
    half_rule_available: halfRuleAvailable,
    halfRuleAvailable,
    unwell_half_used: unwellHalfUsed,
    unwellHalfUsed,
    unwell_half_used_this_week: unwellHalfUsed,
    unwellHalfUsedThisWeek: unwellHalfUsed,
    unwell_half_per_week: resolvedConfig.unwellHalfPerWeek,
    unwellHalfPerWeek: resolvedConfig.unwellHalfPerWeek,

    // 日期與打卡狀態
    day_key: targetDayKey,
    dayKey: targetDayKey,
    today_key: todayKey,
    todayKey,
    is_rest_day: isRestDay,
    isRestDay,
    rest_day_still_checks_in: restDayStillChecksIn,
    restDayStillChecksIn,
    already_checked_in: alreadyCheckedIn,
    alreadyCheckedIn,
    would_check_in: wouldCheckIn,
    wouldCheckIn,
    is_backfill: isBackfill,
    isBackfill,
    would_grant_rewards: wouldGrantRewards,
    wouldGrantRewards,
    counts_toward_weekly_days: countsTowardWeeklyDays,
    countsTowardWeeklyDays,
    is_future_date: isFutureDate,
    isFutureDate,
    is_before_account: isBeforeAccount,
    isBeforeAccount,
  };
}
