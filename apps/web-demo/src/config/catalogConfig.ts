import { ExerciseCategory } from '@fitmon/engine';

export type AvatarBodyStage = 'beginner' | 'powerlifter' | 'aesthetic' | 'titan';
export type EquipSlot = 'hair' | 'top' | 'bottom' | 'accessory';
export type RoomSlot = 'wallpaper' | 'floor' | 'mainRack' | 'sideProp' | 'pet';

export interface CosmeticItem {
  id: string;
  slot: EquipSlot | RoomSlot;
  nameZh: string;
  nameEn: string;
  descZh: string;
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
  descZh: string;
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
  muscleGroup: 'legs' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core';
  muscleLabelZh: string;
  category: ExerciseCategory;
  neuralMultiplier: number;
  defaultWeightKg: number;
  defaultReps: number;
  safetyCues: [string, string, string];
  scienceNote: string;
}

export interface WorkoutTemplate {
  id: string;
  nameZh: string;
  nameEn: string;
  tagZh: string;
  descZh: string;
  exercises: { exerciseId: string; sets: number; reps: number; weightKg: number }[];
}

export interface CelebrityShowcase {
  id: string;
  nameZh: string;
  titleZh: string;
  verifiedBadge: string;
  quoteZh: string;
  followers: string;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  room: Record<RoomSlot, string>;
  signatureItemId: string;
  routineTemplate: WorkoutTemplate;
}

export const AVATAR_ITEMS: CosmeticItem[] = [
  // Hair / Headgear
  {
    id: 'hair_ headband_red',
    slot: 'hair',
    nameZh: '熱血赤紅頭帶',
    nameEn: 'Red Sweatband',
    descZh: '經典街機格鬥風，吸汗防滑（純外觀無數值加成）',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#ef4444',
    accentColor: '#1e293b',
  },
  {
    id: 'hair_spiky_gold',
    slot: 'hair',
    nameZh: '超賽亞金焰髮',
    nameEn: 'Super Gold Spikes',
    descZh: '突破 PR 時自帶氣場的金色怒髮',
    priceCoins: 180,
    rarity: 'epic',
    primaryColor: '#facc15',
    accentColor: '#eab308',
  },
  {
    id: 'hair_pixel_shades',
    slot: 'hair',
    nameZh: 'Deal With It 像素墨鏡',
    nameEn: '8-Bit Thug Shades',
    descZh: '深蹲到底也能保持冷酷的迷因墨鏡',
    priceCoins: 150,
    rarity: 'rare',
    primaryColor: '#0f172a',
    accentColor: '#38bdf8',
  },
  {
    id: 'hair_titan_crown',
    slot: 'hair',
    nameZh: '巨力黃金王冠',
    nameEn: 'Power Crown',
    descZh: '名人特展聯名紀念王冠，尊榮像素光澤',
    priceCoins: 320,
    rarity: 'legendary',
    primaryColor: '#f59e0b',
    accentColor: '#ef4444',
    badgeText: '名人聯名',
  },

  // Tops
  {
    id: 'top_black_tank',
    slot: 'top',
    nameZh: '經典黑魂訓練吊嘎',
    nameEn: 'Obsidian Stringer',
    descZh: '新手入門必備透氣背心，完美展露肩背線條',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#1e293b',
    accentColor: '#10b981',
  },
  {
    id: 'top_crimson_sbd',
    slot: 'top',
    nameZh: '紅黑競技健力連身衣',
    nameEn: 'Crimson Power Singlet',
    descZh: '專為三項健力愛好者打造的競技配色',
    priceCoins: 200,
    rarity: 'rare',
    primaryColor: '#991b1b',
    accentColor: '#f87171',
    badgeText: '熱門',
  },
  {
    id: 'top_pump_cover',
    slot: 'top',
    nameZh: 'Oversize 綠光泵感寬T',
    nameEn: 'Neon Pump Cover',
    descZh: '熱身時低調藏肉，脫下瞬間驚豔全場',
    priceCoins: 160,
    rarity: 'rare',
    primaryColor: '#065f46',
    accentColor: '#34d399',
  },
  {
    id: 'top_spartan_cape',
    slot: 'top',
    nameZh: '斯巴達赤膊戰神披風',
    nameEn: 'Spartan Cape',
    descZh: '極致倒三角體態專屬，背後飄揚王者紅披風',
    priceCoins: 350,
    rarity: 'legendary',
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    badgeText: '傳奇',
  },

  // Bottoms
  {
    id: 'bottom_navy_shorts',
    slot: 'bottom',
    nameZh: '高彈深蹲五分短褲',
    nameEn: 'Squat Flex Shorts',
    descZh: '絕不卡檔、深蹲到底無束縛',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#1e3a8a',
    accentColor: '#60a5fa',
  },
  {
    id: 'bottom_camo_joggers',
    slot: 'bottom',
    nameZh: '暗夜迷彩機能束口褲',
    nameEn: 'Night Camo Joggers',
    descZh: '硬派街頭重訓風格',
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
    descZh: '未來科技感肌肉線條勾勒',
    priceCoins: 220,
    rarity: 'epic',
    primaryColor: '#312e81',
    accentColor: '#facc15',
  },

  // Handheld Accessories
  {
    id: 'acc_iron_dumbbell',
    slot: 'accessory',
    nameZh: '鑄鐵 20kg 啞鈴',
    nameEn: '20kg Iron Dumbbell',
    descZh: '充滿歲月痕跡的老派鑄鐵啞鈴',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#64748b',
    accentColor: '#94a3b8',
  },
  {
    id: 'acc_protein_shaker',
    slot: 'accessory',
    nameZh: '翡翠雙層乳清搖搖杯',
    nameEn: 'Emerald Whey Shaker',
    descZh: '練後 30 分鐘來一杯，心理安慰加成 100%',
    priceCoins: 120,
    rarity: 'rare',
    primaryColor: '#10b981',
    accentColor: '#ecfdf5',
  },
  {
    id: 'acc_gold_barbell',
    slot: 'accessory',
    nameZh: '奧林匹亞 24K 黃金槓鈴',
    nameEn: '24K Golden Barbell',
    descZh: '象徵噸數王者的榮耀黃金巨槓',
    priceCoins: 380,
    rarity: 'legendary',
    primaryColor: '#f59e0b',
    accentColor: '#fef08a',
    badgeText: '尊榮',
  },
];

