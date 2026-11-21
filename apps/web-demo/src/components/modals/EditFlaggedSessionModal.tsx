import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import type { WorkoutSessionRecord } from '../../stores/useGameStore';
import { evaluateImplausibleSession } from '../../game/implausibleCapsEvaluator';

export interface EditFlaggedSessionModalProps {
  isOpen: boolean;
  session: WorkoutSessionRecord | null;
  otherDaySessions?: WorkoutSessionRecord[];
  onClose: () => void;
  onSave: (sessionId: string, updates: Partial<WorkoutSessionRecord>) => void;
}

export const EditFlaggedSessionModal: React.FC<EditFlaggedSessionModalProps> = ({
  isOpen,
  session,
  otherDaySessions = [],
  onClose,
  onSave,
}) => {
  if (!isOpen || !session) return null;

  // Initial evaluation to determine flagged fields
  const currentEval = evaluateImplausibleSession(session, { otherDaySessions });
  const flagged = new Set(currentEval.flaggedFields);

  // Local state for editable fields
  const [durationMin, setDurationMin] = useState<number>(session.durationMinutes || 10);
  const [distanceKm, setDistanceKm] = useState<string>(
    typeof session.distanceM === 'number' && session.distanceM > 0
      ? String(session.distanceM / 1000)
      : ''
  );
  const [sportType, setSportType] = useState<string>(session.sportType || 'strength');

  // Flatten sets from exerciseLogs for editing
  const [setsData, setSetsData] = useState<Array<{ weightKg: number; reps: number }>>(() => {
    const sets: Array<{ weightKg: number; reps: number }> = [];
    if (session.exerciseLogs) {
      session.exerciseLogs.forEach((log) => {
        log.sets.forEach((s) => {
          sets.push({ weightKg: s.weightKg || 0, reps: s.reps || 0 });
        });
      });
    }
    return sets;
  });

  // Keep state in sync if session prop changes
  useEffect(() => {
    if (session) {
      setDurationMin(session.durationMinutes || 10);
      setDistanceKm(
        typeof session.distanceM === 'number' && session.distanceM > 0
          ? String(session.distanceM / 1000)
          : ''
      );
      setSportType(session.sportType || 'strength');
      const sets: Array<{ weightKg: number; reps: number }> = [];
      if (session.exerciseLogs) {
        session.exerciseLogs.forEach((log) => {
          log.sets.forEach((s) => {
            sets.push({ weightKg: s.weightKg || 0, reps: s.reps || 0 });
          });
        });
      }
      setSetsData(sets);
    }
  }, [session]);

  // Live preview evaluation
  const previewDistanceM = distanceKm ? parseFloat(distanceKm) * 1000 : 0;
  const previewDurationSec = Math.max(1, durationMin * 60);

  const previewEval = evaluateImplausibleSession(
    {
      id: session.id,
      sportType: sportType as any,
      totalDurationSec: previewDurationSec,
      durationSec: previewDurationSec,
      durationMinutes: durationMin,
      distanceM: previewDistanceM,
      sets: setsData,
      totalSets: setsData.length,
      timestamp: session.timestamp,
    },
    {
      otherDaySessions,
      now: session.timestamp,
    }
  );

  const handleSave = () => {
    const updatedSets = setsData;
    let newTotalVolume = 0;
    const updatedLogs = session.exerciseLogs.map((log) => {
      const logSets = log.sets.map((s, idx) => {
        const edited = updatedSets[idx] || { weightKg: s.weightKg, reps: s.reps };
        newTotalVolume += (edited.weightKg || 0) * (edited.reps || 0);
        return {
          ...s,
          weightKg: edited.weightKg,
          reps: edited.reps,
        };
      });
      return {
        ...log,
        sets: logSets,
      };
    });

    const updates: Partial<WorkoutSessionRecord> = {
      durationMinutes: durationMin,
      totalDurationSec: previewDurationSec,
      durationSec: previewDurationSec,
      totalVolume: newTotalVolume > 0 ? newTotalVolume : session.totalVolume,
      totalSets: setsData.length > 0 ? setsData.length : session.totalSets,
      exerciseLogs: updatedLogs,
      sportType: sportType as any,
    };

    if (previewDistanceM > 0) {
      updates.distanceM = previewDistanceM;
    }

    onSave(session.id, updates);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg bg-[#FFFDF8] border-2 border-amber-300 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs">
              修正紀錄
            </span>
            <h3 id="edit-session-title" className="text-sm font-black text-slate-900">
              {session.routineName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status alert */}
        {previewEval.flagReason ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>{previewEval.copy?.message}</span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-bold">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            <span>數值已在正常範圍內，儲存後即可算入打卡計算！</span>
          </div>
        )}

        {/* Editable Form */}
        <div className="space-y-3 text-xs">
          {/* Duration */}
          <div>
            <label className="block font-black text-slate-700 mb-1">
              訓練時長（分鐘）
              {flagged.has('duration') && (
                <span className="text-[#C2410C] font-normal ml-1">（請檢查是否超過 12 小時）</span>
              )}
            </label>
            <input
              type="number"
              min={1}
              max={1440}
              value={durationMin}
              onChange={(e) => setDurationMin(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm outline-none transition ${
                previewEval.flaggedFields.includes('duration')
                  ? 'border-amber-500 bg-amber-50/50 text-[#C2410C]'
                  : 'border-slate-300 bg-white text-slate-900 focus:border-amber-400'
              }`}
            />
          </div>

          {/* Distance (if applicable) */}
          {(typeof session.distanceM === 'number' || distanceKm !== '') && (
            <div>
              <label className="block font-black text-slate-700 mb-1">
                距離（公里）
                {flagged.has('distanceM') && (
                  <span className="text-[#C2410C] font-normal ml-1">（請檢查平均速度）</span>
                )}
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm outline-none transition ${
                  previewEval.flaggedFields.includes('distanceM')
                    ? 'border-amber-500 bg-amber-50/50 text-[#C2410C]'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-amber-400'
                }`}
              />
            </div>
          )}

          {/* Sets weight / reps (if applicable) */}
          {setsData.length > 0 && (
            <div className="space-y-2">
              <label className="block font-black text-slate-700">
                各組重量與次數（共 {setsData.length} 組）
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                {setsData.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-slate-500 font-mono font-bold shrink-0">
                      第 {idx + 1} 組
                    </span>
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={s.weightKg}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          const next = [...setsData];
                          next[idx] = { ...next[idx], weightKg: val };
                          setSetsData(next);
                        }}
                        className={`w-full px-2 py-1 rounded-lg border font-mono text-center outline-none ${
                          s.weightKg > 500
                            ? 'border-amber-500 bg-amber-100 text-[#C2410C] font-black'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                      <span className="text-slate-500 font-bold shrink-0">kg</span>
                    </div>

                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={s.reps}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          const next = [...setsData];
                          next[idx] = { ...next[idx], reps: val };
                          setSetsData(next);
                        }}
                        className={`w-full px-2 py-1 rounded-lg border font-mono text-center outline-none ${
                          s.reps > 100
                            ? 'border-amber-500 bg-amber-100 text-[#C2410C] font-black'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                      <span className="text-slate-500 font-bold shrink-0">次</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-md transition active:scale-95"
          >
            儲存修正
          </button>
        </div>
      </div>
    </div>
  );
};
