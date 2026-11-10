import React from 'react';
import { Check, Heart, Sparkles, UserPlus } from 'lucide-react';
import { SquadMemberState } from '../../stores/useGameStore';
import { calculateMemberStats } from './memberStats';

export interface TeammateStatusChipProps {
  member?: SquadMemberState;
  variant?: 'combined' | 'attendance' | 'damage' | 'empty';
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  emptyLabel?: string;
}

export const TeammateStatusChip: React.FC<TeammateStatusChipProps> = ({
  member,
  variant = 'combined',
  onClick,
  className = '',
  emptyLabel = '＋邀請',
}) => {
  if (variant === 'empty' || !member) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="邀請新隊友"
        className={`inline-flex h-[22px] items-center gap-1 rounded-full border border-dashed border-amber-500/50 bg-amber-50/80 px-2 text-[10px] font-black text-amber-900 shadow-sm transition-transform active:scale-95 hover:bg-amber-100 ${className}`}
      >
        <UserPlus className="h-3 w-3 text-amber-700" />
        <span className="whitespace-nowrap">{emptyLabel}</span>
      </button>
    );
  }

  const stats = calculateMemberStats(member);
  const worked = member.hasWorkedOutToday;

  if (variant === 'attendance') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex h-[24px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black shadow-sm ${
          worked
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80'
            : 'bg-amber-100 text-amber-800 border border-amber-300/80'
        } ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
      >
        {worked ? (
          <>
            <Check className="h-3.5 w-3.5 stroke-[2.5] text-emerald-700" />
            <span>今日已運動 ✓</span>
          </>
        ) : (
          <>
            <span className="font-mono text-xs font-bold text-amber-700">Zzz</span>
            <span>今日未運動</span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'damage') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex h-[24px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-black shadow-sm bg-rose-100 text-rose-800 border border-rose-300/80 ${
          onClick ? 'cursor-pointer active:scale-95' : ''
        } ${className}`}
      >
        <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
        <span className="font-mono">
          {member.damageDealt > 0 ? `-${member.damageDealt} HP` : '0 HP 貢獻'}
        </span>
      </div>
    );
  }

  // variant === 'combined' (Default for feet chip: h=22px, <= 8 chars)
  // Format:
  // If worked & has damage: "✓ -451 HP" (≤ 8 chars)
  // If worked & 0 damage: "✓ 物攻110" (≤ 8 chars)
  // If unworked: "未運動 Zzz" (6 chars)
  let text = '';
  if (worked) {
    if (member.damageDealt > 0) {
      text = `-${member.damageDealt} HP`;
    } else {
      text = stats.mainAtkLabel.replace(' ', '');
    }
  } else {
    text = '未運動 Zzz';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`隊友狀態：${member.nameZh} ${text}`}
      className={`inline-flex h-[22px] max-w-[120px] items-center gap-1 rounded-full border px-2 text-[10px] font-black shadow-sm transition-transform active:scale-95 ${
        worked
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200/80'
          : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200/80'
      } ${className}`}
    >
      {worked ? (
        <Check className="h-3 w-3 stroke-[2.5] text-emerald-700 shrink-0" />
      ) : (
        <span className="font-mono text-[9px] font-black text-amber-700 shrink-0">Zzz</span>
      )}
      <span className="truncate font-mono font-black">{text}</span>
    </button>
  );
};
