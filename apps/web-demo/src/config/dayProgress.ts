/**
 * FitMon 當日累積進度門檻可調設定 (T4-D5)
 *
 * 預設值於 YuChien 11/14 11:00 定案（經幕僚長）。
 * 設定集中於此處，第 2 階段由伺服器用同一組鍵與預設值重算，不信任客戶端。
 */

export interface DayProgressConfig {
  /** 每日有效運動時長門檻 (分鐘) - 預設 10 */
  minMinutes: number;
  /** 跑步／快走單日有效距離門檻 (公里) - 預設 1 (兩者分開算) */
  runWalkMinKm: number;
  /** 游泳單日有效距離門檻 (公尺) - 預設 200 */
  swimMinM: number;
  /** 單車單日有效距離門檻 (公里) - 預設 3 */
  cycleMinKm: number;
  /** 重訓／徒手有效組數門檻 (組) - 預設 2 */
  strengthMinSets: number;
  /**
   * 補記重訓組數折算分鐘常數 (分鐘/組) - 預設 2
   * 只用在補記且沒有每組時間 (timingIncomplete) 的重訓／徒手。
   * 即時紀錄一律用實際時長並扣掉 >10 分鐘暫停。
   * 常數尚未經教練單獨逐字確認，做成可調設定並列入 T4-D5-DECISIONS.md。
   */
  strengthSetToMinutes: number;
  /** 重訓有效組間隔門檻 (秒) - 預設 20 */
  minRestGapSec: number;
  /** 重訓有效休息佔比門檻 - 預設 0.25 (25%) */
  minRestShare: number;
  /** 暫停扣除門檻 (分鐘) - 單次間隔大於此值 (嚴格大於 600 秒) 視為暫停 - 預設 10 */
  pauseGapMin: number;
}

export const DEFAULT_DAY_PROGRESS_CONFIG: DayProgressConfig = {
  minMinutes: 10,
  runWalkMinKm: 1,
  swimMinM: 200,
  cycleMinKm: 3,
  strengthMinSets: 2,
  strengthSetToMinutes: 2,
  minRestGapSec: 20,
  minRestShare: 0.25,
  pauseGapMin: 10,
};

/**
 * 合併自訂或測試用之覆寫門檻設定。
 */
export function resolveDayProgressConfig(
  override?: Partial<DayProgressConfig>
): DayProgressConfig {
  if (!override) return DEFAULT_DAY_PROGRESS_CONFIG;
  return {
    ...DEFAULT_DAY_PROGRESS_CONFIG,
    ...override,
  };
}
