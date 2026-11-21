import React, { useState, useMemo } from 'react';
import { X, Search, Users, Copy, Check, QrCode, Sparkles, AlertCircle } from 'lucide-react';
import { useGameStore, getSquadInviteCode } from '../../stores/useGameStore';
import { MyPlayerCodeCard } from './MyPlayerCodeCard';
import {
  SQUAD_CAP,
  getSquadInviteRowState,
  isDailySquadInviteCapReached,
  type SquadSocialStateSnapshot,
  SQUAD_CANDIDATE_POOL,
  formatSquadShareText,
} from '../../game/squadInviteRules';
import { searchPlayerByCode } from '../../game/friendSocial';
import { DEMO_PLAYER_DIRECTORY } from '../../config/demo';
import { ADVENTURE_BOSS_CATALOG, getFriendProfile } from '../../config/catalogConfig';

type TabType = 'friends' | 'recent' | 'code' | 'share' | 'in_person';

function getProfileInfo(id: string): { nickname: string; avatar: string; level: number } {
  const dir = DEMO_PLAYER_DIRECTORY.find((p) => p.id === id);
  if (dir) {
    return {
      nickname: dir.nickname,
      avatar: dir.avatar || '🐱',
      level: dir.level,
    };
  }
  const friendProf = getFriendProfile(id);
  if (friendProf) {
    return {
      nickname: friendProf.nameZh,
      avatar: '🐱',
      level: friendProf.level,
    };
  }
  const cand = SQUAD_CANDIDATE_POOL.find((c) => c.id === id);
  if (cand) {
    return {
      nickname: cand.nameZh,
      avatar: '🐱',
      level: 6,
    };
  }
  return {
    nickname: id,
    avatar: '🐱',
    level: 6,
  };
}

