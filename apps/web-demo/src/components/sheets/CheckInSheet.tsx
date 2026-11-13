import React, { useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { CheckinActivityType, CheckinIntensity } from '../../game/economyRules';
import { Dumbbell, Footprints, Flame, CircleDot, Plus, ChevronDown, ChevronUp } from 'lucide-react';

export const CheckInSheet: React.FC = () => {
  const store = useGameStore();

  const [expanded, setExpanded] = useState(false);
  const [activityType, setActivityType] = useState<CheckinActivityType | undefined>(undefined);
  const [customText, setCustomText] = useState('');
  const [minutes, setMinutes] = useState<number | undefined>(undefined);
  const [intensity, setIntensity] = useState<CheckinIntensity | undefined>(undefined);

  if (!store.checkinSheetOpen) return null;

  const handleSubmit = () => {
    // If first-time user hasn't accepted disclaimer, show disclaimer first
    if (store.disclaimerAcceptedAt === null) {
      store.setCheckinSheetOpen(false);
      store.setDisclaimerOpen(true);
      return;
    }

    const annotation =
      activityType || customText || minutes !== undefined || intensity
        ? {
            type: activityType,
            customText: activityType === '自訂' ? customText.trim() : undefined,
            minutes: minutes,
            intensity: intensity,
          }
        : undefined;

    store.checkin(annotation);
    store.setCheckinSheetOpen(false);
  };

  const handleUnwell = () => {
    store.setUnwellSheetOpen(true);
  };

  const activityOptions: {
    type: CheckinActivityType;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { type: '重訓', label: '重訓', icon: Dumbbell },
    { type: '散步', label: '散步', icon: Footprints },
    { type: '瑜珈', label: '瑜珈', icon: Flame },
    { type: '球類', label: '球類', icon: CircleDot },
    { type: '自訂', label: '自訂', icon: Plus },
  ];

  const intensityOptions: {
    level: CheckinIntensity;
    title: string;
    desc: string;
  }[] = [
    {
      level: '輕鬆',
      title: '輕鬆',
      desc: '輕鬆：還能唱歌。',
    },
    {
      level: '中等',
      title: '中等',
      desc: '中等：能說話，但不能唱歌。',
    },
    {
      level: '喘喘',
      title: '喘喘',
      desc: '喘喘：說不出完整的句子。',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#29221E]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          store.setCheckinSheetOpen(false);
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="w-full max-w-[430px] rounded-t-[22px] border-t-[1.5px] p-4 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl text-[#29221E]"
        data-testid="checkin-sheet"
      >
        {/* Grab bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5DCCB] mx-auto mb-3" />

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[#29221E]">今天有動嗎？</h2>
          <span className="text-xs text-[#786B63] font-bold">有動就算數</span>
        </div>

        <p className="text-xs text-[#786B63] mt-1.5 mb-3">
          任何活動都算，不強制動作、組數或時長。
        </p>

        {/* Big Primary CTA */}
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="w-full py-3.5 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition"
        >
          今天有動
        </button>

        {/* Collapsible Optional Section */}
        <div
          style={{
            backgroundColor: '#FAF6F0',
            borderColor: '#D8CCB8',
          }}
          className="mt-3 rounded-2xl border-[1.5px] border-dashed p-3 transition-all"
        >
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-left focus:outline-none"
          >
            <span className="text-xs font-black text-[#29221E]">加註（可不填）</span>
            <span className="text-[#786B63]">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-dashed border-[#E5DCCB] space-y-3">
              {/* Activity Types */}
              <div>
                <label className="block text-[11.5px] font-extrabold text-[#29221E] mb-1.5">
                  做了什麼？（可不填）
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {activityOptions.map((opt) => {
                    const isSelected = activityType === opt.type;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() =>
                          setActivityType(isSelected ? undefined : opt.type)
                        }
                        style={{
                          backgroundColor: isSelected ? '#FFF1E4' : '#FFFFFF',
                          borderColor: isSelected ? '#EA580C' : '#E5DCCB',
                          color: isSelected ? '#C2410C' : '#29221E',
                        }}
                        className="py-2 px-1 rounded-xl border-[1.5px] text-center font-extrabold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {activityType === '自訂' && (
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="請輸入運動項目（例如：慢跑、跳繩、攀岩）"
                    maxLength={20}
                    className="mt-2 w-full px-3 py-2 rounded-xl border-[1.5px] border-[#E5DCCB] bg-white text-xs font-bold text-[#29221E] placeholder:text-[#786B63]/60 focus:outline-none focus:border-[#EA580C]"
                  />
                )}
              </div>

              {/* Minutes input */}
              <div>
                <label className="block text-[11.5px] font-extrabold text-[#29221E] mb-1.5">
                  多久？（可不填）
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMinutes((prev) => {
                        if (prev === undefined) return 15;
                        return Math.max(5, prev - 5);
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-[#E5DCCB] bg-white font-extrabold text-sm text-[#29221E] flex items-center justify-center active:scale-95 shadow-xs"
                  >
                    －
                  </button>
                  <span className="min-w-[50px] text-center font-mono font-black text-sm text-[#29221E]">
                    {minutes !== undefined ? `${minutes}` : '未填'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMinutes((prev) => {
                        if (prev === undefined) return 15;
                        return prev + 5;
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-[#E5DCCB] bg-white font-extrabold text-sm text-[#29221E] flex items-center justify-center active:scale-95 shadow-xs"
                  >
                    ＋
                  </button>
                  <span className="text-xs text-[#786B63] font-bold">分</span>
                  {minutes !== undefined && (
                    <button
                      type="button"
                      onClick={() => setMinutes(undefined)}
                      className="ml-auto text-[11px] text-[#786B63] underline"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

              {/* Intensity options */}
              <div>
                <label className="block text-[11.5px] font-extrabold text-[#29221E] mb-1.5">
                  強度（可不填）
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {intensityOptions.map((opt) => {
                    const isSelected = intensity === opt.level;
                    return (
                      <button
                        key={opt.level}
                        type="button"
                        onClick={() =>
                          setIntensity(isSelected ? undefined : opt.level)
                        }
                        style={{
                          backgroundColor: isSelected ? '#FFF1E4' : '#FFFFFF',
                          borderColor: isSelected ? '#EA580C' : '#E5DCCB',
                          color: isSelected ? '#C2410C' : '#29221E',
                        }}
                        className="p-2 rounded-xl border-[1.5px] text-left flex flex-col justify-between active:scale-95 transition min-h-[58px]"
                      >
                        <span className="text-[11px] font-black">{opt.title}</span>
                        <span className="text-[10px] text-[#786B63] leading-snug mt-1">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div className="text-[11.5px] text-[#786B63] bg-[#FAF6F0] border border-dashed border-[#D8CCB8] rounded-xl p-2.5 text-left">
                加註不影響經驗、出擊或傷害。可不填。
              </div>
            </div>
          )}
        </div>

        {/* Text Link: 我不舒服 */}
        <button
          type="button"
          onClick={handleUnwell}
          className="w-full text-center mt-3 text-xs font-black text-[#786B63] hover:text-[#29221E] underline cursor-pointer"
        >
          我不舒服
        </button>
      </div>
    </div>
  );
};
