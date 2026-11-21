// 第 2 階段由伺服器用同一組鍵與預設值重算，不信任客戶端
import {
  type ImplausibleCapsConfig,
  resolveImplausibleCaps,
} from '../config/implausibleCaps.ts';
import { getLocalDayKey } from './day.ts';
import { type WorkoutSessionSportType } from './workoutRecord.ts';

export type FlagReason =
  | 'implausible_speed'
  | 'implausible_strength'
  | 'session_too_long'
  | 'day_too_long';

export interface FlagDetail {
  field?: string;
  value?: number;
  cap?: number;
  avgKmh?: number;
  secPer100m?: number;
  unit?: string;
}

export interface EvaluationCopy {
  title: string;
  message: string;
  footnote?: string;
  primaryButton?: string;
  secondaryButton?: string;
  note?: string;
}

export interface ImplausibleEvaluationResult {
  /** 本筆紀錄是否列入打卡計算 */
  countsTowardCheckin: boolean;
  /** 不合理原因，正常時為 null */
  flagReason: FlagReason | null;
  /** 不合理詳情 (數值、上限、欄位) */
  flagDetail: FlagDetail | null;
  /** 建議轉換之運動類型 (快走 12~25 km/h 時建議 'run') */
  suggestSportType: 'run' | null;
  /** 標記需以琥珀色高亮之欄位 */
  flaggedFields: string[];
  /** 填入實際數值後之教練審定文案 (46–52b) */
  copy: EvaluationCopy | null;
}

export interface EvaluateSetInput {
  weightKg?: number;
  reps?: number;
  distanceM?: number;
  durationSec?: number;
}

export interface EvaluateSessionInput {
  id?: string;
  sportType?: WorkoutSessionSportType | string;
  totalDurationSec?: number;
  durationSec?: number;
  durationMinutes?: number;
  workoutElapsedSeconds?: number;
  distanceM?: number;
  sets?: EvaluateSetInput[];
  sessionSets?: EvaluateSetInput[];
  exerciseLogs?: Array<{
    exerciseId?: string;
    exerciseNameZh?: string;
    unitLabel?: string;
    sets: EvaluateSetInput[];
  }>;
  totalSets?: number;
  timestamp?: number;
}

export interface EvaluateImplausibleSessionOptions {
  otherDaySessions?: Array<EvaluateSessionInput | Record<string, unknown>>;
  caps?: Partial<ImplausibleCapsConfig>;
  now?: number | Date;
}

/**
 * 格式化數值，整數不帶小數點，非整數保留至多一位小數。
 */
