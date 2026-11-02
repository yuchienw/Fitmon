import { ExerciseCategory } from '@fitmon/engine';

export type AvatarBodyStage = 'beginner' | 'powerlifter' | 'aesthetic' | 'titan';
export type AvatarExpression = 'smile' | 'strain' | 'cool' | 'cry';
export type EquipSlot = 'hair' | 'face' | 'top' | 'bottom' | 'accessory';
export type RoomSlot = 'wallpaper' | 'floor' | 'slotLeft' | 'slotCenter' | 'slotRight';
export type SportType = 'strength' | 'cardio' | 'bodyweight';

export interface CosmeticItem {
  id: string;
  slot: EquipSlot | 'wallpaper' | 'floor' | 'ReadysetDecor';
  isRoomDecor?: boolean;
  roomSubType?: 'wallpaper' | 'floor' | 'furniture' | 'pet';
  nameZh: string;
  nameEn: string;
  priceCoins: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  primaryColor: string;
  accentColor: string;
  badgeText?: string;
}

export interface ConsumableItem {
  id: 'bcaa_water' | 'double_coin_card' | 'streak_freeze' | 'gacha_ticket';
  nameZh: string;
  nameEn: string;
  effectBadge: string;
  priceCoins: number;
  iapPriceUsd: string;
  iconEmoji: string;
  colorClass: string;
}

export interface ExerciseItem {
  id: string;
  nameZh: string;
  nameEn: string;
  sportType: SportType;
  muscleGroup: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
  muscleLabelZh: string;
  primaryMusclesZh?: string;
  secondaryMusclesZh?: string;
  equipmentZh?: string;
  freeExerciseDbId?: string;
  category: ExerciseCategory;
  neuralMultiplier: number;
  defaultWeightKg: number;
  defaultReps: number;
  defaultRestSec: number;
  unitLabel: string;
  iconType: 'squat' | 'bench' | 'deadlift' | 'press' | 'pull' | 'curl' | 'run' | 'bike' | 'yoga';
  safetyCues: [string, string, string];
}

export interface RoutineExerciseConfig {
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
}

export interface WorkoutTemplate {
  id: string;
  nameZh: string;
  nameEn: string;
  category: 'favorite' | 'my_custom' | 'referenced' | 'recommended';
  authorName?: string;
  tagZh: string;
  exercises: RoutineExerciseConfig[];
}

export interface FriendProfile {
  id: string;
  nameZh: string;
  titleZh: string;
  isFriend: boolean;
  isVerified: boolean;
  verifiedBadge?: string;
  bioZh: string;
  followers: string;
  level: number;
  streakDays: number;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  bestPRs: { label: string; value: string }[];
  routineTemplate: WorkoutTemplate;
}