export const InvitePanel: React.FC = () => {
  const store = useGameStore();

  const isMinor = store.devMinorTestAccount === true;
  const isCaptain = store.isSquadLeader === true;

  // Initial tab selection
  const defaultTab: TabType = isMinor
    ? 'friends'
    : isCaptain
    ? 'friends'
    : 'share';

  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Search tab state
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<{
    id: string;
    nickname: string;
    level: number;
    isFriend: boolean;
  } | null>(null);

  // Share tab state
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // In-person dummy modal
  const [showInPersonQr, setShowInPersonQr] = useState(false);

  // Open slots calculation
  const currentCount = 1 + (store.squadMembers?.length || 0);
  const openSlots = Math.max(0, SQUAD_CAP - currentCount);
  const isSquadFull = currentCount >= SQUAD_CAP;

  // Snapshot for row states
  const now = Date.now();
  const snapshot: SquadSocialStateSnapshot = useMemo(
    () => ({
      playerId: 'self',
      currentSquadId: store.currentSquadId,
      isSquadLeader: store.isSquadLeader,
      squadName: store.squadName,
      squadMembers: store.squadMembers,
      squadInvites: store.squadInvites,
      friendIds: store.friendIds,
      devMinorTestAccount: store.devMinorTestAccount,
      squadJoinOrder: store.squadJoinOrder,
      recentTeammates: store.recentTeammates,
      inviteSendLog: store.inviteSendLog,
      privacy: store.privacy,
      blockedIds: store.blockedIds,
      bossRewardClaimedWeekKey: store.bossRewardClaimedWeekKey,
      notifications: store.notifications,
      squadStage: store.squadStage,
      squadBossHp: store.squadBossHp,
    }),
    [store, now]
  );

  const isDailyCapReached = isDailySquadInviteCapReached(store.inviteSendLog, now);

  // Friends list (Q18 sorting: current squad -> recent teammates -> nickname)
  const sortedFriends = useMemo(() => {
    const list = [...(store.friendIds || [])];
    const squadMemberIds = new Set((store.squadMembers || []).map((m) => m.id));
    const recentMap = new Map((store.recentTeammates || []).map((r) => [r.id, r.lastTogetherAt]));

    return list.sort((a, b) => {
      const aInSquad = squadMemberIds.has(a);
      const bInSquad = squadMemberIds.has(b);
      if (aInSquad && !bInSquad) return -1;
      if (!aInSquad && bInSquad) return 1;

      const aRecent = recentMap.get(a) ?? 0;
      const bRecent = recentMap.get(b) ?? 0;
      if (aRecent > 0 && bRecent === 0) return -1;
      if (aRecent === 0 && bRecent > 0) return 1;
      if (aRecent !== bRecent) return bRecent - aRecent;

      const profA = getProfileInfo(a);
      const profB = getProfileInfo(b);
      return profA.nickname.localeCompare(profB.nickname, 'zh-Hant');
    });
  }, [store.friendIds, store.squadMembers, store.recentTeammates]);

  // Recent teammates list (exclude current squad members, prune 30d)
  const recentList = useMemo(() => {
    const squadMemberIds = new Set((store.squadMembers || []).map((m) => m.id));
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    return (store.recentTeammates || [])
      .filter((r) => r.id !== 'self' && !squadMemberIds.has(r.id) && r.lastTogetherAt >= cutoff)
      .sort((a, b) => b.lastTogetherAt - a.lastTogetherAt);
  }, [store.recentTeammates, store.squadMembers, now]);

  // Boss Info for Share tab
  const stage = store.squadStage || 1;
  const bossTemplate = ADVENTURE_BOSS_CATALOG[(stage - 1) % ADVENTURE_BOSS_CATALOG.length];
  const bossName = bossTemplate?.nameZh || '地獄三頭犬';
  const squadCode = getSquadInviteCode(store.squadName);

  const handleCopyLink = () => {
    // PM Q23 Share Copy
    const shareText = formatSquadShareText(store.nickname, store.squadName, squadCode);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    setLinkCopied(true);
    store.showToast('已複製邀請連結');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyCode = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(squadCode).catch(() => {});
    }
    setCodeCopied(true);
    store.showToast('已複製');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    const res = await store.searchPlayerCode(trimmed);
    setIsSearching(false);

    if (res.reason === 'found' && res.player) {
      setSearchResult(res.player);
    } else if (res.reason === 'rate_limited') {
      setSearchError('稍後再試');
    } else {
      setSearchError('找不到這位玩家');
    }
  };

  // Helper to render action button for a target player
  const renderRowButton = (targetId: string, source: 'friend' | 'recent' | 'code') => {
    const state = getSquadInviteRowState(snapshot, targetId, Date.now());
    const pendingItem = (store.squadInvites || []).find(
      (i) =>
        i.status === 'pending' &&
        i.kind === 'invite' &&
        i.squadId === store.currentSquadId &&
        (i.targetId === targetId || i.toId === targetId)
    );

    switch (state) {
      case 'in_squad':
        return (
          <span className="text-xs font-bold text-[#A89A8E] bg-[#EFE8DE] px-2.5 py-1 rounded-lg">
            已在隊伍
          </span>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#EA580C] bg-[#FFF1E4] px-2 py-0.5 rounded-lg border border-[#FED7AA]">
              已邀請
            </span>
            {pendingItem && (
              <button
                data-testid={`invite-cancel-${targetId}`}
                onClick={() => {
                  store.cancelPending(pendingItem.id);
                  store.showToast('已取消');
                }}
                className="text-xs text-[#786B63] hover:text-[#C2410C] underline cursor-pointer"
              >
                取消
              </button>
            )}
          </div>
        );
      case 'cooldown':
        return (
          <button
            disabled
            className="text-xs font-bold text-[#A89A8E] bg-[#EFE8DE] px-2.5 py-1 rounded-lg cursor-not-allowed"
          >
            冷卻中
          </button>
        );
      case 'daily_limit':
        return (
          <button
            disabled
            className="text-xs font-bold text-[#A89A8E] bg-[#EFE8DE] px-2.5 py-1 rounded-lg cursor-not-allowed"
          >
            今日上限
          </button>
        );
      case 'squad_full':
        return (
          <button
            disabled
            className="text-xs font-bold text-[#A89A8E] bg-[#EFE8DE] px-2.5 py-1 rounded-lg cursor-not-allowed"
          >
            隊伍已滿
          </button>
        );
      case 'open_slots_exhausted':
        return (
          <button
            disabled
            className="text-xs font-bold text-[#A89A8E] bg-[#EFE8DE] px-2.5 py-1 rounded-lg cursor-not-allowed"
          >
            名額已滿
          </button>
        );
      case 'can_invite':
      default:
        return (
          <button
            data-testid={`invite-btn-${targetId}`}
            onClick={() => store.sendInvite(targetId, source)}
            className="text-xs font-black text-white bg-[#EA580C] hover:bg-[#C2410C] px-3 py-1 rounded-lg shadow active:scale-95 transition"
          >
            邀請
          </button>
        );
    }
  };

  return (
    <div
      data-testid="invite-panel"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
    >
      <div className="w-full max-w-md mx-auto bg-[#FFFCF7] text-[#29221E] rounded-t-3xl border-t-2 border-x-2 border-[#F3C29A] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#E5DCCB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-black text-[#29221E]">邀請隊友</h2>
            <div
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isSquadFull
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isSquadFull ? '隊伍已滿 4／4' : `還可以邀 ${openSlots} 人`}
            </div>
          </div>
          <button
            onClick={() => store.setInvitePanelOpen(false)}
            className="p-1 text-[#786B63] hover:text-[#29221E] rounded-full hover:bg-[#EFE8DE] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-4 pt-2.5 pb-2 border-b border-[#E5DCCB] bg-[#FBF7EE]">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {/* Adult Captain Tabs */}
            {!isMinor && isCaptain && (
              <>
                <button
                  data-testid="invite-tab-friends"
                  onClick={() => setActiveTab('friends')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    activeTab === 'friends'
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#786B63] hover:text-[#29221E] hover:bg-[#EFE8DE]'
                  }`}
                >
                  好友
                </button>
                <button
                  data-testid="invite-tab-recent"
                  onClick={() => setActiveTab('recent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    activeTab === 'recent'
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#786B63] hover:text-[#29221E] hover:bg-[#EFE8DE]'
                  }`}
                >
                  最近隊友
                </button>
                <button
                  data-testid="invite-tab-code"
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    activeTab === 'code'
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#786B63] hover:text-[#29221E] hover:bg-[#EFE8DE]'
                  }`}
                >
                  用玩家代碼找人
                </button>
                <button
                  data-testid="invite-tab-share"
                  onClick={() => setActiveTab('share')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    activeTab === 'share'
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#786B63] hover:text-[#29221E] hover:bg-[#EFE8DE]'
                  }`}
                >
                  站外分享
                </button>
              </>
            )}

            {/* Adult Member Tabs (Only Share) */}
            {!isMinor && !isCaptain && (
              <button
                data-testid="invite-tab-share"
                onClick={() => setActiveTab('share')}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#EA580C] text-white shadow-sm"
              >
                站外分享
              </button>
            )}

            {/* Minor Tabs (Friends, Recent, In-person) */}
            {isMinor && (
              <>
                <button
                  data-testid="invite-tab-friends"
                  onClick={() => setActiveTab('friends')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    activeTab === 'friends'
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#786B63] hover:text-[#29221E] hover:bg-[#EFE8DE]'
                  }`}
                >
                  好友
                </button>
                <button
                  data-testid="invite-tab-recent"
                  onClick={() => setActiveTab('recent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    activeTab === 'recent'
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#786B63] hover:text-[#29221E] hover:bg-[#EFE8DE]'
                  }`}
                >
                  最近隊友
                </button>
                <button
                  data-testid="invite-tab-in-person"
                  onClick={() => setActiveTab('in_person')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 ${
                    activeTab === 'in_person'
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#786B63] hover:text-[#29221E] hover:bg-[#EFE8DE]'
                  }`}
                >
                  當面邀請
                </button>
              </>
            )}
          </div>
        </div>

        {/* Compact MyPlayerCodeCard row (for adult captains only) */}
        {!isMinor && isCaptain && (
          <div className="px-4 pt-2.5 pb-1">
            <MyPlayerCodeCard compact />
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px]">
          {/* Tab 1: 好友 */}
          {activeTab === 'friends' && (
            <div className="space-y-2.5">
              {isDailyCapReached && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>今天的邀請次數用完了，明天再來</span>
                </div>
              )}

              {sortedFriends.length === 0 ? (
                <div className="text-center py-10 text-xs font-bold text-[#A89A8E]">
                  目前還沒有好友
                </div>
              ) : (
                sortedFriends.map((friendId) => {
                  const prof = getProfileInfo(friendId);
                  return (
                    <div
                      key={friendId}
                      className="flex items-center justify-between p-3 bg-white/90 border border-[#E5DCCB] rounded-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-xl shrink-0">
                          {prof.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-[#29221E] truncate">
                            {prof.nickname}
                          </div>
                          <div className="text-xs font-bold text-[#786B63]">
                            Lv. {prof.level}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {renderRowButton(friendId, 'friend')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: 最近隊友 */}
          {activeTab === 'recent' && (
            <div className="space-y-2.5">
              {isDailyCapReached && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>今天的邀請次數用完了，明天再來</span>
                </div>
              )}

              {recentList.length === 0 ? (
                <div className="text-center py-10 text-xs font-bold text-[#A89A8E]">
                  最近沒有一起組隊的隊友
                </div>
              ) : (
                recentList.map((rec) => {
                  const prof = getProfileInfo(rec.id);
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-3 bg-white/90 border border-[#E5DCCB] rounded-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-xl shrink-0">
                          {prof.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-[#29221E] truncate">
                            {prof.nickname}
                          </div>
                          <div className="text-xs font-bold text-[#786B63]">
                            Lv. {prof.level}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {renderRowButton(rec.id, 'recent')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: 用玩家代碼找人 */}
          {activeTab === 'code' && !isMinor && (
            <div className="space-y-3.5">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  data-testid="invite-search-input"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  placeholder="輸入 8 碼玩家代碼"
                  maxLength={10}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E5DCCB] bg-white font-mono font-bold text-sm text-[#29221E] tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-xs placeholder:text-[#A89A8E] focus:outline-none focus:border-[#EA580C]"
                />
                <button
                  type="submit"
                  data-testid="invite-search-submit"
                  disabled={isSearching || !searchInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:bg-[#EFE8DE] disabled:text-[#A89A8E] text-white font-black text-xs shadow transition flex items-center gap-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearching ? '搜尋中...' : '搜尋'}</span>
                </button>
              </form>

              {searchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 text-center">
                  {searchError}
                </div>
              )}

              {searchResult && (
                <div className="p-3.5 bg-white border border-[#E5DCCB] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-[#FFF1E4] border border-[#FED7AA] flex items-center justify-center text-2xl">
                        🐱
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#29221E]">
                            {searchResult.nickname}
                          </span>
                          {!store.friendIds.includes(searchResult.id) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#786B63] border border-slate-200">
                              不是你的好友
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-[#786B63]">
                          Lv. {searchResult.level}
                        </div>
                      </div>
                    </div>
                    <div>
                      {renderRowButton(searchResult.id, 'code')}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#786B63] leading-relaxed pt-1">
                輸入朋友的完整玩家代碼即可送出組隊邀請。
              </p>
            </div>
          )}

          {/* Tab 4: 站外分享 (Adult only) */}
          {activeTab === 'share' && !isMinor && (
            <div className="space-y-3">
              {!isCaptain && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 leading-relaxed">
                  邀請要由隊長送出。你可以把隊伍連結傳給朋友，朋友送出申請後，由隊長同意。
                </div>
              )}

              <div className="p-4 bg-white border border-[#E5DCCB] rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#F4EFE6] pb-2.5">
                  <div>
                    <div className="text-sm font-black text-[#29221E]">
                      {store.squadName}
                    </div>
                    <div className="text-xs font-bold text-[#786B63]">
                      第 {stage} 階 Boss：{bossName}
                    </div>
                  </div>
                  <div className="text-xs font-bold px-2 py-1 bg-[#FFF1E4] text-[#C2410C] rounded-lg border border-[#FED7AA]">
                    {currentCount}/4 人
                  </div>
                </div>

                <div className="text-[11px] text-[#786B63] leading-relaxed">
                  隊伍連結 24 小時內有效，朋友點擊送出申請後，由隊長在小鈴鐺同意。
                </div>

                {/* Squad Code Row */}
                <div className="flex items-center justify-between bg-[#FBF7EE] border border-[#E5DCCB] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#786B63]">邀請碼</span>
                    <span className="font-mono font-black text-sm tracking-widest text-[#29221E]">
                      {squadCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EA580C] bg-[#FFF1E4] text-[#C2410C] text-xs font-black hover:bg-[#FED7AA] active:scale-95 transition"
                  >
                    {codeCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#C2410C]" />
                        <span>複製代碼</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Share Link Button */}
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black shadow flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>已複製邀請文字</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-white" />
                      <span>複製組隊邀請文字與連結</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center text-[10.5px] text-[#A89A8E]">
                試玩版連結與代碼僅供示範
              </div>
            </div>
          )}

          {/* Tab 5: 當面邀請 (Minor only - PM Q24 / 03h) */}
          {activeTab === 'in_person' && isMinor && (
            <div className="space-y-3.5 text-center py-4">
              <div className="flex justify-center text-[#8A7A6C]">
                <QrCode className="w-12 h-12 text-[#8A7A6C]" />
              </div>
              <div className="text-base font-black text-[#5C4A3E]">當面邀請</div>
              <p className="text-xs text-[#786B63] max-w-xs mx-auto leading-relaxed">
                出示你的好友 QR，讓朋友掃描加入好友後即可邀請。
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowInPersonQr(true);
                    store.showToast('請出示好友 QR');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#EA580C] text-white text-xs font-black shadow hover:bg-[#C2410C] active:scale-95 transition"
                >
                  顯示我的好友 QR
                </button>
              </div>
              <div className="pt-2">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded border border-dashed border-amber-600 bg-amber-100 text-amber-800">
                  占位・真 QR 在第 2 階段（T2）
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-person QR Dummy Modal */}
      {showInPersonQr && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#FFFCF7] border-2 border-[#F3C29A] rounded-2xl p-5 text-center space-y-3 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-[#29221E]">我的好友 QR</span>
              <button
                onClick={() => setShowInPersonQr(false)}
                className="p-1 text-[#786B63] hover:text-[#29221E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-44 h-44 mx-auto bg-white border-2 border-dashed border-[#F3C29A] rounded-2xl flex flex-col items-center justify-center gap-2 p-4">
              <QrCode className="w-24 h-24 text-[#5C4A3E]" />
              <span className="text-[11px] font-bold text-[#786B63]">掃描以加入好友</span>
            </div>
            <p className="text-xs text-[#786B63]">加為好友後，即可直接在好友列表發送組隊邀請。</p>
            <button
              onClick={() => setShowInPersonQr(false)}
              className="w-full py-2 rounded-xl bg-[#EA580C] text-white text-xs font-black"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
};