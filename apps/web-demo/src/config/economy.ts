/**
 * FitMon 經濟數值與參數配置 (T1 經濟數字定版)
 *
 * 依據 T1 工單「經濟數字定版」章節（2026-11-13 更新）：
 * A) 已核准（YuChien 經幕僚長轉達，作為起始數字，試玩後再調）
 * B) 產品提案（YuChien 同意先做進 Demo 試玩，未逐項確認）
 * C) 未定
 */

// ============================================================================
// A) 已核准（YuChien 經幕僚長轉達，作為起始數字，試玩後再調）
// ============================================================================

/** 每天打卡固定獲得 100 XP，任何活動都算，不處罰 */
export const CHECKIN_XP = 100;

/** 每天打卡固定獲得 70 遊戲幣（受每日上限限制） */
export const CHECKIN_COINS = 70;

/** 房間互動固定獲得 10 遊戲幣（受每日上限限制） */
export const ROOM_INTERACT_COINS = 10;

/** 每日科普問答固定獲得 10 遊戲幣（休息日也有，受每日上限限制） */
export const QUIZ_COINS = 10;

/**
 * 每日賺取遊戲幣上限 90 幣。
 * 當雙倍金幣卡（2× coupon）生效期間，每日上限提高為 DAILY_COIN_CAP × DOUBLE_COIN_MULTIPLIER = 180 幣。
 * （cap 於雙倍券生效時套用至翻倍後金額：cap × DOUBLE_COIN_MULTIPLIER）
 */
export const DAILY_COIN_CAP = 90;

/** 雙倍金幣卡加乘倍率 */
export const DOUBLE_COIN_MULTIPLIER = 2;

/**
 * 每週寶箱金幣獎勵：動滿 3 天領取 50 幣＋雙倍金幣卡 ×1。
 * 不計入每日賺幣上限、不受雙倍券加成。
 */
export const WEEKLY_CHEST_COINS = 50;

/**
 * Boss 通關賞金（Stage 1–6）：100 / 130 / 160 / 190 / 220 / 250。
 * 超過第 6 關沿用最後一檔 250 幣。
 * 參與擊破即全額發放，不計入每日賺幣上限、不受雙倍券加成；重打沒有賞金；最後一擊不加幣。
 */
export const BOSS_CLEAR_BOUNTY_BY_STAGE: readonly number[] = [100, 130, 160, 190, 220, 250];

/** 取得指定關卡（Stage 1-based）之通關賞金 */
export function getBossClearBounty(stage: number): number {
  if (stage <= 0) return BOSS_CLEAR_BOUNTY_BY_STAGE[0];
  const idx = Math.min(stage - 1, BOSS_CLEAR_BOUNTY_BY_STAGE.length - 1);
  return BOSS_CLEAR_BOUNTY_BY_STAGE[idx];
}

/** 雙倍金幣卡遊戲幣售價：40 幣（YuChien-approved economy numbers relayed by 幕僚長, still a proposal / YuChien 核准、經幕僚長轉達的經濟數字，仍屬提案） */
export const DOUBLE_COIN_COUPON_COIN_PRICE = 40;

/** BCAA 能量水遊戲幣售價：10 幣 */
export const BCAA_COIN_PRICE = 10;


// ============================================================================
// B) 產品提案（YuChien 同意先做進 Demo 試玩，未逐項確認）
// ============================================================================

/** 升級所需 XP：min(100 * level, 350) */
export const xpToNext = (level: number): number => Math.min(100 * level, 350);

/** 新玩家起始等級 */
export const NEW_PLAYER_START_LEVEL = 1;

/** 傷害倍率：1 天 ×1.0, 2 天 ×1.2, 3+ 天 ×1.4 (上限) */
export const DAMAGE_MULTIPLIER_BY_DAYS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.4,
};

/** 傷害倍率上限 */
export const DAMAGE_MULTIPLIER_CAP = 1.4;

/** 新玩家第一週保底傷害倍率 ×1.2（包含加入日的週一至週日） */
export const ROOKIE_FIRST_WEEK_FLOOR = 1.2;

/** 每日 Boss 出擊次數上限 */
export const BOSS_FIGHTS_PER_DAY = 1;

/** 每週寶箱所需運動天數（不需連續） */
export const WEEKLY_CHEST_DAYS_REQUIRED = 3;

/** 每週寶箱道具獎勵標識：2× 券一張 */
export const WEEKLY_CHEST_REWARD = 'double_coin_card' as const;

/** 體力上限 */
export const STAMINA_MAX = 200;

/** 已通關樓層重打消耗體力 */
export const REPLAY_STAMINA_COST = 50;

/** BCAA 能量水體力回復量 */
export const BCAA_STAMINA_RESTORE = 50;

/** 雙倍金幣卡持續時間 24 小時（毫秒，產品經理提案實作細節） */
export const DOUBLE_COIN_DURATION_MS = 24 * 60 * 60 * 1000;

/** 遊戲幣達每日上限時的文案 */
export const COIN_CAP_REACHED_COPY = '今天的遊戲幣拿滿了';


// ============================================================================
// C) 未定
// ============================================================================

/** 待定，Demo 暫用舊值 - 轉蛋券金幣售價 */
export const GACHA_TICKET_COIN_PRICE = 120;


// ============================================================================
// 實作防護 (Security Safeguards)
// ============================================================================

/** 單次發放金幣上限，防止異常數值注入 */
export const MAX_SINGLE_GRANT = 500;