export const ROOM_ITEMS: CosmeticItem[] = [
  // Wallpaper
  {
    id: 'wall_industrial_dark',
    slot: 'wallpaper',
    nameZh: '暗黑工業水泥牆',
    nameEn: 'Industrial Concrete',
    descZh: '沉穩專注的地下鐵館氛圍',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#1e2433',
    accentColor: '#334155',
  },
  {
    id: 'wall_cyber_neon',
    slot: 'wallpaper',
    nameZh: '賽博紫電霓虹磚牆',
    nameEn: 'Cyberpunk Neon Brick',
    descZh: '自帶 Synthwave 呼吸燈條的深夜健身房',
    priceCoins: 200,
    rarity: 'epic',
    primaryColor: '#1e1b4b',
    accentColor: '#a855f7',
  },
  {
    id: 'wall_zen_wood',
    slot: 'wallpaper',
    nameZh: '北歐暖陽木質工坊',
    nameEn: 'Nordic Warm Timber',
    descZh: '明亮溫潤的居家 Home Gym 質感',
    priceCoins: 180,
    rarity: 'rare',
    primaryColor: '#451a03',
    accentColor: '#d97706',
  },

  // Floor
  {
    id: 'floor_rubber_black',
    slot: 'floor',
    nameZh: '高密度防震橡膠地墊',
    nameEn: 'Heavy Duty Rubber Mat',
    descZh: '摔槓也不怕樓下鄰居抗議',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#0f172a',
    accentColor: '#1e293b',
  },
  {
    id: 'floor_turf_green',
    slot: 'floor',
    nameZh: '競技雪橇衝刺草皮',
    nameEn: 'Pro Sled Turf',
    descZh: '附帶白色碼線標記的鮮綠機能草皮',
    priceCoins: 160,
    rarity: 'rare',
    primaryColor: '#064e3b',
    accentColor: '#10b981',
  },
  {
    id: 'floor_gold_marble',
    slot: 'floor',
    nameZh: '黑金殿堂大理石地磚',
    nameEn: 'Obsidian Gold Tile',
    descZh: '傳奇選手房間同款奢華地板',
    priceCoins: 280,
    rarity: 'legendary',
    primaryColor: '#18181b',
    accentColor: '#eab308',
  },

  // Main Rack
  {
    id: 'rack_classic_cage',
    slot: 'mainRack',
    nameZh: '標準黑鐵深蹲框架',
    nameEn: 'Standard Power Cage',
    descZh: '安全護槓齊全的可靠深蹲架',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#475569',
    accentColor: '#94a3b8',
  },
  {
    id: 'rack_crimson_pro',
    slot: 'mainRack',
    nameZh: 'IPF 國際賽事赤紅深蹲架',
    nameEn: 'IPF Competition Rack',
    descZh: '官方認證賽事規格，激發破紀錄腎上腺素',
    priceCoins: 260,
    rarity: 'epic',
    primaryColor: '#dc2626',
    accentColor: '#fca5a5',
  },

  // Side Prop
  {
    id: 'prop_dumbbell_tower',
    slot: 'sideProp',
    nameZh: '十層重裝啞鈴塔',
    nameEn: '10-Tier Dumbbell Tower',
    descZh: '從 2kg 到 50kg 一字排開的治癒畫面',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#334155',
    accentColor: '#38bdf8',
  },
  {
    id: 'prop_arcade_cabinet',
    slot: 'sideProp',
    nameZh: '復古 8-Bit 街機遊戲台',
    nameEn: 'Retro Arcade Machine',
    descZh: '組間休息時發光閃爍的經典街機',
    priceCoins: 240,
    rarity: 'epic',
    primaryColor: '#7c3aed',
    accentColor: '#f43f5e',
  },

  // Pet Companion
  {
    id: 'pet_shiba_dog',
    slot: 'pet',
    nameZh: '舉重赤柴犬 (豆助)',
    nameEn: 'Gym Shiba Inu',
    descZh: '會在深蹲架旁搖尾巴幫你加油的忠實夥伴',
    priceCoins: 0,
    rarity: 'common',
    primaryColor: '#d97706',
    accentColor: '#fef3c7',
  },
  {
    id: 'pet_black_cat',
    slot: 'pet',
    nameZh: '高冷黑貓教練 (喵스)',
    nameEn: 'Coach Black Cat',
    descZh: '用鄙視眼神監督你沒有偷懶少做一下',
    priceCoins: 200,
    rarity: 'rare',
    primaryColor: '#1e1b4b',
    accentColor: '#facc15',
  },
  {
    id: 'pet_whey_bot',
    slot: 'pet',
    nameZh: '懸浮乳清機器人 (WHEY-9000)',
    nameEn: 'Floating Whey Bot',
    descZh: '自動播報蛋白質攝取進度的像素機械寵物',
    priceCoins: 320,
    rarity: 'legendary',
    primaryColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
];

export const CONSUMABLE_ITEMS: ConsumableItem[] = [
  {
    id: 'bcaa_water',
    nameZh: 'BCAA 超能活力水',
    nameEn: 'BCAA Stamina Drink',
    descZh: '立即恢復 +50 點體力值 ⚡，重啟當日超量訓練的金幣掉落！',
    effectBadge: '體力 +50 ⚡',
    priceCoins: 60,
    iapPriceUsd: 'NT$ 30',
    iconEmoji: '🧪',
    colorClass: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/50',
  },
  {
    id: 'double_coin_card',
    nameZh: '24H 雙倍金幣增幅卡',
    nameEn: '2x Coin Booster (24h)',
    descZh: '啟動後 24 小時內，所有運動打卡與結算獲得的金幣 200% 翻倍！',
    effectBadge: '金幣 ×2.0 🪙',
    priceCoins: 100,
    iapPriceUsd: 'NT$ 45',
    iconEmoji: '⚡',
    colorClass: 'from-amber-500/20 to-yellow-500/10 border-amber-500/50',
  },
  {
    id: 'streak_freeze',
    nameZh: '連勝保命冰凍卡',
    nameEn: 'Streak Freeze Shield',
    descZh: '加班或生病忘記打卡時自動抵銷 1 天，保護辛苦累積的連勝火焰不熄滅（上限 3 張）',
    effectBadge: '連勝保護 🛡️',
    priceCoins: 120,
    iapPriceUsd: 'NT$ 45',
    iconEmoji: '🧊',
    colorClass: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/50',
  },
  {
    id: 'gacha_ticket',
    nameZh: '黃金像素扭蛋代幣',
    nameEn: 'Golden Gacha Token',
    descZh: '投入商城扭蛋機，隨機抽取稀有角色外觀、房間家具或大額金幣大獎！',
    effectBadge: '隨機抽獎 🎰',
    priceCoins: 120,
    iapPriceUsd: 'NT$ 35',
    iconEmoji: '🎟️',
    colorClass: 'from-purple-500/20 to-pink-500/10 border-purple-500/50',
  },
];

export const EXERCISE_LIBRARY: ExerciseItem[] = [
  {
    id: 'barbell_squat',
    nameZh: '槓鈴頸後深蹲',
    nameEn: 'Barbell Back Squat',
    muscleGroup: 'legs',
    muscleLabelZh: '腿部 / 臀大肌',
    category: 'compound_big3',
    neuralMultiplier: 2.2,
    defaultWeightKg: 80,
    defaultReps: 8,
    safetyCues: [
      '吸氣繃緊核心（瓦式呼吸），維持脊椎中立不眨屁股',
      '膝蓋朝向腳尖方向自然外推，避免膝內扣代償',
      '全腳掌均勻踩地（足弓三角支撐），重心勿過度前傾',
    ],
    scienceNote: '下肢肌肥大與全身神經徵召之王，高神經負荷享 2.2x 經驗加權。',
  },
  {
    id: 'barbell_bench_press',
    nameZh: '槓鈴平板臥推',
    nameEn: 'Barbell Bench Press',
    muscleGroup: 'chest',
    muscleLabelZh: '胸大肌 / 前三角 / 三頭',
    category: 'compound_big3',
    neuralMultiplier: 2.2,
    defaultWeightKg: 60,
    defaultReps: 8,
    safetyCues: [
      '肩胛骨後收下沉（沉肩夾背），穩固貼緊臥推椅面',
      '手肘與軀幹呈約 45~70 度夾角，切勿 90 度外展傷肩',
      '下放至下胸乳頭連線輕觸，推起時雙腳踩實地面傳導力量',
    ],
    scienceNote: '上肢水平推核心複合動作，享 2.2x 經驗加權。',
  },
  {
    id: 'conventional_deadlift',
    nameZh: '傳統槓鈴硬舉',
    nameEn: 'Conventional Deadlift',
    muscleGroup: 'back',
    muscleLabelZh: '後側鏈 / 豎脊肌 / 臀腿',
    category: 'compound_big3',
    neuralMultiplier: 2.2,
    defaultWeightKg: 100,
    defaultReps: 5,
    safetyCues: [
      '槓鈴貼近小腿脛骨中線，起槓前先拉出槓鈴空隙（Pull the slack）',
      '闊背肌收緊（想像腋下夾橘子），嚴禁圓背硬拉',
      '想像雙腳把地球踩下去，鎖定時夾臀勿過度後仰折腰',
    ],
    scienceNote: '全身後側鏈力量指標，高神經負荷享 2.2x 經驗加權。',
  },
  {
    id: 'overhead_press',
    nameZh: '站姿槓鈴肩推',
    nameEn: 'Overhead Barbell Press',
    muscleGroup: 'shoulders',
    muscleLabelZh: '三角肌前中束 / 核心',
    category: 'compound_secondary',
    neuralMultiplier: 1.5,
    defaultWeightKg: 40,
    defaultReps: 8,
    safetyCues: [
      '臀部與腹肌同時收緊，避免下背過度反弓變成站姿上斜臥推',
      '槓鈴垂直向上推起，通過下巴後頭部自然微向前鑽',
      '前臂保持垂直地面，手腕中立不後折',
    ],
    scienceNote: '打造飽滿立體肩部與核心抗伸展能力，享 1.5x 加權。',
  },
  {
    id: 'pull_ups',
    nameZh: '寬握引體向上',
    nameEn: 'Wide-Grip Pull-Up',
    muscleGroup: 'back',
    muscleLabelZh: '闊背肌 / 二頭肌',
    category: 'compound_secondary',
    neuralMultiplier: 1.5,
    defaultWeightKg: 70,
    defaultReps: 8,
    safetyCues: [
      '啟動前先做肩胛下壓（Depress），避免聳肩用斜方肌硬拉',
      '想像將手肘往褲子口袋方向下拉，帶動上胸靠近橫槓',
      '離心下放保持 2 秒控制，不完全放掉肩膀張力',
    ],
    scienceNote: '倒三角背部寬度黃金動作，享 1.5x 複合加權。',
  },
  {
    id: 'barbell_row',
    nameZh: '俯身槓鈴划船',
    nameEn: 'Bent-Over Barbell Row',
    muscleGroup: 'back',
    muscleLabelZh: '中背部 / 闊背肌 / 菱形肌',
    category: 'compound_secondary',
    neuralMultiplier: 1.5,
    defaultWeightKg: 55,
    defaultReps: 10,
    safetyCues: [
      '髖關節後推（Hip Hinge）俯身約 45 度，維持下背平直',
      '將槓鈴拉向下腹肚臍位置，頂峰擠壓肩胛骨 1 秒',
      '避免利用軀幹劇烈甩動借力',
    ],
    scienceNote: '雕塑背部厚度與改善圓肩駝背，享 1.5x 加權。',
  },
  {
    id: 'leg_press',
    nameZh: '45度器械腿推',
    nameEn: '45° Machine Leg Press',
    muscleGroup: 'legs',
    muscleLabelZh: '股四頭肌 / 臀部',
    category: 'machine',
    neuralMultiplier: 1.0,
    defaultWeightKg: 120,
    defaultReps: 10,
    safetyCues: [
      '下背部與臀部全程緊貼椅墊，下放不可深到尾椎捲起離開墊子',
      '推起時膝蓋保持微彎彈性，絕對不可完全死鎖膝關節',
      '雙腳與肩同寬，膝蓋穩定對準腳尖',
    ],
    scienceNote: '安全高容量股四頭肌刺激器械，享 1.0x 基準倍率。',
  },
  {
    id: 'lateral_raise',
    nameZh: '啞鈴側平舉',
    nameEn: 'Dumbbell Lateral Raise',
    muscleGroup: 'shoulders',
    muscleLabelZh: '三角肌中束（視覺肩寬）',
    category: 'isolation',
    neuralMultiplier: 0.8,
    defaultWeightKg: 10,
    defaultReps: 12,
    safetyCues: [
      '手肘微彎固定，身體微前傾 10 度，往斜前方約 30 度（肩胛骨平面）舉起',
      '想像手肘帶領遠離身體，而非把啞鈴往上聳肩甩高',
      '選擇可控制的重量，感受中束酸脹感而非斜方肌代償',
    ],
    scienceNote: '打造視覺倒三角寬肩必練孤立動作（0.8x 孤立防刷加權）。',
  },
  {
    id: 'dumbbell_curl',
    nameZh: '站姿啞鈴二頭彎舉',
    nameEn: 'Standing Dumbbell Bicep Curl',
    muscleGroup: 'arms',
    muscleLabelZh: '肱二頭肌',
    category: 'isolation',
    neuralMultiplier: 0.8,
    defaultWeightKg: 12,
    defaultReps: 12,
    safetyCues: [
      '大臂夾緊身體兩側固定，避免前後晃動腰部借力',
      '旋外手腕（小拇指微向內轉），徹底收縮二頭肌短頭與長頭',
      '離心下放慢速控制 2~3 秒，獲得最佳肌肥大張力',
    ],
    scienceNote: '經典手臂泵感動作（0.8x 孤立防刷加權）。',
  },
];

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'tpl_push_day',
    nameZh: '🔥 經典推日 (Push: 胸/肩/三頭)',
    nameEn: 'Classic Push Day',
    tagZh: '增肌首選',
    descZh: '槓鈴臥推領銜，搭配肩推與側平舉，全方位泵感上肢推課表',
    exercises: [
      { exerciseId: 'barbell_bench_press', sets: 4, reps: 8, weightKg: 60 },
      { exerciseId: 'overhead_press', sets: 3, reps: 8, weightKg: 40 },
      { exerciseId: 'lateral_raise', sets: 3, reps: 12, weightKg: 10 },
    ],
  },
  {
    id: 'tpl_pull_day',
    nameZh: '🦅 倒三角拉日 (Pull: 背/二頭)',
    nameEn: 'V-Taper Pull Day',
    tagZh: '背部雕塑',
    descZh: '硬舉＋引體向上＋划船，打造厚實寬闊的背闊肌與手臂線條',
    exercises: [
      { exerciseId: 'conventional_deadlift', sets: 3, reps: 5, weightKg: 100 },
      { exerciseId: 'pull_ups', sets: 3, reps: 8, weightKg: 70 },
      { exerciseId: 'barbell_row', sets: 3, reps: 10, weightKg: 55 },
      { exerciseId: 'dumbbell_curl', sets: 3, reps: 12, weightKg: 12 },
    ],
  },
  {
    id: 'tpl_leg_day',
    nameZh: '♿ 煉獄腿日 (Leg Day: 臀腿爆破)',
    nameEn: 'Brutal Leg Day',
    tagZh: '高金幣加權',
    descZh: '深蹲搭配器械腿推，全身最高神經負荷與金幣產出效率！',
    exercises: [
      { exerciseId: 'barbell_squat', sets: 4, reps: 8, weightKg: 80 },
      { exerciseId: 'leg_press', sets: 4, reps: 10, weightKg: 120 },
    ],
  },
];

