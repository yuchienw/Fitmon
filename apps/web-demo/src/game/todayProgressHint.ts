/**
 * FitMon Today 卡未達門檻進度提示格式化模組 (T1-D4)
 *
 * 規格依據：
 * - /workspace/fitmon-tickets/T1-D4-progress-hint.md
 * - /workspace/fitmon-adventure/t1-t4-auto/spec.md §3.2 (TodayProgress) 與 §3.1 (progress 列)
 * - /workspace/fitmon-adventure/t1-t4-auto/src/T1-D4a-progress-minutes.html (再 X 分鐘)
 * - /workspace/fitmon-adventure/t1-t4-auto/src/T1-D4b-progress-sets.html (再 Y 組)
 * - /workspace/fitmon-adventure/t1-t4-auto/copy-for-coach.md 第 55–59 條
 *
 * 註記：
 * - 純函式，不在內部呼叫 Date.now()。
 * - 專注模式秒級提示（如「再 2 分 18 秒就算數」）及結算回饋在當前設計定稿中尚未出稿，待後續有設計稿後再做。
 */

import {
  type DayProgressResult,
  type DayProgressSessionInput,
  type DayProgressAltDistance,
  formatAltDistanceHint,
  resolveSessionDurationSec,
} from './dayProgress.ts';
import {
  type WorkoutSessionSportType,
  mapLegacyExerciseToSportType,
} from './workoutRecord.ts';

export type TodayProgressVariant = 'minutes' | 'sets' | 'rest-rule';

export interface TodayProgressAmberAlert {
  title: string;
  lines: string[];
}

export interface TodayProgressHintModel {
  /** 變體類型：minutes (D4a), sets (D4b), rest-rule (D4b 變體) */
  variant: TodayProgressVariant;
  /** 卡片頂部主標題，例如「再 5 分鐘就算數」「再 1 組就算數」「組和組之間休息一下...」 */
  primaryHint: string;
  /** 進度面板標題，例如「今天的運動 5／10 分」或「重訓 1／2 組」 */
  panelTitle: string;
  /** 進度面板標籤，例如「可以累加」或「紀錄已存」 */
  panelTag: string;
  /** 進度條總格數（分鐘為 10，組數為 needed） */
  totalSegments: number;
  /** 進度條填滿格數 */
  filledSegments: number;
  /** 副列已存紀錄說明（含替代距離若適用） */
  subText: string;
  /** 主 CTA 按鈕文字：「繼續運動」或「繼續重訓」 */
  ctaText: string;
  /** 琥珀提示框內容（僅在 rest-rule 變體時提供，其餘為 null） */
  amberAlert: TodayProgressAmberAlert | null;
}

export const SPORT_NAME_MAP: Record<string, string> = {
  walk: '快走',
  run: '跑步',
  cycle: '單車',
  swim: '游泳',
  strength: '重訓',
  bodyweight: '徒手',
  yoga: '瑜珈',
  stretch: '伸展',
  yoga_stretch: '瑜珈',
  ball: '球類',
  circuit: '循環訓練',
  hiit: 'HIIT',
  circuit_hiit: '循環訓練',
  custom: '自訂',
};

/**
 * 依據當地時間（Asia/Taipei 與 getLocalDayKey 同一套本地日）計算時段：
 * - 00:00–11:59: 「早上」
 * - 12:00–17:59: 「下午」
 * - 18:00–23:59: 「晚上」
 * - 若無有效時間戳，回傳 null（省略時段，不隨意猜測）
 */
export function getTimeOfDayPeriod(
  timestamp?: number | Date | null
): '早上' | '下午' | '晚上' | null {
  if (timestamp === undefined || timestamp === null) return null;
  if (typeof timestamp === 'number' && (!Number.isFinite(timestamp) || timestamp <= 0)) {
    return null;
  }
  const d = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (isNaN(d.getTime())) return null;

  const hours = d.getHours();
  if (hours >= 0 && hours < 12) return '早上';
  if (hours >= 12 && hours < 18) return '下午';
  if (hours >= 18 && hours < 24) return '晚上';
  return null;
}

/**
 * 取得運動類型之中文名稱
 */
export function getSportZhName(sportType?: string | null): string {
  if (!sportType) return '運動';
  return SPORT_NAME_MAP[sportType] || '運動';
}

/**
 * 計算單筆紀錄累加用的有效分鐘數 (整數，無條件捨去至整數分鐘，至少 0)
 */
