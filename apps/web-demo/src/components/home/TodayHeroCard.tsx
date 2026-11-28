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
import { resolveTodayProgressHint } from '../../game/todayProgressHint';
import {
  formatTodaySessionSummary,
  getTodayHeroCardState,
} from '../../game/todayCardState';
import {
  canShowSkipEntry,
  getSkipTodayStatus,
} from '../../game/skipToday';
import {
  SkipChoiceSheet,
  RestConfirmSheet,
} from '../sheets/SkipTodaySheets';

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

  const skipStatus = getSkipTodayStatus(
    { restDayKeys: store.restDayKeys, caringDayKeys: store.caringDayKeys },
    todayKey
  );

  const cardState = getTodayHeroCardState({
    checkedIn,
    bossDone,
    daySessionsCount: daySessions.length,
    dayProgressMet: dayProgress.met,
    skipStatus,
  });

  const canShowSkip = canShowSkipEntry({
    cardState,
    status: skipStatus,
  });

  const [skipChoiceOpen, setSkipChoiceOpen] = useState(false);
  const [restConfirmOpen, setRestConfirmOpen] = useState(false);

  // T4-D5 既有「再 X 分鐘就算數」進度提示（progress 狀態且尚未達標時顯示，達標後消失）
  const showProgress = cardState === 'progress';

  // T1-D4: 對齊 D4a / D4b 進度提示面板模型（純函式計算）
  const progressHint = showProgress
    ? resolveTodayProgressHint({
        dayProgress,
        daySessions,
        now: nowMs,
      })
    : null;

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

  const handleScrollToRoom = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const mainEl =
        document.querySelector('main') ||
        document.querySelector('.overflow-y-auto') ||
        document.body;
      if (mainEl && 'scrollTo' in mainEl) {
        try {
          mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          // ignore
        }
      }
    }
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
          {cardState === 'rest' && (
            <span
              data-testid="today-rest-card"
              style={{
                backgroundColor: '#F3EEE4',
                color: '#6B5B4E',
                borderColor: '#E0D4C0',
              }}
              className="ml-1.5 text-[10.5px] font-extrabold px-1.5 py-0.2 rounded-full border"
            >
              休息日
            </span>
          )}
          {cardState === 'caring' && (
            <span
              data-testid="today-caring-card"
              style={{
                backgroundColor: '#FFF8F8',
                color: '#8E3B4C',
                borderColor: '#E9C9CF',
              }}
              className="ml-1.5 text-[10.5px] font-extrabold px-1.5 py-0.2 rounded-full border"
            >
              照顧身體中
            </span>
          )}
        </div>
        <div className="text-[17px] font-black leading-snug mt-0.5">
          {cardState === 'idle' && '今天還沒動，動一下就能出擊'}
          {cardState === 'progress' && (dayProgress.primary_hint || '今天還沒動，動一下就能出擊')}
          {cardState === 'ready' && '可以出擊了'}
          {cardState === 'sortied' && '今天已出擊，明天 00:00 再來'}
          {cardState === 'rest' && '今天休息，好好充電'}
          {cardState === 'caring' && '今天先照顧身體'}
        </div>
      </div>

      {/* Day Progress Hint (T1-D4 / T4-D5) */}
      {showProgress && progressHint && (
        <div
          data-testid="day-progress-hint"
          data-variant={progressHint.variant}
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#E5DCCB',
          }}
          className="rounded-xl border-[1.5px] p-2.5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-black text-[#29221E]">
              {progressHint.panelTitle}
            </span>
            <span
              style={{
                backgroundColor: '#F4EFE6',
                color: '#786B63',
                borderColor: '#E5DCCB',
              }}
              className="px-2 py-0.5 rounded-full border text-[10.5px] font-extrabold"
            >
              {progressHint.panelTag}
            </span>
          </div>

          {/* Segmented Progress Bar (10 for minutes, needed for sets) */}
          <div className="flex gap-[3px]">
            {Array.from({ length: progressHint.totalSegments }).map((_, idx) => {
              const isFilled = idx < progressHint.filledSegments;
              return (
                <div
                  key={idx}
                  style={{
                    background: isFilled
                      ? 'linear-gradient(180deg, #FDBA74, #EA580C)'
                      : '#EFE8DC',
                    borderColor: isFilled ? '#C2410C' : '#E5DCCB',
                  }}
                  className="flex-1 h-3 rounded-[3px] border"
                />
              );
            })}
          </div>

          {/* Subtext: Saved record summary + alt distance (T1-D4 / copy 56, 57) */}
          <div
            data-testid="day-progress-sub"
            className="text-[11.5px] text-[#786B63] leading-relaxed"
          >
            {progressHint.subText}
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
          restDayKeys={store.restDayKeys}
          caringDayKeys={store.caringDayKeys}
        />

        {/* Thin Level Bar (progress/rest/caring 狀態依規格隱藏；idle/ready/sortied 維持原樣) */}
        {cardState !== 'progress' && cardState !== 'rest' && cardState !== 'caring' && (
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
        )}
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

      {/* 4. Subtitle / Helper (idle only; progress 依 D4a/D4b 移除) */}
      {cardState === 'idle' && (
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

          {/* D3a: 單一合併次要入口「今天先不動・休息或不舒服」 */}
          {canShowSkip && (
            <button
              type="button"
              data-testid="today-skip-entry"
              onClick={() => setSkipChoiceOpen(true)}
              style={{
                backgroundColor: '#FFFDF8',
                borderColor: '#C4B39A',
                color: '#4A3B32',
                boxShadow: '0 2px 0 #E0D4C0',
              }}
              className="w-full min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[14px] border-[1.5px] text-[14px] font-extrabold active:translate-y-0.5 transition cursor-pointer leading-tight text-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#8A6A4E" className="shrink-0">
                <rect x="6" y="5" width="4.5" height="14" rx="1.2" />
                <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" />
              </svg>
              <span>今天先不動・休息或不舒服</span>
            </button>
          )}
        </div>
      )}

      {cardState === 'progress' && (
        <div className="space-y-2.5">
          {/* D4b 變體琥珀提示框（僅在 rest-rule 變體時顯示；只是組數還差時不顯示） */}
          {progressHint?.amberAlert && (
            <div
              data-testid="day-progress-rest-amber"
              style={{
                backgroundColor: '#FFF7E0',
                borderColor: '#F5D58A',
                color: '#7A4E00',
              }}
              className="rounded-xl border-[1.5px] p-2.5 text-[11.5px] font-bold leading-relaxed space-y-1"
            >
              <div>{progressHint.amberAlert.title}</div>
              {progressHint.amberAlert.lines.map((line, idx) => (
                <div key={idx}>・{line}</div>
              ))}
            </div>
          )}

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
            {progressHint?.ctaText || '繼續運動'}
          </button>

          {/* D4: 單一合併次要入口「今天先不動・休息或不舒服」 */}
          {canShowSkip && (
            <button
              type="button"
              data-testid="today-skip-entry"
              onClick={() => setSkipChoiceOpen(true)}
              style={{
                backgroundColor: '#FFFDF8',
                borderColor: '#C4B39A',
                color: '#4A3B32',
                boxShadow: '0 2px 0 #E0D4C0',
              }}
              className="w-full min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[14px] border-[1.5px] text-[14px] font-extrabold active:translate-y-0.5 transition cursor-pointer leading-tight text-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#8A6A4E" className="shrink-0">
                <rect x="6" y="5" width="4.5" height="14" rx="1.2" />
                <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" />
              </svg>
              <span>今天先不動・休息或不舒服</span>
            </button>
          )}
        </div>
      )}

      {/* D5b: 休息日卡 */}
      {cardState === 'rest' && (
        <div className="space-y-2.5">
          <div
            onClick={handleScrollToRoom}
            style={{
              backgroundColor: '#FFFDF8',
              borderColor: '#E5DCCB',
            }}
            className="rounded-xl border-[1.5px] p-2.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition"
          >
            <span className="text-[12.5px] font-extrabold text-[#29221E]">
              房間互動、問答照樣可以領
            </span>
            <span className="text-[12px] font-extrabold text-[#C2410C]">
              去房間
            </span>
          </div>

          <div className="text-center text-[11.5px] text-[#786B63] pt-1">
            想動一下也可以
          </div>

          <button
            type="button"
            data-testid="today-rest-log-workout"
            onClick={handleGoToWorkout}
            style={{
              backgroundColor: '#FFFDF8',
              borderColor: '#E5DCCB',
              color: '#5C4A3E',
              boxShadow: '0 3px 0 #E5DCCB',
            }}
            className="w-full py-2.5 rounded-xl border-[1.5px] text-[13px] font-black active:translate-y-0.5 transition cursor-pointer text-center"
          >
            記錄運動
          </button>

          <div className="text-center text-[11.5px] text-[#786B63]">
            今天不會跳提醒，隊友也不會催你
          </div>
        </div>
      )}

      {/* D6f: 照顧身體中卡 */}
      {cardState === 'caring' && (
        <div className="space-y-2.5">
          <div className="text-center text-[11.5px] text-[#786B63]">
            今天不會跳提醒，隊友也不會催你。
          </div>

          <div
            style={{
              backgroundColor: '#FFF1F2',
              borderColor: '#FECDD3',
              color: '#9F1239',
            }}
            className="rounded-xl border border-dashed p-2.5 text-[12px] font-extrabold text-center leading-relaxed"
          >
            如果胸痛、呼吸困難或快昏倒，請立即撥打 119。
          </div>

          <button
            type="button"
            data-testid="today-caring-room"
            onClick={handleScrollToRoom}
            style={{
              backgroundColor: '#FFFDF8',
              borderColor: '#E5DCCB',
              color: '#5C4A3E',
              boxShadow: '0 3px 0 #E5DCCB',
            }}
            className="w-full py-2.5 rounded-xl border-[1.5px] text-[13px] font-black active:translate-y-0.5 transition cursor-pointer text-center"
          >
            房間互動
          </button>
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

      {/* Skip today sheets (Choice & Rest Confirm) */}
      <SkipChoiceSheet
        isOpen={skipChoiceOpen}
        onClose={() => setSkipChoiceOpen(false)}
        onSelectUnwell={() => {
          setSkipChoiceOpen(false);
          store.setUnwellSheetOpen(true);
        }}
        onSelectRest={() => {
          setSkipChoiceOpen(false);
          setRestConfirmOpen(true);
        }}
      />

      <RestConfirmSheet
        isOpen={restConfirmOpen}
        onClose={() => setRestConfirmOpen(false)}
        onBack={() => {
          setRestConfirmOpen(false);
          setSkipChoiceOpen(true);
        }}
        onConfirm={() => {
          store.markRestDayToday();
          setRestConfirmOpen(false);
        }}
      />
    </div>
  );
};
