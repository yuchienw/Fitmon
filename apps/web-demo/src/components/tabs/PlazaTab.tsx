import React, { useState } from 'react';
import { Camera, Flame, Coins, Droplets, Home, X } from 'lucide-react';
import { SocialPost, useGameStore } from '../../stores/useGameStore';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { AvatarPortraitCanvas } from '../../game/AvatarPortraitCanvas';

export const PlazaTab: React.FC = () => {
  const store = useGameStore();
  const [visitingPost, setVisitingPost] = useState<SocialPost | null>(null);

  return (
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. CLEAN TOP HEADER BAR */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white">🌐 好友與名人拍立得動態</h2>
        <button
          onClick={() => store.setMemeStudioOpen(true)}
          className="retro-btn px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5"
        >
          <Camera className="w-4 h-4" />
          <span>發拍貼</span>
        </button>
      </div>

      {/* 2. FRIEND / CELEBRITY ROOM VISIT VIEWER */}
      {visitingPost && (
        <div className="retro-box-amber rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-300">
              🏠 {visitingPost.authorName} 的訓練室
            </span>
            <button
              onClick={() => setVisitingPost(null)}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <PixelRoomCanvas
            isActive={store.activeTab === 'plaza'}
            compact
            customOverride={{
              ownerName: visitingPost.authorName,
              bodyStage: visitingPost.bodyStage,
              equipped: visitingPost.equipped,
              room: visitingPost.room,
            }}
          />
        </div>
      )}

      {/* 3. CLEAN POLAROID FEED */}
      <div className="space-y-3">
        {store.posts.map((post) => {
          const isVisitingThis = visitingPost?.id === post.id;
          return (
            <div
              key={post.id}
              className="retro-box rounded-2xl overflow-hidden border border-slate-800"
            >
              {/* Card Header with Live Chibi Portrait */}
              <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AvatarPortraitCanvas
                    bodyStage={post.bodyStage}
                    equipped={post.equipped}
                    room={post.room}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white truncate">
                        {post.authorName}
                      </span>
                      {post.isVerified && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px] shrink-0">
                          👑
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold truncate mt-0.5">
                      {post.workoutSummary} · {post.totalVolumeKg.toLocaleString()}kg
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-1 rounded-lg bg-orange-500/15 text-orange-300 font-mono text-[11px] font-bold flex items-center gap-0.5">
                    <Flame className="w-3.5 h-3.5 fill-orange-400" />
                    {post.streakDays}
                  </span>
                  <button
                    onClick={() => setVisitingPost(isVisitingThis ? null : post)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                      isVisitingThis
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>串門</span>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-3 bg-[#0e131f] space-y-2">
                {post.customImageDataUrl && (
                  <img
                    src={post.customImageDataUrl}
                    alt="Workout Polaroid"
                    className="w-full max-h-64 object-contain rounded-xl border border-slate-700 mx-auto"
                  />
                )}

                {post.stickerText && (
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-black">
                    {post.stickerText}
                  </div>
                )}

                <p className="text-xs text-slate-200 leading-relaxed">{post.caption}</p>
              </div>

              {/* Clean Footer */}
              <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => store.tipPost(post.id)}
                  className="retro-btn px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>打賞 ({post.tipsCount})</span>
                </button>

                <button
                  onClick={() => store.giftWaterPost(post.id)}
                  className="retro-btn px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>送水 ({post.waterCount})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