export function resolveSessionEffectiveMinutes(
  session: DayProgressSessionInput,
  sportType: WorkoutSessionSportType
): number {
  const isStrength = sportType === 'strength' || sportType === 'bodyweight';
  const sets =
    session.sets ||
    session.sessionSets ||
    (session.exerciseLogs ? session.exerciseLogs.flatMap((l) => l.sets || []) : []);
  const setsCount = sets.length > 0 ? sets.length : session.totalSets || 0;

  const isAfterTheFactIncomplete =
    session.loggingMode === 'after_the_fact' &&
    (session.timingIncomplete === true ||
      sets.length === 0 ||
      sets.some((st) => typeof st.startedAt !== 'number'));

  if (isStrength && isAfterTheFactIncomplete) {
    // 補記且 timingIncomplete 用每組 2 分鐘換算
    return setsCount * 2;
  }

  const sec = resolveSessionDurationSec(session, sportType);
  if (sec > 0) {
    return Math.floor(sec / 60);
  }
  if (typeof session.durationMinutes === 'number' && Number.isFinite(session.durationMinutes)) {
    return Math.floor(session.durationMinutes);
  }
  return 0;
}

/**
 * 尋找運動紀錄列表中依時間排序之最新一筆紀錄
 */
export function findLatestDaySession(
  sessions: DayProgressSessionInput[]
): DayProgressSessionInput | null {
  if (!sessions || sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => {
    const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
    return aTime - bTime;
  });
  return sorted[sorted.length - 1];
}

/**
 * 格式化分鐘變體 (D4a) 之副列說明：
 * 格式：「{時段} {運動名稱} {N} 分（已存好）」＋（若適用）「・再快走 0.6 公里也可以」
 */
export function formatMinutesSubText(params: {
  session?: DayProgressSessionInput | null;
  altDistance?: DayProgressAltDistance | null;
}): string {
  const { session, altDistance } = params;
  if (!session) return '';

  const sportType: WorkoutSessionSportType =
    (session.sportType as WorkoutSessionSportType) ||
    mapLegacyExerciseToSportType(
      session.exerciseLogs?.[0]?.exerciseId,
      session.exerciseLogs?.[0]?.unitLabel
    );

  const sportName = getSportZhName(sportType);
  const minutes = resolveSessionEffectiveMinutes(session, sportType);
  const period = getTimeOfDayPeriod(session.timestamp);

  const recordPart = period
    ? `${period} ${sportName} ${minutes} 分（已存好）`
    : `${sportName} ${minutes} 分（已存好）`;

  if (altDistance && altDistance.remaining_m > 0) {
    const altHint = formatAltDistanceHint(altDistance);
    return `${recordPart}・${altHint}`;
  }

  return recordPart;
}

/**
 * 格式化組數變體 (D4b) 之副列說明 (對齊文案 57)：
 * 格式：「{動作名} {N} 組（已存好）。再做 {Y} 組，組間休息一下就算數。」
 */
export function formatSetsSubText(params: {
  session?: DayProgressSessionInput | null;
  setsDone: number;
  setsNeeded: number;
}): string {
  const { session, setsDone, setsNeeded } = params;
  let exerciseName = '重訓';
  if (session?.exerciseLogs?.[0]?.exerciseNameZh) {
    exerciseName = session.exerciseLogs[0].exerciseNameZh;
  } else if ((session as any)?.routineName) {
    exerciseName = (session as any).routineName;
  }

  const n =
    session?.exerciseLogs?.[0]?.sets?.length ||
    session?.totalSets ||
    setsDone ||
    1;
  const y = Math.max(1, setsNeeded - setsDone);

  return `${exerciseName} ${n} 組（已存好）。再做 ${y} 組，組間休息一下就算數。`;
}

/**
 * 判定與組裝 TodayHeroCard 在未達門檻 progress 狀態下之進度提示展示模型。
 *
 * 優先序（對齊 spec §3.2 與 copy-for-coach）：
 * 1. 若組數足夠但休息規則未滿足 (rest_rule_unmet)：走 rest-rule 變體，附琥珀提示框（文案 58、59）。
 * 2. 當天最新為重訓／徒手且組數不足：走 sets 變體 (D4b)。
 * 3. 其他情形（包含散步、快走、跑步、或重訓時長制）：走 minutes 變體 (D4a)。
 *
 * 若已達門檻 (met === true) 或無 primary_hint，回傳 null。
 */
