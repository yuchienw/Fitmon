/**
 * FitMon 新存檔初始狀態與示範資料模組 (T7-A2)
 *
 * 核心規範：
 * - 全新存檔（含「重置本機 LocalStorage 初始進度」）：紀錄、PR、身體數值、生涯統計、好友皆從空白或 0 開始。
 * - 舊存檔資料完全保留，不觸發任何破壞性清除或重寫。
 * - 示範模式 (Showcase / 測試外掛) 可手動載入 DEMO_SEED_* 示範資料。
 */

import { ADVENTURE_BOSS_CATALOG } from '../config/catalogConfig.ts';
import type { AvatarBodyStage, EquipSlot, RoomSlot } from '../config/catalogConfig.ts';
import { ECONOMY_CONFIG } from '../config/economyConfig.ts';
import { fillV4SessionDefaults } from './persistMigrate.ts';
import type { WorkoutSessionSportType } from './workoutRecord.ts';

export interface Biometrics {
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  activityMultiplier: number;
  goal: 'cut' | 'maintain' | 'bulk';
}

export interface WorkoutSessionRecord {
  id: string;
  dateLabel: string;
  daysAgo?: number;
  timestamp?: number;
  routineName: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  coinsEarned: number;
  expEarned: number;
  topExerciseZh: string;
  exerciseLogs: {
    exerciseId: string;
    exerciseNameZh: string;
    unitLabel: string;
    sets: {
      weightKg: number;
      reps: number;
      restSec: number;
      isPR: boolean;
      startedAt?: number;
      completedAt?: number;
      durationSec?: number;
      distanceM?: number;
      plannedRestSec?: number;
      restTimerElapsedSec?: number;
      startedEarly?: boolean;
      timingIncomplete?: boolean;
    }[];
  }[];
  sportType?: WorkoutSessionSportType;
  source?: 'in_app' | 'health_app';
  loggingMode?: 'live_focus' | 'after_the_fact' | 'health_app';
  endedUnwell?: boolean;
  pauseSegments?: { startedAt: number; endedAt: number }[];
  durationSec?: number;
  timingIncomplete?: boolean;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  visibility: 'public' | 'friends' | 'mine';
  isVerified: boolean;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  workoutSummary: string;
  totalVolumeKg: number;
  streakDays: number;
  caption: string;
  stickerText?: string;
  tipsCount: number;
  waterCount: number;
  createdAtLabel: string;
  customImageDataUrl?: string;
}

// ============================================================================
// 1. 舊版示範資料常數 (DEMO_SEED_*)
// ============================================================================