export const AVATAR_ITEMS: CosmeticItem[] = [
  // ================= 1. 頭飾 / 髮型 (hair) =================
  {
    id: 'hair_ headband_red',
    slot: 'hair',
    nameZh: '熱血赤紅頭帶',
    nameEn: 'Red Sweatband',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#ef4444',
    accentColor: '#271c19',
  },
  {
    id: 'hair_spiky_gold',
    slot: 'hair',
    nameZh: '超賽亞金焰髮',
    nameEn: 'Super Gold Spikes',
    priceCoins: 180,
    rarity: 'epic',
    primaryColor: '#facc15',
    accentColor: '#eab308',
  },
  {
    id: 'hair_titan_crown',
    slot: 'hair',
    nameZh: '巨力黃金王冠',
    nameEn: 'Power Crown',
    priceCoins: 320,
    rarity: 'legendary',
    primaryColor: '#f59e0b',
    accentColor: '#ef4444',
    badgeText: '聯名',
  },
  {
    id: 'hair_maple_cap',
    slot: 'hair',
    nameZh: '楓葉街頭潮帽',
    nameEn: 'Maple Street Cap',
    priceCoins: 150,
    rarity: 'rare',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
  },

  // ================= 2. 臉部 / 表情飾品 (face) =================
  {
    id: 'face_confident_smile',
    slot: 'face',
    nameZh: '陽光自信笑顏',
    nameEn: 'Confident Smile',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#ffdfc4',
    accentColor: '#38bdf8',
  },
  {
    id: 'face_pixel_shades',
    slot: 'face',
    nameZh: 'Deal With It 墨鏡',
    nameEn: 'Thug Pixel Shades',
    priceCoins: 150,
    rarity: 'rare',
    primaryColor: '#0f172a',
    accentColor: '#38bdf8',
  },
  {
    id: 'face_fierce_grit',
    slot: 'face',
    nameZh: '極限咬牙鬥魂臉',
    nameEn: 'PR Grit Face',
    priceCoins: 120,
    rarity: 'rare',
    primaryColor: '#f43f5e',
    accentColor: '#ffffff',
  },

  // ================= 3. 上衣 (top) =================
  {
    id: 'top_black_tank',
    slot: 'top',
    nameZh: '黑魂訓練吊嘎',
    nameEn: 'Obsidian Stringer',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#1e293b',
    accentColor: '#10b981',
  },
  {
    id: 'top_crimson_sbd',
    slot: 'top',
    nameZh: '紅黑競技健力服',
    nameEn: 'Crimson Singlet',
    priceCoins: 200,
    rarity: 'rare',
    primaryColor: '#991b1b',
    accentColor: '#f87171',
    badgeText: '熱門',
  },
  {
    id: 'top_pump_cover',
    slot: 'top',
    nameZh: '綠光泵感寬T',
    nameEn: 'Neon Pump Tee',
    priceCoins: 160,
    rarity: 'rare',
    primaryColor: '#065f46',
    accentColor: '#34d399',
  },
  {
    id: 'top_spartan_cape',
    slot: 'top',
    nameZh: '斯巴達戰神披風',
    nameEn: 'Spartan Cape',
    priceCoins: 350,
    rarity: 'legendary',
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    badgeText: '傳奇',
  },

  // ================= 4. 下身 (bottom) =================
  {
    id: 'bottom_navy_shorts',
    slot: 'bottom',
    nameZh: '高彈深蹲短褲',
    nameEn: 'Squat Flex Shorts',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#1e3a8a',
    accentColor: '#60a5fa',
  },
  {
    id: 'bottom_camo_joggers',
    slot: 'bottom',
    nameZh: '暗夜迷彩束口褲',
    nameEn: 'Night Camo Joggers',
    priceCoins: 140,
    rarity: 'rare',
    primaryColor: '#3f6212',
    accentColor: '#a3e635',
  },
  {
    id: 'bottom_gold_tights',
    slot: 'bottom',
    nameZh: '賽博金邊壓縮褲',
    nameEn: 'Cyber Gold Tights',
    priceCoins: 220,
    rarity: 'epic',
    primaryColor: '#312e81',
    accentColor: '#facc15',
  },

  // ================= 5. 手持裝備 (accessory) =================
  {
    id: 'acc_iron_dumbbell',
    slot: 'accessory',
    nameZh: '鑄鐵 20kg 啞鈴',
    nameEn: '20kg Iron Dumbbell',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#64748b',
    accentColor: '#cbd5e1',
  },
  {
    id: 'acc_protein_shaker',
    slot: 'accessory',
    nameZh: '翡翠乳清搖搖杯',
    nameEn: 'Emerald Shaker',
    priceCoins: 120,
    rarity: 'rare',
    primaryColor: '#10b981',
    accentColor: '#ecfdf5',
  },
  {
    id: 'acc_gold_barbell',
    slot: 'accessory',
    nameZh: '24K 奧林匹亞金槓',
    nameEn: '24K Gold Barbell',
    priceCoins: 380,
    rarity: 'legendary',
    primaryColor: '#f59e0b',
    accentColor: '#fef08a',
    badgeText: '尊榮',
  },
];

