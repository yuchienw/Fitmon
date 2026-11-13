/**
 * FitMon Pure Economy Rules & Calculations (Future RPC Simulation)
 *
 * All state modifications related to T1 check-in, boss attack, replays, coins, and stamina
 * are implemented as pure functions taking (state snapshot, intent, now) and returning
 * { ok, reason?, patch?, result? }.
 * The UI and store actions must not compute XP/damage/coins themselves.
 */

import {
  CHECKIN_XP,
  xpToNext,
  DAMAGE_MULTIPLIER_BY_DAYS,
  ROOKIE_FIRST_WEEK_FLOOR,
  STAMINA_MAX,
  REPLAY_STAMINA_COST,
  BCAA_COIN_PRICE,
  BCAA_STAMINA_RESTORE,
  DAILY_COIN_CAP,
  WEEKLY_CHEST_DAYS_REQUIRED,
  WEEKLY_CHEST_REWARD,
  DOUBLE_COIN_MULTIPLIER,
  DOUBLE_COIN_DURATION_MS,
  DOUBLE_COIN_COUPON_COIN_PRICE,
} from '../config/economy';
import {
  getLocalDayKey,
  getWeekKey,
  getWeekDayKeys,
  getNextResetAt,
} from './day';
import {
  ADVENTURE_BOSS_CATALOG,
  AVATAR_ITEMS,
  CONSUMABLE_ITEMS,
  EquipSlot,
} from '../config/catalogConfig';

// ================= TYPES =================

export type CheckinActivityType = '重訓' | '散步' | '瑜珈' | '球類' | '自訂';
export type CheckinIntensity = '輕鬆' | '中等' | '喘喘';

export interface CheckinAnnotation {
  type?: CheckinActivityType;
  customText?: string;
  minutes?: number;
  intensity?: CheckinIntensity;
}

export interface CheckinLogEntry {
  dayKey: string;
  timestamp: number;
  annotation?: CheckinAnnotation;
}

export interface CheckinResultData {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  expBefore: number;
  expAfter: number;
  xpToNextBefore: number;
  xpToNextAfter: number;
  leveledUp: boolean;
  daysThisWeek: number;
  damageMultiplier: number;
  isRookieFloor: boolean;
}

export interface CheckinStateSnapshot {
  lastCheckinDate: string | null;
  checkinDayKeys: string[];
  level: number;
  exp: number;
  joinDayKey: string;
  checkinLogs?: CheckinLogEntry[];
}

export interface CheckinRuleResult {
  ok: boolean;
  reason?: 'already_checked_in';
  patch?: {
    lastCheckinDate: string;
    checkinDayKeys: string[];
    level: number;
    exp: number;
    checkinLogs: CheckinLogEntry[];
  };
  result?: CheckinResultData;
}

export interface DamageInfoResult {
  daysThisWeek: number;
  damageMultiplier: number;
  multiplierTier: '1' | '2' | '3+';
  isRookieFloor: boolean;
}

export const COIN_SOURCE_WHITELIST = [
  'quest',
  'quiz',
  'boss',
  'achievement',
  'chest',
  'workout',
] as const;

export type CoinSource = typeof COIN_SOURCE_WHITELIST[number];

export interface GrantCoinsResult {
  granted: number;
  capReached: boolean;
}

export interface GrantCoinsStateSnapshot {
  coins: number;
  coinsEarnedToday: number;
  coinsEarnedDayKey: string | null;
  doubleCoinUntil: number;
}

export interface GrantCoinsRuleResult {
  ok: boolean;
  patch: {
    coins: number;
    coinsEarnedToday: number;
    coinsEarnedDayKey: string;
  };
  result: GrantCoinsResult;
}

export interface BossAttackResult {
  damage: number;
  isCrit: boolean;
  defeated: boolean;
  attackTypeLabel: string;
  droppedLootName?: string;
  damageMultiplier: number;
  coinsGranted: number;
  capReached: boolean;
  nextResetAt: number;
}

