/**
 * FitMon 經濟數值與系統參數配置表 (Config-Driven Economy & Brand Decoupling)
 * 未來調整商品定價、體力消耗、金幣產出或更換品牌名稱時，僅需修改此檔案。
 */

import { GACHA_TICKET_COIN_PRICE } from './economy';

export const BRAND_CONFIG = {
  appName: 'FitMon',
  appSubtitleZh: '像素健身養成 × 運動科學社群',
  appSubtitleEn: 'Pixel Gym Companion & Fitness Social',
  version: 'v1.0.0-mvp',
};

export const ECONOMY_CONFIG = {
  // 新手初始資源
  ftueStarterCoins: 350,

  // 基礎打卡與任務獎勵
  coinsPerValidSet: 5,        // 每完成一組即時掉落基礎金幣
  dailyWorkoutQuestCoins: 50, // 完成一次運動打卡任務
  dailyTipQuestCoins: 20,     // 廣場打賞或送水任務
  dailyMemeQuestCoins: 30,    // 製作或分享一張 Meme 拍貼任務

  // 社群互動消費
  tipSingleCoinCost: 10,      // 單次打賞好友貼文
  giftEnergyDrinkCost: 20,    // 贈送好友能量水

  // 連續運動暴擊
  streak3DayBonus: 50,
  streak7DayBonus: 200,

  // 扭蛋機價格
  gachaSingleCoinCost: GACHA_TICKET_COIN_PRICE,
};

export type Locale = 'zh-TW' | 'en';

export const I18N: Record<Locale, Record<string, string>> = {
  'zh-TW': {
    tabHome: '房間',
    tabWorkout: '運動',
    tabShop: '商城',
    tabPlaza: '冒險',
    tabAnalytics: '我的',
    staminaLabel: '體力',
    coinsLabel: '金幣',
    streakLabel: '連勝',
    freeLogPromise: '⚡ 體力僅影響金幣掉落，運動日誌與 PR 永遠 100% 免費無上限記錄！',
  },
  'en': {
    tabHome: 'Room',
    tabWorkout: 'Workout',
    tabShop: 'Shop',
    tabPlaza: 'Adventure',
    tabAnalytics: 'Me',
    staminaLabel: 'Stamina',
    coinsLabel: 'Coins',
    streakLabel: 'Streak',
    freeLogPromise: '⚡ Stamina only affects coin drops. Workout logging & PRs are 100% FREE forever!',
  },
};