export const DEMO_SEED_WORKOUT_HISTORY: WorkoutSessionRecord[] = [
  {
    id: 'hist_seed_1',
    dateLabel: '昨天 20:15',
    daysAgo: 1,
    routineName: '🔥 黃金臀腿增肌主課表',
    durationMinutes: 48,
    totalVolume: 6320,
    totalSets: 7,
    coinsEarned: 110,
    expEarned: 1100,
    topExerciseZh: '槓鈴頸後深蹲',
    exerciseLogs: [
      {
        exerciseId: 'barbell_squat',
        exerciseNameZh: '槓鈴頸後深蹲',
        unitLabel: 'kg',
        sets: [
          { weightKg: 80, reps: 8, restSec: 120, isPR: false },
          { weightKg: 85, reps: 8, restSec: 120, isPR: false },
          { weightKg: 90, reps: 8, restSec: 120, isPR: false },
          { weightKg: 100, reps: 6, restSec: 150, isPR: true },
        ],
      },
      {
        exerciseId: 'leg_press',
        exerciseNameZh: '45度器械腿推',
        unitLabel: 'kg',
        sets: [
          { weightKg: 120, reps: 10, restSec: 90, isPR: false },
          { weightKg: 130, reps: 10, restSec: 90, isPR: false },
          { weightKg: 130, reps: 10, restSec: 90, isPR: false },
        ],
      },
    ],
  },
  {
    id: 'hist_seed_2',
    dateLabel: '2 天前 19:30',
    daysAgo: 2,
    routineName: '💪 下班快速推日',
    durationMinutes: 42,
    totalVolume: 4680,
    totalSets: 7,
    coinsEarned: 95,
    expEarned: 950,
    topExerciseZh: '槓鈴平板臥推',
    exerciseLogs: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseNameZh: '槓鈴平板臥推',
        unitLabel: 'kg',
        sets: [
          { weightKg: 60, reps: 8, restSec: 120, isPR: false },
          { weightKg: 65, reps: 8, restSec: 120, isPR: false },
          { weightKg: 70, reps: 8, restSec: 120, isPR: false },
          { weightKg: 75, reps: 6, restSec: 120, isPR: true },
        ],
      },
      {
        exerciseId: 'overhead_press',
        exerciseNameZh: '站姿槓鈴肩推',
        unitLabel: 'kg',
        sets: [
          { weightKg: 40, reps: 8, restSec: 90, isPR: false },
          { weightKg: 42.5, reps: 8, restSec: 90, isPR: false },
          { weightKg: 45, reps: 8, restSec: 90, isPR: true },
        ],
      },
    ],
  },
  {
    id: 'hist_seed_3',
    dateLabel: '4 天前 21:00',
    daysAgo: 4,
    routineName: '🦅 倒三角背部拉日',
    durationMinutes: 45,
    totalVolume: 5120,
    totalSets: 8,
    coinsEarned: 105,
    expEarned: 1020,
    topExerciseZh: '傳統槓鈴硬舉',
    exerciseLogs: [
      {
        exerciseId: 'conventional_deadlift',
        exerciseNameZh: '傳統槓鈴硬舉',
        unitLabel: 'kg',
        sets: [
          { weightKg: 100, reps: 6, restSec: 150, isPR: false },
          { weightKg: 110, reps: 6, restSec: 150, isPR: false },
          { weightKg: 120, reps: 5, restSec: 150, isPR: true },
        ],
      },
      {
        exerciseId: 'lat_pulldown',
        exerciseNameZh: '寬握滑輪下拉',
        unitLabel: 'kg',
        sets: [
          { weightKg: 55, reps: 10, restSec: 90, isPR: false },
          { weightKg: 60, reps: 10, restSec: 90, isPR: false },
          { weightKg: 60, reps: 10, restSec: 90, isPR: false },
        ],
      },
    ],
  },
  {
    id: 'hist_seed_4',
    dateLabel: '8 天前 18:40',
    daysAgo: 8,
    routineName: '🔥 黃金臀腿增肌主課表',
    durationMinutes: 50,
    totalVolume: 5900,
    totalSets: 7,
    coinsEarned: 100,
    expEarned: 980,
    topExerciseZh: '槓鈴頸後深蹲',
    exerciseLogs: [
      {
        exerciseId: 'barbell_squat',
        exerciseNameZh: '槓鈴頸後深蹲',
        unitLabel: 'kg',
        sets: [
          { weightKg: 80, reps: 8, restSec: 120, isPR: false },
          { weightKg: 85, reps: 8, restSec: 120, isPR: false },
          { weightKg: 90, reps: 8, restSec: 120, isPR: false },
        ],
      },
    ],
  },
  {
    id: 'hist_seed_5',
    dateLabel: '14 天前 20:00',
    daysAgo: 14,
    routineName: '🏃 有氧燃脂＋核心恢復',
    durationMinutes: 35,
    totalVolume: 2400,
    totalSets: 5,
    coinsEarned: 70,
    expEarned: 680,
    topExerciseZh: '坡度跑步機快走',
    exerciseLogs: [
      {
        exerciseId: 'treadmill_run',
        exerciseNameZh: '坡度跑步機快走',
        unitLabel: '分鐘',
        sets: [{ weightKg: 1, reps: 25, restSec: 60, isPR: false }],
      },
    ],
  },
].map((s) => fillV4SessionDefaults(s) as unknown as WorkoutSessionRecord);

