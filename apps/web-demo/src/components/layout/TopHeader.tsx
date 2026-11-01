import React from 'react';
import { Settings, Flame, Zap, Coins, Dumbbell, Timer, ArrowRight } from 'lucide-react';
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

export const TopHeader: React.FC = () => {
  const store = useGameStore();
  const staminaLow = store.stamina <= 20;

  const showFloatingWorkoutBanner =
    (store.isWorkoutFocusActive || store.isRestRunning) && store.activeTab !== 'workout';

  return (
    <div className="shrink-0 z-30">
      <header className="bg-[#0d111a]/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-1.5">
        {/* Left: Brand & Level Badge */}
        <div
          onClick={() => store.setActiveTab('home')}
          className="cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-950 shrink-0">
            <span className="font-pixel text-[10px] text-slate-950 font-black">FM</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-black tracking-tight text-sm text-white">
              {BRAND_CONFIG.appName}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Lv.{store.level}
            </span>
          </div>
        </div>

        {/* Right: Overflow-Protected Resource Pills + Locked [⚙️] Button (V2-11) */}
        <div className="flex items-center gap-1 min-w-0 justify-end">
          {/* Streak Pill */}
          <button
            onClick={() => store.setActiveTab('home')}
            className="flex items-center gap-0.5 bg-slate-900 border border-slate-700/80 px-1.5 py-1 rounded-lg text-[11px] font-mono font-bold text-orange-400 shrink-0"
          >
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-400 shrink-0" />
            <span>{formatCompact(store.streakDays)}</span>
          </button>

          {/* Stamina Pill */}
          <button
            onClick={() => store.setActiveTab('shop')}
            className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[11px] font-mono font-bold border shrink-0 ${
              staminaLow
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 animate-pulse'
                : 'bg-slate-900 border-slate-700/80 text-emerald-400'
            }`}
          >
            <Zap className="w-3 h-3 fill-current shrink-0" />
            <span>{store.stamina}</span>
          </button>

          {/* Coins Pill (Auto-compacts at 10K+ so it never overflows!) */}
          <button
            onClick={() => store.setActiveTab('shop')}
            className="flex items-center gap-1 bg-amber-950/40 border border-amber-500/40 px-2 py-1 rounded-lg text-[11px] font-mono font-bold text-amber-300 max-w-[96px] truncate shrink-0"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{formatCompact(store.coins)}</span>
          </button>

          {/* Settings Button [⚙️] - Strictly shrink-0 so never pushed off screen */}
          <button
            onClick={() => store.setSettingsOpen(true)}
            aria-label="系統設定"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white active:scale-95 transition shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* V2-02: CROSS-TAB FLOATING WORKOUT IN-PROGRESS REMINDER BAR (Dynamic Island) */}
      {showFloatingWorkoutBanner && (
        <div
          onClick={() => store.setActiveTab('workout')}
          className="cursor-pointer bg-gradient-to-r from-emerald-950 via-teal-900/90 to-emerald-950 border-b-2 border-emerald-400 px-3.5 py-2 flex items-center justify-between gap-2 shadow-lg animate-pulse"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <Dumbbell className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="text-xs font-black text-white truncate">
              運動進行中 ({formatMMSS(store.workoutElapsedSeconds)})
            </span>
            {store.isRestRunning && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black flex items-center gap-1 shrink-0">
                <Timer className="w-3 h-3" />
                休息 {store.restSecondsLeft}s
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-emerald-300 shrink-0">
            <span>返回專注</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );
};
