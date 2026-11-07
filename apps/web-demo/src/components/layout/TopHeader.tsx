import React from 'react';
import {
  Settings,
  Flame,
  Zap,
  Coins,
  Dumbbell,
  Timer,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { BRAND_CONFIG } from '../../config/economyConfig';

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 10_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface TopHeaderProps {
  resolvedTheme?: 'light' | 'dark';
}

export const TopHeader: React.FC<TopHeaderProps> = ({ resolvedTheme = 'light' }) => {
  const store = useGameStore();
  const staminaLow = store.stamina <= 20;

  const showFloatingWorkoutBanner =
    (store.isWorkoutFocusActive || store.isRestRunning) && store.activeTab !== 'workout';

  return (
    <div className="shrink-0 z-30">
      <header
        className={`safe-top-header backdrop-blur-md border-b px-3 pb-2 flex items-center justify-between gap-1.5 transition-colors ${
          resolvedTheme === 'dark'
            ? 'bg-[#26211e]/95 border-[#3d3530]'
            : 'bg-[#fffcf7]/95 border-[#e5dccb]'
        }`}
      >
        {/* Left: Brand & Level Badge */}
        <div
          onClick={() => store.setActiveTab('home')}
          className="cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm border border-amber-600/30 shrink-0">
            <span className="font-pixel text-[10px] text-white font-black">FM</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-black tracking-tight text-sm text-white">
              {BRAND_CONFIG.appName}
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Lv.{store.level}
            </span>
          </div>
        </div>

        {/* Right: Overflow-Protected Resource Pills + Theme Toggle + Locked [⚙️] Button (V2-11) */}
        <div className="flex items-center gap-1 min-w-0 justify-end">
          {/* Streak Pill */}
          <button
            onClick={() => store.setActiveTab('home')}
            aria-label={`連勝 ${store.streakDays} 天`}
            className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 px-2 py-1 min-h-[32px] rounded-lg text-xs font-mono font-extrabold text-orange-500 shrink-0 active:scale-95 transition"
          >
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 shrink-0" aria-hidden="true" />
            <span>{formatCompact(store.streakDays)}</span>
          </button>

          {/* Stamina Pill */}
          <button
            onClick={() => store.setActiveTab('shop')}
            aria-label={`體力 ${store.stamina}`}
            className={`flex items-center gap-1 px-2 py-1 min-h-[32px] rounded-lg text-xs font-mono font-extrabold border shrink-0 active:scale-95 transition ${
              staminaLow
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 animate-pulse'
                : 'bg-slate-900 border-slate-700/80 text-emerald-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true" />
            <span>{store.stamina}</span>
          </button>

          {/* Coins Pill (Auto-compacts at 10K+ so it never overflows!) */}
          <button
            onClick={() => store.setActiveTab('shop')}
            aria-label={`金幣 ${store.coins}`}
            className="flex items-center gap-1 bg-amber-950/40 border border-amber-500/40 px-2 py-1 min-h-[32px] rounded-lg text-xs font-mono font-extrabold text-amber-300 shrink-0 active:scale-95 transition"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span>{formatCompact(store.coins)}</span>
          </button>

          {/* Quick 1-Tap Light / Dark Theme Switcher */}
          <button
            onClick={() =>
              store.setThemeMode(resolvedTheme === 'dark' ? 'light' : 'dark')
            }
            aria-label={resolvedTheme === 'dark' ? '切換為溫暖亮色版' : '切換為柔和深色版'}
            title={resolvedTheme === 'dark' ? '切換為溫暖亮色版' : '切換為柔和深色版'}
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700/80 text-amber-500 hover:scale-105 active:scale-95 transition shrink-0"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />
            )}
          </button>

          {/* Settings Button [⚙️] - Strictly shrink-0 so never pushed off screen */}
          <button
            onClick={() => store.setSettingsOpen(true)}
            aria-label="系統設定"
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white active:scale-95 transition shrink-0"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* V2-02: CROSS-TAB FLOATING WORKOUT IN-PROGRESS REMINDER BAR (Dynamic Island) */}
      {showFloatingWorkoutBanner && (
        <div
          onClick={() => store.setActiveTab('workout')}
          className="cursor-pointer bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 border-b-2 border-emerald-700 px-3.5 py-2 flex items-center justify-between gap-2 shadow-md"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping shrink-0" />
            <Dumbbell className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="text-xs font-black !text-white truncate">
              運動進行中 ({formatMMSS(store.workoutElapsedSeconds)})
            </span>
            {store.isRestRunning && (
              <span className="px-2 py-0.5 rounded-full bg-amber-300 !text-slate-950 font-mono text-[10px] font-black flex items-center gap-1 shrink-0">
                <Timer className="w-3 h-3" />
                休息 {store.restSecondsLeft}s
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-black !text-amber-200 shrink-0">
            <span>返回專注</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );
};