export const DEMO_SEED_PERSONAL_RECORDS: Record<string, number> = {
  barbell_squat: 100,
  barbell_bench_press: 75,
  conventional_deadlift: 120,
  overhead_press: 45,
  pull_ups: 75,
};

export const DEMO_SEED_BIOMETRICS: Biometrics = {
  heightCm: 175,
  weightKg: 72,
  bodyFatPct: 16.5,
  age: 27,
  gender: 'male',
  activityMultiplier: 1.55,
  goal: 'maintain',
};

export const DEMO_SEED_POSTS: SocialPost[] = [
  {
    id: 'post_seed_1',
    authorId: 'celeb_titan_chen',
    authorName: '陳巨石 · Rock',
    authorTitle: 'IPF 健力金牌 · 官方認證',
    visibility: 'public',
    isVerified: true,
    bodyStage: 'titan',
    equipped: {
      hair: 'hair_titan_crown',
      face: 'face_fierce_grit',
      top: 'top_crimson_sbd',
      bottom: 'bottom_navy_shorts',
      accessory: 'acc_gold_barbell',
    },
    room: {
      wallpaper: 'wall_industrial_dark',
      floor: 'floor_gold_marble',
      slotLeft: 'rack_crimson_pro',
      slotCenter: 'pet_shiba_dog',
      slotRight: 'prop_dumbbell_tower',
    },
    workoutSummary: '三項極限巨力課表 · 11組',
    totalVolumeKg: 5850,
    streakDays: 84,
    caption: '今天三項課表全部達標！點我頭像可加好友或來我家同框深蹲 🔥',
    stickerText: '🏆 NEW PR! 地心引力阻止不了我',
    tipsCount: 42,
    waterCount: 28,
    createdAtLabel: '12 分鐘前',
  },
  {
    id: 'post_seed_leo',
    authorId: 'user_leo',
    authorName: '街頭健體 · Leo',
    authorTitle: '體脂 9% · 自然健體 Lv.12',
    visibility: 'public',
    isVerified: false,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_spiky_gold',
      face: 'face_confident_smile',
      top: 'top_bare_muscles',
      bottom: 'bottom_navy_shorts',
      accessory: 'acc_iron_dumbbell',
    },
    room: {
      wallpaper: 'wall_zen_wood',
      floor: 'floor_rubber_black',
      slotLeft: 'rack_classic_cage',
      slotCenter: 'pet_black_cat',
      slotRight: 'prop_dumbbell_tower',
    },
    workoutSummary: '倒三角肩背課表 · 12組',
    totalVolumeKg: 4120,
    streakDays: 16,
    caption: '剛加入 FitMon！赤膊體態終於練出六塊肌了，歡迎大家加我好友一起互相督促 💪',
    stickerText: '⚡ 泵感炸裂！',
    tipsCount: 19,
    waterCount: 11,
    createdAtLabel: '22 分鐘前',
  },
  {
    id: 'post_seed_2',
    authorId: 'friend_akai',
    authorName: '深蹲救星 · 阿凱',
    authorTitle: '好友 · 維京巨力 Lv.14',
    visibility: 'friends',
    isVerified: false,
    bodyStage: 'powerlifter',
    equipped: {
      hair: 'hair_maple_cap',
      face: 'face_pixel_shades',
      top: 'top_pump_cover',
      bottom: 'bottom_camo_joggers',
      accessory: 'acc_protein_shaker',
    },
    room: {
      wallpaper: 'wall_zen_wood',
      floor: 'floor_turf_green',
      slotLeft: 'prop_cardio_treadmill',
      slotCenter: 'pet_black_cat',
      slotRight: 'prop_arcade_cabinet',
    },
    workoutSummary: '黃金臀腿增肌主課表 · 10組',
    totalVolumeKg: 6840,
    streakDays: 12,
    caption: '我把家裡左邊換成跑步機、右邊放街機了！練完腿快來我家串門看看新佈置 😂',
    stickerText: '♿ 今天練腿，明天請幫我推輪椅',
    tipsCount: 15,
    waterCount: 9,
    createdAtLabel: '35 分鐘前',
  },
  {
    id: 'post_seed_3',
    authorId: 'celeb_aesthetic_lin',
    authorName: '林健美 · Jay',
    authorTitle: 'IFBB Pro 古典健體選手',
    visibility: 'public',
    isVerified: true,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_spiky_gold',
      face: 'face_pixel_shades',
      top: 'top_bare_muscles',
      bottom: 'bottom_gold_tights',
      accessory: 'acc_protein_shaker',
    },
    room: {
      wallpaper: 'wall_cyber_neon',
      floor: 'floor_turf_green',
      slotLeft: 'rack_classic_cage',
      slotCenter: 'pet_whey_bot',
      slotRight: 'prop_arcade_cabinet',
    },
    workoutSummary: '3D 倒三角肩背美學 · 15組',
    totalVolumeKg: 4320,
    streakDays: 45,
    caption: '把每一組啞鈴側平舉的休息嚴格控制在 60 秒，三角肌中束泵感炸裂 ✨',
    stickerText: '🧋 我的血液裡流淌著高蛋白乳清',
    tipsCount: 31,
    waterCount: 19,
    createdAtLabel: '1 小時前',
  },
  {
    id: 'post_seed_4',
    authorId: 'friend_alice',
    authorName: '百公斤深蹲 · 艾莉絲',
    authorTitle: '好友 · 古典美學 Lv.19',
    visibility: 'friends',
    isVerified: false,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_ headband_red',
      face: 'face_confident_smile',
      top: 'top_crimson_sbd',
      bottom: 'bottom_gold_tights',
      accessory: 'acc_iron_dumbbell',
    },
    room: {
      wallpaper: 'wall_zen_wood',
      floor: 'floor_rubber_black',
      slotLeft: 'rack_crimson_pro',
      slotCenter: 'pet_shiba_dog',
      slotRight: 'prop_plant_monstera',
    },
    workoutSummary: '有氧燃脂＋核心恢復 · 5組',
    totalVolumeKg: 2400,
    streakDays: 21,
    caption: '今天不做大重量，跑完坡度跑步機再做 3 組棒式核心，身心舒暢 🌿',
    stickerText: '⚡ 延遲性肌肉痠痛是我的勳章',
    tipsCount: 18,
    waterCount: 14,
    createdAtLabel: '2 小時前',
  },
];