export interface BossAttackStateSnapshot {
  lastCheckinDate: string | null;
  lastBossDate: string | null;
  checkinDayKeys: string[];
  joinDayKey: string;
  soloStage: number;
  soloBossHp: number;
  squadStage: number;
  squadBossHp: number;
  equipped: Record<EquipSlot, string>;
  quests: { progress: number; target: number }[];
  streakDays: number;
  todaySportType: 'strength' | 'cardio' | 'bodyweight';
  activeTeamComboBuff: 'none' | 'armor_break' | 'burn_mark' | 'crit_aura';
  squadMembers: { hasWorkedOutToday: boolean; isSuspectedCheater?: boolean }[];
  collectedBossLoots: string[];
  devForceNextLootDrop: boolean;
  personalMaxStage: number;
  squadMaxStage: number;
  personalMaxDamage: number;
  totalBossesDefeated: number;
  totalFinalBlows: number;
  totalStrikesCount: number;
  totalDamageDealt: number;
  coins: number;
  coinsEarnedToday: number;
  coinsEarnedDayKey: string | null;
  doubleCoinUntil: number;
}

export type BossAttackPatch = {
  lastBossDate: string;
  personalMaxDamage: number;
  totalStrikesCount: number;
  totalDamageDealt: number;
  activeTeamComboBuff: 'none' | 'armor_break' | 'burn_mark' | 'crit_aura';
  collectedBossLoots: string[];
  devForceNextLootDrop: boolean;
  coins: number;
  coinsEarnedToday: number;
  coinsEarnedDayKey: string;
  soloStage?: number;
  soloBossHp?: number;
  personalMaxStage?: number;
  totalBossesDefeated?: number;
  totalFinalBlows?: number;
  squadStage?: number;
  squadBossHp?: number;
  squadMaxStage?: number;
};

export interface BossAttackRuleResult {
  ok: boolean;
  reason?: 'not_checked_in' | 'boss_done_today';
  patch?: BossAttackPatch;
  result?: BossAttackResult;
}

export interface ReplayFloorStateSnapshot {
  stamina: number;
  soloStage: number;
  squadStage: number;
}

export interface ReplayFloorRuleResult {
  ok: boolean;
  reason?: 'not_cleared' | 'insufficient_stamina';
  stamina?: number;
  required?: number;
  patch?: {
    stamina: number;
  };
  result?: {
    cosmeticDamage: number;
  };
}

// ================= FUNCTIONS =================

/**
 * 2. getDamageInfo
 * Computes weekly damage multiplier and whether rookie floor applies.
 */
export function getDamageInfo(
  state: {
    checkinDayKeys: string[];
    joinDayKey: string;
  },
  now: Date | number = Date.now()
): DamageInfoResult {
  const todayKey = getLocalDayKey(now);
  const currentWeekDays = getWeekDayKeys(todayKey);
  const checkinSet = new Set(state.checkinDayKeys || []);
  const daysThisWeek = currentWeekDays.filter((k) => checkinSet.has(k)).length;

  let damageMultiplier = DAMAGE_MULTIPLIER_BY_DAYS[1]; // 1.0
  let multiplierTier: '1' | '2' | '3+' = '1';

  if (daysThisWeek >= 3) {
    damageMultiplier = DAMAGE_MULTIPLIER_BY_DAYS[3]; // 1.4
    multiplierTier = '3+';
  } else if (daysThisWeek === 2) {
    damageMultiplier = DAMAGE_MULTIPLIER_BY_DAYS[2]; // 1.2
    multiplierTier = '2';
  } else {
    damageMultiplier = DAMAGE_MULTIPLIER_BY_DAYS[1]; // 1.0
    multiplierTier = '1';
  }

  // Rookie floor applies when today's week == week of joinDayKey and computed multiplier < 1.2
  const currentWeekKey = getWeekKey(todayKey);
  const joinWeekKey = getWeekKey(state.joinDayKey || todayKey);
  const isRookieWeek = currentWeekKey === joinWeekKey;
  let isRookieFloor = false;

  if (isRookieWeek && damageMultiplier < ROOKIE_FIRST_WEEK_FLOOR) {
    damageMultiplier = ROOKIE_FIRST_WEEK_FLOOR;
    isRookieFloor = true;
  }

  return {
    daysThisWeek,
    damageMultiplier,
    multiplierTier,
    isRookieFloor,
  };
}

