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
        className={`inline-flex min-h-[44px] min-w-0 max-w-full items-center justify-center p-0 bg-transparent border-0 cursor-pointer transition-transform active:scale-95 ${className}`}
      >
        <span
          style={{
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '3px 6px',
          }}
          className="inline-flex max-w-full items-center gap-[2px] rounded-full border border-dashed border-amber-500/50 bg-amber-50/90 text-[11px] font-black text-amber-900 shadow-sm hover:bg-amber-100 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          <UserPlus className="h-3 w-3 text-amber-700 shrink-0" />
          <span className="truncate min-w-0 whitespace-nowrap">{emptyLabel}</span>
        </span>
      </button>
    );
  }

  const stats = calculateMemberStats(member);
  const worked = member.hasWorkedOutToday;

  if (variant === 'attendance') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] shadow-sm ${
          worked
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
            : 'bg-amber-100 text-amber-950 border border-amber-400 font-black'
        } ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
      >
        {worked ? (
          <>
            <Check className="h-4 w-4 stroke-[2.5] text-emerald-700" />
            <span>今日已運動 ✓</span>
          </>
        ) : (
          <>
            <span className="font-mono text-[12px] font-black text-amber-950">Zzz</span>
            <span className="font-black text-amber-950">今日未運動</span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'damage') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-black shadow-sm bg-rose-100 text-rose-800 border border-rose-300 ${
          onClick ? 'cursor-pointer active:scale-95' : ''
        } ${className}`}
      >
        <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
        <span className="font-mono">
          {member.damageDealt > 0 ? `-${member.damageDealt} HP` : '0 HP 貢獻'}
        </span>
      </div>
    );
  }

  // variant === 'combined' (Compact chip: text 11px, padding 3px 6px, icon 12px, gap 2px)
  const hasDamage = worked && member.damageDealt > 0;
  let text = '';
  if (worked) {
    if (member.damageDealt > 0) {
      text = `-${member.damageDealt} HP`;
    } else {
      text = stats.mainAtkLabel.replace(' ', '');
    }
  } else {
    text = '還沒動';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`隊友狀態：${member.nameZh} ${worked ? text : '💤 還沒動'}`}
      className={`inline-flex min-h-[44px] min-w-0 max-w-full items-center justify-center p-0 bg-transparent border-0 cursor-pointer transition-transform active:scale-95 ${className}`}
    >
      <span
        style={{
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          padding: '3px 6px',
        }}
        className={`inline-flex max-w-full items-center gap-[2px] rounded-full border px-[6px] py-[3px] text-[11px] shadow-sm whitespace-nowrap overflow-hidden text-ellipsis ${
          worked
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold hover:bg-emerald-200/80'
            : 'bg-amber-100 text-amber-950 border-amber-400 font-black hover:bg-amber-200/80'
        }`}
      >
        {!worked && (
          <span className="text-[12px] leading-none shrink-0" aria-hidden="true">
            💤
          </span>
        )}
        {worked && !hasDamage && (
          <Check className="h-3 w-3 stroke-[2.5] text-emerald-700 shrink-0" />
        )}
        <span className={`truncate min-w-0 font-black ${worked ? 'font-mono' : ''}`}>{text}</span>
      </span>
    </button>
  );
};
