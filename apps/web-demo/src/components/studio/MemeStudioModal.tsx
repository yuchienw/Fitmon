import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Share2, Upload, Sparkles } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { MEME_STICKERS } from '../../config/catalogConfig';
import { drawPixelGymScene } from '../../game/pixelSpriteDrawer';
import { BRAND_CONFIG } from '../../config/economyConfig';

export const MemeStudioModal: React.FC = () => {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('1:1');
  const [selectedSticker, setSelectedSticker] = useState<string>(MEME_STICKERS[0].text);
  const [caption, setCaption] = useState<string>('今日份鋼鐵修煉完成！再一組就回家！💪');
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(null);

  const latestHist = store.workoutHistory[0];

  useEffect(() => {
    if (!store.memeStudioOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 480;
    const H = aspectRatio === '9:16' ? 760 : 480;
    canvas.width = W;
    canvas.height = H;

    const renderCard = (bgImg?: HTMLImageElement) => {
      // 1. Background
      ctx.fillStyle = '#0b0d13';
      ctx.fillRect(0, 0, W, H);

      // Draw offscreen 480x300 MapleStory Chibi scene
      const off = document.createElement('canvas');
      off.width = 480;
      off.height = 300;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.imageSmoothingEnabled = false;
        drawPixelGymScene(offCtx, {
          bodyStage: store.bodyStage,
          equipped: store.equipped,
          room: store.room,
          isNight: store.isNightModeRoom,
          frameTick: 12,
          avatarX: 94,
          avatarY: 78,
          avatarState: 'CURL',
          facingRight: true,
          petHearts: [{ x: 168, y: 90, alpha: 1 }],
        });
      }

      const sceneY = 64;
      const sceneH = aspectRatio === '9:16' ? 360 : 250;

      if (bgImg) {
        ctx.drawImage(bgImg, 20, sceneY, W - 40, sceneH);
        // Also draw mini pixel room badge in bottom-left of photo
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 28, sceneY + sceneH - 100, 144, 90);
      } else {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 20, sceneY, W - 40, sceneH);
      }

      // Frame border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, sceneY, W - 40, sceneH);

      // 2. Top Header Stamp
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(`⚡ ${BRAND_CONFIG.appName} WORKOUT VERIFIED`, 20, 38);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(`🔥 STREAK ${store.streakDays} DAYS`, W - 185, 38);

      // 3. Sticker Banner
      const stickerY = sceneY + sceneH + 18;
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(20, stickerY, W - 40, 42);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, stickerY, W - 40, 42);

      ctx.fillStyle = '#fda4af';
      ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
      ctx.fillText(selectedSticker, 34, stickerY + 27);

      // 4. Workout Stats Block
      const statsY = stickerY + 58;
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 17px "Noto Sans TC", sans-serif';
      const summaryText = latestHist
        ? `🏋️ 今日課表：${latestHist.topExerciseZh} (${latestHist.totalSets} 組 · ${latestHist.totalVolume} kg)`
        : `🏋️ 玩家：${store.nickname} (Lv.${store.level} ${store.bodyStage.toUpperCase()})`;
      ctx.fillText(summaryText, 20, statsY + 18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Noto Sans TC", sans-serif';
      ctx.fillText(caption.slice(0, 34), 20, statsY + 46);

      // 5. Non-intrusive Bottom-Right Brand Watermark
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(`👾 ${BRAND_CONFIG.appName} · 像素健身養成社群`, W - 235, H - 16);
    };

    if (uploadedBgUrl) {
      const img = new Image();
      img.onload = () => renderCard(img);
      img.src = uploadedBgUrl;
    } else {
      renderCard();
    }
  }, [
    store.memeStudioOpen,
    aspectRatio,
    selectedSticker,
    caption,
    uploadedBgUrl,
    store.bodyStage,
    store.equipped,
    store.room,
    store.isNightModeRoom,
    store.streakDays,
    store.nickname,
    store.level,
    latestHist,
  ]);

  if (!store.memeStudioOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedBgUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `fitmon-meme-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    store.showToast('💾 已下載高清拍貼 PNG！（可分享至 IG 限動 / Threads）');
  };

  const handlePublishToPlaza = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas ? canvas.toDataURL('image/png') : undefined;
    store.publishPost(caption, selectedSticker, dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3 border-2 border-slate-700 max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">像素迷因拍貼工坊 (Meme Studio)</h3>
          </div>
          <button
            onClick={() => store.setMemeStudioOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aspect Ratio & Local Photo Upload */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(['1:1', '9:16'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  aspectRatio === ratio
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                {ratio === '9:16' ? '📱 9:16 IG限動' : '🟦 1:1 貼文'}
              </button>
            ))}
          </div>

          <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-xs font-bold cursor-pointer flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadedBgUrl ? '更換自拍照' : '疊加本機自拍'}</span>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>

        {/* Live Canvas Preview */}
        <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-h-64 w-auto rounded-lg border border-slate-700 shadow-lg"
          />
        </div>

        {/* Meme Sticker Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">選擇健身自嘲梗貼紙：</label>
          <div className="grid grid-cols-2 gap-1.5">
            {MEME_STICKERS.map((stk) => (
              <button
                key={stk.id}
                onClick={() => setSelectedSticker(stk.text)}
                className={`p-2 rounded-lg text-[11px] font-bold text-left truncate border transition ${
                  selectedSticker === stk.text
                    ? 'bg-rose-500/20 border-rose-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {stk.text}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Caption */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">心情語錄：</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={40}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Export Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownloadPng}
            className="retro-btn py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>下載 PNG 圖檔</span>
          </button>

          <button
            onClick={handlePublishToPlaza}
            className="retro-btn py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>發布至社群廣場</span>
          </button>
        </div>
      </div>
    </div>
  );
};
