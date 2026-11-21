import React, { useState } from 'react';
import {
  X,
  BadgeCheck,
  Flame,
  Trophy,
  BookmarkPlus,
  Users,
  Home,
  Dumbbell,
  UserPlus,
  Check,
  QrCode,
  MoreHorizontal,
  Ban,
  Flag,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  FRIEND_PROFILES,
  EXERCISE_LIBRARY,
  getFriendProfile,
  resolveFriendProfileId,
} from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { ExerciseThumbnail } from '../../game/ExerciseThumbnail';
import { getFriendRequestView } from '../../game/friendSocial';
import { DEMO_PLAYER_ID } from '../../game/persistMigrate';
import { IS_DEMO, DEMO_REPORT_DISCLAIMER } from '../../config/demo';

export const UserProfileModal: React.FC = () => {
  const store = useGameStore();
  const profileId = store.selectedProfileId;
  const [menuOpen, setMenuOpen] = useState(false);

  if (!profileId) return null;

  const profile = getFriendProfile(profileId);
  if (!profile) return null;

  const isViewerMinor = store.devMinorTestAccount === true;
  const requestView = getFriendRequestView(store, DEMO_PLAYER_ID, profile.id, Date.now());

  const userPosts = store.posts.filter(
    (p) =>
      (resolveFriendProfileId(p.authorId) || p.authorId) === profile.id ||
      p.authorName === profile.nameZh
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3.5 border-2 border-cyan-500/50 max-h-[90vh] overflow-y-auto">
        {/* 1. PROFILE HEADER + ADD FRIEND BUTTON */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-black text-white flex items-center gap-1">
                <span>{profile.nameZh}</span>
                {profile.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-cyan-400 fill-cyan-950" />
                )}
              </h3>
            </div>
            <div className="text-xs font-bold text-amber-300 mt-0.5">{profile.titleZh}</div>
            <p className="text-[11px] text-slate-400 mt-1">{profile.bioZh}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 relative">
            {isViewerMinor ? (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>請用好友 QR 加好友</span>
              </div>
            ) : requestView === 'friends' ? (
              <div
                data-testid="friend-status-friends"
                className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 bg-slate-800 border border-emerald-500/40 text-emerald-300"
              >
                <Check className="w-3.5 h-3.5" />
                <span>好友</span>
              </div>
            ) : requestView === 'pending' ? (
              <div className="flex flex-col items-end gap-1">
                <button
                  disabled
                  data-testid="friend-request-sent"
                  className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 bg-[#EFE8DC] border border-[#E5DCCB] text-[#A89A8C] cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>已送出好友申請</span>
                </button>
                <button
                  onClick={() => store.cancelFriendRequestAction(profile.id)}
                  data-testid="friend-request-cancel"
                  className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                >
                  取消好友申請
                </button>
                <span className="text-[10px] text-slate-400">對方同意後，會在小鈴鐺通知你。</span>
              </div>
            ) : requestView === 'limit' ? (
              <div className="flex flex-col items-end gap-1">
                <button
                  disabled
                  data-testid="friend-request-limit"
                  className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>加好友</span>
                </button>
                <span className="text-[10px] text-amber-300">今天的好友申請次數用完了，明天再來</span>
              </div>
            ) : (
              <button
                onClick={() => store.sendFriendRequestAction(profile.id)}
                data-testid="user-profile-add-friend"
                className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 bg-emerald-500 text-slate-950 border border-emerald-400 shadow hover:bg-emerald-400 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>加好友</span>
              </button>
            )}

            {/* ⋯ Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="更多選項"
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-30 space-y-0.5">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      store.showToast('已封鎖此玩家');
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-400" />
                    <span>封鎖</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      store.showToast(IS_DEMO ? DEMO_REPORT_DISCLAIMER : '已收到檢舉');
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    <span>檢舉</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => store.setSelectedProfileId(null)}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="text-[10px] text-slate-400">等級</div>
            <div className="text-xs font-black font-mono text-white">Lv.{profile.level}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="text-[10px] text-slate-400">連勝</div>
            <div className="text-xs font-black font-mono text-amber-300 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              {profile.streakDays} 天
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
            <div className="text-[10px] text-slate-400">粉絲</div>
            <div className="text-xs font-black font-mono text-cyan-300 flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {profile.followers}
            </div>
          </div>
        </div>

        {/* 2. CO-PRESENCE ROOM VISIT */}
        <div className="space-y-1.5">
          <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5" />
            同框串門房間
          </span>
          <PixelRoomCanvas
            isActive={true}
            compact
            customAvatar={{
              bodyStage: profile.bodyStage,
              equipped: profile.equipped,
              room: profile.room,
            }}
            visitorAvatar={{
              nickname: store.nickname,
              bodyStage: store.bodyStage,
              equipped: store.equipped,
            }}
          />
        </div>

        {/* 3. PERSONAL RECORD TROPHIES */}
        <div className="space-y-1.5">
          <span className="text-xs font-black text-white flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            最佳 PR
          </span>
          <div className="grid grid-cols-3 gap-2">
            {profile.bestPRs.map((pr, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center"
              >
                <div className="text-[10px] text-slate-400 break-words">{pr.label}</div>
                <div className="text-xs font-black font-mono text-amber-300 mt-0.5">
                  {pr.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. SIGNATURE ROUTINE TEMPLATE */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black text-cyan-400">
                📋 主打課表 · {profile.routineTemplate.tagZh}
              </span>
              <h4 className="text-xs font-black text-white mt-0.5">
                {profile.routineTemplate.nameZh}
              </h4>
            </div>
            <button
              onClick={() => {
                store.copyOrReferenceRoutine(profile.routineTemplate);
              }}
              className="retro-btn px-2.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black flex items-center gap-1 shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>引用課表</span>
            </button>
          </div>

          <div className="space-y-1">
            {profile.routineTemplate.exercises.map((item, idx) => {
              const ex =
                EXERCISE_LIBRARY.find((e) => e.id === item.exerciseId) || EXERCISE_LIBRARY[0];
              return (
                <div
                  key={idx}
                  onClick={() => store.setInspectedExerciseId(ex.id)}
                  className="px-2 py-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-transparent hover:border-cyan-500/40 flex items-center justify-between text-[11px] cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <ExerciseThumbnail exercise={ex} size={26} />
                    <span className="font-bold text-slate-200">{ex.nameZh}</span>
                    <span className="text-[10px] text-cyan-400">📖</span>
                  </div>
                  <span className="font-mono text-cyan-300">
                    {item.sets}組×{item.reps} · {item.weightKg}
                    {ex.unitLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. RECENT POSTS BY THIS USER */}
        {userPosts.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
              近期貼文 · {userPosts.length} 則
            </span>
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-emerald-300">{post.workoutSummary}</span>
                  <span>{post.createdAtLabel}</span>
                </div>
                <p className="text-xs text-slate-200">{post.caption}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
