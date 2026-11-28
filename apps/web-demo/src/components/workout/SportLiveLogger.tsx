import React, { useState, useEffect, useRef } from 'react';
import { useGameStore, ActiveSportSessionDraft } from '../../stores/useGameStore';
import { getSportIcon, getSportName } from './SportTypePicker';
import { getLocalDayKey } from '../../game/day';
import { accumulateDayProgress, getSessionDayKey } from '../../game/dayProgress';
import { computeActiveDurationSec } from '../../game/sportLiveTiming';

export { computeActiveDurationSec } from '../../game/sportLiveTiming';
export type { ComputeActiveDurationOptions, PauseSegment } from '../../game/sportLiveTiming';

interface SportLiveLoggerProps {
  draft: ActiveSportSessionDraft;
  onFinish: (completedDraft: ActiveSportSessionDraft) => void;
}

export function formatSecondsToMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatRemainingTimeNotice(remainingSec: number): string {
  if (remainingSec <= 0) return '今天算數了！';
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  if (m === 0) {
    return `再 ${s} 秒就算數`;
  }
  if (s === 0) {
    return `再 ${m} 分鐘就算數`;
  }
  return `再 ${m} 分 ${s} 秒就算數`;
}

export const SportLiveLogger: React.FC<SportLiveLoggerProps> = ({ draft, onFinish }) => {
  const store = useGameStore();

  const [isPaused, setIsPaused] = useState<boolean>(() => draft.isPaused || false);
  const [pauseSegments, setPauseSegments] = useState<{ startedAt: number; endedAt: number }[]>(
    () => draft.pauseSegments || []
  );
  const pauseStartedAtRef = useRef<number | null>(
    draft.isPaused && draft.pausedAt ? draft.pausedAt : null
  );

  const [activeDurationSec, setActiveDurationSec] = useState<number>(() =>
    computeActiveDurationSec({
      startedAt: draft.startedAt,
      now: Date.now(),
      pauseSegments: draft.pauseSegments || [],
      currentPauseStartedAt: draft.isPaused && draft.pausedAt ? draft.pausedAt : null,
    })
  );
  const [distanceM, setDistanceM] = useState<number>(draft.distanceM || 0);
  const [hiitExercises, setHiitExercises] = useState<string[]>(
    draft.exerciseList || ['開合跳', '深蹲', '登山者', '伏地挺身']
  );
  const [newHiitExercise, setNewHiitExercise] = useState('');
  const [isAddingHiit, setIsAddingHiit] = useState(false);

  const poolLengthM = draft.poolLengthM || (draft.venue === 'pool_50' ? 50 : 25);

  // Active workout timer ticking: display ticker only, re-reads Date.now()
  useEffect(() => {
    if (isPaused) return;

    const tick = () => {
      setActiveDurationSec(
        computeActiveDurationSec({
          startedAt: draft.startedAt,
          now: Date.now(),
          pauseSegments,
          currentPauseStartedAt: null,
        })
      );
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        tick();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      window.clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [isPaused, draft.startedAt, pauseSegments]);

  // Handle Pause / Resume
  const handleTogglePause = () => {
    const now = Date.now();
    if (!isPaused) {
      // Pause
      pauseStartedAtRef.current = now;
      setIsPaused(true);
      setActiveDurationSec(
        computeActiveDurationSec({
          startedAt: draft.startedAt,
          now,
          pauseSegments,
          currentPauseStartedAt: now,
        })
      );
    } else {
      // Resume
      let nextPauseSegments = pauseSegments;
      if (pauseStartedAtRef.current) {
        nextPauseSegments = [
          ...pauseSegments,
          { startedAt: pauseStartedAtRef.current, endedAt: now },
        ];
        setPauseSegments(nextPauseSegments);
        pauseStartedAtRef.current = null;
      }
      setIsPaused(false);
      setActiveDurationSec(
        computeActiveDurationSec({
          startedAt: draft.startedAt,
          now,
          pauseSegments: nextPauseSegments,
          currentPauseStartedAt: null,
        })
      );
    }
  };

  // Handle Unwell
  const handleUnwell = () => {
    const now = Date.now();
    if (!isPaused) {
      pauseStartedAtRef.current = now;
      setIsPaused(true);
      setActiveDurationSec(
        computeActiveDurationSec({
          startedAt: draft.startedAt,
          now,
          pauseSegments,
          currentPauseStartedAt: now,
        })
      );
    }
    store.setUnwellSheetOpen(true);
  };

  // Handle Swim Lap Add
  const handleAddSwimLap = () => {
    setDistanceM((prev) => prev + poolLengthM);
  };

  // Handle Finish
  const handleEnd = () => {
    const now = Date.now();
    let finalPauseSegments = [...pauseSegments];
    if (isPaused && pauseStartedAtRef.current) {
      finalPauseSegments.push({
        startedAt: pauseStartedAtRef.current,
        endedAt: now,
      });
    }

    const durationSec = computeActiveDurationSec({
      startedAt: draft.startedAt,
      now,
      pauseSegments: finalPauseSegments,
      currentPauseStartedAt: null,
    });

    const completed: ActiveSportSessionDraft = {
      ...draft,
      durationSec,
      distanceM: distanceM,
      pauseSegments: finalPauseSegments,
      isPaused: false,
      exerciseList: draft.sportType === 'circuit_hiit' ? hiitExercises : undefined,
    };

    onFinish(completed);
  };

  // Progress computation
  const nowMs = Date.now();
  const todayKey = getLocalDayKey(nowMs);
  const priorSessions = store.workoutHistory.filter(
    (s, idx) => getSessionDayKey(s, idx, nowMs) === todayKey
  );

  // Simulated session for accumulateDayProgress
  const tempLiveSession = {
    id: 'live_temp',
    timestamp: nowMs,
    sportType: draft.sportType,
    durationSec: activeDurationSec,
    durationMinutes: Math.floor(activeDurationSec / 60),
    distanceM: distanceM > 0 ? distanceM : undefined,
    totalSets: 0,
    countsTowardCheckin: true,
  };

  const dayProgress = accumulateDayProgress([tempLiveSession, ...store.workoutHistory], {
    dayKey: todayKey,
    now: nowMs,
  });

  // Calculate remaining seconds for this session
  // Threshold is 10 minutes (600s) of total movement today, or sport-specific distance
  const priorMinutesDone = accumulateDayProgress(store.workoutHistory, {
    dayKey: todayKey,
    now: nowMs,
  }).minutes_done;

  const neededSecFromThisSession = Math.max(0, (10 - priorMinutesDone) * 60);
  const remainingSecFromTime = Math.max(0, neededSecFromThisSession - activeDurationSec);

  // Check if distance met
  let isDistanceMet = false;
  let remainingDistanceM = 0;
  if (draft.sportType === 'swim') {
    isDistanceMet = distanceM >= 200;
    remainingDistanceM = Math.max(0, 200 - distanceM);
  } else if (draft.sportType === 'run' || draft.sportType === 'walk') {
    isDistanceMet = distanceM >= 1000;
    remainingDistanceM = Math.max(0, 1000 - distanceM);
  } else if (draft.sportType === 'cycle') {
    isDistanceMet = distanceM >= 3000;
    remainingDistanceM = Math.max(0, 3000 - distanceM);
  }

  const isMet = dayProgress.met || isDistanceMet || remainingSecFromTime === 0;

  // Background and Hero
  const getCanvasBg = () => {
    switch (draft.sportType) {
      case 'run':
        return '/t4-d4/px-track.png';
      case 'walk':
      case 'custom':
        return '/t4-d4/px-field.png';
      case 'swim':
        return '/t4-d4/px-pool.png';
      case 'cycle':
        return '/t4-d4/px-road.png';
      case 'yoga_stretch':
        return '/t4-d4/px-yoga.png';
      case 'circuit_hiit':
        return '/t4-d4/px-gym.png';
      case 'ball':
        return '/t4-d4/px-court.png';
      default:
        return '/t4-d4/px-track.png';
    }
  };

  const getHeroImg = () => {
    if (draft.sportType === 'swim' || draft.sportType === 'yoga_stretch') {
      return '/t4-d4/hero-idle.png';
    }
    return '/t4-d4/hero-charged.png';
  };

  const getVenueTitleSuffix = () => {
    if (draft.venue === 'outdoor') return '・戶外';
    if (draft.venue === 'treadmill') return '・跑步機';
    if (draft.venue === 'indoor_bike') return '・室內飛輪';
    if (draft.sportType === 'swim') return `・泳池 ${poolLengthM} 公尺`;
    return '';
  };

  return (
    <div data-testid="sport-live" className="p-3.5 space-y-3 text-[#29221E] pb-10">
      {/* 1. Focus Top Header */}
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
          boxShadow: '0 3px 0 #D8CCB8',
        }}
        className="rounded-2xl border-[1.5px] p-2.5 flex items-center gap-2.5"
      >
        <img
          src={getSportIcon(draft.sportType)}
          alt=""
          className="h-8 max-w-[44px] object-contain shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-extrabold text-[#0F7A55]">
            {isPaused ? '暫停中' : '紀錄中'}
          </div>
          <div className="font-black text-[14px] leading-tight text-[#29221E] truncate">
            {getSportName(draft.sportType)}
            {getVenueTitleSuffix()}
          </div>
        </div>

        {/* Unwell Plum Capsule */}
        <button
          type="button"
          data-testid="sport-live-unwell"
          onClick={handleUnwell}
          style={{
            borderColor: '#E9C9CF',
            backgroundColor: '#FFF8F8',
            color: '#8E3B4C',
          }}
          className="flex items-center gap-1 border-[1.5px] rounded-xl px-2 py-1 text-[12px] font-extrabold cursor-pointer active:scale-95 transition whitespace-nowrap"
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

      {/* 2. 300px Canvas */}
      <div
        style={{
          borderColor: '#29221E',
          boxShadow: '0 4px 0 #D8CCB8',
        }}
        className="relative h-[300px] rounded-2xl overflow-hidden border-2"
      >
        <img
          src={getCanvasBg()}
          alt=""
          className="absolute inset-0 w-full h-full object-cover image-pixelated"
        />
        <img
          src={getHeroImg()}
          alt=""
          className="absolute left-1/2 -translate-x-1/2 bottom-2.5 h-[232px] object-contain"
        />

        {/* Top-left Dark Timer */}
        <div
          style={{
            backgroundColor: 'rgba(41, 34, 30, 0.85)',
            color: '#FFE8D2',
          }}
          className="absolute left-2.5 top-2.5 rounded-lg px-2.5 py-1.5 font-mono text-[20px] font-black tracking-wider shadow"
        >
          {formatSecondsToMMSS(activeDurationSec)}
        </div>

        {/* Top-right "✓ 已算數" Badge if met */}
        {isMet && (
          <div
            style={{
              backgroundColor: '#E8F5EE',
              color: '#0F7A55',
              borderColor: '#B9E3CF',
            }}
            className="absolute right-2.5 top-2.5 text-[11px] font-black px-2.5 py-1 rounded-full border shadow"
          >
            ✓ 已算數
          </div>
        )}
      </div>

      {/* 3. Progress Card */}
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
          boxShadow: '0 4px 0 #D8CCB8',
        }}
        className="rounded-2xl border-[1.5px] p-3 text-[#29221E] space-y-2"
      >
        <div className="flex items-center justify-between">
          <b
            style={{ color: isMet ? '#065F46' : '#29221E' }}
            className="text-[14px] font-black"
          >
            {isMet
              ? '今天算數了！'
              : draft.sportType === 'swim' && distanceM > 0 && remainingDistanceM > 0
              ? `再 ${remainingDistanceM} 公尺就算數`
              : formatRemainingTimeNotice(remainingSecFromTime)}
          </b>
          <span className="text-[11.5px] font-extrabold text-[#786B63]">
            {isMet
              ? '10／10 分'
              : draft.sportType === 'swim' && distanceM > 0
              ? `${distanceM}／200 公尺`
              : `${Math.min(10, dayProgress.minutes_done)}／10 分`}
          </span>
        </div>

        {/* 10-bar Progress */}
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isFilled = isMet || idx < dayProgress.minutes_done;
            return (
              <div
                key={idx}
                style={{
                  background: isFilled
                    ? isMet
                      ? 'linear-gradient(#6EE7B7, #10B981)'
                      : 'linear-gradient(#FDBA74, #EA580C)'
                    : '#EFE8DC',
                  borderColor: isFilled
                    ? isMet
                      ? '#059669'
                      : '#C2410C'
                    : '#E5DCCB',
                }}
                className="flex-1 h-3 rounded-[3px] border"
              />
            );
          })}
        </div>

        {/* Met State Text */}
        {isMet ? (
          <div className="space-y-0.5 pt-0.5">
            <div className="text-[12.5px] font-bold text-[#065F46]">
              想繼續就照自己的步調，累了隨時按結束。
            </div>
            <div className="text-[11.5px] text-[#786B63]">
              按「結束」就會領今天的獎勵
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pt-0.5">
            {/* Swim Specific: laps + distance button */}
            {draft.sportType === 'swim' && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E5DCCB',
                    }}
                    className="flex-1 border-[1.5px] rounded-xl p-2 flex items-baseline justify-between"
                  >
                    <span className="text-[11px] font-extrabold text-[#786B63]">已游</span>
                    <div>
                      <span className="text-[20px] font-black">{distanceM}</span>{' '}
                      <span className="text-[11px] text-[#786B63] font-bold">公尺</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="sport-lap-add"
                    onClick={handleAddSwimLap}
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderColor: '#E5DCCB',
                      color: '#5C4A3E',
                    }}
                    className="border-[1.5px] rounded-xl px-3 py-2 text-[12.5px] font-black active:translate-y-0.5 transition cursor-pointer"
                  >
                    ＋1 趟 {poolLengthM} 公尺
                  </button>
                </div>
                <div className="text-[11.5px] text-[#786B63]">
                  {remainingSecFromTime <= 0
                    ? '時長已滿 10 分鐘，算數了！'
                    : `或再游 ${formatRemainingTimeNotice(remainingSecFromTime).replace('再 ', '').replace('就算數', '也算')}`}
                </div>
              </div>
            )}

            {/* Run / Walk Hint */}
            {(draft.sportType === 'run' || draft.sportType === 'walk') && (
              <div className="text-[11.5px] text-[#786B63]">
                或{draft.sportType === 'run' ? '跑' : '走'}滿 1 公里也算・距離結束後再填
              </div>
            )}

            {/* Cycle Hint */}
            {draft.sportType === 'cycle' && (
              <div className="text-[11.5px] text-[#786B63]">
                或騎滿 3 公里也算・距離結束後再填
              </div>
            )}

            {/* Yoga Hint */}
            {draft.sportType === 'yoga_stretch' && (
              <div className="text-[11.5px] text-[#786B63]">
                慢慢來，跟著呼吸就好
              </div>
            )}

            {/* Circuit / HIIT Action List */}
            {draft.sportType === 'circuit_hiit' && (
              <div className="space-y-1.5">
                <div className="text-[11.5px] font-extrabold text-[#786B63]">
                  動作清單（可不填）
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hiitExercises.map((ex, i) => (
                    <span
                      key={i}
                      style={{
                        backgroundColor: '#F4EFE6',
                        color: '#786B63',
                        borderColor: '#E5DCCB',
                      }}
                      className="text-[10.5px] font-black px-2 py-0.5 rounded-full border"
                    >
                      {ex}
                    </span>
                  ))}
                  {isAddingHiit ? (
                    <div className="flex items-center gap-1.5 w-full mt-1">
                      <input
                        type="text"
                        placeholder="動作名稱"
                        value={newHiitExercise}
                        onChange={(e) => setNewHiitExercise(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (newHiitExercise.trim()) {
                              setHiitExercises((prev) => [...prev, newHiitExercise.trim()]);
                              setNewHiitExercise('');
                              setIsAddingHiit(false);
                            }
                          }
                        }}
                        className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[#E5DCCB] bg-white text-[#29221E] focus:outline-none focus:border-[#FB923C]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newHiitExercise.trim()) {
                            setHiitExercises((prev) => [...prev, newHiitExercise.trim()]);
                            setNewHiitExercise('');
                            setIsAddingHiit(false);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-black rounded-lg bg-[#FB923C] text-white cursor-pointer"
                      >
                        加入
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewHiitExercise('');
                          setIsAddingHiit(false);
                        }}
                        className="px-2 py-1 text-xs text-[#786B63] cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingHiit(true)}
                      style={{
                        backgroundColor: '#FFF1E4',
                        color: '#C2410C',
                        borderColor: '#FED7AA',
                      }}
                      className="text-[10.5px] font-black px-2 py-0.5 rounded-full border cursor-pointer hover:bg-orange-100"
                    >
                      ＋加動作
                    </button>
                  )}
                </div>
                <div className="text-[11.5px] text-[#786B63]">
                  只看總時長，動作之間不用算休息
                </div>
                <div className="text-[12px] font-black text-[#7A4E00]">
                  跟著自己的節奏，喘不過來就放慢。
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Action Buttons (暫停 / 結束) */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          data-testid="sport-live-pause"
          onClick={handleTogglePause}
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#E5DCCB',
            color: '#5C4A3E',
            boxShadow: '0 3px 0 #E5DCCB',
          }}
          className="flex-1 py-3 rounded-2xl border-[1.5px] font-black text-base active:translate-y-0.5 transition cursor-pointer flex items-center justify-center"
        >
          {isPaused ? '繼續' : '暫停'}
        </button>

        <button
          type="button"
          data-testid="sport-live-end"
          onClick={handleEnd}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="flex-[1.4] py-3 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition cursor-pointer flex items-center justify-center"
        >
          結束
        </button>
      </div>

      {/* 5. Bottom Two Lines */}
      <div className="space-y-1 text-center pt-1 text-[11.5px] text-[#786B63]">
        <div>
          {priorSessions.length === 0
            ? '今天第 1 筆・這次的時間會和今天其他紀錄加在一起'
            : '這次的時間會和今天其他紀錄加在一起'}
        </div>
        <div>不舒服隨時按右上角「我不舒服」</div>
      </div>
    </div>
  );
};