export const ROOM_ITEMS: CosmeticItem[] = [
  // ================= 牆面 (wallpaper) =================
  {
    id: 'wall_industrial_dark',
    slot: 'wallpaper',
    isRoomDecor: true,
    roomSubType: 'wallpaper',
    nameZh: '暗黑工業水泥牆',
    nameEn: 'Industrial Wall',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#283142',
    accentColor: '#475569',
  },
  {
    id: 'wall_cyber_neon',
    slot: 'wallpaper',
    isRoomDecor: true,
    roomSubType: 'wallpaper',
    nameZh: '賽博紫電霓虹牆',
    nameEn: 'Cyberpunk Neon',
    priceCoins: 200,
    rarity: 'epic',
    primaryColor: '#16112b',
    accentColor: '#d946ef',
  },
  {
    id: 'wall_zen_wood',
    slot: 'wallpaper',
    isRoomDecor: true,
    roomSubType: 'wallpaper',
    nameZh: '北歐暖陽木工坊',
    nameEn: 'Warm Wood Dojo',
    priceCoins: 180,
    rarity: 'rare',
    primaryColor: '#8c583a',
    accentColor: '#f5e6d3',
  },

  // ================= 地板 (floor) =================
  {
    id: 'floor_rubber_black',
    slot: 'floor',
    isRoomDecor: true,
    roomSubType: 'floor',
    nameZh: '防震黑橡膠地墊',
    nameEn: 'Rubber Gym Mat',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#161c28',
    accentColor: '#334155',
  },
  {
    id: 'floor_turf_green',
    slot: 'floor',
    isRoomDecor: true,
    roomSubType: 'floor',
    nameZh: '雪橇衝刺鮮綠草皮',
    nameEn: 'Pro Sled Turf',
    priceCoins: 160,
    rarity: 'rare',
    primaryColor: '#065f46',
    accentColor: '#10b981',
  },
  {
    id: 'floor_gold_marble',
    slot: 'floor',
    isRoomDecor: true,
    roomSubType: 'floor',
    nameZh: '黑金殿堂大理石',
    nameEn: 'Gold Marble Tile',
    priceCoins: 280,
    rarity: 'legendary',
    primaryColor: '#18181b',
    accentColor: '#eab308',
  },

  // ================= 自由擺設家具與器材 (可放左/中/右任一槽位) =================
  {
    id: 'rack_classic_cage',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'furniture',
    nameZh: '標準黑鐵深蹲架',
    nameEn: 'Power Squat Cage',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#475569',
    accentColor: '#3b82f6',
  },
  {
    id: 'rack_crimson_pro',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'furniture',
    nameZh: 'IPF 賽事赤紅深蹲架',
    nameEn: 'IPF Crimson Rack',
    priceCoins: 260,
    rarity: 'epic',
    primaryColor: '#dc2626',
    accentColor: '#facc15',
  },
  {
    id: 'prop_dumbbell_tower',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'furniture',
    nameZh: '重裝鍍鉻啞鈴塔',
    nameEn: 'Dumbbell Tower',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#334155',
    accentColor: '#38bdf8',
  },
  {
    id: 'prop_arcade_cabinet',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'furniture',
    nameZh: '復古 8-Bit 街機台',
    nameEn: 'Retro Arcade',
    priceCoins: 240,
    rarity: 'epic',
    primaryColor: '#6d28d9',
    accentColor: '#f43f5e',
  },
  {
    id: 'prop_cardio_treadmill',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'furniture',
    nameZh: '旗艦坡度跑步機',
    nameEn: 'Pro Treadmill',
    priceCoins: 210,
    rarity: 'rare',
    primaryColor: '#1e293b',
    accentColor: '#22d3ee',
  },
  {
    id: 'prop_plant_monstera',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'furniture',
    nameZh: '治癒龜背芋植栽',
    nameEn: 'Monstera Plant',
    priceCoins: 110,
    rarity: 'common',
    primaryColor: '#15803d',
    accentColor: '#86efac',
  },

  // ================= 寵物夥伴 (亦為裝飾之一，可自由擺放或收起 V2-04) =================
  {
    id: 'pet_shiba_dog',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'pet',
    nameZh: '舉重赤柴犬 (豆助)',
    nameEn: 'Gym Shiba Inu',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#d97706',
    accentColor: '#fef3c7',
    badgeText: '寵物',
  },
  {
    id: 'pet_black_cat',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'pet',
    nameZh: '高冷黑貓教練',
    nameEn: 'Coach Black Cat',
    priceCoins: 200,
    rarity: 'rare',
    primaryColor: '#1e1b4b',
    accentColor: '#facc15',
    badgeText: '寵物',
  },
  {
    id: 'pet_whey_bot',
    slot: 'ReadysetDecor',
    isRoomDecor: true,
    roomSubType: 'pet',
    nameZh: '懸浮乳清機器人',
    nameEn: 'Whey Bot 9000',
    priceCoins: 320,
    rarity: 'legendary',
    primaryColor: '#0891b2',
    accentColor: '#22d3ee',
    badgeText: '寵物',
  },
];

export const CONSUMABLE_ITEMS: ConsumableItem[] = [
  {
    id: 'bcaa_water',
    nameZh: 'BCAA 超能活力水',
    nameEn: 'BCAA Stamina Drink',
    effectBadge: '體力 +50 ⚡',
    priceCoins: 60,
    iapPriceUsd: 'NT$ 30',
    iconEmoji: '🧪',
    colorClass: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/50',
  },
  {
    id: 'double_coin_card',
    nameZh: '24H 雙倍金幣卡',
    nameEn: '2x Coin Booster',
    effectBadge: '金幣 ×2.0 🪙',
    priceCoins: 100,
    iapPriceUsd: 'NT$ 45',
    iconEmoji: '⚡',
    colorClass: 'from-amber-500/20 to-yellow-500/10 border-amber-500/50',
  },
  {
    id: 'streak_freeze',
    nameZh: '連勝保命冰凍卡',
    nameEn: 'Streak Freeze',
    effectBadge: '連勝保護 🛡️',
    priceCoins: 120,
    iapPriceUsd: 'NT$ 45',
    iconEmoji: '🧊',
    colorClass: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/50',
  },
  {
    id: 'gacha_ticket',
    nameZh: '黃金像素扭蛋代幣',
    nameEn: 'Gacha Token',
    effectBadge: '隨機抽獎 🎰',
    priceCoins: 120,
    iapPriceUsd: 'NT$ 35',
    iconEmoji: '🎟️',
    colorClass: 'from-purple-500/20 to-pink-500/10 border-purple-500/50',
  },
];

