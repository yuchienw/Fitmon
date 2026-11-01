import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateWorkoutExp, CalculationResult, ExerciseCategory } from '@fitmon/engine';
import { ECONOMY_CONFIG, Locale } from '../config/economyConfig';
import {
  AVATAR_ITEMS,
  ROOM_ITEMS,
  EXERCISE_LIBRARY,
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
  muscleGroup: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
  category: ExerciseCategory;
  weightKg: number;
  reps: number;
  coinsEarned: number;
  decayFactor: number;
  isPR: boolean;
  timestamp: number;
}

export interface DailyQuest {
  id: string;
  titleZh: string;
  descZh: string;
  rewardCoins: number;
  progress: number;
  target: number;
  claimed: boolean;
  targetTab: MainTab;
}

export interface SocialPost {
  id: string;
  authorName: string;
  authorTitle: string;
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
  setsCount: number;
  bonusCoins: number;
  newPRs: string[];
  staminaDepletedNotice: boolean;
  topExerciseName: string;
}

interface GameState {
  // UI & Settings
  activeTab: MainTab;
  locale: Locale;
  soundEnabled: boolean;
  isNightModeRoom: boolean;
  memeStudioOpen: boolean;
  settingsOpen: boolean;
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

  // Paper-doll & Room slots
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  ownedItemIds: string[];
  consumables: Record<ConsumableItem['id'], number>;

  // Quests & Science Quiz
  quests: DailyQuest[];
  answeredQuizIds: string[];

  // Active Workout Session (Keep-Alive across Tabs!)
  selectedExerciseId: string;
  currentWeightKg: number;
  currentReps: number;
  sessionSets: LoggedSet[];
  restSecondsLeft: number;
  isRestRunning: boolean;
  activeTemplateName: string | null;
  templateQueue: { exerciseId: string; targetSets: number; completedSets: number; reps: number; weightKg: number }[];

  // Historical Records & Biometrics Sandbox
  personalRecords: Record<string, number>;
  workoutHistory: {
    id: string;
    dateLabel: string;
    totalVolume: number;
    totalSets: number;
    coinsEarned: number;
    expEarned: number;
    topExerciseZh: string;
  }[];
  biometrics: {
    heightCm: number;
    weightKg: number;
    bodyFatPct: number;
    age: number;
    gender: 'male' | 'female';
    activityMultiplier: number;
    goal: 'cut' | 'maintain' | 'bulk';
  };

  // Social Plaza
  posts: SocialPost[];

  // Actions
  setActiveTab: (tab: MainTab) => void;
  setLocale: (locale: Locale) => void;
  toggleSound: () => void;
  toggleNightModeRoom: () => void;
  setMemeStudioOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  closeVictoryModal: () => void;
  showToast: (msg: string) => void;

  // Gameplay Actions
  setBodyStage: (stage: AvatarBodyStage) => void;
  interactWithRoomEntity: (type: 'avatar' | 'pet') => void;
  answerQuiz: (quizId: string, isCorrect: boolean) => void;
  claimQuest: (questId: string) => void;

  // Workout Actions
  selectExercise: (exerciseId: string) => void;
  setCurrentWeight: (kg: number) => void;
  setCurrentReps: (reps: number) => void;
  tickRestTimer: () => void;
  setRestTimer: (seconds: number) => void;
  logWorkoutSet: () => void;
  finishWorkoutSession: () => void;
  quickLog3SecWorkout: (presetTitle: string, estimatedVolume: number, muscleGroup: LoggedSet['muscleGroup']) => void;
  loadWorkoutTemplate: (tpl: WorkoutTemplate) => void;

  // Shop & Inventory Actions
  buyOrEquipCosmetic: (itemId: string, isRoom: boolean) => void;
  buyConsumable: (id: ConsumableItem['id'], useIapSim?: boolean) => void;
  useConsumableItem: (id: ConsumableItem['id']) => string | null;

