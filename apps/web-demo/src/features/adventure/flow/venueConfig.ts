import { ADVENTURE_BOSS_CATALOG, AdventureBoss } from '../../../config/catalogConfig';

export interface GymVenueInfo {
  index: number;
  nameZh: string;
  nameEn: string;
  landmarkKey: string;
  bossIndex: number;
  defaultBossNameZh: string;
  descriptionZh: string;
  themeColor: string;
  mapCoords: { x: number; y: number }; // 0..100% position on Gym Island Map
  partyAnchor?: { x: number; y: number }; // optional party anchor (percentage 0..100% or pixels)
}

export const GYM_VENUES: GymVenueInfo[] = [
  {
    index: 0,
    nameZh: '懶人沙發角',
    nameEn: 'Couch Potato Lounge',
    landmarkKey: 'landmark_lazy_sofa',
    bossIndex: 0,
    defaultBossNameZh: '沙發馬鈴薯怪',
    descriptionZh: '陷在沙發爬不起來的怠惰巨物，需要重拳將它打回訓練場！',
    themeColor: '#f59e0b',
    mapCoords: { x: 26, y: 16 },
  },
  {
    index: 1,
    nameZh: '珍奶補給站',
    nameEn: 'Boba Station',
    landmarkKey: 'landmark_boba_station',
    bossIndex: 1,
    defaultBossNameZh: '宵夜珍奶巨魔',
    descriptionZh: '深夜黑糖珍珠糖霜誘惑，用高溫燃脂魔法融化它！',
    themeColor: '#ec4899',
    mapCoords: { x: 74, y: 20 },
  },
  {
    index: 2,
    nameZh: '夜貓手機亭',
    nameEn: 'Phone-Ghost Booth',
    landmarkKey: 'landmark_phone_booth',
    bossIndex: 2,
    defaultBossNameZh: '熬夜低頭幽靈',
    descriptionZh: '駝背滑手機烏龜頸幽魂，以強大深蹲姿勢打破怠惰！',
    themeColor: '#8b5cf6',
    mapCoords: { x: 24, y: 46 },
  },
  {
    index: 3,
    nameZh: '跑道館',
    nameEn: 'Running Track Hall',
    landmarkKey: 'landmark_cheese_runway',
    bossIndex: 3,
    defaultBossNameZh: '熔岩起司黏怪',
    descriptionZh: '牽絲高熱量起司怪，在跑道上加速狂奔衝刺蒸發它！',
    themeColor: '#f97316',
    mapCoords: { x: 70, y: 48 },
  },
  {
    index: 4,
    nameZh: '攀岩爬梯館',
    nameEn: 'Alarm-Clock Climbing Tower',
    landmarkKey: 'landmark_alarm_tower',
    bossIndex: 4,
    defaultBossNameZh: '賴床貪睡魔神',
    descriptionZh: '按了多次貪睡鬧鐘的棉被魔神，攀爬鬧鐘塔粉碎睡意！',
    themeColor: '#0ea5e9',
    mapCoords: { x: 26, y: 78 },
  },
  {
    index: 5,
    nameZh: '炸雞王座館',
    nameEn: 'Fried-Chicken Throne Gym',
    landmarkKey: 'landmark_chicken_throne',
    bossIndex: 5,
    defaultBossNameZh: '暴食炸雞領主',
    descriptionZh: '金黃酥脆的萬卡霸王，召集全員出勤發動狂暴連攜合擊！',
    themeColor: '#eab308',
    mapCoords: { x: 74, y: 80 },
  },
];

export function getVenueForStage(stage: number): GymVenueInfo {
  const idx = Math.max(0, (stage - 1) % GYM_VENUES.length);
  return GYM_VENUES[idx];
}

export function getFloorForStage(stage: number): number {
  return Math.floor(Math.max(0, stage - 1) / GYM_VENUES.length) + 1;
}

export function getStageForVenueFloor(venueIdx: number, floor: number): number {
  return venueIdx + 1 + Math.max(0, floor - 1) * GYM_VENUES.length;
}

export function getBossForStage(stage: number): AdventureBoss {
  const idx = Math.max(0, (stage - 1) % ADVENTURE_BOSS_CATALOG.length);
  return ADVENTURE_BOSS_CATALOG[idx];
}
