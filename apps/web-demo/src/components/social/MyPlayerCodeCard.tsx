import React, { useState } from 'react';
import { Copy, RefreshCw, Clock, QrCode, Check } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  canRegeneratePlayerCode,
  formatRegenLockedCountdown,
  shouldShowPlayerCode,
} from '../../game/friendSocial';

export const MyPlayerCodeCard: React.FC = () => {
  const store = useGameStore();
  const [copied, setCopied] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const isMinor = store.devMinorTestAccount === true;

  // 1. 未成年保護（ADR-0004 / Q13 / 7e）：嚴格不顯示玩家代碼，改放當面好友 QR 占位
  if (!shouldShowPlayerCode(isMinor)) {
    return (
      <div className="bg-[#FFFDF8] border-2 border-dashed border-[#F3C29A] rounded-2xl p-4 text-center space-y-2">
        <div className="flex justify-center text-[#8A7A6C]">
          <QrCode className="w-10 h-10 text-[#8A7A6C]" />
        </div>
        <div className="text-[14.5px] font-black text-[#5C4A3E]">請用好友 QR 加好友</div>
        <p className="text-xs text-[#786B63] leading-relaxed">
          當面讓朋友掃你的好友 QR，就能互加好友。
        </p>
        <div className="pt-1">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded border border-dashed border-amber-600 bg-amber-100 text-amber-800">
            占位・真 QR 在第 2 階段（T2）
          </span>
        </div>
      </div>
    );
  }

  // 2. 成人版玩家代碼卡 (7b)
  const now = Date.now();
  const rawCode = store.playerCode || '';
  const canRegen = canRegeneratePlayerCode(store.playerCodeGeneratedAt, now);
  const countdown = formatRegenLockedCountdown(store.playerCodeGeneratedAt, now);

  // 4碼 + 空格 + 4碼 顯示格式
  const displayCode =
    rawCode.length === 8 ? `${rawCode.slice(0, 4)} ${rawCode.slice(4)}` : rawCode;

  const handleCopy = () => {
    // 規範：複製出去為無空格的 8 碼代碼
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(rawCode).catch(() => {});
    }
    setCopied(true);
    store.showToast('已複製');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmRegen = () => {
    // 試玩用，第 2 階段由伺服器產生
    const ok = store.regeneratePlayerCodeAction();
    setShowRegenConfirm(false);
  };

  return (
    <>
      <div className="bg-[#FFFDF8] border-2 border-dashed border-[#F3C29A] rounded-2xl p-3.5 space-y-2.5 text-[#5C4A3E]">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-black text-[#5C4A3E]">我的玩家代碼</span>

          {/* 重新產生按鈕 (24小時冷卻) */}
          {canRegen ? (
            <button
              onClick={() => setShowRegenConfirm(true)}
              data-testid="player-code-regen"
              className="flex items-center gap-1 text-[11.5px] font-extrabold text-[#786B63] hover:text-[#EA580C] transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-[#786B63]" />
              <span>重新產生</span>
            </button>
          ) : (
            <span
              aria-disabled="true"
              className="flex items-center gap-1 text-[11.5px] font-extrabold text-[#B5A898] cursor-not-allowed select-none"
            >
              <RefreshCw className="w-3 h-3 text-[#B5A898]" />
              <span>重新產生</span>
            </span>
          )}
        </div>

        {/* 24 小時內鎖定提示 (7b-code-regenerate-locked) */}
        {!canRegen && (
          <div className="flex items-start gap-1.5 bg-[#F4EFE6] border border-[#E5DCCB] rounded-xl p-2 text-xs font-bold text-[#5C4A3E] leading-relaxed">
            <Clock className="w-3.5 h-3.5 text-[#786B63] shrink-0 mt-0.5" />
            <div>
              代碼 24 小時內只能換一次，
              <br />
              <span className="font-extrabold text-[#C2410C]">
                {countdown.longText.split('，')[1] || countdown.shortText}
              </span>
            </div>
          </div>
        )}

        {/* 代碼展示列與複製按鈕 */}
        <div className="flex items-center justify-between bg-white/90 border border-[#E5DCCB] rounded-xl px-3 py-2">
          <span className="font-mono font-black text-xl tracking-[0.18em] text-[#29221E] select-all">
            {displayCode}
          </span>

          <button
            onClick={handleCopy}
            data-testid="player-code-copy"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EA580C] bg-[#FFF1E4] text-[#C2410C] text-xs font-black hover:bg-[#FED7AA] active:scale-95 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>已複製</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>複製</span>
              </>
            )}
          </button>
        </div>

        {/* 底部說明文案 */}
        <p className="text-[11px] text-[#786B63] leading-relaxed">
          把代碼給想加你的朋友，對方要輸入完整代碼才找得到你。
        </p>
      </div>

      {/* 重新產生確認框 (7b-code-regenerate) */}
      {showRegenConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs retro-box rounded-2xl p-4 bg-[#FFFCF7] border-2 border-[#F3C29A] text-center space-y-3 shadow-2xl">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-[#EA580C]">
                <RefreshCw className="w-6 h-6" />
              </div>
            </div>

            <div className="text-base font-black text-[#29221E]">重新產生玩家代碼？</div>

            <div className="text-xs text-[#5C4A3E] leading-relaxed space-y-1">
              <p>舊代碼會失效，拿到舊代碼的人就找不到你。</p>
              <p>現在的好友不受影響。</p>
              <p className="text-[11px] text-[#786B63] pt-1">每天可以換一次。</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setShowRegenConfirm(false)}
                className="py-2 rounded-xl bg-white border border-[#E5DCCB] text-[#5C4A3E] text-xs font-black hover:bg-slate-100 transition"
              >
                先不要
              </button>
              <button
                onClick={handleConfirmRegen}
                data-testid="player-code-regen-confirm"
                className="py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black shadow transition"
              >
                重新產生
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
