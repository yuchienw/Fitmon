import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  Share2,
  Camera,
  Move,
  FlipHorizontal2,
  RotateCcw,
  ZoomIn,
  Stamp,
  User,
  Dumbbell,
  Flame,
  Sparkles,
  Footprints,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { drawMapleChibiAvatar } from '../../game/pixelSpriteDrawer';
import { BRAND_CONFIG } from '../../config/economyConfig';

type PoseOption = 'IDLE' | 'SQUAT' | 'CURL' | 'CHEER' | 'WALK';
type ExpressionOption = 'smile' | 'strain' | 'cool';

export const MemeStudioModal: React.FC = () => {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [loadedPhotoImg, setLoadedPhotoImg] = useState<HTMLImageElement | null>(null);

  // Avatar placement & pose controls (normalized 0..1 coordinates on canvas)
  const [avatarNormPos, setAvatarNormPos] = useState<{ x: number; y: number }>({
    x: 0.72,
    y: 0.76,
  });
  const [avatarScale, setAvatarScale] = useState<number>(1.35);
  const [facingRight, setFacingRight] = useState<boolean>(false);
  const [selectedPose, setSelectedPose] = useState<PoseOption>('CHEER');
  const [selectedExpression, setSelectedExpression] = useState<ExpressionOption>('smile');
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const latestHist = store.workoutHistory[0];

  // Preload uploaded photo into an HTMLImageElement
  useEffect(() => {
    if (!uploadedPhotoUrl) {
      setLoadedPhotoImg(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLoadedPhotoImg(img);
    img.src = uploadedPhotoUrl;
  }, [uploadedPhotoUrl]);

  // Render composite canvas (Real Photo + Transparent Chibi Avatar + Optional Watermark)
  useEffect(() => {
    if (!store.memeStudioOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 720;
    const H = aspectRatio === '9:16' ? 1080 : 720;
    canvas.width = W;
    canvas.height = H;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw Real Photo (center-cropped cover) OR Realistic Gym Mirror Preview Backdrop
    if (loadedPhotoImg) {
      const imgRatio = loadedPhotoImg.width / loadedPhotoImg.height;
      const canvasRatio = W / H;
      let drawW = W;
      let drawH = H;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        drawH = H;
        drawW = H * imgRatio;
        offsetX = (W - drawW) / 2;
      } else {
        drawW = W;
        drawH = W / imgRatio;
        offsetY = (H - drawH) / 2;
      }
      ctx.drawImage(loadedPhotoImg, offsetX, offsetY, drawW, drawH);
    } else {
      // Realistic dark gym mirror studio backdrop so user sees how their transparent avatar composites
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.62, '#0f172a');
      grad.addColorStop(0.63, '#1e1b18');
      grad.addColorStop(1, '#141210');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle gym mirror reflection & rack silhouette
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 4;
      ctx.strokeRect(48, 48, W - 96, H * 0.56);

      // Diagonal mirror sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.moveTo(90, 48);
      ctx.lineTo(220, 48);
      ctx.lineTo(90, H * 0.6);
      ctx.closePath();
      ctx.fill();

      // Subtle prompt in center-left when no user photo is uploaded yet
      ctx.fillStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.font = 'bold 22px "Noto Sans TC", sans-serif';
      ctx.fillText('點擊上方「選取照片 / 拍照」', 64, H * 0.32);
      ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.fillText('讓你的紙娃娃直接融入真實合照！', 64, H * 0.32 + 34);
    }

    // 2. Draw Transparent-Background 2D Chibi Avatar at user-chosen position & scale
    const targetX = avatarNormPos.x * W;
    const targetY = avatarNormPos.y * H;

    // Draw realistic soft contact shadow on the photo beneath the avatar's feet
    ctx.save();
    ctx.translate(targetX, targetY);
    const shadowRx = 46 * avatarScale;
    const shadowRy = 13 * avatarScale;
    const shadowGrad = ctx.createRadialGradient(0, 4, 2, 0, 4, shadowRx);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Render Avatar onto an offscreen canvas then scale crisply onto the photo
    // In drawMapleChibiAvatar, pivot (centerX = x + 28, baseY = y + 60) is the feet center.
    ctx.save();
    ctx.translate(targetX, targetY);
    const finalScale = 2.8 * avatarScale;
    ctx.scale(finalScale, finalScale);
    drawMapleChibiAvatar(ctx, {
      x: -28,
      y: -60,
      bodyStage: store.bodyStage,
      equipped: store.equipped,
      state: selectedPose,
      expressionOverride: selectedExpression,
      facingRight,
      frameTick: selectedPose === 'CURL' ? 18 : 10,
    });
    ctx.restore();

    // 3. Optional Minimalist Corner Watermark (Only drawn when showWatermark === true)
    if (showWatermark) {
      const pad = 24;
      const pillH = 54;
      const summaryLabel = latestHist
        ? `${BRAND_CONFIG.appName} · Lv.${store.level} ${store.nickname} · ${latestHist.totalVolume.toLocaleString()}kg`
        : `${BRAND_CONFIG.appName} · Lv.${store.level} ${store.nickname} · 🔥 ${store.streakDays}天`;

      ctx.font = 'bold 20px "Barlow Condensed", "Noto Sans TC", sans-serif';
      const textW = ctx.measureText(summaryLabel).width;
      const pillW = Math.min(W - pad * 2, textW + 44);
      const pillX = W - pillW - pad;
      const pillY = H - pillH - pad;

      // Frosted dark pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.76)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 16);
      ctx.fill();

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'middle';
      ctx.fillText(summaryLabel, pillX + 22, pillY + pillH / 2 + 1);
    }

    ctx.restore();
  }, [
    store.memeStudioOpen,
    aspectRatio,
    loadedPhotoImg,
    avatarNormPos,
    avatarScale,
    facingRight,
    selectedPose,
    selectedExpression,
    showWatermark,
    store.bodyStage,
    store.equipped,
    store.level,
    store.nickname,
    store.streakDays,
    latestHist,
  ]);

  if (!store.memeStudioOpen) return null;

  const updateAvatarPosFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0.12, Math.min(0.88, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0.22, Math.min(0.93, (e.clientY - rect.top) / rect.height));
    setAvatarNormPos({ x: normX, y: normY });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    updateAvatarPosFromPointer(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    updateAvatarPosFromPointer(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `fitmon-photo-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    store.completePhotoWithAvatarQuest();
    store.showToast('💾 已儲存高清合照至裝置相簿！');
  };

  const handleExternalShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    store.completePhotoWithAvatarQuest();

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob && typeof navigator !== 'undefined' && navigator.share) {
        const file = new File([blob], `fitmon-avatar-photo.png`, { type: 'image/png' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${BRAND_CONFIG.appName} 與我的娃合照`,
            files: [file],
          });
          store.showToast('📲 已開啟系統站外分享選單！');
          return;
        }
      }
    } catch {
      // User cancelled share sheet or browser does not support file sharing; fall back cleanly
    }

    handleDownloadPhoto();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-md retro-box rounded-2xl p-4 space-y-3 border-2 border-slate-700 max-h-[94vh] overflow-y-auto">
        {/* 1. Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h3 className="text-sm font-black text-white">與我的娃合照（實景合成）</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              拍下或選取照片，直接拖曳你的紙娃娃一起同框合照！
            </p>
          </div>
          <button
            onClick={() => store.setMemeStudioOpen(false)}
            aria-label="關閉合照視窗"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Top Bar: Photo Upload + Aspect Ratio + Watermark Toggle */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <label className="retro-btn px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1.5 shadow">
            <Camera className="w-3.5 h-3.5 stroke-[2.5px]" aria-hidden="true" />
            <span>{uploadedPhotoUrl ? '更換照片 / 重拍' : '選取照片 / 拍照'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-1">
            {(['1:1', '9:16'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-black border transition ${
                  aspectRatio === ratio
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                {ratio === '9:16' ? '9:16 限動' : '1:1 方圖'}
              </button>
            ))}

            <button
              onClick={() => setShowWatermark((v) => !v)}
              aria-pressed={showWatermark}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black border flex items-center gap-1 transition ${
                showWatermark
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Stamp className="w-3 h-3" aria-hidden="true" />
              <span>{showWatermark ? '浮水印 ON' : '無浮水印'}</span>
            </button>
          </div>
        </div>

        {/* 3. Interactive Composite Canvas Stage */}
        <div className="game-stage-dark bg-slate-950 rounded-2xl p-2 border border-slate-800 flex flex-col items-center gap-1.5">
          <div className="w-full flex items-center justify-between text-[11px] text-cyan-300 px-1">
            <span className="flex items-center gap-1 font-bold">
              <Move className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>直接用手指在照片上拖曳紙娃娃的位置</span>
            </span>
            <button
              onClick={() => {
                setAvatarNormPos({ x: 0.72, y: 0.76 });
                setAvatarScale(1.35);
                setFacingRight(false);
              }}
              className="text-slate-400 hover:text-white flex items-center gap-0.5 text-[10px] font-bold"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>重置位置</span>
            </button>
          </div>

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full max-w-[330px] rounded-xl border border-slate-700 shadow-lg touch-none cursor-move"
          />
        </div>

        {/* 4. Compact Avatar Controls: Scale + Flip + Pose */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
          {/* Scale Slider & Horizontal Flip */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <ZoomIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-black text-slate-300 shrink-0">大小</span>
              <input
                type="range"
                min={0.6}
                max={2.4}
                step={0.05}
                value={avatarScale}
                onChange={(e) => setAvatarScale( parseFloat(e.target.value) )}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <span className="text-[11px] font-mono font-bold text-emerald-400 w-9 text-right">
                {avatarScale.toFixed(1)}x
              </span>
            </div>

            <button
              onClick={() => setFacingRight((v) => !v)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-black text-white flex items-center gap-1 shrink-0"
            >
              <FlipHorizontal2 className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>左右翻轉</span>
            </button>
          </div>

          {/* Pose & Expression Switcher */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-1 flex-wrap">
              {(
                [
                  { id: 'CHEER', label: '歡呼', icon: Sparkles },
                  { id: 'CURL', label: '彎舉', icon: Flame },
                  { id: 'SQUAT', label: '深蹲', icon: Dumbbell },
                  { id: 'IDLE', label: '站姿', icon: User },
                  { id: 'WALK', label: '散步', icon: Footprints },
                ] as { id: PoseOption; label: string; icon: React.FC<{ className?: string }> }[]
              ).map((p) => {
                const PoseIcon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPose(p.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition ${
                      selectedPose === p.id
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <PoseIcon className="w-3 h-3" aria-hidden="true" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'smile', label: '微笑' },
                  { id: 'strain', label: '發力' },
                  { id: 'cool', label: '耍帥' },
                ] as { id: ExpressionOption; label: string }[]
              ).map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setSelectedExpression(exp.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                    selectedExpression === exp.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Pure External Share & Save Actions (No In-App Feed Posting!) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownloadPhoto}
            className="retro-btn py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span>儲存高清合照</span>
          </button>

          <button
            onClick={handleExternalShare}
            className="retro-btn py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg"
          >
            <Share2 className="w-4 h-4 stroke-[2.5px]" aria-hidden="true" />
            <span>站外分享 (IG / LINE)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
