import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { ImplausibleEvaluationResult } from '../../game/implausibleCapsEvaluator';

export interface ImplausibleSheetProps {
  isOpen: boolean;
  evaluation: ImplausibleEvaluationResult | null;
  /** 當前 session 的摘要資訊，供 Sheet 中間卡片顯示欄位數值 */
  sessionSummary?: {
    durationMinutes?: number;
    durationSec?: number;
    distanceKm?: number;
    distanceM?: number;
    weightKg?: number;
    reps?: number;
    totalSets?: number;
    sportType?: string;
  };
  onEdit: () => void;
  onSaveAnyway: () => void;
}

export const ImplausibleSheet: React.FC<ImplausibleSheetProps> = ({
  isOpen,
  evaluation,
  sessionSummary,
  onEdit,
  onSaveAnyway,
}) => {
  if (!isOpen || !evaluation) return null;

  const copy = evaluation.copy;
  const flagged = new Set(evaluation.flaggedFields);

  return (
    <div
      data-testid="implausible-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="implausible-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-md bg-[#FFFDF8] border-2 border-amber-300 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        style={{
          boxShadow: '0 10px 25px -5px rgba(217, 119, 6, 0.2), 0 8px 10px -6px rgba(217, 119, 6, 0.2)',
        }}
      >
        {/* Grab bar for mobile */}
        <div className="w-10 h-1 bg-amber-200 rounded-full mx-auto sm:hidden" />

        {/* Header with amber icon and title */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="implausible-title"
              className="text-lg font-black text-slate-900 leading-snug"
            >
              {copy?.title || '這筆數字好像怪怪的'}
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed mt-1 font-medium">
              {copy?.message}
            </p>
          </div>
        </div>

        {/* Suspicious values preview box */}
        {sessionSummary && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2 text-xs">
            {typeof sessionSummary.durationMinutes === 'number' && sessionSummary.durationMinutes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">時長</span>
                <span
                  className={`font-mono font-black ${
                    flagged.has('duration') ? 'text-[#C2410C] bg-amber-200/60 px-1.5 py-0.5 rounded' : 'text-slate-800'
                  }`}
                >
                  {sessionSummary.durationMinutes} 分鐘
                  {flagged.has('duration') ? '？' : ''}
                </span>
              </div>
            )}

            {typeof sessionSummary.distanceKm === 'number' && sessionSummary.distanceKm > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">距離</span>
                <span
                  className={`font-mono font-black ${
                    flagged.has('distanceM') ? 'text-[#C2410C] bg-amber-200/60 px-1.5 py-0.5 rounded' : 'text-slate-800'
                  }`}
                >
                  {sessionSummary.distanceKm} 公里
                  {flagged.has('distanceM') ? '？' : ''}
                </span>
              </div>
            )}

            {typeof sessionSummary.weightKg === 'number' && sessionSummary.weightKg > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">單組重量</span>
                <span
                  className={`font-mono font-black ${
                    flagged.has('weightKg') ? 'text-[#C2410C] bg-amber-200/60 px-1.5 py-0.5 rounded' : 'text-slate-800'
                  }`}
                >
                  {sessionSummary.weightKg} 公斤
                  {flagged.has('weightKg') ? '？' : ''}
                </span>
              </div>
            )}

            {typeof sessionSummary.reps === 'number' && sessionSummary.reps > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">單組次數</span>
                <span
                  className={`font-mono font-black ${
                    flagged.has('reps') ? 'text-[#C2410C] bg-amber-200/60 px-1.5 py-0.5 rounded' : 'text-slate-800'
                  }`}
                >
                  {sessionSummary.reps} 次{flagged.has('reps') ? '？' : ''}
                </span>
              </div>
            )}

            {typeof sessionSummary.totalSets === 'number' && sessionSummary.totalSets > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold">總組數</span>
                <span
                  className={`font-mono font-black ${
                    flagged.has('totalSets') ? 'text-[#C2410C] bg-amber-200/60 px-1.5 py-0.5 rounded' : 'text-slate-800'
                  }`}
                >
                  {sessionSummary.totalSets} 組{flagged.has('totalSets') ? '？' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footnote */}
        <p className="text-[11.5px] text-slate-600 leading-relaxed font-medium">
          {copy?.footnote || '這筆會先存著，暫時不算進今天的打卡。改好之後會重新計算。'}
        </p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary Button: 修改數字 */}
          <button
            type="button"
            data-testid="implausible-edit"
            onClick={onEdit}
            className="w-full py-3 px-4 rounded-xl font-black text-sm text-white shadow-md transition active:scale-95 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border border-amber-600"
          >
            {copy?.primaryButton || '修改數字'}
          </button>

          {/* Tertiary Text Button: 先這樣存 */}
          <button
            type="button"
            data-testid="implausible-save-anyway"
            onClick={onSaveAnyway}
            className="w-full py-2 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-amber-100/50 rounded-lg transition active:scale-95 text-center"
          >
            {copy?.secondaryButton || '先這樣存'}
          </button>
        </div>
      </div>
    </div>
  );
};
