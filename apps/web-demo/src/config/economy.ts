// T1 第 1 階段提案數字：教練／產品經理／營運提案，YuChien 同意先做進 Demo 試玩，玩過再調

// 提案，試玩後調整 - 每天打卡固定獲得 100 XP，任何活動都算，不處罰
export const CHECKIN_XP = 100;

// 提案，試玩後調整 - 升級所需 XP：min(100 * level, 350)
export const xpToNext = (level: number): number => Math.min(100 * level, 350);

// 提案，試玩後調整 - 新玩家起始等級
export const NEW_PLAYER_START_LEVEL = 1;

// 提案，試玩後調整 - 傷害倍率：1 天 ×1.0, 2 天 ×1.2, 3+ 天 ×1.4 (上限)
export const DAMAGE_MULTIPLIER_BY_DAYS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.4,
};

// 提案，試玩後調整 - 傷害倍率上限
export const DAMAGE_MULTIPLIER_CAP = 1.4;

// 提案，試玩後調整 - 新玩家第一週保底傷害倍率 ×1.2（包含加入日的週一至週日）
export const ROOKIE_FIRST_WEEK_FLOOR = 1.2;

// 提案，試玩後調整 - 每日 Boss 出擊次數上限
export const BOSS_FIGHTS_PER_DAY = 1;

// 提案，試玩後調整 - 體力上限
export const STAMINA_MAX = 200;

// 提案，試玩後調整 - 已通關樓層重打消耗體力
export const REPLAY_STAMINA_COST = 50;

// 提案，試玩後調整 - BCAA 能量水金幣售價
export const BCAA_COIN_PRICE = 10;

// 提案，試玩後調整 - BCAA 能量水體力回復量
export const BCAA_STAMINA_RESTORE = 50;

// 提案，試玩後調整 - 每日賺取遊戲幣上限
export const DAILY_COIN_CAP = 90;

// 提案，試玩後調整 - 遊戲幣達每日上限時的文案
export const COIN_CAP_REACHED_COPY = '今天的遊戲幣拿滿了';

// 提案，試玩後調整 - 每週寶箱所需運動天數（不需連續）
export const WEEKLY_CHEST_DAYS_REQUIRED = 3;

// 提案，試玩後調整 - 每週寶箱獎勵：2× 券一張
export const WEEKLY_CHEST_REWARD = 'double_coin_card' as const;

// 提案，試玩後調整 - 雙倍金幣卡加乘倍率
export const DOUBLE_COIN_MULTIPLIER = 2;

// 提案，試玩後調整 - 雙倍金幣卡持續時間 24 小時（毫秒）
export const DOUBLE_COIN_DURATION_MS = 24 * 60 * 60 * 1000;

// TODO 價格待營運提出（佔位） // 提案，試玩後調整 - 雙倍金幣卡金幣售價
export const DOUBLE_COIN_COUPON_COIN_PRICE = 100;