/**
 * 1. checkin
 * Fixed +100 XP, level-up loop, lightweight log.
 */
export function checkin(
  state: CheckinStateSnapshot,
  intent: { annotation?: CheckinAnnotation } = {},
  now: Date | number = Date.now()
): CheckinRuleResult {
  const today = getLocalDayKey(now);
  if (state.lastCheckinDate === today) {
    return { ok: false, reason: 'already_checked_in' };
  }

  const levelBefore = state.level;
  const expBefore = state.exp;
  const xpToNextBefore = xpToNext(levelBefore);

  let currentLevel = levelBefore;
  let currentExp = expBefore + CHECKIN_XP;

  while (currentExp >= xpToNext(currentLevel)) {
    currentExp -= xpToNext(currentLevel);
    currentLevel += 1;
  }

  const levelAfter = currentLevel;
  const expAfter = currentExp;
  const xpToNextAfter = xpToNext(levelAfter);
  const leveledUp = levelAfter > levelBefore;

  const nextCheckinDayKeys = [
    ...(state.checkinDayKeys || []).filter((k) => k !== today),
    today,
  ].slice(-21);

  const damageInfo = getDamageInfo(
    {
      checkinDayKeys: nextCheckinDayKeys,
      joinDayKey: state.joinDayKey,
    },
    now
  );

  const nowMs = typeof now === 'number' ? now : now.getTime();
  const newLog: CheckinLogEntry = {
    dayKey: today,
    timestamp: nowMs,
    annotation: intent.annotation,
  };
  const nextCheckinLogs = [newLog, ...(state.checkinLogs || [])].slice(0, 30);

  const patch = {
    lastCheckinDate: today,
    checkinDayKeys: nextCheckinDayKeys,
    level: levelAfter,
    exp: expAfter,
    checkinLogs: nextCheckinLogs,
  };

  const result: CheckinResultData = {
    xpGained: CHECKIN_XP,
    levelBefore,
    levelAfter,
    expBefore,
    expAfter,
    xpToNextBefore,
    xpToNextAfter,
    leveledUp,
    daysThisWeek: damageInfo.daysThisWeek,
    damageMultiplier: damageInfo.damageMultiplier,
    isRookieFloor: damageInfo.isRookieFloor,
  };

  return { ok: true, patch, result };
}

/**
 * 7. grantCoins
 * Whitelist check, 2x coupon check, daily cap clamping.
 */
export function grantCoins(
  state: GrantCoinsStateSnapshot,
  intent: { amount: number; source: CoinSource },
  now: Date | number = Date.now()
): GrantCoinsRuleResult {
  if (!COIN_SOURCE_WHITELIST.includes(intent.source)) {
    throw new Error(`Unauthorized coin source: ${intent.source}`);
  }

  const todayKey = getLocalDayKey(now);
  const nowMs = typeof now === 'number' ? now : now.getTime();

  // Reset earned coins if day key changed
  const earnedSoFar = state.coinsEarnedDayKey === todayKey ? state.coinsEarnedToday || 0 : 0;
  const isDouble = state.doubleCoinUntil > nowMs;
  const effectiveAmount = isDouble ? intent.amount * DOUBLE_COIN_MULTIPLIER : intent.amount;

  const capacityLeft = Math.max(0, DAILY_COIN_CAP - earnedSoFar);
  const granted = Math.min(effectiveAmount, capacityLeft);
  const newEarnedToday = earnedSoFar + granted;
  const capReached = newEarnedToday >= DAILY_COIN_CAP;

  return {
    ok: true,
    patch: {
      coins: state.coins + granted,
      coinsEarnedToday: newEarnedToday,
      coinsEarnedDayKey: todayKey,
    },
    result: {
      granted,
      capReached,
    },
  };
}

