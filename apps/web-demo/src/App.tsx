import React, { useEffect } from 'react';
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

export const App: React.FC = () => {
  const { activeTab, isRestRunning, tickRestTimer, toastMessage } = useGameStore();

  // Global Keep-Alive Rest Timer (continues ticking even when user switches tabs!)
  useEffect(() => {
    if (!isRestRunning) return;
    const timer = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [isRestRunning, tickRestTimer]);

  return (
    <div className="min-h-[100dvh] w-full bg-[#06080d] flex justify-center items-center">
      {/* Mobile-First App Shell Container (430px max width on desktop, full screen on mobile) */}
      <div className="w-full max-w-[430px] h-[100dvh] bg-[#0b0d13] flex flex-col border-x border-slate-800/80 shadow-2xl relative overflow-hidden">
        {/* Top Persistent Header */}
        <TopHeader />

        {/* Toast Notification Pill */}
        {toastMessage && (
          <div className="absolute top-14 left-3 right-3 z-40 pointer-events-none flex justify-center">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/95 border-2 border-emerald-400 text-emerald-200 text-xs font-bold shadow-2xl">
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
        <BottomNav />

        {/* Global Overlays & Modals */}
        <VictoryModal />
        <MemeStudioModal />
        <SettingsModal />
      </div>
    </div>
  );
};

export default App;
