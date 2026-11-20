import React, { useState } from 'react';
import { ArrowLeft, Lock, Ban, ChevronRight } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { BlockListView } from './BlockListView';

export interface PrivacySafetyViewProps {
  onBack: () => void;
}

/**
 * 隱私與安全面板 (T3-08a / 08b / 08e)
 *
 * 規範約束：
 * - 8a 誰可以邀請我組隊：所有人（知道我玩家代碼的人） / 只有好友。成人預設來自 DEFAULT_ADULT_INVITE_FROM
 * - 8b 可以用玩家代碼找到我：開關。成人預設來自 DEFAULT_ADULT_DISCOVERABLE_BY_CODE；關閉時顯示說明
 * - 8c 封鎖名單列：顯示「N 人 ›」，進入封鎖名單子畫面
 * - 8e 未成年鎖定：未成年（devMinorTestAccount）兩區塊皆停用鎖定，顯示鎖頭與「未滿 18 歲的帳號只能收到好友的邀請」，點擊無反應且不跳提示
 */
export const PrivacySafetyView: React.FC<PrivacySafetyViewProps> = ({ onBack }) => {
  const store = useGameStore();
  const isMinor = store.devMinorTestAccount === true;
  const privacy = store.privacy;
  const blockedIds = store.blockedIds || [];

  const [showBlockList, setShowBlockList] = useState<boolean>(false);

  if (showBlockList) {
    return <BlockListView onBack={() => setShowBlockList(false)} />;
  }

  const isEveryoneSelected = isMinor ? false : privacy.inviteFrom === 'everyone';
  const isFriendsOnlySelected = isMinor ? true : privacy.inviteFrom === 'friends';
  const isDiscoverable = isMinor ? false : privacy.discoverableByCode;

  return (
    <div data-testid="privacy-safety-view" className="space-y-3 pb-8">
      {/* 標題列 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="privacy-back-button"
          onClick={onBack}
          className="w-8 h-8 rounded-xl border border-[#E5DCCB] bg-white flex items-center justify-center text-[#5C4A3E] shrink-0 active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.4]" />
        </button>
        <b className="text-[17px] font-black text-[#29221E] flex-1">隱私與安全</b>
      </div>

      {/* 區塊 1：誰可以邀請我組隊 (8a / 8e) */}
      <div className="bg-white border-[1.5px] border-[#E5DCCB] rounded-[14px] shadow-[0_3px_0_#E5DCCB] px-3.5 py-1">
        <div className="text-[13.5px] font-black text-[#29221E] pt-2.5 pb-1">
          誰可以邀請我組隊
        </div>

        {/* 8e 未成年鎖定提示 */}
        {isMinor && (
          <div
            data-testid="minor-lock-box-invite"
            className="flex items-start gap-1.5 bg-[#F4EFE6] rounded-[10px] p-2 text-xs font-black text-[#5C4A3E] leading-[1.5] my-1 mb-2"
          >
            <Lock className="w-3.5 h-3.5 text-[#786B63] shrink-0 mt-0.5" />
            <span>未滿 18 歲的帳號只能收到好友的邀請</span>
          </div>
        )}

        {/* 選項：所有人 */}
        <div
          data-testid="privacy-radio-everyone"
          onClick={() => {
            if (isMinor) return;
            store.updatePrivacyAction({ inviteFrom: 'everyone' });
          }}
          className={`flex items-center gap-2.5 py-2.5 border-t border-[#F0E8DA] text-[13.5px] font-extrabold select-none ${
            isMinor ? 'cursor-default text-[#786B63]' : 'cursor-pointer text-[#29221E]'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
              isMinor
                ? 'border-[#D8CCB8] bg-[#F4EFE6]'
                : isEveryoneSelected
                ? 'border-[#EA580C] bg-white'
                : 'border-[#C9B8A2] bg-white'
            }`}
          >
            {isEveryoneSelected && !isMinor && (
              <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
            )}
          </div>
          <div className="flex-1">所有人（知道我玩家代碼的人）</div>
          {isMinor && <Lock className="w-3.5 h-3.5 text-[#A89A8C]" />}
        </div>

        {/* 選項：只有好友 */}
        <div
          data-testid="privacy-radio-friends"
          onClick={() => {
            if (isMinor) return;
            store.updatePrivacyAction({ inviteFrom: 'friends' });
          }}
          className={`flex items-center gap-2.5 py-2.5 border-t border-[#F0E8DA] text-[13.5px] font-extrabold select-none ${
            isMinor ? 'cursor-default text-[#786B63]' : 'cursor-pointer text-[#29221E]'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
              isMinor
                ? 'border-[#D8CCB8] bg-[#F4EFE6]'
                : isFriendsOnlySelected
                ? 'border-[#EA580C] bg-white'
                : 'border-[#C9B8A2] bg-white'
            }`}
          >
            {isFriendsOnlySelected && (
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isMinor ? 'bg-[#A89A8C]' : 'bg-[#EA580C]'
                }`}
              />
            )}
          </div>
          <div className="flex-1">只有好友</div>
          {isMinor && <Lock className="w-3.5 h-3.5 text-[#A89A8C]" />}
        </div>
      </div>

      {/* 區塊 2：可以用玩家代碼找到我 (8b / 8e) */}
      <div className="bg-white border-[1.5px] border-[#E5DCCB] rounded-[14px] shadow-[0_3px_0_#E5DCCB] px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <div className="text-[13.5px] font-black text-[#29221E]">
              可以用玩家代碼找到我
            </div>
            {/* 8b 關閉時的說明 */}
            {!isMinor && !isDiscoverable && (
              <div
                data-testid="code-search-off-hint"
                className="text-[11px] text-[#786B63] font-bold leading-[1.5] mt-1"
              >
                已關閉：別人輸入你的代碼會顯示「找不到這位玩家」。只有好友和最近隊友能邀你。
              </div>
            )}
          </div>

          {isMinor && <Lock className="w-3.5 h-3.5 text-[#A89A8C] shrink-0" />}

          {/* 開關 (44x26) */}
          <div
            data-testid="privacy-toggle-discoverable"
            onClick={() => {
              if (isMinor) return;
              store.updatePrivacyAction({ discoverableByCode: !privacy.discoverableByCode });
            }}
            className={`w-[44px] h-[26px] rounded-full transition relative shrink-0 ${
              isMinor
                ? 'bg-[#E5DCCB] cursor-default'
                : isDiscoverable
                ? 'bg-[#10B981] cursor-pointer'
                : 'bg-[#D8CCB8] cursor-pointer'
            }`}
          >
            <div
              className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-all ${
                isDiscoverable && !isMinor ? 'left-[21px]' : 'left-[3px]'
              }`}
            />
          </div>
        </div>

        {/* 8e 未成年鎖定開關提示 */}
        {isMinor && (
          <div
            data-testid="minor-lock-box-discoverable"
            className="flex items-start gap-1.5 bg-[#F4EFE6] rounded-[10px] p-2 text-xs font-black text-[#5C4A3E] leading-[1.5] mt-2.5"
          >
            <Lock className="w-3.5 h-3.5 text-[#786B63] shrink-0 mt-0.5" />
            <span>未滿 18 歲的帳號只能收到好友的邀請</span>
          </div>
        )}
      </div>

      {/* 區塊 3：封鎖名單 (8a 入口) */}
      <div
        data-testid="privacy-block-list-entry"
        onClick={() => setShowBlockList(true)}
        className="bg-white border-[1.5px] border-[#E5DCCB] rounded-[14px] shadow-[0_3px_0_#E5DCCB] px-3.5 py-3 cursor-pointer hover:border-[#F3C29A] transition select-none flex items-center gap-2.5"
      >
        <Ban className="w-4.5 h-4.5 text-[#5C4A3E] stroke-[2]" />
        <b className="text-[13.5px] font-black text-[#29221E] flex-1">封鎖名單</b>
        <span className="text-xs font-bold text-[#786B63] flex items-center gap-0.5">
          {blockedIds.length} 人
          <ChevronRight className="w-4 h-4 text-[#A89A8C]" />
        </span>
      </div>
    </div>
  );
};
