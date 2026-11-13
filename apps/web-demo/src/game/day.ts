/**
 * FitMon Day & Week Calculation (Local Timezone)
 *
 * Rules:
 * - getLocalDayKey(now): returns local 'YYYY-MM-DD'.
 * - All "is it today / new day" checks compare day keys; never compare millisecond deltas for day changes.
 * - getWeekKey(dayKey): returns the Monday's dayKey; week = Mon–Sun local.
 * - getWeekDayKeys(dayKey): returns the 7 day keys (Mon..Sun).
 * - getNextResetAt(now): returns the next local midnight timestamp (countdown only).
 * - No anti-clock-tampering logic (demo).
 */

export function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  // Setting hour to 12 (noon) avoids Daylight Saving Time edge cases
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function getLocalDayKey(now: Date | number = Date.now()): string {
  const d = typeof now === 'number' ? new Date(now) : now;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekKey(dayKey: string): string {
  const date = parseDayKey(dayKey);
  // date.getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfWeek = (date.getDay() + 6) % 7; // Mon = 0, ..., Sun = 6
  date.setDate(date.getDate() - dayOfWeek);
  return getLocalDayKey(date);
}

export function getWeekDayKeys(dayKey: string): string[] {
  const mondayKey = getWeekKey(dayKey);
  const mondayDate = parseDayKey(mondayKey);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    keys.push(getLocalDayKey(d));
  }
  return keys;
}

export function getNextResetAt(now: Date | number = Date.now()): number {
  const d = typeof now === 'number' ? new Date(now) : now;
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return nextMidnight.getTime();
}

export function formatResetCountdown(nextResetAt: number, now: Date | number = Date.now()): string {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diffMs = Math.max(0, nextResetAt - nowMs);
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `還有 ${hours} 小時 ${mins} 分`;
}

