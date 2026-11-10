import { AVATAR_ITEMS, CosmeticItem, EquipSlot } from '../../config/catalogConfig';
import { SquadMemberState } from '../../stores/useGameStore';

export const EQUIP_SLOTS_ORDER: { slot: EquipSlot; labelZh: string }[] = [
  { slot: 'hair', labelZh: '頭髮' },
  { slot: 'face', labelZh: '臉部' },
  { slot: 'top', labelZh: '上衣' },
  { slot: 'bottom', labelZh: '下裝' },
  { slot: 'accessory', labelZh: '手持' },
];

export function getCosmeticItem(itemId?: string): CosmeticItem | null {
  if (!itemId) return null;
  return AVATAR_ITEMS.find((c: CosmeticItem) => c.id === itemId) || null;
}

export interface MemberCombatStats {
  phyAtk: number;
  magAtk: number;
  supportAtk: number;
  mainAtk: number;
  mainAtkLabel: string;
  damageDealt: number;
  hasWorkedOutToday: boolean;
}

export function calculateMemberStats(member: SquadMemberState): MemberCombatStats {
  let phyBonus = 0;
  let magBonus = 0;
  let supportBonus = 0;

  const equipped = member.equipped;
  if (equipped) {
    (Object.keys(equipped) as EquipSlot[]).forEach((slot) => {
      const itemId = equipped[slot];
      if (!itemId) return;
      const item = AVATAR_ITEMS.find((c: CosmeticItem) => c.id === itemId);
      if (item?.combatStat) {
        if (item.combatStat.type === 'phy') phyBonus += item.combatStat.value;
        if (item.combatStat.type === 'mag') magBonus += item.combatStat.value;
        if (item.combatStat.type === 'support') supportBonus += item.combatStat.value;
      }
    });
  }

  const phyAtk = 20 + phyBonus;
  const magAtk = 10 + magBonus;
  const supportAtk = 10 + supportBonus;

  let mainAtk = phyAtk;
  let mainAtkLabel = `物攻 ${phyAtk}`;
  if (member.roleType === 'mag') {
    mainAtk = magAtk;
    mainAtkLabel = `魔攻 ${magAtk}`;
  } else if (member.roleType === 'support') {
    mainAtk = supportAtk;
    mainAtkLabel = `輔助 ${supportAtk}`;
  }

  return {
    phyAtk,
    magAtk,
    supportAtk,
    mainAtk,
    mainAtkLabel,
    damageDealt: member.damageDealt,
    hasWorkedOutToday: member.hasWorkedOutToday,
  };
}

export interface TeammateHitRect {
  memberId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
