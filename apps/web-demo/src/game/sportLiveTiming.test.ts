import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeActiveDurationSec,
  type PauseSegment,
} from './sportLiveTiming.ts';

/**
 * T4-D4 非重訓即時計時純函式單元測試
 *
 * 規格依據：
 * 1. 依真實經過時間 (wall-clock) 計算，背景分頁或時鐘快轉不失真
 * 2. 11 分鐘經過 → 660 秒
 * 3. 中間暫停 2 分鐘排除不計
 * 4. 處於暫停中的開口暫停 (open pause) 不持續累計
 * 5. 永不為負數 (never negative)
 */

describe('T4-D4 非重訓即時計時 computeActiveDurationSec', () => {
  const BASE_START = 1_700_000_000_000; // 基準毫秒時間戳

  test('11 分鐘經過 → 660 秒（無暫停）', () => {
    const elevenMinutesMs = 11 * 60 * 1000;
    const now = BASE_START + elevenMinutesMs;

    const duration = computeActiveDurationSec({
      startedAt: BASE_START,
      now,
      pauseSegments: [],
      currentPauseStartedAt: null,
    });

    assert.equal(duration, 660);
  });

  test('中間暫停 2 分鐘不計入時長：11 分鐘總時間 - 2 分鐘暫停 = 540 秒 (9 分鐘)', () => {
    const elevenMinutesMs = 11 * 60 * 1000;
    const now = BASE_START + elevenMinutesMs;

    // 於第 3 分鐘開始暫停，第 5 分鐘恢復（暫停 2 分鐘 = 120 秒）
    const pauseSegments: PauseSegment[] = [
      {
        startedAt: BASE_START + 3 * 60 * 1000,
        endedAt: BASE_START + 5 * 60 * 1000,
      },
    ];

    const duration = computeActiveDurationSec({
      startedAt: BASE_START,
      now,
      pauseSegments,
      currentPauseStartedAt: null,
    });

    assert.equal(duration, 540);
  });

  test('多段已完成暫停皆被排除', () => {
    const totalMs = 20 * 60 * 1000; // 20 分鐘
    const now = BASE_START + totalMs;

    // 第 2~4 分鐘暫停 (2 分鐘)，第 8~11 分鐘暫停 (3 分鐘) -> 總暫停 5 分鐘
    const pauseSegments: PauseSegment[] = [
      {
        startedAt: BASE_START + 2 * 60 * 1000,
        endedAt: BASE_START + 4 * 60 * 1000,
      },
      {
        startedAt: BASE_START + 8 * 60 * 1000,
        endedAt: BASE_START + 11 * 60 * 1000,
      },
    ];

    const duration = computeActiveDurationSec({
      startedAt: BASE_START,
      now,
      pauseSegments,
      currentPauseStartedAt: null,
    });

    // 20 - 5 = 15 分鐘 = 900 秒
    assert.equal(duration, 900);
  });

  test('開口暫停 (open pause)：處於暫停中時，時間不再持續累加，鎖定在暫停當下的時長', () => {
    // 運動進行 5 分鐘後按暫停 (300 秒)
    const pauseStartTime = BASE_START + 5 * 60 * 1000;

    // 1. 剛按暫停當下 (now = pauseStartTime)
    const atPause = computeActiveDurationSec({
      startedAt: BASE_START,
      now: pauseStartTime,
      pauseSegments: [],
      currentPauseStartedAt: pauseStartTime,
    });
    assert.equal(atPause, 300);

    // 2. 暫停經過 2 分鐘後 (now = 7 分鐘)
    const twoMinLater = computeActiveDurationSec({
      startedAt: BASE_START,
      now: pauseStartTime + 2 * 60 * 1000,
      pauseSegments: [],
      currentPauseStartedAt: pauseStartTime,
    });
    assert.equal(twoMinLater, 300, '暫停經過 2 分鐘後仍維持 300 秒，不可繼續算');

    // 3. 暫停經過 20 分鐘後 (now = 25 分鐘)
    const twentyMinLater = computeActiveDurationSec({
      startedAt: BASE_START,
      now: pauseStartTime + 20 * 60 * 1000,
      pauseSegments: [],
      currentPauseStartedAt: pauseStartTime,
    });
    assert.equal(twentyMinLater, 300, '暫停經過 20 分鐘後仍維持 300 秒');
  });

  test('開口暫停與既有已完成暫停疊加：正確扣除所有暫停', () => {
    // 既有暫停 1 分鐘 (第 1~2 分鐘)
    const pauseSegments: PauseSegment[] = [
      {
        startedAt: BASE_START + 1 * 60 * 1000,
        endedAt: BASE_START + 2 * 60 * 1000,
      },
    ];
    // 第 6 分鐘再度暫停（運動有效時間 = 6 - 1 = 5 分鐘 = 300 秒）
    const secondPauseStart = BASE_START + 6 * 60 * 1000;

    // 第 10 分鐘時（再度經過 4 分鐘開口暫停）
    const duration = computeActiveDurationSec({
      startedAt: BASE_START,
      now: BASE_START + 10 * 60 * 1000,
      pauseSegments,
      currentPauseStartedAt: secondPauseStart,
    });

    assert.equal(duration, 300);
  });

  test('永不為負數 (never negative)', () => {
    // 1. now 早於 startedAt（時鐘倒退或異常）
    const negativeTime = computeActiveDurationSec({
      startedAt: BASE_START,
      now: BASE_START - 10_000,
      pauseSegments: [],
      currentPauseStartedAt: null,
    });
    assert.equal(negativeTime, 0);

    // 2. startedAt 為 0、負數或無效值
    assert.equal(
      computeActiveDurationSec({
        startedAt: 0,
        now: BASE_START,
      }),
      0
    );
    assert.equal(
      computeActiveDurationSec({
        startedAt: -100,
        now: BASE_START,
      }),
      0
    );
    assert.equal(
      computeActiveDurationSec({
        startedAt: NaN,
        now: BASE_START,
      }),
      0
    );

    // 3. 暫停長度超過總時間（異常資料）
    const overPaused = computeActiveDurationSec({
      startedAt: BASE_START,
      now: BASE_START + 10_000,
      pauseSegments: [
        {
          startedAt: BASE_START,
          endedAt: BASE_START + 50_000,
        },
      ],
    });
    assert.equal(overPaused, 0);

    // 4. now 等於 startedAt
    const zeroElapsed = computeActiveDurationSec({
      startedAt: BASE_START,
      now: BASE_START,
    });
    assert.equal(zeroElapsed, 0);
  });

  test('無條件捨去至整數秒 (floor seconds)', () => {
    // 10 秒 900 毫秒 -> 應為 10 秒，而非四捨五入成 11 秒
    const subSecond = computeActiveDurationSec({
      startedAt: BASE_START,
      now: BASE_START + 10_900,
    });
    assert.equal(subSecond, 10);

    // 剛滿 11 秒整
    const exact = computeActiveDurationSec({
      startedAt: BASE_START,
      now: BASE_START + 11_000,
    });
    assert.equal(exact, 11);
  });

  test('預設參數行為：未傳入 now 時使用 Date.now()，未傳入 pauseSegments 時視為空陣列', () => {
    const startedAt = Date.now() - 5000;
    const duration = computeActiveDurationSec({ startedAt });
    // 經過約 5 秒 (5 或 6 秒)
    assert.ok(duration >= 4 && duration <= 6);
  });
});
