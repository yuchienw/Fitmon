import React from 'react';
import { Trophy, Flame, Droplets, Beef, Calendar, Scale } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { EXERCISE_LIBRARY } from '../../config/catalogConfig';

export const AnalyticsTab: React.FC = () => {
  const store = useGameStore();
  const bio = store.biometrics;

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
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. 3-STAT HERO OVERVIEW */}
      <div className="grid grid-cols-3 gap-2">
        <div className="retro-box rounded-2xl p-3 text-center">
          <div className="text-[11px] text-slate-400 font-bold">總累積噸數</div>
          <div className="text-lg font-mono font-black text-emerald-400 mt-0.5">
            {(totalHistoricalVolume / 1000).toFixed(1)}t
          </div>
        </div>

        <div className="retro-box rounded-2xl p-3 text-center">
          <div className="text-[11px] text-slate-400 font-bold">角色等級</div>
          <div className="text-lg font-mono font-black text-amber-400 mt-0.5">
            Lv.{store.level}
          </div>
        </div>

        <div className="retro-box rounded-2xl p-3 text-center">
          <div className="text-[11px] text-slate-400 font-bold">連續打卡</div>
          <div className="text-lg font-mono font-black text-orange-400 mt-0.5">
            🔥{store.streakDays}d
          </div>
        </div>
      </div>

      {/* 2. PR TROPHY GRID */}
      <div className="retro-box rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>最佳重量 PR</span>
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {EXERCISE_LIBRARY.slice(0, 6).map((ex) => {
            const best = store.personalRecords[ex.id] || ex.defaultWeightKg;
            return (
              <div
                key={ex.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center"
              >
                <div className="text-[11px] font-bold text-slate-300 truncate">
                  {ex.nameZh.replace('槓鈴', '').replace('傳統', '')}
                </div>
                <div className="text-sm font-mono font-black text-amber-300 mt-1">{best}kg</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 12-WEEK CONSISTENCY HEATMAP */}
      <div className="retro-box rounded-2xl p-3.5 space-y-2">
        <h3 className="text-xs font-black text-white flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>近 12 週運動熱力圖</span>
        </h3>

        <div className="grid grid-cols-12 gap-1.5">
          {Array.from({ length: 48 }).map((_, idx) => {
            const activeLevel =
              idx >= 41 ? 3 : (idx * 7 + 3) % 5 === 0 ? 2 : idx % 3 === 0 ? 1 : 0;
            const bgClass =
              activeLevel === 3
                ? 'bg-emerald-400'
                : activeLevel === 2
                ? 'bg-emerald-600'
                : activeLevel === 1
                ? 'bg-emerald-900'
                : 'bg-slate-800/80';
            return <div key={idx} className={`h-4 rounded-sm ${bgClass}`} />;
          })}
        </div>
      </div>

      {/* 4. COMPACT TDEE & NUTRITION CALCULATOR */}
      <div className="retro-box rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span>本機 TDEE 營養試算</span>
          </h3>
          <span className="text-xs font-mono text-cyan-300 font-bold">BMI {bmi}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div>
            <label className="text-[11px] text-slate-400 font-bold block">
              身高 <span className="text-white font-mono">{bio.heightCm}cm</span>
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
              體重 <span className="text-white font-mono">{bio.weightKg}kg</span>
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

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'cut' as const, label: '減脂' },
            { id: 'maintain' as const, label: '維持' },
            { id: 'bulk' as const, label: '增肌' },
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => store.updateBiometrics({ goal: g.id })}
              className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                bio.goal === g.id
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center">
            <Flame className="w-4 h-4 text-orange-400 mx-auto mb-0.5" />
            <div className="text-[10px] text-slate-400">目標熱量</div>
            <div className="text-sm font-mono font-black text-white">{targetCalories}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center">
            <Beef className="w-4 h-4 text-rose-400 mx-auto mb-0.5" />
            <div className="text-[10px] text-slate-400">蛋白質</div>
            <div className="text-sm font-mono font-black text-emerald-400">
              {proteinMin}~{proteinMax}g
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center">
            <Droplets className="w-4 h-4 text-cyan-400 mx-auto mb-0.5" />
            <div className="text-[10px] text-slate-400">飲水量</div>
            <div className="text-sm font-mono font-black text-cyan-300">{waterMl}ml</div>
          </div>
        </div>
      </div>
    </div>
  );
};
