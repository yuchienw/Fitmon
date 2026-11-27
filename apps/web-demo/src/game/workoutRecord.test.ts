import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  mapLegacyExerciseToSportType,
  isLoggedSetTimingComplete,
  isWorkoutSessionTimingComplete,
  computePersistedSetFields,
  finalizePreviousSetRest,
  selectIsRestDay,
  selectUnwellHalfUsed,
  selectSelfCheckCompleted,
  selectOnboardingCompleted,
  selectOnboardingWorkoutHintSeen,
  selectOnboardingSortieHintSeen,
  formatExerciseLogSummary,
  getSetDisplayAmount,
} from './workoutRecord.ts';

describe('WorkoutRecord Pure Functions & Selectors (T4-D1)', () => {
  describe('mapLegacyExerciseToSportType', () => {
    test('maps 9 strength catalog exercises to strength', () => {
      const strengthIds = [
        'barbell_squat',
        'barbell_bench_press',
        'conventional_deadlift',
        'overhead_press',
        'pull_ups',
        'barbell_row',
        'leg_press',
        'lateral_raise',
        'dumbbell_curl',
        'lat_pulldown',
      ];
      for (const id of strengthIds) {
        assert.equal(
          mapLegacyExerciseToSportType(id, 'kg'),
          'strength',
          `Expected ${id} to map to strength`
        );
      }
    });

    test('maps cardio_incline_run and legacy treadmill_run to run', () => {
      assert.equal(mapLegacyExerciseToSportType('cardio_incline_run', 'km'), 'run');
      assert.equal(mapLegacyExerciseToSportType('treadmill_run', '分鐘'), 'run');
    });

    test('maps cardio_hiit_bike to cycle', () => {
      assert.equal(mapLegacyExerciseToSportType('cardio_hiit_bike', 'km'), 'cycle');
    });

    test('maps bw_plank_core to bodyweight', () => {
      assert.equal(mapLegacyExerciseToSportType('bw_plank_core', '秒'), 'bodyweight');
    });

    test('infers run when unitLabel is km for unknown id', () => {
      assert.equal(mapLegacyExerciseToSportType('unknown_outdoor_trail', 'km'), 'run');
    });

    test('infers bodyweight when unitLabel is 秒 for unknown id', () => {
      assert.equal(mapLegacyExerciseToSportType('unknown_core_hold', '秒'), 'bodyweight');
    });

    test('defaults to strength for unknown id and undefined/other unitLabel', () => {
      assert.equal(mapLegacyExerciseToSportType('unknown_gym_machine', 'kg'), 'strength');
      assert.equal(mapLegacyExerciseToSportType(undefined, undefined), 'strength');
      assert.equal(mapLegacyExerciseToSportType(null, null), 'strength');
    });
  });

  describe('isLoggedSetTimingComplete', () => {
    test('returns true when startedAt and completedAt are valid finite numbers and timingIncomplete is false', () => {
      assert.equal(
        isLoggedSetTimingComplete({
          startedAt: 1000,
          completedAt: 1045,
          timingIncomplete: false,
        }),
        true
      );
    });

    test('returns false when startedAt is missing, zero, or negative', () => {
      assert.equal(isLoggedSetTimingComplete({ completedAt: 1045 }), false);
      assert.equal(isLoggedSetTimingComplete({ startedAt: 0, completedAt: 1045 }), false);
      assert.equal(isLoggedSetTimingComplete({ startedAt: -10, completedAt: 1045 }), false);
    });

    test('returns false when completedAt is earlier than startedAt', () => {
      assert.equal(isLoggedSetTimingComplete({ startedAt: 1045, completedAt: 1000 }), false);
    });

    test('returns false when timingIncomplete is explicitly true', () => {
      assert.equal(
        isLoggedSetTimingComplete({
          startedAt: 1000,
          completedAt: 1045,
          timingIncomplete: true,
        }),
        false
      );
    });
  });

  describe('isWorkoutSessionTimingComplete', () => {
    test('returns true for session with all sets timing complete and non-last sets having rest', () => {
      const session = {
        timingIncomplete: false,
        exerciseLogs: [
          {
            sets: [
              {
                startedAt: 1000,
                completedAt: 1040,
                restTimerElapsedSec: 90,
                timingIncomplete: false,
              },
              {
                startedAt: 1130,
                completedAt: 1170,
                restTimerElapsedSec: 90,
                timingIncomplete: false,
              },
              {
                // Last set: trailing rest may be omitted
                startedAt: 1260,
                completedAt: 1300,
                timingIncomplete: false,
              },
            ],
          },
        ],
      };
      assert.equal(isWorkoutSessionTimingComplete(session), true);
    });

    test('returns false if session is marked timingIncomplete', () => {
      const session = {
        timingIncomplete: true,
        exerciseLogs: [
          {
            sets: [{ startedAt: 1000, completedAt: 1040, timingIncomplete: false }],
          },
        ],
      };
      assert.equal(isWorkoutSessionTimingComplete(session), false);
    });

    test('returns false if intermediate set lacks restTimerElapsedSec', () => {
      const session = {
        timingIncomplete: false,
        exerciseLogs: [
          {
            sets: [
              {
                startedAt: 1000,
                completedAt: 1040,
                // Missing restTimerElapsedSec on set 1
                timingIncomplete: false,
              },
              {
                startedAt: 1130,
                completedAt: 1170,
                timingIncomplete: false,
              },
            ],
          },
        ],
      };
      assert.equal(isWorkoutSessionTimingComplete(session), false);
    });

    test('returns false if any set lacks startedAt', () => {
      const session = {
        timingIncomplete: false,
        exerciseLogs: [
          {
            sets: [{ completedAt: 1040, timingIncomplete: false }],
          },
        ],
      };
      assert.equal(isWorkoutSessionTimingComplete(session), false);
    });

    test('returns false for empty session or malformed session', () => {
      assert.equal(isWorkoutSessionTimingComplete(null as any), false);
      assert.equal(isWorkoutSessionTimingComplete({ exerciseLogs: [] }), false);
      assert.equal(isWorkoutSessionTimingComplete({ exerciseLogs: [{ sets: [] }] }), false);
    });
  });

  describe('computePersistedSetFields', () => {
    test('stores distanceM = km * 1000 and weightKg = 0 for cardio (km)', () => {
      const res = computePersistedSetFields(5, 'km');
      assert.equal(res.weightKg, 0);
      assert.equal(res.distanceM, 5000);
      assert.equal(res.durationSec, undefined);

      const floatRes = computePersistedSetFields(4.25, 'km');
      assert.equal(floatRes.weightKg, 0);
      assert.equal(floatRes.distanceM, 4250);
    });

    test('stores durationSec = seconds and weightKg = 0 for hold/isometric (秒)', () => {
      const res = computePersistedSetFields(60, '秒');
      assert.equal(res.weightKg, 0);
      assert.equal(res.durationSec, 60);
      assert.equal(res.distanceM, undefined);
    });

    test('persists weightKg directly for strength (kg)', () => {
      const res = computePersistedSetFields(85, 'kg');
      assert.equal(res.weightKg, 85);
      assert.equal(res.distanceM, undefined);
      assert.equal(res.durationSec, undefined);
    });
  });

  describe('finalizePreviousSetRest', () => {
    test('computes wall-clock elapsed from restStartedAt when completed naturally', () => {
      const prevSet = { id: 's1', restSec: 90 };
      const restStartedAt = 100000;
      const now = 190000; // 90s later
      const finalized = finalizePreviousSetRest(prevSet, restStartedAt, now, true);

      assert.equal(finalized.restTimerElapsedSec, 90);
      assert.equal(finalized.startedEarly, false);
    });

    test('computes wall-clock elapsed and sets startedEarly = true when skipped early', () => {
      const prevSet = { id: 's1', restSec: 90 };
      const restStartedAt = 100000;
      const now = 135000; // 35s later
      const finalized = finalizePreviousSetRest(prevSet, restStartedAt, now, false);

      assert.equal(finalized.restTimerElapsedSec, 35);
      assert.equal(finalized.startedEarly, true);
    });

    test('handles immediate skip (elapsed 0s) cleanly with startedEarly = true', () => {
      const prevSet = { id: 's1', restSec: 90 };
      const restStartedAt = 100000;
      const now = 100000; // 0s
      const finalized = finalizePreviousSetRest(prevSet, restStartedAt, now, false);

      assert.equal(finalized.restTimerElapsedSec, 0);
      assert.equal(finalized.startedEarly, true);
    });
  });

  describe('T1 & T5 Selectors', () => {
    test('selectIsRestDay checks restDayKeys array', () => {
      assert.equal(selectIsRestDay({ restDayKeys: ['2026-11-21'] }, '2026-11-21'), true);
      assert.equal(selectIsRestDay({ restDayKeys: ['2026-11-21'] }, '2026-11-22'), false);
      assert.equal(selectIsRestDay({ restDayKeys: null }, '2026-11-21'), false);
    });

    test('selectUnwellHalfUsed retrieves weekly count or 0', () => {
      assert.equal(
        selectUnwellHalfUsed({ unwellHalfUsedByWeek: { '2026-W47': 2 } }, '2026-W47'),
        2
      );
      assert.equal(
        selectUnwellHalfUsed({ unwellHalfUsedByWeek: { '2026-W47': 2 } }, '2026-W48'),
        0
      );
      assert.equal(selectUnwellHalfUsed({ unwellHalfUsedByWeek: null }, '2026-W47'), 0);
    });

    test('selectSelfCheckCompleted returns true only for non-empty string', () => {
      assert.equal(selectSelfCheckCompleted({ selfCheckCompletedAt: '2026-11-21' }), true);
      assert.equal(selectSelfCheckCompleted({ selfCheckCompletedAt: null }), false);
      assert.equal(selectSelfCheckCompleted({ selfCheckCompletedAt: '' }), false);
      assert.equal(selectSelfCheckCompleted({}), false);
    });

    test('selectOnboardingCompleted returns true only for non-empty string', () => {
      assert.equal(selectOnboardingCompleted({ onboardingCompletedAt: '2026-11-20' }), true);
      assert.equal(selectOnboardingCompleted({ onboardingCompletedAt: null }), false);
      assert.equal(selectOnboardingCompleted({ onboardingCompletedAt: '' }), false);
      assert.equal(selectOnboardingCompleted({ onboardingCompletedAt: '   ' }), false);
      assert.equal(selectOnboardingCompleted({}), false);
    });

    test('selectOnboardingWorkoutHintSeen returns true only for non-empty string', () => {
      assert.equal(
        selectOnboardingWorkoutHintSeen({ onboardingWorkoutHintSeenAt: '2026-11-20T10:00:00Z' }),
        true
      );
      assert.equal(selectOnboardingWorkoutHintSeen({ onboardingWorkoutHintSeenAt: null }), false);
      assert.equal(selectOnboardingWorkoutHintSeen({ onboardingWorkoutHintSeenAt: '' }), false);
      assert.equal(selectOnboardingWorkoutHintSeen({ onboardingWorkoutHintSeenAt: '   ' }), false);
      assert.equal(selectOnboardingWorkoutHintSeen({}), false);
    });

    test('selectOnboardingSortieHintSeen returns true only for non-empty string', () => {
      assert.equal(
        selectOnboardingSortieHintSeen({ onboardingSortieHintSeenAt: '2026-11-20T11:00:00Z' }),
        true
      );
      assert.equal(selectOnboardingSortieHintSeen({ onboardingSortieHintSeenAt: null }), false);
      assert.equal(selectOnboardingSortieHintSeen({ onboardingSortieHintSeenAt: '' }), false);
      assert.equal(selectOnboardingSortieHintSeen({ onboardingSortieHintSeenAt: '   ' }), false);
      assert.equal(selectOnboardingSortieHintSeen({}), false);
    });
  });

  describe('formatExerciseLogSummary', () => {
    test('新跑步／快走：unitLabel: "km", weightKg: 0, distanceM: 10000 -> 摘要含 "10km", 不是 "0km"', () => {
      const summary = formatExerciseLogSummary({
        unitLabel: 'km',
        sets: [{ weightKg: 0, distanceM: 10000 }],
      });
      assert.equal(summary, '1組 · 10km');
      assert.match(summary, /10km/);
      assert.notEqual(summary, '1組 · 0km');
      assert.doesNotMatch(summary, /(^|[^\d])0km/);
    });

    test('新棒式：unitLabel: "秒", weightKg: 0, durationSec: 45 -> 摘要含 "45秒", 不是 "0秒"', () => {
      const summary = formatExerciseLogSummary({
        unitLabel: '秒',
        sets: [{ weightKg: 0, durationSec: 45 }],
      });
      assert.equal(summary, '1組 · 45秒');
      assert.match(summary, /45秒/);
      assert.doesNotMatch(summary, /0秒/);
    });

    test('舊列後退：unitLabel: "km", weightKg: 5, 沒有 distanceM -> 仍顯示 "5km"', () => {
      const summary = formatExerciseLogSummary({
        unitLabel: 'km',
        sets: [{ weightKg: 5 }],
      });
      assert.equal(summary, '1組 · 5km');
    });

    test('舊棒式：unitLabel: "秒", weightKg: 60, 沒有 durationSec -> 仍顯示 "60秒"', () => {
      const summary = formatExerciseLogSummary({
        unitLabel: '秒',
        sets: [{ weightKg: 60 }],
      });
      assert.equal(summary, '1組 · 60秒');
    });

    test('重訓：unitLabel 為 kg 之類、weightKg: 100 -> 仍顯示最大重量，例如 "4組 · 100kg"', () => {
      const summary = formatExerciseLogSummary({
        unitLabel: 'kg',
        sets: [
          { weightKg: 70 },
          { weightKg: 100 },
          { weightKg: 90 },
          { weightKg: 80 },
        ],
      });
      assert.equal(summary, '4組 · 100kg');
    });

    test('空組時不讓 Math.max 變成 -Infinity，回傳合理後備 (0組 或 0組 · 0{unit})', () => {
      assert.equal(formatExerciseLogSummary({ unitLabel: 'km', sets: [] }), '0組 · 0km');
      assert.equal(formatExerciseLogSummary({ unitLabel: 'kg', sets: [] }), '0組 · 0kg');
      assert.equal(formatExerciseLogSummary({ unitLabel: '', sets: [] }), '0組');
      assert.equal(formatExerciseLogSummary({ sets: [] }), '0組');
      assert.equal(formatExerciseLogSummary(null), '0組');
      assert.equal(formatExerciseLogSummary(undefined), '0組');
    });

    test('適度去掉多餘小數 (例如 6.5、10)', () => {
      const res1 = formatExerciseLogSummary({
        unitLabel: 'km',
        sets: [{ weightKg: 0, distanceM: 6500 }],
      });
      assert.equal(res1, '1組 · 6.5km');

      const res2 = formatExerciseLogSummary({
        unitLabel: 'km',
        sets: [{ weightKg: 0, distanceM: 10000 }],
      });
      assert.equal(res2, '1組 · 10km');
    });

    test('支援 分鐘 與 公尺/m 單位及其舊列後退', () => {
      // 新分鐘
      const minNew = formatExerciseLogSummary({
        unitLabel: '分鐘',
        sets: [{ weightKg: 0, durationSec: 1800 }],
      });
      assert.equal(minNew, '1組 · 30分鐘');

      // 舊分鐘
      const minOld = formatExerciseLogSummary({
        unitLabel: '分鐘',
        sets: [{ weightKg: 20 }],
      });
      assert.equal(minOld, '1組 · 20分鐘');

      // 新公尺
      const mNew = formatExerciseLogSummary({
        unitLabel: '公尺',
        sets: [{ weightKg: 0, distanceM: 500 }],
      });
      assert.equal(mNew, '1組 · 500公尺');

      // 新 m
      const mLetterNew = formatExerciseLogSummary({
        unitLabel: 'm',
        sets: [{ weightKg: 0, distanceM: 400 }],
      });
      assert.equal(mLetterNew, '1組 · 400m');

      // 舊公尺
      const mOld = formatExerciseLogSummary({
        unitLabel: '公尺',
        sets: [{ weightKg: 300 }],
      });
      assert.equal(mOld, '1組 · 300公尺');
    });

    test('多組取各組顯示量後取 max', () => {
      const multiRun = formatExerciseLogSummary({
        unitLabel: 'km',
        sets: [
          { weightKg: 0, distanceM: 3000 },
          { weightKg: 0, distanceM: 5000 },
        ],
      });
      assert.equal(multiRun, '2組 · 5km');

      const multiPlank = formatExerciseLogSummary({
        unitLabel: '秒',
        sets: [
          { weightKg: 0, durationSec: 30 },
          { weightKg: 0, durationSec: 60 },
          { weightKg: 0, durationSec: 45 },
        ],
      });
      assert.equal(multiPlank, '3組 · 60秒');
    });
  });
});
