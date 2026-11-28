import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  evaluateImplausibleSession,
  formatEvaluationNumber,
} from './implausibleCapsEvaluator.ts';
import {
  DEFAULT_IMPLAUSIBLE_CAPS,
  resolveImplausibleCaps,
} from '../config/implausibleCaps.ts';

describe('T4-D6: Implausible Caps & Evaluation Pure Functions', () => {
  describe('1. Speed & Pace Caps and Boundaries (Run, Cycle, Swim, Walk)', () => {
    test('duration 0 or missing: no speed flag, no walk suggestion', () => {
      // duration 0 with distance 1000m
      const res1 = evaluateImplausibleSession({
        sportType: 'run',
        durationSec: 0,
        distanceM: 1000,
      });
      assert.equal(res1.countsTowardCheckin, true);
      assert.equal(res1.flagReason, null);
      assert.equal(res1.suggestSportType, null);

      // missing duration with distance 1000m
      const res2 = evaluateImplausibleSession({
        sportType: 'walk',
        distanceM: 1000,
      });
      assert.equal(res2.countsTowardCheckin, true);
      assert.equal(res2.flagReason, null);
      assert.equal(res2.suggestSportType, null);

      // duration 0 with walk
      const res3 = evaluateImplausibleSession({
        sportType: 'walk',
        totalDurationSec: 0,
        distanceM: 5000,
      });
      assert.equal(res3.countsTowardCheckin, true);
      assert.equal(res3.flagReason, null);
      assert.equal(res3.suggestSportType, null);
    });

    test('run 25.0 km/h is OK; 25.1 km/h is flagged', () => {
      // 25.0 km/h: 25000m in 3600s -> exactly 25.0 km/h
      const okRun = evaluateImplausibleSession({
        sportType: 'run',
        totalDurationSec: 3600,
        distanceM: 25000,
      });
      assert.equal(okRun.countsTowardCheckin, true);
      assert.equal(okRun.flagReason, null);

      // 25.1 km/h: 25100m in 3600s -> 25.1 km/h
      const flaggedRun = evaluateImplausibleSession({
        sportType: 'run',
        totalDurationSec: 3600,
        distanceM: 25100,
      });
      assert.equal(flaggedRun.countsTowardCheckin, false);
      assert.equal(flaggedRun.flagReason, 'implausible_speed');
      assert.ok(flaggedRun.copy?.message.includes('平均時速 25.1 公里，比頂尖選手的速度還快'));
      assert.ok(flaggedRun.flaggedFields.includes('distanceM'));
    });

    test('cycle 60.0 km/h is OK; 60.1 km/h is flagged', () => {
      // 60.0 km/h: 60000m in 3600s
      const okCycle = evaluateImplausibleSession({
        sportType: 'cycle',
        totalDurationSec: 3600,
        distanceM: 60000,
      });
      assert.equal(okCycle.countsTowardCheckin, true);
      assert.equal(okCycle.flagReason, null);

      // 60.1 km/h: 60100m in 3600s
      const flaggedCycle = evaluateImplausibleSession({
        sportType: 'cycle',
        totalDurationSec: 3600,
        distanceM: 60100,
      });
      assert.equal(flaggedCycle.countsTowardCheckin, false);
      assert.equal(flaggedCycle.flagReason, 'implausible_speed');
      assert.ok(flaggedCycle.copy?.message.includes('平均時速 60.1 公里，比一般騎車快很多'));
    });

    test('swim 45.0 sec/100m is OK; 44.9 sec/100m is flagged (pace faster than cap)', () => {
      // 45.0 sec/100m: 100m in 45s
      const okSwim = evaluateImplausibleSession({
        sportType: 'swim',
        totalDurationSec: 45,
        distanceM: 100,
      });
      assert.equal(okSwim.countsTowardCheckin, true);
      assert.equal(okSwim.flagReason, null);

      // 44.9 sec/100m: 100m in 44.9s
      const flaggedSwim = evaluateImplausibleSession({
        sportType: 'swim',
        totalDurationSec: 44.9,
        distanceM: 100,
      });
      assert.equal(flaggedSwim.countsTowardCheckin, false);
      assert.equal(flaggedSwim.flagReason, 'implausible_speed');
      assert.ok(flaggedSwim.copy?.message.includes('平均每 100 公尺 44.9 秒，比這項運動一般的速度快很多'));
    });

    test('walk 12.0 km/h is normal; walk 13.0 km/h suggests run and counts; walk 25.0 km/h still suggests; walk 25.1 / 26 km/h flagged', () => {
      // 12.0 km/h: 12000m in 3600s -> normal walk
      const walk12 = evaluateImplausibleSession({
        sportType: 'walk',
        totalDurationSec: 3600,
        distanceM: 12000,
      });
      assert.equal(walk12.countsTowardCheckin, true);
      assert.equal(walk12.flagReason, null);
      assert.equal(walk12.suggestSportType, null);

      // 13.0 km/h: 13000m in 3600s -> suggests run, counts toward checkin, no flag
      const walk13 = evaluateImplausibleSession({
        sportType: 'walk',
        totalDurationSec: 3600,
        distanceM: 13000,
      });
      assert.equal(walk13.countsTowardCheckin, true);
      assert.equal(walk13.flagReason, null);
      assert.equal(walk13.suggestSportType, 'run');
      assert.equal(walk13.copy?.title, '要不要改成跑步？');
      assert.ok(walk13.copy?.message.includes('平均時速 13 公里，比較像跑步的速度。'));
      assert.equal(walk13.copy?.note, '都不改也沒關係，這筆照樣算數。');

      // 25.0 km/h: boundary test: 25.0 km/h walk is still the suggest path, not a flag
      const walk25 = evaluateImplausibleSession({
        sportType: 'walk',
        totalDurationSec: 3600,
        distanceM: 25000,
      });
      assert.equal(walk25.countsTowardCheckin, true);
      assert.equal(walk25.flagReason, null);
      assert.equal(walk25.suggestSportType, 'run');

      // 25.1 km/h: over maxRunAvgKmh -> general over-cap, countsTowardCheckin false, no suggestion
      const walk25_1 = evaluateImplausibleSession({
        sportType: 'walk',
        totalDurationSec: 3600,
        distanceM: 25100,
      });
      assert.equal(walk25_1.countsTowardCheckin, false);
      assert.equal(walk25_1.flagReason, 'implausible_speed');
      assert.ok(walk25_1.copy?.message.includes('平均時速 25.1 公里，比這項運動一般的速度快很多'));
      assert.equal(walk25_1.suggestSportType, null);

      // 26 km/h
      const walk26 = evaluateImplausibleSession({
        sportType: 'walk',
        totalDurationSec: 3600,
        distanceM: 26000,
      });
      assert.equal(walk26.countsTowardCheckin, false);
      assert.equal(walk26.flagReason, 'implausible_speed');
      assert.equal(walk26.suggestSportType, null);
    });

    test('after walk->run at 13 km/h, re-evaluation as run is not flagged', () => {
      // Re-evaluated with sportType: 'run' at 13 km/h
      const reEvaluatedRun = evaluateImplausibleSession({
        sportType: 'run',
        totalDurationSec: 3600,
        distanceM: 13000,
      });
      assert.equal(reEvaluatedRun.countsTowardCheckin, true);
      assert.equal(reEvaluatedRun.flagReason, null);
      assert.equal(reEvaluatedRun.suggestSportType, null);
    });
  });

  describe('2. Strength Caps and Boundaries (Weight, Reps, Total Sets)', () => {
    test('strength 500 kg is OK; 500.1 kg / 600 kg flagged', () => {
      const okWeight = evaluateImplausibleSession({
        sportType: 'strength',
        sets: [{ weightKg: 500, reps: 10 }],
      });
      assert.equal(okWeight.countsTowardCheckin, true);
      assert.equal(okWeight.flagReason, null);

      const flagged500_1 = evaluateImplausibleSession({
        sportType: 'strength',
        sets: [{ weightKg: 500.1, reps: 10 }],
      });
      assert.equal(flagged500_1.countsTowardCheckin, false);
      assert.equal(flagged500_1.flagReason, 'implausible_strength');
      assert.ok(flagged500_1.copy?.message.includes('單組 500.1 公斤超過常見範圍（上限 500 公斤）'));

      const flagged600 = evaluateImplausibleSession({
        sportType: 'strength',
        sets: [{ weightKg: 600, reps: 5 }],
      });
      assert.equal(flagged600.countsTowardCheckin, false);
      assert.equal(flagged600.flagReason, 'implausible_strength');
      assert.ok(flagged600.copy?.message.includes('單組 600 公斤超過常見範圍（上限 500 公斤）'));
      assert.ok(flagged600.flaggedFields.includes('weightKg'));
    });

    test('strength 100 reps is OK; 101 reps flagged', () => {
      const okReps = evaluateImplausibleSession({
        sportType: 'strength',
        sets: [{ weightKg: 50, reps: 100 }],
      });
      assert.equal(okReps.countsTowardCheckin, true);
      assert.equal(okReps.flagReason, null);

      const flaggedReps = evaluateImplausibleSession({
        sportType: 'strength',
        sets: [{ weightKg: 50, reps: 101 }],
      });
      assert.equal(flaggedReps.countsTowardCheckin, false);
      assert.equal(flaggedReps.flagReason, 'implausible_strength');
      assert.ok(flaggedReps.copy?.message.includes('單組 101 次超過常見範圍（上限 100 次）'));
      assert.ok(flaggedReps.flaggedFields.includes('reps'));
    });

    test('strength 60 sets is OK; 61 sets flagged', () => {
      const okSets = evaluateImplausibleSession({
        sportType: 'strength',
        totalSets: 60,
      });
      assert.equal(okSets.countsTowardCheckin, true);
      assert.equal(okSets.flagReason, null);

      const flaggedSets = evaluateImplausibleSession({
        sportType: 'strength',
        totalSets: 61,
      });
      assert.equal(flaggedSets.countsTowardCheckin, false);
      assert.equal(flaggedSets.flagReason, 'implausible_strength');
      assert.ok(flaggedSets.copy?.message.includes('單次 61 組超過常見範圍（上限 60 組）'));
      assert.ok(flaggedSets.flaggedFields.includes('totalSets'));
    });
  });

  describe('3. Duration Caps (Session > 12h, Day Total > 16h)', () => {
    test('session 12 hours is OK; 12 hours + 1s flagged', () => {
      // 12 hours exactly: 43200 seconds
      const ok12h = evaluateImplausibleSession({
        sportType: 'run',
        totalDurationSec: 43200,
      });
      assert.equal(ok12h.countsTowardCheckin, true);
      assert.equal(ok12h.flagReason, null);

      // 12 hours + 1s: 43201 seconds
      const flagged12h = evaluateImplausibleSession({
        sportType: 'run',
        totalDurationSec: 43201,
      });
      assert.equal(flagged12h.countsTowardCheckin, false);
      assert.equal(flagged12h.flagReason, 'session_too_long');
      assert.ok(flagged12h.copy?.message.includes('單筆超過 12 小時，可能是忘了按結束'));
      assert.ok(flagged12h.flaggedFields.includes('duration'));
    });

    test('day total 16 hours is OK; just over 16 hours flagged (using otherDaySessions)', () => {
      const testTimestamp = 1731580000000; // Fixed timestamp for determinism

      // 10 hours today + 6 hours other sessions today = 16 hours total -> OK
      const otherSessions = [
        {
          id: 'sess_1',
          totalDurationSec: 6 * 3600,
          timestamp: testTimestamp,
        },
      ];

      const ok16h = evaluateImplausibleSession(
        {
          id: 'sess_cur',
          sportType: 'yoga_stretch',
          totalDurationSec: 10 * 3600,
          timestamp: testTimestamp,
        },
        {
          otherDaySessions: otherSessions,
          now: testTimestamp,
        }
      );
      assert.equal(ok16h.countsTowardCheckin, true);
      assert.equal(ok16h.flagReason, null);

      // 10 hours today + 6 hours 1 sec other session = 16h 1s -> flagged day_too_long
      const otherSessionsOver = [
        {
          id: 'sess_1',
          totalDurationSec: 6 * 3600 + 1,
          timestamp: testTimestamp,
        },
      ];

      const flagged16h = evaluateImplausibleSession(
        {
          id: 'sess_cur',
          sportType: 'yoga_stretch',
          totalDurationSec: 10 * 3600,
          timestamp: testTimestamp,
        },
        {
          otherDaySessions: otherSessionsOver,
          now: testTimestamp,
        }
      );
      assert.equal(flagged16h.countsTowardCheckin, false);
      assert.equal(flagged16h.flagReason, 'day_too_long');
      assert.ok(flagged16h.copy?.message.includes('今天加起來超過 16 小時，可能是忘了按結束'));
      assert.ok(flagged16h.flaggedFields.includes('dayTotalDuration'));
    });
  });

  describe('4. Dynamic Config Overrides & Coach Copy Safety', () => {
    test('changing caps in the override changes the outcome without code changes', () => {
      // With default cap (run max 25), 28 km/h is flagged
      const resDefault = evaluateImplausibleSession({
        sportType: 'run',
        totalDurationSec: 3600,
        distanceM: 28000,
      });
      assert.equal(resDefault.countsTowardCheckin, false);
      assert.equal(resDefault.flagReason, 'implausible_speed');

      // With overridden cap (maxRunAvgKmh: 30), 28 km/h is NOT flagged
      const resOverridden = evaluateImplausibleSession(
        {
          sportType: 'run',
          totalDurationSec: 3600,
          distanceM: 28000,
        },
        {
          caps: { maxRunAvgKmh: 30 },
        }
      );
      assert.equal(resOverridden.countsTowardCheckin, true);
      assert.equal(resOverridden.flagReason, null);
    });

    test('no shaming language (作弊, 違規, 處罰, 比世界紀錄還快) exists in any generated copy', () => {
      const forbiddenSubstrings = ['作弊', '違規', '處罰', '比世界紀錄還快'];

      const testCases = [
        { sportType: 'run', totalDurationSec: 3600, distanceM: 40000 },
        { sportType: 'cycle', totalDurationSec: 3600, distanceM: 80000 },
        { sportType: 'swim', totalDurationSec: 30, distanceM: 100 },
        { sportType: 'walk', totalDurationSec: 3600, distanceM: 30000 },
        { sportType: 'walk', totalDurationSec: 3600, distanceM: 15000 },
        { sportType: 'strength', sets: [{ weightKg: 800, reps: 5 }] },
        { sportType: 'strength', sets: [{ weightKg: 100, reps: 150 }] },
        { sportType: 'strength', totalSets: 100 },
        { sportType: 'strength', totalDurationSec: 50000 },
      ];

      for (const tc of testCases) {
        const evalResult = evaluateImplausibleSession(tc);
        if (evalResult.copy) {
          const serialized = JSON.stringify(evalResult.copy);
          for (const forbidden of forbiddenSubstrings) {
            assert.ok(
              !serialized.includes(forbidden),
              `Generated copy must not contain forbidden word "${forbidden}". Copy: ${serialized}`
            );
          }
        }
      }
    });

    test('formatEvaluationNumber helper handles integers and decimals correctly', () => {
      assert.equal(formatEvaluationNumber(40), '40');
      assert.equal(formatEvaluationNumber(25.0), '25');
      assert.equal(formatEvaluationNumber(25.1), '25.1');
      assert.equal(formatEvaluationNumber(44.92), '44.9');
      assert.equal(formatEvaluationNumber(13), '13');
      assert.equal(formatEvaluationNumber(500), '500');
    });
  });

  describe('5. Store finishWorkoutSession checkin gating & updateWorkoutHistorySession', () => {
    test('evaluateImplausibleSession on history record allows dynamic re-evaluation after update', () => {
      // Historical session with 600 kg bench press (over cap)
      const flaggedRecord = {
        id: 'hist_test_1',
        routineName: '胸肌推舉',
        sportType: 'strength' as const,
        durationMinutes: 30,
        totalDurationSec: 1800,
        totalSets: 3,
        totalVolume: 6000,
        coinsEarned: 10,
        expEarned: 0,
        topExerciseZh: '槓鈴臥推',
        exerciseLogs: [
          {
            exerciseId: 'barbell_bench_press',
            exerciseNameZh: '槓鈴臥推',
            unitLabel: 'kg',
            sets: [
              { weightKg: 600, reps: 5, restSec: 60, isPR: false },
              { weightKg: 100, reps: 8, restSec: 60, isPR: false },
            ],
          },
        ],
      };

      const evalBefore = evaluateImplausibleSession(flaggedRecord);
      assert.equal(evalBefore.countsTowardCheckin, false);
      assert.equal(evalBefore.flagReason, 'implausible_strength');
      assert.ok(evalBefore.copy?.message.includes('600 公斤'));

      // Correct the set weight from 600 to 100
      const correctedRecord = {
        ...flaggedRecord,
        exerciseLogs: [
          {
            ...flaggedRecord.exerciseLogs[0],
            sets: [
              { weightKg: 100, reps: 5, restSec: 60, isPR: false },
              { weightKg: 100, reps: 8, restSec: 60, isPR: false },
            ],
          },
        ],
      };

      const evalAfter = evaluateImplausibleSession(correctedRecord);
      assert.equal(evalAfter.countsTowardCheckin, true);
      assert.equal(evalAfter.flagReason, null);
      assert.equal(evalAfter.copy, null);
    });

    test('recomputing without persisting flag fields: changing caps changes past record evaluation', () => {
      // Historical record run at 28 km/h
      const pastRunRecord = {
        id: 'hist_run_28',
        sportType: 'run' as const,
        totalDurationSec: 3600,
        distanceM: 28000,
        durationMinutes: 60,
        totalSets: 1,
        totalVolume: 0,
        coinsEarned: 15,
        expEarned: 0,
        topExerciseZh: '慢跑',
        exerciseLogs: [],
      };

      // Under standard cap (25), it is flagged
      const eval1 = evaluateImplausibleSession(pastRunRecord);
      assert.equal(eval1.countsTowardCheckin, false);
      assert.equal(eval1.flagReason, 'implausible_speed');

      // If configuration changes to 30, recomputing evaluates it as valid without modifying record
      const eval2 = evaluateImplausibleSession(pastRunRecord, {
        caps: { maxRunAvgKmh: 30 },
      });
      assert.equal(eval2.countsTowardCheckin, true);
      assert.equal(eval2.flagReason, null);
    });
  });
});
