import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateWorkoutExp, CalculationResult, ExerciseCategory } from '@fitmon/engine';
import { ECONOMY_CONFIG, Locale } from '../config/economyConfig';
import {
  AVATAR_ITEMS,
  ROOM_ITEMS,
  EXERCISE_LIBRARY,
  INITIAL_SAVED_ROUTINES,
  IAP_PACKAGES,
  FRIEND_PROFILES,
  ADVENTURE_BOSS_CATALOG,
  AvatarBodyStage,
  EquipSlot,
  RoomSlot,
  ConsumableItem,
  WorkoutTemplate,
} from '../config/catalogConfig';
import { soundFX } from '../audio/SoundManager';

export type MainTab = 'home' | 'workout' | 'shop' | 'plaza' | 'analytics';

export type TodayWorkoutStatus = 'none' | 'legit_rest' | 'cheated_fast';
export type AdventureSportSkillType = 'strength' | 'cardio' | 'bodyweight';

export interface SquadMemberState {
  id: string;
  nameZh: string;
  roleType: 'phy' | 'mag' | 'support';
  roleBadgeZh: string;
  gearDescZh: string;
  hasWorkedOutToday: boolean;
  workoutAuditZh: string;
  isSuspectedCheater?: boolean;
  comboSkillAppliedZh?: string;
  damageDealt: number;
  nudgedCount: number;
}

export const SQUAD_CANDIDATE_POOL: SquadMemberState[] = [
  {
    id: 'friend_akai',
    nameZh: '重訓狂人 · 阿凱',
    roleType: 'phy',
    roleBadgeZh: '🥊 物攻專精',
    gearDescZh: '紅黑競技健力服 + 24K 奧林匹亞金槓',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 胸背重訓 8組 · 組間計時完整 (38分鐘)',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔨 連攜技【破甲重擊】：使下位隊友魔攻 ×2.0 倍',
    damageDealt: 650,
    nudgedCount: 0,
  },
  {
    id: 'friend_alice',
    nameZh: '有氧女神 · 小愛',
    roleType: 'mag',
    roleBadgeZh: '🪄 魔攻破盾',
    gearDescZh: '綠光泵感寬T + 暗夜迷彩束口褲',
    hasWorkedOutToday: false,
    workoutAuditZh: '⚠️ 今日尚未運動打卡（可敲她提醒上線）',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔥 連攜技【燃脂魔焰】：引爆破甲並融化高糖護盾',
    damageDealt: 0,
    nudgedCount: 0,
  },
  {
    id: 'friend_leo',
    nameZh: '街頭健體 · Leo',
    roleType: 'phy',
    roleBadgeZh: '🥊 力量型',
    gearDescZh: '黑魂訓練吊嘎 + 鑄鐵 20kg 啞鈴',
    hasWorkedOutToday: true,
    workoutAuditZh: '🤥 耗時 5 秒狂按 6 組深蹲 (組間休息 0秒 · 疑似空氣健身)',
    isSuspectedCheater: true,
    comboSkillAppliedZh: '⚠️ 未通過組間休息驗證（無法觸發連攜技）',
    damageDealt: 15,
    nudgedCount: 0,
  },
  {
    id: 'celeb_titan_chen',
    nameZh: '健力金牌 · 陳巨石',
    roleType: 'phy',
    roleBadgeZh: '👑 泰坦物攻王',
    gearDescZh: '斯巴達戰神披風 + 24K 奧林匹亞金槓',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 大重量深蹲硬舉 10組 · 組間計時完整 (52分鐘)',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔨 連攜技【泰坦破甲】：全隊物攻與破甲倍率大幅提升',
    damageDealt: 920,
    nudgedCount: 0,
  },
  {
    id: 'celeb_aesthetic_lin',
    nameZh: '古典健體 · 林健美',
    roleType: 'mag',
    roleBadgeZh: '✨ 魔攻暴擊手',
    gearDescZh: '超賽亞金焰髮 + 賽博金邊壓縮褲',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 肩臂超級組 + 飛輪燃脂 35分鐘 · 組間完整',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🔥 連攜技【燃脂魔焰】：對護盾型 Boss 造成 2.0 倍魔傷',
    damageDealt: 780,
    nudgedCount: 0,
  },
  {
    id: 'friend_chloe',
    nameZh: '核心瑜珈 · 小柔',
    roleType: 'support',
    roleBadgeZh: '🛡️ 輔助增益',
    gearDescZh: '熱血赤紅頭帶 + 翡翠乳清搖搖杯',
    hasWorkedOutToday: true,
    workoutAuditZh: '✅ 核心棒式與徒手流瑜珈 6組 · 組間計時完整 (30分鐘)',
    isSuspectedCheater: false,
    comboSkillAppliedZh: '🌪️ 連攜技【聚氣暴擊】：全隊掉寶率 ×2 倍、弱點暴擊加成',
    damageDealt: 540,
    nudgedCount: 0,
  },
];

export interface LoggedSet {
  id: string;
  exerciseId: string;
  exerciseNameZh: string;
  unitLabel: string;
  muscleGroup: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
  category: ExerciseCategory;
  weightKg: number;
  reps: number;
  restSec: number;
  coinsEarned: number;
  decayFactor: number;
  isPR: boolean;
  timestamp: number;
}

export interface WorkoutSessionRecord {
  id: string;
  dateLabel: string;
  daysAgo?: number;
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
    sets: { weightKg: number; reps: number; restSec: number; isPR: boolean }[];
  }[];
}

export interface DailyQuest {
  id: string;
  titleZh: string;
  rewardCoins: number;
  progress: number;
  target: number;
  claimed: boolean;
  targetTab: MainTab;
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

export interface VictorySettlementData {
  calcResult: CalculationResult;
  routineName: string;
  setsCount: number;
  bonusCoins: number;
  newPRs: string[];
  staminaDepletedNotice: boolean;
  topExerciseName: string;
}

interface GameState {
  // Navigation & Global Overlays
  activeTab: MainTab;
  locale: Locale;
  themeMode: 'system' | 'light' | 'dark';
  soundEnabled: boolean;
  bgmEnabled: boolean;
  isNightModeRoom: boolean;
  memeStudioOpen: boolean;
  settingsOpen: boolean;
  wardrobeModalOpen: boolean;
  selectedProfileId: string | null;
  selectedHistorySessionId: string | null;
  inspectedExerciseId: string | null;
  victoryModalData: VictorySettlementData | null;
  toastMessage: string | null;

  // Player Profile & Economy
  nickname: string;
  bodyStage: AvatarBodyStage;
  level: number;
  exp: number;
  coins: number;
  stamina: number;
  maxStamina: number;
  streakDays: number;
  streakFreezes: number;
  doubleCoinActive: boolean;

  // 5-Slot Paper-Doll & 3-Slot Flexible Room (V2-04, V2-08, V2-13)
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  ownedItemIds: string[];
  consumables: Record<ConsumableItem['id'], number>;

  // Shop Try-On & Shopping Cart (V2-05)
  tryOnEquipped: Partial<Record<EquipSlot, string>>;
  tryOnRoom: Partial<Record<RoomSlot, string>>;
  cartItemIds: string[];

  // Quests & Quiz
  quests: DailyQuest[];
  answeredQuizIds: string[];

  // Saved Routines & Active Workout Focus Mode (V2-02, V2-06, V2-14, V2-15)
  savedRoutines: WorkoutTemplate[];
  isWorkoutFocusActive: boolean;
  workoutElapsedSeconds: number;
  activeTemplateName: string | null;
  templateQueue: {
    exerciseId: string;
    targetSets: number;
    completedSets: number;
    reps: number;
    weightKg: number;
    restSeconds: number;
  }[];
  selectedExerciseId: string;
  currentWeightKg: number;
  currentReps: number;
  currentRestConfigSec: number;
  sessionSets: LoggedSet[];
  restSecondsLeft: number;
  isRestRunning: boolean;

  // Full Workout History & Biometrics (V2-01, V2-09)
  personalRecords: Record<string, number>;
  workoutHistory: WorkoutSessionRecord[];
  biometrics: {
    heightCm: number;
    weightKg: number;
    bodyFatPct: number;
    age: number;
    gender: 'male' | 'female';
    activityMultiplier: number;
    goal: 'cut' | 'maintain' | 'bulk';
  };

  // Social Posts & Anti-Abuse Daily Caps (V2-12, V2-16)
  posts: SocialPost[];
  friendIds: string[];
  dailySocialSentTotal: number;
  dailySocialMaxTotal: number;
  dailySentPerAuthor: Record<string, number>;

