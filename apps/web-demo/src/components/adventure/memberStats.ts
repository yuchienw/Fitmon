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
  damageDealt: number;
  hasWorkedOutToday: boolean;
}

export function calculateMemberStats(member: SquadMemberState): MemberCombatStats {
  if (!member) {
    return {
      damageDealt: 0,
      hasWorkedOutToday: false,
    };
  }

  return {
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
