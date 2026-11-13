import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, Flame, Lock, Sparkles, Swords } from 'lucide-react';
import { AdventureSportSkillType, useGameStore } from '../../../stores/useGameStore';
import { formatResetCountdown } from '../../../game/day';

const SKILLS: {
  id: AdventureSportSkillType;
  short: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'strength', short: '破甲', label: '破甲重擊', Icon: Dumbbell },
  { id: 'cardio', short: '魔焰', label: '燃脂魔焰', Icon: Flame },
  { id: 'bodyweight', short: '暴擊', label: '聚氣暴擊', Icon: Sparkles },
];

interface SkillDeckProps {
  sport: AdventureSportSkillType;
  checkedIn: boolean;
  bossDone: boolean;
  nextResetAt: number;
  busy: boolean;
  onSport: (sport: AdventureSportSkillType) => void;
  onStrike: () => void;
}

export const SkillDeck: React.FC<SkillDeckProps> = ({
  sport,
  checkedIn,
  bossDone,
  nextResetAt,
  busy,
  onSport,
  onStrike,
}) => {
  const store = useGameStore();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [tierTableExpanded, setTierTableExpanded] = useState(false);

  useEffect(() => {
    if (!bossDone) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 10000);
    return () => window.clearInterval(interval);
  }, [bossDone]);

  const damageInfo = store.getDamageInfo(nowMs);
  const activeTier = damageInfo.multiplierTier; // '1' | '2' | '3+'

  return (
    <section
      style={{
        backgroundColor: '#FFFDF8',
        borderTop: '1.5px solid #E5DCCB',
      }}
      className="adventure-skill-deck box-border flex shrink-0 flex-col p-3 space-y-2.5 shadow-lg"
      data-testid="skill-deck"
      aria-label="技能與出擊"
    >
      {/* 1. Skill Type Buttons (破甲 / 魔焰 / 暴擊) */}
      <div className="grid grid-cols-3 gap-2">
        {SKILLS.map((skill) => {
          const active = sport === skill.id;
          const Icon = skill.Icon;
          return (
            <button
              key={skill.id}
              type="button"
              aria-label={skill.label}
              aria-pressed={active}
              onClick={() => onSport(skill.id)}
              style={{
                backgroundColor: active ? '#FFF1E4' : '#FFFFFF',
                borderColor: active ? '#EA580C' : '#E5DCCB',
                color: active ? '#C2410C' : '#29221E',
              }}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl border-[1.5px] transition-all active:scale-95"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-black">{skill.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Pre-battle Damage Line & Expandable Tier Table (4a/4b) */}
      <div
        style={{
          backgroundColor: '#FAF6F0',
          borderColor: '#E5DCCB',
        }}
        className="rounded-xl border p-2.5 transition-all text-left"
      >
        <button
          type="button"
          onClick={() => setTierTableExpanded((v) => !v)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-[#29221E]">
              本週動了 {damageInfo.daysThisWeek} 天，傷害 ×{damageInfo.damageMultiplier.toFixed(1)}
            </span>
            {damageInfo.isRookieFloor && (
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderColor: '#F5C45A',
                }}
                className="px-1.5 py-0.2 rounded-full border text-[9.5px] font-black"
              >
                新手週保底
              </span>
            )}
          </div>
          <span className="text-[#786B63] ml-1">
            {tierTableExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        </button>

        {!tierTableExpanded ? (
          <div className="text-[10px] text-[#786B63] mt-0.5">點這一行可看明細</div>
        ) : (
          <div className="mt-2 pt-2 border-t border-[#E5DCCB] space-y-1">
            <div className="text-[10.5px] font-black text-[#29221E] mb-1">
              本週傷害倍率
            </div>

            {/* 1 天 ×1.0 */}
            <div
              style={{
                backgroundColor: activeTier === '1' ? '#FFF1E4' : 'transparent',
                borderColor: activeTier === '1' ? '#FDBA74' : 'transparent',
              }}
              className="flex items-center justify-between px-2 py-1 rounded-lg border text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#29221E]">1 天</span>
                {activeTier === '1' && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FFF1E4] text-[#C2410C] border border-[#FED7AA] text-[9px] font-black">
                    目前
                  </span>
                )}
              </div>
              <span className="font-mono font-black text-[#29221E]">×1.0</span>
            </div>

            {/* 2 天 ×1.2 */}
            <div
              style={{
                backgroundColor: activeTier === '2' ? '#FFF1E4' : 'transparent',
                borderColor: activeTier === '2' ? '#FDBA74' : 'transparent',
              }}
              className="flex items-center justify-between px-2 py-1 rounded-lg border text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#29221E]">2 天</span>
                {activeTier === '2' && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FFF1E4] text-[#C2410C] border border-[#FED7AA] text-[9px] font-black">
                    目前
                  </span>
                )}
              </div>
              <span className="font-mono font-black text-[#29221E]">×1.2</span>
            </div>

            {/* 3 天以上 ×1.4 (上限) */}
            <div
              style={{
                backgroundColor: activeTier === '3+' ? '#FFF1E4' : 'transparent',
                borderColor: activeTier === '3+' ? '#FDBA74' : 'transparent',
              }}
              className="flex items-center justify-between px-2 py-1 rounded-lg border text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#29221E]">3 天以上</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#F4EFE6] text-[#786B63] border border-[#E5DCCB] text-[9px] font-black">
                  上限
                </span>
                {activeTier === '3+' && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FFF1E4] text-[#C2410C] border border-[#FED7AA] text-[9px] font-black">
                    目前
                  </span>
                )}
              </div>
              <span className="font-mono font-black text-[#29221E]">×1.4</span>
            </div>

            {damageInfo.isRookieFloor && (
              <div className="text-[10px] text-[#786B63] pt-1">
                新手第一週保底 ×1.2，實際倍率由伺服器回傳。
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Action Button (Sortie or Cream Locked State) */}
      {bossDone ? (
        /* Cream disabled state (#F4EFE6 bg, #E5DCCB border, #8A7A6C text) */
        <div
          style={{
            backgroundColor: '#F4EFE6',
            borderColor: '#E5DCCB',
            color: '#8A7A6C',
            boxShadow: '0 3px 0 #E5DCCB',
          }}
          className="rounded-2xl border-[1.5px] p-2.5 text-center select-none"
          data-testid="boss-done-locked"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs font-black">
            <Lock className="w-3.5 h-3.5 text-[#8A7A6C]" />
            <span>今天已出擊，明天 00:00 再來</span>
          </div>
          <div className="text-[11px] font-bold text-[#8A7A6C] mt-0.5">
            {formatResetCountdown(nextResetAt, nowMs)}
          </div>
        </div>
      ) : (
        /* If not checked in, NOT greyed! Normal primary orange button that opens check-in sheet */
        <button
          type="button"
          data-testid="strike-cta"
          onClick={onStrike}
          disabled={busy}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="w-full py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 active:translate-y-0.5 transition cursor-pointer"
        >
          <Swords className="h-4 w-4" aria-hidden="true" />
          <span>出擊</span>
        </button>
      )}
    </section>
  );
};
