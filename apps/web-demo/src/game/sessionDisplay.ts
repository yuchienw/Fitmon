import type { WorkoutSessionSportType } from './workoutRecord.ts';

export interface SessionSummaryRecordLike {
  sportType?: WorkoutSessionSportType | string | null;
  totalSets?: number;
  totalVolume?: number;
  coinsEarned?: number;
  durationMinutes?: number;
  distanceM?: number;
}

export interface SessionSummaryVisibility {
  showVolume: boolean;
  showSets: boolean;
  showCoins: boolean;
}

/**
 * 裁決歷史紀錄卡底部摘要列之欄位能見度 (Q3 規範 - T4-D4)：
 * - showVolume: 僅限重訓或舊版紀錄 (strength-or-legacy only)
 * - showSets: 重訓或舊版紀錄且組數 > 0 (若未指定 totalSets，預設顯示)
 * - showCoins: 非重訓僅在金幣 > 0 時顯示（避免出現 +0🪙）；重訓或舊版紀錄維持原本行為（即使 0 幣亦顯示）
 */
export function getSessionSummaryVisibility(
  session?: SessionSummaryRecordLike | null
): SessionSummaryVisibility {
  const isStrengthOrLegacy = !session?.sportType || session.sportType === 'strength';
  const totalSets = typeof session?.totalSets === 'number' ? session.totalSets : undefined;
  const coinsEarned = typeof session?.coinsEarned === 'number' ? session.coinsEarned : 0;

  if (isStrengthOrLegacy) {
    return {
      showVolume: true,
      showSets: totalSets !== undefined ? totalSets > 0 : true,
      showCoins: true,
    };
  }

  return {
    showVolume: false,
    showSets: false,
    showCoins: coinsEarned > 0,
  };
}

/**
 * 格式化非重訓歷史紀錄卡之距離字串 (T4-D4)：
 * - 游泳 (swim): 單位為「公尺」，例如 "300 公尺"
 * - 其他運動 (run, walk, cycle 等): 單位為 "km"，例如 "2.5 km"、"5 km"
 * - 若距離無效或 <= 0 則回傳 null
 */
export function formatSessionDistance(
  distanceM?: number | null,
  sportType?: WorkoutSessionSportType | string | null
): string | null {
  if (typeof distanceM !== 'number' || !Number.isFinite(distanceM) || distanceM <= 0) {
    return null;
  }
  if (sportType === 'swim') {
    return `${distanceM} 公尺`;
  }
  const km = distanceM / 1000;
  const rounded = Math.round((km + Number.EPSILON) * 100) / 100;
  return `${rounded} km`;
}
