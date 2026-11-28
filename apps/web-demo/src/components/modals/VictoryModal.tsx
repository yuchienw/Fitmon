import React from 'react';
import { Trophy, Coins, Camera, Sparkles, Check, Swords } from 'lucide-react';
import { useGameStore, selectStreakDays } from '../../stores/useGameStore';

export const VictoryModal: React.FC = () => {
  const store = useGameStore();
  const streakDays = useGameStore(selectStreakDays);
  const data = store.victoryModalData;
  if (!data) return null;

  // Q3（經幕僚長轉達定案）：
  // 任何畫面不得出現 +0 幣/+0 EXP 零金額列；金額為 0 時隱藏；非重訓不得顯示總訓練容量/容量 kg
  const isNonStrength = Boolean(data.sportType && data.sportType !== 'strength');
  const showVolume = !isNonStrength && data.calcResult.totalRawVolume > 0;
  const showExp = data.calcResult.totalExperience > 0;
  const showCoins = data.bonusCoins > 0;

  const statItems: { label: string; value: React.ReactNode; color: string }[] = [];
  if (showVolume) {
    statItems.push({
      label: '總訓練容量',
      value: `${data.calcResult.totalRawVolume.toLocaleString()}kg`,
      color: 'text-white',
    });
  }
  if (showExp) {
    statItems.push({
      label: '獲得經驗 EXP',
      value: `+${data.calcResult.totalExperience}`,
      color: 'text-emerald-400',
    });
  }
  if (showCoins) {
    statItems.push({
      label: '結算獎金',
      value: (
        <span className="flex items-center justify-center gap-0.5">
          <Coins className="w-3.5 h-3.5" />+{data.bonusCoins}
        </span>
      ),
      color: 'text-amber-400',
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm retro-box-amber rounded-2xl p-5 space-y-4 border-2 border-amber-400 shadow-2xl animate-bounce-once">
        {/* Arcade VICTORY Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            STAGE CLEAR · 訓練達成
          </div>
          <h2 className="font-pixel text-2xl text-amber-400 tracking-wider pt-2 drop-shadow">
            VICTORY!
          </h2>
          <p className="text-xs text-slate-300 font-bold">
            🔥 連續運動推進至 <span className="text-orange-400">{streakDays} 天</span>！
          </p>
        </div>


        {/* New PR Badges */}
        {data.newPRs.length > 0 && (
          <div className="bg-amber-400/20 border border-amber-400 rounded-xl p-2.5 text-center space-y-1">
            <div className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
              <Trophy className="w-4 h-4" />
              NEW PERSONAL RECORD! 突破極限
            </div>
            <div className="text-xs font-mono text-white font-bold">
              {data.newPRs.join(' · ')}
            </div>
          </div>
        )}

        {/* Engine Stats Breakdown */}
        {statItems.length > 0 && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div
              className={`grid gap-2 text-center ${
                statItems.length === 1
                  ? 'grid-cols-1'
                  : statItems.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              }`}
            >
              {statItems.map((item, idx) => (
                <div key={idx}>
                  <div className="text-[10px] text-slate-400">{item.label}</div>
                  <div className={`text-sm font-mono font-black mt-0.5 ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {data.calcResult.isCriticalHit && (
              <div className="text-center text-[11px] font-bold text-purple-300 bg-purple-950/50 border border-purple-500/40 rounded py-1">
                ⚡ 觸發預釀氮泵神經暴擊！經驗與收益翻倍！
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              store.closeVictoryModal();
              store.setActiveTab('plaza');
            }}
            className="retro-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Swords className="w-4 h-4 stroke-[2.5px]" />
            <span>⚔️ 帶著 100% 充能去痛扁 Boss！</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                store.closeVictoryModal();
                store.setMemeStudioOpen(true, 'workout_photo');
              }}
              className="retro-btn py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5px]" />
              <span>與我的娃合照分享</span>
            </button>

            <button
              onClick={() => store.closeVictoryModal()}
              className="retro-btn py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>收下獎勵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
