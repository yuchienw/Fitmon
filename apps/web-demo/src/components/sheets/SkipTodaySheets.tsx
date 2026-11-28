import React from 'react';

export interface SkipChoiceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUnwell: () => void;
  onSelectRest: () => void;
}

export const SkipChoiceSheet: React.FC<SkipChoiceSheetProps> = ({
  isOpen,
  onClose,
  onSelectUnwell,
  onSelectRest,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#29221E]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="w-full max-w-[430px] rounded-t-[22px] border-t-[1.5px] p-4 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl text-[#29221E]"
        data-testid="skip-choice-sheet"
      >
        {/* Grab bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] mx-auto mb-3" />

        {/* Title */}
        <h2 className="text-lg font-black text-[#29221E] text-center mb-3">
          今天先不動
        </h2>

        {/* Option 1: 我不舒服 (First, ≥56px, stacked) */}
        <button
          type="button"
          data-testid="skip-choice-unwell"
          onClick={onSelectUnwell}
          style={{
            backgroundColor: '#FFF8F8',
            borderColor: '#E9C9CF',
            boxShadow: '0 3px 0 #EBD3D8',
          }}
          className="w-full min-h-[56px] flex items-start gap-2.5 p-3 rounded-2xl border-[1.5px] text-left cursor-pointer transition active:scale-[0.99] mb-2"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#FCE7EB]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#E8A3B0"
              stroke="#8E3B4C"
              strokeWidth="1.6"
            >
              <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-black text-[#8E3B4C] leading-snug">
              我不舒服
            </div>
            <div className="text-[12.5px] font-bold text-[#5C4A3E] leading-relaxed mt-0.5">
              先照顧身體，今天不會跳提醒，隊友也不會催你。
            </div>
          </div>
        </button>

        {/* Option 2: 今天休息 (Second, ≥56px, stacked) */}
        <button
          type="button"
          data-testid="skip-choice-rest"
          onClick={onSelectRest}
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#E0D4C0',
            boxShadow: '0 3px 0 #E5DCCB',
          }}
          className="w-full min-h-[56px] flex items-start gap-2.5 p-3 rounded-2xl border-[1.5px] text-left cursor-pointer transition active:scale-[0.99] mb-3"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#F3EEE4]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8A6A4E"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 9h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5z" fill="#F5E6CC" />
              <path d="M16 11h2a2 2 0 010 4h-2M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-black text-[#29221E] leading-snug">
              今天休息
            </div>
            <div className="text-[12.5px] font-bold text-[#5C4A3E] leading-relaxed mt-0.5">
              休息也是訓練的一部分。按下後今天就不能改回來。
            </div>
          </div>
        </button>

        {/* Footer 119 emergency notice (the only red element) */}
        <div
          style={{
            backgroundColor: '#FFF1F2',
            borderColor: '#FECDD3',
            color: '#9F1239',
          }}
          className="rounded-xl border-[1.5px] p-2.5 text-[12px] font-extrabold text-center leading-relaxed"
        >
          如果胸痛、呼吸困難或快昏倒，請立即撥打 119。
        </div>

        {/* 再想想 link */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-center text-[14px] font-bold text-[#786B63] hover:text-[#29221E] cursor-pointer mt-1.5 transition active:scale-[0.99]"
        >
          再想想
        </button>
      </div>
    </div>
  );
};

export interface RestConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

export const RestConfirmSheet: React.FC<RestConfirmSheetProps> = ({
  isOpen,
  onClose,
  onBack,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#29221E]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="w-full max-w-[430px] rounded-t-[22px] border-t-[1.5px] p-4 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl text-[#29221E]"
        data-testid="rest-confirm-sheet"
      >
        {/* Grab bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] mx-auto mb-3" />

        {/* Title & subtitle */}
        <div className="mb-3">
          <h2 className="text-lg font-black text-[#29221E] leading-snug">
            今天休息？
          </h2>
          <div className="text-[12px] font-medium text-[#786B63] leading-relaxed mt-1">
            休息也是訓練的一部分。今天不會跳提醒，隊友也不會催你。
          </div>
        </div>

        {/* Three check lines */}
        <div
          style={{
            backgroundColor: '#FAF6F0',
            borderColor: '#E5DCCB',
          }}
          className="rounded-2xl border-[1.5px] p-3 text-[12.5px] font-bold text-[#29221E] leading-relaxed space-y-2 mb-2.5"
        >
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              className="shrink-0"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
            <span>房間互動和問答照樣可以領遊戲幣</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              className="shrink-0"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
            <span>不影響本週已經動的天數</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              className="shrink-0"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
            <span>休息日想動也可以，動滿 10 分鐘照樣算數。</span>
          </div>
        </div>

        {/* Cream note (no red) */}
        <div
          style={{
            backgroundColor: '#F3EEE4',
            borderColor: '#E0D4C0',
          }}
          className="rounded-xl border-[1.5px] p-2.5 flex items-center gap-2 mb-3"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8A6A4E"
            strokeWidth="2"
            strokeLinecap="round"
            className="shrink-0"
          >
            <path d="M4 9h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5z" fill="#F5E6CC" />
            <path d="M16 11h2a2 2 0 010 4h-2M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4" />
          </svg>
          <span className="text-[12.5px] font-extrabold text-[#6B5B4E] leading-relaxed">
            按下後，今天就不能再改回來囉。好好放鬆一天吧！
          </span>
        </div>

        {/* Primary button: 今天休息 */}
        <button
          type="button"
          data-testid="rest-confirm-primary"
          onClick={onConfirm}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="w-full py-3 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition cursor-pointer"
        >
          今天休息
        </button>

        {/* Secondary button: 再想想 (returns to chooser) */}
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 text-center text-[14px] font-bold text-[#786B63] hover:text-[#29221E] cursor-pointer mt-1 transition active:scale-[0.99]"
        >
          再想想
        </button>
      </div>
    </div>
  );
};
