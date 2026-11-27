import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { ImplausibleEvaluationResult } from '../../game/implausibleCapsEvaluator';

export interface WalkToRunSheetProps {
  isOpen: boolean;
  evaluation: ImplausibleEvaluationResult | null;
  onChangeToRun: () => void;
  onKeepWalk: () => void;
}

export const WalkToRunSheet: React.FC<WalkToRunSheetProps> = ({
  isOpen,
  evaluation,
  onChangeToRun,
  onKeepWalk,
}) => {
  if (!isOpen || !evaluation) return null;

  const copy = evaluation.copy;

  return (
    <div
      data-testid="walk-to-run-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-to-run-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-md bg-[#FFFDF8] border-2 border-orange-300 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        style={{
          boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.2), 0 8px 10px -6px rgba(234, 88, 12, 0.2)',
        }}
      >
        {/* Grab bar for mobile */}
        <div className="w-10 h-1 bg-amber-200 rounded-full mx-auto sm:hidden" />

        {/* Header with Title and Body */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-600 shrink-0 text-2xl font-black">
            🏃
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="walk-to-run-title"
              className="text-lg font-black text-slate-900 leading-snug"
            >
              {copy?.title || '要不要改成跑步？'}
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed mt-1 font-medium">
              {copy?.message}
            </p>
          </div>
        </div>

        {/* Visual: 快走 → 跑步 */}
        <div className="flex items-center justify-center gap-3 py-2">
          {/* Left: 快走 */}
          <div className="flex-1 p-3 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-center">
            <span className="text-2xl mb-1">🚶</span>
            <span className="text-xs font-black text-slate-600">快走</span>
          </div>

          {/* Arrow */}
          <div className="text-orange-600 font-black">
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </div>

          {/* Right: 跑步 (Highlighted) */}
          <div className="flex-1 p-3 rounded-xl border-2 border-orange-400 bg-orange-50/80 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-2xl mb-1">🏃</span>
            <span className="text-xs font-black text-orange-700">跑步</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary: 改成跑步 */}
          <button
            type="button"
            data-testid="walk-change-to-run"
            onClick={onChangeToRun}
            className="w-full py-3 px-4 rounded-xl font-black text-sm text-white shadow-md transition active:scale-95 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 border border-orange-600"
          >
            {copy?.primaryButton || '改成跑步'}
          </button>

          {/* Secondary: 維持快走 */}
          <button
            type="button"
            data-testid="walk-keep-walk"
            onClick={onKeepWalk}
            className="w-full py-2.5 px-4 rounded-xl font-black text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition active:scale-95"
          >
            {copy?.secondaryButton || '維持快走'}
          </button>
        </div>

        {/* Green Note */}
        <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
          <span>{copy?.note || '都不改也沒關係，這筆照樣算數。'}</span>
        </div>
      </div>
    </div>
  );
};
