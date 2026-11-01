import React from 'react';
import { X, Calendar, Clock, Flame, Coins, Trophy, BookmarkPlus } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { EXERCISE_LIBRARY, WorkoutTemplate } from '../../config/catalogConfig';
import { ExerciseThumbnail } from '../../game/ExerciseThumbnail';

export const SessionDetailModal: React.FC = () => {
  const store = useGameStore();
  const sessionId = store.selectedHistorySessionId;

  if (!sessionId) return null;

  const session = store.workoutHistory.find((s) => s.id === sessionId);
  if (!session) return null;

  const handleSaveSessionAsRoutine = () => {
    const template: WorkoutTemplate = {
      id: `from_hist_${Date.now()}`,
      nameZh: `${session.routineName} (歷史複刻)`,
      nameEn: 'History Routine',
      category: 'my_custom',
      authorName: store.nickname,
      tagZh: '歷史課表',
      exercises: session.exerciseLogs.map((log) => ({
        exerciseId: log.exerciseId,
        sets: log.sets.length,
        reps: log.sets[0]?.reps || 8,
        weightKg: log.sets[0]?.weightKg || 40,
        restSeconds: log.sets[0]?.restSec || 90,
      })),
    };
    store.saveCustomRoutine(template);
    store.setSelectedHistorySessionId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3.5 border-2 border-emerald-500/50 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{session.dateLabel} · 單次完整訓練紀錄</span>
            </div>
            <h3 className="text-base font-black text-white mt-0.5">{session.routineName}</h3>
          </div>
          <button
            onClick={() => store.setSelectedHistorySessionId(null)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              時長
            </div>
            <div className="text-xs font-black font-mono text-white mt-0.5">
              {session.durationMinutes} 分
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
              <Flame className="w-3 h-3 text-emerald-400" />
              總容量
            </div>
            <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">
              {session.totalVolume.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="text-[10px] text-slate-400">完成組數</div>
            <div className="text-xs font-black font-mono text-cyan-300 mt-0.5">
              {session.totalSets} 組
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
              <Coins className="w-3 h-3 text-amber-400" />
              獲得金幣
            </div>
            <div className="text-xs font-black font-mono text-amber-300 mt-0.5">
              +{session.coinsEarned}🪙
            </div>
          </div>
        </div>

        {/* Full Exercise & Set-by-Set Breakdown (V2-01) */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
          <div className="text-xs font-black text-slate-300">
            📋 完整課表動作與各組明細 ({session.exerciseLogs.length} 個動作)
          </div>

          {session.exerciseLogs.map((log, exIdx) => {
            const exObj =
              EXERCISE_LIBRARY.find((e) => e.id === log.exerciseId) || EXERCISE_LIBRARY[0];
            return (
              <div
                key={`${log.exerciseId}_${exIdx}`}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <ExerciseThumbnail exercise={exObj} size={38} />
                    <div>
                      <div className="text-xs font-black text-white">
                        {exIdx + 1}. {log.exerciseNameZh}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        共完成 {log.sets.length} 組 · {exObj.muscleLabelZh}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Set-by-Set Rows */}
                <div className="space-y-1">
                  {log.sets.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-400 font-bold">第 {sIdx + 1} 組</span>
                      <span className="text-white font-black">
                        {st.weightKg} {log.unitLabel} × {st.reps} 次
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">休 {st.restSec}s</span>
                        {st.isPR && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black flex items-center gap-0.5">
                            <Trophy className="w-2.5 h-2.5" />
                            PR
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Action: Save as Reusable Custom Routine or Re-run */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleSaveSessionAsRoutine}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-black flex items-center justify-center gap-1.5"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>另存為我的課表</span>
          </button>
          <button
            onClick={() => store.setSelectedHistorySessionId(null)}
            className="py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black"
          >
            關閉明細
          </button>
        </div>
      </div>
    </div>
  );
};
