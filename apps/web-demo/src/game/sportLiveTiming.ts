/**
 * 非重訓即時紀錄計時計算純函式 (T4-D4)
 *
 * 依真實經過時間計算有效運動時長（秒）：
 * - 累計時長 = now - startedAt - completed pause lengths - open pause (if currentPauseStartedAt is set)
 * - 取 floor 秒數，永不為負數 (never negative)
 * - 暫停期間不列入時長
 */

export interface PauseSegment {
  startedAt: number;
  endedAt: number;
}

export interface ComputeActiveDurationOptions {
  startedAt: number;
  now?: number;
  pauseSegments?: Array<{ startedAt: number; endedAt: number }>;
  currentPauseStartedAt?: number | null;
}

export function computeActiveDurationSec({
  startedAt,
  now = Date.now(),
  pauseSegments = [],
  currentPauseStartedAt = null,
}: ComputeActiveDurationOptions): number {
  if (!startedAt || startedAt <= 0) {
    return 0;
  }

  const completedPauseMs = pauseSegments.reduce((sum, seg) => {
    if (typeof seg.startedAt === 'number' && typeof seg.endedAt === 'number') {
      return sum + Math.max(0, seg.endedAt - seg.startedAt);
    }
    return sum;
  }, 0);

  const openPauseMs =
    typeof currentPauseStartedAt === 'number' && currentPauseStartedAt > 0
      ? Math.max(0, now - currentPauseStartedAt)
      : 0;

  const totalElapsedMs = now - startedAt;
  const activeMs = totalElapsedMs - completedPauseMs - openPauseMs;

  if (activeMs <= 0 || isNaN(activeMs)) {
    return 0;
  }

  return Math.floor(activeMs / 1000);
}
