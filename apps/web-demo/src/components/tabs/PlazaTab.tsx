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
    if (subTab === 'all_public') return true;
    if (subTab === 'friends_feed') return post.visibility === 'friends';
    if (subTab === 'my_posts') return post.visibility === 'mine' || post.authorId === 'me';
    return true;
  });

  const getVisibilityBadge = (vis: 'public' | 'friends' | 'mine') => {
    if (vis === 'mine') {
      return {
        label: '👤 我的貼文',
        cls: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
      };
    }
    if (vis === 'friends') {
      return {
        label: '👥 好友貼文',
        cls: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
      };
    }
    return {
      label: '🌍 公開貼文',
      cls: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300',
    };
  };

  return (
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. TOP HEADER + CREATE MEME POST CTA */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black text-white">💬 社交動態與好友串門</h2>
          <p className="text-[11px] text-slate-400">
            點擊頭像查看個人頁面，點擊「串門」讓你的角色走進對方房間！
          </p>
        </div>
        <button
          onClick={() => store.setMemeStudioOpen(true)}
          className="retro-btn px-3 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 shadow"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>發佈打卡</span>
        </button>
      </div>

      {/* 2. FOUR-WAY SOCIAL FILTER TABS (公開貼文 / 好友貼文 / 我的貼文 / 好友列表 V2-07, V2-16) */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {(
          [
            { id: 'all_public', label: '公開動態', icon: Globe },
            { id: 'friends_feed', label: '好友貼文', icon: Users },
            { id: 'my_posts', label: '我的貼文', icon: UserCheck },
            { id: 'friends_directory', label: '好友列表', icon: Contact },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`py-2 px-1 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition ${
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

      {/* 3. DAILY ANTI-ABUSE TIP/GIFT QUOTA STATUS BAR (V2-12) */}
      <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>今日打賞/送水總額度：</span>
        </div>
        <div className="font-mono font-black text-amber-300">
          已用 {store.dailySocialSentTotal} / {store.dailySocialMaxTotal} 次{' '}
          <span className="text-slate-500 font-normal">(同對象限 2 次/日)</span>
        </div>
      </div>

      {/* =====================================================================
          MODE A: FRIENDS DIRECTORY (好友與名人列表 V2-07)
         ===================================================================== */}
      {subTab === 'friends_directory' ? (
        <div className="space-y-3">
          {FRIEND_PROFILES.map((friend) => {
            const sentToFriend = store.dailySentPerAuthor[friend.id] || 0;
            return (
              <div
                key={friend.id}
                className="retro-box rounded-2xl p-3.5 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => store.setSelectedProfileId(friend.id)}
                    className="cursor-pointer group"
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
                          friend.isFriend
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        }`}
                      >
                        {friend.isFriend ? '👥 互為好友' : '🌟 認證名人'}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-300 mt-0.5">
                      Lv.{friend.level} · {friend.titleZh} · 🔥 連勝 {friend.streakDays} 天
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{friend.bioZh}</p>
                  </div>

                  <button
                    onClick={() => store.setSelectedProfileId(friend.id)}
                    className="retro-btn px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black flex items-center gap-1 shrink-0"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>串門與個人頁</span>
                  </button>
                </div>

                {/* Friend's PRs + Quick Reference Routine */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {friend.bestPRs.map((pr, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 shrink-0"
                      >
                        {pr.label}: <strong className="text-amber-300">{pr.value}</strong>
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

                {sentToFriend > 0 && (
                  <div className="text-[10px] font-mono text-slate-500">
                    今日已對此好友互動：{sentToFriend}/2 次
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* =====================================================================
           MODE B: SOCIAL POSTS FEED (公開貼文 / 好友貼文 / 我的貼文 V2-07, V2-12, V2-16)
          ===================================================================== */
        <div className="space-y-3.5">
          {filteredPosts.length === 0 ? (
            <div className="retro-box rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs font-bold text-slate-400">此分類目前尚無貼文</p>
              <button
                onClick={() => store.setMemeStudioOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black"
              >
                📸 立即發佈第一篇打卡貼文
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isVisiting = visitingPostId === post.id;
              const visBadge = getVisibilityBadge(post.visibility);
              const sentToAuthor = store.dailySentPerAuthor[post.authorId] || 0;
              const isSelf = post.authorId === 'me';
              const canSendMore =
                !isSelf &&
                store.dailySocialSentTotal < store.dailySocialMaxTotal &&
                sentToAuthor < 2;

              return (
                <div key={post.id} className="retro-box rounded-2xl p-3.5 space-y-3">
                  {/* Author Header + Visibility Tag + Profile / Visit Room Button */}
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
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{post.authorTitle}</span>
                        <span>·</span>
                        <span>{post.createdAtLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isSelf && (
                        <button
                          onClick={() => store.setSelectedProfileId(post.authorId)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold"
                        >
                          👤 個人頁
                        </button>
                      )}
                      <button
                        onClick={() => setVisitingPostId(isVisiting ? null : post.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 border transition ${
                          isVisiting
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-500'
                        }`}
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>{isVisiting ? '結束串門' : '串門同框'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Stage: Co-Presence Room Visit (Host + YOUR Avatar together!) or Post Snapshot */}
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

                  {/* Anti-Abuse Tip & BCAA Water Actions (V2-12) */}
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
                        <span>打賞 5🪙 ({post.tipsCount})</span>
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
                        <span>送水 ({post.waterCount})</span>
                      </button>
                    </div>

                    {!isSelf && (
                      <div className="text-[10px] font-mono text-slate-400 shrink-0 px-1">
                        今日對此人: {sentToAuthor}/2
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
