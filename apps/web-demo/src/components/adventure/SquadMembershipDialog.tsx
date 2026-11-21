import React from 'react';

export interface LeaveConfirmDialogProps {
  isOpen: boolean;
  confirmText: string;
  claimedNote?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const LeaveConfirmDialog: React.FC<LeaveConfirmDialogProps> = ({
  isOpen,
  confirmText,
  claimedNote,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="leave-confirm-dialog"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xs retro-box rounded-2xl p-4 bg-[#FFFCF7] border-2 border-[#F3C29A] text-center space-y-3 shadow-2xl">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] font-black text-xl">
            🚪
          </div>
        </div>

        <div className="text-base font-black text-[#29221E] leading-snug">
          {confirmText}
        </div>

        {claimedNote && (
          <div
            data-testid="boss-reward-claimed-note"
            className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-2.5 leading-relaxed text-left"
          >
            ⚠️ {claimedNote}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            data-testid="leave-confirm-cancel"
            onClick={onClose}
            className="py-2 rounded-xl bg-white border border-[#E5DCCB] text-[#5C4A3E] text-xs font-black hover:bg-slate-100 transition"
          >
            先不要
          </button>
          <button
            type="button"
            data-testid="leave-confirm-yes"
            onClick={onConfirm}
            className="py-2 rounded-xl bg-[#FFF1E4] border border-[#EA580C] text-[#C2410C] hover:bg-[#FED7AA] text-xs font-black shadow transition"
          >
            確定離開
          </button>
        </div>
      </div>
    </div>
  );
};

export interface KickConfirmDialogProps {
  isOpen: boolean;
  memberName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const KickConfirmDialog: React.FC<KickConfirmDialogProps> = ({
  isOpen,
  memberName,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="kick-confirm-dialog"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xs retro-box rounded-2xl p-4 bg-[#FFFCF7] border-2 border-[#F3C29A] text-center space-y-3 shadow-2xl">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] font-black text-xl">
            👋
          </div>
        </div>

        <div className="text-base font-black text-[#29221E] leading-snug">
          確定請 {memberName} 離開這支隊伍？
        </div>

        <div className="text-xs text-[#5C4A3E] leading-relaxed">
          對方會回到自己的隊伍。
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            data-testid="kick-confirm-cancel"
            onClick={onClose}
            className="py-2 rounded-xl bg-white border border-[#E5DCCB] text-[#5C4A3E] text-xs font-black hover:bg-slate-100 transition"
          >
            先不要
          </button>
          <button
            type="button"
            data-testid="kick-confirm-yes"
            onClick={onConfirm}
            className="py-2 rounded-xl bg-[#FFF1E4] border border-[#EA580C] text-[#C2410C] hover:bg-[#FED7AA] text-xs font-black shadow transition"
          >
            確定請離
          </button>
        </div>
      </div>
    </div>
  );
};
