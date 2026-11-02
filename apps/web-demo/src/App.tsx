import React, { useEffect, useState } from 'react';
import { useGameStore } from './stores/useGameStore';
import { TopHeader } from './components/layout/TopHeader';
import { BottomNav } from './components/layout/BottomNav';
import { HomeTab } from './components/tabs/HomeTab';
import { WorkoutTab } from './components/tabs/WorkoutTab';
import { ShopTab } from './components/tabs/ShopTab';
import { PlazaTab } from './components/tabs/PlazaTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';
import { VictoryModal } from './components/modals/VictoryModal';
import { MemeStudioModal } from './components/studio/MemeStudioModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { WardrobeModal } from './components/modals/WardrobeModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { SessionDetailModal } from './components/modals/SessionDetailModal';

export const App: React.FC = () => {
  const {
    activeTab,
    themeMode,
    isRestRunning,
    isWorkoutFocusActive,
    tickGlobalTimers,
    toastMessage,
  } = useGameStore();

  // Detect system color scheme with fallback to 'light'
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;

  // Global Keep-Alive Timer (ticks rest timer & workout focus elapsed timer across all tabs!)
  useEffect(() => {
    if (!isRestRunning && !isWorkoutFocusActive) return;
    const timer = setInterval(() => {
      tickGlobalTimers();
    }, 1000);
    return () => clearInterval(timer);
  }, [isRestRunning, isWorkoutFocusActive, tickGlobalTimers]);

  return (
    <div
      className={`min-h-[100dvh] w-full flex justify-center items-center transition-colors duration-200 ${
        resolvedTheme === 'dark' ? 'theme-dark bg-[#171412]' : 'theme-light bg-[#ebe4d8]'
      }`}
    >
      {/* Mobile-First App Shell Container (430px max width on desktop, full screen on mobile) */}
      <div
        className={`w-full max-w-[430px] h-[100dvh] flex flex-col border-x shadow-2xl relative overflow-hidden transition-colors duration-200 ${
          resolvedTheme === 'dark'
            ? 'bg-[#211d1a] border-[#3d3530]'
            : 'bg-[#faf6f0] border-[#e5dccb]'
        }`}
      >
        {/* Top Persistent Header + Cross-Tab Workout Focus Dynamic Island */}
        <TopHeader resolvedTheme={resolvedTheme} />

        {/* Toast Notification Pill */}
        {toastMessage && (
          <div className="absolute top-14 left-3 right-3 z-40 pointer-events-none flex justify-center">
            <div className="px-3.5 py-2 rounded-xl bg-amber-400 border-2 border-amber-600 text-slate-950 text-xs font-black shadow-xl">
              {toastMessage}
            </div>
          </div>
        )}

        {/* Main Scrollable Content Area (SPA Instant Switching) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'workout' && <WorkoutTab />}
          {activeTab === 'shop' && <ShopTab />}
          {activeTab === 'plaza' && <PlazaTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
        </main>

        {/* Bottom 5-Tab Navigation Bar */}
        <BottomNav resolvedTheme={resolvedTheme} />

        {/* Global Overlays & Modals */}
        <VictoryModal />
        <MemeStudioModal />
        <SettingsModal />
        <WardrobeModal />
        <UserProfileModal />
        <SessionDetailModal />
      </div>
    </div>
  );
};

export default App;
