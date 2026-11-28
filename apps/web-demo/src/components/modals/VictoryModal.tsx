import React from 'react';
import { Trophy, Coins, Camera, Sparkles, Check, Swords } from 'lucide-react';
import { useGameStore, selectStreakDays } from '../../stores/useGameStore';

export const VictoryModal: React.FC = () => {
  const store = useGameStore();
  const streakDays = useGameStore(selectStreakDays);
  const data = store.victoryModalData;
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm retro-box-amber rounded-2xl p-5 space-y-4 border-2 border-amber-400 shadow-2xl animate-bounce-once">
        {/* Arcade VICTORY Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            訓練達成
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
        {(() => {
          const sportType = data.sportType || store.workoutHistory[0]?.sportType || store.todaySportType;
          const showVolume = sportType === 'strength' && (data.calcResult?.totalRawVolume || 0) > 0;
          const showExp = (data.calcResult?.totalExperience || 0) > 0;
          const showCoins = (data.bonusCoins || 0) > 0;
          const statCount = (showVolume ? 1 : 0) + (showExp ? 1 : 0) + (showCoins ? 1 : 0);
          if (statCount === 0) return null;

          return (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div
                className={`grid ${
                  statCount === 3 ? 'grid-cols-3' : statCount === 2 ? 'grid-cols-2' : 'grid-cols-1'
                } gap-2 text-center`}
              >
                {showVolume && (
                  <div>
                    <div className="text-[10px] text-slate-400">總訓練容量</div>
                    <div className="text-sm font-mono font-black text-white mt-0.5">
                      {data.calcResult.totalRawVolume.toLocaleString()}kg
                    </div>
                  </div>
                )}
                {showExp && (
                  <div>
                    <div className="text-[10px] text-slate-400">獲得經驗 EXP</div>
                    <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">
                      +{data.calcResult.totalExperience}
                    </div>
                  </div>
                )}
                {showCoins && (
                  <div>
                    <div className="text-[10px] text-slate-400">結算獎金</div>
                    <div className="text-sm font-mono font-black text-amber-400 mt-0.5 flex items-center justify-center gap-0.5">
                      <Coins className="w-3.5 h-3.5" />+{data.bonusCoins}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              store.closeVictoryModal();
              store.setActiveTab('plaza');
            }}
            className="retro-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <Swords className="w-4 h-4 stroke-[2.5px]" />
            <span>去出擊</span>
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