/**
 * 3. bossAttack
 * Requires checkin today, boss not done today, multiplies damage by damageMultiplier,
 * routes reward through grantCoins.
 */
export function bossAttack(
  state: BossAttackStateSnapshot,
  intent: { mode: 'solo' | 'squad' },
  now: Date | number = Date.now()
): BossAttackRuleResult {
  const today = getLocalDayKey(now);

  if (state.lastCheckinDate !== today) {
    return { ok: false, reason: 'not_checked_in' };
  }
  if (state.lastBossDate === today) {
    return { ok: false, reason: 'boss_done_today' };
  }

  const mode = intent.mode;
  const stageNum = mode === 'solo' ? state.soloStage : state.squadStage;
  const bossIndex = (stageNum - 1) % ADVENTURE_BOSS_CATALOG.length;
  const boss = ADVENTURE_BOSS_CATALOG[bossIndex];

  // Gear attribute calculations
  const equippedIds = Object.values(state.equipped || {});
  let phyBonus = 0;
  let magBonus = 0;
  equippedIds.forEach((id) => {
    const item = AVATAR_ITEMS.find((a) => a.id === id);
    if (item?.combatStat) {
      if (item.combatStat.type === 'phy') phyBonus += item.combatStat.value;
      if (item.combatStat.type === 'mag') magBonus += item.combatStat.value;
    }
  });

  // Base attack from quests and streak
  const completedQuests = (state.quests || []).filter((q) => q.progress >= q.target).length;
  const baseDmg = 340 + completedQuests * 60 + (state.streakDays || 0) * 25;

  let isWeaknessHit = false;
  let attackTypeLabel = '🥊 物理重擊';
  let rawDmg = baseDmg + phyBonus * 4 + magBonus * 4;
  let nextComboBuff = state.activeTeamComboBuff;
  let lootChanceBoost = 1.0;

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
  const allSquadAttended = (state.squadMembers || []).every(
    (m) => m.hasWorkedOutToday && !m.isSuspectedCheater
  );
  if (mode === 'squad' && allSquadAttended) {
    rawDmg = Math.round(rawDmg * 1.5);
    isWeaknessHit = true;
    attackTypeLabel = '🔥 全員真運動狂暴合擊';
  }

  // Multiply by damageMultiplier
  const damageInfo = getDamageInfo(state, now);
  const rawWithMultiplier = Math.round(rawDmg * damageInfo.damageMultiplier);
  const finalDamage = Math.max(280, rawWithMultiplier);
  const newMaxDmg = Math.max(state.personalMaxDamage || 0, finalDamage);

  // Hidden Loot drop roll
  let droppedLootName: string | undefined;
  const alreadyHasLoot = (state.collectedBossLoots || []).includes(boss.hiddenLoot.id);
  const dropRoll = Math.random();
  const isGuaranteedByCheat = state.devForceNextLootDrop;
  if (isGuaranteedByCheat || (!alreadyHasLoot && dropRoll < 0.18 * lootChanceBoost)) {
    droppedLootName = `${boss.hiddenLoot.emoji} ${boss.hiddenLoot.nameZh}`;
  }

  const updatedLoots =
    droppedLootName && !alreadyHasLoot
      ? [...(state.collectedBossLoots || []), boss.hiddenLoot.id]
      : state.collectedBossLoots || [];

  const currentHp = mode === 'solo' ? state.soloBossHp : state.squadBossHp;
  const remaining = currentHp - finalDamage;
  const defeated = remaining <= 0;

  let coinsGranted = 0;
  let capReached = false;
  let coinsPatch: { coins: number; coinsEarnedToday: number; coinsEarnedDayKey: string } = {
    coins: state.coins,
    coinsEarnedToday: state.coinsEarnedToday,
    coinsEarnedDayKey: state.coinsEarnedDayKey || today,
  };

  if (defeated) {
    const coinRes = grantCoins(
      {
        coins: state.coins,
        coinsEarnedToday: state.coinsEarnedToday,
        coinsEarnedDayKey: state.coinsEarnedDayKey,
        doubleCoinUntil: state.doubleCoinUntil,
      },
      { amount: boss.rewardCoins, source: 'boss' },
      now
    );
    coinsGranted = coinRes.result.granted;
    capReached = coinRes.result.capReached;
    coinsPatch = coinRes.patch;
  }

  const patch: BossAttackPatch = {
    lastBossDate: today,
    personalMaxDamage: newMaxDmg,
    totalStrikesCount: (state.totalStrikesCount || 0) + 1,
    totalDamageDealt: (state.totalDamageDealt || 0) + finalDamage,
    activeTeamComboBuff: nextComboBuff,
    collectedBossLoots: updatedLoots,
    devForceNextLootDrop: false,
    ...coinsPatch,
  };

  if (mode === 'solo') {
    if (defeated) {
      const nextStage = state.soloStage + 1;
      const nextBoss = ADVENTURE_BOSS_CATALOG[(nextStage - 1) % ADVENTURE_BOSS_CATALOG.length];
      const scaledHp = Math.round(nextBoss.maxHp * (1 + (nextStage - 1) * 0.25));
      patch.soloStage = nextStage;
      patch.soloBossHp = scaledHp;
      patch.personalMaxStage = Math.max(state.personalMaxStage || 0, nextStage);
      patch.totalBossesDefeated = (state.totalBossesDefeated || 0) + 1;
      patch.totalFinalBlows = (state.totalFinalBlows || 0) + 1;
    } else {
      patch.soloBossHp = remaining;
    }
  } else {
    if (defeated) {
      const nextStage = state.squadStage + 1;
      const nextBoss = ADVENTURE_BOSS_CATALOG[(nextStage - 1) % ADVENTURE_BOSS_CATALOG.length];
      const scaledHp = Math.round(nextBoss.maxHp * 1.8 * (1 + (nextStage - 1) * 0.25));
      patch.squadStage = nextStage;
      patch.squadBossHp = scaledHp;
      patch.squadMaxStage = Math.max(state.squadMaxStage || 0, nextStage);
      patch.totalBossesDefeated = (state.totalBossesDefeated || 0) + 1;
      patch.totalFinalBlows = (state.totalFinalBlows || 0) + 1;
    } else {
      patch.squadBossHp = remaining;
    }
  }

  const result: BossAttackResult = {
    damage: finalDamage,
    isCrit: isWeaknessHit,
    defeated,
    attackTypeLabel,
    droppedLootName,
    damageMultiplier: damageInfo.damageMultiplier,
    coinsGranted,
    capReached,
    nextResetAt: getNextResetAt(now),
  };

  return { ok: true, patch, result };
}

