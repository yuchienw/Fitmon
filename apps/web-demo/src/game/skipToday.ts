/**
 * FitMon Skip Today (休息與照顧身體) Pure Module (T1-D5 / T1-D6)
 *
 * Rules:
 * - Combined secondary entry 「今天先不動・休息或不舒服」 on Today card.
 * - Options: 「我不舒服」(caring, D6) and 「今天休息」(rest, D5).
 * - Mark is irreversible: cannot un-mark or switch between rest and caring.
 * - If user works out after marking rest, valid workout still checks in and grants rewards (checkedIn wins).
 * - Teammate privacy (資安 T3-D5 Q19): Sender always sees the same 「約一起打 Boss」
 *   and the receiver filters silently. Health, rest, caring, and unwell status are
 *   strictly private to the user and never exposed to teammates or public views.
 */

import { getLocalDayKey } from './day.ts';

export type SkipTodayKind = 'rest' | 'caring';

export interface SkipTodayStateInput {
  restDayKeys?: string[] | null;
  caringDayKeys?: string[] | null;
}

/**
 * 取得指定日期的跳過狀態 ('rest' | 'caring' | null)。
 * 若兩者皆存在（異常邊界情況），caring 優先。
 */
export function getSkipTodayStatus(
  state: SkipTodayStateInput,
  dayKey: string
): 'rest' | 'caring' | null {
  if (!dayKey) return null;
  if (Array.isArray(state?.caringDayKeys) && state.caringDayKeys.includes(dayKey)) {
    return 'caring';
  }
  if (Array.isArray(state?.restDayKeys) && state.restDayKeys.includes(dayKey)) {
    return 'rest';
  }
  return null;
}

/**
 * 判定 Today 卡是否可顯示「今天先不動」入口 (spec §2.1)：
 * 僅在 cardState 為 'idle' 或 'progress'（尚未打卡）且尚未標記休息或照顧 (status === null) 時顯示。
 * 已打卡、已出擊、已是休息日或照顧身體中皆不顯示。
 */
export function canShowSkipEntry(params: {
  cardState: string;
  status: 'rest' | 'caring' | null;
}): boolean {
  if (params.status !== null) {
    return false;
  }
  return params.cardState === 'idle' || params.cardState === 'progress';
}

/**
 * 寫入當日休息或照顧身體標記（純函式）。
 * 回傳單一陣列 patch ({ restDayKeys: [...] } 或 { caringDayKeys: [...] })，
 * 或在以下情況回傳 null：
 * 1. 當天已標記為 rest 或 caring（不可切換、不可取消）。
 * 2. opts.checkedIn 為 true（當日已打卡）。
 * 3. dayKey 為空。
 *
 * 絕不更動 coins、exp 或其他非相關欄位。
 */
export function markSkipToday(
  state: SkipTodayStateInput,
  kind: SkipTodayKind,
  dayKey: string,
  opts?: { checkedIn?: boolean }
): { restDayKeys: string[] } | { caringDayKeys: string[] } | null {
  if (opts?.checkedIn) {
    return null;
  }
  if (!dayKey) {
    return null;
  }

  const isAlreadyRest = Boolean(Array.isArray(state?.restDayKeys) && state.restDayKeys.includes(dayKey));
  const isAlreadyCaring = Boolean(Array.isArray(state?.caringDayKeys) && state.caringDayKeys.includes(dayKey));
  if (isAlreadyRest || isAlreadyCaring) {
    return null;
  }

  if (kind === 'rest') {
    const existing = Array.isArray(state?.restDayKeys) ? state.restDayKeys : [];
    const updated = Array.from(new Set([...existing, dayKey]));
    return { restDayKeys: updated };
  }

  if (kind === 'caring') {
    const existing = Array.isArray(state?.caringDayKeys) ? state.caringDayKeys : [];
    const updated = Array.from(new Set([...existing, dayKey]));
    return { caringDayKeys: updated };
  }

  return null;
}

/**
 * 取得收件端靜默過濾旗標：
 * 將存檔中的真實標記與開發環境的 devRecipientNotifyDemo 模擬開關進行 OR 合併。
 */
export function getRecipientSkipFlags(
  state: SkipTodayStateInput,
  dayKey: string,
  devDemo?: { isRestDay?: boolean; isCaringForBody?: boolean }
): { isRestDay: boolean; isCaringForBody: boolean } {
  const isRest = Boolean(Array.isArray(state?.restDayKeys) && state.restDayKeys.includes(dayKey));
  const isCaring = Boolean(Array.isArray(state?.caringDayKeys) && state.caringDayKeys.includes(dayKey));
  return {
    isRestDay: isRest || Boolean(devDemo?.isRestDay),
    isCaringForBody: isCaring || Boolean(devDemo?.isCaringForBody),
  };
}

/**
 * 隊友公開狀態（資安 T3-D5 Q19 / T1-D5 / T1-D6）：
 * - 發送方永遠看到相同的「約一起打 Boss」，收件端靜靜濾掉，回應與成功一模一樣。
 * - 公開畫面僅取決於隊友是否已完成運動 (hasWorkedOutToday)。
 * - 任何個人私密欄位（isRestDay, isCaringForBody, restDayKeys, caringDayKeys, unwellCount 等）
 *   一律被忽略，絕不複製至回傳結果中。
 */
export function getTeammatePublicStatus<T extends { hasWorkedOutToday?: boolean } = { hasWorkedOutToday?: boolean; [k: string]: unknown }>(
  member: T
): { worked: boolean; label: '還沒動' | null } {
  const worked = Boolean(member?.hasWorkedOutToday);
  return {
    worked,
    label: worked ? null : '還沒動',
  };
}

/**
 * 遮蔽隊友週曆狀態（資安 T3-D5 Q19）：
 * - 若未完成打卡，即使當日是休息日、照顧身體中或有身體不適次數，
 *   在隊友端一律遮蔽為 'not_yet'（顯示為「還沒動」）。
 * - 回傳物件嚴格僅包含 dayKey 與 status 兩個欄位。
 */
export function maskTeammateWeekDays(
  days: {
    dayKey: string;
    checkedIn: boolean;
    isRest?: boolean;
    isCaring?: boolean;
    unwellCount?: number;
  }[]
): { dayKey: string; status: 'done' | 'not_yet' }[] {
  if (!Array.isArray(days)) return [];
  return days.map((d) => ({
    dayKey: d.dayKey,
    status: d.checkedIn ? 'done' : 'not_yet',
  }));
}
