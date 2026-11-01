import React from 'react';
import { Home, Dumbbell, ShoppingBag, Globe, BarChart3 } from 'lucide-react';
import { MainTab, useGameStore } from '../../stores/useGameStore';
import { I18N } from '../../config/economyConfig';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, locale, sessionSets, isRestRunning, restSecondsLeft, quests } =
    useGameStore();
  const t = I18N[locale];

  const claimableQuests = quests.filter((q) => !q.claimed && q.progress >= q.target).length;

  const tabs: {
    id: MainTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'home',
      label: t.tabHome,
      icon: Home,
      badge: claimableQuests > 0 ? claimableQuests : undefined,
      badgeColor: 'bg-amber-500 text-slate-950',
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
        ? 'bg-emerald-400 text-slate-950 animate-pulse'
        : 'bg-emerald-500 text-slate-950',
    },
    {
      id: 'shop',
      label: t.tabShop,
      icon: ShoppingBag,
    },
    {
      id: 'plaza',
      label: t.tabPlaza,
      icon: Globe,
    },
    {
      id: 'analytics',
      label: t.tabAnalytics,
      icon: BarChart3,
    },
  ];

  return (
    <nav className="shrink-0 bg-[#0d111a]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 z-30">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all duration-100 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                      item.badgeColor || 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 font-bold tracking-tight ${isActive ? 'text-emerald-300' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
