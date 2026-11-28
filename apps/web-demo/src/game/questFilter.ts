/**
 * 每日任務過濾純函式 (T7-A1 Milestone 3)
 *
 * 依據 T7-A1 工單第 3 點：
 * 每日任務去重，移除「完成今日運動課表」（q_daily_workout）。
 * 舊存檔仍可能保留此 id，不新增 migration 或升版，
 * 透過本純函式在 UI / 領賞 / 戰鬥 reader 處全面忽略此 id，
 * 使舊存檔表現與新存檔一致。
 */

export const IGNORED_QUEST_ID = 'q_daily_workout' as const;

/**
 * 判定任務是否為可見之有效任務
 */
export function isVisibleQuest(quest: { id: string } | null | undefined): boolean {
  if (!quest || typeof quest !== 'object') return false;
  return quest.id !== IGNORED_QUEST_ID;
}

/**
 * 過濾掉已被廢除之任務（如 q_daily_workout），回傳可見任務清單
 */
export function filterVisibleQuests<T extends { id: string }>(quests: T[] | null | undefined): T[] {
  if (!Array.isArray(quests)) return [];
  return quests.filter(isVisibleQuest);
}