/**
 * 4. replayFloor
 * Replays cleared floors with stamina cost. No coins, XP, loot, or stage progress.
 */
export function replayFloor(
  state: ReplayFloorStateSnapshot,
  intent: { mode: 'solo' | 'squad'; floor: number }
): ReplayFloorRuleResult {
  const currentStage = intent.mode === 'solo' ? state.soloStage : state.squadStage;
  if (intent.floor >= currentStage) {
    return { ok: false, reason: 'not_cleared' };
  }
  if (state.stamina < REPLAY_STAMINA_COST) {
    return {
      ok: false,
      reason: 'insufficient_stamina',
      stamina: state.stamina,
      required: REPLAY_STAMINA_COST,
    };
  }

  const cosmeticDamage = 350 + Math.floor(Math.random() * 50);
  return {
    ok: true,
    patch: {
      stamina: state.stamina - REPLAY_STAMINA_COST,
    },
    result: {
      cosmeticDamage,
    },
  };
}

/**
 * 5. useBcaa
 * Needs bcaa count > 0; restores 50 stamina (capped at STAMINA_MAX).
 */
export function useBcaa(state: {
  stamina: number;
  consumables: Record<string, number>;
}): {
  ok: boolean;
  reason?: 'no_bcaa';
  patch?: {
    stamina: number;
    consumables: Record<string, number>;
  };
} {
  const count = state.consumables.bcaa_water || 0;
  if (count <= 0) {
    return { ok: false, reason: 'no_bcaa' };
  }
  const newStamina = Math.min(STAMINA_MAX, state.stamina + BCAA_STAMINA_RESTORE);
  return {
    ok: true,
    patch: {
      stamina: newStamina,
      consumables: {
        ...state.consumables,
        bcaa_water: count - 1,
      },
    },
  };
}