export function formatEvaluationNumber(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const rounded = Math.round(val * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * 判定單筆運動紀錄是否超出合理數據上限之純函式。
 * 第 2 階段由伺服器用同一組鍵與預設值重算，不信任客戶端。
 *
 * 規則 (YuChien 11/14 定案；嚴格大於始判定超限)：
 * 1. 平均速度 = distance / duration。時長為 0 (或缺漏) 時不算有效速度，不判定超速，亦不提示快走改跑步。
 * 2. 游泳 sec/100m = durationSec * 100 / distanceM，快於 maxSwimSecPer100m (45秒) 判定 implausible_speed。
 * 3. 跑步 avg km/h > maxRunAvgKmh (25) 判定 implausible_speed。
 * 4. 單車 avg km/h > maxCycleAvgKmh (60) 判定 implausible_speed。
 * 5. 快走：
 *    - avg km/h > 25: 視為一般超限 (implausible_speed)，不提示改跑步，countsTowardCheckin=false。
 *    - 12 < avg km/h <= 25: 僅為詢問，suggestSportType='run', countsTowardCheckin=true, flagReason=null。
 *    - avg km/h <= 12: 正常。
 * 6. 重訓／徒手／任何包含 sets 之紀錄：
 *    - 單組 weightKg > 500、單組 reps > 100、單次總組數 > 60 判定 implausible_strength。
 * 7. 任何類型單筆時長 > 12 小時 判定 session_too_long。
 * 8. 當天累積總時長 (包含本筆) > 16 小時 判定 day_too_long。
 */
export function evaluateImplausibleSession(
  session: EvaluateSessionInput,
  options?: EvaluateImplausibleSessionOptions
): ImplausibleEvaluationResult {
  const caps = resolveImplausibleCaps(options?.caps);

  // 1. 提取所有 sets
  const sets: EvaluateSetInput[] = session.sets
    ? session.sets
    : session.sessionSets
    ? session.sessionSets
    : session.exerciseLogs
    ? session.exerciseLogs.flatMap((log) => log.sets || [])
    : [];

  // 2. 計算總時長 (秒)
  // 優先順序：totalDurationSec (已扣暫停) -> durationSec -> durationMinutes * 60 -> workoutElapsedSeconds
  let durationSec = 0;
  if (typeof session.totalDurationSec === 'number' && Number.isFinite(session.totalDurationSec)) {
    durationSec = session.totalDurationSec;
  } else if (typeof session.durationSec === 'number' && Number.isFinite(session.durationSec)) {
    durationSec = session.durationSec;
  } else if (typeof session.durationMinutes === 'number' && Number.isFinite(session.durationMinutes)) {
    durationSec = session.durationMinutes * 60;
  } else if (typeof session.workoutElapsedSeconds === 'number' && Number.isFinite(session.workoutElapsedSeconds)) {
    durationSec = session.workoutElapsedSeconds;
  }

  // 3. 計算總距離 (公尺)
  let distanceM = 0;
  if (typeof session.distanceM === 'number' && Number.isFinite(session.distanceM)) {
    distanceM = session.distanceM;
  } else if (sets.length > 0) {
    distanceM = sets.reduce((acc, s) => {
      const dm = typeof s.distanceM === 'number' && Number.isFinite(s.distanceM) ? s.distanceM : 0;
      return acc + dm;
    }, 0);
  }

  const sportType = session.sportType;
  const flaggedFields: string[] = [];

  let flagReason: FlagReason | null = null;
  let flagDetail: FlagDetail | null = null;
  let suggestSportType: 'run' | null = null;
  let copy: EvaluationCopy | null = null;

  // 4. 速度與配速判定 (只有 durationSec > 0 且 distanceM > 0 才是有效速度)
  if (durationSec > 0 && distanceM > 0) {
    // 避免 IEEE-754 浮點微差 (如 60000/3600*3.6 = 60.00000000000001)，精確至 6 位小數
    const avgKmh = Math.round(((distanceM / durationSec) * 3.6) * 1e6) / 1e6;
    const secPer100m = Math.round(((durationSec * 100) / distanceM) * 1e6) / 1e6;

    if (sportType === 'swim') {
      // 游泳：平均每 100 公尺快於 maxSwimSecPer100m (45 秒) 即超限
      if (secPer100m < caps.maxSwimSecPer100m) {
        flagReason = 'implausible_speed';
        flagDetail = {
          field: 'secPer100m',
          value: secPer100m,
          cap: caps.maxSwimSecPer100m,
          secPer100m,
          avgKmh,
          unit: '秒/100m',
        };
        flaggedFields.push('distanceM', 'duration');
        copy = {
          title: '這筆數字好像怪怪的',
          message: `平均每 100 公尺 ${formatEvaluationNumber(secPer100m)} 秒，比頂尖選手還快，可能是距離或時間填錯了。`,
          footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
          primaryButton: '修改數字',
          secondaryButton: '先這樣存',
        };
      }
    } else if (sportType === 'cycle') {
      // 單車：平均時速 > maxCycleAvgKmh (60 km/h)
      if (avgKmh > caps.maxCycleAvgKmh) {
        flagReason = 'implausible_speed';
        flagDetail = {
          field: 'avgKmh',
          value: avgKmh,
          cap: caps.maxCycleAvgKmh,
          avgKmh,
          unit: 'km/h',
        };
        flaggedFields.push('distanceM', 'duration');
        copy = {
          title: '這筆數字好像怪怪的',
          message: `平均時速 ${formatEvaluationNumber(avgKmh)} 公里，比一般騎車快很多，可能是距離或時間填錯了。`,
          footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
          primaryButton: '修改數字',
          secondaryButton: '先這樣存',
        };
      }
    } else if (sportType === 'run') {
      // 跑步：平均時速 > maxRunAvgKmh (25 km/h)
      if (avgKmh > caps.maxRunAvgKmh) {
        flagReason = 'implausible_speed';
        flagDetail = {
          field: 'avgKmh',
          value: avgKmh,
          cap: caps.maxRunAvgKmh,
          avgKmh,
          unit: 'km/h',
        };
        flaggedFields.push('distanceM', 'duration');
        copy = {
          title: '這筆數字好像怪怪的',
          message: `平均時速 ${formatEvaluationNumber(avgKmh)} 公里，比頂尖選手的速度還快，可能是距離或時間填錯了。`,
          footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
          primaryButton: '修改數字',
          secondaryButton: '先這樣存',
        };
      }
    } else if (sportType === 'walk') {
      // 快走：
      // > 25 km/h: 視為一般超限 (implausible_speed)，不提示改成跑步
      // 12 < km/h <= 25: 僅為詢問改成跑步，照樣算數 (countsTowardCheckin=true)
      if (avgKmh > caps.maxRunAvgKmh) {
        flagReason = 'implausible_speed';
        flagDetail = {
          field: 'avgKmh',
          value: avgKmh,
          cap: caps.maxRunAvgKmh,
          avgKmh,
          unit: 'km/h',
        };
        flaggedFields.push('distanceM', 'duration');
        copy = {
          title: '這筆數字好像怪怪的',
          message: `平均時速 ${formatEvaluationNumber(avgKmh)} 公里，比頂尖選手的速度還快，可能是距離或時間填錯了。`,
          footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
          primaryButton: '修改數字',
          secondaryButton: '先這樣存',
        };
      } else if (avgKmh > caps.maxWalkAvgKmh) {
        // 詢問路徑：照樣算數，不立 flagReason
        suggestSportType = 'run';
        flagDetail = {
          field: 'avgKmh',
          value: avgKmh,
          cap: caps.maxWalkAvgKmh,
          avgKmh,
          unit: 'km/h',
        };
        copy = {
          title: '要不要改成跑步？',
          message: `平均時速 ${formatEvaluationNumber(avgKmh)} 公里，比較像跑步的速度。`,
          primaryButton: '改成跑步',
          secondaryButton: '維持快走',
          note: '都不改也沒關係，這筆照樣算數。',
        };
      }
    } else {
      // 其他運動類型若有距離時速且超過跑步極限 25 km/h
      if (avgKmh > caps.maxRunAvgKmh) {
        flagReason = 'implausible_speed';
        flagDetail = {
          field: 'avgKmh',
          value: avgKmh,
          cap: caps.maxRunAvgKmh,
          avgKmh,
          unit: 'km/h',
        };
        flaggedFields.push('distanceM', 'duration');
        copy = {
          title: '這筆數字好像怪怪的',
          message: `平均時速 ${formatEvaluationNumber(avgKmh)} 公里，比頂尖選手的速度還快，可能是距離或時間填錯了。`,
          footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
          primaryButton: '修改數字',
          secondaryButton: '先這樣存',
        };
      }
    }
  }

  // 5. 重訓／組數判定 (單組重量 > 500、單組次數 > 100、總組數 > 60)
  const totalSets = typeof session.totalSets === 'number' ? session.totalSets : sets.length;

  if (totalSets > caps.maxStrengthSetsPerSession) {
    if (!flagReason) {
      flagReason = 'implausible_strength';
      flagDetail = {
        field: 'totalSets',
        value: totalSets,
        cap: caps.maxStrengthSetsPerSession,
        unit: '組',
      };
      copy = {
        title: '這筆數字好像怪怪的',
        message: `單次 ${totalSets} 組超過常見範圍（上限 ${caps.maxStrengthSetsPerSession} 組），可能是單位或數字打錯了。改好就會重新計算。`,
        footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
        primaryButton: '修改數字',
        secondaryButton: '先這樣存',
      };
    }
    flaggedFields.push('totalSets');
  }

  let overWeightSet: EvaluateSetInput | null = null;
  let overRepsSet: EvaluateSetInput | null = null;

  for (const s of sets) {
    if (typeof s.weightKg === 'number' && s.weightKg > caps.maxStrengthSetKg) {
      if (!overWeightSet) overWeightSet = s;
      flaggedFields.push('weightKg');
    }
    if (typeof s.reps === 'number' && s.reps > caps.maxStrengthSetReps) {
      if (!overRepsSet) overRepsSet = s;
      flaggedFields.push('reps');
    }
  }

  if (overWeightSet) {
    if (!flagReason) {
      flagReason = 'implausible_strength';
      flagDetail = {
        field: 'weightKg',
        value: overWeightSet.weightKg,
        cap: caps.maxStrengthSetKg,
        unit: 'kg',
      };
      copy = {
        title: '這筆數字好像怪怪的',
        message: `單組 ${formatEvaluationNumber(overWeightSet.weightKg!)} 公斤超過常見範圍（上限 ${caps.maxStrengthSetKg} 公斤），可能是單位或數字打錯了。改好就會重新計算。`,
        footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
        primaryButton: '修改數字',
        secondaryButton: '先這樣存',
      };
    }
  } else if (overRepsSet) {
    if (!flagReason) {
      flagReason = 'implausible_strength';
      flagDetail = {
        field: 'reps',
        value: overRepsSet.reps,
        cap: caps.maxStrengthSetReps,
        unit: '次',
      };
      copy = {
        title: '這筆數字好像怪怪的',
        message: `單組 ${overRepsSet.reps} 次超過常見範圍（上限 ${caps.maxStrengthSetReps} 次），可能是單位或數字打錯了。改好就會重新計算。`,
        footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
        primaryButton: '修改數字',
        secondaryButton: '先這樣存',
      };
    }
  }

  // 6. 單筆時長上限判定 ( > 12 小時 )
  const maxSessionSec = caps.maxSessionHours * 3600;
  if (durationSec > maxSessionSec) {
    if (!flagReason) {
      flagReason = 'session_too_long';
      flagDetail = {
        field: 'durationSec',
        value: durationSec,
        cap: maxSessionSec,
        unit: '秒',
      };
      copy = {
        title: '這筆數字好像怪怪的',
        message: `單筆超過 ${caps.maxSessionHours} 小時，可能是忘了按結束`,
        footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
        primaryButton: '修改數字',
        secondaryButton: '先這樣存',
      };
    }
    flaggedFields.push('duration');
  }

  // 7. 單日累積總時長上限判定 ( > 16 小時 )
  const maxDayTotalSec = caps.maxDayTotalHours * 3600;
  let sessionDayKey: string | null = null;
  if (typeof session.timestamp === 'number' && Number.isFinite(session.timestamp) && session.timestamp > 0) {
    sessionDayKey = getLocalDayKey(session.timestamp);
  } else if (options?.now) {
    sessionDayKey = getLocalDayKey(options.now);
  }

  let otherDayDurationSec = 0;
  if (options?.otherDaySessions && options.otherDaySessions.length > 0) {
    for (const other of options.otherDaySessions) {
      const otherRec = other as EvaluateSessionInput;
      // 避免自身重複計算
      if (session.id && otherRec.id && session.id === otherRec.id) {
        continue;
      }

      // 若兩者皆有 timestamp，檢查是否在同一天
      if (sessionDayKey && typeof otherRec.timestamp === 'number' && otherRec.timestamp > 0) {
        const otherDayKey = getLocalDayKey(otherRec.timestamp);
        if (otherDayKey !== sessionDayKey) {
          continue;
        }
      }

      let otherSec = 0;
      if (typeof otherRec.totalDurationSec === 'number' && Number.isFinite(otherRec.totalDurationSec)) {
        otherSec = otherRec.totalDurationSec;
      } else if (typeof otherRec.durationSec === 'number' && Number.isFinite(otherRec.durationSec)) {
        otherSec = otherRec.durationSec;
      } else if (typeof otherRec.durationMinutes === 'number' && Number.isFinite(otherRec.durationMinutes)) {
        otherSec = otherRec.durationMinutes * 60;
      } else if (typeof otherRec.workoutElapsedSeconds === 'number' && Number.isFinite(otherRec.workoutElapsedSeconds)) {
        otherSec = otherRec.workoutElapsedSeconds;
      }

      otherDayDurationSec += Math.max(0, otherSec);
    }
  }

  const dayTotalDurationSec = durationSec + otherDayDurationSec;
  if (dayTotalDurationSec > maxDayTotalSec) {
    if (!flagReason) {
      flagReason = 'day_too_long';
      flagDetail = {
        field: 'dayTotalDurationSec',
        value: dayTotalDurationSec,
        cap: maxDayTotalSec,
        unit: '秒',
      };
      copy = {
        title: '這筆數字好像怪怪的',
        message: `今天加起來超過 ${caps.maxDayTotalHours} 小時，可能是忘了按結束`,
        footnote: '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。',
        primaryButton: '修改數字',
        secondaryButton: '先這樣存',
      };
    }
    flaggedFields.push('dayTotalDuration');
  }

  // 8. 整合 countsTowardCheckin 與 suggestSportType
  // 若存在任何 flagReason，該筆紀錄不算打卡；且不得建議改為跑步
  const countsTowardCheckin = flagReason === null;
  if (!countsTowardCheckin) {
    suggestSportType = null;
  }

  return {
    countsTowardCheckin,
    flagReason,
    flagDetail,
    suggestSportType,
    flaggedFields: Array.from(new Set(flaggedFields)),
    copy,
  };
}
