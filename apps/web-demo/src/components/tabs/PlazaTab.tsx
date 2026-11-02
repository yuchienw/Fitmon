import React, { useState } from 'react';
import {
  Camera,
  Coins,
  Droplets,
  BadgeCheck,
  Home,
  Flame,
  Globe,
  Users,
  UserCheck,
  Contact,
  ShieldAlert,
  BookmarkPlus,
  UserPlus,
  Check,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { FRIEND_PROFILES } from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';

type SocialSubTab = 'all_public' | 'friends_feed' | 'my_posts' | 'friends_directory';

export const PlazaTab: React.FC = () => {
  const store = useGameStore();
  const [subTab, setSubTab] = useState<SocialSubTab>('all_public');
  const [visitingPostId, setVisitingPostId] = useState<string | null>(null);

  const filteredPosts = store.posts.filter((post) => {
    const isAuthorFriend = store.friendIds.includes(post.authorId);
    if (subTab === 'all_public') return true;
    if (subTab === 'friends_feed') return post.visibility === 'friends' || isAuthorFriend;
    if (subTab === 'my_posts') return post.visibility === 'mine' || post.authorId === 'me_player' || post.authorId === 'me';
    return true;
  });

  const getVisibilityBadge = (vis: 'public' | 'friends' | 'mine', isFriendAuthor: boolean) => {
    if (vis === 'mine') {
      return {
        label: '我的',
        cls: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
      };
    }
    if (vis === 'friends' || isFriendAuthor) {
      return {
        label: '好友',
        cls: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
      };
    }
    return {
      label: '公開',
      cls: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300',
    };
  };

  return (
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. TOP HEADER + CREATE MEME POST CTA */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black text-white">💬 社交動態</h2>
        <button
          onClick={() => store.setMemeStudioOpen(true)}
          className="retro-btn px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>發文</span>
        </button>
      </div>

      {/* 2. FOUR-WAY SOCIAL FILTER TABS */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {(
          [
            { id: 'all_public', label: '公開', icon: Globe },
            { id: 'friends_feed', label: '好友', icon: Users },
            { id: 'my_posts', label: '我的', icon: UserCheck },
            { id: 'friends_directory', label: '找健友', icon: Contact },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`py-2 px-1 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. DAILY ANTI-ABUSE TIP/GIFT QUOTA STATUS BAR */}
      <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>今日互助額度</span>
        </div>
        <div className="font-mono font-black text-amber-300">
          {store.dailySocialSentTotal} / {store.dailySocialMaxTotal} 次 · 同人限 2 次
        </div>
      </div>

      {/* =====================================================================
          MODE A: FRIENDS & RECOMMENDED DIRECTORY (Item 3: Add Friend Simulation!)
         ===================================================================== */}
      {subTab === 'friends_directory' ? (
        <div className="space-y-3">
          {FRIEND_PROFILES.map((friend) => {
            const isFriendNow = store.friendIds.includes(friend.id);
            return (
              <div
                key={friend.id}
                className="retro-box rounded-2xl p-3.5 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => store.setSelectedProfileId(friend.id)}
                    className="cursor-pointer group min-w-0"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-white group-hover:text-cyan-300 flex items-center gap-1">
                        {friend.nameZh}
                        {friend.isVerified && (
                          <BadgeCheck className="w-4 h-4 text-cyan-400 fill-cyan-950" />
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          isFriendNow
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {isFriendNow ? '✓ 好友' : '推薦健友'}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-300 mt-0.5">
                      Lv.{friend.level} · {friend.titleZh} · 🔥{friend.streakDays}天
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{friend.bioZh}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => store.toggleFriend(friend.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 border transition ${
                        isFriendNow
                          ? 'bg-slate-800 border-emerald-500/40 text-emerald-300'
                          : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                      }`}
                    >
                      {isFriendNow ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>好友</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>加好友</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => store.setSelectedProfileId(friend.id)}
                      className="retro-btn px-2.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black flex items-center gap-1"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>串門</span>
                    </button>
                  </div>
                </div>

                {/* Friend's PRs + Quick Reference Routine */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {friend.bestPRs.map((pr, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 shrink-0"
                      >
                        {pr.label} <strong className="text-amber-300">{pr.value}</strong>
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => store.copyOrReferenceRoutine(friend.routineTemplate)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-black flex items-center gap-1 shrink-0"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    <span>引用課表</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =====================================================================
           MODE B: SOCIAL POSTS FEED
          ===================================================================== */
        <div className="space-y-3.5">
          {filteredPosts.length === 0 ? (
            <div className="retro-box rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs font-bold text-slate-400">尚無貼文</p>
              <button
                onClick={() => store.setMemeStudioOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black"
              >
                📸 發佈貼文
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isVisiting = visitingPostId === post.id;
              const isSelf = post.authorId === 'me_player' || post.authorId === 'me';
              const isFriendAuthor = store.friendIds.includes(post.authorId);
              const visBadge = getVisibilityBadge(post.visibility, isFriendAuthor);
              const sentToAuthor = store.dailySentPerAuthor[post.authorId] || 0;
              const canSendMore =
                !isSelf &&
                store.dailySocialSentTotal < store.dailySocialMaxTotal &&
                sentToAuthor < 2;

              return (
                <div key={post.id} className="retro-box rounded-2xl p-3.5 space-y-3">
                  {/* Author Header + Add Friend + Visit Room */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      onClick={() => {
                        if (!isSelf) {
                          store.setSelectedProfileId(post.authorId);
                        }
                      }}
                      className={`min-w-0 ${!isSelf ? 'cursor-pointer group' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white group-hover:text-cyan-300 flex items-center gap-1">
                          {post.authorName}
                          {post.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 fill-cyan-950" />
                          )}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${visBadge.cls}`}
                        >
                          {visBadge.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                        <span>{post.authorTitle}</span>
                        <span>·</span>
                        <span>{post.createdAtLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isSelf && (
                        <button
                          onClick={() => store.toggleFriend(post.authorId)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 border transition ${
                            isFriendAuthor
                              ? 'bg-slate-800 border-emerald-500/40 text-emerald-300'
                              : 'bg-emerald-500 text-slate-950 border-emerald-400'
                          }`}
                        >
                          {isFriendAuthor ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>好友</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3" />
                              <span>加好友</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setVisitingPostId(isVisiting ? null : post.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 border transition ${
                          isVisiting
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-500'
                        }`}
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>{isVisiting ? '離開' : '串門'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Stage */}
                  {post.customImageDataUrl && !isVisiting ? (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <img
                        src={post.customImageDataUrl}
                        alt={post.caption}
                        className="w-full h-52 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <PixelRoomCanvas
                        isActive={isVisiting}
                        compact
                        customAvatar={{
                          bodyStage: post.bodyStage,
                          equipped: post.equipped,
                          room: post.room,
                        }}
                        visitorAvatar={
                          isVisiting && !isSelf
                            ? {
                                nickname: store.nickname,
                                bodyStage: store.bodyStage,
                                equipped: store.equipped,
                              }
                            : undefined
                        }
                      />
                      {post.stickerText && (
                        <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-lg">
                          {post.stickerText}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Workout Summary Badge + Caption */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="font-bold text-emerald-300 truncate">
                        🏋️ {post.workoutSummary}
                      </span>
                      <span className="font-mono text-amber-300 font-bold flex items-center gap-1 shrink-0">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        {post.streakDays}天
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 px-1 leading-relaxed">{post.caption}</p>
                  </div>

                  {/* Anti-Abuse Tip & BCAA Water Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <button
                        onClick={() => store.tipPost(post.id)}
                        disabled={!canSendMore}
                        className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          canSendMore
                            ? 'bg-slate-900 hover:bg-amber-950/30 border-slate-800 hover:border-amber-500/40 text-amber-300'
                            : 'bg-slate-900/40 border-slate-800/50 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>打賞 · {post.tipsCount}</span>
                      </button>

                      <button
                        onClick={() => store.giftWaterPost(post.id)}
                        disabled={!canSendMore}
                        className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          canSendMore
                            ? 'bg-slate-900 hover:bg-cyan-950/30 border-slate-800 hover:border-cyan-500/40 text-cyan-300'
                            : 'bg-slate-900/40 border-slate-800/50 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        <span>送水 · {post.waterCount}</span>
                      </button>
                    </div>

                    {!isSelf && (
                      <div className="text-[10px] font-mono text-slate-400 shrink-0 px-1">
                        {sentToAuthor}/2
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