  // Adventure & Raid State (V2.9 Tap Titans & Squad Boss)
  soloStage: number;
  soloBossHp: number;
  squadStage: number;
  squadBossHp: number;
  squadName: string;
  squadMembers: SquadMemberState[];
  adventureCooldownUntil: number;
  raidTickets: number;
  personalMaxStage: number;
  squadMaxStage: number;
  personalMaxDamage: number;
  shareRaidModalOpen: boolean;
  todayWorkoutStatus: TodayWorkoutStatus;
  todaySportType: AdventureSportSkillType;
  activeTeamComboBuff: 'none' | 'armor_break' | 'burn_mark' | 'crit_aura';
  collectedBossLoots: string[];

  // UI Actions
  setActiveTab: (tab: MainTab) => void;
  setLocale: (locale: Locale) => void;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  toggleSound: () => void;
  toggleBgm: () => void;
  toggleNightModeRoom: () => void;
  setMemeStudioOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setWardrobeModalOpen: (open: boolean) => void;
  setSelectedProfileId: (id: string | null) => void;
  setSelectedHistorySessionId: (id: string | null) => void;
  setInspectedExerciseId: (id: string | null) => void;
  setShareRaidModalOpen: (open: boolean) => void;
  closeVictoryModal: () => void;
  showToast: (msg: string) => void;

  // Room & Wardrobe Actions
  setBodyStage: (stage: AvatarBodyStage) => void;
  equipOwnedAvatarItem: (slot: EquipSlot, itemId: string) => void;
  assignRoomSlotItem: (slot: RoomSlot, itemId: string) => void;
  interactWithRoomEntity: (type: 'avatar' | 'pet') => void;
  answerQuiz: (quizId: string, isCorrect: boolean) => void;
  claimQuest: (questId: string) => void;

  // Shop Try-On & Cart Actions (V2-05)
  previewShopItem: (itemId: string, targetRoomSlot?: RoomSlot) => void;
  toggleCartItem: (itemId: string) => void;
  clearTryOnAndCart: () => void;
  checkoutCart: () => void;
  buyConsumable: (id: ConsumableItem['id'], useIapSim?: boolean) => void;
  purchaseIapPackage: (packId: string) => void;
  useConsumableItem: (id: ConsumableItem['id']) => void;

  // Routine & Workout Focus Actions (V2-06, V2-14, V2-15)
  toggleFavoriteRoutine: (routineId: string) => void;
  saveCustomRoutine: (routine: WorkoutTemplate) => void;
  deleteRoutine: (routineId: string) => void;
  copyOrReferenceRoutine: (routine: WorkoutTemplate) => void;
  startWorkoutFocus: (routine?: WorkoutTemplate) => void;
  swapActiveExercise: (oldExerciseId: string, newExerciseId: string) => void;
  addExerciseToActiveQueue: (exerciseId: string) => void;
  selectExercise: (exerciseId: string) => void;
  setCurrentWeight: (kg: number) => void;
  setCurrentReps: (reps: number) => void;
  setCurrentRestConfigSec: (sec: number) => void;
  tickGlobalTimers: () => void;
  setRestTimer: (seconds: number) => void;
  logWorkoutSet: () => void;
  finishWorkoutSession: () => void;
  discardWorkoutSession: () => void;
  quickLogSavedRoutine: (routine: WorkoutTemplate) => void;

  // Social & Adventure Actions (V2.9)
  toggleFriend: (profileId: string) => void;
  tipPost: (postId: string) => void;
  giftWaterPost: (postId: string) => void;
  publishPost: (caption: string, stickerText?: string, customImageDataUrl?: string) => void;
  completePhotoWithAvatarQuest: () => void;
  attackAdventureBoss: (mode: 'solo' | 'squad') => {
    damage: number;
    isCrit: boolean;
    defeated: boolean;
    attackTypeLabel: string;
    droppedLootName?: string;
    isCheatPenalty?: boolean;
  } | null;
  resetAdventureCooldown: (method: 'ticket' | 'iap') => void;
  nudgeSquadMember: (memberId: string) => void;
  simulateFriendWorkoutJoin: (memberId: string) => void;
  reportCheatingMember: (memberId: string) => void;
  setSquadName: (name: string) => void;
  recruitSquadMember: (candidate: SquadMemberState) => void;
  kickSquadMember: (memberId: string) => void;
  setTodayWorkoutStatus: (status: TodayWorkoutStatus) => void;
  setTodaySportType: (sport: AdventureSportSkillType) => void;

