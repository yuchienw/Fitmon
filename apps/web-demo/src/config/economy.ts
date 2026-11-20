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


// ============================================================================
// D) 社群隱私、解鎖門檻與速率限制配置 (T3-D3 資安 11/20)
// ============================================================================

/** 成人預設好友／組隊邀請來源：'everyone' | 'friends'；YuChien may change this default */
export const DEFAULT_ADULT_INVITE_FROM = 'everyone' as const; // 「所有人（知道我玩家代碼的人）」; YuChien may change this default

/** 成人預設是否能以玩家代碼被搜尋 */
export const DEFAULT_ADULT_DISCOVERABLE_BY_CODE = true;

/** 未成年帳號鎖定隱私設定：僅限好友、不可被代碼搜尋 */
export const MINOR_PRIVACY = {
  inviteFrom: 'friends' as const,
  discoverableByCode: false,
} as const;

/** 新帳號判定時間窗口：7 天（毫秒） */
export const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 資安 11/20 社群邀請與搜尋速率限制設定 (SOCIAL_RATE_LIMITS)
 * 注意：僅作設定項常數配置，試玩版暫不強制阻擋（試玩版目前未實作帳號年齡，後續正式版再行執法）。
 */
export const SOCIAL_RATE_LIMITS = {
  /** 新帳號判定窗口（7 天，毫秒） */
  newAccountWindowMs: NEW_ACCOUNT_WINDOW_MS,

  /** 組隊邀請限制：每日 20 則（其中非好友 10 則）；單人冷卻 72 小時且 7 天內最多 3 次 */
  squadInvite: {
    maxPerDay: 20,
    maxNonFriendPerDay: 10,
    perPersonCooldownMs: 72 * 60 * 60 * 1000,
    maxPerPersonPer7Days: 3,
    window7DaysMs: 7 * 24 * 60 * 60 * 1000,
  },

  /** 好友請求限制：每日 20 則；略過後冷卻 7 天 */
  friendRequest: {
    maxPerDay: 20,
    skipCooldownMs: 7 * 24 * 60 * 60 * 1000,
  },

  /** 代碼搜尋限制：每分鐘 5 次、每日 30 次 */
  codeLookup: {
    maxPerMinute: 5,
    maxPerDay: 30,
    minuteWindowMs: 60 * 1000,
    dayWindowMs: 24 * 60 * 60 * 1000,
  },

  /** 新帳號（7 天內）每日限額：組隊 3、好友 5、代碼搜尋 10 */
  newAccount: {
    squadInviteDailyMax: 3,
    friendRequestDailyMax: 5,
    codeLookupDailyMax: 10,
  },
} as const;

export interface UnlockThreshold {
  id: string;
  days: number;
}

/** 動作解鎖門檻（固定：3, 7, 14 天） */
export const POSE_UNLOCK_THRESHOLDS: readonly UnlockThreshold[] = [
  { id: 'pose_unlock_3d', days: 3 },
  { id: 'pose_unlock_7d', days: 7 },
  { id: 'pose_unlock_14d', days: 14 },
];

/** 套裝解鎖門檻（固定：5, 15, 30 天） */
export const OUTFIT_UNLOCK_THRESHOLDS: readonly UnlockThreshold[] = [
  { id: 'outfit_unlock_5d', days: 5 },
  { id: 'outfit_unlock_15d', days: 15 },
  { id: 'outfit_unlock_30d', days: 30 },
];

/** 根據有效打卡天數計算符合解鎖資格之項目清單 */
export function unlockedIdsForDays(
  thresholds: readonly UnlockThreshold[],
  days: number
): string[] {
  if (typeof days !== 'number' || days <= 0) return [];
  return thresholds
    .filter((t) => days >= t.days)
    .map((t) => t.id);
}


