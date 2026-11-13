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
import { ExerciseGuideModal } from './components/modals/ExerciseGuideModal';
import { CheckInSheet } from './components/sheets/CheckInSheet';
import { UnwellSheet } from './components/sheets/UnwellSheet';
import { DisclaimerSheet } from './components/sheets/DisclaimerSheet';
import { CheckInResultModal } from './components/sheets/CheckInResultModal';
import { LowStaminaSheet } from './components/sheets/LowStaminaSheet';

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

  // Detect iOS Native (Capacitor WKWebView) or Standalone Full-Screen App to guarantee Dynamic Island clearance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent || '';
    const isIPhoneOrIPod = /iPhone|iPod/i.test(ua);
    const isCapacitorNative = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor);
    const isStandalonePWA =
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    const isIosWebView = isIPhoneOrIPod && !/Safari\//i.test(ua);

    if (isCapacitorNative || isStandalonePWA || isIosWebView) {
      document.documentElement.style.setProperty('--ios-fallback-top', '56px');
      document.documentElement.style.setProperty('--ios-fallback-bottom', '22px');
    }
  }, []);

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

        {/* Toast Notification Pill (Safe-Area Aware below TopHeader) */}
        {toastMessage && (
          <div
            style={{ top: 'calc(var(--safe-top, 0px) + 3.5rem)' }}
            className="absolute left-3 right-3 z-40 pointer-events-none flex justify-center"
          >
            <div className="px-3.5 py-2 rounded-xl bg-amber-400 border-2 border-amber-600 text-slate-950 text-xs font-black shadow-xl">
              {toastMessage}
            </div>
          </div>
        )}

        {/* Main Scrollable Content Area (SPA Instant Switching) */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
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
        <ExerciseGuideModal />

        {/* Global T1 Phase 1 Sheets (Requirement 11) */}
        <CheckInSheet />
        <UnwellSheet />
        <DisclaimerSheet />
        <CheckInResultModal />
        <LowStaminaSheet />
      </div>
    </div>
  );
};

export default App;
