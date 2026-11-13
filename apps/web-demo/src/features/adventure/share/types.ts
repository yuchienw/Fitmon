import { AdventureBoss, AvatarBodyStage, EquipSlot } from '../../../config/catalogConfig';

export type ShareAspect = '9:16' | '4:5';

export const SHARE_PIXELS: Record<ShareAspect, { width: number; height: number; label: string }> = {
  '9:16': { width: 1080, height: 1920, label: '9:16' },
  '4:5': { width: 1080, height: 1350, label: '4:5' },
};

export interface VictoryPosterData {
  clearedStage?: number;
  stage?: number;
  boss: AdventureBoss;
  finalBlowDamage: number;
  attackTypeLabel: string;
  droppedLootName: string;
}

export interface RareLootPosterData {
  stage: number;
  boss: AdventureBoss;
  strikeDamage: number;
}

export interface PosterSquadRow {
  nameZh: string;
  damageText: string;
  highlight: boolean;
}

export interface PosterIdentity {
  brand: string;
  level: number;
  nickname: string;
  squadName: string;
  bodyStage: AvatarBodyStage;
  equipped: Record<EquipSlot, string>;
  rows: PosterSquadRow[];
}
