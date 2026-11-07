import React from 'react';
import { Home, Dumbbell, ShoppingBag, Swords, BarChart3 } from 'lucide-react';
import { MainTab, useGameStore } from '../../stores/useGameStore';
import { I18N } from '../../config/economyConfig';

interface BottomNavProps {
  resolvedTheme?: 'light' | 'dark';
}

export const BottomNav: React.FC<BottomNavProps> = ({ resolvedTheme = 'light' }) => {
  const {
    activeTab,
    setActiveTab,
    locale,
    sessionSets,
    isRestRunning,
    restSecondsLeft,
    quests,
    todayWorkoutStatus,
    adventureCooldownUntil,
  } = useGameStore();
  const t = I18N[locale];

  const claimableQuests = quests.filter((q) => !q.claimed && q.progress >= q.target).length;
  const canStrikeBoss =
    todayWorkoutStatus !== 'none' &&
    (!adventureCooldownUntil || Date.now() >= adventureCooldownUntil);

  // Core Gameplay Flow: 🏠小屋 ➔ 🏋️運動 ➔ 【⚔️冒險 (Center Hero)】 ➔ 🛍️商城 ➔ 📊紀錄
  const tabs: {
    id: MainTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    isCenterHero?: boolean;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'home',
      label: t.tabHome,
      icon: Home,
      badge: claimableQuests > 0 ? claimableQuests : undefined,
      badgeColor: 'bg-amber-400 text-slate-950 font-black',
    },
    {
      id: 'workout',
      label: t.tabWorkout,
      icon: Dumbbell,
      badge: isRestRunning
        ? `${restSecondsLeft}s`
        : sessionSets.length > 0
        ? sessionSets.length
        : undefined,
      badgeColor: isRestRunning
        ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
        : 'bg-emerald-600 text-white',
    },
    {
      id: 'plaza',
      label: t.tabPlaza,
      icon: Swords,
      isCenterHero: true,
      badge: canStrikeBoss ? '出擊' : undefined,
      badgeColor: 'bg-rose-500 text-white animate-bounce',
    },
    {
      id: 'shop',
      label: t.tabShop,
      icon: ShoppingBag,
    },
    {
      id: 'analytics',
      label: t.tabAnalytics,
      icon: BarChart3,
    },
  ];

  return (
    <nav
      className={`safe-bottom-nav shrink-0 backdrop-blur-md border-t-2 px-2 pt-1.5 z-30 transition-colors ${
        resolvedTheme === 'dark'
          ? 'bg-[#221d1a]/95 border-[#3d3530] shadow-[0_-4px_20px_rgba(0,0,0,0.4)]'
          : 'bg-[#fffcf7]/95 border-[#e2d6c1] shadow-[0_-4px_16px_rgba(60,45,30,0.08)]'
      }`}
    >
      <div className="grid grid-cols-5 gap-1 items-end">
        {tabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenterHero) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center justify-end pb-1 group focus:outline-none"
              >
                <div
                  className={`relative -mt-5 w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-150 border-2 ${
                    isActive
                      ? 'w-14 h-12 bg-gradient-to-b from-amber-400 via-orange-400 to-rose-500 text-slate-950 border-amber-200 shadow-[0_4px_0_#9a3412,0_6px_16px_rgba(244,63,94,0.45)] -translate-y-0.5'
                      : 'w-13 h-11 bg-gradient-to-b from-emerald-400 to-teal-500 text-slate-950 border-emerald-200 shadow-[0_4px_0_#065f46] hover:-translate-y-0.5 active:translate-y-0.5'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.5px] text-slate-950" />
                  {item.badge !== undefined && (
                    <span
                      className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow border border-white/40 ${
                        item.badgeColor || 'bg-rose-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1 font-black tracking-tight ${
                    isActive ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-100 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                      item.badgeColor || 'bg-emerald-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 font-black tracking-tight ${
                  isActive ? 'text-emerald-500' : ''
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
