import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateWorkoutExp, CalculationResult, ExerciseCategory } from '@fitmon/engine';
import { ECONOMY_CONFIG, Locale } from '../config/economyConfig';
import {
  AVATAR_ITEMS,
  ROOM_ITEMS,
  EXERCISE_LIBRARY,
  INITIAL_SAVED_ROUTINES,
  AvatarBodyStage,
  EquipSlot,
  RoomSlot,
  ConsumableItem,
  WorkoutTemplate,
} from '../config/catalogConfig';
import { soundFX } from '../audio/SoundManager';

export type MainTab = 'home' | 'workout' | 'shop' | 'plaza' | 'analytics';

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
  dailySocialSentTotal: number;
  dailySocialMaxTotal: number;
  dailySentPerAuthor: Record<string, number>;

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
  useConsumableItem: (id: ConsumableItem['id']) => void;

  // Routine & Workout Focus Actions (V2-06, V2-14, V2-15)
  toggleFavoriteRoutine: (routineId: string) => void;
  saveCustomRoutine: (routine: WorkoutTemplate) => void;
  copyOrReferenceRoutine: (routine: WorkoutTemplate) => void;
  startWorkoutFocus: (routine?: WorkoutTemplate) => void;
  swapActiveExercise: (oldExerciseId: string, newExerciseId: string) => void;
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

  // Social Actions (V2-12, V2-16)
  tipPost: (postId: string) => void;
  giftWaterPost: (postId: string) => void;
  publishPost: (caption: string, stickerText?: string, customImageDataUrl?: string) => void;

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
    titleZh: '於社交動態打賞或送水 1 次',
    rewardCoins: ECONOMY_CONFIG.dailyTipQuestCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'plaza',
  },
  {
    id: 'q_create_meme',
    titleZh: '製作或發布一張運動拍貼',
    rewardCoins: ECONOMY_CONFIG.dailyMemeQuestCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'plaza',
  },
];

