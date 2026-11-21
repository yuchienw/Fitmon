/**
 * FitMon 有效運動判定引擎可調設定 (T1-D1)
 *
 * 規則依據：
 * - /workspace/fitmon-tickets/T1-D1-validity-engine.md
 * - /workspace/fitmon-tickets/T1-daily-checkin-economy.md「有效運動紀錄規則」（YuChien 11/14 11:00 定案）
 * - /workspace/fitmon-tickets/T4-D8-unwell-half-threshold.md
 * - /workspace/fitmon-tickets/T1-S1-checkin-rpc.md（第 2 階段由伺服器重跑同一套）
 *
 * 註記：
 * - 第 2 階段由 T1-S1 在伺服器用同一組鍵與預設值重算，不信任客戶端。
 */

import {
  type DayProgressConfig,
  resolveDayProgressConfig,
} from './dayProgress.ts';
import {
  type ImplausibleCapsConfig,
  resolveImplausibleCaps,
} from './implausibleCaps.ts';

export interface CheckinValidityConfig {
  /** 每日累加進度門檻設定 (T4-D5) */
  thresholds?: Partial<DayProgressConfig>;
  /** 不合理數據上限設定 (T4-D6) */
  caps?: Partial<ImplausibleCapsConfig>;
  /** 每週「我不舒服」減半最大次數 - 預設 2 (11:00 已定案) */
  unwellHalfPerWeek: number;
  /**
   * 補本週的日期是否計入本週有動天數、週條與今天 Boss 傷害倍率。
   * 待 YuChien 確認。產品與資安傾向計入（一天一次、一週最多 7 天），工單載明「先寫條件版」。
   * 預設為 true（傾向計入）。改設定即可關閉。
   * 已結算週（評估日週鍵早於 now 所在週）一律不計入週天數（資安 11:48 凍結），不受此開關影響。
   */
  countSameWeekBackfillTowardWeeklyDays: boolean;
}

export const DEFAULT_CHECKIN_VALIDITY_CONFIG: CheckinValidityConfig = {
  unwellHalfPerWeek: 2,
  countSameWeekBackfillTowardWeeklyDays: true,
};

/**
 * 合併自訂或測試用之有效性判定設定。
 */
export function resolveCheckinValidityConfig(
  override?: Partial<CheckinValidityConfig>
): CheckinValidityConfig {
  if (!override) {
    return {
      ...DEFAULT_CHECKIN_VALIDITY_CONFIG,
      thresholds: resolveDayProgressConfig(),
      caps: resolveImplausibleCaps(),
    };
  }
  return {
    ...DEFAULT_CHECKIN_VALIDITY_CONFIG,
    ...override,
    thresholds: resolveDayProgressConfig(override.thresholds),
    caps: resolveImplausibleCaps(override.caps),
  };
}
