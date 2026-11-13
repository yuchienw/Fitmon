import React, { useState } from 'react';
import { ChevronLeft, Dumbbell, Flame, Gift, Menu, Trophy, Users, Wrench, Zap } from 'lucide-react';
import { AdventureBoss } from '../../../config/catalogConfig';

interface BattleHudProps {
  stage: number;
  mode: 'solo' | 'squad';
  boss: AdventureBoss;
  currentHp: number;
  maxHp: number;
  armorBreak: boolean;
  onBackToMap: () => void;
  onOpenSubTab: (tab: 'combat_stats' | 'squad_invite' | 'ladder') => void;
  onOpenLootBag: () => void;
  onOpenDevCheat: () => void;
}

const WEAKNESS = {
  phy: { label: '物攻', Icon: Dumbbell },
  mag: { label: '魔攻', Icon: Flame },
  balanced: { label: '協同', Icon: Zap },
} as const;

export const BattleHud: React.FC<BattleHudProps> = ({
  stage,
  mode,
  boss,
  currentHp,
  maxHp,
  armorBreak,
  onBackToMap,
  onOpenSubTab,
  onOpenLootBag,
  onOpenDevCheat,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const weakness = WEAKNESS[boss.weakness];
  const WeaknessIcon = weakness.Icon;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / Math.max(1, maxHp)) * 100));
  const bossName = boss.nameZh.slice(0, 8);

  const go = (tab: 'combat_stats' | 'squad_invite' | 'ladder') => {
    setMenuOpen(false);
    onOpenSubTab(tab);
  };

  return (
    <header
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-14 flex-col justify-between px-2 py-1.5"
      data-testid="battle-hud"
    >
      <div className="pointer-events-auto flex h-5 items-center gap-1">
        <button
          type="button"
          aria-label="返回地圖"
          onClick={onBackToMap}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-transform active:scale-95 shadow-sm"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="shrink-0 rounded-full bg-primary px-1.5 text-[10px] font-black leading-5 text-primary-foreground">
          第 {stage} 關
        </span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-bold leading-5 text-muted-foreground">
          {mode === 'squad' ? '組隊' : '單人'}
        </span>
        <h2 className="min-w-0 truncate text-[13px] font-black leading-5 text-foreground">{bossName}</h2>
        {armorBreak && mode === 'squad' && (
          <span className="shrink-0 rounded-full bg-secondary px-1 text-[10px] font-black leading-5 text-secondary-foreground">
            連攜
          </span>
        )}
        <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-card px-1.5 text-[10px] font-black leading-5 text-foreground">
          <WeaknessIcon className="h-3 w-3 text-primary" aria-hidden="true" />
          {weakness.label}
        </span>
        <button
          type="button"
          aria-label="冒險選單"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
        >
          <Menu className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div
        className="pointer-events-auto relative h-[18px] overflow-hidden rounded-full border border-border bg-muted"
        role="meter"
        aria-label={`${bossName} 血量`}
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={Math.round(currentHp)}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${hpPercent}%`,
            background: 'linear-gradient(90deg, var(--color-hp-start), var(--color-hp-end))',
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-foreground">
          {Math.round(currentHp).toLocaleString()} / {maxHp.toLocaleString()}
        </span>
      </div>
      {menuOpen && (
        <div className="pointer-events-auto absolute right-2 top-8 z-20 w-36 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-black text-foreground hover:bg-muted" onClick={() => go('combat_stats')}>
            <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" /> 個人素質
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-black text-foreground hover:bg-muted" onClick={() => go('squad_invite')}>
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> 我的隊伍
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-black text-foreground hover:bg-muted" onClick={() => go('ladder')}>
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> 天梯
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-black text-foreground hover:bg-muted" onClick={() => { setMenuOpen(false); onOpenLootBag(); }}>
            <Gift className="h-3.5 w-3.5" aria-hidden="true" /> 寶物袋
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-black text-foreground hover:bg-muted" onClick={() => { setMenuOpen(false); onOpenDevCheat(); }}>
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" /> 測試外掛
          </button>
        </div>
      )}
    </header>
  );
};
