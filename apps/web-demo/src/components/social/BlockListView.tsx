import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { getFriendProfile } from '../../config/catalogConfig';
import { DEMO_NICKNAME_FALLBACKS } from '../../game/notificationCenter';
import { DemoDevTag } from './DemoDevTag';

export interface BlockListViewProps {
  onBack: () => void;
}

interface BlockedItemInfo {
  id: string;
  nickname: string;
  level: number;
  avatar: string;
  isDemo: boolean;
}

/**
 * 封鎖名單子畫面 (T3-08c)
 * 規範約束：
 * - 顯示「封鎖後你們互相搜不到、不能互邀、不能互加好友。對方不會知道。」
 * - 每一列有頭像、暱稱、等級與「解除封鎖」按鈕
 * - 點擊解除封鎖跳出 8c-unblock-confirm 確認框：「解除後，對方又能用代碼找到你、邀請你。對方不會收到通知。」
 */
export const BlockListView: React.FC<BlockListViewProps> = ({ onBack }) => {
  const store = useGameStore();
  const blockedIds = store.blockedIds || [];

  const [unblockingTarget, setUnblockingTarget] = useState<BlockedItemInfo | null>(null);

  // 解析封鎖玩家資訊
  const resolveBlockedInfo = (id: string): BlockedItemInfo => {
    const prof = getFriendProfile(id);
    if (prof) {
      return {
        id,
        nickname: prof.nameZh,
        level: prof.level,
        avatar: prof.nameZh ? prof.nameZh.charAt(0) : '友',
        isDemo: true,
      };
    }
    const fallback = DEMO_NICKNAME_FALLBACKS[id];
    if (fallback) {
      return {
        id,
        nickname: fallback.nickname,
        level: fallback.level,
        avatar: fallback.nickname.charAt(0),
        isDemo: true,
      };
    }
    const clean = id.replace(/^(user_|friend_|demo_)/, '');
    const nick = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '玩家';
    return {
      id,
      nickname: nick,
      level: 5,
      avatar: nick.charAt(0),
      isDemo: ['mika', 'jun', 'leo', 'akai'].some((name) => clean.toLowerCase().includes(name)),
    };
  };

  const handleUnblockConfirm = () => {
    if (!unblockingTarget) return;
    store.unblockPlayerAction(unblockingTarget.id);
    setUnblockingTarget(null);
  };

  return (
    <div data-testid="block-list-view" className="space-y-3 pb-8">
      {/* 標題列 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="block-list-back"
          onClick={onBack}
          className="w-8 h-8 rounded-xl border border-[#E5DCCB] bg-white flex items-center justify-center text-[#5C4A3E] shrink-0 active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.4]" />
        </button>
        <b className="text-[17px] font-black text-[#29221E] flex-1">封鎖名單</b>
        <span className="text-[10.5px] font-black bg-[#FAF6F0] border border-[#E5DCCB] rounded-full px-2 py-0.5 text-[#5C4A3E]">
          {blockedIds.length} 人
        </span>
      </div>

      {/* 說明文案 */}
      <div className="text-[11px] text-[#786B63] leading-[1.55] px-0.5">
        封鎖後你們互相搜不到、不能互邀、不能互加好友。對方不會知道。
      </div>

      {/* 名單清單 */}
      {blockedIds.length === 0 ? (
        <div className="bg-white border-[1.5px] border-[#E5DCCB] rounded-[16px] p-8 text-center text-xs text-[#786B63] font-bold">
          目前沒有封鎖名單
        </div>
      ) : (
        <div className="space-y-2">
          {blockedIds.map((id) => {
            const info = resolveBlockedInfo(id);
            return (
              <div
                key={id}
                data-testid={`blocked-item-${id}`}
                className="flex items-center gap-2.5 p-2.5 bg-white border-[1.5px] border-[#E5DCCB] rounded-[14px] shadow-[0_3px_0_#E5DCCB]"
              >
                {/* 頭像 */}
                <div className="w-9 h-9 rounded-full bg-[#C7D2FE] text-[#312E81] border-2 border-white shadow-xs flex items-center justify-center font-black text-sm shrink-0">
                  {info.avatar}
                </div>

                {/* 名稱與等級 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-black text-[#29221E] truncate">
                      {info.nickname}
                    </span>
                    <span className="text-[10px] font-black bg-[#FAF6F0] border border-[#E5DCCB] rounded-full px-1.5 py-0.2 text-[#5C4A3E]">
                      Lv.{info.level}
                    </span>
                    {info.isDemo && <DemoDevTag text="試玩角色" />}
                  </div>
                </div>

                {/* 解除封鎖按鈕 */}
                <button
                  type="button"
                  data-testid={`unblock-button-${id}`}
                  onClick={() => setUnblockingTarget(info)}
                  className="px-3 h-[30px] rounded-[11px] font-black text-[12.5px] bg-[#FFFDF8] text-[#5C4A3E] border-[1.5px] border-[#E5DCCB] shadow-[0_3px_0_#E5DCCB] active:translate-y-0.5 active:shadow-none transition shrink-0"
                >
                  解除封鎖
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 8c 解除封鎖確認彈窗 */}
      {unblockingTarget && (
        <div
          data-testid="unblock-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#29221E]/45 backdrop-blur-[1px]"
          onClick={() => setUnblockingTarget(null)}
        >
          <div
            className="w-full max-w-[320px] bg-[#FFFDF8] border-[1.5px] border-[#E5DCCB] rounded-[18px] shadow-[0_5px_0_#D8CCB8] p-4 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              <div className="w-13 h-13 rounded-full bg-[#C7D2FE] text-[#312E81] border-2 border-white shadow-sm flex items-center justify-center font-black text-xl">
                {unblockingTarget.avatar}
              </div>
            </div>

            <div className="text-[16.5px] font-black text-[#29221E] mt-2">
              要解除封鎖 {unblockingTarget.nickname} 嗎？
            </div>

            <div className="text-[12.5px] text-[#5C4A3E] leading-[1.6] mt-1.5">
              解除後，對方又能用代碼找到你、邀請你。對方不會收到通知。
            </div>

            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                data-testid="unblock-confirm-cancel"
                onClick={() => setUnblockingTarget(null)}
                className="flex-1 h-[38px] rounded-xl font-black text-sm bg-[#FFFDF8] text-[#5C4A3E] border-[1.5px] border-[#E5DCCB] shadow-[0_3px_0_#E5DCCB] active:translate-y-0.5 active:shadow-none transition"
              >
                先不要
              </button>
              <button
                type="button"
                data-testid="unblock-confirm-submit"
                onClick={handleUnblockConfirm}
                className="flex-1 h-[38px] rounded-xl font-black text-sm bg-[#FFFDF8] text-[#C2410C] border-[1.5px] border-[#EA580C] shadow-[0_3px_0_#E7C4A8] active:translate-y-0.5 active:shadow-none transition"
              >
                解除封鎖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