export function resolveTodayProgressHint(params: {
  dayProgress: DayProgressResult;
  daySessions: DayProgressSessionInput[];
  now?: number | Date;
}): TodayProgressHintModel | null {
  const { dayProgress, daySessions } = params;

  // 達標或無剩餘提示時不顯示
  if (dayProgress.met || !dayProgress.primary_hint) {
    return null;
  }

  // 篩選有效紀錄，優先以有效紀錄之最新一筆作說明；若無則退回當日最新紀錄
  const validSessions = daySessions.filter((s) => {
    const summary = dayProgress.records?.find((r) => r.id === s.id);
    return summary ? summary.countsTowardCheckin : true;
  });
  const latestValid =
    findLatestDaySession(validSessions) || findLatestDaySession(daySessions);

  // 判斷最新紀錄是否為重訓／徒手
  let latestIsStrength = false;
  if (latestValid) {
    const sportType: WorkoutSessionSportType =
      (latestValid.sportType as WorkoutSessionSportType) ||
      mapLegacyExerciseToSportType(
        latestValid.exerciseLogs?.[0]?.exerciseId,
        latestValid.exerciseLogs?.[0]?.unitLabel
      );
    latestIsStrength = sportType === 'strength' || sportType === 'bodyweight';
  }

  const strengthHint = dayProgress.strength_hint;

  // 1. rest-rule 變體：組數已滿但未過休息時間／間隔判定
  const isRestRuleUnmet =
    Boolean(strengthHint?.rest_rule_unmet) &&
    (strengthHint?.sets_done ?? 0) >= (strengthHint?.sets_needed ?? 2) &&
    latestIsStrength;

  if (isRestRuleUnmet) {
    const done = strengthHint?.sets_done ?? 2;
    const needed = strengthHint?.sets_needed ?? 2;
    const exerciseName =
      latestValid?.exerciseLogs?.[0]?.exerciseNameZh ||
      (latestValid as any)?.routineName ||
      '重訓';
    const n =
      latestValid?.exerciseLogs?.[0]?.sets?.length ||
      latestValid?.totalSets ||
      done;

    return {
      variant: 'rest-rule',
      primaryHint: dayProgress.primary_hint,
      panelTitle: `重訓 ${done}／${needed} 組`,
      panelTag: '紀錄已存',
      totalSegments: needed,
      filledSegments: needed,
      subText: `${exerciseName} ${n} 組（已存好）`,
      ctaText: '繼續重訓',
      amberAlert: {
        title: '其他提示：',
        lines: [
          '組和組之間休息一下再按下一組，休息也是訓練的一部分，這次就會算數',
          '或換個運動，再 10 分鐘也算數',
        ],
      },
    };
  }

  // 2. sets 變體 (D4b)：最新是重訓／徒手且組數不足
  const isSetsVariant =
    latestIsStrength &&
    strengthHint !== null &&
    strengthHint.sets_done < strengthHint.sets_needed;

  if (isSetsVariant) {
    const done = strengthHint?.sets_done ?? 0;
    const needed = strengthHint?.sets_needed ?? 2;
    const subText = formatSetsSubText({
      session: latestValid,
      setsDone: done,
      setsNeeded: needed,
    });

    return {
      variant: 'sets',
      primaryHint: dayProgress.primary_hint,
      panelTitle: `重訓 ${done}／${needed} 組`,
      panelTag: '紀錄已存',
      totalSegments: needed,
      filledSegments: Math.min(needed, Math.max(0, done)),
      subText,
      ctaText: '繼續重訓',
      amberAlert: null,
    };
  }

  // 3. minutes 變體 (D4a)
  const doneMins = Math.min(dayProgress.minutes_needed, Math.max(0, dayProgress.minutes_done));
  const subText = formatMinutesSubText({
    session: latestValid,
    altDistance: dayProgress.alt_distance,
  });

  return {
    variant: 'minutes',
    primaryHint: dayProgress.primary_hint,
    panelTitle: `今天的運動 ${doneMins}／${dayProgress.minutes_needed} 分`,
    panelTag: '可以累加',
    totalSegments: dayProgress.minutes_needed,
    filledSegments: doneMins,
    subText,
    ctaText: '繼續運動',
    amberAlert: null,
  };
}
