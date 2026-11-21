/**
 * FitMon 不合理數據上限可調設定 (T4-D6)
 *
 * 預設值於 YuChien 11/14 11:00 定案（經幕僚長）。
 * 設定集中於此處，第 2 階段由伺服器用同一組鍵與預設值重算，不信任客戶端。
 */

export interface ImplausibleCapsConfig {
  /** 跑步平均時速上限 (km/h) - 預設 25 */
  maxRunAvgKmh: number;
  /** 快走平均時速上限 (km/h) - 預設 12，超過且未達 25 時提示改成跑步 */
  maxWalkAvgKmh: number;
  /** 單車平均時速上限 (km/h) - 預設 60 */
  maxCycleAvgKmh: number;
  /** 游泳每 100m 最快秒數上限 (秒) - 快於此值 (即 secPer100m < 45) 視為不合理 - 預設 45 */
  maxSwimSecPer100m: number;
  /** 重訓單組重量上限 (kg) - 預設 500 */
  maxStrengthSetKg: number;
  /** 重訓單組次數上限 (次) - 預設 100 */
  maxStrengthSetReps: number;
  /** 重訓單次訓練總組數上限 (組) - 預設 60 */
  maxStrengthSetsPerSession: number;
  /** 任何運動單筆時長上限 (小時) - 預設 12 */
  maxSessionHours: number;
  /** 任何運動單日累計總時長上限 (小時) - 預設 16 */
  maxDayTotalHours: number;
  /** 快走建議改成跑步之時速門檻 (km/h) - 預設 12 (可等於 maxWalkAvgKmh) */
  walkSuggestRunKmh: number;
}

export const DEFAULT_IMPLAUSIBLE_CAPS: ImplausibleCapsConfig = {
  maxRunAvgKmh: 25,
  maxWalkAvgKmh: 12,
  maxCycleAvgKmh: 60,
  maxSwimSecPer100m: 45, // flag when pace is FASTER than this, i.e. seconds per 100m < 45
  maxStrengthSetKg: 500,
  maxStrengthSetReps: 100,
  maxStrengthSetsPerSession: 60,
  maxSessionHours: 12,
  maxDayTotalHours: 16,
  walkSuggestRunKmh: 12,
};

/**
 * 合併自訂或測試用之覆寫上限。
 */
export function resolveImplausibleCaps(
  override?: Partial<ImplausibleCapsConfig>
): ImplausibleCapsConfig {
  if (!override) return DEFAULT_IMPLAUSIBLE_CAPS;
  return {
    ...DEFAULT_IMPLAUSIBLE_CAPS,
    ...override,
  };
}

export {
  evaluateImplausibleSession,
  formatEvaluationNumber,
  type FlagReason,
  type FlagDetail,
  type EvaluationCopy,
  type ImplausibleEvaluationResult,
  type EvaluateSessionInput,
  type EvaluateSetInput,
  type EvaluateImplausibleSessionOptions,
} from '../game/implausibleCapsEvaluator.ts';

