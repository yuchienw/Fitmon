import React from 'react';
import { Clock, Dumbbell, Flame, Gem, Lock, Sparkles, Swords, Ticket } from 'lucide-react';
import { AdventureSportSkillType, TodayWorkoutStatus } from '../../../stores/useGameStore';

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
  workoutStatus: TodayWorkoutStatus;
  cooldownSec: number;
  raidTickets: number;
  iapUsedToday: boolean;
  busy: boolean;
  onSport: (sport: AdventureSportSkillType) => void;
  onStrike: () => void;
  onResetTicket: () => void;
  onResetIap: () => void;
}

export const SkillDeck: React.FC<SkillDeckProps> = ({
  sport,
  workoutStatus,
  cooldownSec,
  raidTickets,
  iapUsedToday,
  busy,
  onSport,
  onStrike,
  onResetTicket,
  onResetIap,
}) => {
  const ready = workoutStatus !== 'none' && cooldownSec <= 0;
  return (
    <section
      className="adventure-skill-deck box-border flex shrink-0 flex-col justify-between px-2 py-2"
      data-testid="skill-deck"
      aria-label="技能甲板"
    >
      <div className="grid h-12 grid-cols-3">
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
              className="flex h-12 items-center justify-center"
            >
              <span
                className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                  active
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-muted text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-[9px] font-black leading-none">{skill.short}</span>
              </span>
            </button>
          );
        })}
      </div>
      {workoutStatus === 'none' ? (
        <button
          type="button"
          data-testid="strike-cta"
          onClick={onStrike}
          className="retro-btn flex h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-black text-secondary-foreground"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          先運動
        </button>
      ) : cooldownSec > 0 ? (
        <div className="flex h-12 items-center gap-1.5" data-testid="cooldown-bar">
          <div className="flex h-12 min-w-0 flex-1 items-center justify-between rounded-xl border-2 border-border bg-muted px-3">
            <span className="flex items-center gap-1 text-xs font-black text-foreground">
              <Clock className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              冷卻
            </span>
            <span className="font-mono text-sm font-black text-foreground">{formatCooldown(cooldownSec)}</span>
          </div>
          <button
            type="button"
            onClick={onResetTicket}
            className="retro-btn flex h-12 shrink-0 items-center gap-1 rounded-xl bg-secondary px-2 text-xs font-black text-secondary-foreground"
          >
            <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
            券 {raidTickets}
          </button>
          <button
            type="button"
            onClick={onResetIap}
            disabled={iapUsedToday}
            className={`retro-btn flex h-12 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-black ${
              iapUsedToday
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            <Gem className="h-3.5 w-3.5" aria-hidden="true" />
            {iapUsedToday ? '已用' : '秒解'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="strike-cta"
          onClick={onStrike}
          disabled={busy}
          className={`retro-btn flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-black ${
            workoutStatus === 'cheated_fast'
              ? 'bg-destructive text-white'
              : 'bg-accent text-accent-foreground'
          }`}
        >
          <Swords className="h-5 w-5" aria-hidden="true" />
          {workoutStatus === 'cheated_fast' ? '刮痧' : 'STRIKE'}
        </button>
      )}
      <span className="sr-only">{ready ? '可以出擊' : '目前不能出擊'}</span>
    </section>
  );
};

function formatCooldown(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
