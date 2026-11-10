import React from 'react';
import { SquadMemberState, resolveSquadMemberAvatar, useGameStore } from '../../stores/useGameStore';
import { AvatarPortraitCanvas } from '../../game/AvatarPortraitCanvas';
import { ItemSpriteThumbnail } from '../../game/ItemSpriteThumbnail';
import { calculateMemberStats, EQUIP_SLOTS_ORDER, getCosmeticItem } from './memberStats';
import { usePrefersReducedMotion } from '../../features/adventure/battle/usePrefersReducedMotion';

interface TeammatePeekCardProps {
  member: SquadMemberState;
  onClose?: () => void;
  className?: string;
}

export const TeammatePeekCard: React.FC<TeammatePeekCardProps> = ({
  member,
  onClose,
  className = '',
}) => {
  const store = useGameStore();
  const reducedMotion = usePrefersReducedMotion();
  const stats = calculateMemberStats(member);
  const worked = member.hasWorkedOutToday;
  const avatar = resolveSquadMemberAvatar(member);

  // Equipment icons (up to 5 items, each 24px)
  const equippedItems = EQUIP_SLOTS_ORDER.map(({ slot }) => {
    const itemId = member.equipped?.[slot] || avatar.equipped?.[slot];
    return itemId ? getCosmeticItem(itemId) : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div
      role="region"
      aria-label={`隊友快速預覽：${member.nameZh}`}
      onClick={(e) => {
        // Prevent click inside card from bubbling to canvas empty area
        e.stopPropagation();
      }}
      className={`retro-box pointer-events-auto absolute bottom-2.5 left-2.5 z-20 flex w-[52%] max-w-[210px] flex-col rounded-2xl border-2 border-[#e5dccb] bg-[#fffdfa]/95 p-2.5 shadow-lg backdrop-blur-sm transition-all duration-160 ease-out ${
        reducedMotion ? 'animate-fade-in' : 'animate-peek-card'
      } ${className}`}
      style={{
        maxHeight: '34%',
      }}
    >
      {/* Top Header: 64x64 Portrait + Nickname */}
      <div className="flex items-center gap-2">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm">
          <AvatarPortraitCanvas
            bodyStage={avatar.bodyStage}
            equipped={avatar.equipped}
            status={avatar.status}
            size={56}
          />
          <span className="absolute left-1 top-0.5 text-[10px]" aria-hidden="true">
            🍁
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-black text-[#29221e]">
            {member.nameZh.split('·')[1]?.trim() || member.nameZh}
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="inline-block rounded bg-amber-100 px-1 py-0.2 text-[9px] font-black text-amber-800">
              {member.roleBadgeZh || '隊友'}
            </span>
            {avatar.status === 'syncing' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const success = store.refreshSquadMemberAvatar(member.id);
                  if (success) store.showToast('✅ 已更新造型快取！');
                  else store.showToast('⏳ 仍在同步最新造型資料');
                }}
                className="rounded border border-amber-400 bg-amber-100 px-1 py-0.2 text-[9px] font-black text-amber-950 active:scale-95"
              >
                同步重整
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Row: Up to 5 icons, 24px */}
      {equippedItems.length > 0 && (
        <div className="mt-2 flex items-center gap-1 overflow-x-auto py-0.5">
          {equippedItems.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-[#e5dccb] bg-amber-50/60 shadow-xs"
              title={`${item.nameZh} (${item.combatStat?.labelZh || ''})`}
            >
              <ItemSpriteThumbnail item={item} size={24} />
            </div>
          ))}
        </div>
      )}

      {/* Stats Row: 2-3 stats (damage, attack, today status) */}
      <div className="mt-2 space-y-1 border-t border-[#e5dccb]/70 pt-1.5 text-[10px]">
        <div className="flex items-center justify-between font-mono font-bold">
          <span className="text-muted-foreground flex items-center gap-0.5">
            <span>🥊</span>
            <span>{stats.mainAtkLabel}</span>
          </span>
          <span className="font-black text-rose-600">
            {member.damageDealt > 0 ? `-${member.damageDealt} HP` : '0 HP'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-muted-foreground">今日狀態</span>
          {worked ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-800">
              ✓ 今日已運動
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-950 border border-amber-400">
              Zzz 未運動
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
