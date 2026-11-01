import React, { useState } from 'react';
import {
  Camera,
  Flame,
  Coins,
  Droplets,
  Home,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { SocialPost, useGameStore } from '../../stores/useGameStore';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';

export const PlazaTab: React.FC = () => {
  const store = useGameStore();
  const [visitingPost, setVisitingPost] = useState<SocialPost | null>(null);

  return (
    <div className="p-3.5 space-y-4 pb-10">
      {/* 1. MEME STUDIO LAUNCHER & ZERO-PII BANNER */}
      <div className="retro-box-emerald rounded-xl p-3.5 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-black">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-PII 純像素運動拍立得廣場</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            站內純像素卡片零個資風險；亦可用拍貼工坊合成真實自拍輸出至 IG 限動 / Threads！
          </p>
        </div>
        <button
          onClick={() => store.setMemeStudioOpen(true)}
          className="retro-btn px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5"
        >
          <Camera className="w-4 h-4" />
          <span>拍貼工坊</span>
        </button>
      </div>

      {/* 2. FRIEND / CELEBRITY ROOM VISIT VIEWER */}
      {visitingPost && (
        <div className="retro-box-amber rounded-xl p-3 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              正在串門子參觀：{visitingPost.authorName} 的專屬訓練室
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

      {/* 3. POLAROID FEED */}
      <div className="space-y-3.5">
        {store.posts.map((post) => {
          const isVisitingThis = visitingPost?.id === post.id;
          return (
            <div
              key={post.id}
              className="retro-box rounded-2xl overflow-hidden border border-slate-800 shadow-xl"
            >
              {/* Card Header */}
              <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-pixel text-xs text-emerald-400">
                    {post.authorName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">{post.authorName}</span>
                      {post.isVerified && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                          👑 認證
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {post.authorTitle} · {post.createdAtLabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-300 font-mono text-[10px] font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-orange-400" />
                    {post.streakDays}d
                  </span>
                  <button
                    onClick={() => setVisitingPost(isVisitingThis ? null : post)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                      isVisitingThis
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Home className="w-3 h-3" />
                    <span>{isVisitingThis ? '參觀中' : '串門子'}</span>
                  </button>
                </div>
              </div>

              {/* Polaroid Visual Snapshot */}
              <div className="p-3 bg-[#0e131f] relative">
                {post.customImageDataUrl ? (
                  <img
                    src={post.customImageDataUrl}
                    alt="Workout Polaroid"
                    className="w-full max-h-72 object-contain rounded-xl border border-slate-700 mx-auto"
                  />
                ) : (
                  <div className="rounded-xl p-3 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 border border-slate-800/90 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                        WORKOUT VERIFIED LOG
                      </span>
                      <div className="text-sm font-black text-white">{post.workoutSummary}</div>
                      <div className="text-xs font-mono text-amber-300 font-bold">
                        🏋️ 總訓練容量：{post.totalVolumeKg.toLocaleString()} kg
                      </div>
                    </div>
                    <div className="text-right font-pixel text-[10px] text-emerald-400/80 bg-slate-950/90 px-2.5 py-2 rounded-lg border border-slate-800">
                      <div>STAGE</div>
                      <div className="text-amber-300 mt-1 uppercase">{post.bodyStage}</div>
                    </div>
                  </div>
                )}

                {post.stickerText && (
                  <div className="mt-2 inline-block px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-black">
                    {post.stickerText}
                  </div>
                )}

                <p className="text-xs text-slate-200 mt-2.5 leading-relaxed">{post.caption}</p>
              </div>

              {/* Atomic Tip & Gift Footer */}
              <div className="px-3 py-2.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => store.tipPost(post.id)}
                    className="retro-btn px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>打賞 10🪙 ({post.tipsCount})</span>
                  </button>

                  <button
                    onClick={() => store.giftWaterPost(post.id)}
                    className="retro-btn px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    <span>送能量水 20🪙 ({post.waterCount})</span>
                  </button>
                </div>

                <span className="text-[10px] font-mono text-slate-500">Zero-PII 認證</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