export const DEMO_SEED_FRIEND_IDS: string[] = ['friend_akai', 'friend_alice'];

export const DEMO_SEED_CAREER_STATS = {
  personalMaxStage: 1,
  squadMaxStage: 2,
  personalMaxDamage: 680,
  totalBossesDefeated: 3,
  totalFinalBlows: 2,
  totalStrikesCount: 11,
  totalDamageDealt: 6420,
};

export const DEMO_SEED_SQUAD = {
  squadName: '🔥 腿日絕不缺席戰隊',
  squadStage: 2,
  squadBossHp: 1150,
  soloStage: 1,
  soloBossHp: 720,
};

export const DEMO_SEED_EQUIPPED_TOP = 'top_bare_muscles';

// ============================================================================
// 2. 全新存檔預設值 (FRESH_INITIAL_*)
// ============================================================================

export const FRESH_INITIAL_WORKOUT_HISTORY: WorkoutSessionRecord[] = [];
export const FRESH_INITIAL_PERSONAL_RECORDS: Record<string, number> = {};

export const FRESH_INITIAL_BIOMETRICS: Biometrics = {
  heightCm: null,
  weightKg: null,
  bodyFatPct: null,
  age: null,
  gender: null,
  activityMultiplier: 1.55,
  goal: 'maintain',
};

export const FRESH_INITIAL_POSTS: SocialPost[] = [];
export const FRESH_INITIAL_FRIEND_IDS: string[] = [];

