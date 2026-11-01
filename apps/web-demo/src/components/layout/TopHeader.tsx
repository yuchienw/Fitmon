import React from 'react';
import { Settings, Flame, Zap, Coins } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { BRAND_CONFIG } from '../../config/economyConfig';

export const TopHeader: React.FC = () => {
  const store = useGameStore();
  const staminaLow = store.stamina <= 20;

  return (
    <header className="shrink-0 bg-[#0d111a]/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between z-30">
      {/* Brand & Level Badge */}
      <div className="flex items-center gap-2">
        <div
          onClick={() => store.setActiveTab('home')}
          className="cursor-pointer flex items-center gap-1.5"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-950">
            <span className="font-pixel text-[11px] text-slate-950 font-black">FM</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-tight text-sm text-white">
                {BRAND_CONFIG.appName}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Lv.{store.level}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Resource Pills + Settings [⚙️] */}
      <div className="flex items-center gap-1.5">
        {/* Streak Pill */}
        <button
          onClick={() => store.setActiveTab('home')}
          title={`連續打卡 ${store.streakDays} 天 (冰凍保護卡: ${store.streakFreezes} 張)`}
          className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 px-2 py-1 rounded-lg text-xs font-mono font-bold text-orange-400 hover:border-orange-500/50 transition"
        >
          <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-400" />
          <span>{store.streakDays}</span>
          {store.streakFreezes > 0 && (
            <span className="text-[10px] text-cyan-400" title="連勝冰凍卡保護中">
              🛡️
            </span>
          )}
        </button>

        {/* Stamina Pill */}
        <button
          onClick={() => store.setActiveTab('shop')}
          title="體力值（耗盡後仍可 100% 免費記錄運動，僅暫停金幣掉落）"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold border transition ${
            staminaLow
              ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 animate-pulse'
              : 'bg-slate-900 border-slate-700/80 text-emerald-400 hover:border-emerald-500/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>
            {store.stamina}/{store.maxStamina}
          </span>
        </button>

        {/* Coins Pill */}
        <button
          onClick={() => store.setActiveTab('shop')}
          className="flex items-center gap-1 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-300 hover:border-amber-400 transition"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>{store.coins.toLocaleString()}</span>
          {store.doubleCoinActive && (
            <span className="ml-0.5 px-1 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
              2X
            </span>
          )}
        </button>

        {/* Settings Button [⚙️] */}
        <button
          onClick={() => store.setSettingsOpen(true)}
          aria-label="系統設定"
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 active:scale-95 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
