import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { xpToNext } from '../../config/economy';
import { formatResetCountdown, getLocalDayKey } from '../../game/day';
import { WeekStrip } from './WeekStrip';
import {
  accumulateDayProgress,
  formatAltDistanceHint,
  getSessionDayKey,
} from '../../game/dayProgress';
import {
  formatTodaySessionSummary,
  getTodayHeroCardState,
} from '../../game/todayCardState';

export interface TodayHeroCardProps {
  now?: number | Date;
}

export const TodayHeroCard: React.FC<TodayHeroCardProps> = ({ now: propNow }) => {
  const store = useGameStore();
  const [, setTick] = useState(0);

  // 定期 30 秒觸發更新，確保倒數計時與進度隨時間推進更新
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  // 從其他分頁切換回「房間」(home) 時立即觸發更新，確保時間緊跟當下
  useEffect(() => {
    if (store.activeTab === 'home') {
      setTick((t) => t + 1);
    }
  }, [store.activeTab]);

  const nowMs =
    propNow !== undefined
      ? typeof propNow === 'number'
        ? propNow
        : propNow.getTime()
      : Date.now();

  const checkedIn = store.isCheckedInToday(nowMs);
  const bossDone = store.isBossDoneToday(nowMs);
  const damageInfo = store.getDamageInfo(nowMs);
  const nextResetAt = store.getNextResetAt(nowMs);

  const level = store.level;
  const exp = store.exp;
  const maxExp = xpToNext(level);
  const expPercent = Math.min(100, Math.max(0, (exp / maxExp) * 100));

  // T4-D5: 當天累加進度即時計算 (純函式，傳入 nowMs)
  const todayKey = getLocalDayKey(nowMs);
  const daySessions = store.workoutHistory.filter(
    (s, idx) => getSessionDayKey(s, idx, nowMs) === todayKey
  );
  const dayProgress = accumulateDayProgress(store.workoutHistory, {
    dayKey: todayKey,
    now: nowMs,
  });

  const cardState = getTodayHeroCardState({
    checkedIn,
    bossDone,
    daySessionsCount: daySessions.length,
    dayProgressMet: dayProgress.met,
  });

  // T4-D5 既有「再 X 分鐘就算數」進度提示（progress 狀態且尚未達標時顯示，達標後消失）
  const showProgress = cardState === 'progress';

  // Teammates who worked out today
  const activeTeammates = store.squadMembers.filter(
    (m) => m.hasWorkedOutToday && !m.isSuspectedCheater
  );

  const handleGoToWorkout = () => {
    store.requestWithDisclaimer(() => {
      store.setActiveTab('workout');
    });
  };

  const handleGoToAdventure = () => {
    store.setActiveTab('plaza');
  };

  const handleRestClick = () => {
    // 休息確認與休息日卡歸 T1-D5，本單只放 D3a 入口但不發明 D5 文案／狀態
    store.showToast('休息也是訓練的一部分');
  };

  const handleUnwellClick = () => {
    store.setUnwellSheetOpen(true);
  };

  const todaySummary = cardState === 'ready' ? formatTodaySessionSummary(daySessions) : null;

  return (
    <div
      style={{
        backgroundColor: '#FFFDF8',
        borderColor: '#E5DCCB',
        boxShadow: '0 4px 0 #D8CCB8',
      }}
      className="rounded-2xl border-[1.5px] p-3.5 space-y-3 text-[#29221E]"
      data-testid="today-hero-card"
      data-state={cardState}
    >
      {/* 1. Header & State Title */}
      <div>
        <div className="flex items-center text-[11.5px] font-extrabold text-[#786B63]">
          <span>今天</span>
          {(cardState === 'ready' || cardState === 'sortied') && (
            <span
              style={{
                backgroundColor: '#E8F5EE',
                color: '#0F7A55',
                borderColor: '#B9E3CF',
              }}
              className="ml-1.5 text-[10.5px] font-extrabold px-1.5 py-0.2 rounded-full border"
            >
              今日已打卡
            </span>
          )}
        </div>
        <div className="text-[17px] font-black leading-snug mt-0.5">
          {cardState === 'idle' && '今天還沒動，動一下就能出擊'}
          {cardState === 'progress' && (dayProgress.primary_hint || '今天還沒動，動一下就能出擊')}
          {cardState === 'ready' && '可以出擊了'}
          {cardState === 'sortied' && '今天已出擊，明天 00:00 再來'}
        </div>
      </div>

      {/* Day Progress Hint (T1-D4 / T4-D5) */}
      {showProgress && (
        <div
          data-testid="day-progress-hint"
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#E5DCCB',
          }}
          className="rounded-xl border-[1.5px] p-2.5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-black text-[#29221E]">
              今天的運動 {Math.min(10, dayProgress.minutes_done)}／10 分
            </span>
            <span
              style={{
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                borderColor: '#F5C45A',
              }}
              className="px-1.5 py-0.5 rounded-md border text-[10.5px] font-black"
            >
              可以累加
            </span>
          </div>

          {/* 10-segment Progress Bar */}
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, idx) => {
              const isFilled = idx < dayProgress.minutes_done;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: isFilled ? '#EA580C' : '#EFE8DC',
                    borderColor: isFilled ? '#C2410C' : '#E5DCCB',
                  }}
                  className="flex-1 h-2.5 rounded-[3px] border"
                />
              );
            })}
          </div>

          {/* Subtext: primary hint + alt distance secondary hint */}
          <div className="text-[12px] text-[#786B63] leading-relaxed">
            {dayProgress.primary_hint && (
              <span className="font-black text-[#C2410C] mr-1">
                {dayProgress.primary_hint}
              </span>
            )}
            {dayProgress.alt_distance && dayProgress.alt_distance.remaining_m > 0 && (
              <span className="text-[#786B63]">
                {dayProgress.primary_hint ? '・' : ''}
                {formatAltDistanceHint(dayProgress.alt_distance)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. Embedded Info Box: Today's Summary (ready only) + Damage Multiplier + WeekStrip + Thin Level Bar */}
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="rounded-xl border-[1.5px] p-2.5 space-y-2"
      >
        {/* D3b: Ready state workout summary tags (有資料才顯示) */}
        {todaySummary && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              style={{
                backgroundColor: '#F4EFE6',
                color: '#786B63',
                borderColor: '#E5DCCB',
              }}
              className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-md border"
            >
              {todaySummary.primaryLabel}
            </span>
            {todaySummary.additionalCount > 0 && (
              <span
                style={{
                  backgroundColor: '#F4EFE6',
                  color: '#786B63',
                  borderColor: '#E5DCCB',
                }}
                className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-md border"
              >
                +{todaySummary.additionalCount} 筆
              </span>
            )}
          </div>
        )}

        {/* Damage line */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13.5px] font-black text-[#29221E]">
            本週動了 {damageInfo.daysThisWeek} 天，傷害 ×{damageInfo.damageMultiplier.toFixed(1)}
          </span>
          {damageInfo.isRookieFloor && (
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

        {/* WeekStrip Mon–Sun */}
        <WeekStrip
          checkinDayKeys={store.checkinDayKeys}
          joinDayKey={store.joinDayKey}
          now={nowMs}
          showRookieNote={true}
        />

        {/* Thin Level Bar */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-extrabold shrink-0 text-[#29221E]">
            Lv.{level}
          </span>
          <div
            style={{ backgroundColor: '#EFE8DC' }}
            className="flex-1 h-2 rounded-full overflow-hidden relative"
          >
            <div
              style={{
                width: `${expPercent}%`,
                background: 'linear-gradient(90deg, #FB923C, #EA580C)',
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
          <span className="text-[11px] text-[#786B63] font-mono shrink-0">
            {exp}/{maxExp}
          </span>
        </div>
      </div>

      {/* 3. Teammate Row (ready / sortied 保留；idle / progress 依 D3a 隱藏) */}
      {(cardState === 'ready' || cardState === 'sortied') && (
        <div
          onClick={handleGoToAdventure}
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#E5DCCB',
          }}
          className="cursor-pointer rounded-xl border-[1.5px] p-2 flex items-center justify-between gap-2 active:scale-[0.99] transition"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold text-[#786B63]">隊友今天</div>
            {store.squadMembers.length === 0 ? (
              <div className="text-[11.5px] text-[#786B63] mt-0.5">
                隊伍尚無隊友，邀請朋友一起打
              </div>
            ) : activeTeammates.length > 0 ? (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center -space-x-1">
                  {activeTeammates.slice(0, 3).map((m, idx) => {
                    const colors = ['#FDE68A', '#BBF7D0', '#FED7AA'];
                    const initial = m.nameZh.trim().charAt(0) || '友';
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          backgroundColor: colors[idx % colors.length],
                          borderColor: '#E5DCCB',
                          color: '#5C4333',
                        }}
                        className="w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center text-[10px] font-black shadow-xs"
                      >
                        {initial}
                      </div>
                    );
                  })}
                </div>
                <span className="text-[11.5px] text-[#786B63]">
                  {activeTeammates.length} 位也打卡了
                </span>
              </div>
            ) : (
              <div className="text-[11.5px] text-[#786B63] mt-0.5">
                查看隊友
              </div>
            )}
          </div>
          <span className="text-[12px] font-black text-[#C2410C] shrink-0">
            {store.squadMembers.length === 0 ? '邀請' : '查看'}
          </span>
        </div>
      )}

      {/* 4. Subtitle / Helper (idle & progress) */}
      {(cardState === 'idle' || cardState === 'progress') && (
        <div className="text-center text-[11.5px] text-[#786B63] pt-0.5">
          任何運動都算，一天加起來滿 10 分鐘就算數
        </div>
      )}

      {/* 5. Actions / CTAs per state */}
      {cardState === 'idle' && (
        <div className="space-y-2.5">
          <button
            type="button"
            data-testid="today-cta-workout"
            onClick={handleGoToWorkout}
            style={{
              background: 'linear-gradient(#FB923C, #EA580C)',
              boxShadow: '0 4px 0 #B8460A',
            }}
            className="w-full py-3 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition cursor-pointer"
          >
            去運動
          </button>

          {/* D3a: 次要小按鈕「今天休息」「我不舒服」 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="today-chip-rest"
              onClick={handleRestClick}
              style={{
                backgroundColor: '#FFFDF8',
                borderColor: '#E5DCCB',
                color: '#5C4A3E',
                boxShadow: '0 2px 0 #E5DCCB',
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border-[1.5px] text-[12.5px] font-extrabold active:translate-y-0.5 transition cursor-pointer"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8A6A4E"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 9h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5z" fill="#F5E6CC" />
                <path d="M16 11h2a2 2 0 010 4h-2M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4" />
              </svg>
              <span>今天休息</span>
            </button>

            <button
              type="button"
              data-testid="today-chip-unwell"
              onClick={handleUnwellClick}
              style={{
                backgroundColor: '#FFF8F8',
                borderColor: '#EBD3D8',
                color: '#8E3B4C',
                boxShadow: '0 2px 0 #E5DCCB',
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border-[1.5px] text-[12.5px] font-extrabold active:translate-y-0.5 transition cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#E8A3B0"
                stroke="#8E3B4C"
                strokeWidth="1.6"
              >
                <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
              </svg>
              <span>我不舒服</span>
            </button>
          </div>
        </div>
      )}

      {cardState === 'progress' && (
        <div className="space-y-2.5">
          <button
            type="button"
            data-testid="today-cta-continue"
            onClick={handleGoToWorkout}
            style={{
              background: 'linear-gradient(#FB923C, #EA580C)',
              boxShadow: '0 4px 0 #B8460A',
            }}
            className="w-full py-3 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition cursor-pointer"
          >
            繼續運動
          </button>

          {/* D4: 次要小按鈕「今天休息」「我不舒服」 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="today-chip-rest"
              onClick={handleRestClick}
              style={{
                backgroundColor: '#FFFDF8',
                borderColor: '#E5DCCB',
                color: '#5C4A3E',
                boxShadow: '0 2px 0 #E5DCCB',
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border-[1.5px] text-[12.5px] font-extrabold active:translate-y-0.5 transition cursor-pointer"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8A6A4E"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 9h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5z" fill="#F5E6CC" />
                <path d="M16 11h2a2 2 0 010 4h-2M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4" />
              </svg>
              <span>今天休息</span>
            </button>

            <button
              type="button"
              data-testid="today-chip-unwell"
              onClick={handleUnwellClick}
              style={{
                backgroundColor: '#FFF8F8',
                borderColor: '#EBD3D8',
                color: '#8E3B4C',
                boxShadow: '0 2px 0 #E5DCCB',
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border-[1.5px] text-[12.5px] font-extrabold active:translate-y-0.5 transition cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#E8A3B0"
                stroke="#8E3B4C"
                strokeWidth="1.6"
              >
                <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
              </svg>
              <span>我不舒服</span>
            </button>
          </div>
        </div>
      )}

      {cardState === 'ready' && (
        <div className="space-y-2">
          <button
            type="button"
            data-testid="today-cta-sortie"
            onClick={handleGoToAdventure}
            style={{
              background: 'linear-gradient(#34D399, #10B981)',
              boxShadow: '0 4px 0 #0B8A60',
              color: '#0F2A1E',
            }}
            className="w-full py-3 rounded-2xl font-black text-base active:translate-y-0.5 transition cursor-pointer"
          >
            去出擊
          </button>
          <div className="text-center text-[11.5px] text-[#786B63]">
            還想動？
            <button
              type="button"
              data-testid="today-link-log-again"
              onClick={handleGoToWorkout}
              className="font-bold text-[#C2410C] hover:underline cursor-pointer mx-0.5"
            >
              再記一筆運動
            </button>
            （今天的獎勵已領）
          </div>
        </div>
      )}

      {cardState === 'sortied' && (
        <div className="space-y-1.5 pt-1">
          <div className="text-center text-[12px] font-bold text-[#786B63]">
            {formatResetCountdown(nextResetAt, nowMs)}
          </div>
          <div className="text-center text-[11.5px] text-[#786B63]">
            <button
              type="button"
              data-testid="today-link-log-again"
              onClick={handleGoToWorkout}
              className="font-bold text-[#C2410C] hover:underline cursor-pointer mr-0.5"
            >
              再記一筆運動
            </button>
            ・只存紀錄
          </div>
        </div>
      )}
    </div>
  );
};