export const EXERCISE_LIBRARY: ExerciseItem[] = [
  // 重訓器材 (Strength)
  {
    id: 'barbell_squat',
    nameZh: '槓鈴頸後深蹲',
    nameEn: 'Barbell Back Squat',
    sportType: 'strength',
    muscleGroup: 'legs',
    muscleLabelZh: '股四頭 / 臀大肌',
    primaryMusclesZh: '股四頭肌 (Quadriceps)、臀大肌 (Gluteus Maximus)',
    secondaryMusclesZh: '膕繩肌、豎脊肌、核心穩定肌群',
    equipmentZh: '奧林匹克槓鈴、深蹲架',
    freeExerciseDbId: 'Barbell_Full_Squat',
    category: 'compound_big3',
    neuralMultiplier: 2.2,
    defaultWeightKg: 80,
    defaultReps: 8,
    defaultRestSec: 120,
    unitLabel: 'kg',
    iconType: 'squat',
    safetyCues: [
      '吸氣繃緊核心（瓦式呼吸），維持脊椎中立不眨屁股',
      '膝蓋朝腳尖方向自然外推，避免膝內扣代償',
      '全腳掌均勻踩地，重心穩定於足中',
    ],
  },
  {
    id: 'barbell_bench_press',
    nameZh: '槓鈴平板臥推',
    nameEn: 'Barbell Bench Press',
    sportType: 'strength',
    muscleGroup: 'chest',
    muscleLabelZh: '胸大肌 / 三頭',
    primaryMusclesZh: '胸大肌中束 (Pectoralis Major)',
    secondaryMusclesZh: '前三角肌、肱三頭肌',
    equipmentZh: '奧林匹克槓鈴、平板臥推床',
    freeExerciseDbId: 'Barbell_Bench_Press_-_Medium_Grip',
    category: 'compound_big3',
    neuralMultiplier: 2.2,
    defaultWeightKg: 60,
    defaultReps: 8,
    defaultRestSec: 120,
    unitLabel: 'kg',
    iconType: 'bench',
    safetyCues: [
      '肩胛骨後收下沉（沉肩夾背），穩固貼緊臥推椅面',
      '手肘與軀幹呈 45~70 度夾角，勿 90 度外展傷肩',
      '雙腳踩實地面傳導全身腿驅張力 (Leg Drive)',
    ],
  },
  {
    id: 'conventional_deadlift',
    nameZh: '傳統槓鈴硬舉',
    nameEn: 'Conventional Deadlift',
    sportType: 'strength',
    muscleGroup: 'back',
    muscleLabelZh: '全身後鏈肌群',
    primaryMusclesZh: '臀大肌、腿後膕繩肌、豎脊肌群',
    secondaryMusclesZh: '闊背肌、斜方肌、前臂握力',
    equipmentZh: '奧林匹克槓鈴',
    freeExerciseDbId: 'Barbell_Deadlift',
    category: 'compound_big3',
    neuralMultiplier: 2.2,
    defaultWeightKg: 100,
    defaultReps: 5,
    defaultRestSec: 150,
    unitLabel: 'kg',
    iconType: 'deadlift',
    safetyCues: [
      '槓鈴貼近小腿脛骨，起槓前先拉出槓鈴空隙 (Pull the Slack)',
      '闊背肌收緊下壓，嚴禁圓背硬拉',
      '推地夾臀鎖定，切勿過度後仰折腰',
    ],
  },
  {
    id: 'overhead_press',
    nameZh: '站姿槓鈴肩推',
    nameEn: 'Overhead Press',
    sportType: 'strength',
    muscleGroup: 'shoulders',
    muscleLabelZh: '三角肌前中束',
    primaryMusclesZh: '前三角肌、中三角肌 (Deltoids)',
    secondaryMusclesZh: '肱三頭肌、上胸肌、核心穩定肌群',
    equipmentZh: '奧林匹克槓鈴',
    freeExerciseDbId: 'Standing_Military_Press',
    category: 'compound_secondary',
    neuralMultiplier: 1.5,
    defaultWeightKg: 40,
    defaultReps: 8,
    defaultRestSec: 90,
    unitLabel: 'kg',
    iconType: 'press',
    safetyCues: [
      '臀部與腹肌收緊，避免下背過度反弓代償',
      '槓鈴貼近下巴垂直向上推起，前臂保持垂直地面',
      '手腕中立鎖緊不後折',
    ],
  },
  {
    id: 'pull_ups',
    nameZh: '寬握引體向上',
    nameEn: 'Wide-Grip Pull-Up',
    sportType: 'strength',
    muscleGroup: 'back',
    muscleLabelZh: '闊背肌 / 大圓肌',
    primaryMusclesZh: '闊背肌 (Latissimus Dorsi)、大圓肌',
    secondaryMusclesZh: '肱二頭肌、菱形肌、中下斜方肌',
    equipmentZh: '單槓架',
    freeExerciseDbId: 'Pullups',
    category: 'compound_secondary',
    neuralMultiplier: 1.5,
    defaultWeightKg: 70,
    defaultReps: 8,
    defaultRestSec: 90,
    unitLabel: 'kg',
    iconType: 'pull',
    safetyCues: [
      '先做肩胛下壓啟動，避免聳肩用上斜方肌硬拉',
      '手肘往身體兩側下拉，帶動上胸靠近橫槓',
      '離心下放保持 2 秒穩定控制',
    ],
  },
  {
    id: 'barbell_row',
    nameZh: '俯身槓鈴划船',
    nameEn: 'Barbell Bent-Over Row',
    sportType: 'strength',
    muscleGroup: 'back',
    muscleLabelZh: '闊背 / 菱形肌',
    primaryMusclesZh: '闊背肌、菱形肌、中下斜方肌',
    secondaryMusclesZh: '後三角肌、肱二頭肌、豎脊肌等長收縮',
    equipmentZh: '奧林匹克槓鈴',
    freeExerciseDbId: 'Bent_Over_Barbell_Row',
    category: 'compound_secondary',
    neuralMultiplier: 1.5,
    defaultWeightKg: 55,
    defaultReps: 10,
    defaultRestSec: 90,
    unitLabel: 'kg',
    iconType: 'pull',
    safetyCues: [
      '髖關節後推俯身約 45 度，維持下背自然平直',
      '手肘貼近身體將槓鈴拉向下腹肚臍，頂峰擠壓肩胛骨',
      '避免軀幹劇烈上下甩動借力',
    ],
  },
  {
    id: 'leg_press',
    nameZh: '45度器械腿推',
    nameEn: '45° Inclined Leg Press',
    sportType: 'strength',
    muscleGroup: 'legs',
    muscleLabelZh: '股四頭肌群',
    primaryMusclesZh: '股四頭肌 (股直肌、股外側肌、股內側肌)',
    secondaryMusclesZh: '臀大肌、腿後肌群',
    equipmentZh: '45度斜板腿推機',
    freeExerciseDbId: 'Leg_Press',
    category: 'machine',
    neuralMultiplier: 1.0,
    defaultWeightKg: 120,
    defaultReps: 10,
    defaultRestSec: 90,
    unitLabel: 'kg',
    iconType: 'squat',
    safetyCues: [
      '下背部與臀部緊貼椅墊，下放時尾椎不可捲起離開椅背',
      '推起時膝蓋保持微彎，切勿死鎖膝關節',
      '雙腳與肩同寬，膝蓋軌跡嚴格對準腳尖',
    ],
  },
  {
    id: 'lateral_raise',
    nameZh: '啞鈴側平舉',
    nameEn: 'Dumbbell Lateral Raise',
    sportType: 'strength',
    muscleGroup: 'shoulders',
    muscleLabelZh: '三角肌中束',
    primaryMusclesZh: '三角肌中束 (Lateral Deltoid)',
    secondaryMusclesZh: '前三角肌、棘上肌',
    equipmentZh: '六角啞鈴',
    freeExerciseDbId: 'Side_Lateral_Raise',
    category: 'isolation',
    neuralMultiplier: 0.8,
    defaultWeightKg: 10,
    defaultReps: 12,
    defaultRestSec: 60,
    unitLabel: 'kg',
    iconType: 'press',
    safetyCues: [
      '手肘微彎往斜前方 30 度（肩胛骨平面 Scapular Plane）舉起',
      '意念集中在手肘帶領遠離身體，避免聳肩斜方代償',
      '離心慢放 2~3 秒感受三角肌中束張力',
    ],
  },
  {
    id: 'dumbbell_curl',
    nameZh: '啞鈴二頭彎舉',
    nameEn: 'Dumbbell Bicep Curl',
    sportType: 'strength',
    muscleGroup: 'arms',
    muscleLabelZh: '肱二頭肌',
    primaryMusclesZh: '肱二頭肌長頭與短頭 (Biceps Brachii)',
    secondaryMusclesZh: '肱肌、肱橈肌',
    equipmentZh: '六角啞鈴',
    freeExerciseDbId: 'Dumbbell_Bicep_Curl',
    category: 'isolation',
    neuralMultiplier: 0.8,
    defaultWeightKg: 12,
    defaultReps: 12,
    defaultRestSec: 60,
    unitLabel: 'kg',
    iconType: 'curl',
    safetyCues: [
      '大臂穩定夾緊身體兩側，避免前後晃腰借力',
      '上舉過程旋轉手腕（外旋 Supination）徹底收縮二頭肌',
      '離心下放控制 2 秒直到手臂完全伸展',
    ],
  },

  // 有氧運動 (Cardio - V2-06 泛運動支援)
  {
    id: 'cardio_incline_run',
    nameZh: '坡度跑步機 / Zone 2 慢跑',
    nameEn: 'Incline Treadmill Run / Walk',
    sportType: 'cardio',
    muscleGroup: 'legs',
    muscleLabelZh: '心肺耐力 / 下肢',
    primaryMusclesZh: '心肺有氧系統、股四頭肌、腓腸肌、比目魚肌',
    secondaryMusclesZh: '臀肌、核心肌群',
    equipmentZh: '商用坡度跑步機',
    freeExerciseDbId: 'Running_Treadmill',
    category: 'compound_secondary',
    neuralMultiplier: 1.4,
    defaultWeightKg: 5,
    defaultReps: 20,
    defaultRestSec: 60,
    unitLabel: 'km',
    iconType: 'run',
    safetyCues: [
      '維持輕快步頻（約 170~180 spm），落點於身體重心下方減少膝衝擊',
      '核心微收、肩膀放鬆下沉不聳肩',
      '高坡度健走時切勿雙手緊抓扶手後仰，以免失去有氧效益',
    ],
  },
  {
    id: 'cardio_hiit_bike',
    nameZh: '飛輪單車 HIIT 間歇衝刺',
    nameEn: 'HIIT Stationary Spin Bike',
    sportType: 'cardio',
    muscleGroup: 'legs',
    muscleLabelZh: '心肺燃脂 / 股四頭',
    primaryMusclesZh: '股四頭肌、臀大肌、心肺有氧/無氧代謝系統',
    secondaryMusclesZh: '腿後肌群、小腿肌群',
    equipmentZh: '磁控飛輪健身車',
    freeExerciseDbId: 'Bicycling_Stationary',
    category: 'compound_secondary',
    neuralMultiplier: 1.4,
    defaultWeightKg: 8,
    defaultReps: 15,
    defaultRestSec: 45,
    unitLabel: 'km',
    iconType: 'bike',
    safetyCues: [
      '調整座墊高度至踏板踩到底時膝蓋仍保持微彎 15~25 度',
      '踩踏時膝蓋穩定直上直下，避免外八或內扣',
      '保持脊椎自然延伸，手肘微彎不死撐把手',
    ],
  },

  // 徒手 / 核心 / 瑜珈 (Bodyweight & Mobility - V2-06)
  {
    id: 'bw_plank_core',
    nameZh: '徒手棒式核心 / 動態流瑜珈',
    nameEn: 'Core Plank & Mobility Flow',
    sportType: 'bodyweight',
    muscleGroup: 'core',
    muscleLabelZh: '腹橫肌 / 核心穩定',
    primaryMusclesZh: '腹直肌、腹橫肌、腹內外斜肌 (Core Stabilizers)',
    secondaryMusclesZh: '前鋸肌、臀大肌、肩袖穩定肌群',
    equipmentZh: '專業瑜珈墊 (徒手自重)',
    freeExerciseDbId: 'Plank',
    category: 'isolation',
    neuralMultiplier: 1.0,
    defaultWeightKg: 60,
    defaultReps: 3,
    defaultRestSec: 45,
    unitLabel: '秒',
    iconType: 'yoga',
    safetyCues: [
      '收緊臀部與腹橫肌（骨盆微後傾），嚴防塌腰傷及下背椎間盤',
      '手肘正對肩膀下方，推起前鋸肌使肩胛骨飽滿不塌陷',
      '保持自然深長橫膈膜呼吸，切勿憋氣',
    ],
  },
];

