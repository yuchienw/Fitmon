import React, { useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { DEMO_REPORT_DISCLAIMER } from '../../config/demo';
import { DemoDevTag } from './DemoDevTag';

export interface ReportModalProps {
  isOpen: boolean;
  targetId: string;
  targetNickname: string;
  onClose: () => void;
  onReported?: () => void;
}

const REPORT_REASONS = [
  '騷擾',
  '不當暱稱或隊名',
  '垃圾邀請',
  '其他',
] as const;

/**
 * 檢舉彈窗 (T3-08d 表單與中性完成畫面)
 *
 * 規範約束：
 * - 檢舉表單與完成頁皆須顯示 DemoDevTag (DEMO_REPORT_DISCLAIMER)
 * - 原因單選；「同時封鎖 ○○」預設勾選
 * - 資安 11/20 規範：自由文字與檢舉原因絕不送到任何地方，console 亦嚴禁輸出
 * - 完成後中性語氣，不承諾處理進度
 */
export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  targetId,
  targetNickname,
  onClose,
  onReported,
}) => {
  const store = useGameStore();
  const [selectedReason, setSelectedReason] = useState<string>('垃圾邀請');
  const [alsoBlock, setAlsoBlock] = useState<boolean>(true);
  const [isDone, setIsDone] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsDone(false);
    setSelectedReason('垃圾邀請');
    setAlsoBlock(true);
    onClose();
  };

  const handleSubmit = () => {
    // 嚴格禁止任何 console.log / info / warn / error 輸出理由與自由文字
    store.reportPlayerAction({
      targetId,
      reason: selectedReason,
      alsoBlock,
    });
    setIsDone(true);
    onReported?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#29221E]/45 backdrop-blur-[1px]"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[340px] bg-[#FAF6F0] text-[#29221E] border-[1.5px] border-[#E5DCCB] rounded-[20px] shadow-[0_5px_0_#D8CCB8] p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題列 */}
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl border border-[#E5DCCB] bg-white flex items-center justify-center text-[#5C4A3E] shrink-0"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.4]" />
          </button>
          <b className="text-[17px] font-black flex-1 truncate">
            檢舉 {targetNickname}
          </b>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl border border-[#E5DCCB] bg-white flex items-center justify-center text-[#5C4A3E] shrink-0"
          >
            <X className="w-4 h-4 stroke-[2.4]" />
          </button>
        </div>

        {!isDone ? (
          /* 8d 表單畫面 */
          <div data-testid="report-form" className="space-y-3">
            {/* 試玩版免責標籤 */}
            <div className="-mt-1 mb-2">
              <DemoDevTag text={DEMO_REPORT_DISCLAIMER} dataTestId="report-demo-tag" />
            </div>

            {/* 檢舉原因清單 */}
            <div className="bg-white border-[1.5px] border-[#E5DCCB] rounded-[14px] shadow-[0_3px_0_#E5DCCB] px-3 py-1">
              <div className="text-[13.5px] font-black text-[#29221E] pt-2.5 pb-1">
                檢舉原因
              </div>
              {REPORT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <div
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className="flex items-center gap-2.5 py-2.5 border-t border-[#F0E8DA] text-[13.5px] font-extrabold cursor-pointer select-none"
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'border-[#EA580C] bg-white'
                          : 'border-[#C9B8A2] bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                      )}
                    </div>
                    <div className="flex-1 text-[#29221E]">{reason}</div>
                  </div>
                );
              })}
            </div>

            {/* 同時封鎖勾選框 */}
            <div className="bg-white border-[1.5px] border-[#E5DCCB] rounded-[14px] shadow-[0_3px_0_#E5DCCB] px-3 py-2.5">
              <div
                onClick={() => setAlsoBlock(!alsoBlock)}
                data-testid="report-also-block"
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                    alsoBlock
                      ? 'bg-[#EA580C] border-[#EA580C]'
                      : 'bg-white border-[#C9B8A2]'
                  }`}
                >
                  {alsoBlock && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-black text-[#29221E]">
                    同時封鎖 {targetNickname}
                  </div>
                  <div className="text-[11px] text-[#786B63] font-bold">
                    對方不會知道
                  </div>
                </div>
              </div>
            </div>

            {/* 送出按鈕 */}
            <button
              type="button"
              data-testid="report-submit"
              onClick={handleSubmit}
              className="w-full py-2.5 rounded-[14px] font-black text-[15px] text-white bg-gradient-to-b from-[#FB923C] to-[#EA580C] shadow-[0_4px_0_#B8460A] active:translate-y-0.5 active:shadow-none transition flex items-center justify-center"
            >
              送出
            </button>
          </div>
        ) : (
          /* 8d 完成畫面 */
          <div data-testid="report-done" className="text-center py-4 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-[20px] bg-[#E8F5EE] border-[1.5px] border-[#B9E3CF] flex items-center justify-center text-[#0F7A55]">
              <Check className="w-8 h-8 stroke-[2.6]" />
            </div>

            <div className="text-[16px] font-black text-[#29221E]">
              謝謝你告訴我們
            </div>

            <div className="text-[12.5px] text-[#786B63] leading-[1.6] px-2">
              {alsoBlock
                ? `我們收到了。也已經幫你封鎖 ${targetNickname}，對方不會知道。`
                : '我們收到了。謝謝你協助維護社群環境。'}
            </div>

            <div>
              <DemoDevTag text={DEMO_REPORT_DISCLAIMER} dataTestId="report-done-demo-tag" />
            </div>

            <div className="pt-2">
              <button
                type="button"
                data-testid="report-done-button"
                onClick={handleClose}
                className="w-full max-w-[200px] mx-auto py-2.5 rounded-[14px] font-black text-[15px] text-white bg-gradient-to-b from-[#FB923C] to-[#EA580C] shadow-[0_4px_0_#B8460A] active:translate-y-0.5 active:shadow-none transition flex items-center justify-center"
              >
                完成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