export const FRESH_INITIAL_CAREER_STATS = {
  personalMaxStage: 1,
  squadMaxStage: 1,
  personalMaxDamage: 0,
  totalBossesDefeated: 0,
  totalFinalBlows: 0,
  totalStrikesCount: 0,
  totalDamageDealt: 0,
};

export const FRESH_INITIAL_SQUAD = {
  squadName: '我的隊伍',
  squadStage: 1,
  squadMembers: [] as any[],
  squadBossHp: ADVENTURE_BOSS_CATALOG[0]?.maxHp ?? 1000,
  soloStage: 1,
  soloBossHp: ADVENTURE_BOSS_CATALOG[0]?.maxHp ?? 1000,
};

export const FRESH_INITIAL_EQUIPPED_TOP = 'top_black_tank';

// ============================================================================
// 3. 純函式 Helper
// ============================================================================

/**
 * 取得全新存檔片段（純函式，提供單元測試與 Store 初始化檢視）
 */
export function getFreshInitialSaveSlice() {
  return {
    coins: ECONOMY_CONFIG.ftueStarterCoins,
    workoutHistory: FRESH_INITIAL_WORKOUT_HISTORY,
    personalRecords: FRESH_INITIAL_PERSONAL_RECORDS,
    biometrics: { ...FRESH_INITIAL_BIOMETRICS },
    posts: FRESH_INITIAL_POSTS,
    friendIds: FRESH_INITIAL_FRIEND_IDS,
    checkinDayKeys: [] as string[],
    equipped: {
      hair: 'hair_ headband_red',
      face: 'face_confident_smile',
      top: FRESH_INITIAL_EQUIPPED_TOP,
      bottom: 'bottom_navy_shorts',
      accessory: 'acc_iron_dumbbell',
    },
    ownedItemIds: [
      'hair_ headband_red',
      'face_confident_smile',
      'top_bare_muscles',
      'top_black_tank',
      'bottom_navy_shorts',
      'acc_iron_dumbbell',
      'wall_industrial_dark',
      'floor_rubber_black',
      'rack_classic_cage',
      'prop_dumbbell_tower',
      'pet_shiba_dog',
    ],
    ...FRESH_INITIAL_CAREER_STATS,
    ...FRESH_INITIAL_SQUAD,
  };
}

/**
 * 純套用函式：將舊版示範資料覆蓋至目前狀態（示範模式用）
 */
export function applyDemoSeedData<T extends Record<string, any>>(state: T): T {
  return {
    ...state,
    workoutHistory: [...DEMO_SEED_WORKOUT_HISTORY],
    personalRecords: { ...DEMO_SEED_PERSONAL_RECORDS },
    biometrics: { ...DEMO_SEED_BIOMETRICS },
    posts: [...DEMO_SEED_POSTS],
    friendIds: [...DEMO_SEED_FRIEND_IDS],
    personalMaxStage: DEMO_SEED_CAREER_STATS.personalMaxStage,
    squadMaxStage: DEMO_SEED_CAREER_STATS.squadMaxStage,
    personalMaxDamage: DEMO_SEED_CAREER_STATS.personalMaxDamage,
    totalBossesDefeated: DEMO_SEED_CAREER_STATS.totalBossesDefeated,
    totalFinalBlows: DEMO_SEED_CAREER_STATS.totalFinalBlows,
    totalStrikesCount: DEMO_SEED_CAREER_STATS.totalStrikesCount,
    totalDamageDealt: DEMO_SEED_CAREER_STATS.totalDamageDealt,
    squadName: DEMO_SEED_SQUAD.squadName,
    squadStage: DEMO_SEED_SQUAD.squadStage,
    squadBossHp: DEMO_SEED_SQUAD.squadBossHp,
    soloStage: DEMO_SEED_SQUAD.soloStage,
    soloBossHp: DEMO_SEED_SQUAD.soloBossHp,
    equipped: {
      ...(state.equipped || {}),
      top: DEMO_SEED_EQUIPPED_TOP,
    },
  };
}
