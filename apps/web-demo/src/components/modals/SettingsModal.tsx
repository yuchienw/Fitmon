import React from 'react';
import { X, Globe, Volume2, RotateCcw, Coins, Zap, Wrench } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';

export const SettingsModal: React.FC = () => {
  const store = useGameStore();
  if (!store.settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm retro-box rounded-2xl p-4 space-y-4 border-2 border-slate-700">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-black text-white">⚙️ 系統設定與 MVP 測試控制台</h3>
          <button
            onClick={() => store.setSettingsOpen(false)}
            className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language & Sound */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              介面語系 (i18n)
            </span>
            <div className="flex gap-1">
              {(['zh-TW', 'en'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => store.setLocale(loc)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    store.locale === loc
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {loc === 'zh-TW' ? '繁體中文' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-400" />
              8-Bit 街機音效合成器
            </span>
            <button
              onClick={() => store.toggleSound()}
              className={`px-3 py-1 rounded-lg text-xs font-black ${
                store.soundEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {store.soundEnabled ? '開啟 ON' : '靜音 OFF'}
            </button>
          </div>
        </div>

        {/* Developer / MVP Quick Test Cheats */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 space-y-2.5">
          <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>MVP 驗收快速測試工具 (Sandbox Cheats)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => store.addDemoCoins(500)}
              className="retro-btn py-2 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center justify-center gap-1"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>+500 測試金幣</span>
            </button>

            <button
              onClick={() => store.refillStaminaFull()}
              className="retro-btn py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>補滿 100 體力</span>
            </button>
          </div>
        </div>

        {/* Reset LocalStorage */}
        <button
          onClick={() => store.resetDemoState()}
          className="w-full py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置本機 LocalStorage 初始進度</span>
        </button>
      </div>
    </div>
  );
};
