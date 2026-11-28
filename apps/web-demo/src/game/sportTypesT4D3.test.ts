import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test, describe } from 'node:test';
import { calculateWorkoutExp } from '../../../../packages/engine/src/index.ts';
import {
  EXERCISE_LIBRARY,
  INITIAL_SAVED_ROUTINES,
  type ExerciseItem,
} from '../config/catalogConfig.ts';
import {
  mapLegacyExerciseToSportType,
  resolveInitialSessionSportType,
  resolveSportTypeOnExerciseChange,
  resolveSportTypeOnFirstSetLogged,
  toLegacySettlementInput,
  calculateWorkoutSessionSettlement,
  toAdventureSportSkillType,
  computePersistedSetFields,
  type WorkoutSessionSportType,
  type AdventureSportSkillType,
} from './workoutRecord.ts';
import { evaluateStrengthSessionTiming } from './strengthSessionTiming.ts';

describe('T4-D3: Multi-Sport Types, Mapping & Compatibility Settlement', () => {
  const ORIGINAL_12_IDS = [
    'barbell_squat',
    'barbell_bench_press',
    'conventional_deadlift',
    'overhead_press',
    'pull_ups',
    'barbell_row',
    'leg_press',
    'lateral_raise',
    'dumbbell_curl',
    'cardio_incline_run',
    'cardio_hiit_bike',
    'bw_plank_core',
  ] as const;

  describe('1. Regression: Settlement amounts for all original 12 catalog exercises match main exactly', () => {
    for (const exId of ORIGINAL_12_IDS) {
      test(`exercise ${exId} produces identical totalCoins, totalExperience, and totalRawVolume`, () => {
        const catalogItem = EXERCISE_LIBRARY.find((e) => e.id === exId);
        assert.ok(catalogItem, `Catalog item ${exId} must exist`);

        // Build representative set based on catalog defaults
        let weightKg = catalogItem.defaultWeightKg;
        let distanceM: number | undefined;
        let durationSec: number | undefined;

        if (catalogItem.unitLabel === 'km') {
          distanceM = catalogItem.defaultWeightKg * 1000;
          weightKg = 0; // persisted weightKg is 0 for cardio
        } else if (catalogItem.unitLabel === '秒') {
          durationSec = catalogItem.defaultWeightKg;
          weightKg = 0; // persisted weightKg is 0 for seconds
        }

        const loggedSet = {
          exerciseId: catalogItem.id,
          muscleGroup: catalogItem.muscleGroup,
          category: catalogItem.category,
          unitLabel: catalogItem.unitLabel,
          weightKg,
          distanceM,
          durationSec,
          reps: catalogItem.defaultReps,
        };

        const testBuffs = { hasWheyProtein: true, hasPreWorkout: false };

        // Expected (legacy / main behavior):
        // Raw calculation directly using catalog defaultWeightKg as weightKg
        const expected = calculateWorkoutExp(
          [
            {
              exerciseId: catalogItem.id,
              muscleGroup: catalogItem.muscleGroup,
              category: catalogItem.category,
              weightKg: catalogItem.defaultWeightKg,
              reps: catalogItem.defaultReps,
            },
          ],
          testBuffs
        );

        // Actual (compatibility mapper / extracted settlement helper):
        const legacyInput = toLegacySettlementInput(loggedSet);
        const actualFromMapper = calculateWorkoutExp([legacyInput], testBuffs);
        const actualFromHelper = calculateWorkoutSessionSettlement([loggedSet], testBuffs);

        // Deep equality checks
        assert.equal(
          actualFromMapper.totalCoins,
          expected.totalCoins,
          `${exId}: mapper totalCoins mismatch`
        );
        assert.equal(
          actualFromMapper.totalExperience,
          expected.totalExperience,
          `${exId}: mapper totalExperience mismatch`
        );
        assert.equal(
          actualFromMapper.totalRawVolume,
          expected.totalRawVolume,
          `${exId}: mapper totalRawVolume mismatch`
        );

        assert.deepEqual(
          {
            totalCoins: actualFromHelper.totalCoins,
            totalExperience: actualFromHelper.totalExperience,
            totalRawVolume: actualFromHelper.totalRawVolume,
          },
          {
            totalCoins: expected.totalCoins,
            totalExperience: expected.totalExperience,
            totalRawVolume: expected.totalRawVolume,
          },
          `${exId}: helper output does not deeply match legacy calculation`
        );
      });
    }
  });

  describe('2. Non-earning settlement for new types and new yoga id', () => {
    const NEW_EXERCISE_IDS = [
      'walk_brisk',
      'swim_freestyle',
      'ball_sports',
      'circuit_hiit',
      'custom_workout',
      'yoga_dynamic_flow',
    ];

    for (const newId of NEW_EXERCISE_IDS) {
      test(`${newId} returns 0 coins and 0 experience (does not trigger engine minimum 1 coin)`, () => {
        const item = EXERCISE_LIBRARY.find((e) => e.id === newId);
        assert.ok(item, `Catalog item ${newId} must exist`);

        const set = {
          exerciseId: item.id,
          muscleGroup: item.muscleGroup,
          category: item.category,
          unitLabel: item.unitLabel,
          weightKg: item.defaultWeightKg,
          reps: item.defaultReps,
          distanceM: item.unitLabel === '公尺' ? item.defaultWeightKg : undefined,
          durationSec: item.unitLabel === '分鐘' ? item.defaultWeightKg * 60 : undefined,
        };

        const result = calculateWorkoutSessionSettlement([set], {
          hasWheyProtein: true,
          hasPreWorkout: false,
        });

        assert.equal(result.totalCoins, 0, `${newId} must yield 0 coins`);
        assert.equal(result.totalExperience, 0, `${newId} must yield 0 experience`);
        assert.equal(result.totalRawVolume, 0, `${newId} must yield 0 raw volume`);
      });
    }

    test('mixed session with 1 strength exercise and 1 new walk exercise only awards strength portion', () => {
      const squat = EXERCISE_LIBRARY.find((e) => e.id === 'barbell_squat')!;
      const walk = EXERCISE_LIBRARY.find((e) => e.id === 'walk_brisk')!;

      const squatOnlyResult = calculateWorkoutSessionSettlement(
        [
          {
            exerciseId: squat.id,
            muscleGroup: squat.muscleGroup,
            category: squat.category,
            unitLabel: squat.unitLabel,
            weightKg: 80,
            reps: 8,
          },
        ],
        { hasWheyProtein: true, hasPreWorkout: false }
      );

      const mixedResult = calculateWorkoutSessionSettlement(
        [
          {
            exerciseId: squat.id,
            muscleGroup: squat.muscleGroup,
            category: squat.category,
            unitLabel: squat.unitLabel,
            weightKg: 80,
            reps: 8,
          },
          {
            exerciseId: walk.id,
            muscleGroup: walk.muscleGroup,
            category: walk.category,
            unitLabel: walk.unitLabel,
            weightKg: 3,
            reps: 1,
            distanceM: 3000,
          },
        ],
        { hasWheyProtein: true, hasPreWorkout: false }
      );

      assert.equal(mixedResult.totalCoins, squatOnlyResult.totalCoins);
      assert.equal(mixedResult.totalExperience, squatOnlyResult.totalExperience);
      assert.equal(mixedResult.totalRawVolume, squatOnlyResult.totalRawVolume);
    });
  });

  describe('3. Catalog library structure, types & template resolution', () => {
    test('all 12 original exercise ids exist in EXERCISE_LIBRARY with mapped sportTypes', () => {
      const libraryMap = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e]));

      for (const origId of ORIGINAL_12_IDS) {
        assert.ok(libraryMap.has(origId), `Original id ${origId} must be present`);
      }

      // 9 strength items
      const strength9 = [
        'barbell_squat',
        'barbell_bench_press',
        'conventional_deadlift',
        'overhead_press',
        'pull_ups',
        'barbell_row',
        'leg_press',
        'lateral_raise',
        'dumbbell_curl',
      ];
      for (const id of strength9) {
        assert.equal(libraryMap.get(id)?.sportType, 'strength');
      }

      // cardio items remapped
      assert.equal(libraryMap.get('cardio_incline_run')?.sportType, 'run');
      assert.equal(libraryMap.get('cardio_hiit_bike')?.sportType, 'cycle');

      // bw_plank_core remains bodyweight, name changed
      const plank = libraryMap.get('bw_plank_core')!;
      assert.equal(plank.sportType, 'bodyweight');
      assert.equal(plank.unitLabel, '秒');
      assert.ok(!plank.nameZh.includes('瑜珈'), 'Plank name no longer needs to include 瑜珈');
      assert.equal(plank.nameZh, '徒手棒式核心');
    });

    test('new catalog exercises exist with correct types and coach 3 instructions + 3 safety cues', () => {
      const libraryMap = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e]));

      const expectedNewItems = [
        {
          id: 'yoga_dynamic_flow',
          type: 'yoga_stretch',
          nameZh: '動態流瑜珈',
          unit: '分鐘',
          instructionCues: [
            '動作跟著呼吸走，一次吸氣或吐氣換一個姿勢',
            '照自己的柔軟度做，有拉伸感就停',
            '最後留幾分鐘躺下來放鬆',
          ],
          safetyCues: [
            '不要用彈的，也不要硬壓到痛',
            '膝蓋或手腕不舒服，可以墊毛巾或換姿勢',
            '懷孕或頸背有傷的人，倒立和深度扭轉請先問專業人員',
          ],
        },
        {
          id: 'walk_brisk',
          type: 'walk',
          nameZh: '快走／健走',
          unit: 'km',
          instructionCues: [
            '抬頭挺胸、眼睛看前方',
            '手臂自然彎曲，前後擺動',
            '腳跟先著地，再滾到腳尖',
          ],
          safetyCues: [
            '先用自己舒服的速度，能說話但不能唱歌就是中等強度',
            '穿合腳的鞋，注意路面和來車',
            '天熱多喝水，頭暈或胸悶就停下來',
          ],
        },
        {
          id: 'swim_freestyle',
          type: 'swim',
          nameZh: '游泳',
          unit: '公尺',
          instructionCues: [
            '下水前先在岸上活動肩膀和腳踝',
            '任何泳式都算，換氣順就好',
            '累了可以抓池邊休息，或改成踢水、在水裡走路',
          ],
          safetyCues: [
            '在有救生員的地方游，不熟水性就待在淺水區',
            '剛吃飽、喝過酒或身體不舒服時不要下水',
            '抽筋時先抓池邊或仰漂，不要硬撐',
          ],
        },
        {
          id: 'ball_sports',
          type: 'ball',
          nameZh: '球類',
          unit: '分鐘',
          instructionCues: [
            '上場前先熱身 5–10 分鐘，例如慢跑、轉肩、轉腳踝',
            '跳起來落地時膝蓋微彎，不要往內夾',
            '換場或暫停時喝水',
          ],
          safetyCues: [
            '看球種戴護具，例如羽球、網球注意眼睛，籃球注意腳踝',
            '急停和轉向容易扭傷，剛開始先打輕鬆一點',
            '被撞到或扭傷後疼痛不退，就停下來，必要時就醫',
          ],
        },
        {
          id: 'circuit_hiit',
          type: 'circuit_hiit',
          nameZh: '循環訓練／HIIT',
          unit: '分鐘',
          instructionCues: [
            '一個動作做 20–40 秒，休息 10–30 秒，再換下一個',
            '動作做標準比做得快重要',
            '結束後慢走或伸展 3–5 分鐘',
          ],
          safetyCues: [
            '新手可以拉長休息，或換成簡單版，例如跪姿伏地挺身、不跳的開合跳',
            '喘到說不出完整的句子就放慢',
            '有心臟或血壓問題，或懷孕的人，請先問醫師再做高強度訓練',
          ],
        },
        {
          id: 'custom_workout',
          type: 'custom',
          nameZh: '自訂',
          unit: '分鐘',
          instructionCues: [
            '任何讓你動起來的活動都算，例如爬山、跳舞、划船',
            '開始前先熱身幾分鐘',
            '結束前放慢速度，記得補水',
          ],
          safetyCues: [
            '第一次做的活動，先從短時間、輕鬆的強度開始',
            '在戶外注意天氣、日曬和補水，爬山前把行程告訴家人',
            '疼痛、頭暈或胸悶就停下來',
          ],
        },
      ];

      for (const item of expectedNewItems) {
        const found = libraryMap.get(item.id);
        assert.ok(found, `Expected new catalog item ${item.id} to exist`);
        assert.equal(found.sportType, item.type);
        assert.equal(found.nameZh, item.nameZh);
        assert.equal(found.unitLabel, item.unit);
        assert.deepEqual(found.instructionCues, item.instructionCues);
        assert.deepEqual(found.safetyCues, item.safetyCues);
      }

      // Swim distance must be metres (never km)
      const swim = libraryMap.get('swim_freestyle')!;
      assert.equal(swim.unitLabel, '公尺');
      assert.notEqual(swim.unitLabel, 'km');
    });

    test('initial saved templates referencing bw_plank_core and cardio_* still resolve', () => {
      const libraryIds = new Set(EXERCISE_LIBRARY.map((e) => e.id));

      for (const tpl of INITIAL_SAVED_ROUTINES) {
        for (const exConfig of tpl.exercises) {
          assert.ok(
            libraryIds.has(exConfig.exerciseId),
            `Template ${tpl.id} references ${exConfig.exerciseId} which must exist in EXERCISE_LIBRARY`
          );
        }
      }
    });
  });

  describe('4. mapLegacyExerciseToSportType pure function', () => {
    test('maps all 10 types correctly by ID', () => {
      assert.equal(mapLegacyExerciseToSportType('barbell_squat'), 'strength');
      assert.equal(mapLegacyExerciseToSportType('bw_plank_core'), 'bodyweight');
      assert.equal(mapLegacyExerciseToSportType('cardio_incline_run'), 'run');
      assert.equal(mapLegacyExerciseToSportType('treadmill_run'), 'run');
      assert.equal(mapLegacyExerciseToSportType('cardio_hiit_bike'), 'cycle');
      assert.equal(mapLegacyExerciseToSportType('walk_brisk'), 'walk');
      assert.equal(mapLegacyExerciseToSportType('walk'), 'walk');
      assert.equal(mapLegacyExerciseToSportType('swim_freestyle'), 'swim');
      assert.equal(mapLegacyExerciseToSportType('swim'), 'swim');
      assert.equal(mapLegacyExerciseToSportType('yoga_dynamic_flow'), 'yoga_stretch');
      assert.equal(mapLegacyExerciseToSportType('yoga_flow'), 'yoga_stretch');
      assert.equal(mapLegacyExerciseToSportType('ball_sports'), 'ball');
      assert.equal(mapLegacyExerciseToSportType('circuit_hiit'), 'circuit_hiit');
      assert.equal(mapLegacyExerciseToSportType('custom_workout'), 'custom');
      assert.equal(mapLegacyExerciseToSportType('custom'), 'custom');
    });

    test('unknown exercise with 公尺 or m is mapped to swim (must NOT be treated as strength)', () => {
      assert.equal(mapLegacyExerciseToSportType('unknown_pool_swim', '公尺'), 'swim');
      assert.equal(mapLegacyExerciseToSportType('unknown_lake_lap', 'm'), 'swim');
      assert.notEqual(mapLegacyExerciseToSportType('unknown_pool_swim', '公尺'), 'strength');
    });

    test('unknown exercise unit fallback for km, 秒, and other', () => {
      assert.equal(mapLegacyExerciseToSportType('unknown_trail', 'km'), 'run');
      assert.equal(mapLegacyExerciseToSportType('unknown_core', '秒'), 'bodyweight');
      assert.equal(mapLegacyExerciseToSportType('unknown_lift', 'kg'), 'strength');
      assert.equal(mapLegacyExerciseToSportType('unknown_item', '次'), 'strength');
    });
  });

  describe('5. Circuit / HIIT session timing & three-conditions exemption', () => {
    test('a live_focus session with sportType circuit_hiit containing strength exercises returns appliesThreeConditions: false and passed: null', () => {
      // 2 sets of barbell_squat with 0s rest (restShare 0%) which would FAIL strength 3-conditions
      const setsWithZeroRest = [
        {
          exerciseId: 'barbell_squat',
          startedAt: 10000,
          completedAt: 10030,
          restTimerElapsedSec: 0,
        },
        {
          exerciseId: 'barbell_squat',
          startedAt: 10030,
          completedAt: 10060,
          restTimerElapsedSec: 0,
        },
      ];

      const resultZeroRest = evaluateStrengthSessionTiming(
        {
          sportType: 'circuit_hiit',
          loggingMode: 'live_focus',
          sets: setsWithZeroRest,
        }
      );

      assert.equal(resultZeroRest.timingIncomplete, false);
      assert.equal(resultZeroRest.appliesThreeConditions, false);
      assert.equal(resultZeroRest.passed, null);

      // 2 sets of barbell_squat with 30s rest (restShare > 25%) which would PASS strength 3-conditions
      const setsWithGoodRest = [
        {
          exerciseId: 'barbell_squat',
          startedAt: 10000,
          completedAt: 10030,
          restTimerElapsedSec: 30,
        },
        {
          exerciseId: 'barbell_squat',
          startedAt: 10060,
          completedAt: 10090,
          restTimerElapsedSec: 0,
        },
      ];

      const resultGoodRest = evaluateStrengthSessionTiming(
        {
          sportType: 'circuit_hiit',
          loggingMode: 'live_focus',
          sets: setsWithGoodRest,
        }
      );

      assert.equal(resultGoodRest.timingIncomplete, false);
      assert.equal(resultGoodRest.appliesThreeConditions, false);
      assert.equal(resultGoodRest.passed, null);

      // Verify that if sportType was 'strength', the zero-rest would indeed have failed
      const strengthResult = evaluateStrengthSessionTiming(
        {
          sportType: 'strength',
          loggingMode: 'live_focus',
          sets: setsWithZeroRest,
        }
      );
      assert.equal(strengthResult.appliesThreeConditions, true);
      assert.equal(strengthResult.passed, false);
    });

    test('supports session-level activeSessionSportType passed in options', () => {
      const sets = [
        {
          exerciseId: 'barbell_squat',
          startedAt: 10000,
          completedAt: 10030,
          restTimerElapsedSec: 0,
        },
        {
          exerciseId: 'barbell_squat',
          startedAt: 10030,
          completedAt: 10060,
          restTimerElapsedSec: 0,
        },
      ];

      const result = evaluateStrengthSessionTiming(sets, {
        activeSessionSportType: 'circuit_hiit',
        loggingMode: 'live_focus',
      });

      assert.equal(result.appliesThreeConditions, false);
      assert.equal(result.passed, null);
    });
  });

  describe('6. Adventure sport skill type mapping (toAdventureSportSkillType)', () => {
    test('strength maps to strength', () => {
      assert.equal(toAdventureSportSkillType('strength', 'cardio'), 'strength');
    });

    test('run and cycle map to cardio (preserving former catalog cardio adventure skill)', () => {
      assert.equal(toAdventureSportSkillType('run', 'strength'), 'cardio');
      assert.equal(toAdventureSportSkillType('cycle', 'bodyweight'), 'cardio');
      assert.equal(toAdventureSportSkillType('cardio', 'strength'), 'cardio');
    });

    test('bodyweight maps to bodyweight', () => {
      assert.equal(toAdventureSportSkillType('bodyweight', 'cardio'), 'bodyweight');
    });

    test('new undecided types (walk, swim, yoga_stretch, ball, circuit_hiit, custom) keep previous skill', () => {
      const previousSkills: AdventureSportSkillType[] = ['strength', 'cardio', 'bodyweight'];
      const undecidedTypes: WorkoutSessionSportType[] = [
        'walk',
        'swim',
        'yoga_stretch',
        'ball',
        'circuit_hiit',
        'custom',
      ];

      for (const prev of previousSkills) {
        for (const t of undecidedTypes) {
          assert.equal(
            toAdventureSportSkillType(t, prev),
            prev,
            `Expected ${t} with previous ${prev} to retain ${prev}`
          );
        }
      }
    });
  });

  describe('7. Store integration and in-memory session field', () => {
    test('activeSessionSportType is not persisted in zustand partialize and persist version remains 4', () => {
      const storeContent = fs.readFileSync(new URL('../stores/useGameStore.ts', import.meta.url), 'utf8');
      assert.ok(storeContent.includes('activeSessionSportType: WorkoutSessionSportType | null;'));
      assert.ok(storeContent.includes("name: 'fitmon-mvp-storage-v6'"));
      assert.ok(storeContent.includes('version: 4'));

      // Ensure activeSessionSportType is NOT in partialize
      const partializeMatch = storeContent.match(/partialize:\s*\(state\)\s*=>\s*\(\{([\s\S]*?)\}\)/);
      assert.ok(partializeMatch, 'partialize function must exist');
      assert.ok(
        !partializeMatch[1].includes('activeSessionSportType'),
        'activeSessionSportType must NOT be in partialize (in-memory only)'
      );
    });

    test('computePersistedSetFields handles 公尺 and 分鐘 correctly', () => {
      const swimFields = computePersistedSetFields(200, '公尺');
      assert.equal(swimFields.weightKg, 0);
      assert.equal(swimFields.distanceM, 200);

      const minFields = computePersistedSetFields(15, '分鐘');
      assert.equal(minFields.weightKg, 0);
      assert.equal(minFields.durationSec, 900);
    });
  });

  describe('8. Session sport type resolution & lifecycle pure helpers (T4-D3 correctness fix)', () => {
    describe('resolveInitialSessionSportType', () => {
      test('1. When starting 自由訓練 (no routine), leaves activeSessionSportType as null', () => {
        assert.equal(resolveInitialSessionSportType(), null);
        assert.equal(resolveInitialSessionSportType(undefined), null);
        assert.equal(resolveInitialSessionSportType(null), null);
      });

      test('2. When starting from a routine with explicit sportType, uses routine.sportType', () => {
        const routine = {
          id: 'tpl_hiit',
          sportType: 'circuit_hiit' as WorkoutSessionSportType,
          exercises: [{ exerciseId: 'barbell_squat' }],
        };
        assert.equal(resolveInitialSessionSportType(routine), 'circuit_hiit');
      });

      test('2. When starting from a routine without explicit sportType, derives from first exercise', () => {
        const strengthRoutine = {
          id: 'tpl_leg',
          exercises: [{ exerciseId: 'barbell_squat' }],
        };
        assert.equal(resolveInitialSessionSportType(strengthRoutine), 'strength');

        const runRoutine = {
          id: 'tpl_cardio',
          exercises: [{ exerciseId: 'cardio_incline_run' }],
        };
        assert.equal(resolveInitialSessionSportType(runRoutine), 'run');
      });
    });

    describe('resolveSportTypeOnExerciseChange', () => {
      test('4. Pre-log swap in 自由訓練 (sessionSetsCount === 0) updates activeSessionSportType', () => {
        // Swap to circuit_hiit
        const typeAfterHiitSwap = resolveSportTypeOnExerciseChange(null, 'circuit_hiit', {
          sessionSetsCount: 0,
          isRoutineSession: false,
        });
        assert.equal(typeAfterHiitSwap, 'circuit_hiit');

        // Swap to cardio_incline_run (run)
        const typeAfterRunSwap = resolveSportTypeOnExerciseChange(
          typeAfterHiitSwap,
          'cardio_incline_run',
          { sessionSetsCount: 0, isRoutineSession: false }
        );
        assert.equal(typeAfterRunSwap, 'run');

        // Swap to cardio_hiit_bike (cycle)
        const typeAfterBikeSwap = resolveSportTypeOnExerciseChange(
          typeAfterRunSwap,
          'cardio_hiit_bike',
          { sessionSetsCount: 0, isRoutineSession: false }
        );
        assert.equal(typeAfterBikeSwap, 'cycle');
      });

      test('4. After any set is logged (sessionSetsCount > 0), does not change activeSessionSportType', () => {
        // Session started as circuit_hiit, 1 set completed, now user adds/swaps to squats
        const typeAfterSquat = resolveSportTypeOnExerciseChange(
          'circuit_hiit',
          'barbell_squat',
          { sessionSetsCount: 1, isRoutineSession: false }
        );
        assert.equal(typeAfterSquat, 'circuit_hiit', 'Must remain frozen on circuit_hiit');

        // Session started as run, 2 sets completed, user swaps to bench press
        const typeAfterBench = resolveSportTypeOnExerciseChange(
          'run',
          'barbell_bench_press',
          { sessionSetsCount: 2, isRoutineSession: false }
        );
        assert.equal(typeAfterBench, 'run', 'Must remain frozen on run');
      });

      test('2. Routine session with squats in circuit routine does not flip to strength', () => {
        // Routine has circuit_hiit, user selects/swaps squats before logging
        const result = resolveSportTypeOnExerciseChange(
          'circuit_hiit',
          'barbell_squat',
          { sessionSetsCount: 0, isRoutineSession: true }
        );
        assert.equal(result, 'circuit_hiit', 'Routine session must freeze routine sportType');
      });
    });

    describe('resolveSportTypeOnFirstSetLogged', () => {
      test('3. If activeSessionSportType is null when first set is logged, set and freeze from set mapped type', () => {
        assert.equal(resolveSportTypeOnFirstSetLogged(null, 'barbell_squat'), 'strength');
        assert.equal(resolveSportTypeOnFirstSetLogged(null, 'cardio_incline_run'), 'run');
        assert.equal(resolveSportTypeOnFirstSetLogged(null, 'cardio_hiit_bike'), 'cycle');
        assert.equal(resolveSportTypeOnFirstSetLogged(null, 'circuit_hiit'), 'circuit_hiit');
        assert.equal(resolveSportTypeOnFirstSetLogged(null, 'unknown_pool', '公尺'), 'swim');
      });

      test('3. If activeSessionSportType is already set, preserves existing type upon logging first set', () => {
        // Pre-swap to circuit_hiit or routine circuit_hiit logging a squat set
        assert.equal(resolveSportTypeOnFirstSetLogged('circuit_hiit', 'barbell_squat'), 'circuit_hiit');
        assert.equal(resolveSportTypeOnFirstSetLogged('run', 'pull_ups'), 'run');
      });
    });

    describe('Lifecycle & Timing Integration: Preventing Regression', () => {
      test('free training with swap to circuit_hiit avoids strength 3-conditions on finish', () => {
        // Step 1: Start free training -> initial activeSessionSportType is null
        let activeSportType = resolveInitialSessionSportType();
        assert.equal(activeSportType, null);

        // Step 2: Swap to circuit_hiit before any set is logged
        activeSportType = resolveSportTypeOnExerciseChange(activeSportType, 'circuit_hiit', {
          sessionSetsCount: 0,
          isRoutineSession: false,
        });
        assert.equal(activeSportType, 'circuit_hiit');

        // Step 3: Log 2 sets of circuit_hiit with 0 rest
        activeSportType = resolveSportTypeOnFirstSetLogged(activeSportType, 'circuit_hiit');
        assert.equal(activeSportType, 'circuit_hiit');

        const setsWithZeroRest = [
          {
            exerciseId: 'circuit_hiit',
            startedAt: 10000,
            completedAt: 10030,
            restTimerElapsedSec: 0,
          },
          {
            exerciseId: 'circuit_hiit',
            startedAt: 10030,
            completedAt: 10060,
            restTimerElapsedSec: 0,
          },
        ];

        // Step 4: Finish workout session uses activeSessionSportType
        const timingResult = evaluateStrengthSessionTiming(setsWithZeroRest, {
          activeSessionSportType: activeSportType,
          loggingMode: 'live_focus',
        });

        // 3-conditions must NOT apply to circuit_hiit
        assert.equal(timingResult.appliesThreeConditions, false);
        assert.equal(timingResult.passed, null);
      });

      test('free training with swap to cardio_incline_run avoids strength 3-conditions on finish', () => {
        let activeSportType = resolveInitialSessionSportType();
        activeSportType = resolveSportTypeOnExerciseChange(activeSportType, 'cardio_incline_run', {
          sessionSetsCount: 0,
          isRoutineSession: false,
        });
        assert.equal(activeSportType, 'run');

        activeSportType = resolveSportTypeOnFirstSetLogged(activeSportType, 'cardio_incline_run');
        assert.equal(activeSportType, 'run');

        const runSets = [
          {
            exerciseId: 'cardio_incline_run',
            startedAt: 10000,
            completedAt: 11200,
            restTimerElapsedSec: 0,
          },
        ];

        const timingResult = evaluateStrengthSessionTiming(runSets, {
          activeSessionSportType: activeSportType,
          loggingMode: 'live_focus',
        });

        assert.equal(timingResult.appliesThreeConditions, false);
        assert.equal(timingResult.passed, null);
      });

      test('free training without swap falls back to first set logged (strength) and evaluates conditions', () => {
        let activeSportType = resolveInitialSessionSportType();
        assert.equal(activeSportType, null);

        // Player logs barbell_squat directly without swapping
        activeSportType = resolveSportTypeOnFirstSetLogged(activeSportType, 'barbell_squat');
        assert.equal(activeSportType, 'strength');

        const strengthSetsWithZeroRest = [
          {
            exerciseId: 'barbell_squat',
            startedAt: 10000,
            completedAt: 10030,
            restTimerElapsedSec: 0,
          },
          {
            exerciseId: 'barbell_squat',
            startedAt: 10030,
            completedAt: 10060,
            restTimerElapsedSec: 0,
          },
        ];

        const timingResult = evaluateStrengthSessionTiming(strengthSetsWithZeroRest, {
          activeSessionSportType: activeSportType,
          loggingMode: 'live_focus',
        });

        assert.equal(timingResult.appliesThreeConditions, true);
        assert.equal(timingResult.passed, false); // failed because rest is 0s (< 20s and < 25%)
      });

      test('store static code verification: hooks into lifecycle methods correctly', () => {
        const storeCode = fs.readFileSync(new URL('../stores/useGameStore.ts', import.meta.url), 'utf8');

        // 1. startWorkoutFocus calls resolveInitialSessionSportType
        assert.ok(
          storeCode.includes('resolveInitialSessionSportType(routine)'),
          'startWorkoutFocus must call resolveInitialSessionSportType'
        );

        // 2. swapActiveExercise calls resolveSportTypeOnExerciseChange
        assert.ok(
          storeCode.includes('resolveSportTypeOnExerciseChange('),
          'swapActiveExercise must call resolveSportTypeOnExerciseChange'
        );

        // 3. logWorkoutSet calls resolveSportTypeOnFirstSetLogged
        assert.ok(
          storeCode.includes('resolveSportTypeOnFirstSetLogged('),
          'logWorkoutSet must call resolveSportTypeOnFirstSetLogged'
        );

        // 5. finishWorkoutSession falls back to mapping first logged set if null
        assert.ok(
          storeCode.includes('state.activeSessionSportType ||'),
          'finishWorkoutSession must keep activeSessionSportType fallback'
        );
      });
    });
  });
});
