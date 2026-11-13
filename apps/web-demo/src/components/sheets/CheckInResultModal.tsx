import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { WeekStrip } from '../home/WeekStrip';

export const CheckInResultModal: React.FC = () => {
  const store = useGameStore();
  const result = store.checkinResult;

  if (!result) return null;

  const handleGoToAdventure = () => {
    store.setCheckinResult(null);
    store.setActiveTab('plaza');
  };

  const handleClose = () => {
    store.setCheckinResult(null);
  };

  const {
    xpGained,
    levelBefore,
    levelAfter,
    expBefore,
    expAfter,
    xpToNextBefore,
    xpToNextAfter,
    leveledUp,
    daysThisWeek,
    damageMultiplier,
    isRookieFloor,
  } = result;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#29221E]/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          background: leveledUp
            ? 'radial-gradient(circle at 50% 30%, #FFE7B8 0%, #FFF3DC 42%, #F5E6C8 100%)'
            : 'linear-gradient(180deg, #FFF8EC 0%, #F5E6C8 100%)',
          borderColor: '#E5DCCB',
          boxShadow: '0 4px 0 #D8CCB8',
        }}
        className="relative w-full max-w-[390px] rounded-3xl border-[1.5px] p-4 text-[#29221E] shadow-2xl overflow-hidden"
        data-testid="checkin-result-modal"
      >
        {/* Subtle decorative stars for level up */}
        {leveledUp && (
          <div className="absolute inset-0 pointer-events-none">
            <svg
              className="absolute left-6 top-8 w-4 h-4 text-[#F59E0B]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2.2l2.5 7.1H22l-6 4.4 2.3 7.1L12 16.6 5.7 20.8 8 13.7 2 9.3h7.5z" />
            </svg>
            <svg
              className="absolute right-8 top-10 w-4 h-4 text-[#F59E0B]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2.2l2.5 7.1H22l-6 4.4 2.3 7.1L12 16.6 5.7 20.8 8 13.7 2 9.3h7.5z" />
            </svg>
            <svg
              className="absolute left-10 top-20 w-2.5 h-2.5 text-[#FBBF24]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2.2l2.5 7.1H22l-6 4.4 2.3 7.1L12 16.6 5.7 20.8 8 13.7 2 9.3h7.5z" />
            </svg>
            <svg
              className="absolute right-12 top-24 w-3 h-3 text-[#FBBF24]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2.2l2.5 7.1H22l-6 4.4 2.3 7.1L12 16.6 5.7 20.8 8 13.7 2 9.3h7.5z" />
            </svg>
          </div>
        )}

        {/* Title & Subtitle */}
        <div className="text-center pt-1">
          <h2
            style={{ color: leveledUp ? '#C2410C' : '#29221E' }}
            className="text-2xl font-black tracking-wide"
          >
            {leveledUp ? `升上 Lv.${levelAfter}！` : '打卡成功'}
          </h2>
          <p className="text-xs text-[#786B63] font-bold mt-0.5">有動就算數</p>
        </div>

        {/* XP Tag pill */}
        <div className="my-3 text-center">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FFF1E4] text-[#C2410C] border border-[#FED7AA] text-xs font-black">
            今日打卡
          </span>
          <div className="text-2xl font-black text-[#C2410C] mt-1 font-mono flex items-center justify-center gap-2">
            <span>+{xpGained} XP</span>
            {result.coinsGranted !== undefined && result.coinsGranted > 0 && (
              <span className="text-base font-bold text-amber-600 font-sans">
                +{result.coinsGranted} 🪙
              </span>
            )}
          </div>
        </div>

        {/* Level Progression & Weekstrip Details Card */}
        <div
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#E5DCCB',
          }}
          className="rounded-2xl border-[1.5px] p-3 space-y-2.5 shadow-sm text-left"
        >
          {leveledUp ? (
            /* Before/After Bars for Level-Up */
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-[#786B63] w-9">
                  Lv.{levelBefore}
                </span>
                <div className="flex-1 h-2 bg-[#EFE8DC] rounded-full overflow-hidden">
                  <div
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #FB923C, #EA580C)',
                    }}
                    className="h-full rounded-full"
                  />
                </div>
                <span className="text-[11px] text-[#786B63] font-mono shrink-0">
                  {xpToNextBefore}/{xpToNextBefore}
                </span>
              </div>

              <div className="text-center text-xs text-[#C2410C] font-black leading-none py-0.5">
                ↓
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#29221E] w-9">
                  Lv.{levelAfter}
                </span>
                <div className="flex-1 h-2 bg-[#EFE8DC] rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, (expAfter / xpToNextAfter) * 100)}%`,
                      background: 'linear-gradient(90deg, #FB923C, #EA580C)',
                    }}
                    className="h-full rounded-full"
                  />
                </div>
                <span className="text-[11px] text-[#786B63] font-mono shrink-0">
                  {expAfter}/{xpToNextAfter}
                </span>
              </div>
            </div>
          ) : (
            /* Advancing Bar for Normal Check-in */
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-[#29221E]">
                  Lv.{levelAfter}
                </span>
                <div className="flex-1 h-2.5 bg-[#EFE8DC] rounded-full overflow-hidden relative">
                  {/* Prior progress */}
                  <div
                    style={{
                      width: `${Math.min(100, (expBefore / xpToNextAfter) * 100)}%`,
                      backgroundColor: '#FDBA74',
                    }}
                    className="h-full absolute left-0 top-0 rounded-l-full"
                  />
                  {/* New progress */}
                  <div
                    style={{
                      left: `${Math.min(100, (expBefore / xpToNextAfter) * 100)}%`,
                      width: `${Math.min(100, (xpGained / xpToNextAfter) * 100)}%`,
                      background: 'linear-gradient(90deg, #FB923C, #EA580C)',
                    }}
                    className="h-full absolute top-0 rounded-r-full"
                  />
                </div>
                <span className="text-[11px] text-[#786B63] font-mono shrink-0">
                  {expAfter}/{xpToNextAfter}
                </span>
              </div>
              <div className="text-[11px] text-[#786B63] mt-1 font-mono">
                {expBefore} → {expAfter}
              </div>
            </div>
          )}

          {/* Status: 可以出擊了 */}
          <div className="pt-1">
            <span className="text-[15px] font-black text-[#0F7A55]">
              可以出擊了
            </span>
          </div>

          {/* Damage line */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13.5px] font-black text-[#29221E]">
              本週動了 {daysThisWeek} 天，傷害 ×{damageMultiplier.toFixed(1)}
            </span>
            {isRookieFloor && (
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderColor: '#F5C45A',
                }}
                className="px-1.5 py-0.2 rounded-full border text-[10px] font-black"
              >
                新手週保底
              </span>
            )}
          </div>

          {/* WeekStrip */}
          <WeekStrip
            checkinDayKeys={store.checkinDayKeys}
            joinDayKey={store.joinDayKey}
            showRookieNote={true}
          />
        </div>

        {/* Primary CTA: 去出擊 */}
        <button
          type="button"
          onClick={handleGoToAdventure}
          style={{
            background: 'linear-gradient(#34D399, #10B981)',
            boxShadow: '0 4px 0 #0B8A60',
            color: '#0F2A1E',
          }}
          className="mt-3.5 w-full py-3.5 rounded-2xl font-black text-base active:translate-y-0.5 transition"
        >
          去出擊
        </button>
      </div>
    </div>
  );
};
