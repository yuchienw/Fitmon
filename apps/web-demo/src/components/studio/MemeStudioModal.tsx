import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Share2, Upload, Sparkles, Move, Smile, Activity } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { MEME_STICKERS } from '../../config/catalogConfig';
import { drawPixelGymScene } from '../../game/pixelSpriteDrawer';
import { BRAND_CONFIG } from '../../config/economyConfig';

type PoseOption = 'CURL' | 'SQUAT' | 'CHEER' | 'WALK' | 'IDLE';
type ExpressionOption = 'smile' | 'strain' | 'cool' | 'cry';

export const MemeStudioModal: React.FC = () => {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('1:1');
  const [selectedSticker, setSelectedSticker] = useState<string>(MEME_STICKERS[0].text);
  const [caption, setCaption] = useState<string>('今日份鋼鐵修煉完成！再一組就回家！💪');
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(null);

  // V2-03: Pose & Expression Selectors
  const [selectedPose, setSelectedPose] = useState<PoseOption>('CURL');
  const [selectedExpression, setSelectedExpression] = useState<ExpressionOption>('smile');

  // V2-03: Interactive Draggable Sticker & Character Coordinates
  const [stickerPos, setStickerPos] = useState<{ x: number; y: number }>({ x: 32, y: 268 });
  const [avatarScenePos, setAvatarScenePos] = useState<{ x: number; y: number }>({ x: 96, y: 78 });
  const [dragTarget, setDragTarget] = useState<'sticker' | 'avatar' | null>(null);

  const latestHist = store.workoutHistory[0];

  useEffect(() => {
    if (!store.memeStudioOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 480;
    const H = aspectRatio === '9:16' ? 680 : 480;
    canvas.width = W;
    canvas.height = H;

    const renderCard = (bgImg?: HTMLImageElement) => {
      // 1. Background
      ctx.fillStyle = '#0b0d13';
      ctx.fillRect(0, 0, W, H);

      // Draw offscreen 480x300 MapleStory Chibi scene with custom Pose, Expression & Position
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
          avatarX: avatarScenePos.x,
          avatarY: avatarScenePos.y,
          avatarState: selectedPose,
          expressionOverride: selectedExpression,
          facingRight: true,
          petHearts: [{ x: avatarScenePos.x + 52, y: avatarScenePos.y + 8, alpha: 1 }],
        });
      }

      const sceneY = 54;
      const sceneH = aspectRatio === '9:16' ? 360 : 265;

      if (bgImg) {
        ctx.drawImage(bgImg, 20, sceneY, W - 40, sceneH);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 28, sceneY + sceneH - 110, 160, 100);
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
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(`⚡ ${BRAND_CONFIG.appName} WORKOUT VERIFIED`, 20, 34);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(`🔥 STREAK ${store.streakDays} DAYS`, W - 175, 34);

      // 3. Freely Draggable Sticker Badge (V2-03)
      ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
      const textMetrics = ctx.measureText(selectedSticker);
      const badgeW = Math.min(W - 40, Math.max(180, textMetrics.width + 32));
      const badgeH = 40;
      const clampedX = Math.max(20, Math.min(W - badgeW - 20, stickerPos.x));
      const clampedY = Math.max(54, Math.min(H - 125, stickerPos.y));

      ctx.fillStyle = 'rgba(30, 27, 75, 0.92)';
      ctx.fillRect(clampedX, clampedY, badgeW, badgeH);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(clampedX, clampedY, badgeW, badgeH);

      // Corner drag handle indicator
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(clampedX - 3, clampedY - 3, 6, 6);
      ctx.fillRect(clampedX + badgeW - 3, clampedY + badgeH - 3, 6, 6);

      ctx.fillStyle = '#fda4af';
      ctx.fillText(selectedSticker, clampedX + 14, clampedY + 26);

      // 4. Workout Stats Block at Bottom
      const statsY = sceneY + sceneH + 28;
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
      const summaryText = latestHist
        ? `🏋️ 今日課表：${latestHist.routineName} (${latestHist.totalSets} 組 · ${latestHist.totalVolume} kg)`
        : `🏋️ 玩家：${store.nickname} (Lv.${store.level})`;
      ctx.fillText(summaryText.slice(0, 30), 20, statsY);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Noto Sans TC", sans-serif';
      ctx.fillText(caption.slice(0, 34), 20, statsY + 28);

      // 5. Bottom-Right Brand Watermark
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(`👾 ${BRAND_CONFIG.appName} · 像素健身養成社群`, W - 235, H - 14);
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
    selectedPose,
    selectedExpression,
    stickerPos,
    avatarScenePos,
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

  // Pointer drag handlers for moving the Sticker or Character directly on Canvas
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e);
    // Check if pointer is inside or near the sticker box
    if (
      pt.x >= stickerPos.x - 20 &&
      pt.x <= stickerPos.x + 340 &&
      pt.y >= stickerPos.y - 15 &&
      pt.y <= stickerPos.y + 55
    ) {
      setDragTarget('sticker');
    } else {
      setDragTarget('avatar');
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragTarget) return;
    const pt = getCanvasCoords(e);
    if (dragTarget === 'sticker') {
      setStickerPos({
        x: Math.round(pt.x - 100),
        y: Math.round(pt.y - 20),
      });
    } else if (dragTarget === 'avatar') {
      // Map canvas coordinates into 240x150 pixel scene coordinates
      const mappedX = Math.max(24, Math.min(180, Math.round((pt.x - 20) / 2) - 16));
      const mappedY = Math.max(52, Math.min(96, Math.round((pt.y - 54) / 2) - 24));
      setAvatarScenePos({ x: mappedX, y: mappedY });
    }
  };

  const handlePointerUp = () => {
    setDragTarget(null);
  };

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
            <h3 className="text-sm font-black text-white">迷因拍貼工坊 (可自由拖曳貼圖與角色)</h3>
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
                {ratio === '9:16' ? '📱 9:16 限動' : '🟦 1:1 貼文'}
              </button>
            ))}
          </div>

          <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-xs font-bold cursor-pointer flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadedBgUrl ? '更換自拍照' : '疊加本機自拍'}</span>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>

        {/* Interactive Draggable Canvas Stage */}
        <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 flex flex-col items-center gap-1.5">
          <div className="w-full flex items-center justify-between text-[10px] text-cyan-300 px-1">
            <span className="flex items-center gap-1 font-bold">
              <Move className="w-3 h-3" />
              直接在畫布上拖曳「貼圖框」或「角色位置」！
            </span>
            <button
              onClick={() => {
                setStickerPos({ x: 32, y: 268 });
                setAvatarScenePos({ x: 96, y: 78 });
              }}
              className="text-slate-400 hover:text-white underline"
            >
              重置位置
            </button>
          </div>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="max-h-60 w-auto rounded-lg border border-slate-700 shadow-lg cursor-grab active:cursor-grabbing touch-none"
          />
        </div>

        {/* V2-03: Expression & Action Pose Selectors */}
        <div className="grid grid-cols-2 gap-2">
          {/* Expression Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 space-y-1.5">
            <span className="text-[11px] font-black text-slate-300 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-amber-400" />
              角色表情設定
            </span>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  { id: 'smile', label: '😊 自信笑' },
                  { id: 'strain', label: '😣 咬牙汗' },
                  { id: 'cool', label: '😎 耍帥酷' },
                  { id: 'cry', label: '😭 練腿哭' },
                ] as { id: ExpressionOption; label: string }[]
              ).map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setSelectedExpression(exp.id)}
                  className={`py-1 px-1.5 rounded text-[10px] font-black border transition ${
                    selectedExpression === exp.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pose Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 space-y-1.5">
            <span className="text-[11px] font-black text-slate-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              角色動作姿勢
            </span>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  { id: 'CURL', label: '💪 二頭彎舉' },
                  { id: 'SQUAT', label: '🏋️ 深蹲爆發' },
                  { id: 'CHEER', label: '🙌 勝利歡呼' },
                  { id: 'WALK', label: '🚶 漫步展示' },
                ] as { id: PoseOption; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPose(p.id)}
                  className={`py-1 px-1.5 rounded text-[10px] font-black border transition ${
                    selectedPose === p.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Meme Sticker Picker */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300">
            選擇健身迷因貼圖 (選取後可在畫布自由移動)：
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {MEME_STICKERS.map((stk) => (
              <button
                key={stk.id}
                onClick={() => setSelectedSticker(stk.text)}
                className={`p-1.5 rounded-lg text-[11px] font-bold text-left truncate border transition ${
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
          <label className="text-[11px] font-bold text-slate-300 block mb-1">打卡心情語錄：</label>
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
            <span>發佈至社交動態</span>
          </button>
        </div>
      </div>
    </div>
  );
};
