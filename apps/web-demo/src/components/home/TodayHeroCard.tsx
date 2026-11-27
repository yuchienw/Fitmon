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

  // 進度與顯示用的基準時間：優先使用傳入的 now，若無則在渲染時讀取 Date.now()
  // 避免卡在元件第一次 mount 的 Date.now()，時鐘推進後可精準對應日期
  // 純函式 accumulateDayProgress 不在內部呼叫 Date.now()，由呼叫端傳入 nowMs
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

  // 只要當天還沒達到 T4-D5 門檻（!dayProgress.met）且當天有紀錄（daySessions.length > 0），
  // 就顯示進度提示，不要再用 !checkedIn 擋住。達標（met === true）後區塊仍要消失。
  const showProgress = !dayProgress.met && daySessions.length > 0;

  // Teammates who worked out today
  const activeTeammates = store.squadMembers.filter(
    (m) => m.hasWorkedOutToday && !m.isSuspectedCheater
  );

  const handleCheckinClick = () => {
    if (store.disclaimerAcceptedAt === null) {
      store.setDisclaimerOpen(true);
    } else {
      store.setCheckinSheetOpen(true);
    }
  };

  const handleGoToAdventure = () => {
    store.setActiveTab('plaza');
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFDF8',
        borderColor: '#E5DCCB',
        boxShadow: '0 4px 0 #D8CCB8',
      }}
      className="rounded-2xl border-[1.5px] p-3.5 space-y-3 text-[#29221E]"
      data-testid="today-hero-card"
    >
      {/* 1. Header & State Title */}
      <div>
        <div className="text-[11.5px] font-extrabold text-[#786B63]">今天</div>
        <div className="text-[17px] font-black leading-snug mt-0.5">
          {!checkedIn
            ? showProgress && dayProgress.primary_hint
              ? dayProgress.primary_hint
              : '今天還沒動，動一下就能出擊'
            : !bossDone
            ? '可以出擊了'
            : '今天已出擊，明天 00:00 再來'}
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

      {/* 2. Embedded Info Box: Damage Multiplier + WeekStrip + Thin Level Bar */}
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
        }}
        className="rounded-xl border-[1.5px] p-2.5 space-y-2"
      >
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

      {/* 3. Teammate Row */}
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

      {/* 4. Subtitle / Helper / Countdown */}
      <div className="text-center text-[11.5px] text-[#786B63]">
        {!checkedIn ? (
          '有動就算數，散步也算、5 分鐘也算'
        ) : !bossDone ? (
          '今天已打卡，出擊 1 次，午夜重置'
        ) : (
          formatResetCountdown(nextResetAt, nowMs)
        )}
      </div>

      {/* 5. Buttons */}
      {!checkedIn ? (
        <div className="flex items-center gap-2">
          {/* Primary: 打卡 */}
          <button
            type="button"
            onClick={handleCheckinClick}
            style={{
              background: 'linear-gradient(#FB923C, #EA580C)',
              boxShadow: '0 4px 0 #B8460A',
            }}
            className="flex-[1.5] py-2.5 rounded-xl text-white font-black text-sm active:translate-y-0.5 transition"
          >
            打卡
          </button>

          {/* Secondary outlined: 出擊 (never locked, opens checkin sheet) */}
          <button
            type="button"
            onClick={handleCheckinClick}
            style={{
              backgroundColor: '#FFFDF8',
              borderColor: '#EA580C',
              color: '#C2410C',
              boxShadow: '0 3px 0 #E7C4A8',
            }}
            className="flex-1 py-2.5 rounded-xl border-[1.5px] font-black text-sm active:translate-y-0.5 transition"
          >
            出擊
          </button>
        </div>
      ) : !bossDone ? (
        <button
          type="button"
          onClick={handleGoToAdventure}
          style={{
            background: 'linear-gradient(#34D399, #10B981)',
            boxShadow: '0 4px 0 #0B8A60',
            color: '#0F2A1E',
          }}
          className="w-full py-2.5 rounded-xl font-black text-sm active:translate-y-0.5 transition"
        >
          去出擊
        </button>
      ) : null}
    </div>
  );
};
