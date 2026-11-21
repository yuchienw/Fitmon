import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  evaluateStrengthSessionTiming,
  sortSetsChronologically,
  PAUSE_THRESHOLD_SEC,
  MIN_INTERVAL_SEC_FOR_QUALIFIED,
  MIN_REST_SHARE_FOR_VALIDITY,
  MIN_SET_COUNT_FOR_VALIDITY,
  type EvaluatedSet,
} from './strengthSessionTiming.ts';

describe('StrengthSessionTiming Pure Functions & Evaluator (T4-D2)', () => {
  describe('Constants check', () => {
    test('constants match ticket specification', () => {
      assert.equal(PAUSE_THRESHOLD_SEC, 600); // 10 minutes strictly greater
      assert.equal(MIN_INTERVAL_SEC_FOR_QUALIFIED, 20); // 20s
      assert.equal(MIN_REST_SHARE_FOR_VALIDITY, 0.25); // 25%
      assert.equal(MIN_SET_COUNT_FOR_VALIDITY, 2); // 2 sets
    });
  });

  describe('Official Examples (T1 / T4 Table Alignment)', () => {
    // 1. General: 10 sets, ~45s work each (7.5 min work), 22.5 min rest, share 75% → passed
    test('1. General: 10 sets, ~45s work each (7.5 min work), 22.5 min rest, share 75% -> passed', () => {
      const baseMs = 1_700_000_000_000;
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 45 * 1000; // 45s
      const restMs = 150 * 1000; // 150s (2.5 min * 9 = 22.5 min)

      for (let i = 0; i < 10; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 9;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : 150,
          timingIncomplete: false,
        });
        cursor = completedAt + restMs;
      }

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res.timingIncomplete, false);
      assert.equal(res.appliesThreeConditions, true);
      assert.equal(res.pauseSegments.length, 0);
      assert.equal(res.totalDurationSec, 1800); // 450s work + 1350s rest = 1800s (30 min)
      assert.equal(res.restSec, 1350); // 22.5 min
      assert.ok(typeof res.restShare === 'number');
      assert.equal(Math.round(res.restShare * 100) / 100, 0.75);
      assert.deepEqual(res.conditions, {
        atLeastTwoSets: true,
        halfIntervalsAtLeast20s: true,
        restShareAtLeast25: true,
      });
      assert.equal(res.passed, true);
    });

    // 2. Heavy: 6 sets, ~30s work, 4–5 min rest each, share ~90% → passed (no upper bound)
    test('2. Heavy: 6 sets, ~30s work, 4-5 min rest each, share ~90% -> passed (no upper bound)', () => {
      const baseMs = 1_700_000_000_000;
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 30 * 1000; // 30s
      const restSec = 270; // 4.5 min rest = 270s (<= 600s, not a pause)
      const restMs = restSec * 1000;

      for (let i = 0; i < 6; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 5;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : restSec,
          timingIncomplete: false,
        });
        cursor = completedAt + restMs;
      }

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res.timingIncomplete, false);
      assert.equal(res.appliesThreeConditions, true);
      assert.equal(res.pauseSegments.length, 0);
      // 6 * 30s work = 180s. 5 * 270s rest = 1350s. Total = 1530s.
      assert.equal(res.totalDurationSec, 1530);
      assert.equal(res.restSec, 1350);
      assert.ok(typeof res.restShare === 'number');
      // 1350 / 1530 = 0.8824 (~88.2% rest share)
      assert.ok(res.restShare > 0.85);
      assert.equal(res.conditions?.atLeastTwoSets, true);
      assert.equal(res.conditions?.halfIntervalsAtLeast20s, true);
      assert.equal(res.conditions?.restShareAtLeast25, true);
      assert.equal(res.passed, true); // No upper bound prevents high rest share
    });

    // 3. Equipment wait: an otherwise valid session with a 15-minute gap after set 4 → that 15 min is a pause, subtracted from total duration and not included in rest; passed
    test('3. Equipment wait: an otherwise valid session with 15-min gap after set 4 -> pause subtracted from total duration and not included in rest; passed', () => {
      const baseMs = 1_700_000_000_000;
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 30 * 1000; // 30s
      const normalRestSec = 90; // 90s
      const equipmentWaitSec = 15 * 60; // 900s (15 min > 600s => pause)

      for (let i = 0; i < 6; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isSet4 = i === 3; // Index 3 is set 4
        const gapSec = isSet4 ? equipmentWaitSec : normalRestSec;
        const isLast = i === 5;

        sets.push({
          startedAt,
          completedAt,
          // Set 4's timer may record whatever elapsed or 0, but because the gap is > 600s, it must not be added to restSec
          restTimerElapsedSec: isLast ? undefined : isSet4 ? 900 : normalRestSec,
          timingIncomplete: false,
        });

        cursor = completedAt + gapSec * 1000;
      }

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res.timingIncomplete, false);
      assert.equal(res.pauseSegments.length, 1);
      // Verify pauseSegment timestamps match set 4 completedAt -> set 5 startedAt
      assert.equal(res.pauseSegments[0].startedAt, sets[3].completedAt);
      assert.equal(res.pauseSegments[0].endedAt, sets[4].startedAt);
      const pauseDuration = (res.pauseSegments[0].endedAt - res.pauseSegments[0].startedAt) / 1000;
      assert.equal(pauseDuration, 900);

      // Total duration without pause: 6 * 30s work + 4 * 90s normal rest + 900s pause = 1440s
      // With pause subtracted: 1440 - 900 = 540s
      assert.equal(res.totalDurationSec, 540);

      // restSec includes only the 4 normal rests (4 * 90s = 360s); pause gap is NOT included
      assert.equal(res.restSec, 360);

      // restShare = 360 / 540 = 0.6667 (66.7% >= 25%)
      assert.ok(typeof res.restShare === 'number');
      assert.ok(Math.abs(res.restShare - 2 / 3) < 0.001);

      assert.equal(res.conditions?.atLeastTwoSets, true);
      assert.equal(res.conditions?.halfIntervalsAtLeast20s, true);
      assert.equal(res.conditions?.restShareAtLeast25, true);
      assert.equal(res.passed, true);
    });

    // 4. Beginner: rest share ≥ 80% → passed (no upper bound)
    test('4. Beginner: rest share >= 80% -> passed (no upper bound)', () => {
      const baseMs = 1_700_000_000_000;
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 30 * 1000; // 30s
      const restSec = 180; // 3 min

      for (let i = 0; i < 4; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 3;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : restSec,
          timingIncomplete: false,
        });
        cursor = completedAt + restSec * 1000;
      }

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      // 4 * 30s = 120s work; 3 * 180s = 540s rest; total = 660s
      // restShare = 540 / 660 = 81.8%
      assert.equal(res.totalDurationSec, 660);
      assert.equal(res.restSec, 540);
      assert.ok(typeof res.restShare === 'number');
      assert.ok(res.restShare >= 0.8);
      assert.equal(res.passed, true);
    });

    // 5. Mash: 10 sets inside 2 minutes, ~5s gaps, rest share almost 0 → passed === false; still a valid function output
    test('5. Mash: 10 sets inside 2 minutes, ~5s gaps, rest share almost 0 -> passed === false; still a valid output', () => {
      const baseMs = 1_700_000_000_000;
      const sets: EvaluatedSet[] = [];
      let cursor = baseMs;
      const workMs = 7 * 1000; // 7s per set
      const gapMs = 5 * 1000; // 5s gap

      for (let i = 0; i < 10; i++) {
        const startedAt = cursor;
        const completedAt = startedAt + workMs;
        const isLast = i === 9;
        sets.push({
          startedAt,
          completedAt,
          restTimerElapsedSec: isLast ? undefined : 0, // Immediately skipped/mashed
          timingIncomplete: false,
        });
        cursor = completedAt + gapMs;
      }

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res.timingIncomplete, false);
      assert.equal(res.appliesThreeConditions, true);
      assert.equal(res.restSec, 0);
      assert.equal(res.restShare, 0);
      assert.equal(res.conditions?.atLeastTwoSets, true);
      assert.equal(res.conditions?.halfIntervalsAtLeast20s, false); // 0/9 intervals >= 20s
      assert.equal(res.conditions?.restShareAtLeast25, false); // 0% < 25%
      assert.equal(res.passed, false);
    });

    // 6. circuit_hiit (and a non-strength type such as run): appliesThreeConditions === false, passed === null, do not fail them for low rest share
    test('6. circuit_hiit and non-strength type: appliesThreeConditions === false, passed === null, do not fail for low rest share', () => {
      const baseMs = 1_700_000_000_000;
      const hiitSets: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 300_000, // 5 min
          restTimerElapsedSec: 15, // 15s rest (short transition)
          timingIncomplete: false,
        },
        {
          startedAt: baseMs + 315_000,
          completedAt: baseMs + 615_000, // 5 min
          timingIncomplete: false,
        },
      ];

      const resHiit = evaluateStrengthSessionTiming(hiitSets, {
        sportType: 'circuit_hiit',
        loggingMode: 'live_focus',
      });

      assert.equal(resHiit.timingIncomplete, false);
      assert.equal(resHiit.appliesThreeConditions, false);
      assert.equal(resHiit.conditions, undefined);
      assert.equal(resHiit.passed, null); // NOT false!
      assert.equal(resHiit.totalDurationSec, 615);
      assert.equal(resHiit.restSec, 15);

      const runSets: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 600_000,
          timingIncomplete: false,
        },
      ];

      const resRun = evaluateStrengthSessionTiming(runSets, {
        sportType: 'run',
        loggingMode: 'live_focus',
      });

      assert.equal(resRun.timingIncomplete, false);
      assert.equal(resRun.appliesThreeConditions, false);
      assert.equal(resRun.conditions, undefined);
      assert.equal(resRun.passed, null);
    });

    // 7. Missing startedAt → timingIncomplete, restShare unset, passed null
    test('7. Missing startedAt -> timingIncomplete, restShare unset, passed null', () => {
      const sets: EvaluatedSet[] = [
        {
          // startedAt missing!
          completedAt: 1045000,
          restTimerElapsedSec: 90,
          timingIncomplete: false,
        },
        {
          startedAt: 1135000,
          completedAt: 1180000,
          timingIncomplete: false,
        },
      ];

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res.timingIncomplete, true);
      assert.equal(res.restShare, undefined);
      assert.equal(res.passed, null);
      assert.equal(res.conditions, undefined);
    });

    // 8. Early-start rest: restTimerElapsedSec of 20s (not 0, not the planned 90s) is what gets summed
    test('8. Early-start rest: restTimerElapsedSec of 20s (not 0, not planned 90s) is summed', () => {
      const baseMs = 1_700_000_000_000;
      const sets: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 45_000,
          restTimerElapsedSec: 20, // Started early after 20s (planned was 90)
          timingIncomplete: false,
        },
        {
          startedAt: baseMs + 65_000, // 20s after set 1 completed
          completedAt: baseMs + 110_000,
          timingIncomplete: false,
        },
      ];

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res.timingIncomplete, false);
      assert.equal(res.restSec, 20); // Exact 20s summed
      assert.equal(res.totalDurationSec, 110);
      assert.equal(res.conditions?.halfIntervalsAtLeast20s, true); // 20s is >= 20s
    });

    // 9. Immediate skip: restTimerElapsedSec 0, and if all gaps are 0 the three conditions fail
    test('9. Immediate skip: restTimerElapsedSec 0, and if all gaps are 0 the three conditions fail', () => {
      const baseMs = 1_700_000_000_000;
      const sets: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 45_000,
          restTimerElapsedSec: 0, // Immediately skipped
          timingIncomplete: false,
        },
        {
          startedAt: baseMs + 45_000, // 0 gap
          completedAt: baseMs + 90_000,
          timingIncomplete: false,
        },
      ];

      const res = evaluateStrengthSessionTiming(sets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res.timingIncomplete, false);
      assert.equal(res.restSec, 0);
      assert.equal(res.restShare, 0);
      assert.equal(res.conditions?.atLeastTwoSets, true);
      assert.equal(res.conditions?.halfIntervalsAtLeast20s, false); // 0s < 20s
      assert.equal(res.conditions?.restShareAtLeast25, false); // 0% < 25%
      assert.equal(res.passed, false);
    });

    // 10. Idempotent / pause boundary: interval of exactly 600s is NOT a pause; 600001 ms or 601s is a pause
    test('10. Idempotent / pause boundary: interval of exactly 600s is NOT a pause; 600001 ms or 601s is a pause', () => {
      const baseMs = 1_700_000_000_000;

      // Exactly 600s gap (600,000 ms)
      const setsExact600s: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 30_000,
          restTimerElapsedSec: 600,
          timingIncomplete: false,
        },
        {
          startedAt: baseMs + 30_000 + 600_000, // Exactly 600s
          completedAt: baseMs + 660_000,
          timingIncomplete: false,
        },
      ];

      const resExact = evaluateStrengthSessionTiming(setsExact600s, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(resExact.pauseSegments.length, 0); // NOT a pause
      assert.equal(resExact.totalDurationSec, 660);
      assert.equal(resExact.restSec, 600);

      // 600001 ms gap (strictly > 600s => pause)
      const sets600001ms: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 30_000,
          restTimerElapsedSec: 100,
          timingIncomplete: false,
        },
        {
          startedAt: baseMs + 30_000 + 600_001, // 600001 ms
          completedAt: baseMs + 660_001,
          timingIncomplete: false,
        },
      ];

      const res600001 = evaluateStrengthSessionTiming(sets600001ms, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res600001.pauseSegments.length, 1); // IS a pause
      assert.equal(res600001.pauseSegments[0].startedAt, sets600001ms[0].completedAt);
      assert.equal(res600001.pauseSegments[0].endedAt, sets600001ms[1].startedAt);
      // Pause is subtracted: total raw was 660.001s, minus 600.001s pause = 60s
      assert.equal(res600001.totalDurationSec, 60);
      // Pause gap is not added to restSec, and set 0's rest is omitted because the gap was a pause
      assert.equal(res600001.restSec, 0);

      // 601s gap (601,000 ms)
      const sets601s: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 30_000,
          restTimerElapsedSec: 120,
          timingIncomplete: false,
        },
        {
          startedAt: baseMs + 30_000 + 601_000, // 601s
          completedAt: baseMs + 661_000,
          timingIncomplete: false,
        },
      ];

      const res601 = evaluateStrengthSessionTiming(sets601s, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(res601.pauseSegments.length, 1);
      assert.equal(res601.totalDurationSec, 60);
      assert.equal(res601.restSec, 0);

      // Idempotency: re-evaluating returns identical output and does not mutate input
      const res601SecondRun = evaluateStrengthSessionTiming(sets601s, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });
      assert.deepEqual(res601, res601SecondRun);
    });

    // 11. Half-interval math: 2 sets / 1 gap of 20s → interval condition true; 3 sets / 2 gaps with only one ≥ 20s → 1 >= 1 is true; 3 sets / 2 gaps with zero ≥ 20s → false
    describe('11. Half-interval math tests', () => {
      const baseMs = 1_700_000_000_000;

      test('2 sets / 1 gap of 20s -> 1 >= 0.5 is true', () => {
        const sets: EvaluatedSet[] = [
          {
            startedAt: baseMs,
            completedAt: baseMs + 30_000,
            restTimerElapsedSec: 20,
            timingIncomplete: false,
          },
          {
            startedAt: baseMs + 50_000, // gap = 20s
            completedAt: baseMs + 80_000,
            timingIncomplete: false,
          },
        ];
        const res = evaluateStrengthSessionTiming(sets);
        assert.equal(res.conditions?.halfIntervalsAtLeast20s, true);
      });

      test('2 sets / 1 gap of 19s -> 0 >= 0.5 is false', () => {
        const sets: EvaluatedSet[] = [
          {
            startedAt: baseMs,
            completedAt: baseMs + 30_000,
            restTimerElapsedSec: 19,
            timingIncomplete: false,
          },
          {
            startedAt: baseMs + 49_000, // gap = 19s
            completedAt: baseMs + 79_000,
            timingIncomplete: false,
          },
        ];
        const res = evaluateStrengthSessionTiming(sets);
        assert.equal(res.conditions?.halfIntervalsAtLeast20s, false);
      });

      test('3 sets / 2 gaps with only one >= 20s -> 1 >= 1.0 is true', () => {
        const sets: EvaluatedSet[] = [
          {
            startedAt: baseMs,
            completedAt: baseMs + 30_000,
            restTimerElapsedSec: 20,
            timingIncomplete: false,
          },
          {
            startedAt: baseMs + 50_000, // gap 1 = 20s (qualified)
            completedAt: baseMs + 80_000,
            restTimerElapsedSec: 10,
            timingIncomplete: false,
          },
          {
            startedAt: baseMs + 90_000, // gap 2 = 10s (not qualified)
            completedAt: baseMs + 120_000,
            timingIncomplete: false,
          },
        ];
        const res = evaluateStrengthSessionTiming(sets);
        assert.equal(res.conditions?.halfIntervalsAtLeast20s, true);
      });

      test('3 sets / 2 gaps with zero >= 20s -> 0 >= 1.0 is false', () => {
        const sets: EvaluatedSet[] = [
          {
            startedAt: baseMs,
            completedAt: baseMs + 30_000,
            restTimerElapsedSec: 15,
            timingIncomplete: false,
          },
          {
            startedAt: baseMs + 45_000, // gap 1 = 15s
            completedAt: baseMs + 75_000,
            restTimerElapsedSec: 10,
            timingIncomplete: false,
          },
          {
            startedAt: baseMs + 85_000, // gap 2 = 10s
            completedAt: baseMs + 115_000,
            timingIncomplete: false,
          },
        ];
        const res = evaluateStrengthSessionTiming(sets);
        assert.equal(res.conditions?.halfIntervalsAtLeast20s, false);
      });

      test('10 sets / 9 intervals: 5 >= 20s -> 5 >= 4.5 is true; 4 >= 20s -> false', () => {
        const createSetsWithQualifiedCount = (qualified: number): EvaluatedSet[] => {
          const s: EvaluatedSet[] = [];
          let cursor = baseMs;
          for (let i = 0; i < 10; i++) {
            const startedAt = cursor;
            const completedAt = startedAt + 30_000;
            const isLast = i === 9;
            const gapSec = i < qualified ? 20 : 10;
            s.push({
              startedAt,
              completedAt,
              restTimerElapsedSec: isLast ? undefined : gapSec,
              timingIncomplete: false,
            });
            cursor = completedAt + gapSec * 1000;
          }
          return s;
        };

        const res5 = evaluateStrengthSessionTiming(createSetsWithQualifiedCount(5));
        assert.equal(res5.conditions?.halfIntervalsAtLeast20s, true);

        const res4 = evaluateStrengthSessionTiming(createSetsWithQualifiedCount(4));
        assert.equal(res4.conditions?.halfIntervalsAtLeast20s, false);
      });
    });
  });

  describe('Edge cases and input variations', () => {
    test('1 set only: conditions fail because atLeastTwoSets is false', () => {
      const res = evaluateStrengthSessionTiming([
        {
          startedAt: 1000,
          completedAt: 46000,
          timingIncomplete: false,
        },
      ]);
      assert.equal(res.timingIncomplete, false);
      assert.equal(res.totalDurationSec, 45);
      assert.equal(res.restSec, 0);
      assert.equal(res.restShare, 0);
      assert.equal(res.conditions?.atLeastTwoSets, false);
      assert.equal(res.conditions?.halfIntervalsAtLeast20s, false);
      assert.equal(res.conditions?.restShareAtLeast25, false);
      assert.equal(res.passed, false);
    });

    test('empty sets array returns timingIncomplete true and passed null', () => {
      const res = evaluateStrengthSessionTiming([]);
      assert.equal(res.timingIncomplete, true);
      assert.equal(res.passed, null);
    });

    test('negative gap / chronologically inverted sets returns timingIncomplete true', () => {
      const res = evaluateStrengthSessionTiming([
        { startedAt: 1000, completedAt: 5000, restTimerElapsedSec: 60, timingIncomplete: false },
        { startedAt: 4000, completedAt: 8000, timingIncomplete: false }, // started before previous completed!
      ]);
      assert.equal(res.timingIncomplete, true);
      assert.equal(res.passed, null);
    });

    test('intermediate set missing restTimerElapsedSec returns timingIncomplete true', () => {
      const res = evaluateStrengthSessionTiming([
        { startedAt: 1000, completedAt: 5000, timingIncomplete: false }, // Missing restTimerElapsedSec!
        { startedAt: 6000, completedAt: 10000, timingIncomplete: false },
      ]);
      assert.equal(res.timingIncomplete, true);
      assert.equal(res.passed, null);
    });

    test('bodyweight sportType applies three conditions', () => {
      const res = evaluateStrengthSessionTiming(
        [
          { startedAt: 1000, completedAt: 46000, restTimerElapsedSec: 60, timingIncomplete: false },
          { startedAt: 106000, completedAt: 151000, timingIncomplete: false },
        ],
        { sportType: 'bodyweight', loggingMode: 'live_focus' }
      );
      assert.equal(res.appliesThreeConditions, true);
      assert.equal(res.passed, true);
    });

    test('after_the_fact loggingMode does not apply three conditions', () => {
      const res = evaluateStrengthSessionTiming(
        [
          { startedAt: 1000, completedAt: 46000, restTimerElapsedSec: 60, timingIncomplete: false },
          { startedAt: 106000, completedAt: 151000, timingIncomplete: false },
        ],
        { sportType: 'strength', loggingMode: 'after_the_fact' }
      );
      assert.equal(res.appliesThreeConditions, false);
      assert.equal(res.passed, null);
    });

    test('accepts session record with exerciseLogs structure', () => {
      const sessionObj = {
        sportType: 'strength',
        loggingMode: 'live_focus',
        exerciseLogs: [
          {
            sets: [
              { startedAt: 1000, completedAt: 46000, restTimerElapsedSec: 60, timingIncomplete: false },
            ],
          },
          {
            sets: [
              { startedAt: 106000, completedAt: 151000, timingIncomplete: false },
            ],
          },
        ],
      };
      const res = evaluateStrengthSessionTiming(sessionObj);
      assert.equal(res.timingIncomplete, false);
      assert.equal(res.appliesThreeConditions, true);
      assert.equal(res.passed, true);
    });
  });

  describe('Workout History Record Integration', () => {
    test('failed mash session record retains all computed fields and is validly evaluated from history structure', () => {
      const baseMs = 1_700_000_000_000;
      const mashSets: EvaluatedSet[] = [
        {
          startedAt: baseMs,
          completedAt: baseMs + 5000,
          restTimerElapsedSec: 0,
          timingIncomplete: false,
        },
        {
          startedAt: baseMs + 5000,
          completedAt: baseMs + 10000,
          restTimerElapsedSec: 0,
          timingIncomplete: false,
        },
      ];

      const timingResult = evaluateStrengthSessionTiming(mashSets, {
        sportType: 'strength',
        loggingMode: 'live_focus',
      });

      assert.equal(timingResult.passed, false);

      // Simulating sessionRecord written to workoutHistory as done in finishWorkoutSession
      const sessionRecord = {
        id: `hist_${Date.now()}`,
        totalDurationSec: timingResult.totalDurationSec,
        restSec: timingResult.restSec ?? 0,
        restShare: timingResult.restShare,
        pauseSegments: timingResult.pauseSegments,
        timingIncomplete: timingResult.timingIncomplete,
        exerciseLogs: [{ sets: mashSets }],
      };

      assert.equal(sessionRecord.timingIncomplete, false);
      assert.equal(sessionRecord.restSec, 0);
      assert.equal(sessionRecord.restShare, 0);
      assert.deepEqual(sessionRecord.pauseSegments, []);
      assert.equal(sessionRecord.totalDurationSec, 10);

      // Evaluating the persisted record reproduces the exact same result
      const reEval = evaluateStrengthSessionTiming(sessionRecord);
      assert.equal(reEval.passed, false);
      assert.equal(reEval.conditions?.halfIntervalsAtLeast20s, false);
      assert.equal(reEval.conditions?.restShareAtLeast25, false);
    });

    test('mixed-exercise session with grouped exerciseLogs evaluates identically to chronological flat list', () => {
      const baseMs = 1_700_000_000_000;
      // Squat set 1: t=0..10s, followed by 30s rest before Bench set 1
      const squatSet1: EvaluatedSet = {
        startedAt: baseMs + 0,
        completedAt: baseMs + 10_000,
        restTimerElapsedSec: 30,
        timingIncomplete: false,
      };
      // Bench set 1: t=40..50s, followed by 40s rest before Squat set 2
      const benchSet1: EvaluatedSet = {
        startedAt: baseMs + 40_000,
        completedAt: baseMs + 50_000,
        restTimerElapsedSec: 40,
        timingIncomplete: false,
      };
      // Squat set 2: t=90..100s, last set in workout
      const squatSet2: EvaluatedSet = {
        startedAt: baseMs + 90_000,
        completedAt: baseMs + 100_000,
        timingIncomplete: false,
      };

      const chronologicalFlatSets: EvaluatedSet[] = [squatSet1, benchSet1, squatSet2];

      // Session record where exerciseLogs are grouped by exercise (squat log has sets at t=0 and t=90, bench log has set at t=40)
      const groupedSession = {
        sportType: 'strength',
        loggingMode: 'live_focus',
        exerciseLogs: [
          {
            exerciseId: 'barbell_squat',
            exerciseNameZh: '槓鈴深蹲',
            sets: [squatSet1, squatSet2],
          },
          {
            exerciseId: 'barbell_bench_press',
            exerciseNameZh: '槓鈴臥推',
            sets: [benchSet1],
          },
        ],
      };

      const flatResult = evaluateStrengthSessionTiming(chronologicalFlatSets);
      const sessionResult = evaluateStrengthSessionTiming(groupedSession);

      // Must evaluate identically between session object and chronological flat list
      assert.equal(sessionResult.timingIncomplete, false);
      assert.equal(sessionResult.totalDurationSec, flatResult.totalDurationSec);
      assert.equal(sessionResult.restSec, flatResult.restSec);
      assert.deepEqual(sessionResult.pauseSegments, flatResult.pauseSegments);
      assert.equal(sessionResult.passed, flatResult.passed);
      assert.equal(sessionResult.passed, true);
      assert.deepEqual(sessionResult, flatResult);

      // Before the sort fix, unsorted flattening [squatSet1, squatSet2, benchSet1] failed due to chronological inversion (t=90 before t=40)
      const unsortedFlattened = [squatSet1, squatSet2, benchSet1];
      const unsortedResult = evaluateStrengthSessionTiming(unsortedFlattened);
      assert.equal(unsortedResult.timingIncomplete, true);
      assert.equal(unsortedResult.passed, null);
    });

    test('mixed-exercise session preserving sets missing startedAt returns timingIncomplete true', () => {
      const baseMs = 1_700_000_000_000;
      const groupedSessionWithMissingStart = {
        sportType: 'strength',
        loggingMode: 'live_focus',
        exerciseLogs: [
          {
            exerciseId: 'barbell_squat',
            sets: [
              { completedAt: baseMs + 10_000, restTimerElapsedSec: 30, timingIncomplete: false }, // missing startedAt
              { startedAt: baseMs + 90_000, completedAt: baseMs + 100_000, timingIncomplete: false },
            ],
          },
          {
            exerciseId: 'barbell_bench_press',
            sets: [
              { startedAt: baseMs + 40_000, completedAt: baseMs + 50_000, restTimerElapsedSec: 40, timingIncomplete: false },
            ],
          },
        ],
      };

      const res = evaluateStrengthSessionTiming(groupedSessionWithMissingStart);
      assert.equal(res.timingIncomplete, true);
      assert.equal(res.passed, null);
    });
  });
});
