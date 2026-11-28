import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { accumulateDayProgress } from '../../game/dayProgress';
import { getLocalDayKey } from '../../game/day';
import { bossForStage } from '../../features/adventure/battle/bossView';

export const BossLockedSheet: React.FC = () => {
  const store = useGameStore();

  if (!store.bossLockedSheetOpen) return null;

  const nowMs = Date.now();
  const todayKey = getLocalDayKey(nowMs);
  const dayProgress = accumulateDayProgress(store.workoutHistory, {
    dayKey: todayKey,
    now: nowMs,
  });

  const stage = store.squadStage || store.soloStage || 1;
  const currentBoss = bossForStage(stage);

  const handleGoWorkout = () => {
    store.setBossLockedSheetOpen(false);
    store.goToSportTypePicker();
  };

  const handleClose = () => {
    store.setBossLockedSheetOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#29221E]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="w-full max-w-[430px] rounded-t-[22px] border-t-[1.5px] p-4 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl text-[#29221E]"
        data-testid="boss-locked-sheet"
      >
        {/* Grab bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] mx-auto mb-3" />

        {/* Boss info & text header */}
        <div className="flex items-center gap-3">
          <div className="w-[76px] h-[76px] shrink-0 rounded-2xl bg-[#FFF8EC] border border-[#E5DCCB] flex items-center justify-center overflow-hidden p-1">
            <img
              src={`/assets/adventure/${currentBoss.spriteKey}.svg`}
              alt={currentBoss.nameZh}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to emoji if svg fails to load
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  const span = document.createElement('span');
                  span.className = 'text-4xl';
                  span.textContent = currentBoss.emoji;
                  e.currentTarget.parentElement.appendChild(span);
                }
              }}
            />
          </div>
          <div>
            <h2 className="text-[17px] font-black text-[#29221E] leading-snug">
              今天的 Boss 在等你
            </h2>
            <p className="text-[11.5px] text-[#786B63] mt-1 leading-relaxed">
              今天動滿 10 分鐘，就能出擊一次。散步、伸展、打球都算。
            </p>
          </div>
        </div>

        {/* Progress chips */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span
            style={{
              backgroundColor: '#F4EFE6',
              color: '#786B63',
              borderColor: '#E5DCCB',
            }}
            className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border"
          >
            今天 {Math.min(10, dayProgress.minutes_done)}／10 分
          </span>
          <span
            style={{
              backgroundColor: '#F4EFE6',
              color: '#786B63',
              borderColor: '#E5DCCB',
            }}
            className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border"
          >
            跑走 1 公里也算
          </span>
        </div>

        {/* Primary CTA: 去運動 */}
        <button
          type="button"
          data-testid="boss-locked-workout"
          onClick={handleGoWorkout}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="mt-3.5 w-full py-3.5 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition cursor-pointer"
        >
          去運動
        </button>

        {/* Secondary text button: 先逛逛地圖 */}
        <button
          type="button"
          data-testid="boss-locked-explore"
          onClick={handleClose}
          className="mt-2 w-full py-2 text-center text-sm font-extrabold text-[#786B63] hover:text-[#29221E] cursor-pointer"
        >
          先逛逛地圖
        </button>
      </div>
    </div>
  );
};
