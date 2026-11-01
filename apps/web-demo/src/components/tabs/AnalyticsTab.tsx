import React from 'react';
import {
  Lock,
  Trophy,
  Flame,
  Activity,
  Droplets,
  Beef,
  Calendar,
  Scale,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { EXERCISE_LIBRARY } from '../../config/catalogConfig';

export const AnalyticsTab: React.FC = () => {
  const store = useGameStore();
  const bio = store.biometrics;

  // Mifflin-St Jeor BMR calculation
  const bmr = Math.round(
    10 * bio.weightKg +
      6.25 * bio.heightCm -
      5 * bio.age +
      (bio.gender === 'male' ? 5 : -161)
  );
  const tdee = Math.round(bmr * bio.activityMultiplier);
  const targetCalories =
    bio.goal === 'cut' ? tdee - 400 : bio.goal === 'bulk' ? tdee + 300 : tdee;

  const bmi = (bio.weightKg / Math.pow(bio.heightCm / 100, 2)).toFixed(1);
  const proteinMin = Math.round(bio.weightKg * 1.6);
  const proteinMax = Math.round(bio.weightKg * 2.2);
  const waterMl = Math.round(bio.weightKg * 38);

  const totalHistoricalVolume = store.workoutHistory.reduce((acc, h) => acc + h.totalVolume, 0);

  return (
    <div className="p-3.5 space-y-4 pb-10">
      {/* 1. ZERO-PII LOCAL BIOMETRICS SANDBOX PROMISE */}
      <div className="retro-box-emerald rounded-xl p-3 flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-200 leading-relaxed">
          <strong className="text-emerald-300">100% 本機健康隱私沙盒：</strong>
          您的身高、體重、體脂與 TDEE 數據僅儲存於此裝置本地瀏覽器沙盒中，零生理個資上雲。
        </div>
      </div>

      {/* 2. LIFETIME OVERVIEW CARDS */}
      <div className="grid grid-cols-3 gap-2">
        <div className="retro-box rounded-xl p-3 text-center">
          <div className="text-[11px] text-slate-400 font-bold">歷史總噸數</div>
          <div className="text-base font-mono font-black text-emerald-400 mt-1">
            {(totalHistoricalVolume / 1000).toFixed(1)}t
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            {totalHistoricalVolume.toLocaleString()} kg
          </div>
        </div>

        <div className="retro-box rounded-xl p-3 text-center">
          <div className="text-[11px] text-slate-400 font-bold">角色等級</div>
          <div className="text-base font-mono font-black text-amber-400 mt-1">
            Lv.{store.level}
          </div>
          <div className="text-[10px] font-mono text-slate-500">EXP {store.exp}</div>
        </div>

        <div className="retro-box rounded-xl p-3 text-center">
          <div className="text-[11px] text-slate-400 font-bold">當前連勝</div>
          <div className="text-base font-mono font-black text-orange-400 mt-1">
            🔥 {store.streakDays} 天
          </div>
          <div className="text-[10px] font-mono text-cyan-400">
            冰凍卡 ×{store.streakFreezes}
          </div>
        </div>
      </div>

      {/* 3. PERSONAL RECORDS (PR) TROPHY HALL */}
      <div className="retro-box rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>個人最佳紀錄榮譽館 (1RM & PR)</span>
          </h3>
          <span className="text-[10px] font-mono text-amber-400">突破即獲像素獎盃</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {EXERCISE_LIBRARY.slice(0, 6).map((ex) => {
            const best = store.personalRecords[ex.id] || ex.defaultWeightKg;
            return (
              <div
                key={ex.id}
                className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{ex.nameZh}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{ex.muscleLabelZh}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-sm font-mono font-black text-amber-300">{best}kg</div>
                  <div className="text-[9px] font-mono text-emerald-400">PR 紀錄</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 12-WEEK CONSISTENCY PIXEL HEATMAP */}
      <div className="retro-box rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>規律訓練像素熱力圖 (近 12 週)</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-400">連貫性 &gt; 單次暴練</span>
        </div>

        <div className="grid grid-cols-12 gap-1.5 pt-1">
          {Array.from({ length: 48 }).map((_, idx) => {
            const activeLevel =
              idx >= 41
                ? 3
                : (idx * 7 + 3) % 5 === 0
                ? 2
                : idx % 3 === 0
                ? 1
                : 0;
            const bgClass =
              activeLevel === 3
                ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
                : activeLevel === 2
                ? 'bg-emerald-600'
                : activeLevel === 1
                ? 'bg-emerald-900'
                : 'bg-slate-800/80';
            return <div key={idx} className={`h-4 rounded-sm ${bgClass}`} />;
          })}
        </div>
      </div>

      {/* 5. LOCAL BIOMETRICS & EVIDENCE-BASED TDEE / NUTRITION CALCULATOR */}
      <div className="retro-box rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span>運動科學 TDEE 與營養黃金律試算</span>
          </h3>
          <span className="text-[11px] font-mono text-cyan-300">BMI: {bmi}</span>
        </div>

        {/* Sliders / Quick Controls */}
        <div className="grid grid-cols-2 gap-2.5 bg-slate-900 p-3 rounded-xl border border-slate-800">
          <div>
            <label className="text-[11px] text-slate-400 font-bold block">
              身高: <span className="text-white font-mono">{bio.heightCm} cm</span>
            </label>
            <input
              type="range"
              min={145}
              max={205}
              value={bio.heightCm}
              onChange={(e) => store.updateBiometrics({ heightCm: Number(e.target.value) })}
              className="w-full accent-emerald-400 mt-1"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-bold block">
              體重: <span className="text-white font-mono">{bio.weightKg} kg</span>
            </label>
            <input
              type="range"
              min={40}
              max={130}
              value={bio.weightKg}
              onChange={(e) => store.updateBiometrics({ weightKg: Number(e.target.value) })}
              className="w-full accent-emerald-400 mt-1"
            />
          </div>
        </div>

        {/* Goal Switcher */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'cut' as const, label: '🔥 溫和減脂 (-400)' },
            { id: 'maintain' as const, label: '⚖️ 體態維持 (TDEE)' },
            { id: 'bulk' as const, label: '💪 乾淨增肌 (+300)' },
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => store.updateBiometrics({ goal: g.id })}
              className={`py-2 px-1 rounded-lg text-xs font-bold border transition ${
                bio.goal === g.id
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Calculated Output Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
            <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-[10px] text-slate-400">建議每日熱量</div>
            <div className="text-sm font-mono font-black text-white mt-0.5">
              {targetCalories}
            </div>
            <div className="text-[9px] font-mono text-slate-500">kcal (BMR {bmr})</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
            <Beef className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            <div className="text-[10px] text-slate-400">黃金蛋白質</div>
            <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">
              {proteinMin}~{proteinMax}g
            </div>
            <div className="text-[9px] font-mono text-slate-500">1.6~2.2g / kg</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
            <Droplets className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-[10px] text-slate-400">每日飲水量</div>
            <div className="text-sm font-mono font-black text-cyan-300 mt-0.5">
              {waterMl}ml
            </div>
            <div className="text-[9px] font-mono text-slate-500">38ml / kg</div>
          </div>
        </div>
      </div>

      {/* 6. RECENT WORKOUT LOGS */}
      <div className="retro-box rounded-xl p-3.5 space-y-2">
        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>近期本機訓練紀錄</span>
        </h3>
        <div className="space-y-1.5">
          {store.workoutHistory.map((h) => (
            <div
              key={h.id}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-white">{h.topExerciseZh}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {h.dateLabel} · 共 {h.totalSets} 組
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-emerald-400 font-bold">{h.totalVolume.toLocaleString()} kg</div>
                <div className="text-[10px] text-amber-400">+{h.coinsEarned} 🪙 / +{h.expEarned} EXP</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
