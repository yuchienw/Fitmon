import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { BCAA_COIN_PRICE } from '../../config/economy';
import { Coins, Zap } from 'lucide-react';

export const LowStaminaSheet: React.FC = () => {
  const store = useGameStore();
  const lowStaminaData = store.lowStaminaSheet;

  if (!lowStaminaData) return null;

  const currentStamina = store.stamina;
  const requiredStamina = lowStaminaData.required;
  const bcaaCount = store.consumables.bcaa_water || 0;

  const handleUseBcaa = () => {
    store.useBcaa();
    if (store.stamina + 50 >= requiredStamina) {
      store.setLowStaminaSheet(null);
    }
  };

  const handleBuyBcaa = () => {
    store.buyWithCoins('bcaa_water');
  };

  const handleCancel = () => {
    store.setLowStaminaSheet(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#29221E]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="w-full max-w-[430px] rounded-t-[22px] border-t-[1.5px] p-4 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl text-[#29221E]"
        data-testid="low-stamina-sheet"
      >
        {/* Grab bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] mx-auto mb-3" />

        {/* Title */}
        <h2 className="text-lg font-black text-[#29221E] text-center mb-3">
          體力不足
        </h2>

        {/* Current / Required Stamina */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-xs text-[#786B63] font-bold">目前</div>
            <div className="text-2xl font-black text-[#29221E] font-mono mt-0.5">
              {currentStamina}
            </div>
          </div>
          <div className="text-base text-[#786B63] font-black pt-3">／</div>
          <div className="text-center">
            <div className="text-xs text-[#786B63] font-bold">需要</div>
            <div className="text-2xl font-black text-[#29221E] font-mono mt-0.5">
              {requiredStamina}
            </div>
          </div>
        </div>

        {/* BCAA Action Box */}
        <div
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#FDBA74',
          }}
          className="rounded-2xl border-[1.5px] p-3.5 space-y-3"
        >
          {/* Option: 用 BCAA 回復 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-[#F5C45A] flex items-center justify-center text-xl shrink-0">
                🧪
              </div>
              <div>
                <div className="text-sm font-black text-[#29221E]">用 BCAA 回復</div>
                <div className="text-xs text-[#786B63] font-bold mt-0.5">
                  持有 {bcaaCount}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={bcaaCount <= 0}
              onClick={handleUseBcaa}
              style={{
                background: bcaaCount > 0 ? 'linear-gradient(#FB923C, #EA580C)' : '#E5DCCB',
                boxShadow: bcaaCount > 0 ? '0 3px 0 #B8460A' : 'none',
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:translate-y-0.5 ${
                bcaaCount > 0 ? 'text-white cursor-pointer' : 'text-[#8A7A6C] cursor-not-allowed'
              }`}
            >
              使用 (+50⚡)
            </button>
          </div>

          {/* Sub-option: 再買 1 個・金幣 10 */}
          <button
            type="button"
            onClick={handleBuyBcaa}
            style={{
              backgroundColor: '#FAF6F0',
              borderColor: '#E5DCCB',
            }}
            className="w-full rounded-xl border p-2.5 flex items-center justify-between text-left hover:border-[#FDBA74] active:scale-[0.99] transition"
          >
            <span className="text-xs font-extrabold text-[#29221E]">
              再買 1 個
            </span>
            <span className="flex items-center gap-1 text-xs font-black text-[#29221E] font-mono">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>金幣 {BCAA_COIN_PRICE}</span>
            </span>
          </button>
        </div>

        {/* Cancel CTA */}
        <button
          type="button"
          onClick={handleCancel}
          className="w-full text-center mt-4 text-sm font-extrabold text-[#786B63] hover:text-[#29221E] cursor-pointer"
        >
          取消
        </button>
      </div>
    </div>
  );
};
