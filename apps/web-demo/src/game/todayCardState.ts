export type TodayHeroCardState = 'idle' | 'progress' | 'ready' | 'sortied';

export interface TodayStateDecisionParams {
  checkedIn: boolean;
  bossDone: boolean;
  daySessionsCount: number;
  dayProgressMet?: boolean;
}

/**
 * 判定 TodayHeroCard 的四種主要狀態 (T1-D3 / T4-D5)：
 * - idle: 今天尚未打卡，且當天沒有運動紀錄
 * - progress: 尚未打卡，但當天已有紀錄且尚未達標
 * - ready: 當日已打卡，且尚未出擊討伐 Boss
 * - sortied: 當日已打卡，且已完成今日 Boss 出擊
 *
 * 舊存檔相容：若 checkedIn 為真（即便無當日紀錄），不收回獎勵，依 bossDone 走 ready 或 sortied。
 */
export function getTodayHeroCardState(params: TodayStateDecisionParams): TodayHeroCardState {
  if (params.checkedIn) {
    return params.bossDone ? 'sortied' : 'ready';
  }
  if (params.daySessionsCount > 0 && !params.dayProgressMet) {
    return 'progress';
  }
  return 'idle';
}

export interface TodaySessionSummary {
  primaryLabel: string;
  additionalCount: number;
}

export interface TodaySessionInput {
  sportType?: string;
  routineName?: string;
  durationMinutes?: number;
  exerciseLogs?: {
    exerciseNameZh?: string;
    sets?: {
      durationSec?: number;
      distanceM?: number;
    }[];
  }[];
}

const SPORT_NAME_MAP: Record<string, string> = {
  run: '跑步',
  walk: '快走',
  cycle: '單車',
  swim: '游泳',
  strength: '重訓',
  bodyweight: '徒手',
  yoga: '瑜珈',
  stretch: '伸展',
  ball: '球類',
  circuit: '循環訓練',
  hiit: 'HIIT',
  custom: '自訂',
};

/**
 * 格式化當日最新運動摘要（用於 D3b ready 狀態卡片上方展示）：
 * 例如「快走 32 分・3.1 公里」「+1 筆」
 */
export function formatTodaySessionSummary(
  daySessions: TodaySessionInput[]
): TodaySessionSummary | null {
  if (!daySessions || daySessions.length === 0) return null;
  const latest = daySessions[daySessions.length - 1];

  let sportName = '運動';
  if (latest.sportType && SPORT_NAME_MAP[latest.sportType]) {
    sportName = SPORT_NAME_MAP[latest.sportType];
  } else if (latest.routineName) {
    sportName = latest.routineName;
  } else if (latest.exerciseLogs?.[0]?.exerciseNameZh) {
    sportName = latest.exerciseLogs[0].exerciseNameZh;
  }

  // 計算分鐘數：優先取 durationMinutes，若無則加總 sets 內 durationSec
  let durationMinutes = latest.durationMinutes || 0;
  if (!durationMinutes && latest.exerciseLogs) {
    let totalSec = 0;
    for (const ex of latest.exerciseLogs) {
      for (const st of ex.sets || []) {
        if (st.durationSec) totalSec += st.durationSec;
      }
    }
    if (totalSec > 0) {
      durationMinutes = Math.max(1, Math.round(totalSec / 60));
    }
  }

  // 計算距離
  let totalDistanceM = 0;
  if (latest.exerciseLogs) {
    for (const ex of latest.exerciseLogs) {
      for (const st of ex.sets || []) {
        if (st.distanceM) totalDistanceM += st.distanceM;
      }
    }
  }

  let distancePart = '';
  if (totalDistanceM > 0) {
    const km = (totalDistanceM / 1000).toFixed(1).replace(/\.0$/, '');
    distancePart = `・${km} 公里`;
  }

  const durationPart = durationMinutes > 0 ? `${durationMinutes} 分` : '';
  const primaryLabel = `${sportName} ${durationPart}${distancePart}`.trim();
  const additionalCount = daySessions.length > 1 ? daySessions.length - 1 : 0;

  return {
    primaryLabel,
    additionalCount,
  };
}
