import React, { useState } from 'react';
import {
  Trophy,
  Calculator,
  Calendar,
  TrendingUp,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Shirt,
  Clock,
  Activity,
  CalendarDays,
} from 'lucide-react';
import { useGameStore, WorkoutSessionRecord } from '../../stores/useGameStore';
import { EXERCISE_LIBRARY } from '../../config/catalogConfig';
import { ExerciseThumbnail } from '../../game/ExerciseThumbnail';

type MeSubTab = 'history' | 'charts' | 'trophies';
type HistoryViewMode = 'calendar' | 'weekly';
type ChartMetricType = 'volume' | 'strength_pr' | 'muscle_split';

export const AnalyticsTab: React.FC = () => {
  const store = useGameStore();
  const [subTab, setSubTab] = useState<MeSubTab>('history');
  const [historyMode, setHistoryMode] = useState<HistoryViewMode>('calendar');
  const [calYear, setCalYear] = useState<number>(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartMetricType>('volume');
  const { biometrics } = store;

  // Mifflin-St Jeor BMR & TDEE
  const bmr = Math.round(
    10 * biometrics.weightKg +
      6.25 * biometrics.heightCm -
      5 * biometrics.age +
      (biometrics.gender === 'male' ? 5 : -161)
  );
  const tdee = Math.round(bmr * biometrics.activityMultiplier);
  const targetKcal =
    biometrics.goal === 'cut' ? tdee - 400 : biometrics.goal === 'bulk' ? tdee + 300 : tdee;
  const proteinGrams = Math.round(biometrics.weightKg * 2.0);
  const fatGrams = Math.round(biometrics.weightKg * 0.9);
  const carbsGrams = Math.max(
    50,
    Math.round((targetKcal - proteinGrams * 4 - fatGrams * 9) / 4)
  );

  const todayObj = new Date();
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const getSessionDate = (s: WorkoutSessionRecord, idx: number): Date => {
    if (s.timestamp) return new Date(s.timestamp);
    const dAgo =
      typeof s.daysAgo === 'number'
        ? s.daysAgo
        : s.dateLabel.includes('今日') || s.dateLabel.includes('剛剛')
        ? 0
        : s.dateLabel.includes('昨天')
        ? 1
        : idx + 1;
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() - dAgo);
    return d;
  };

  const formatDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const sessionsByDateKey = new Map<string, WorkoutSessionRecord[]>();
  store.workoutHistory.forEach((s, idx) => {
    const d = getSessionDate(s, idx);
    const key = formatDateKey(d);
    const prev = sessionsByDateKey.get(key) || [];
    prev.push(s);
    sessionsByDateKey.set(key, prev);
  });

  // =========================================================================
  // MONTHLY VIEW DATA: 1號 ～ 月底
  // =========================================================================
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDayWeekday = new Date(calYear, calMonth - 1, 1).getDay(); // 0 is Sunday, 6 is Saturday

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const cellDate = new Date(calYear, calMonth - 1, dayNum);
    const dayKey = formatDateKey(cellDate);
    const daySessions = sessionsByDateKey.get(dayKey) || [];
    const volume = daySessions.reduce((sum, s) => sum + s.totalVolume, 0);
    const sets = daySessions.reduce((sum, s) => sum + s.totalSets, 0);
    const isToday = dayKey === formatDateKey(todayObj);
    const weekday = weekdayNames[cellDate.getDay()];
    return {
      dayNum,
      dayKey,
      date: cellDate,
      weekday,
      mmdd: `${calMonth}/${String(dayNum).padStart(2, '0')}`,
      isToday,
      volume,
      sets,
      sessions: daySessions,
    };
  });

  const monthSessions = store.workoutHistory.filter((s, idx) => {
    const d = getSessionDate(s, idx);
    return d.getFullYear() === calYear && d.getMonth() + 1 === calMonth;
  });

  const monthlyActiveDays = calendarDays.filter((c) => c.sets > 0).length;
  const monthlyTotalVolume = calendarDays.reduce((sum, c) => sum + c.volume, 0);
  const monthlyTotalSets = calendarDays.reduce((sum, c) => sum + c.sets, 0);

  // =========================================================================
  // WEEKLY VIEW DATA: 週期是週日到週六 (以週日為起點的一整週)
  // =========================================================================
  const sundayOfWeek = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
  sundayOfWeek.setDate(todayObj.getDate() - todayObj.getDay() + weekOffset * 7);

  const weeklyDays = Array.from({ length: 7 }, (_, i) => {
    const cellDate = new Date(sundayOfWeek);
    cellDate.setDate(sundayOfWeek.getDate() + i);
    const dayKey = formatDateKey(cellDate);
    const daySessions = sessionsByDateKey.get(dayKey) || [];
    const volume = daySessions.reduce((sum, s) => sum + s.totalVolume, 0);
    const sets = daySessions.reduce((sum, s) => sum + s.totalSets, 0);
    const isToday = dayKey === formatDateKey(todayObj);
    const wk = weekdayNames[cellDate.getDay()];
    const mmdd = `${cellDate.getMonth() + 1}/${String(cellDate.getDate()).padStart(2, '0')}`;
    const label = isToday ? '今日' : `週${wk}`;
    return {
      dayKey,
      date: cellDate,
      label,
      weekday: wk,
      mmdd,
      volume,
      sets,
      isToday,
      sessions: daySessions,
    };
  });

  const maxWeeklyDayVol = Math.max(...weeklyDays.map((d) => d.volume), 6000);
  const weeklyTotalVolume = weeklyDays.reduce((sum, d) => sum + d.volume, 0);
  const weeklyTotalSets = weeklyDays.reduce((sum, d) => sum + d.sets, 0);
  const weeklyActiveDays = weeklyDays.filter((d) => d.sets > 0).length;

  const weekDateKeys = new Set(weeklyDays.map((d) => d.dayKey));
  const weekSessions = store.workoutHistory.filter((s, idx) => {
    const key = formatDateKey(getSessionDate(s, idx));
    return weekDateKeys.has(key);
  });

  // Filtered sessions for bottom list:
  // - If a specific day is clicked, show that day's sessions
  // - Otherwise, if in 'weekly' (週瀏覽), show this week's sessions
  // - If in 'calendar' (月瀏覽), show this month's sessions (1號~月底)
  const displayedSessions =
    selectedDateKey !== null
      ? sessionsByDateKey.get(selectedDateKey) || []
      : historyMode === 'weekly'
      ? weekSessions
      : monthSessions;

  // Chronological sessions for trend chart (oldest -> newest)
  const chronologicalSessions = [...store.workoutHistory].reverse();
  const maxVolume = Math.max(...chronologicalSessions.map((s) => s.totalVolume), 5000);

  // Compute Muscle Group Sets distribution across all history
  const muscleSetCounts: Record<string, { label: string; sets: number; color: string }> = {
    legs: { label: '腿臀肌群', sets: 0, color: '#10b981' },
    chest: { label: '胸大肌群', sets: 0, color: '#38bdf8' },
    back: { label: '背部肌群', sets: 0, color: '#a855f7' },
    shoulders: { label: '肩部三角肌', sets: 0, color: '#f59e0b' },
    arms: { label: '二三頭肌', sets: 0, color: '#f43f5e' },
    core: { label: '核心與有氧', sets: 0, color: '#22d3ee' },
  };

  store.workoutHistory.forEach((sess) => {
    sess.exerciseLogs.forEach((log) => {
      const ex = EXERCISE_LIBRARY.find((e) => e.id === log.exerciseId);
      const grp = ex?.muscleGroup || 'core';
      if (muscleSetCounts[grp]) {
        muscleSetCounts[grp].sets += log.sets.length;
      }
    });
  });

  const maxMuscleSets = Math.max(
    ...Object.values(muscleSetCounts).map((m) => m.sets),
    10
  );

  // Build SVG polyline points for Volume Trend
  const svgW = 320;
  const svgH = 140;
  const padX = 28;
  const padY = 20;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const volumePoints = chronologicalSessions.map((s, idx) => {
    const x =
      chronologicalSessions.length === 1
        ? svgW / 2
        : padX + (idx / (chronologicalSessions.length - 1)) * plotW;
    const y = padY + plotH - (Math.min(s.totalVolume, maxVolume) / maxVolume) * plotH;
    return { x, y, session: s };
  });

  const polylineStr = volumePoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPolygonStr =
    volumePoints.length > 1
      ? `${volumePoints[0].x},${padY + plotH} ${polylineStr} ${
          volumePoints[volumePoints.length - 1].x
        },${padY + plotH}`
      : '';

  return (
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. PLAYER PROFILE HEADER CARD */}
      <div className="retro-box rounded-2xl p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/50 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black">
              Lv.{store.level}
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              🔥 連勝 {store.streakDays} 天
            </span>
          </div>
          <h2 className="text-base font-black text-white mt-1">{store.nickname}</h2>
          <p className="text-[11px] text-slate-400">
            累計 {store.workoutHistory.length} 次訓練 · {store.coins.toLocaleString()} 🪙
          </p>
        </div>

        <button
          onClick={() => store.setWardrobeModalOpen(true)}
          className="retro-btn px-3 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow-md"
        >
          <Shirt className="w-4 h-4" />
          <span>衣櫃佈置</span>
        </button>
      </div>

      {/* 2. THREE SUB-TABS: 月曆與紀錄 / 趨勢圖表 / 體態與PR */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {(
          [
            { id: 'history', label: '月曆與紀錄', icon: Calendar },
            { id: 'charts', label: '趨勢圖表', icon: TrendingUp },
            { id: 'trophies', label: '體態與PR', icon: Trophy },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SUB-TAB 1: MONTHLY CALENDAR & WEEKLY VOLUME + FILTERED SESSION LIST
         ===================================================================== */}
      {subTab === 'history' && (
        <div className="space-y-3">
          {/* View Switcher: 月瀏覽 / 週瀏覽 (Removed redundant 列表明細 option) */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: 'calendar', label: '📅 月瀏覽（月曆檢視）', icon: CalendarDays },
                { id: 'weekly', label: '📊 週瀏覽（本週訓練）', icon: BarChart3 },
              ] as const
            ).map((m) => {
              const MIcon = m.icon;
              const active = historyMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setHistoryMode(m.id);
                    setSelectedDateKey(null);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                    active
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MIcon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* VIEW A: MONTHLY CALENDAR GRID */}
          {historyMode === 'calendar' && (
            <div className="retro-box rounded-2xl p-3.5 space-y-3">
              {/* Month Navigation & Cycle Banner */}
              <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800 gap-1.5">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedDateKey(null);
                      if (calMonth === 1) {
                        setCalYear((y) => y - 1);
                        setCalMonth(12);
                      } else {
                        setCalMonth((m) => m - 1);
                      }
                    }}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
                    title="上個月"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black font-mono shrink-0">
                    📅 {calYear}年{calMonth}月
                  </span>
                  <button
                    onClick={() => {
                      setSelectedDateKey(null);
                      if (calMonth === 12) {
                        setCalYear((y) => y + 1);
                        setCalMonth(1);
                      } else {
                        setCalMonth((m) => m + 1);
                      }
                    }}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
                    title="下個月"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {(calYear !== todayObj.getFullYear() || calMonth !== todayObj.getMonth() + 1) && (
                    <button
                      onClick={() => {
                        setSelectedDateKey(null);
                        setCalYear(todayObj.getFullYear());
                        setCalMonth(todayObj.getMonth() + 1);
                      }}
                      className="text-[10px] font-bold text-cyan-400 px-1.5 py-0.5 rounded-lg bg-slate-800 border border-cyan-500/30 shrink-0"
                    >
                      本月
                    </button>
                  )}
                </div>
                {selectedDateKey !== null ? (
                  <button
                    onClick={() => setSelectedDateKey(null)}
                    className="text-[11px] font-bold text-cyan-400 shrink-0"
                  >
                    查看全月
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    1號～{daysInMonth}號
                  </span>
                )}
              </div>

              {/* Monthly Summary KPIs */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400">本月訓練天數</div>
                  <div className="text-sm font-black font-mono text-emerald-400">
                    {monthlyActiveDays} 天
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400">本月總組數</div>
                  <div className="text-sm font-black font-mono text-white">
                    {monthlyTotalSets} 組
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400">本月總訓練量</div>
                  <div className="text-sm font-black font-mono text-amber-300">
                    {(monthlyTotalVolume / 1000).toFixed(1)}k kg
                  </div>
                </div>
              </div>

              {/* Weekday Column Headers (Sun to Sat) */}
              <div className="grid grid-cols-7 gap-1.5 text-center px-0.5">
                {['週日', '週一', '週二', '週三', '週四', '週五', '週六'].map((name, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] font-black text-slate-400 py-0.5"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* 7-Column Calendar Grid (Padding + 1 to daysInMonth) */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {Array.from({ length: firstDayWeekday }).map((_, padIdx) => (
                  <div
                    key={`pad_${padIdx}`}
                    className="py-2 px-0.5 rounded-xl border border-transparent opacity-10 pointer-events-none"
                  />
                ))}
                {calendarDays.map((cell) => {
                  const hasWorkout = cell.sets > 0;
                  const isSelected = selectedDateKey === cell.dayKey;
                  return (
                    <button
                      key={cell.dayKey}
                      onClick={() =>
                        setSelectedDateKey(isSelected ? null : cell.dayKey)
                      }
                      className={`py-2 px-0.5 rounded-xl border flex flex-col items-center justify-center transition ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                          : hasWorkout
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-white ring-1 ring-emerald-500/30'
                          : cell.isToday
                          ? 'bg-slate-800 border-amber-400/60 text-amber-300'
                          : 'bg-slate-900/70 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-black leading-tight">
                        {cell.isToday ? `${cell.dayNum}今` : cell.dayNum}
                      </span>
                      {hasWorkout ? (
                        <span
                          className={`text-[9px] font-mono font-bold mt-0.5 ${
                            isSelected ? 'text-slate-950' : 'text-emerald-300'
                          }`}
                        >
                          {(cell.volume / 1000).toFixed(1)}k
                        </span>
                      ) : (
                        <span className="text-[9px] opacity-30 mt-0.5">-</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                <span>🟢 綠框代表有訓練紀錄 · 點選日期可篩選單日</span>
                {selectedDateKey !== null && (
                  <button
                    onClick={() => setSelectedDateKey(null)}
                    className="text-cyan-400 font-bold"
                  >
                    顯示本月全部紀錄
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VIEW B: WEEKLY VOLUME BAR VIEW */}
          {historyMode === 'weekly' && (
            <div className="retro-box rounded-2xl p-3.5 space-y-3">
              {/* Week Navigation & Cycle Banner */}
              <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800 gap-1.5">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedDateKey(null);
                      setWeekOffset((w) => w - 1);
                    }}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
                    title="上一週"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black font-mono shrink-0">
                    📊 {weeklyDays[0].mmdd} ～ {weeklyDays[6].mmdd}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedDateKey(null);
                      setWeekOffset((w) => w + 1);
                    }}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
                    title="下一週"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {weekOffset !== 0 && (
                    <button
                      onClick={() => {
                        setSelectedDateKey(null);
                        setWeekOffset(0);
                      }}
                      className="text-[10px] font-bold text-cyan-400 px-1.5 py-0.5 rounded-lg bg-slate-800 border border-cyan-500/30 shrink-0"
                    >
                      本週
                    </button>
                  )}
                </div>
                {selectedDateKey !== null ? (
                  <button
                    onClick={() => setSelectedDateKey(null)}
                    className="text-[11px] font-bold text-cyan-400 shrink-0"
                  >
                    查看全週
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    週日～週六
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400">本週訓練</div>
                  <div className="text-sm font-black font-mono text-emerald-400">
                    {weeklyActiveDays} 天
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400">本週組數</div>
                  <div className="text-sm font-black font-mono text-white">
                    {weeklyTotalSets} 組
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400">本週總量</div>
                  <div className="text-sm font-black font-mono text-amber-300">
                    {weeklyTotalVolume.toLocaleString()} kg
                  </div>
                </div>
              </div>

              {/* 7-Day Vertical Bar Chart with Exact MM/DD Dates */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div className="grid grid-cols-7 gap-1 items-end h-36 pt-4">
                  {weeklyDays.map((d) => {
                    const heightPct =
                      d.volume > 0 ? Math.max(16, Math.round((d.volume / maxWeeklyDayVol) * 100)) : 6;
                    const isSelected = selectedDateKey === d.dayKey;
                    return (
                      <button
                        key={d.dayKey}
                        onClick={() =>
                          setSelectedDateKey(isSelected ? null : d.dayKey)
                        }
                        className="flex flex-col items-center h-full justify-end group"
                      >
                        <span className="text-[9px] font-mono text-emerald-300 font-bold mb-1">
                          {d.volume > 0 ? `${(d.volume / 1000).toFixed(1)}k` : ''}
                        </span>
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            isSelected
                              ? 'bg-cyan-400'
                              : d.volume > 0
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                              : 'bg-slate-800'
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[10px] font-mono font-black text-white mt-1.5 leading-tight">
                          {d.mmdd}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 leading-tight">
                          {d.label}
                        </span>
                        <span className="text-[9px] font-mono text-cyan-300/80 leading-tight">
                          {d.sets}組
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SESSION CARDS LIST (Filtered strictly by current Month View or Week View) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1 gap-2">
              <span className="text-xs font-black text-slate-300 truncate">
                {selectedDateKey !== null
                  ? `📋 ${selectedDateKey} 紀錄（${displayedSessions.length} 筆）`
                  : historyMode === 'weekly'
                  ? `📋 本週明細（${weeklyDays[0].mmdd}～${weeklyDays[6].mmdd} · ${displayedSessions.length}筆）`
                  : `📋 本月明細（${calYear}/${calMonth} · ${displayedSessions.length}筆）`}
              </span>
              {selectedDateKey !== null && (
                <button
                  onClick={() => setSelectedDateKey(null)}
                  className="text-[11px] font-black text-cyan-400 shrink-0 whitespace-nowrap"
                >
                  查看全部
                </button>
              )}
            </div>

            {displayedSessions.length === 0 ? (
              <div className="retro-box rounded-2xl p-5 text-center text-xs text-slate-400">
                {selectedDateKey !== null
                  ? '該日無訓練紀錄'
                  : historyMode === 'weekly'
                  ? '本週尚無訓練紀錄'
                  : '本月尚無訓練紀錄'}
              </div>
            ) : (
              displayedSessions.map((session, sIdx) => {
                const sDate = getSessionDate(session, sIdx);
                const sMmdd = `${sDate.getMonth() + 1}/${String(sDate.getDate()).padStart(2, '0')}`;
                const sWk = weekdayNames[sDate.getDay()];
                return (
                <div
                  key={session.id}
                  onClick={() => store.setSelectedHistorySessionId(session.id)}
                  className="retro-box rounded-2xl p-3.5 space-y-2.5 cursor-pointer hover:border-emerald-500/50 transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 font-bold">
                        <span>📅 {sMmdd} (週{sWk}) · {session.dateLabel}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {session.durationMinutes}分
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white group-hover:text-emerald-300 mt-0.5">
                        {session.routineName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-0.5 text-xs font-black text-cyan-400 shrink-0">
                      <span>明細</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Exercise Thumbnails Preview Strip */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {session.exerciseLogs.map((log, i) => {
                      const exObj =
                        EXERCISE_LIBRARY.find((e) => e.id === log.exerciseId) ||
                        EXERCISE_LIBRARY[0];
                      return (
                        <div
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            store.setInspectedExerciseId(exObj.id);
                          }}
                          className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-1.5 shrink-0 cursor-pointer transition"
                          title={`點擊查看【${exObj.nameZh}】動作說明`}
                        >
                          <ExerciseThumbnail exercise={exObj} size={26} />
                          <div className="text-[10px]">
                            <div className="font-bold text-white flex items-center gap-1">
                              <span>{log.exerciseNameZh}</span>
                              <span className="text-[9px] text-cyan-400">📖</span>
                            </div>
                            <div className="font-mono text-cyan-300">
                              {log.sets.length}組 · {Math.max(...log.sets.map((s) => s.weightKg))}
                              {log.unitLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Summary Strip */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/80 text-slate-400">
                    <span>
                      組數 <strong className="text-white">{session.totalSets}組</strong>
                    </span>
                    <span>
                      容量{' '}
                      <strong className="text-emerald-400">
                        {session.totalVolume.toLocaleString()} kg
                      </strong>
                    </span>
                    <span className="text-amber-300 font-bold">+{session.coinsEarned}🪙</span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: DATA NERD TREND CHARTS & BIOMETRICS
         ===================================================================== */}
      {subTab === 'charts' && (
        <div className="space-y-3.5">
          {/* Interactive SVG Trend Chart Box */}
          <div className="retro-box rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                訓練趨勢圖
              </h3>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(
                  [
                    { id: 'volume', label: '容量' },
                    { id: 'strength_pr', label: '三項' },
                    { id: 'muscle_split', label: '肌群' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChartType(c.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-black transition ${
                      chartType === c.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CHART 1: TRAINING VOLUME SVG LINE CHART */}
            {chartType === 'volume' && (
              <div className="space-y-2">
                <div className="game-stage-dark bg-slate-950/90 border border-slate-800 rounded-xl p-2">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-40 overflow-visible">
                    <defs>
                      <linearGradient id="volAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const y = padY + plotH * (1 - ratio);
                      return (
                        <g key={idx}>
                          <line
                            x1={padX}
                            y1={y}
                            x2={svgW - padX}
                            y2={y}
                            stroke="#1e293b"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                          <text
                            x={4}
                            y={y + 3}
                            fill="#64748b"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {Math.round((maxVolume * ratio) / 1000)}k
                          </text>
                        </g>
                      );
                    })}

                    {areaPolygonStr && <polygon points={areaPolygonStr} fill="url(#volAreaGrad)" />}

                    {polylineStr && (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polylineStr}
                      />
                    )}

                    {volumePoints.map((pt, idx) => (
                      <g
                        key={pt.session.id}
                        className="cursor-pointer"
                        onClick={() => store.setSelectedHistorySessionId(pt.session.id)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4.5"
                          fill="#0f172a"
                          stroke="#34d399"
                          strokeWidth="2.5"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 8}
                          textAnchor="middle"
                          fill="#e2e8f0"
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {pt.session.totalVolume}
                        </text>
                        <text
                          x={pt.x}
                          y={svgH - 4}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="8"
                        >
                          #{idx + 1}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>點擊節點可開啟當日明細</span>
                  <span className="font-mono text-emerald-400 font-bold">kg · reps</span>
                </div>
              </div>
            )}

            {/* CHART 2: BIG-3 1RM PROGRESSION */}
            {chartType === 'strength_pr' && (
              <div className="space-y-2">
                <div className="game-stage-dark bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-amber-300">● 硬舉</span>
                    <span className="text-emerald-400">● 深蹲</span>
                    <span className="text-cyan-400">● 臥推</span>
                  </div>
                  <svg viewBox="0 0 320 130" className="w-full h-36">
                    {[40, 80, 120, 160].map((val, i) => {
                      const y = 110 - (val / 160) * 90;
                      return (
                        <g key={i}>
                          <line
                            x1="28"
                            y1={y}
                            x2="300"
                            y2={y}
                            stroke="#1e293b"
                            strokeDasharray="3 3"
                          />
                          <text x="2" y={y + 3} fill="#64748b" fontSize="8" fontFamily="monospace">
                            {val}kg
                          </text>
                        </g>
                      );
                    })}
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                      points="40,56 105,50 170,45 235,40 290,34"
                    />
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points="40,68 105,63 170,58 235,54 290,48"
                    />
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      points="40,80 105,77 170,73 235,70 290,65"
                    />
                    {['W1', 'W2', 'W3', 'W4', '本週'].map((wk, idx) => (
                      <text
                        key={wk}
                        x={40 + idx * 62.5}
                        y="124"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8.5"
                      >
                        {wk}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>
            )}

            {/* CHART 3: MUSCLE GROUP SETS DISTRIBUTION */}
            {chartType === 'muscle_split' && (
              <div className="space-y-2 pt-1">
                {Object.entries(muscleSetCounts).map(([key, item]) => {
                  const pct = Math.round((item.sets / maxMuscleSets) * 100);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">{item.label}</span>
                        <span className="font-mono font-black text-white">{item.sets} 組</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(8, pct)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TDEE & MACROS CALCULATOR */}
          <div className="retro-box rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-cyan-400" />
                身體數值與每日熱量 TDEE
              </span>
              <span className="text-xs font-mono font-black text-emerald-400">
                {targetKcal} kcal/日
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                <label className="text-[10px] text-slate-400 block">身高 cm</label>
                <input
                  type="number"
                  value={biometrics.heightCm}
                  onChange={(e) => store.updateBiometrics({ heightCm: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                <label className="text-[10px] text-slate-400 block">體重 kg</label>
                <input
                  type="number"
                  value={biometrics.weightKg}
                  onChange={(e) => store.updateBiometrics({ weightKg: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-emerald-400 outline-none mt-0.5"
                />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                <label className="text-[10px] text-slate-400 block">體脂 %</label>
                <input
                  type="number"
                  value={biometrics.bodyFatPct}
                  onChange={(e) => store.updateBiometrics({ bodyFatPct: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-amber-300 outline-none mt-0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'cut', label: '🔥 減脂' },
                  { id: 'maintain', label: '⚖️ 維持' },
                  { id: 'bulk', label: '💪 增肌' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  onClick={() => store.updateBiometrics({ goal: g.id })}
                  className={`py-1.5 rounded-lg text-xs font-black border transition ${
                    biometrics.goal === g.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/30">
                <div className="text-[10px] text-rose-300 font-bold">蛋白質</div>
                <div className="text-sm font-black font-mono text-white">{proteinGrams}g</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30">
                <div className="text-[10px] text-amber-300 font-bold">碳水</div>
                <div className="text-sm font-black font-mono text-white">{carbsGrams}g</div>
              </div>
              <div className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                <div className="text-[10px] text-cyan-300 font-bold">脂肪</div>
                <div className="text-sm font-black font-mono text-white">{fatGrams}g</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: BODY METRICS SUMMARY & ALL EXERCISES PR BOARD (Removed Avatar Block)
         ===================================================================== */}
      {subTab === 'trophies' && (
        <div className="space-y-3.5">
          {/* Body Metrics & Composition Summary (No Avatar Doll Block) */}
          <div className="retro-box rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                當前體態數據與營養目標
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-black">
                BMI {(biometrics.weightKg / Math.pow(biometrics.heightCm / 100, 2)).toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <label className="text-[10px] text-slate-400 block">身高 cm</label>
                <input
                  type="number"
                  value={biometrics.heightCm}
                  onChange={(e) => store.updateBiometrics({ heightCm: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <label className="text-[10px] text-slate-400 block">體重 kg</label>
                <input
                  type="number"
                  value={biometrics.weightKg}
                  onChange={(e) => store.updateBiometrics({ weightKg: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-emerald-400 outline-none mt-0.5"
                />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <label className="text-[10px] text-slate-400 block">體脂率 %</label>
                <input
                  type="number"
                  value={biometrics.bodyFatPct}
                  onChange={(e) => store.updateBiometrics({ bodyFatPct: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-amber-300 outline-none mt-0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">除脂體重 LBM</div>
                <div className="text-xs font-black font-mono text-cyan-300 mt-0.5">
                  {(biometrics.weightKg * (1 - biometrics.bodyFatPct / 100)).toFixed(1)} kg
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">目標熱量</div>
                <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">
                  {targetKcal} kcal
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">每日蛋白質</div>
                <div className="text-xs font-black font-mono text-rose-300 mt-0.5">
                  {proteinGrams} g
                </div>
              </div>
            </div>
          </div>

          {/* All Exercises PR Board */}
          <div className="retro-box rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                各動作最佳 PR
              </span>
              <BarChart3 className="w-4 h-4 text-slate-500" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {EXERCISE_LIBRARY.map((ex) => {
                const pr = store.personalRecords[ex.id] || 0;
                return (
                  <div
                    key={ex.id}
                    onClick={() => store.setInspectedExerciseId(ex.id)}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-2.5 cursor-pointer transition group"
                  >
                    <ExerciseThumbnail exercise={ex} size={36} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-300 group-hover:text-cyan-300 break-words leading-snug flex items-center gap-1 flex-wrap">
                        <span>{ex.nameZh}</span>
                        <span className="text-[10px] text-cyan-400 shrink-0">📖</span>
                      </div>
                      <div className="text-sm font-black font-mono text-amber-300 mt-0.5">
                        {pr > 0 ? `${pr} ${ex.unitLabel}` : '--'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