  // Social Actions
  tipPost: (postId: string) => void;
  giftWaterPost: (postId: string) => void;
  publishPost: (caption: string, stickerText?: string, customImageDataUrl?: string) => void;

  // Biometrics & Demo Utils
  updateBiometrics: (partial: Partial<GameState['biometrics']>) => void;
  addDemoCoins: (amount: number) => void;
  refillStaminaFull: () => void;
  resetDemoState: () => void;
}

const INITIAL_QUESTS: DailyQuest[] = [
  {
    id: 'q_interact_pet',
    titleZh: '摸摸訓練室赤柴或小人',
    descZh: '在首頁像素畫布點擊角色或寵物互動 1 次',
    rewardCoins: ECONOMY_CONFIG.dailyPetInteractCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'home',
  },
  {
    id: 'q_daily_workout',
    titleZh: '完成今日重訓打卡結算',
    descZh: '記錄至少 1 組動作並完成街機結算（或使用 3 秒速記）',
    rewardCoins: ECONOMY_CONFIG.dailyWorkoutQuestCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'workout',
  },
  {
    id: 'q_social_cheer',
    titleZh: '於廣場打賞或贈送能量水',
    descZh: '給社群夥伴或名人動態送出 1 次鼓勵',
    rewardCoins: ECONOMY_CONFIG.dailyTipQuestCoins,
    progress: 0,
    target: 1,
    claimed: false,
    targetTab: 'plaza',
  },
  {
    id: 'q_create_meme',
    titleZh: '製作或發布一張運動拍立得',
    descZh: '使用迷因拍貼工坊匯出圖片或發布至動態牆',
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
    authorName: '陳巨石 (Rock Chen)',
    authorTitle: 'IPF 健力金牌・官方認證',
    isVerified: true,
    bodyStage: 'titan',
    equipped: {
      hair: 'hair_titan_crown',
      top: 'top_crimson_sbd',
      bottom: 'bottom_navy_shorts',
      accessory: 'acc_gold_barbell',
    },
    room: {
      wallpaper: 'wall_industrial_dark',
      floor: 'floor_gold_marble',
      mainRack: 'rack_crimson_pro',
      sideProp: 'prop_dumbbell_tower',
      pet: 'pet_shiba_dog',
    },
    workoutSummary: '槓鈴頸後深蹲 4×5 (180kg) ＋ 硬舉 3×5',
    totalVolumeKg: 5850,
    streakDays: 84,
    caption: '今天狀態絕佳！記住：脊椎中立、核心繃緊，歡迎大家到商城名人特展一鍵複製我的三項巨力課表！🔥',
    stickerText: '🏆 NEW PR! 地心引力阻止不了我',
    tipsCount: 42,
    waterCount: 28,
    createdAtLabel: '12 分鐘前',
  },
  {
    id: 'post_seed_2',
    authorName: '深蹲救星・阿凱',
    authorTitle: '維京巨力 Lv.14',
    isVerified: false,
    bodyStage: 'powerlifter',
    equipped: {
      hair: 'hair_pixel_shades',
      top: 'top_pump_cover',
      bottom: 'bottom_camo_joggers',
      accessory: 'acc_protein_shaker',
    },
    room: {
      wallpaper: 'wall_cyber_neon',
      floor: 'floor_turf_green',
      mainRack: 'rack_classic_cage',
      sideProp: 'prop_arcade_cabinet',
      pet: 'pet_black_cat',
    },
    workoutSummary: '煉獄腿日：深蹲 4 組 ＋ 45度腿推 4 組',
    totalVolumeKg: 7200,
    streakDays: 12,
    caption: '練完腿走下樓梯雙腿一直在抖，還好保住了 12 天連勝火苗！有人要幫我叫輪椅嗎？😂',
    stickerText: '♿ 今天練腿，明天請幫我推輪椅',
    tipsCount: 15,
    waterCount: 9,
    createdAtLabel: '35 分鐘前',
  },
  {
    id: 'post_seed_3',
    authorName: '林健美 (Jay Lin)',
    authorTitle: 'IFBB Pro 古典健體選手',
    isVerified: true,
    bodyStage: 'aesthetic',
    equipped: {
      hair: 'hair_spiky_gold',
      top: 'top_spartan_cape',
      bottom: 'bottom_gold_tights',
      accessory: 'acc_protein_shaker',
    },
    room: {
      wallpaper: 'wall_cyber_neon',
      floor: 'floor_turf_green',
      mainRack: 'rack_classic_cage',
      sideProp: 'prop_arcade_cabinet',
      pet: 'pet_whey_bot',
    },
    workoutSummary: '3D 倒三角肩背美學：引體向上 ＋ 側平舉',
    totalVolumeKg: 4320,
    streakDays: 45,
    caption: '不追求盲目甩大重量，把每一組啞鈴側平舉的離心控制在 3 秒，三角肌中束炸裂感滿分！✨',
    stickerText: '🧋 我的血液裡流淌著高蛋白乳清',
    tipsCount: 31,
    waterCount: 19,
    createdAtLabel: '1 小時前',
  },
];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      locale: 'zh-TW',
      soundEnabled: true,
      isNightModeRoom: false,
      memeStudioOpen: false,
      settingsOpen: false,
      victoryModalData: null,
      toastMessage: null,

      nickname: '鐵館勇者 #01',
      bodyStage: 'powerlifter',
      level: 5,
      exp: 420,
      coins: ECONOMY_CONFIG.ftueStarterCoins,
      stamina: ECONOMY_CONFIG.maxStamina,
      maxStamina: ECONOMY_CONFIG.maxStamina,
      streakDays: 7,
      streakFreezes: 1,
      doubleCoinActive: false,

      equipped: {
        hair: 'hair_ headband_red',
        top: 'top_black_tank',
        bottom: 'bottom_navy_shorts',
        accessory: 'acc_iron_dumbbell',
      },
      room: {
        wallpaper: 'wall_industrial_dark',
        floor: 'floor_rubber_black',
        mainRack: 'rack_classic_cage',
        sideProp: 'prop_dumbbell_tower',
        pet: 'pet_shiba_dog',
      },
      ownedItemIds: [
        'hair_ headband_red',
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

      quests: INITIAL_QUESTS,
      answeredQuizIds: [],

      selectedExerciseId: 'barbell_squat',
      currentWeightKg: 80,
      currentReps: 8,
      sessionSets: [],
      restSecondsLeft: 0,
      isRestRunning: false,
      activeTemplateName: null,
      templateQueue: [],

      personalRecords: {
        barbell_squat: 100,
        barbell_bench_press: 75,
        conventional_deadlift: 120,
        overhead_press: 45,
        pull_ups: 75,
      },
      workoutHistory: [
        {
          id: 'hist_1',
          dateLabel: '昨天',
          totalVolume: 4820,
          totalSets: 9,
          coinsEarned: 95,
          expEarned: 950,
          topExerciseZh: '槓鈴平板臥推',
        },
        {
          id: 'hist_2',
          dateLabel: '3 天前',
          totalVolume: 6400,
          totalSets: 10,
          coinsEarned: 120,
          expEarned: 1200,
          topExerciseZh: '槓鈴頸後深蹲',
        },
      ],
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

      setActiveTab: (tab) => {
        soundFX.playBlip();
        set({ activeTab: tab });
      },

      setLocale: (locale) => set({ locale }),

      toggleSound: () => {
        const next = !get().soundEnabled;
        soundFX.enabled = next;
        set({ soundEnabled: next });
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
        get().showToast(`✨ 已切換體態演化階段：${stage.toUpperCase()}`);
      },

      interactWithRoomEntity: (type) => {
        if (type === 'pet') {
          soundFX.playPetHeart();
        } else {
          soundFX.playBlip();
        }
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
          state.showToast(`🧠 答對運動科學問答！獲得 +${reward} 🪙`);
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

      selectExercise: (exerciseId) => {
        const ex = EXERCISE_LIBRARY.find((e) => e.id === exerciseId);
        if (!ex) return;
        soundFX.playBlip();
        set({
          selectedExerciseId: exerciseId,
          currentWeightKg: ex.defaultWeightKg,
          currentReps: ex.defaultReps,
        });
      },

      setCurrentWeight: (kg) => set({ currentWeightKg: Math.max(0, kg) }),
      setCurrentReps: (reps) => set({ currentReps: Math.max(1, reps) }),

      tickRestTimer: () => {
        const { restSecondsLeft, isRestRunning } = get();
        if (!isRestRunning) return;
        if (restSecondsLeft <= 1) {
          soundFX.playSetComplete();
          set({ restSecondsLeft: 0, isRestRunning: false });
          get().showToast('⏰ 組間休息結束！準備開始下一組！');
        } else {
          set({ restSecondsLeft: restSecondsLeft - 1 });
        }
      },

      setRestTimer: (seconds) => {
        soundFX.playBlip();
        set({ restSecondsLeft: seconds, isRestRunning: seconds > 0 });
      },

      logWorkoutSet: () => {
        const state = get();
        const ex = EXERCISE_LIBRARY.find((e) => e.id === state.selectedExerciseId) || EXERCISE_LIBRARY[0];

        // Count how many sets of this muscle group already logged in session
        const muscleSetsCount = state.sessionSets.filter((s) => s.muscleGroup === ex.muscleGroup).length + 1;
        let decayFactor = 1.0;
        if (muscleSetsCount === 9) decayFactor = 0.5;
        else if (muscleSetsCount === 10) decayFactor = 0.3;
        else if (muscleSetsCount === 11) decayFactor = 0.15;
        else if (muscleSetsCount >= 12) decayFactor = 0.0;

        // Check Stamina (Anti-punishment Golden Rule: Always allow logging!)
        const hasStamina = state.stamina >= ECONOMY_CONFIG.staminaPerSet;
        const newStamina = hasStamina ? state.stamina - ECONOMY_CONFIG.staminaPerSet : 0;

        // Calculate instant set coins (0 if stamina is 0 or junk volume decay is 0)
        const mult = state.doubleCoinActive ? 2 : 1;
        const instantCoins =
          hasStamina && decayFactor > 0
            ? Math.max(1, Math.round(ECONOMY_CONFIG.coinsPerValidSet * decayFactor * mult))
            : 0;

        // Check PR
        const prevBest = state.personalRecords[ex.id] || 0;
        const isPR = state.currentWeightKg > prevBest && state.currentReps >= 1;

        if (isPR) {
          soundFX.playPRFanfare();
        } else {
          soundFX.playSetComplete();
        }

        const newSet: LoggedSet = {
          id: `set_${Date.now()}`,
          exerciseId: ex.id,
          exerciseNameZh: ex.nameZh,
          muscleGroup: ex.muscleGroup,
          category: ex.category,
          weightKg: state.currentWeightKg,
          reps: state.currentReps,
          coinsEarned: instantCoins,
          decayFactor,
          isPR,
          timestamp: Date.now(),
        };

        // Update template queue if active
        const updatedQueue = state.templateQueue.map((item) =>
          item.exerciseId === ex.id ? { ...item, completedSets: item.completedSets + 1 } : item
        );

        set({
          stamina: newStamina,
          coins: state.coins + instantCoins,
          sessionSets: [...state.sessionSets, newSet],
          personalRecords: isPR
            ? { ...state.personalRecords, [ex.id]: state.currentWeightKg }
            : state.personalRecords,
          restSecondsLeft: 90,
          isRestRunning: true,
          templateQueue: updatedQueue,
        });

        if (isPR) {
          state.showToast(`🏆 NEW PR！${ex.nameZh} 突破 ${state.currentWeightKg} kg！`);
        } else if (!hasStamina) {
          state.showToast(`✅ 第 ${state.sessionSets.length + 1} 組已免費記錄（⚡體力耗盡不掉幣）`);
        } else if (decayFactor === 0) {
          state.showToast(`⚠️ 單部位超過12組進入垃圾容量保護，已記錄組數`);
        } else {
          state.showToast(`✅ 完成第 ${state.sessionSets.length + 1} 組！+${instantCoins} 🪙`);
        }
      },

      finishWorkoutSession: () => {
        const state = get();
        if (state.sessionSets.length === 0) {
          state.showToast('請先至少記錄 1 組訓練動作再結算喔！');
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

        const hasStaminaForBonus = state.stamina > 0 || state.sessionSets.some((s) => s.coinsEarned > 0);
        const mult = state.doubleCoinActive ? 2 : 1;
        const settlementCoins = hasStaminaForBonus ? calcResult.totalCoins * mult : 0;

        const newExp = state.exp + calcResult.totalExperience;
        const newLevel = Math.floor(newExp / 250) + 1;

        const newPRs = Array.from(
          new Set(state.sessionSets.filter((s) => s.isPR).map((s) => `${s.exerciseNameZh} ${s.weightKg}kg`))
        );

        const topExercise = state.sessionSets[0]?.exerciseNameZh || '綜合重訓';

        soundFX.playVictory();

        set({
          coins: state.coins + settlementCoins,
          exp: newExp,
          level: newLevel,
          streakDays: state.streakDays + 1,
          isRestRunning: false,
          restSecondsLeft: 0,
          victoryModalData: {
            calcResult,
            setsCount: state.sessionSets.length,
            bonusCoins: settlementCoins,
            newPRs,
            staminaDepletedNotice: !hasStaminaForBonus,
            topExerciseName: topExercise,
          },
          workoutHistory: [
            {
              id: `hist_${Date.now()}`,
              dateLabel: '剛剛',
              totalVolume: calcResult.totalRawVolume,
              totalSets: state.sessionSets.length,
              coinsEarned: settlementCoins,
              expEarned: calcResult.totalExperience,
              topExerciseZh: topExercise,
            },
            ...state.workoutHistory,
          ],
          quests: state.quests.map((q) =>
            q.id === 'q_daily_workout' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
          sessionSets: [],
          activeTemplateName: null,
          templateQueue: [],
        });
      },

      quickLog3SecWorkout: (presetTitle, estimatedVolume, muscleGroup) => {
        const state = get();
        const hasStamina = state.stamina >= ECONOMY_CONFIG.staminaPerQuickWorkout;
        const nextStamina = hasStamina ? state.stamina - ECONOMY_CONFIG.staminaPerQuickWorkout : 0;

        const calcResult = calculateWorkoutExp([
          {
            exerciseId: 'quick_log',
            muscleGroup,
            category: 'compound_secondary',
            weightKg: Math.round(estimatedVolume / 30),
            reps: 30,
          },
        ]);

        const mult = state.doubleCoinActive ? 2 : 1;
        const rewardCoins = hasStamina ? Math.max(25, calcResult.totalCoins * mult) : 0;

        soundFX.playVictory();

        set({
          stamina: nextStamina,
          coins: state.coins + rewardCoins,
          exp: state.exp + calcResult.totalExperience,
          streakDays: state.streakDays + 1,
          victoryModalData: {
            calcResult,
            setsCount: 3,
            bonusCoins: rewardCoins,
            newPRs: [],
            staminaDepletedNotice: !hasStamina,
            topExerciseName: presetTitle,
          },
          workoutHistory: [
            {
              id: `hist_${Date.now()}`,
              dateLabel: '剛剛 (3秒速記)',
              totalVolume: estimatedVolume,
              totalSets: 3,
              coinsEarned: rewardCoins,
              expEarned: calcResult.totalExperience,
              topExerciseZh: presetTitle,
            },
            ...state.workoutHistory,
          ],
          quests: state.quests.map((q) =>
            q.id === 'q_daily_workout' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
      },

      loadWorkoutTemplate: (tpl) => {
        const firstEx = tpl.exercises[0];
        soundFX.playSetComplete();
        set({
          activeTab: 'workout',
          activeTemplateName: tpl.nameZh,
          templateQueue: tpl.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            targetSets: e.sets,
            completedSets: 0,
            reps: e.reps,
            weightKg: e.weightKg,
          })),
          selectedExerciseId: firstEx ? firstEx.exerciseId : 'barbell_squat',
          currentWeightKg: firstEx ? firstEx.weightKg : 80,
          currentReps: firstEx ? firstEx.reps : 8,
        });
        get().showToast(`📋 已載入課表：${tpl.nameZh}！`);
      },

      buyOrEquipCosmetic: (itemId, isRoom) => {
        const state = get();
        const catalog = isRoom ? ROOM_ITEMS : AVATAR_ITEMS;
        const item = catalog.find((i) => i.id === itemId);
        if (!item) return;

        const isOwned = state.ownedItemIds.includes(itemId);
        if (isOwned) {
          soundFX.playBlip();
          if (isRoom) {
            set({ room: { ...state.room, [item.slot as RoomSlot]: itemId } });
          } else {
            set({ equipped: { ...state.equipped, [item.slot as EquipSlot]: itemId } });
          }
          state.showToast(`✨ 已換上：${item.nameZh}`);
          return;
        }

        if (state.coins < item.priceCoins) {
          soundFX.playBlip();
          state.showToast(`⚠️ 金幣不足（還差 ${item.priceCoins - state.coins} 🪙），快去運動打卡或領取任務！`);
          return;
        }

        soundFX.playCoin();
        if (isRoom) {
          set({
            coins: state.coins - item.priceCoins,
            ownedItemIds: [...state.ownedItemIds, itemId],
            room: { ...state.room, [item.slot as RoomSlot]: itemId },
          });
        } else {
          set({
            coins: state.coins - item.priceCoins,
            ownedItemIds: [...state.ownedItemIds, itemId],
            equipped: { ...state.equipped, [item.slot as EquipSlot]: itemId },
          });
        }
        state.showToast(`🛍️ 購買並裝備成功：${item.nameZh}！`);
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
          state.showToast(`⚠️ 金幣不足（需要 ${cost} 🪙），可使用模擬內購或去打卡賺幣！`);
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
        state.showToast(useIapSim ? '💎 [模擬 IAP 內購成功] 道具已存入背包！' : '🧪 購買成功！道具已存入背包');
      },

      useConsumableItem: (id) => {
        const state = get();
        const count = state.consumables[id] || 0;
        if (count <= 0) {
          state.showToast('⚠️ 背包內沒有此道具，請先購買！');
          return null;
        }

        if (id === 'bcaa_water') {
          soundFX.playSetComplete();
          const nextStamina = Math.min(state.maxStamina, state.stamina + 50);
          set({
            stamina: nextStamina,
            consumables: { ...state.consumables, bcaa_water: count - 1 },
          });
          state.showToast('🧪 飲用 BCAA 超能活力水！體力恢復 +50 ⚡');
          return 'stamina_refilled';
        }

        if (id === 'double_coin_card') {
          soundFX.playPRFanfare();
          set({
            doubleCoinActive: true,
            consumables: { ...state.consumables, double_coin_card: count - 1 },
          });
          state.showToast('⚡ 已啟動 24H 雙倍金幣增幅卡！所有金幣收益 ×2.0！');
          return 'double_coin';
        }

        if (id === 'streak_freeze') {
          if (state.streakFreezes >= ECONOMY_CONFIG.maxStreakFreezeStack) {
            state.showToast('🛡️ 連勝冰凍護盾已達上限 (3/3)！');
            return null;
          }
          soundFX.playSetComplete();
          set({
            streakFreezes: state.streakFreezes + 1,
            consumables: { ...state.consumables, streak_freeze: count - 1 },
          });
          state.showToast('🧊 已掛載連勝保命冰凍護盾 (+1)！');
          return 'streak_freeze';
        }

        if (id === 'gacha_ticket') {
          // Pick an unowned cosmetic item or fallback to 200 jackpot coins
          const allCosmetics = [...AVATAR_ITEMS, ...ROOM_ITEMS];
          const unowned = allCosmetics.filter((i) => !state.ownedItemIds.includes(i.id));
          soundFX.playVictory();

          if (unowned.length > 0) {
            const prize = unowned[Math.floor(Math.random() * unowned.length)];
            set({
              ownedItemIds: [...state.ownedItemIds, prize.id],
              consumables: { ...state.consumables, gacha_ticket: count - 1 },
            });
            state.showToast(`🎰 扭蛋大獎！抽中稀有外觀【${prize.nameZh}】！`);
            return prize.nameZh;
          } else {
            set({
              coins: state.coins + 250,
              consumables: { ...state.consumables, gacha_ticket: count - 1 },
            });
            state.showToast('🎰 您已收齊全圖鑑！扭蛋機退還頭獎 +250 🪙！');
            return '250 金幣大獎';
          }
        }
        return null;
      },

      tipPost: (postId) => {
        const state = get();
        if (state.coins < ECONOMY_CONFIG.tipSingleCoinCost) {
          state.showToast('⚠️ 金幣不足 10 🪙，無法打賞');
          return;
        }
        soundFX.playCoin();
        set({
          coins: state.coins - ECONOMY_CONFIG.tipSingleCoinCost,
          posts: state.posts.map((p) => (p.id === postId ? { ...p, tipsCount: p.tipsCount + 1 } : p)),
          quests: state.quests.map((q) =>
            q.id === 'q_social_cheer' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
        state.showToast('🪙 已打賞夥伴 10 金幣！（完成社群互助任務）');
      },

      giftWaterPost: (postId) => {
        const state = get();
        if (state.coins < ECONOMY_CONFIG.giftEnergyDrinkCost) {
          state.showToast('⚠️ 金幣不足 20 🪙，無法贈送能量水');
          return;
        }
        soundFX.playPetHeart();
        set({
          coins: state.coins - ECONOMY_CONFIG.giftEnergyDrinkCost,
          posts: state.posts.map((p) => (p.id === postId ? { ...p, waterCount: p.waterCount + 1 } : p)),
          quests: state.quests.map((q) =>
            q.id === 'q_social_cheer' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q
          ),
        });
        state.showToast('💧 已贈送好友 BCAA 能量水！（完成社群互助任務）');
      },

      publishPost: (caption, stickerText, customImageDataUrl) => {
        const state = get();
        const latestHist = state.workoutHistory[0];
        const newPost: SocialPost = {
          id: `post_${Date.now()}`,
          authorName: state.nickname,
          authorTitle: `Lv.${state.level} ${state.bodyStage.toUpperCase()}`,
          isVerified: false,
          bodyStage: state.bodyStage,
          equipped: { ...state.equipped },
          room: { ...state.room },
          workoutSummary: latestHist ? `${latestHist.topExerciseZh} (${latestHist.totalSets} 組)` : '自主訓練打卡',
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
        state.showToast('📸 拍立得已發布至社群廣場！');
      },

      updateBiometrics: (partial) => {
        set((state) => ({
          biometrics: { ...state.biometrics, ...partial },
        }));
      },

      addDemoCoins: (amount) => {
        soundFX.playCoin();
        set((s) => ({ coins: s.coins + amount }));
        get().showToast(`🪙 測試金幣已增加 +${amount}！`);
      },

      refillStaminaFull: () => {
        soundFX.playSetComplete();
        set((s) => ({ stamina: s.maxStamina }));
        get().showToast('⚡ 體力已補滿至 100/100！');
      },

      resetDemoState: () => {
        localStorage.removeItem('fitmon-mvp-storage-v1');
        window.location.reload();
      },
    }),
    {
      name: 'fitmon-mvp-storage-v1',
      partialize: (state) => ({
        locale: state.locale,
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
        personalRecords: state.personalRecords,
        workoutHistory: state.workoutHistory,
        biometrics: state.biometrics,
        posts: state.posts,
      }),
    }
  )
);
