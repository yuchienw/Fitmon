/**
 * FitMon 運動科學與數值平衡引擎 (Core Numerical Engine)
 * 實現：
 * 1. 動作神經加權係數 (Neural Load Multipliers)
 * 2. 疲勞與垃圾容量衰減係數 (Fatigue & Junk Volume Decay)
 * 3. 經驗值 (EXP) 與金幣結算演算法
 */

export type ExerciseCategory = 'compound_big3' | 'compound_secondary' | 'machine' | 'isolation';

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: ExerciseCategory;
  targetMuscleGroup: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
  neuralMultiplier: number; // 加權倍率
}

export interface WorkoutSetInput {
  exerciseId: string;
  muscleGroup: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
  category: ExerciseCategory;
  weightKg: number;
  reps: number;
}

export interface SupplementBuffs {
  hasCreatine?: boolean;    // 食用肌酸：上限+1組
  hasWheyProtein?: boolean; // 乳清蛋白：結算 EXP & 金幣 +20%
  hasPreWorkout?: boolean;  // 預釀氮泵：30% 機率神經暴擊翻倍
}

export interface CalculationResult {
  totalRawVolume: number;    // 總生容量 (kg * reps)
  totalExperience: number;   // 最終結算經驗值
  totalCoins: number;        // 獲得金幣
  isCriticalHit: boolean;    // 是否觸發氮泵暴擊
  setBreakdowns: {
    setIndex: number;
    muscleGroup: string;
    rawVolume: number;
    multiplier: number;
    decayFactor: number;
    calculatedExp: number;
  }[];
}

/**
 * 預設動作神經加權係數表
 */
export const CATEGORY_MULTIPLIERS: Record<ExerciseCategory, number> = {
  compound_big3: 2.2,       // 深蹲、硬舉、臥推三大複合動作 (2.0 ~ 2.5)
  compound_secondary: 1.5,  // 肩推、引體向上、槓鈴划船 (1.4 ~ 1.6)
  machine: 1.0,             // 固定軌道機械式 (基準線 1.0)
  isolation: 0.8,           // 單關節孤立動作 (0.8，避免單部位刷次數)
};

/**
 * 計算單一部位累積組數的疲勞與垃圾容量衰減係數
 * - 1~8 組：1.0 (全額黃金刺激區間)
 * - 9~11 組：0.5 ~ 0.2 (過度疲勞區間，邊際效益遞減)
 * - 12 組以上：0.0 (垃圾容量，經驗歸零)
 */
export function getFatigueDecayFactor(accumulatedSetsForMuscle: number): number {
  if (accumulatedSetsForMuscle <= 8) {
    return 1.0;
  }
  if (accumulatedSetsForMuscle === 9) {
    return 0.5;
  }
  if (accumulatedSetsForMuscle === 10) {
    return 0.3;
  }
  if (accumulatedSetsForMuscle === 11) {
    return 0.15;
  }
  return 0.0; // >= 12 組判定為垃圾容量
}

/**
 * 核心結算函數
 */
export function calculateWorkoutExp(
  sets: WorkoutSetInput[],
  buffs: SupplementBuffs = {}
): CalculationResult {
  const muscleSetCounts: Record<string, number> = {};
  let totalRawVolume = 0;
  let totalExp = 0;

  const breakdowns: CalculationResult['setBreakdowns'] = [];

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const muscle = s.muscleGroup;
    muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + 1;

    const rawVolume = s.weightKg * s.reps;
    totalRawVolume += rawVolume;

    const multiplier = CATEGORY_MULTIPLIERS[s.category] || 1.0;
    const decay = getFatigueDecayFactor(muscleSetCounts[muscle]);

    const setExp = rawVolume * multiplier * decay;
    totalExp += setExp;

    breakdowns.push({
      setIndex: i + 1,
      muscleGroup: muscle,
      rawVolume,
      multiplier,
      decayFactor: decay,
      calculatedExp: Math.round(setExp * 10) / 10,
    });
  }

  // 氮泵暴擊判定 (30% 機率翻倍)
  let isCriticalHit = false;
  if (buffs.hasPreWorkout && Math.random() < 0.3) {
    isCriticalHit = true;
    totalExp *= 2.0;
  }

  // 乳清蛋白 Buff (+20%)
  if (buffs.hasWheyProtein) {
    totalExp *= 1.2;
  }

  const finalExp = Math.round(totalExp);
  // 金幣按經驗值 10:1 基礎發放
  const finalCoins = Math.max(1, Math.floor(finalExp / 10));

  return {
    totalRawVolume,
    totalExperience: finalExp,
    totalCoins: finalCoins,
    isCriticalHit,
    setBreakdowns: breakdowns,
  };
}
