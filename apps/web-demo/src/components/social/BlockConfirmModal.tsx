import React from 'react';
import { Ban } from 'lucide-react';

export interface BlockConfirmModalProps {
  isOpen: boolean;
  targetId: string;
  targetNickname: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 封鎖確認框 (T3-08c / 8c-block-confirm)
 * 從通知 ⋯、名片 ⋯、好友列表 ⋯ 共用同一個確認框。
 * 規範約束：
 * - 必須明確告知「對方不會知道」
 * - 主按鈕為橘色外框 (#EA580C)，絕不使用紅色
 * - 解除路徑說明：「我的 › 隱私與安全 › 封鎖名單」
 */
export const BlockConfirmModal: React.FC<BlockConfirmModalProps> = ({
  isOpen,
  targetNickname,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="block-confirm"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#29221E]/45 backdrop-blur-[1px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[320px] bg-[#FFFDF8] border-[1.5px] border-[#E5DCCB] rounded-[18px] shadow-[0_5px_0_#D8CCB8] p-4 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 圖示 */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#F4EFE6] border border-[#E5DCCB] flex items-center justify-center text-[#5C4A3E]">
            <Ban className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* 標題 */}
        <div className="text-[16.5px] font-black text-[#29221E] mt-2">
          要封鎖 {targetNickname} 嗎？
        </div>

        {/* 說明文案 */}
        <div className="text-[12.5px] text-[#5C4A3E] leading-[1.6] mt-1.5">
          對方不會知道。封鎖後你們互相搜不到、不能互邀、不能互加好友，對方送來的邀請也會失效。
        </div>

        {/* 解除路徑提示 */}
        <div className="text-[11.5px] text-[#786B63] mt-1">
          之後可以在「我的 › 隱私與安全 › 封鎖名單」解除。
        </div>

        {/* 按鈕組 */}
        <div className="flex gap-2.5 mt-4">
          <button
            type="button"
            data-testid="block-confirm-cancel"
            onClick={onCancel}
            className="flex-1 h-[38px] rounded-xl font-black text-sm bg-[#FFFDF8] text-[#5C4A3E] border-[1.5px] border-[#E5DCCB] shadow-[0_3px_0_#E5DCCB] active:translate-y-0.5 active:shadow-none transition"
          >
            先不要
          </button>
          <button
            type="button"
            data-testid="block-confirm-submit"
            onClick={onConfirm}
            className="flex-1 h-[38px] rounded-xl font-black text-sm bg-[#FFFDF8] text-[#C2410C] border-[1.5px] border-[#EA580C] shadow-[0_3px_0_#E7C4A8] active:translate-y-0.5 active:shadow-none transition"
          >
            封鎖
          </button>
        </div>
      </div>
    </div>
  );
};
