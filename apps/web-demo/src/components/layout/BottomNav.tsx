import React from 'react';
import { Home, Dumbbell, ShoppingBag, Swords, User } from 'lucide-react';
import { MainTab, useGameStore } from '../../stores/useGameStore';
import { I18N } from '../../config/economyConfig';

interface BottomNavProps {
  resolvedTheme?: 'light' | 'dark';
}

export const BottomNav: React.FC<BottomNavProps> = ({ resolvedTheme = 'light' }) => {
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
      badgeColor: 'bg-amber-500 text-white',
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
        ? 'bg-amber-500 text-white animate-pulse'
        : 'bg-emerald-600 text-white',
    },
    {
      id: 'shop',
      label: t.tabShop,
      icon: ShoppingBag,
    },
    {
      id: 'plaza',
      label: t.tabPlaza,
      icon: Swords,
    },
    {
      id: 'analytics',
      label: t.tabAnalytics,
      icon: User,
    },
  ];

  return (
    <nav
      className={`safe-bottom-nav shrink-0 backdrop-blur-md border-t px-2 pt-1.5 z-30 transition-colors ${
        resolvedTheme === 'dark'
          ? 'bg-[#26211e]/95 border-[#3d3530]'
          : 'bg-[#fffcf7]/95 border-[#e5dccb]'
      }`}
    >
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
              <span className={`text-[11px] mt-1 font-black tracking-tight ${isActive ? 'text-emerald-500' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
