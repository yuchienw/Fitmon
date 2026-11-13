import React from 'react';
import { useGameStore } from '../../stores/useGameStore';

export const UnwellSheet: React.FC = () => {
  const store = useGameStore();

  if (!store.unwellSheetOpen) return null;

  const handleAcknowledge = () => {
    store.setUnwellSheetOpen(false);
    store.setCheckinSheetOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#29221E]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleAcknowledge();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="w-full max-w-[430px] rounded-t-[22px] border-t-[1.5px] p-4 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl text-[#29221E]"
        data-testid="unwell-sheet"
      >
        {/* Grab bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] mx-auto mb-3" />

        {/* Title */}
        <h2 className="text-lg font-black text-[#29221E] text-center mb-3">
          先停止運動
        </h2>

        {/* Calm medical advice body */}
        <div
          style={{
            backgroundColor: '#FAF6F0',
            borderColor: '#E5DCCB',
          }}
          className="rounded-2xl border-[1.5px] p-3.5 text-sm font-bold text-[#29221E] leading-relaxed"
        >
          先停止運動；頭暈、胸悶或疼痛持續的話，請就醫。
        </div>

        {/* Emphasized 119 emergency block */}
        <div
          style={{
            backgroundColor: '#FFF1F2',
            borderColor: '#FECDD3',
          }}
          className="mt-2.5 rounded-2xl border-[1.5px] p-3.5 text-center"
        >
          <div className="text-sm font-extrabold text-[#9F1239] leading-snug">
            如果胸痛、呼吸困難或快昏倒，請立即撥打
          </div>
          <div className="text-4xl font-black text-[#BE123C] tracking-wider mt-1">
            119
          </div>
        </div>

        {/* Helper note */}
        <div
          style={{
            backgroundColor: '#FAF6F0',
            borderColor: '#D8CCB8',
          }}
          className="mt-3 rounded-xl border border-dashed p-2.5 text-center text-xs font-bold text-[#786B63]"
        >
          打卡不受影響。準備好了再回來按「今天有動」。
        </div>

        {/* Primary button: 我知道了 */}
        <button
          type="button"
          onClick={handleAcknowledge}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="mt-3 w-full py-3.5 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition"
        >
          我知道了
        </button>
      </div>
    </div>
  );
};