/**
 * 6. buyWithCoins
 * Buys consumables with coins. Spending is never capped.
 */
export function buyWithCoins(
  state: {
    coins: number;
    consumables: Record<string, number>;
  },
  intent: { itemId: string }
): {
  ok: boolean;
  reason?: 'insufficient_coins' | 'unknown_item';
  patch?: {
    coins: number;
    consumables: Record<string, number>;
  };
} {
  let price = 0;
  if (intent.itemId === 'bcaa_water') {
    price = BCAA_COIN_PRICE;
  } else if (intent.itemId === 'double_coin_card') {
    price = DOUBLE_COIN_COUPON_COIN_PRICE;
  } else if (intent.itemId === 'gacha_ticket') {
    price = 120;
  } else {
    const item = CONSUMABLE_ITEMS.find((c) => c.id === intent.itemId);
    if (item) {
      price = item.priceCoins;
    } else {
      return { ok: false, reason: 'unknown_item' };
    }
  }

  if (state.coins < price) {
    return { ok: false, reason: 'insufficient_coins' };
  }

  return {
    ok: true,
    patch: {
      coins: state.coins - price,
      consumables: {
        ...state.consumables,
        [intent.itemId]: (state.consumables[intent.itemId] || 0) + 1,
      },
    },
  };
}

/**
 * 8. claimWeeklyChest
 * When daysThisWeek >= 3 and not claimed this week: grants one 2x coupon.
 */
export function claimWeeklyChest(
  state: {
    checkinDayKeys: string[];
    joinDayKey: string;
    chestClaimedWeekKey: string | null;
    consumables: Record<string, number>;
  },
  now: Date | number = Date.now()
): {
  ok: boolean;
  reason?: 'not_eligible' | 'already_claimed';
  patch?: {
    chestClaimedWeekKey: string;
    consumables: Record<string, number>;
  };
} {
  const todayKey = getLocalDayKey(now);
  const currentWeekKey = getWeekKey(todayKey);
  const damageInfo = getDamageInfo(state, now);

  if (damageInfo.daysThisWeek < WEEKLY_CHEST_DAYS_REQUIRED) {
    return { ok: false, reason: 'not_eligible' };
  }
  if (state.chestClaimedWeekKey === currentWeekKey) {
    return { ok: false, reason: 'already_claimed' };
  }

  return {
    ok: true,
    patch: {
      chestClaimedWeekKey: currentWeekKey,
      consumables: {
        ...state.consumables,
        [WEEKLY_CHEST_REWARD]: (state.consumables[WEEKLY_CHEST_REWARD] || 0) + 1,
      },
    },
  };
}

/**
 * 9. activateDoubleCoin
 * Consumes one 2x coupon and activates double coin effect for 24 hours.
 */
export function activateDoubleCoin(
  state: {
    doubleCoinUntil: number;
    consumables: Record<string, number>;
  },
  now: Date | number = Date.now()
): {
  ok: boolean;
  reason?: 'no_coupon';
  patch?: {
    doubleCoinUntil: number;
    consumables: Record<string, number>;
  };
} {
  const count = state.consumables.double_coin_card || 0;
  if (count <= 0) {
    return { ok: false, reason: 'no_coupon' };
  }
  const nowMs = typeof now === 'number' ? now : now.getTime();
  return {
    ok: true,
    patch: {
      doubleCoinUntil: nowMs + DOUBLE_COIN_DURATION_MS,
      consumables: {
        ...state.consumables,
        double_coin_card: count - 1,
      },
    },
  };
}