export const CELEBRITY_SHOWCASES: CelebrityShowcase[] = [
  {
    id: 'celeb_titan_chen',
    nameZh: '陳巨石 (Rock Chen)',
    titleZh: 'IPF 國際健力三項金牌 × 傳奇巨力館長',
    verifiedBadge: '👑 官方認證運動員',
    quoteZh: '「沒有奇蹟，只有累積！每一組深蹲都是對地心引力的宣戰！」',
    followers: '128.4K 粉絲',
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
    signatureItemId: 'hair_titan_crown',
    routineTemplate: {
      id: 'tpl_celeb_rock_big3',
      nameZh: '👑 陳巨石・三項極限巨力課表',
      nameEn: 'Rock Chen SBD Power Routine',
      tagZh: '名人認證課表',
      descZh: '專注三大複合動作的高強度力量課表，最大化神經徵召與金幣獎勵！',
      exercises: [
        { exerciseId: 'barbell_squat', sets: 4, reps: 5, weightKg: 120 },
        { exerciseId: 'barbell_bench_press', sets: 4, reps: 5, weightKg: 90 },
        { exerciseId: 'conventional_deadlift', sets: 3, reps: 5, weightKg: 140 },
      ],
    },
  },
  {
    id: 'celeb_aesthetic_lin',
    nameZh: '林健美 (Jay Lin)',
    titleZh: 'IFBB Pro 古典健體職業卡得主',
    verifiedBadge: '✨ 官方認證職業選手',
    quoteZh: '「重量只是工具，肌肉感受度與肩腰比例才是古典美學的靈魂。」',
    followers: '94.2K 粉絲',
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
    signatureItemId: 'top_spartan_cape',
    routineTemplate: {
      id: 'tpl_celeb_jay_aesthetic',
      nameZh: '✨ 林健美・3D 倒三角肩背美學課表',
      nameEn: 'Jay Lin V-Taper Aesthetic Routine',
      tagZh: '名人認證課表',
      descZh: '針對視覺肩寬與背闊肌展開的高感受度黃金組合！',
      exercises: [
        { exerciseId: 'pull_ups', sets: 4, reps: 10, weightKg: 75 },
        { exerciseId: 'overhead_press', sets: 4, reps: 8, weightKg: 50 },
        { exerciseId: 'lateral_raise', sets: 4, reps: 15, weightKg: 12 },
        { exerciseId: 'dumbbell_curl', sets: 3, reps: 12, weightKg: 14 },
      ],
    },
  },
];

