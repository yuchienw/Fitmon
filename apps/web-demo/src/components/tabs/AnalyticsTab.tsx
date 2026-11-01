import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Calculator,
  Calendar,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Shirt,
  Clock,
  Sparkles,
  Activity,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { EXERCISE_LIBRARY, AvatarBodyStage } from '../../config/catalogConfig';
import { ExerciseThumbnail } from '../../game/ExerciseThumbnail';

type MeSubTab = 'charts' | 'history' | 'trophies';
type ChartMetricType = 'volume' | 'strength_pr' | 'muscle_split';

export const AnalyticsTab: React.FC = () => {
  const store = useGameStore();
  const [subTab, setSubTab] = useState<MeSubTab>('charts');
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
      {/* 1. PLAYER PROFILE & PAPER-DOLL WARDROBE HEADER CARD (V2-08, V2-13) */}
      <div className="retro-box rounded-2xl p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/50 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black">
              Lv.{store.level} 訓練家
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              🔥 連續打卡 {store.streakDays} 天
            </span>
          </div>
          <h2 className="text-base font-black text-white mt-1">{store.nickname} 的個人中心</h2>
          <p className="text-[11px] text-slate-400">
            累積完成 {store.workoutHistory.length} 次單日訓練 · 總金幣 {store.coins.toLocaleString()}🪙
          </p>
        </div>

        <button
          onClick={() => store.setWardrobeModalOpen(true)}
          className="retro-btn px-3 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow-md"
        >
          <Shirt className="w-4 h-4" />
          <span>造型與房間設定</span>
        </button>
      </div>

      {/* 2. THREE SUB-TABS: 數據趨勢圖表 / 單日課表紀錄 / 成就與體態 */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {(
          [
            { id: 'charts', label: '數據趨勢圖', icon: TrendingUp },
            { id: 'history', label: '單日課表紀錄', icon: Calendar },
            { id: 'trophies', label: 'PR 與體態', icon: Trophy },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
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
          SUB-TAB 1: DATA NERD TREND CHARTS & BIOMETRICS (V2-09)
         ===================================================================== */}
      {subTab === 'charts' && (
        <div className="space-y-3.5">
          {/* Interactive SVG Trend Chart Box */}
          <div className="retro-box rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  運動數據控進階趨勢圖表
                </h3>
                <p className="text-[10px] text-slate-400">
                  追蹤每次訓練容量成長、三大項力量曲線與肌群平衡
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(
                  [
                    { id: 'volume', label: '容量折線' },
                    { id: 'strength_pr', label: '力量成長' },
                    { id: 'muscle_split', label: '肌群分佈' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChartType(c.id)}
                    className={`px-2 py-1 rounded text-[10px] font-black transition ${
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
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-40 overflow-visible">
                    <defs>
                      <linearGradient id="volAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid Lines */}
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

                    {/* Shaded Area */}
                    {areaPolygonStr && <polygon points={areaPolygonStr} fill="url(#volAreaGrad)" />}

                    {/* Line Path */}
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

                    {/* Data Points & Labels */}
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
                          fontSize="8.5"
                        >
                          {idx + 1}.{pt.session.dateLabel}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>💡 點擊折線圖上的節點可直接檢視該日完整課表紀錄</span>
                  <span className="font-mono text-emerald-400 font-bold">單位: kg·reps</span>
                </div>
              </div>
            )}

            {/* CHART 2: BIG-3 1RM / TOP WEIGHT PROGRESSION MULTI-LINE CHART */}
            {chartType === 'strength_pr' && (
              <div className="space-y-2">
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-amber-300">● 硬舉 (Deadlift)</span>
                    <span className="text-emerald-400">● 深蹲 (Squat)</span>
                    <span className="text-cyan-400">● 臥推 (Bench)</span>
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
                    {/* Deadlift Curve */}
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                      points="40,56 105,50 170,45 235,40 290,34"
                    />
                    {/* Squat Curve */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points="40,68 105,63 170,58 235,54 290,48"
                    />
                    {/* Bench Curve */}
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
                <p className="text-[11px] text-slate-400">
                  近 5 週三大項極限重量穩定提升：硬舉{' '}
                  <strong className="text-amber-300">
                    {store.personalRecords.conventional_deadlift || 130}kg
                  </strong>{' '}
                  / 深蹲{' '}
                  <strong className="text-emerald-400">
                    {store.personalRecords.barbell_squat || 110}kg
                  </strong>{' '}
                  / 臥推{' '}
                  <strong className="text-cyan-300">
                    {store.personalRecords.barbell_bench || 85}kg
                  </strong>
                </p>
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
                身體數值與每日營養目標 (TDEE)
              </span>
              <span className="text-xs font-mono font-black text-emerald-400">
                {targetKcal} kcal/日
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                <label className="text-[10px] text-slate-400 block">身高 (cm)</label>
                <input
                  type="number"
                  value={biometrics.heightCm}
                  onChange={(e) => store.updateBiometrics({ heightCm: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                <label className="text-[10px] text-slate-400 block">體重 (kg)</label>
                <input
                  type="number"
                  value={biometrics.weightKg}
                  onChange={(e) => store.updateBiometrics({ weightKg: Number(e.target.value) })}
                  className="w-full bg-transparent text-center font-mono font-black text-sm text-emerald-400 outline-none mt-0.5"
                />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                <label className="text-[10px] text-slate-400 block">體脂率 (%)</label>
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
                  { id: 'cut', label: '🔥 減脂 (-400)' },
                  { id: 'maintain', label: '⚖️ 維持體態' },
                  { id: 'bulk', label: '💪 增肌 (+300)' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  onClick={() => store.updateBiometrics({ goal: g.id })}
                  className={`py-1.5 rounded-lg text-[11px] font-black border transition ${
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
                <div className="text-[10px] text-amber-300 font-bold">碳水化合物</div>
                <div className="text-sm font-black font-mono text-white">{carbsGrams}g</div>
              </div>
              <div className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                <div className="text-[10px] text-cyan-300 font-bold">健康脂肪</div>
                <div className="text-sm font-black font-mono text-white">{fatGrams}g</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: SINGLE-DAY WORKOUT SESSION LOGS (單日完整課表紀錄 V2-01, V2-17)
         ===================================================================== */}
      {subTab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              單日健身單次課表紀錄 (點擊展開完整動作與組數)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              共 {store.workoutHistory.length} 次紀錄
            </span>
          </div>

          {store.workoutHistory.map((session) => (
            <div
              key={session.id}
              onClick={() => store.setSelectedHistorySessionId(session.id)}
              className="retro-box rounded-2xl p-3.5 space-y-2.5 cursor-pointer hover:border-emerald-500/50 transition group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 font-bold">
                    <span>📅 {session.dateLabel}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5 text-slate-400">
                      <Clock className="w-3 h-3" />
                      {session.durationMinutes} 分鐘
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white group-hover:text-emerald-300 mt-0.5">
                    {session.routineName}
                  </h3>
                </div>

                <div className="flex items-center gap-1 text-xs font-black text-cyan-400 shrink-0">
                  <span>完整明細</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Exercise Thumbnails Preview Strip */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {session.exerciseLogs.map((log, i) => {
                  const exObj =
                    EXERCISE_LIBRARY.find((e) => e.id === log.exerciseId) || EXERCISE_LIBRARY[0];
                  return (
                    <div
                      key={i}
                      className="px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 shrink-0"
                    >
                      <ExerciseThumbnail exercise={exObj} size={26} />
                      <div className="text-[10px]">
                        <div className="font-bold text-white">{log.exerciseNameZh}</div>
                        <div className="font-mono text-cyan-300">
                          {log.sets.length}組 · 最高{' '}
                          {Math.max(...log.sets.map((s) => s.weightKg))}
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
                  總組數: <strong className="text-white">{session.totalSets} 組</strong>
                </span>
                <span>
                  總容量:{' '}
                  <strong className="text-emerald-400">
                    {session.totalVolume.toLocaleString()}
                  </strong>
                </span>
                <span className="text-amber-300 font-bold">+{session.coinsEarned}🪙</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: PR TROPHIES & AVATAR BODY STAGE SWITCHER
         ===================================================================== */}
      {subTab === 'trophies' && (
        <div className="space-y-3.5">
          {/* Body Stage Evolution Selector */}
          <div className="retro-box rounded-2xl p-4 space-y-2.5">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              角色體態進化階段切換
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'beginner', label: '🌱 初心訓練者', desc: '標準勻稱線條' },
                  { id: 'aesthetic', label: '⚡ 精實美學體態', desc: '倒三角肩腰比' },
                  { id: 'powerlifter', label: '🐻 重裝健力霸主', desc: '厚實胸背力量感' },
                  { id: 'titan', label: '👑 傳奇巨獸體態', desc: '極致寬肩與金色氣場' },
                ] as { id: AvatarBodyStage; label: string; desc: string }[]
              ).map((st) => (
                <button
                  key={st.id}
                  onClick={() => store.setBodyStage(st.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    store.bodyStage === st.id
                      ? 'bg-emerald-950/40 border-emerald-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-black">{st.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* All Exercises PR Board */}
          <div className="retro-box rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                各動作最高個人紀錄 (PR 殿堂)
              </span>
              <BarChart3 className="w-4 h-4 text-slate-500" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {EXERCISE_LIBRARY.map((ex) => {
                const pr = store.personalRecords[ex.id] || 0;
                return (
                  <div
                    key={ex.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5"
                  >
                    <ExerciseThumbnail exercise={ex} size={36} />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-300 truncate">
                        {ex.nameZh}
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
