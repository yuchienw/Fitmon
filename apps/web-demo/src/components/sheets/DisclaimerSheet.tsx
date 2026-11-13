import React from 'react';
import { useGameStore } from '../../stores/useGameStore';

export const DisclaimerSheet: React.FC = () => {
  const store = useGameStore();

  // Shown while disclaimerAcceptedAt is null or disclaimerOpen is explicitly true
  const isVisible = store.disclaimerAcceptedAt === null || store.disclaimerOpen;
  if (!isVisible) return null;

  const handleAcknowledge = () => {
    store.acceptDisclaimer();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#29221E]/60 backdrop-blur-[2px]">
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="w-full max-w-[430px] rounded-t-[22px] border-t-[1.5px] p-4 pb-8 max-h-[90vh] overflow-y-auto shadow-2xl text-[#29221E]"
        data-testid="disclaimer-sheet"
      >
        {/* Grab bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] mx-auto mb-3" />

        {/* Title */}
        <h2 className="text-lg font-black text-[#29221E] text-center mb-3">
          使用前請先閱讀
        </h2>

        {/* Four exact sentences per spec §4 */}
        <div
          style={{
            backgroundColor: '#FAF6F0',
            borderColor: '#E5DCCB',
          }}
          className="rounded-2xl border-[1.5px] p-3.5 text-sm font-bold text-[#29221E] leading-relaxed space-y-3"
        >
          <p>本 App 提供一般健身資訊，不能取代醫療建議。</p>
          <p>
            有心臟病、高血壓、糖尿病等慢性病、懷孕、受傷或正在服藥，請先諮詢醫師。
          </p>
          <p>
            訓練中如果不舒服，請先停止運動；頭暈、胸悶或疼痛持續的話，請就醫。
          </p>
        </div>

        {/* Emphasized 119 emergency block */}
        <div
          style={{
            backgroundColor: '#FFF1F2',
            borderColor: '#FECDD3',
          }}
          className="my-3 rounded-2xl border-[1.5px] p-3.5 text-center"
        >
          <div className="text-sm font-extrabold text-[#9F1239] leading-snug">
            如果胸痛、呼吸困難或快昏倒，請立即撥打
          </div>
          <div className="text-4xl font-black text-[#BE123C] tracking-wider mt-1">
            119
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleAcknowledge}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="w-full py-3.5 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition"
        >
          我知道了
        </button>
      </div>
    </div>
  );
};