export const DAILY_SCIENCE_QUIZZES = [
  {
    id: 'quiz_sweat_fat',
    question: '穿暴汗衣流很多汗，代表脂肪燃燒得更快嗎？',
    options: [
      'A. 對，流汗越多減脂越快',
      'B. 錯，流汗只是流失水分與調節體溫，減脂取決於熱量赤字 (CICO)',
    ],
    correctIndex: 1,
    explanation: '科學實證：流汗減掉的體重 99% 是水分，喝水就會回來。穩定維持每日 300~500 kcal 熱量赤字與規律重訓才是真減脂！',
  },
  {
    id: 'quiz_junk_volume',
    question: '單次訓練同一個肌群狂做 25 組以上，肌肉會長得比做 8~10 組更快嗎？',
    options: [
      'A. 不會，單次超過約 10~12 組後會進入「垃圾容量 (Junk Volume)」，徒增疲勞與受傷風險',
      'B. 會，組數無上限越多越好',
    ],
    correctIndex: 0,
    explanation: '運動科學研究顯示，單次訓練單一肌群有效刺激約在 6~10 組達到高峰，過量組數僅增加中樞神經疲勞與恢復負擔！',
  },
  {
    id: 'quiz_protein_sleep',
    question: '增肌減脂期間，每日建議蛋白質攝取量與睡眠時間為何？',
    options: [
      'A. 每公斤體重 0.5g 蛋白質、睡 4 小時即可',
      'B. 每公斤體重 1.6~2.2g 蛋白質，搭配 7~8 小時充足睡眠',
    ],
    correctIndex: 1,
    explanation: '肌肉是在休息與睡眠中修復生長的！研究指出睡眠少於 6 小時會使肌肉蛋白合成率下降約 18%。',
  },
];

export const MEME_STICKERS = [
  { id: 'stk_legday', text: '♿ 今天練腿，明天請幫我推輪椅', color: '#f43f5e' },
  { id: 'stk_onemore', text: '🤥 教練說「最後一組」都是騙人的', color: '#f59e0b' },
  { id: 'stk_whey', text: '🧋 我的血液裡流淌著高蛋白乳清', color: '#10b981' },
  { id: 'stk_bulk', text: '🍔 我不是變胖，我是在乾淨增肌 (Bulking)', color: '#8b5cf6' },
  { id: 'stk_pr', text: '🏆 NEW PR! 地心引力阻止不了我', color: '#eab308' },
  { id: 'stk_sore', text: '⚡ 延遲性肌肉痠痛 (DOMS) 是我的勳章', color: '#06b6d4' },
];
