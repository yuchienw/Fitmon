import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { xpToNext } from '../../config/economy';
import { formatResetCountdown } from '../../game/day';
import { WeekStrip } from './WeekStrip';

export const TodayHeroCard: React.FC = () => {
  const store = useGameStore();
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Refresh every 30s as specified
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const checkedIn = store.isCheckedInToday(nowMs);
  const bossDone = store.isBossDoneToday(nowMs);
  const damageInfo = store.getDamageInfo(nowMs);
  const nextResetAt = store.getNextResetAt(nowMs);

  const level = store.level;
  const exp = store.exp;
  const maxExp = xpToNext(level);
  const expPercent = Math.min(100, Math.max(0, (exp / maxExp) * 100));

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
            ? '今天還沒動，動一下就能出擊'
            : !bossDone
            ? '可以出擊了'
            : '今天已出擊，明天 00:00 再來'}
        </div>
      </div>

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
          {activeTeammates.length > 0 ? (
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
          查看
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