const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'post_seed_1',
    authorId: 'celeb_titan_chen',
    authorName: '陳巨石 (Rock Chen)',
    authorTitle: 'IPF 健力金牌・官方認證',
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
    workoutSummary: '陳巨石・三項極限巨力課表 (11 組)',
    totalVolumeKg: 5850,
    streakDays: 84,
    caption: '今天三項課表全部達標！點擊我的頭像可以看個人主頁，或是來我家一起同框深蹲！🔥',
    stickerText: '🏆 NEW PR! 地心引力阻止不了我',
    tipsCount: 42,
    waterCount: 28,
    createdAtLabel: '12 分鐘前',
  },
  {
    id: 'post_seed_2',
    authorId: 'friend_akai',
    authorName: '深蹲救星・阿凱',
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
    workoutSummary: '黃金臀腿增肌主課表 (10 組)',
    totalVolumeKg: 6840,
    streakDays: 12,
    caption: '我把家裡左邊換成跑步機、右邊放街機了！練完腿快來我家串門子看看新佈置～😂',
    stickerText: '♿ 今天練腿，明天請幫我推輪椅',
    tipsCount: 15,
    waterCount: 9,
    createdAtLabel: '35 分鐘前',
  },
  {
    id: 'post_seed_3',
    authorId: 'celeb_aesthetic_lin',
    authorName: '林健美 (Jay Lin)',
    authorTitle: 'IFBB Pro 古典健體選手',
    visibility: 'public',
    isVerified: true,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_spiky_gold',
      face: 'face_pixel_shades',
      top: 'top_spartan_cape',
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
    workoutSummary: '3D 倒三角肩背美學 (15 組)',
    totalVolumeKg: 4320,
    streakDays: 45,
    caption: '把每一組啞鈴側平舉的組間休息嚴格控制在 60 秒，三角肌中束泵感炸裂！✨',
    stickerText: '🧋 我的血液裡流淌著高蛋白乳清',
    tipsCount: 31,
    waterCount: 19,
    createdAtLabel: '1 小時前',
  },
  {
    id: 'post_seed_4',
    authorId: 'friend_alice',
    authorName: '百公斤深蹲・艾莉絲',
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
    workoutSummary: '週末有氧燃脂＋核心恢復 (5 組)',
    totalVolumeKg: 2400,
    streakDays: 21,
    caption: '今天不做大重量，跑完坡度跑步機再做 3 組棒式核心，身心舒暢！🌿',
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
    dateLabel: '3 天前 19:30',
    routineName: '💪 週三下班快速推日 (胸/肩)',
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
];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      locale: 'zh-TW',
      themeMode: 'light',
      soundEnabled: true,
      bgmEnabled: false,
      isNightModeRoom: false,
      memeStudioOpen: false,
      settingsOpen: false,
      wardrobeModalOpen: false,
      selectedProfileId: null,
      selectedHistorySessionId: null,
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
        top: 'top_black_tank',
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
      dailySocialSentTotal: 0,
      dailySocialMaxTotal: 5,
      dailySentPerAuthor: {},

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
            set({
              equipped: { ...state.equipped, [slot]: itemId },
              tryOnEquipped: { ...state.tryOnEquipped, [slot]: undefined },
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
            set({
              room: { ...state.room, [rSlot]: itemId },
              tryOnRoom: { ...state.tryOnRoom, [rSlot]: undefined },
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
          set({ cartItemIds: state.cartItemIds.filter((id) => id !== itemId) });
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
          state.showToast(`⚠️ 金幣不足（需 ${cost} 🪙）`);
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
        state.showToast('🧪 道具已購買存入背包！');
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
        state.showToast(`🔗 已將【${routine.nameZh}】加入您的引用課表庫！`);
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
        get().showToast(`🔄 已將中途動作替換為：${newEx.nameZh}`);
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
            state.showToast('⏰ 組間休息結束！準備開始下一組！');
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
          state.showToast(`🏆 NEW PR！${ex.nameZh} 突破 ${state.currentWeightKg}${ex.unitLabel}！`);
        } else {
          state.showToast(
            `✅ 完成 ${ex.nameZh} (${state.currentWeightKg}${ex.unitLabel} × ${state.currentReps})！休息倒數 ${state.currentRestConfigSec}s`
          );
        }
      },

      finishWorkoutSession: () => {
        const state = get();
        if (state.sessionSets.length === 0) {
          state.showToast('請先至少完成 1 組動作再結算，或點擊「放棄訓練」退出');
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

        // Group sets by exercise for full single-day session history (V2-01)
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
          dateLabel: '剛剛 (今日紀錄)',
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

        set({
          coins: state.coins + settlementCoins,
          exp: newExp,
          level: newLevel,
          streakDays: state.streakDays + 1,
          isWorkoutFocusActive: false,
          workoutElapsedSeconds: 0,
          isRestRunning: false,
          restSecondsLeft: 0,
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
        get().showToast('已退出本次運動專注模式');
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
          dateLabel: '剛剛 (3秒課表速記)',
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
      tipPost: (postId) => {
        const state = get();
        const post = state.posts.find((p) => p.id === postId);
        if (!post) return;

        if (state.dailySocialSentTotal >= state.dailySocialMaxTotal) {
          state.showToast(`🛑 今日總互助額度已達上限 (${state.dailySocialMaxTotal}/${state.dailySocialMaxTotal} 次)！`);
          return;
        }
        const authorCount = state.dailySentPerAuthor[post.authorId] || 0;
        if (authorCount >= 2) {
          state.showToast(`🛑 對【${post.authorName}】今日鼓勵已達上限 (2/2 次)！`);
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
        state.showToast(
          `🪙 已打賞 ${post.authorName}！（今日剩餘額度 ${
            state.dailySocialMaxTotal - state.dailySocialSentTotal - 1
          }/${state.dailySocialMaxTotal}）`
        );
      },

      giftWaterPost: (postId) => {
        const state = get();
        const post = state.posts.find((p) => p.id === postId);
        if (!post) return;

        if (state.dailySocialSentTotal >= state.dailySocialMaxTotal) {
          state.showToast(`🛑 今日總互助額度已達上限 (${state.dailySocialMaxTotal}/${state.dailySocialMaxTotal} 次)！`);
          return;
        }
        const authorCount = state.dailySentPerAuthor[post.authorId] || 0;
        if (authorCount >= 2) {
          state.showToast(`🛑 對【${post.authorName}】今日送禮已達上限 (2/2 次)！`);
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
        state.showToast(
          `💧 已送水給 ${post.authorName}！（今日剩餘額度 ${
            state.dailySocialMaxTotal - state.dailySocialSentTotal - 1
          }/${state.dailySocialMaxTotal}）`
        );
      },

      publishPost: (caption, stickerText, customImageDataUrl) => {
        const state = get();
        const latestHist = state.workoutHistory[0];
        const newPost: SocialPost = {
          id: `post_${Date.now()}`,
          authorId: 'me_player',
          authorName: state.nickname,
          authorTitle: `本人 · Lv.${state.level} ${state.bodyStage.toUpperCase()}`,
          visibility: 'mine',
          isVerified: false,
          bodyStage: state.bodyStage,
          equipped: { ...state.equipped },
          room: { ...state.room },
          workoutSummary: latestHist
            ? `${latestHist.routineName} (${latestHist.totalSets} 組)`
            : '自主訓練打卡',
          totalVolumeKg: latestHist ? latestHist.totalVolume : 3600,
          streakDays: state.streakDays,
          caption: caption || '今日份的鋼鐵修煉完成！再一組就回家！💪',
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
        state.showToast('📸 拍立得已發布至社交動態（可在「我的貼文」查看）！');
      },

      updateBiometrics: (partial) => {
        set((state) => ({
          biometrics: { ...state.biometrics, ...partial },
        }));
      },

      addDemoCoins: (amount) => {
        soundFX.playCoin();
        set((s) => ({ coins: s.coins + amount }));
        get().showToast(`🪙 測試金幣 +${amount}！`);
      },

      refillStaminaFull: () => {
        soundFX.playSetComplete();
        set((s) => ({ stamina: s.maxStamina, dailySocialSentTotal: 0, dailySentPerAuthor: {} }));
        get().showToast('⚡ 體力已補滿至 100/100（並重置今日打賞次數）！');
      },

      resetDemoState: () => {
        localStorage.removeItem('fitmon-mvp-storage-v3');
        window.location.reload();
      },
    }),
    {
      name: 'fitmon-mvp-storage-v3',
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
        dailySocialSentTotal: state.dailySocialSentTotal,
        dailySentPerAuthor: state.dailySentPerAuthor,
      }),
    }
  )
);
