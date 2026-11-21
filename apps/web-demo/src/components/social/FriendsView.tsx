import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Clock,
  MoreHorizontal,
  Ban,
  Flag,
  Trash2,
  Check,
  X,
  QrCode,
  Users,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  isValidPlayerCode,
  sortFriends,
  getFriendRequestView,
  shouldShowCodeSearch,
  type PlayerSearchResult,
} from '../../game/friendSocial';
import {
  getFriendProfile,
  resolveFriendProfileId,
} from '../../config/catalogConfig';
import { DEMO_NICKNAME_FALLBACKS } from '../../game/notificationCenter';
import { DEMO_PLAYER_ID } from '../../game/persistMigrate';
import { IS_DEMO, DEMO_REPORT_DISCLAIMER } from '../../config/demo';
import { DemoDevTag } from './DemoDevTag';
import { BlockConfirmModal } from './BlockConfirmModal';
import { ReportModal } from './ReportModal';

export { DemoDevTag };

export const FriendsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const store = useGameStore();
  const isMinor = store.devMinorTestAccount === true;

  // 搜尋狀態
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<PlayerSearchResult | null>(null);

  // 更多選單與移除彈窗狀態
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [removingFriend, setRemovingFriend] = useState<{
    id: string;
    nickname: string;
    isSameSquad: boolean;
  } | null>(null);
  const [blockingTarget, setBlockingTarget] = useState<{ id: string; nickname: string } | null>(null);
  const [reportingTarget, setReportingTarget] = useState<{ id: string; nickname: string } | null>(null);

  // 輔助解析玩家名稱與等級
  const resolveInfo = (id: string) => {
    const profile = getFriendProfile(id);
    if (profile) {
      return {
        id: profile.id,
        nickname: profile.nameZh,
        level: profile.level,
        avatar: profile.nameZh ? profile.nameZh.charAt(0) : '友',
      };
    }
    const fallback = DEMO_NICKNAME_FALLBACKS[id];
    if (fallback) {
      return {
        id,
        nickname: fallback.nickname,
        level: fallback.level,
        avatar: fallback.nickname.charAt(0),
      };
    }
    const clean = id.replace(/^(user_|friend_|demo_)/, '');
    const nick = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '隊友';
    return {
      id,
      nickname: nick,
      level: 5,
      avatar: nick.charAt(0),
    };
  };

  // 執行搜尋
  const handleSearch = async () => {
    if (!isValidPlayerCode(searchInput) || isSearching) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await store.searchPlayerCode(searchInput);
      setSearchResult(res);
    } finally {
      setIsSearching(false);
    }
  };

  // 準備同隊名單與最近隊友清單 (供排序與標記)
  const squadMemberIds = (store.squadMembers || []).map((m) => m.id);
  const recentTeammateIds = (store.recentTeammates || []).map((t) => t.id);

  // 好友名單解析與排序 (Q18)
  const rawFriends = store.friendIds.map((id) => resolveInfo(id));
  const sortedFriends = sortFriends(rawFriends, {
    currentSquadIds: squadMemberIds,
    recentTeammateIds,
  });

  // 最近隊友資料準備 (30 天內，未封鎖)
  const blockedSet = new Set(store.blockedIds || []);
  const recentTeammatesList = (store.recentTeammates || [])
    .filter((t) => !blockedSet.has(t.id))
    .filter((t) => (isMinor ? store.friendIds.includes(t.id) : true)) // 未成年只列好友
    .map((t) => {
      const info = resolveInfo(t.id);
      const isFriend = store.friendIds.includes(t.id);
      return {
        ...info,
        lastTogetherAt: t.lastTogetherAt,
        isFriend,
      };
    });

  return (
    <div className="space-y-4 text-[#5C4A3E]">
      {/* 頂部列：返回 + 標題與好友數量 */}
      <div className="flex items-center justify-between border-b border-[#F0E8DA] pb-2.5">
        <button
          onClick={onBack}
          data-testid="friends-back-button"
          className="flex items-center gap-1.5 text-xs font-black text-[#786B63] hover:text-[#29221E] transition py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回個人檔案</span>
        </button>

        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-[#29221E]">好友</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#FFF1E4] text-[#C2410C] border border-[#FED7AA]">
            {store.friendIds.length} 位
          </span>
        </div>
      </div>

      {/* 1. 代碼搜尋加好友入口 (7e 未成年換成 QR 占位) */}
      {!shouldShowCodeSearch(isMinor) ? (
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
      ) : (
        <div className="bg-[#FFFDF8] border border-[#E5DCCB] rounded-2xl p-3.5 space-y-3">
          <div className="text-xs font-black text-[#5C4A3E]">用玩家代碼加好友</div>

          {/* 輸入框與「找人」按鈕 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white border border-[#E5DCCB] focus-within:border-[#EA580C] rounded-xl px-3 py-2 transition">
              <input
                type="text"
                data-testid="friend-code-input"
                placeholder="輸入完整的 8 碼玩家代碼"
                value={searchInput}
                maxLength={12}
                onChange={(e) => {
                  setSearchInput(e.target.value.toUpperCase().replace(/[^0-9A-Z\s-]/g, ''));
                  if (searchResult) setSearchResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="w-full bg-transparent text-sm font-mono font-bold text-[#29221E] placeholder:text-[#A89A8C] placeholder:font-sans outline-none"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchResult(null);
                  }}
                  className="text-[#A89A8C] hover:text-[#5C4A3E] p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={!isValidPlayerCode(searchInput) || isSearching}
              data-testid="friend-code-search"
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition shrink-0 ${
                isValidPlayerCode(searchInput) && !isSearching
                  ? 'bg-[#EA580C] text-white hover:bg-[#C2410C] shadow active:scale-95 cursor-pointer'
                  : 'bg-[#EFE8DC] text-[#A89A8C] cursor-not-allowed'
              }`}
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                  <span>找人中</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>找人</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-[#786B63] leading-relaxed">
            只能用完整代碼找人；請對方在「我的」複製代碼給你。代碼不分大小寫、不用打空格。
          </p>

          {/* 搜尋中狀態 (4b) */}
          {isSearching && (
            <div
              data-testid="search-loading"
              className="bg-[#FFFDF8] border border-[#F3C29A] rounded-xl p-6 text-center space-y-2 animate-pulse"
            >
              <div className="flex justify-center">
                <div className="w-8 h-8 border-3 border-[#FED7AA] border-t-[#EA580C] rounded-full animate-spin" />
              </div>
              <div className="text-xs font-bold text-[#786B63]">正在找這位玩家…</div>
            </div>
          )}

          {/* 搜尋結果：找到 (4c / 7d-entry-code) */}
          {searchResult?.reason === 'found' && searchResult.player && (
            <div
              data-testid="search-found"
              className="bg-[#FFFCF7] border border-[#F3C29A] rounded-xl p-3.5 space-y-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FFF1E4] border border-[#FED7AA] text-[#EA580C] font-black text-lg flex items-center justify-center shrink-0">
                  {searchResult.player.nickname.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-black text-[#29221E]">
                      {searchResult.player.nickname}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-[#FFF1E4] border border-[#FED7AA] text-[10px] font-bold text-[#C2410C]">
                      Lv.{searchResult.player.level}
                    </span>
                    <DemoDevTag text="試玩角色" />
                  </div>

                  <div className="mt-1">
                    {searchResult.player.isFriend ? (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✓ 你的好友
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#3B5B7A] bg-[#EEF4FB] px-2 py-0.5 rounded-md border border-[#D5E3F2]">
                        不是你的好友
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 操作按鈕組 */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#F0E8DA]">
                <button
                  onClick={() => store.showToast('組隊邀請會在之後開放')}
                  className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition active:scale-95"
                >
                  邀請組隊
                </button>

                {(() => {
                  const reqView = getFriendRequestView(
                    store,
                    DEMO_PLAYER_ID,
                    searchResult.player.id,
                    Date.now()
                  );

                  if (reqView === 'friends') {
                    return (
                      <span
                        data-testid="friend-status-friends"
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-[#5C4A3E] border border-slate-300"
                      >
                        好友
                      </span>
                    );
                  }

                  if (reqView === 'pending') {
                    return (
                      <div className="flex flex-col items-end gap-0.5">
                        <button
                          disabled
                          data-testid="friend-request-sent"
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#EFE8DC] text-[#A89A8C] border border-[#E5DCCB] cursor-not-allowed"
                        >
                          ✓ 已送出好友申請
                        </button>
                        <button
                          onClick={() => {
                            store.cancelFriendRequestAction(searchResult.player!.id);
                            setSearchResult({
                              ...searchResult,
                              reason: 'found',
                            });
                          }}
                          data-testid="friend-request-cancel"
                          className="text-[11px] font-bold text-[#786B63] hover:text-[#EA580C] underline cursor-pointer"
                        >
                          取消好友申請
                        </button>
                        <span className="text-[10px] text-[#A89A8C]">
                          對方同意後，會在小鈴鐺通知你。
                        </span>
                      </div>
                    );
                  }

                  if (reqView === 'limit') {
                    return (
                      <div className="flex flex-col items-end gap-0.5">
                        <button
                          disabled
                          data-testid="friend-request-limit"
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#EFE8DC] text-[#A89A8C] border border-[#E5DCCB] cursor-not-allowed"
                        >
                          加好友
                        </button>
                        <span className="text-[10px] text-[#C2410C]">
                          今天的好友申請次數用完了，明天再來
                        </span>
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={() => {
                        store.sendFriendRequestAction(searchResult.player!.id);
                        setSearchResult({
                          ...searchResult,
                          reason: 'found',
                        });
                      }}
                      data-testid="friend-code-add-button"
                      className="py-1.5 px-3 rounded-xl bg-[#FFF1E4] border border-[#EA580C] text-[#C2410C] hover:bg-[#FED7AA] text-xs font-black transition active:scale-95 flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>加好友</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 搜尋結果：找不到 (4d - 米色提示，非紅色) */}
          {searchResult?.reason === 'not_found' && (
            <div
              data-testid="search-not-found"
              className="bg-[#FFF8EC] border border-[#F3C29A] rounded-xl p-6 text-center space-y-1.5 shadow-sm"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] mb-2">
                <Search className="w-6 h-6" />
              </div>
              <div className="text-sm font-black text-[#29221E]">
                {searchResult.message || '找不到這位玩家'}
              </div>
              <div className="text-xs text-[#786B63] leading-relaxed">
                {searchResult.hint || '請再確認一次代碼。'}
              </div>
            </div>
          )}

          {/* 搜尋結果：限頻 (4e / 8f) */}
          {searchResult?.reason === 'rate_limited' && (
            <div
              data-testid="search-rate-limited"
              className="bg-[#FFF8EC] border border-[#F3C29A] rounded-xl p-6 text-center space-y-1.5 shadow-sm"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] mb-2">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-sm font-black text-[#29221E]">
                {searchResult.message || '稍後再試'}
              </div>
              <div className="text-xs text-[#786B63] leading-relaxed">
                {searchResult.hint || '過一會兒再找就可以了。'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. 最近隊友入口 (3f / 7d-entry-recent) */}
      <div className="bg-[#FFFDF8] border border-[#E5DCCB] rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-[#5C4A3E]">最近隊友</div>
            <div className="text-[11px] text-[#786B63]">
              30 天內一起組過隊的人。不會自動變成好友。
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#A89A8C]">
            {recentTeammatesList.length} 人
          </span>
        </div>

        {recentTeammatesList.length === 0 ? (
          <div className="bg-white/60 border border-dashed border-[#E5DCCB] rounded-xl p-4 text-center text-xs text-[#A89A8C]">
            最近 30 天還沒有一起組隊的人
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentTeammatesList.map((tm) => {
              const reqView = getFriendRequestView(
                store,
                DEMO_PLAYER_ID,
                tm.id,
                Date.now()
              );

              return (
                <div
                  key={tm.id}
                  className="flex items-center justify-between bg-white border border-[#E5DCCB] rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#FFF1E4] border border-[#FED7AA] text-[#EA580C] font-black text-sm flex items-center justify-center shrink-0">
                      {tm.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-[#29221E]">
                          {tm.nickname}
                        </span>
                        <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#5C4A3E]">
                          Lv.{tm.level}
                        </span>
                        <DemoDevTag text="試玩角色" />
                      </div>
                      <div className="text-[10px] text-[#786B63] truncate">
                        一起組過隊
                      </div>
                    </div>
                  </div>

                  {/* 動作按鈕 */}
                  <div className="shrink-0">
                    {reqView === 'friends' ? (
                      <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        好友
                      </span>
                    ) : reqView === 'pending' ? (
                      <div className="flex flex-col items-end">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFE8DC] text-[#A89A8C]">
                          已送出
                        </span>
                        <button
                          onClick={() => store.cancelFriendRequestAction(tm.id)}
                          className="text-[10px] text-[#786B63] underline hover:text-[#EA580C]"
                        >
                          取消
                        </button>
                      </div>
                    ) : reqView === 'limit' ? (
                      <span className="text-[10px] text-[#A89A8C]">額度已滿</span>
                    ) : (
                      <button
                        onClick={() => store.sendFriendRequestAction(tm.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#FFF1E4] border border-[#EA580C] text-[#C2410C] text-xs font-black hover:bg-[#FED7AA] active:scale-95 transition"
                      >
                        加好友
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 好友列表 (7a) */}
      <div className="bg-[#FFFDF8] border border-[#E5DCCB] rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#5C4A3E]">好友列表</span>
          <span className="text-[11px] font-bold text-[#A89A8C]">
            共 {sortedFriends.length} 位
          </span>
        </div>

        {sortedFriends.length === 0 ? (
          <div className="bg-[#FFF8EC] border border-dashed border-[#F3C29A] rounded-2xl p-6 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-[#EA580C]">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-sm font-black text-[#29221E]">
              還沒有好友，用玩家代碼加好友
            </div>
            <p className="text-xs text-[#786B63]">
              把你的代碼給朋友，或輸入朋友的代碼。
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sortedFriends.map((friend) => {
              const isSameSquad = squadMemberIds.includes(friend.id);
              const isTeammate = recentTeammateIds.includes(friend.id);

              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between bg-white border border-[#E5DCCB] rounded-xl px-3 py-2.5 relative"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#FFF1E4] border border-[#FED7AA] text-[#EA580C] font-black text-sm flex items-center justify-center shrink-0">
                      {friend.avatar}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#29221E] truncate">
                          {friend.nickname}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-[#5C4A3E] shrink-0">
                          Lv.{friend.level}
                        </span>
                      </div>

                      {/* 副行：同隊標記或最近隊友標記 (嚴格不放任何健康/運動數據) */}
                      {isSameSquad ? (
                        <div className="text-[10px] font-bold text-[#C2410C]">
                          同隊・{store.squadName || '戰隊'}
                        </div>
                      ) : isTeammate ? (
                        <div className="text-[10px] font-medium text-[#786B63]">
                          最近隊友
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* ⋯ 更多選單 */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === friend.id ? null : friend.id)
                      }
                      data-testid={`friend-more-${friend.id}`}
                      className="p-1.5 rounded-lg text-[#786B63] hover:bg-slate-100 transition"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {activeMenuId === friend.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-[#FFFCF7] border border-[#E5DCCB] rounded-xl shadow-xl py-1 z-30 space-y-0.5">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setRemovingFriend({
                              id: friend.id,
                              nickname: friend.nickname,
                              isSameSquad,
                            });
                          }}
                          data-testid="friend-menu-remove"
                          className="w-full px-3 py-1.5 text-left text-xs font-bold text-[#C2410C] hover:bg-[#FFF1E4] flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>移除好友</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setBlockingTarget({ id: friend.id, nickname: friend.nickname });
                          }}
                          data-testid="friend-menu-block"
                          className="w-full px-3 py-1.5 text-left text-xs font-bold text-[#5C4A3E] hover:bg-slate-100 flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5 text-rose-500" />
                          <span>封鎖</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setReportingTarget({ id: friend.id, nickname: friend.nickname });
                          }}
                          data-testid="friend-menu-report"
                          className="w-full px-3 py-1.5 text-left text-xs font-bold text-[#5C4A3E] hover:bg-slate-100 flex items-center gap-1.5"
                        >
                          <Flag className="w-3.5 h-3.5 text-amber-500" />
                          <span>檢舉</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. 移除好友確認框 (3c / 7a-friend-remove) */}
      {removingFriend && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs retro-box rounded-2xl p-4 bg-[#FFFCF7] border-2 border-[#F3C29A] text-center space-y-3 shadow-2xl">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] font-black text-xl">
                {removingFriend.nickname.charAt(0)}
              </div>
            </div>

            <div className="text-base font-black text-[#29221E]">
              要移除好友 {removingFriend.nickname} 嗎？
            </div>

            <div className="text-xs text-[#5C4A3E] leading-relaxed space-y-1">
              <p>對方不會收到通知。</p>
              <p>之後想再當好友，要重新送好友申請。</p>
              {removingFriend.isSameSquad && (
                <p className="text-[11px] text-[#786B63] pt-1">
                  你們還是同一隊的隊友。
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setRemovingFriend(null)}
                className="py-2 rounded-xl bg-white border border-[#E5DCCB] text-[#5C4A3E] text-xs font-black hover:bg-slate-100 transition"
              >
                先不要
              </button>
              <button
                onClick={() => {
                  store.removeFriendAction(removingFriend.id);
                  setRemovingFriend(null);
                }}
                data-testid="friend-remove-button"
                className="py-2 rounded-xl bg-[#FFF1E4] border border-[#EA580C] text-[#C2410C] hover:bg-[#FED7AA] text-xs font-black shadow transition"
              >
                移除好友
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 5. 封鎖確認框 */}
      {blockingTarget && (
        <BlockConfirmModal
          isOpen={!!blockingTarget}
          targetId={blockingTarget.id}
          targetNickname={blockingTarget.nickname}
          onCancel={() => setBlockingTarget(null)}
          onConfirm={() => {
            store.blockPlayerAction(blockingTarget.id);
            setBlockingTarget(null);
          }}
        />
      )}

      {/* 6. 檢舉彈窗 */}
      {reportingTarget && (
        <ReportModal
          isOpen={!!reportingTarget}
          targetId={reportingTarget.id}
          targetNickname={reportingTarget.nickname}
          onClose={() => setReportingTarget(null)}
        />
      )}
    </div>
  );
};
