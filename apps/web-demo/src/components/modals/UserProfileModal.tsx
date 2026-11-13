import React from 'react';
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

export const UserProfileModal: React.FC = () => {
  const store = useGameStore();
  const profileId = store.selectedProfileId;

  if (!profileId) return null;

  const profile = getFriendProfile(profileId);
  if (!profile) return null;

  const isFriendNow = store.friendIds.some(
    (id) => (resolveFriendProfileId(id) || id) === profile.id
  );

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

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => store.toggleFriend(profile.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 border transition ${
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