export const INITIAL_SAVED_ROUTINES: WorkoutTemplate[] = [
  // 我的最愛 (favorite)
  {
    id: 'tpl_fav_leg_power',
    nameZh: '🔥 黃金臀腿增肌主課表',
    nameEn: 'Golden Leg & Glute Power',
    category: 'favorite',
    tagZh: '我的最愛',
    exercises: [
      { exerciseId: 'barbell_squat', sets: 4, reps: 8, weightKg: 85, restSeconds: 120 },
      { exerciseId: 'leg_press', sets: 3, reps: 10, weightKg: 120, restSeconds: 90 },
      { exerciseId: 'bw_plank_core', sets: 3, reps: 3, weightKg: 60, restSeconds: 45 },
    ],
  },
  // 我的自訂課表 (my_custom)
  {
    id: 'tpl_custom_push',
    nameZh: '💪 週三下班快速推日 (胸/肩)',
    nameEn: 'After-Work Express Push',
    category: 'my_custom',
    tagZh: '自訂課表',
    exercises: [
      { exerciseId: 'barbell_bench_press', sets: 4, reps: 8, weightKg: 65, restSeconds: 120 },
      { exerciseId: 'overhead_press', sets: 3, reps: 8, weightKg: 40, restSeconds: 90 },
      { exerciseId: 'lateral_raise', sets: 3, reps: 12, weightKg: 10, restSeconds: 60 },
    ],
  },
  {
    id: 'tpl_custom_cardio',
    nameZh: '🏃 週末有氧燃脂＋核心恢復',
    nameEn: 'Weekend Cardio & Core',
    category: 'my_custom',
    tagZh: '有氧徒手',
    exercises: [
      { exerciseId: 'cardio_incline_run', sets: 1, reps: 25, weightKg: 4, restSeconds: 60 },
      { exerciseId: 'cardio_hiit_bike', sets: 1, reps: 15, weightKg: 6, restSeconds: 45 },
      { exerciseId: 'bw_plank_core', sets: 3, reps: 3, weightKg: 60, restSeconds: 45 },
    ],
  },
  // 引用他人/名人課表 (referenced)
  {
    id: 'tpl_ref_rock_big3',
    nameZh: '👑 陳巨石・三項極限巨力課表',
    nameEn: 'Rock Chen SBD Power Routine',
    category: 'referenced',
    authorName: '陳巨石 (Rock Chen)',
    tagZh: '引用名人',
    exercises: [
      { exerciseId: 'barbell_squat', sets: 4, reps: 5, weightKg: 120, restSeconds: 150 },
      { exerciseId: 'barbell_bench_press', sets: 4, reps: 5, weightKg: 90, restSeconds: 120 },
      { exerciseId: 'conventional_deadlift', sets: 3, reps: 5, weightKg: 140, restSeconds: 150 },
    ],
  },
  {
    id: 'tpl_ref_jay_vtaper',
    nameZh: '✨ 林健美・3D 倒三角肩背美學',
    nameEn: 'Jay Lin V-Taper Aesthetic',
    category: 'referenced',
    authorName: '林健美 (Jay Lin)',
    tagZh: '引用名人',
    exercises: [
      { exerciseId: 'pull_ups', sets: 4, reps: 10, weightKg: 70, restSeconds: 90 },
      { exerciseId: 'barbell_row', sets: 4, reps: 10, weightKg: 60, restSeconds: 90 },
      { exerciseId: 'lateral_raise', sets: 4, reps: 15, weightKg: 12, restSeconds: 60 },
      { exerciseId: 'dumbbell_curl', sets: 3, reps: 12, weightKg: 14, restSeconds: 60 },
    ],
  },
  // 系統推薦模板 (recommended)
  {
    id: 'tpl_rec_fullbody',
    nameZh: '🌱 全身三大複合黃金新手課表',
    nameEn: 'Beginner Full-Body Compound',
    category: 'recommended',
    tagZh: '官方推薦',
    exercises: [
      { exerciseId: 'barbell_squat', sets: 3, reps: 8, weightKg: 60, restSeconds: 120 },
      { exerciseId: 'barbell_bench_press', sets: 3, reps: 8, weightKg: 50, restSeconds: 90 },
      { exerciseId: 'barbell_row', sets: 3, reps: 10, weightKg: 45, restSeconds: 90 },
    ],
  },
];