  // Biometrics & Demo Cheats
  updateBiometrics: (partial: Partial<GameState['biometrics']>) => void;
  addDemoCoins: (amount: number) => void;
  refillStaminaFull: () => void;
  resetDemoState: () => void;
}

const INITIAL_QUESTS: DailyQuest[] = [
  {
    id: 'q_interact_pet',
    titleZh: '在房間與角色或寵物互動',
    rewardCoins: ECONOMY_CONFIG.dailyPetInteractCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'home',
  },
  {
    id: 'q_daily_workout',
    titleZh: '完成今日運動課表或3秒速記',
    rewardCoins: ECONOMY_CONFIG.dailyWorkoutQuestCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'workout',
  },
  {
    id: 'q_social_cheer',
    titleZh: '出拳討伐 Boss 或督促戰隊隊友 1 次',
    rewardCoins: ECONOMY_CONFIG.dailyTipQuestCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'plaza',
  },
  {
    id: 'q_create_meme',
    titleZh: '拍攝或合成 1 張「與我的娃合照」',
    rewardCoins: ECONOMY_CONFIG.dailyMemeQuestCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'home',
  },
];

const INITIAL_POSTS: SocialPost[] = [
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

const INITIAL_WORKOUT_HISTORY: WorkoutSessionRecord[] = [
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
];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      locale: 'zh-TW',
      themeMode: 'system',
      soundEnabled: true,
      bgmEnabled: false,
      isNightModeRoom: false,
      memeStudioOpen: false,
      settingsOpen: false,
      wardrobeModalOpen: false,
      selectedProfileId: null,
      selectedHistorySessionId: null,
      inspectedExerciseId: null,
      victoryModalData: null,
      toastMessage: null,

      nickname: '鐵館勇者 #01',
      bodyStage: 'powerlifter',
      level: 6,
      exp: 520,
      coins: ECONOMY_CONFIG.ftueStarterCoins,
      stamina: ECONOMY_CONFIG.maxStamina,
      maxStamina: ECONOMY_CONFIG.maxStamina,
      streakDays: 7,
      streakFreezes: 1,
      doubleCoinActive: false,

      equipped: {
        hair: 'hair_ headband_red',
        face: 'face_confident_smile',
        top: 'top_bare_muscles',
        bottom: 'bottom_navy_shorts',
        accessory: 'acc_iron_dumbbell',
      },
      room: {
        wallpaper: 'wall_industrial_dark',
        floor: 'floor_rubber_black',
        slotLeft: 'rack_classic_cage',
        slotCenter: 'pet_shiba_dog',
        slotRight: 'prop_dumbbell_tower',
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
      consumables: {
        bcaa_water: 2,
        double_coin_card: 1,
        streak_freeze: 1,
        gacha_ticket: 1,
      },

      tryOnEquipped: {},
      tryOnRoom: {},
      cartItemIds: [],

      quests: INITIAL_QUESTS,
      answeredQuizIds: [],

      savedRoutines: INITIAL_SAVED_ROUTINES,
      isWorkoutFocusActive: false,
      workoutElapsedSeconds: 0,
      activeTemplateName: null,
      templateQueue: [],
      selectedExerciseId: 'barbell_squat',
      currentWeightKg: 80,
      currentReps: 8,
      currentRestConfigSec: 120,
      sessionSets: [],
      restSecondsLeft: 0,
      isRestRunning: false,

      personalRecords: {
        barbell_squat: 100,
        barbell_bench_press: 75,
        conventional_deadlift: 120,
        overhead_press: 45,
        pull_ups: 75,
      },
      workoutHistory: INITIAL_WORKOUT_HISTORY,
      biometrics: {
        heightCm: 175,
        weightKg: 72,
        bodyFatPct: 16.5,
        age: 27,
        gender: 'male',
        activityMultiplier: 1.55,
        goal: 'maintain',
      },

      posts: INITIAL_POSTS,
      friendIds: ['friend_akai', 'friend_alice'],
      dailySocialSentTotal: 0,
      dailySocialMaxTotal: 5,
      dailySentPerAuthor: {},

      soloStage: 1,
      soloBossHp: 720,
      squadStage: 2,
      squadBossHp: 1150,
      squadName: '🔥 腿日絕不缺席戰隊',
      squadMembers: [
        {
          id: 'friend_akai',
          nameZh: '重訓狂人 · 阿凱',
          roleType: 'phy',
          roleBadgeZh: '🥊 物攻專精',
          gearDescZh: '紅黑健力服 + 奧林匹亞金槓',
          hasWorkedOutToday: true,
          workoutAuditZh: '✅ 胸背重訓 8組 · 組間計時完整 (38分鐘)',
          isSuspectedCheater: false,
          comboSkillAppliedZh: '🔨 已施放【破甲重擊】：下位隊友魔攻 ×2.0 倍',
          damageDealt: 650,
          nudgedCount: 0,
        },
        {
          id: 'friend_leo',
          nameZh: '街頭健體 · Leo',
          roleType: 'phy',
          roleBadgeZh: '🥊 力量型',
          gearDescZh: '黑魂訓練吊嘎 + 鑄鐵啞鈴',
          hasWorkedOutToday: true,
          workoutAuditZh: '🤥 耗時 5 秒狂按 6 組深蹲 (組間休息 0秒 · 疑似空氣健身)',
          isSuspectedCheater: true,
          damageDealt: 15,
          nudgedCount: 0,
        },
        {
          id: 'friend_alice',
          nameZh: '有氧女神 · 小愛',
          roleType: 'mag',
          roleBadgeZh: '🪄 魔攻破盾',
          gearDescZh: '綠光泵感寬T + 迷彩跑褲',
          hasWorkedOutToday: false,
          workoutAuditZh: '⚠️ 今日尚未運動打卡',
          isSuspectedCheater: false,
          damageDealt: 0,
          nudgedCount: 0,
        },
      ],
      adventureCooldownUntil: 0,
      raidTickets: 2,
      personalMaxStage: 1,
      squadMaxStage: 2,
      personalMaxDamage: 680,
      shareRaidModalOpen: false,
      todayWorkoutStatus: 'legit_rest',
      todaySportType: 'cardio',
      activeTeamComboBuff: 'armor_break',
      collectedBossLoots: [],

      setActiveTab: (tab) => {
        soundFX.playBlip();
        set({ activeTab: tab });
      },

      setLocale: (locale) => set({ locale }),

      setThemeMode: (mode) => {
        soundFX.playBlip();
        set({ themeMode: mode });
      },

      toggleSound: () => {
        const next = !get().soundEnabled;
        soundFX.sfxEnabled = next;
        set({ soundEnabled: next });
      },

      toggleBgm: () => {
        const next = !get().bgmEnabled;
        soundFX.setBgmPlaying(next);
        set({ bgmEnabled: next });
        get().showToast(next ? '🎵 已開啟 8-Bit 輕快背景音樂！' : '🔇 已關閉 BGM 背景音樂');
      },

      toggleNightModeRoom: () => {
        soundFX.playBlip();
        set((s) => ({ isNightModeRoom: !s.isNightModeRoom }));
      },

      setMemeStudioOpen: (open) => {
        soundFX.playBlip();
        set({ memeStudioOpen: open });
      },

      setSettingsOpen: (open) => {
        soundFX.playBlip();
        set({ settingsOpen: open });
      },

      setWardrobeModalOpen: (open) => {
        soundFX.playBlip();
        set({ wardrobeModalOpen: open });
      },

      setSelectedProfileId: (id) => {
        soundFX.playBlip();
        set({ selectedProfileId: id });
      },

      setSelectedHistorySessionId: (id) => {
        soundFX.playBlip();
        set({ selectedHistorySessionId: id });
      },

      setInspectedExerciseId: (id) => {
        soundFX.playBlip();
        set({ inspectedExerciseId: id });
      },

      setShareRaidModalOpen: (open) => {
        soundFX.playBlip();
        set({ shareRaidModalOpen: open });
      },

      closeVictoryModal: () => set({ victoryModalData: null }),

      showToast: (msg) => {
        set({ toastMessage: msg });
        setTimeout(() => {
          if (get().toastMessage === msg) {
            set({ toastMessage: null });
          }
        }, 2800);
      },

      setBodyStage: (stage) => {
        soundFX.playBlip();
        set({ bodyStage: stage });
        get().showToast(`✨ 已切換體態階段：${stage.toUpperCase()}`);
      },

      equipOwnedAvatarItem: (slot, itemId) => {
        const state = get();
        if (!state.ownedItemIds.includes(itemId)) return;
        soundFX.playBlip();
        set({
          equipped: { ...state.equipped, [slot]: itemId },
        });
      },

      assignRoomSlotItem: (slot, itemId) => {
        const state = get();
        if (itemId !== 'empty' && !state.ownedItemIds.includes(itemId)) return;
        soundFX.playBlip();
        set({
          room: { ...state.room, [slot]: itemId },
        });
      },

      interactWithRoomEntity: (type) => {
        if (type === 'pet') soundFX.playPetHeart();
        else soundFX.playBlip();
        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === 'q_interact_pet' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        }));
      },

      answerQuiz: (quizId, isCorrect) => {
        const state = get();
        if (state.answeredQuizIds.includes(quizId)) return;
        if (isCorrect) {
          soundFX.playCoin();
          const reward = ECONOMY_CONFIG.dailyQuizRewardCoins * (state.doubleCoinActive ? 2 : 1);
          set({
            answeredQuizIds: [...state.answeredQuizIds, quizId],
            coins: state.coins + reward,
          });
          state.showToast(`🧠 答對科普問答！獲得 +${reward} 🪙`);
        } else {
          soundFX.playBlip();
        }
      },

      claimQuest: (questId) => {
        const state = get();
        const quest = state.quests.find((q) => q.id === questId);
        if (!quest || quest.claimed || quest.progress < quest.target) return;
        soundFX.playCoin();
        const mult = state.doubleCoinActive ? 2 : 1;
        const reward = quest.rewardCoins * mult;
        set({
          coins: state.coins + reward,
          quests: state.quests.map((q) => (q.id === questId ? { ...q, claimed: true } : q)),
        });
        state.showToast(`🎉 領取任務獎勵 +${reward} 🪙！`);
      },

      // ================= SHOP TRY-ON & CART ACTIONS (V2-05) =================
      previewShopItem: (itemId, targetRoomSlot) => {
        const state = get();
        soundFX.playBlip();
        const avatarItem = AVATAR_ITEMS.find((i) => i.id === itemId);
        if (avatarItem) {
          const slot = avatarItem.slot as EquipSlot;
          if (state.ownedItemIds.includes(itemId)) {
            const nextTryOn = { ...state.tryOnEquipped };
            delete nextTryOn[slot];
            set({
              equipped: { ...state.equipped, [slot]: itemId },
              tryOnEquipped: nextTryOn,
            });
            state.showToast(`✨ 已換上已擁有裝備：${avatarItem.nameZh}`);
          } else {
            // Try-on unowned item & auto-add to cart if not already in cart
            const inCart = state.cartItemIds.includes(itemId);
            set({
              tryOnEquipped: { ...state.tryOnEquipped, [slot]: itemId },
              cartItemIds: inCart ? state.cartItemIds : [...state.cartItemIds, itemId],
            });
            state.showToast(`👀 正在試穿【${avatarItem.nameZh}】（已加入試穿購物車）`);
          }
          return;
        }

        const roomItem = ROOM_ITEMS.find((i) => i.id === itemId);
        if (roomItem) {
          const rSlot: RoomSlot =
            roomItem.slot === 'wallpaper'
              ? 'wallpaper'
              : roomItem.slot === 'floor'
              ? 'floor'
              : targetRoomSlot || (roomItem.roomSubType === 'pet' ? 'slotCenter' : 'slotLeft');

          if (state.ownedItemIds.includes(itemId)) {
            const nextTryOnRoom = { ...state.tryOnRoom };
            delete nextTryOnRoom[rSlot];
            set({
              room: { ...state.room, [rSlot]: itemId },
              tryOnRoom: nextTryOnRoom,
            });
            state.showToast(`🏠 已佈置至房間：${roomItem.nameZh}`);
          } else {
            const inCart = state.cartItemIds.includes(itemId);
            set({
              tryOnRoom: { ...state.tryOnRoom, [rSlot]: itemId },
              cartItemIds: inCart ? state.cartItemIds : [...state.cartItemIds, itemId],
            });
            state.showToast(`👀 正在試擺【${roomItem.nameZh}】（已加入試穿購物車）`);
          }
        }
      },

      toggleCartItem: (itemId) => {
        const state = get();
        soundFX.playBlip();
        const exists = state.cartItemIds.includes(itemId);
        if (exists) {
          const nextTryOnEquipped = { ...state.tryOnEquipped };
          (Object.keys(nextTryOnEquipped) as EquipSlot[]).forEach((k) => {
            if (nextTryOnEquipped[k] === itemId) delete nextTryOnEquipped[k];
          });
          const nextTryOnRoom = { ...state.tryOnRoom };
          (Object.keys(nextTryOnRoom) as RoomSlot[]).forEach((k) => {
            if (nextTryOnRoom[k] === itemId) delete nextTryOnRoom[k];
          });
          set({
            cartItemIds: state.cartItemIds.filter((id) => id !== itemId),
            tryOnEquipped: nextTryOnEquipped,
            tryOnRoom: nextTryOnRoom,
          });
        } else {
          state.previewShopItem(itemId);
        }
      },

      clearTryOnAndCart: () => {
        soundFX.playBlip();
        set({ tryOnEquipped: {}, tryOnRoom: {}, cartItemIds: [] });
        get().showToast('🔄 已還原試穿並清空購物車');
      },

      checkoutCart: () => {
        const state = get();
        const allItems = [...AVATAR_ITEMS, ...ROOM_ITEMS];
        const cartItems = state.cartItemIds
          .map((id) => allItems.find((i) => i.id === id))
          .filter((i): i is NonNullable<typeof i> => Boolean(i) && !state.ownedItemIds.includes(i!.id));

        if (cartItems.length === 0) {
          state.showToast('購物車內沒有未購買的商品喔！');
          return;
        }

        const totalCost = cartItems.reduce((sum, i) => sum + i.priceCoins, 0);
        if (state.coins < totalCost) {
          soundFX.playBlip();
          state.showToast(`⚠️ 金幣不足！共需 ${totalCost} 🪙（還差 ${totalCost - state.coins} 🪙）`);
          return;
        }

        soundFX.playVictory();
        const nextEquipped = { ...state.equipped };
        Object.entries(state.tryOnEquipped).forEach(([slot, id]) => {
          if (id) nextEquipped[slot as EquipSlot] = id;
        });

        const nextRoom = { ...state.room };
        Object.entries(state.tryOnRoom).forEach(([slot, id]) => {
          if (id) nextRoom[slot as RoomSlot] = id;
        });

        set({
          coins: state.coins - totalCost,
          ownedItemIds: [...state.ownedItemIds, ...cartItems.map((i) => i.id)],
          equipped: nextEquipped,
          room: nextRoom,
          tryOnEquipped: {},
          tryOnRoom: {},
          cartItemIds: [],
        });

        state.showToast(`🛍️ 結帳成功！一次購入 ${cartItems.length} 件裝備並自動換上！`);
      },

      buyConsumable: (id, useIapSim = false) => {
        const state = get();
        const priceMap: Record<ConsumableItem['id'], number> = {
          bcaa_water: 60,
          double_coin_card: 100,
          streak_freeze: 120,
          gacha_ticket: 120,
        };
        const cost = priceMap[id];
        if (!useIapSim && state.coins < cost) {
          state.showToast(`⚠️ 金幣不足，需 ${cost} 🪙`);
          return;
        }
        soundFX.playCoin();
        set({
          coins: useIapSim ? state.coins : state.coins - cost,
          consumables: {
            ...state.consumables,
            [id]: (state.consumables[id] || 0) + 1,
          },
        });
        state.showToast(useIapSim ? '💳 模擬內購成功！道具已存入背包' : '🧪 道具已購買存入背包');
      },

      purchaseIapPackage: (packId) => {
        const state = get();
        const pack = IAP_PACKAGES.find((p) => p.id === packId);
        if (!pack) return;
        soundFX.playVictory();
        set({
          coins: state.coins + pack.rewardCoins,
          stamina: pack.bonusStamina
            ? Math.min(state.maxStamina, state.stamina + pack.bonusStamina)
            : state.stamina,
          streakFreezes: pack.bonusFreezes
            ? Math.min(5, state.streakFreezes + pack.bonusFreezes)
            : state.streakFreezes,
        });
        state.showToast(`💎 模擬內購成功！獲得 +${pack.rewardCoins} 🪙`);
      },

      useConsumableItem: (id) => {
        const state = get();
        const count = state.consumables[id] || 0;
        if (count <= 0) {
          state.showToast('⚠️ 背包內沒有此道具！');
          return;
        }
        if (id === 'bcaa_water') {
          soundFX.playSetComplete();
          set({
            stamina: Math.min(state.maxStamina, state.stamina + 50),
            consumables: { ...state.consumables, bcaa_water: count - 1 },
          });
          state.showToast('🧪 體力恢復 +50 ⚡！');
        } else if (id === 'double_coin_card') {
          soundFX.playPRFanfare();
          set({
            doubleCoinActive: true,
            consumables: { ...state.consumables, double_coin_card: count - 1 },
          });
          state.showToast('⚡ 雙倍金幣 2X 已啟動！');
        } else if (id === 'streak_freeze') {
          soundFX.playSetComplete();
          set({
            streakFreezes: Math.min(3, state.streakFreezes + 1),
            consumables: { ...state.consumables, streak_freeze: count - 1 },
          });
          state.showToast('🧊 連勝保護盾 +1！');
        } else if (id === 'gacha_ticket') {
          const allCosmetics = [...AVATAR_ITEMS, ...ROOM_ITEMS];
          const unowned = allCosmetics.filter((i) => !state.ownedItemIds.includes(i.id));
          soundFX.playVictory();
          if (unowned.length > 0) {
            const prize = unowned[Math.floor(Math.random() * unowned.length)];
            set({
              ownedItemIds: [...state.ownedItemIds, prize.id],
              consumables: { ...state.consumables, gacha_ticket: count - 1 },
            });
            state.showToast(`🎰 抽中稀有外觀【${prize.nameZh}】！`);
          } else {
            set({
              coins: state.coins + 250,
              consumables: { ...state.consumables, gacha_ticket: count - 1 },
            });
            state.showToast('🎰 已集齊圖鑑，獲得頭獎 +250 🪙！');
          }
        }
      },

      // ================= ROUTINE & WORKOUT FOCUS ACTIONS (V2-06, V2-14, V2-15) =================
      toggleFavoriteRoutine: (routineId) => {
        soundFX.playBlip();
        set((state) => ({
          savedRoutines: state.savedRoutines.map((r) =>
            r.id === routineId
              ? {
                  ...r,
                  category: r.category === 'favorite' ? 'my_custom' : 'favorite',
                  tagZh: r.category === 'favorite' ? '自訂課表' : '我的最愛',
                }
              : r
          ),
        }));
      },

      saveCustomRoutine: (routine) => {
        soundFX.playSetComplete();
        set((state) => {
          const exists = state.savedRoutines.some((r) => r.id === routine.id);
          return {
            savedRoutines: exists
              ? state.savedRoutines.map((r) => (r.id === routine.id ? routine : r))
              : [routine, ...state.savedRoutines],
          };
        });
        get().showToast(`📋 已儲存課表：${routine.nameZh}`);
      },

      deleteRoutine: (routineId) => {
        const state = get();
        const target = state.savedRoutines.find((r) => r.id === routineId);
        if (!target) return;
        soundFX.playBlip();
        set({
          savedRoutines: state.savedRoutines.filter((r) => r.id !== routineId),
        });
        state.showToast(`🗑️ 已刪除課表：${target.nameZh}`);
      },

      copyOrReferenceRoutine: (routine) => {
        soundFX.playSetComplete();
        const state = get();
        const exists = state.savedRoutines.some((r) => r.id === routine.id);
        const refCopy: WorkoutTemplate = {
          ...routine,
          id: exists ? `ref_${Date.now()}` : routine.id,
          category: 'referenced',
          tagZh: '引用課表',
        };
        set({
          savedRoutines: [refCopy, ...state.savedRoutines],
          activeTab: 'workout',
          selectedProfileId: null,
        });
        state.showToast(`🔗 已將【${routine.nameZh}】加入引用課表`);
      },

      startWorkoutFocus: (routine) => {
        soundFX.playSetComplete();
        const firstCfg = routine?.exercises[0];
        const firstEx =
          EXERCISE_LIBRARY.find((e) => e.id === firstCfg?.exerciseId) || EXERCISE_LIBRARY[0];

        set({
          activeTab: 'workout',
          isWorkoutFocusActive: true,
          workoutElapsedSeconds: 0,
          activeTemplateName: routine ? routine.nameZh : '自由訓練課表',
          templateQueue: routine
            ? routine.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                targetSets: e.sets,
                completedSets: 0,
                reps: e.reps,
                weightKg: e.weightKg,
                restSeconds: e.restSeconds || 90,
              }))
            : [
                {
                  exerciseId: firstEx.id,
                  targetSets: 4,
                  completedSets: 0,
                  reps: firstEx.defaultReps,
                  weightKg: firstEx.defaultWeightKg,
                  restSeconds: firstEx.defaultRestSec,
                },
              ],
          selectedExerciseId: firstEx.id,
          currentWeightKg: firstCfg ? firstCfg.weightKg : firstEx.defaultWeightKg,
          currentReps: firstCfg ? firstCfg.reps : firstEx.defaultReps,
          currentRestConfigSec: firstCfg ? firstCfg.restSeconds : firstEx.defaultRestSec,
          sessionSets: [],
        });
      },

      swapActiveExercise: (oldExerciseId, newExerciseId) => {
        const newEx = EXERCISE_LIBRARY.find((e) => e.id === newExerciseId);
        if (!newEx) return;
        soundFX.playBlip();
        set((state) => ({
          selectedExerciseId: newExerciseId,
          currentWeightKg: newEx.defaultWeightKg,
          currentReps: newEx.defaultReps,
          currentRestConfigSec: newEx.defaultRestSec,
          templateQueue: state.templateQueue.map((item) =>
            item.exerciseId === oldExerciseId
              ? {
                  ...item,
                  exerciseId: newExerciseId,
                  weightKg: newEx.defaultWeightKg,
                  reps: newEx.defaultReps,
                  restSeconds: newEx.defaultRestSec,
                }
              : item
          ),
        }));
        get().showToast(`🔄 已替換為：${newEx.nameZh}`);
      },

      addExerciseToActiveQueue: (exerciseId) => {
        const newEx = EXERCISE_LIBRARY.find((e) => e.id === exerciseId);
        if (!newEx) return;
        soundFX.playSetComplete();
        set((state) => {
          const alreadyExists = state.templateQueue.some((q) => q.exerciseId === exerciseId);
          const nextQueue = alreadyExists
            ? state.templateQueue.map((q) =>
                q.exerciseId === exerciseId ? { ...q, targetSets: q.targetSets + 2 } : q
              )
            : [
                ...state.templateQueue,
                {
                  exerciseId: newEx.id,
                  targetSets: 4,
                  completedSets: 0,
                  reps: newEx.defaultReps,
                  weightKg: newEx.defaultWeightKg,
                  restSeconds: newEx.defaultRestSec,
                },
              ];
          return {
            templateQueue: nextQueue,
            selectedExerciseId: newEx.id,
            currentWeightKg: newEx.defaultWeightKg,
            currentReps: newEx.defaultReps,
            currentRestConfigSec: newEx.defaultRestSec,
          };
        });
        get().showToast(`➕ 已新增動作：${newEx.nameZh}`);
      },

      selectExercise: (exerciseId) => {
        const state = get();
        const ex = EXERCISE_LIBRARY.find((e) => e.id === exerciseId);
        if (!ex) return;
        const qItem = state.templateQueue.find((q) => q.exerciseId === exerciseId);
        soundFX.playBlip();
        set({
          selectedExerciseId: exerciseId,
          currentWeightKg: qItem ? qItem.weightKg : ex.defaultWeightKg,
          currentReps: qItem ? qItem.reps : ex.defaultReps,
          currentRestConfigSec: qItem ? qItem.restSeconds : ex.defaultRestSec,
        });
      },

      setCurrentWeight: (kg) => set({ currentWeightKg: Math.max(0, Number(kg) || 0) }),
      setCurrentReps: (reps) => set({ currentReps: Math.max(1, Math.round(Number(reps) || 1)) }),
      setCurrentRestConfigSec: (sec) => {
        const validSec = Math.max(10, Math.round(Number(sec) || 60));
        set((state) => ({
          currentRestConfigSec: validSec,
          templateQueue: state.templateQueue.map((q) =>
            q.exerciseId === state.selectedExerciseId ? { ...q, restSeconds: validSec } : q
          ),
        }));
      },

      tickGlobalTimers: () => {
        const state = get();
        const updates: Partial<GameState> = {};

        if (state.isWorkoutFocusActive) {
          updates.workoutElapsedSeconds = state.workoutElapsedSeconds + 1;
        }

        if (state.isRestRunning) {
          if (state.restSecondsLeft <= 1) {
            soundFX.playSetComplete();
            updates.restSecondsLeft = 0;
            updates.isRestRunning = false;
            state.showToast('⏰ 休息結束！開始下一組');
          } else {
            updates.restSecondsLeft = state.restSecondsLeft - 1;
          }
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      },

      setRestTimer: (seconds) => {
        soundFX.playBlip();
        set({ restSecondsLeft: seconds, isRestRunning: seconds > 0 });
      },

      logWorkoutSet: () => {
        const state = get();
        const ex =
          EXERCISE_LIBRARY.find((e) => e.id === state.selectedExerciseId) || EXERCISE_LIBRARY[0];

        const muscleSetsCount =
          state.sessionSets.filter((s) => s.muscleGroup === ex.muscleGroup).length + 1;
        let decayFactor = 1.0;
        if (muscleSetsCount === 9) decayFactor = 0.5;
        else if (muscleSetsCount === 10) decayFactor = 0.3;
        else if (muscleSetsCount === 11) decayFactor = 0.15;
        else if (muscleSetsCount >= 12) decayFactor = 0.0;

        const hasStamina = state.stamina >= ECONOMY_CONFIG.staminaPerSet;
        const newStamina = hasStamina ? state.stamina - ECONOMY_CONFIG.staminaPerSet : 0;

        const mult = state.doubleCoinActive ? 2 : 1;
        const instantCoins =
          hasStamina && decayFactor > 0
            ? Math.max(1, Math.round(ECONOMY_CONFIG.coinsPerValidSet * decayFactor * mult))
            : 0;

        const prevBest = state.personalRecords[ex.id] || 0;
        const isPR =
          ex.sportType === 'strength' && state.currentWeightKg > prevBest && state.currentReps >= 1;

        if (isPR) soundFX.playPRFanfare();
        else soundFX.playSetComplete();

        const newSet: LoggedSet = {
          id: `set_${Date.now()}`,
          exerciseId: ex.id,
          exerciseNameZh: ex.nameZh,
          unitLabel: ex.unitLabel,
          muscleGroup: ex.muscleGroup,
          category: ex.category,
          weightKg: state.currentWeightKg,
          reps: state.currentReps,
          restSec: state.currentRestConfigSec,
          coinsEarned: instantCoins,
          decayFactor,
          isPR,
          timestamp: Date.now(),
        };

        const existsInQueue = state.templateQueue.some((q) => q.exerciseId === ex.id);
        const updatedQueue = existsInQueue
          ? state.templateQueue.map((item) =>
              item.exerciseId === ex.id ? { ...item, completedSets: item.completedSets + 1 } : item
            )
          : [
              ...state.templateQueue,
              {
                exerciseId: ex.id,
                targetSets: 3,
                completedSets: 1,
                reps: state.currentReps,
                weightKg: state.currentWeightKg,
                restSeconds: state.currentRestConfigSec,
              },
            ];

        set({
          stamina: newStamina,
          coins: state.coins + instantCoins,
          sessionSets: [...state.sessionSets, newSet],
          personalRecords: isPR
            ? { ...state.personalRecords, [ex.id]: state.currentWeightKg }
            : state.personalRecords,
          restSecondsLeft: state.currentRestConfigSec,
          isRestRunning: true,
          templateQueue: updatedQueue,
        });

        if (isPR) {
          state.showToast(`🏆 NEW PR！${ex.nameZh} 突破 ${state.currentWeightKg}${ex.unitLabel}`);
        } else {
          state.showToast(
            `✅ 完成 ${ex.nameZh} ${state.currentWeightKg}${ex.unitLabel}×${state.currentReps}`
          );
        }
      },

      finishWorkoutSession: () => {
        const state = get();
        if (state.sessionSets.length === 0) {
          state.showToast('請至少完成 1 組動作再結算');
          return;
        }

        const calcResult = calculateWorkoutExp(
          state.sessionSets.map((s) => ({
            exerciseId: s.exerciseId,
            muscleGroup: s.muscleGroup,
            category: s.category,
            weightKg: s.weightKg,
            reps: s.reps,
          })),
          {
            hasWheyProtein: true,
            hasPreWorkout: state.doubleCoinActive,
          }
        );

        const hasStaminaForBonus =
          state.stamina > 0 || state.sessionSets.some((s) => s.coinsEarned > 0);
        const mult = state.doubleCoinActive ? 2 : 1;
        const settlementCoins = hasStaminaForBonus ? calcResult.totalCoins * mult : 0;

        const newExp = state.exp + calcResult.totalExperience;
        const newLevel = Math.floor(newExp / 250) + 1;

        const newPRs = Array.from(
          new Set(
            state.sessionSets
              .filter((s) => s.isPR)
              .map((s) => `${s.exerciseNameZh} ${s.weightKg}${s.unitLabel}`)
          )
        );

        const groupedMap = new Map<
          string,
          {
            exerciseId: string;
            exerciseNameZh: string;
            unitLabel: string;
            sets: { weightKg: number; reps: number; restSec: number; isPR: boolean }[];
          }
        >();

        state.sessionSets.forEach((s) => {
          const existing = groupedMap.get(s.exerciseId);
          if (existing) {
            existing.sets.push({
              weightKg: s.weightKg,
              reps: s.reps,
              restSec: s.restSec,
              isPR: s.isPR,
            });
          } else {
            groupedMap.set(s.exerciseId, {
              exerciseId: s.exerciseId,
              exerciseNameZh: s.exerciseNameZh,
              unitLabel: s.unitLabel,
              sets: [{ weightKg: s.weightKg, reps: s.reps, restSec: s.restSec, isPR: s.isPR }],
            });
          }
        });

        const routineTitle = state.activeTemplateName || '自由訓練課表';
        const topEx = state.sessionSets[0]?.exerciseNameZh || '綜合訓練';
        const durationMin = Math.max(1, Math.round(state.workoutElapsedSeconds / 60));

        const sessionRecord: WorkoutSessionRecord = {
          id: `hist_${Date.now()}`,
          dateLabel: '今日 剛剛',
          daysAgo: 0,
          routineName: routineTitle,
          durationMinutes: durationMin,
          totalVolume: calcResult.totalRawVolume,
          totalSets: state.sessionSets.length,
          coinsEarned: settlementCoins,
          expEarned: calcResult.totalExperience,
          topExerciseZh: topEx,
          exerciseLogs: Array.from(groupedMap.values()),
        };

        soundFX.playVictory();

        const firstEx = EXERCISE_LIBRARY.find((e) => e.id === state.sessionSets[0]?.exerciseId);
        const detectedSport: AdventureSportSkillType = firstEx?.sportType || 'strength';
        // If user spent at least 30s in focus mode, count as legit rest timer workout; otherwise suspected fast spam
        const isLegitRest = state.workoutElapsedSeconds >= 30;

        set({
          coins: state.coins + settlementCoins,
          exp: newExp,
          level: newLevel,
          streakDays: state.streakDays + 1,
          isWorkoutFocusActive: false,
          workoutElapsedSeconds: 0,
          isRestRunning: false,
          restSecondsLeft: 0,
          todayWorkoutStatus: isLegitRest ? 'legit_rest' : 'cheated_fast',
          todaySportType: detectedSport,
          victoryModalData: {
            calcResult,
            routineName: routineTitle,
            setsCount: state.sessionSets.length,
            bonusCoins: settlementCoins,
            newPRs,
            staminaDepletedNotice: !hasStaminaForBonus,
            topExerciseName: topEx,
          },
          workoutHistory: [sessionRecord, ...state.workoutHistory],
          quests: state.quests.map((q) =>
            q.id === 'q_daily_workout' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
          sessionSets: [],
          activeTemplateName: null,
          templateQueue: [],
        });
      },

      discardWorkoutSession: () => {
        soundFX.playBlip();
        set({
          isWorkoutFocusActive: false,
          workoutElapsedSeconds: 0,
          isRestRunning: false,
          restSecondsLeft: 0,
          sessionSets: [],
          activeTemplateName: null,
          templateQueue: [],
        });
        get().showToast('已退出專注模式');
      },

      quickLogSavedRoutine: (routine) => {
        const state = get();
        const hasStamina = state.stamina >= ECONOMY_CONFIG.staminaPerQuickWorkout;
        const nextStamina = hasStamina ? state.stamina - ECONOMY_CONFIG.staminaPerQuickWorkout : 0;

        const simSets: {
          exerciseId: string;
          muscleGroup: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
          category: ExerciseCategory;
          weightKg: number;
          reps: number;
        }[] = [];

        const exerciseLogs: WorkoutSessionRecord['exerciseLogs'] = [];

        routine.exercises.forEach((cfg) => {
          const ex =
            EXERCISE_LIBRARY.find((e) => e.id === cfg.exerciseId) || EXERCISE_LIBRARY[0];
          const setsArr: { weightKg: number; reps: number; restSec: number; isPR: boolean }[] = [];
          for (let i = 0; i < cfg.sets; i++) {
            simSets.push({
              exerciseId: ex.id,
              muscleGroup: ex.muscleGroup,
              category: ex.category,
              weightKg: cfg.weightKg,
              reps: cfg.reps,
            });
            setsArr.push({
              weightKg: cfg.weightKg,
              reps: cfg.reps,
              restSec: cfg.restSeconds,
              isPR: false,
            });
          }
          exerciseLogs.push({
            exerciseId: ex.id,
            exerciseNameZh: ex.nameZh,
            unitLabel: ex.unitLabel,
            sets: setsArr,
          });
        });

        const calcResult = calculateWorkoutExp(simSets, {
          hasWheyProtein: true,
          hasPreWorkout: state.doubleCoinActive,
        });

        const mult = state.doubleCoinActive ? 2 : 1;
        const rewardCoins = hasStamina ? Math.max(25, calcResult.totalCoins * mult) : 0;
        const topEx = exerciseLogs[0]?.exerciseNameZh || routine.nameZh;

        const sessionRecord: WorkoutSessionRecord = {
          id: `hist_${Date.now()}`,
          dateLabel: '今日 速記',
          daysAgo: 0,
          routineName: routine.nameZh,
          durationMinutes: 40,
          totalVolume: calcResult.totalRawVolume,
          totalSets: simSets.length,
          coinsEarned: rewardCoins,
          expEarned: calcResult.totalExperience,
          topExerciseZh: topEx,
          exerciseLogs,
        };

        soundFX.playVictory();

        set({
          stamina: nextStamina,
          coins: state.coins + rewardCoins,
          exp: state.exp + calcResult.totalExperience,
          streakDays: state.streakDays + 1,
          victoryModalData: {
            calcResult,
            routineName: routine.nameZh,
            setsCount: simSets.length,
            bonusCoins: rewardCoins,
            newPRs: [],
            staminaDepletedNotice: !hasStamina,
            topExerciseName: topEx,
          },
          workoutHistory: [sessionRecord, ...state.workoutHistory],
          quests: state.quests.map((q) =>
            q.id === 'q_daily_workout' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
      },

      // ================= SOCIAL ACTIONS WITH ANTI-ABUSE CAPS (V2-12, V2-16) =================
      toggleFriend: (profileId) => {
        const state = get();
        const isAlreadyFriend = state.friendIds.includes(profileId);
        const target = FRIEND_PROFILES.find((f) => f.id === profileId);
        soundFX.playSetComplete();
        const nextFriendIds = isAlreadyFriend
          ? state.friendIds.filter((id) => id !== profileId)
          : [...state.friendIds, profileId];
        set({ friendIds: nextFriendIds });
        state.showToast(
          isAlreadyFriend
            ? `已取消與 ${target?.nameZh || '玩家'} 的好友`
            : `🤝 已與 ${target?.nameZh || '玩家'} 成為好友！`
        );
      },

      tipPost: (postId) => {
        const state = get();
        const post = state.posts.find((p) => p.id === postId);
        if (!post) return;

        if (state.dailySocialSentTotal >= state.dailySocialMaxTotal) {
          state.showToast(`🛑 今日互助額度已滿 ${state.dailySocialMaxTotal}/${state.dailySocialMaxTotal}`);
          return;
        }
        const authorCount = state.dailySentPerAuthor[post.authorId] || 0;
        if (authorCount >= 2) {
          state.showToast(`🛑 對 ${post.authorName} 今日鼓勵已滿 2/2`);
          return;
        }
        if (state.coins < ECONOMY_CONFIG.tipSingleCoinCost) {
          state.showToast('⚠️ 金幣不足 10 🪙');
          return;
        }

        soundFX.playCoin();
        set({
          coins: state.coins - ECONOMY_CONFIG.tipSingleCoinCost,
          dailySocialSentTotal: state.dailySocialSentTotal + 1,
          dailySentPerAuthor: {
            ...state.dailySentPerAuthor,
            [post.authorId]: authorCount + 1,
          },
          posts: state.posts.map((p) => (p.id === postId ? { ...p, tipsCount: p.tipsCount + 1 } : p)),
          quests: state.quests.map((q) =>
            q.id === 'q_social_cheer' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
        state.showToast(`🪙 已打賞 ${post.authorName}`);
      },

      giftWaterPost: (postId) => {
        const state = get();
        const post = state.posts.find((p) => p.id === postId);
        if (!post) return;

        if (state.dailySocialSentTotal >= state.dailySocialMaxTotal) {
          state.showToast(`🛑 今日互助額度已滿 ${state.dailySocialMaxTotal}/${state.dailySocialMaxTotal}`);
          return;
        }
        const authorCount = state.dailySentPerAuthor[post.authorId] || 0;
        if (authorCount >= 2) {
          state.showToast(`🛑 對 ${post.authorName} 今日送禮已滿 2/2`);
          return;
        }
        if (state.coins < ECONOMY_CONFIG.giftEnergyDrinkCost) {
          state.showToast('⚠️ 金幣不足 20 🪙');
          return;
        }

        soundFX.playPetHeart();
        set({
          coins: state.coins - ECONOMY_CONFIG.giftEnergyDrinkCost,
          dailySocialSentTotal: state.dailySocialSentTotal + 1,
          dailySentPerAuthor: {
            ...state.dailySentPerAuthor,
            [post.authorId]: authorCount + 1,
          },
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, waterCount: p.waterCount + 1 } : p
          ),
          quests: state.quests.map((q) =>
            q.id === 'q_social_cheer' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
        state.showToast(`💧 已送水給 ${post.authorName}`);
      },

      publishPost: (caption, stickerText, customImageDataUrl) => {
        const state = get();
        const latestHist = state.workoutHistory[0];
        const newPost: SocialPost = {
          id: `post_${Date.now()}`,
          authorId: 'me_player',
          authorName: state.nickname,
          authorTitle: `本人 · Lv.${state.level}`,
          visibility: 'mine',
          isVerified: false,
          bodyStage: state.bodyStage,
          equipped: { ...state.equipped },
          room: { ...state.room },
          workoutSummary: latestHist
            ? `${latestHist.routineName} · ${latestHist.totalSets}組`
            : '自主訓練打卡',
          totalVolumeKg: latestHist ? latestHist.totalVolume : 3600,
          streakDays: state.streakDays,
          caption: caption || '今日份的鋼鐵修煉完成！💪',
          stickerText,
          tipsCount: 1,
          waterCount: 1,
          createdAtLabel: '剛剛',
          customImageDataUrl,
        };

        soundFX.playVictory();
        set({
          posts: [newPost, ...state.posts],
          memeStudioOpen: false,
          activeTab: 'plaza',
          quests: state.quests.map((q) =>
            q.id === 'q_create_meme' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
        state.showToast('📸 已完成合照合成！');
      },

      completePhotoWithAvatarQuest: () => {
        const state = get();
        soundFX.playSetComplete();
        set({
          quests: state.quests.map((q) =>
            q.id === 'q_create_meme' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
      },

      attackAdventureBoss: (mode) => {
        const state = get();
        const now = Date.now();
        if (state.todayWorkoutStatus === 'none') {
          state.showToast('🔒 今日尚未完成運動打卡！請先去運動才能出拳打怪！');
          return null;
        }
        if (state.adventureCooldownUntil > now) {
          state.showToast('⏳ 出擊冷卻中，請等待倒數或使用討伐券重置！');
          return null;
        }

        const stageNum = mode === 'solo' ? state.soloStage : state.squadStage;
        const bossIndex = (stageNum - 1) % ADVENTURE_BOSS_CATALOG.length;
        const boss = ADVENTURE_BOSS_CATALOG[bossIndex];
        const cooldownMs = 12 * 60 * 60 * 1000;

        // ANTI-CHEAT STRICT PENALTY: If skipped rest timer / 3s spam click
        if (state.todayWorkoutStatus === 'cheated_fast') {
          const scratchDmg = 15;
          soundFX.playBlip();
          if (mode === 'solo') {
            set({
              soloBossHp: Math.max(1, state.soloBossHp - scratchDmg),
              adventureCooldownUntil: now + cooldownMs,
            });
          } else {
            set({
              squadBossHp: Math.max(1, state.squadBossHp - scratchDmg),
              adventureCooldownUntil: now + cooldownMs,
            });
          }
          state.showToast(
            '🤥 系統偵測未跑組間休息（疑似亂按作弊）！傷害懲罰 -95%，僅打出 -15 HP 刮痧拳，且無掉寶資格！'
          );
          return {
            damage: scratchDmg,
            isCrit: false,
            defeated: false,
            attackTypeLabel: '💨 作弊刮痧拳 (懲罰 -95%)',
            isCheatPenalty: true,
          };
        }

        // Calculate gear attributes
        const equippedIds = Object.values(state.equipped);
        let phyBonus = 0;
        let magBonus = 0;
        equippedIds.forEach((id) => {
          const item = AVATAR_ITEMS.find((a) => a.id === id);
          if (item?.combatStat) {
            if (item.combatStat.type === 'phy') phyBonus += item.combatStat.value;
            if (item.combatStat.type === 'mag') magBonus += item.combatStat.value;
          }
        });

        // Base attack from task completion & streak (No weight/tonnage comparison!)
        const completedQuests = state.quests.filter((q) => q.progress >= q.target).length;
        const baseDmg = 340 + completedQuests * 60 + state.streakDays * 25;

        let isWeaknessHit = false;
        let attackTypeLabel = '🥊 物理重擊';
        let rawDmg = baseDmg + phyBonus * 4 + magBonus * 4;
        let nextComboBuff = state.activeTeamComboBuff;
        let lootChanceBoost = 1.0;

        // Sport Type Skill Selection & Team Combo Synergy
        if (state.todaySportType === 'strength') {
          attackTypeLabel = '🔨 重訓技【破甲重擊】';
          rawDmg += phyBonus * 3;
          nextComboBuff = 'armor_break';
          if (boss.weakness === 'phy') {
            isWeaknessHit = true;
            rawDmg = Math.round(rawDmg * boss.weaknessMultiplier);
          }
        } else if (state.todaySportType === 'cardio') {
          attackTypeLabel = '🔥 有氧技【燃脂魔焰】';
          rawDmg += magBonus * 3;
          if (boss.weakness === 'mag') {
            isWeaknessHit = true;
            rawDmg = Math.round(rawDmg * boss.weaknessMultiplier);
          }
          // Detonate teammate's Armor Break combo!
          if (state.activeTeamComboBuff === 'armor_break') {
            isWeaknessHit = true;
            rawDmg = Math.round(rawDmg * 1.6);
            attackTypeLabel = '💥 連攜引爆【破甲＋燃脂魔焰 ×2.0】';
            nextComboBuff = 'burn_mark';
          }
        } else {
          attackTypeLabel = '🌪️ 核心技【聚氣暴擊陣】';
          isWeaknessHit = true;
          rawDmg = Math.round(rawDmg * 1.4);
          lootChanceBoost = 2.0;
          nextComboBuff = 'crit_aura';
        }

        // Full Squad Attendance Berserk (1.5x)
        const allSquadAttended = state.squadMembers.every(
          (m) => m.hasWorkedOutToday && !m.isSuspectedCheater
        );
        if (mode === 'squad' && allSquadAttended) {
          rawDmg = Math.round(rawDmg * 1.5);
          isWeaknessHit = true;
          attackTypeLabel = '🔥 全員真運動狂暴合擊';
        }

        const finalDamage = Math.max(280, rawDmg);
        const newMaxDmg = Math.max(state.personalMaxDamage, finalDamage);

        // Roll for Boss Hidden Rare Loot Drop (only on legit rest workout!)
        let droppedLootName: string | undefined;
        const alreadyHasLoot = state.collectedBossLoots.includes(boss.hiddenLoot.id);
        const dropRoll = Math.random();
        if (!alreadyHasLoot && dropRoll < 0.65 * lootChanceBoost) {
          droppedLootName = `${boss.hiddenLoot.emoji} ${boss.hiddenLoot.nameZh}`;
        }

        const updatedLoots = droppedLootName
          ? [...state.collectedBossLoots, boss.hiddenLoot.id]
          : state.collectedBossLoots;

        if (mode === 'solo') {
          const remaining = state.soloBossHp - finalDamage;
          if (remaining <= 0) {
            const nextStage = state.soloStage + 1;
            const nextBoss = ADVENTURE_BOSS_CATALOG[(nextStage - 1) % ADVENTURE_BOSS_CATALOG.length];
            const scaledHp = Math.round(nextBoss.maxHp * (1 + (nextStage - 1) * 0.25));
            soundFX.playVictory();
            set({
              soloStage: nextStage,
              soloBossHp: scaledHp,
              personalMaxStage: Math.max(state.personalMaxStage, nextStage),
              personalMaxDamage: newMaxDmg,
              coins: state.coins + boss.rewardCoins,
              adventureCooldownUntil: now + cooldownMs,
              activeTeamComboBuff: nextComboBuff,
              collectedBossLoots: updatedLoots,
            });
            state.showToast(
              droppedLootName
                ? `🎁 擊破【${boss.nameZh}】並爆出隱藏神裝【${droppedLootName}】！`
                : `🎉 擊破【${boss.nameZh}】！晉升 Stage ${nextStage} (+${boss.rewardCoins} 🪙)`
            );
            return {
              damage: finalDamage,
              isCrit: isWeaknessHit,
              defeated: true,
              attackTypeLabel,
              droppedLootName,
            };
          } else {
            soundFX.playPRFanfare();
            set({
              soloBossHp: remaining,
              personalMaxDamage: newMaxDmg,
              adventureCooldownUntil: now + cooldownMs,
              activeTeamComboBuff: nextComboBuff,
              collectedBossLoots: updatedLoots,
            });
            state.showToast(
              droppedLootName
                ? `🎁 暴擊 -${finalDamage} HP！從 Boss 身上打落【${droppedLootName}】！`
                : `⚔️ ${attackTypeLabel}！對【${boss.nameZh}】造成 -${finalDamage} HP！`
            );
            return {
              damage: finalDamage,
              isCrit: isWeaknessHit,
              defeated: false,
              attackTypeLabel,
              droppedLootName,
            };
          }
        } else {
          const remaining = state.squadBossHp - finalDamage;
          if (remaining <= 0) {
            const nextStage = state.squadStage + 1;
            const nextBoss = ADVENTURE_BOSS_CATALOG[(nextStage - 1) % ADVENTURE_BOSS_CATALOG.length];
            const scaledHp = Math.round(nextBoss.maxHp * 1.8 * (1 + (nextStage - 1) * 0.25));
            soundFX.playVictory();
            set({
              squadStage: nextStage,
              squadBossHp: scaledHp,
              squadMaxStage: Math.max(state.squadMaxStage, nextStage),
              personalMaxDamage: newMaxDmg,
              coins: state.coins + boss.rewardCoins,
              adventureCooldownUntil: now + cooldownMs,
              activeTeamComboBuff: nextComboBuff,
              collectedBossLoots: updatedLoots,
            });
            state.showToast(
              droppedLootName
                ? `🏆 戰隊擊破【${boss.nameZh}】！你獲得隱藏掉落【${droppedLootName}】！`
                : `🏆 戰隊合力擊破【${boss.nameZh}】！推進至 Stage ${nextStage}！`
            );
            return {
              damage: finalDamage,
              isCrit: isWeaknessHit,
              defeated: true,
              attackTypeLabel,
              droppedLootName,
            };
          } else {
            soundFX.playPRFanfare();
            set({
              squadBossHp: remaining,
              personalMaxDamage: newMaxDmg,
              adventureCooldownUntil: now + cooldownMs,
              activeTeamComboBuff: nextComboBuff,
              collectedBossLoots: updatedLoots,
            });
            state.showToast(
              droppedLootName
                ? `🎁 連攜重擊 -${finalDamage} HP！幸運打落【${droppedLootName}】！`
                : `⚔️ ${attackTypeLabel}！造成 -${finalDamage} HP！`
            );
            return {
              damage: finalDamage,
              isCrit: isWeaknessHit,
              defeated: false,
              attackTypeLabel,
              droppedLootName,
            };
          }
        }
      },

      resetAdventureCooldown: (method) => {
        const state = get();
        if (method === 'ticket') {
          if (state.raidTickets <= 0) {
            state.showToast('⚠️ 討伐挑戰券不足，可使用模擬內購補充！');
            return;
          }
          soundFX.playSetComplete();
          set({
            raidTickets: state.raidTickets - 1,
            adventureCooldownUntil: 0,
          });
          state.showToast('🎫 已消耗 1 張討伐挑戰券，冷卻立即歸零！');
        } else {
          soundFX.playCoin();
          set({
            raidTickets: state.raidTickets + 2,
            adventureCooldownUntil: 0,
          });
          state.showToast('💎 模擬內購成功！冷卻已重置並額外獲得 2 張討伐券！');
        }
      },

      nudgeSquadMember: (memberId) => {
        const state = get();
        const target = state.squadMembers.find((m) => m.id === memberId);
        if (!target) return;
        soundFX.playSetComplete();
        set({
          squadMembers: state.squadMembers.map((m) =>
            m.id === memberId ? { ...m, nudgedCount: m.nudgedCount + 1 } : m
          ),
          quests: state.quests.map((q) =>
            q.id === 'q_social_cheer' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
        state.showToast(`🔔 哐噹！已拿 20kg 啞鈴敲了【${target.nameZh}】提醒他快去運動破盾！`);
      },

      simulateFriendWorkoutJoin: (memberId) => {
        const state = get();
        const target = state.squadMembers.find((m) => m.id === memberId);
        if (!target) return;
        const friendDmg = 580;
        const remaining = Math.max(50, state.squadBossHp - friendDmg);
        soundFX.playPRFanfare();
        set({
          squadBossHp: remaining,
          squadMembers: state.squadMembers.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  hasWorkedOutToday: true,
                  isSuspectedCheater: false,
                  workoutAuditZh: '✅ 有氧飛輪 30分鐘 · 組間心率與休息完整',
                  comboSkillAppliedZh: '🔥 已施放【燃脂魔焰】：破除高糖護盾！',
                  damageDealt: m.damageDealt + friendDmg,
                }
              : m
          ),
        });
        state.showToast(
          `⚡ 【${target.nameZh}】完成真實運動打卡！破除高糖護盾並打出 -${friendDmg} HP！`
        );
      },

      reportCheatingMember: (memberId) => {
        const state = get();
        const target = state.squadMembers.find((m) => m.id === memberId);
        if (!target) return;
        soundFX.playSetComplete();
        set({
          squadMembers: state.squadMembers.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  hasWorkedOutToday: false,
                  isSuspectedCheater: false,
                  workoutAuditZh: '🚨 作弊已被隊友抓包撤銷！需重新開啟組間休息計時運動',
                  damageDealt: 0,
                  nudgedCount: m.nudgedCount + 1,
                }
              : m
          ),
        });
        state.showToast(
          `🚨 抓包成功！已公開處刑【${target.nameZh}】的 5 秒空氣深蹲，沒收刮痧傷害並罰他重練！`
        );
      },

      setSquadName: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        soundFX.playSetComplete();
        set({ squadName: trimmed });
        get().showToast(`🛡️ 戰隊名稱已更新為：${trimmed}`);
      },

      recruitSquadMember: (candidate) => {
        const state = get();
        if (state.squadMembers.some((m) => m.id === candidate.id)) {
          state.showToast(`⚠️ 【${candidate.nameZh}】已經在你的戰隊中囉！`);
          return;
        }
        soundFX.playSetComplete();
        if (state.squadMembers.length >= 3) {
          // Replace the last slot or any non-active slot automatically
          const replaced = state.squadMembers[state.squadMembers.length - 1];
          const nextMembers = [...state.squadMembers.slice(0, 2), { ...candidate }];
          set({ squadMembers: nextMembers });
          state.showToast(`🤝 已招募【${candidate.nameZh}】入隊（替換掉 ${replaced.nameZh}）！`);
          return;
        }
        set({
          squadMembers: [...state.squadMembers, { ...candidate }],
        });
        state.showToast(`🎉 成功招募【${candidate.nameZh}】加入戰隊！`);
      },

      kickSquadMember: (memberId) => {
        const state = get();
        const target = state.squadMembers.find((m) => m.id === memberId);
        if (!target) return;
        soundFX.playBlip();
        set({
          squadMembers: state.squadMembers.filter((m) => m.id !== memberId),
        });
        state.showToast(`🚪 已將【${target.nameZh}】移出戰隊，可從下方招募新戰友！`);
      },

      setTodayWorkoutStatus: (status) => {
        soundFX.playBlip();
        set({ todayWorkoutStatus: status, adventureCooldownUntil: 0 });
      },

      setTodaySportType: (sport) => {
        soundFX.playBlip();
        set({ todaySportType: sport });
      },

      updateBiometrics: (partial) => {
        set((state) => ({
          biometrics: { ...state.biometrics, ...partial },
        }));
      },

      addDemoCoins: (amount) => {
        soundFX.playCoin();
        set((s) => ({ coins: s.coins + amount }));
        get().showToast(`🪙 金幣 +${amount}`);
      },

      refillStaminaFull: () => {
        soundFX.playSetComplete();
        set((s) => ({ stamina: s.maxStamina, dailySocialSentTotal: 0, dailySentPerAuthor: {} }));
        get().showToast('⚡ 體力已補滿 100/100');
      },

      resetDemoState: () => {
        localStorage.removeItem('fitmon-mvp-storage-v6');
        window.location.reload();
      },
    }),
    {
      name: 'fitmon-mvp-storage-v6',
      partialize: (state) => ({
        locale: state.locale,
        themeMode: state.themeMode,
        nickname: state.nickname,
        bodyStage: state.bodyStage,
        level: state.level,
        exp: state.exp,
        coins: state.coins,
        stamina: state.stamina,
        streakDays: state.streakDays,
        streakFreezes: state.streakFreezes,
        doubleCoinActive: state.doubleCoinActive,
        equipped: state.equipped,
        room: state.room,
        ownedItemIds: state.ownedItemIds,
        consumables: state.consumables,
        quests: state.quests,
        answeredQuizIds: state.answeredQuizIds,
        savedRoutines: state.savedRoutines,
        personalRecords: state.personalRecords,
        workoutHistory: state.workoutHistory,
        biometrics: state.biometrics,
        posts: state.posts,
        friendIds: state.friendIds,
        dailySocialSentTotal: state.dailySocialSentTotal,
        dailySentPerAuthor: state.dailySentPerAuthor,
        soloStage: state.soloStage,
        soloBossHp: state.soloBossHp,
        squadStage: state.squadStage,
        squadBossHp: state.squadBossHp,
        squadName: state.squadName,
        squadMembers: state.squadMembers,
        adventureCooldownUntil: state.adventureCooldownUntil,
        raidTickets: state.raidTickets,
        personalMaxStage: state.personalMaxStage,
        squadMaxStage: state.squadMaxStage,
        personalMaxDamage: state.personalMaxDamage,
        todayWorkoutStatus: state.todayWorkoutStatus,
        todaySportType: state.todaySportType,
        activeTeamComboBuff: state.activeTeamComboBuff,
        collectedBossLoots: state.collectedBossLoots,
      }),
    }
  )
);