export const FRIEND_PROFILES: FriendProfile[] = [
  {
    id: 'celeb_titan_chen',
    nameZh: '陳巨石 (Rock Chen)',
    titleZh: 'IPF 國際健力三項金牌 × 傳奇館長',
    isFriend: true,
    isVerified: true,
    verifiedBadge: '👑 官方認證運動員',
    bioZh: '沒有奇蹟，只有累積！每一組深蹲都是對地心引力的宣戰！',
    followers: '128.4K',
    level: 42,
    streakDays: 84,
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
    bestPRs: [
      { label: '深蹲', value: '260kg' },
      { label: '臥推', value: '185kg' },
      { label: '硬舉', value: '300kg' },
    ],
    routineTemplate: INITIAL_SAVED_ROUTINES[3],
  },
  {
    id: 'celeb_aesthetic_lin',
    nameZh: '林健美 (Jay Lin)',
    titleZh: 'IFBB Pro 古典健體職業卡得主',
    isFriend: true,
    isVerified: true,
    verifiedBadge: '✨ 官方認證職業選手',
    bioZh: '重量只是工具，肌肉感受度與肩腰比例才是古典美學的靈魂。',
    followers: '94.2K',
    level: 36,
    streakDays: 45,
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
    bestPRs: [
      { label: '肩推', value: '85kg' },
      { label: '引體', value: '+40kg' },
      { label: '體脂', value: '6.8%' },
    ],
    routineTemplate: INITIAL_SAVED_ROUTINES[4],
  },
  {
    id: 'friend_akai',
    nameZh: '深蹲救星・阿凱',
    titleZh: '下班鐵館戰士 · 軟體工程師',
    isFriend: true,
    isVerified: false,
    bioZh: '白天寫 Code 抓 Bug，晚上深蹲練臀腿！歡迎來我家跟黑貓玩～',
    followers: '328',
    level: 14,
    streakDays: 12,
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
    bestPRs: [
      { label: '深蹲', value: '140kg' },
      { label: '臥推', value: '95kg' },
      { label: '5K跑', value: '22:15' },
    ],
    routineTemplate: INITIAL_SAVED_ROUTINES[0],
  },
  {
    id: 'friend_alice',
    nameZh: '百公斤深蹲・艾莉絲',
    titleZh: '力量舉與流瑜珈愛好者',
    isFriend: true,
    isVerified: false,
    bioZh: '重訓搭配有氧與核心伸展，追求力量與柔韌並存！',
    followers: '1.2K',
    level: 19,
    streakDays: 21,
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
    bestPRs: [
      { label: '深蹲', value: '115kg' },
      { label: '硬舉', value: '135kg' },
      { label: '棒式', value: '180秒' },
    ],
    routineTemplate: INITIAL_SAVED_ROUTINES[2],
  },
];

export const CELEBRITY_SHOWCASES = FRIEND_PROFILES.filter((p) => p.isVerified);

export const DAILY_SCIENCE_QUIZZES = [
  {
    id: 'quiz_sweat_fat',
    question: '穿暴汗衣流很多汗，代表脂肪燃燒得更快嗎？',
    options: [
      'A. 對，流汗越多減脂越快',
      'B. 錯，流汗只是調節體溫流失水分，減脂取決於熱量赤字 (CICO)',
    ],
    correctIndex: 1,
    explanation: '流汗減掉的體重 99% 是水分，穩定維持每日 300~500 kcal 熱量赤字與規律重訓才是真減脂！',
  },
  {
    id: 'quiz_junk_volume',
    question: '單次訓練同一個肌群狂做 25 組以上，肌肉會長得比做 8~10 組更快嗎？',
    options: [
      'A. 不會，單次超過約 10~12 組後會進入「垃圾容量」，徒增疲勞與受傷風險',
      'B. 會，組數無上限越多越好',
    ],
    correctIndex: 0,
    explanation: '單次訓練單一肌群有效刺激約在 6~10 組達到高峰，過量組數僅增加中樞神經疲勞！',
  },
  {
    id: 'quiz_protein_sleep',
    question: '增肌減脂期間，每日建議蛋白質攝取量與睡眠時間為何？',
    options: [
      'A. 每公斤體重 0.5g 蛋白質、睡 4 小時即可',
      'B. 每公斤體重 1.6~2.2g 蛋白質，搭配 7~8 小時充足睡眠',
    ],
    correctIndex: 1,
    explanation: '肌肉是在休息與睡眠中修復生長的！睡眠少於 6 小時會使肌肉合成率下降約 18%。',
  },
];

export const MEME_STICKERS = [
  { id: 'stk_legday', text: '♿ 今天練腿，明天請幫我推輪椅', color: '#f43f5e' },
  { id: 'stk_onemore', text: '🤥 教練說「最後一組」都是騙人的', color: '#f59e0b' },
  { id: 'stk_whey', text: '🧋 我的血液裡流淌著高蛋白乳清', color: '#10b981' },
  { id: 'stk_bulk', text: '🍔 我不是變胖，我是在乾淨增肌', color: '#8b5cf6' },
  { id: 'stk_pr', text: '🏆 NEW PR! 地心引力阻止不了我', color: '#eab308' },
  { id: 'stk_sore', text: '⚡ 延遲性肌肉痠痛是我的勳章', color: '#06b6d4' },
];
