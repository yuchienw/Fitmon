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
  LayoutTemplate,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { drawMapleChibiAvatar } from '../../game/pixelSpriteDrawer';
import { BRAND_CONFIG } from '../../config/economyConfig';

type PoseOption = 'IDLE' | 'SQUAT' | 'CURL' | 'CHEER' | 'WALK';
type ExpressionOption = 'smile' | 'strain' | 'cool';
type ShareTemplateId = 'strava_bottom' | 'nrc_center' | 'minimal_corner' | 'rpg_hud';
type StatCategoryMode = 'strength' | 'cardio' | 'rpg_raid';

const SHARE_TEMPLATES: {
  id: ShareTemplateId;
  nameZh: string;
  descZh: string;
  defaultAvatarPos: { x: number; y: number };
}[] = [
  {
    id: 'strava_bottom',
    nameZh: '經典底欄',
    descZh: '底部漸層三格數據＋娃娃站右',
    defaultAvatarPos: { x: 0.78, y: 0.76 },
  },
  {
    id: 'nrc_center',
    nameZh: '大字海報',
    descZh: '中央超大主數據＋娃娃陪練',
    defaultAvatarPos: { x: 0.76, y: 0.66 },
  },
  {
    id: 'minimal_corner',
    nameZh: '左上極簡',
    descZh: '左上角玻璃數據卡，不擋鏡中身材',
    defaultAvatarPos: { x: 0.76, y: 0.84 },
  },
  {
    id: 'rpg_hud',
    nameZh: 'RPG 戰報',
    descZh: '運動數據結合出拳戰力與取景框',
    defaultAvatarPos: { x: 0.78, y: 0.77 },
  },
];

export const MemeStudioModal: React.FC = () => {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const latestHist = store.workoutHistory[0];

  // Photo & Ratio
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [loadedPhotoImg, setLoadedPhotoImg] = useState<HTMLImageElement | null>(null);

  // Template & 3 Independent Layer Toggles (數據 / 紙娃娃 / 浮水印)
  const [templateId, setTemplateId] = useState<ShareTemplateId>('strava_bottom');
  const [showStats, setShowStats] = useState<boolean>(true);
  const [showAvatar, setShowAvatar] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  // Sport Stat Mode & Editable Values (auto-populated from latest workout)
  const [statMode, setStatMode] = useState<StatCategoryMode>('strength');
  const [editStatsOpen, setEditStatsOpen] = useState<boolean>(false);

  const defaultVolKg = latestHist ? latestHist.totalVolume : 5400;
  const defaultSets = latestHist ? latestHist.totalSets : 16;
  const defaultDurationMin = latestHist ? latestHist.durationMinutes : 48;
  const defaultKcal = Math.round(defaultDurationMin * 7.5 + defaultSets * 6);

  const [customVolumeKg, setCustomVolumeKg] = useState<number>(defaultVolKg);
  const [customSets, setCustomSets] = useState<number>(defaultSets);
  const [customDurationMin, setCustomDurationMin] = useState<number>(defaultDurationMin);
  const [customKcal, setCustomKcal] = useState<number>(defaultKcal);
  const [customDistanceKm, setCustomDistanceKm] = useState<number>(5.2);
  const [customPaceStr, setCustomPaceStr] = useState<string>("5'30\"");

  // Sync defaults when workoutHistory updates
  useEffect(() => {
    if (latestHist) {
      setCustomVolumeKg(latestHist.totalVolume);
      setCustomSets(latestHist.totalSets);
      setCustomDurationMin(latestHist.durationMinutes);
      setCustomKcal(Math.round(latestHist.durationMinutes * 7.5 + latestHist.totalSets * 6));
    }
  }, [latestHist]);

  // Avatar placement & pose controls (normalized 0..1 coordinates on canvas)
  const [avatarNormPos, setAvatarNormPos] = useState<{ x: number; y: number }>({
    x: 0.78,
    y: 0.76,
  });
  const [avatarScale, setAvatarScale] = useState<number>(1.35);
  const [avatarRotationDeg, setAvatarRotationDeg] = useState<number>(0);
  const [facingRight, setFacingRight] = useState<boolean>(false);
  const [selectedPose, setSelectedPose] = useState<PoseOption>('CHEER');
  const [selectedExpression, setSelectedExpression] = useState<ExpressionOption>('smile');
  const [isDragging, setIsDragging] = useState<boolean>(false);

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

  // Switch template and snap avatar to template's ideal default spot
  const handleSelectTemplate = (tpl: ShareTemplateId) => {
    setTemplateId(tpl);
    const found = SHARE_TEMPLATES.find((t) => t.id === tpl);
    if (found) {
      setAvatarNormPos(found.defaultAvatarPos);
    }
  };

  // Build the 3 stat metrics to display based on statMode
  const getDisplayMetrics = (): {
    heroValue: string;
    heroUnit: string;
    heroLabel: string;
    items: { label: string; value: string; unit: string }[];
    tagLabel: string;
  } => {
    if (statMode === 'cardio') {
      return {
        heroValue: customDistanceKm.toFixed(2),
        heroUnit: 'KM',
        heroLabel: '今日有氧距離',
        tagLabel: 'CARDIO SESSION',
        items: [
          { label: '距離', value: customDistanceKm.toFixed(2), unit: 'km' },
          { label: '消耗熱量', value: customKcal.toLocaleString(), unit: 'kcal' },
          { label: '配速 / 時間', value: `${customPaceStr}`, unit: `${customDurationMin}m` },
        ],
      };
    }
    if (statMode === 'rpg_raid') {
      const estDmg = Math.max(850, store.personalMaxDamage || 1280);
      return {
        heroValue: estDmg.toLocaleString(),
        heroUnit: 'DMG',
        heroLabel: `STAGE ${store.squadStage} 討伐戰力`,
        tagLabel: `BOSS RAID · STAGE ${store.squadStage}`,
        items: [
          { label: '出拳傷害', value: estDmg.toLocaleString(), unit: 'HP' },
          { label: '訓練容量', value: customVolumeKg.toLocaleString(), unit: 'kg' },
          { label: '消耗熱量', value: customKcal.toLocaleString(), unit: 'kcal' },
        ],
      };
    }
    return {
      heroValue: customVolumeKg.toLocaleString(),
      heroUnit: 'KG',
      heroLabel: latestHist?.routineName || '今日重訓總容量',
      tagLabel: 'STRENGTH WORKOUT',
      items: [
        { label: '訓練容量', value: customVolumeKg.toLocaleString(), unit: 'kg' },
        { label: '消耗熱量', value: customKcal.toLocaleString(), unit: 'kcal' },
        { label: '完成組數', value: `${customSets} 組`, unit: `${customDurationMin}m` },
      ],
    };
  };

  // Render composite canvas (Real Photo + Optional Stats Template + Optional Avatar + Optional Watermark)
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

    // =========================================================================
    // LAYER 1: Real Photo (center-cropped cover) OR Realistic Gym Mirror Backdrop
    // =========================================================================
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
      // Realistic dark gym mirror studio backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.58, '#0f172a');
      grad.addColorStop(0.59, '#1c1917');
      grad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle gym mirror frame & lighting reflection
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 4;
      ctx.strokeRect(44, 44, W - 88, H * 0.52);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.moveTo(80, 44);
      ctx.lineTo(220, 44);
      ctx.lineTo(80, H * 0.54);
      ctx.closePath();
      ctx.fill();

      // Subtle guide prompt in center
      ctx.fillStyle = 'rgba(248, 250, 252, 0.38)';
      ctx.font = 'bold 22px "Noto Sans TC", sans-serif';
      ctx.fillText('📷 點擊上方「選取照片 / 拍照」', 64, H * 0.25);
      ctx.font = 'bold 17px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.42)';
      ctx.fillText('自由切換 4 種運動數據模板、開關娃娃與浮水印', 64, H * 0.25 + 34);
    }

    // =========================================================================
    // LAYER 2: Transparent-Background 2D Chibi Avatar (if showAvatar === true)
    // =========================================================================
    if (showAvatar) {
      const targetX = avatarNormPos.x * W;
      const targetY = avatarNormPos.y * H;

      // Soft contact shadow on the ground beneath the avatar's feet
      ctx.save();
      ctx.translate(targetX, targetY);
      const shadowRx = 46 * avatarScale;
      const shadowRy = 13 * avatarScale;
      const shadowGrad = ctx.createRadialGradient(0, 4, 2, 0, 4, shadowRx);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 4, shadowRx, shadowRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Chibi Avatar (with smooth 360-degree rotation around character's body center)
      ctx.save();
      ctx.translate(targetX, targetY);
      const finalScale = 2.8 * avatarScale;
      const bodyCenterOffsetY = -30 * finalScale;
      ctx.translate(0, bodyCenterOffsetY);
      ctx.rotate((avatarRotationDeg * Math.PI) / 180);
      ctx.translate(0, -bodyCenterOffsetY);
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
    }

    // =========================================================================
    // LAYER 3: Workout Stats Overlay by Selected Template (if showStats === true)
    // =========================================================================
    const metrics = getDisplayMetrics();
    const todayDateStr = new Date().toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (showStats) {
      if (templateId === 'strava_bottom') {
        // TEMPLATE 1: Strava-Style Bottom Gradient + 3 Clean Athletic Columns
        const gradH = 260;
        const botGrad = ctx.createLinearGradient(0, H - gradH, 0, H);
        botGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        botGrad.addColorStop(0.45, 'rgba(9, 13, 22, 0.72)');
        botGrad.addColorStop(1, 'rgba(9, 13, 22, 0.94)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, H - gradH, W, gradH);

        const baseY = H - (showWatermark ? 82 : 42);

        // Top accent tag + Workout Title
        ctx.fillStyle = '#34d399';
        ctx.font = '800 16px "Barlow Condensed", "Noto Sans TC", sans-serif';
        ctx.fillText(`⚡ ${metrics.tagLabel} · ${todayDateStr}`, 36, baseY - 102);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 24px "Noto Sans TC", sans-serif';
        ctx.fillText(metrics.heroLabel, 36, baseY - 70);

        // 3 Stat Columns
        metrics.items.forEach((item, idx) => {
          const colX = 36 + idx * 172;
          // Label
          ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
          ctx.font = '700 14px "Noto Sans TC", sans-serif';
          ctx.fillText(item.label, colX, baseY - 40);

          // Big Athletic Number
          ctx.fillStyle = idx === 0 ? '#fbbf24' : '#ffffff';
          ctx.font = '900 38px "Barlow Condensed", monospace';
          ctx.fillText(item.value, colX, baseY);

          const numW = ctx.measureText(item.value).width;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '800 16px "Barlow Condensed", sans-serif';
          ctx.fillText(item.unit, colX + numW + 5, baseY);
        });
      } else if (templateId === 'nrc_center') {
        // TEMPLATE 2: Nike Run Club (NRC) Big Center-Left Hero Poster
        const gradH = 310;
        const botGrad = ctx.createLinearGradient(0, H - gradH, 0, H);
        botGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        botGrad.addColorStop(1, 'rgba(9, 13, 22, 0.88)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, H - gradH, W, gradH);

        const heroY = H - (showWatermark ? 145 : 110);

        // Pill Tag
        ctx.fillStyle = 'rgba(249, 115, 22, 0.92)';
        ctx.beginPath();
        ctx.roundRect(36, heroY - 135, 190, 32, 8);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 16px "Barlow Condensed", sans-serif';
        ctx.fillText(`🔥 ${metrics.tagLabel}`, 48, heroY - 113);

        // Giant Italic-Style Hero Value
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 92px "Barlow Condensed", sans-serif';
        ctx.fillText(metrics.heroValue, 34, heroY);
        const heroW = ctx.measureText(metrics.heroValue).width;

        ctx.fillStyle = '#34d399';
        ctx.font = '900 36px "Barlow Condensed", sans-serif';
        ctx.fillText(metrics.heroUnit, 34 + heroW + 10, heroY);
        ctx.restore();

        // Secondary Sub-Bar
        const subText = metrics.items
          .slice(1)
          .map((it) => `${it.label} ${it.value} ${it.unit}`)
          .join('   ·   ');
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 20px "Noto Sans TC", sans-serif';
        ctx.fillText(`${ subText }`, 38, heroY + 38);
      } else if (templateId === 'minimal_corner') {
        // TEMPLATE 3: Top-Left Frosted Glass Card (Leaves mirror body 100% clear)
        const cardX = 28;
        const cardY = 28;
        const cardW = 300;
        const cardH = 196;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.76)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = '800 14px "Barlow Condensed", sans-serif';
        ctx.fillText(`${metrics.tagLabel} · ${todayDateStr}`, cardX + 20, cardY + 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px "Noto Sans TC", sans-serif';
        ctx.fillText(metrics.heroLabel.slice(0, 13), cardX + 20, cardY + 58);

        // Divider
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 20, cardY + 72);
        ctx.lineTo(cardX + cardW - 20, cardY + 72);
        ctx.stroke();

        metrics.items.forEach((item, idx) => {
          const rowY = cardY + 102 + idx * 36;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 15px "Noto Sans TC", sans-serif';
          ctx.fillText(item.label, cardX + 20, rowY);

          ctx.fillStyle = idx === 0 ? '#fbbf24' : '#f8fafc';
          ctx.font = '900 24px "Barlow Condensed", monospace';
          const valText = `${item.value} ${item.unit}`;
          const valW = ctx.measureText(valText).width;
          ctx.fillText(valText, cardX + cardW - 20 - valW, rowY);
        });
      } else if (templateId === 'rpg_hud') {
        // TEMPLATE 4: FitMon RPG Battle Frame + Workout Stats Bar
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, W - 40, H - 40);

        // Top HUD Player Level & Streak Pill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(34, 34, 320, 46, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 18px "Barlow Condensed", "Noto Sans TC", sans-serif';
        ctx.fillText(
          `⚔️ Lv.${store.level} ${store.nickname}  ·  🔥 連勝 ${store.streakDays} 天`,
          50,
          63
        );

        // Bottom RPG Stat Dock
        const dockY = H - (showWatermark ? 170 : 132);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(34, dockY, W - 68, 96, 18);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        metrics.items.forEach((item, idx) => {
          const colX = 56 + idx * 208;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 14px "Noto Sans TC", sans-serif';
          ctx.fillText(item.label, colX, dockY + 32);

          ctx.fillStyle = idx === 0 ? '#34d399' : '#ffffff';
          ctx.font = '900 34px "Barlow Condensed", monospace';
          ctx.fillText(`${item.value}`, colX, dockY + 74);
          const w = ctx.measureText(`${item.value}`).width;
          ctx.fillStyle = '#fbbf24';
          ctx.font = '800 15px "Barlow Condensed", sans-serif';
          ctx.fillText(item.unit, colX + w + 5, dockY + 74);
        });
      }
    }

    // =========================================================================
    // LAYER 4: Optional FitMon Brand Watermark (if showWatermark === true)
    // =========================================================================
    if (showWatermark) {
      const pad = 28;
      const pillH = 42;
      const wmText = `⚡ ${BRAND_CONFIG.appName} · Lv.${store.level} ${store.nickname}`;

      ctx.font = '800 17px "Barlow Condensed", "Noto Sans TC", sans-serif';
      const textW = ctx.measureText(wmText).width;
      const pillW = textW + 34;
      const pillX = W - pillW - pad;
      const pillY = H - pillH - 22;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'middle';
      ctx.fillText(wmText, pillX + 17, pillY + pillH / 2 + 1);
    }

    ctx.restore();
  }, [
    store.memeStudioOpen,
    aspectRatio,
    loadedPhotoImg,
    templateId,
    showStats,
    showAvatar,
    showWatermark,
    statMode,
    customVolumeKg,
    customSets,
    customDurationMin,
    customKcal,
    customDistanceKm,
    customPaceStr,
    avatarNormPos,
    avatarScale,
    avatarRotationDeg,
    facingRight,
    selectedPose,
    selectedExpression,
    store.bodyStage,
    store.equipped,
    store.level,
    store.nickname,
    store.streakDays,
    store.squadStage,
    store.personalMaxDamage,
    latestHist,
  ]);

  if (!store.memeStudioOpen) return null;

  const updateAvatarPosFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!showAvatar) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0.18, Math.min(0.94, (e.clientY - rect.top) / rect.height));
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
    link.download = `fitmon-share-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    store.completePhotoWithAvatarQuest();
    store.showToast('💾 已儲存高清運動合照至相簿！');
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
        const file = new File([blob], `fitmon-workout-share.png`, { type: 'image/png' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${BRAND_CONFIG.appName} 運動紀錄與紙娃娃合照`,
            files: [file],
          });
          store.showToast('📲 已開啟系統站外分享選單！');
          return;
        }
      }
    } catch {
      // Fall back to direct PNG download
    }

    handleDownloadPhoto();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-md retro-box rounded-2xl p-3.5 space-y-2.5 border-2 border-slate-700 max-h-[94vh] overflow-y-auto">
        {/* 1. Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h3 className="text-sm font-black text-white">運動紀錄 × 紙娃娃合照合成</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              自由選擇運動數據模板，並可隨時開關「數據 / 娃娃 / 浮水印」
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

        {/* 2. Photo Upload + Aspect Ratio Switcher */}
        <div className="flex items-center justify-between gap-2">
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-black border transition ${
                  aspectRatio === ratio
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                {ratio === '9:16' ? '9:16 限動' : '1:1 貼文'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. THREE INDEPENDENT VISIBILITY TOGGLES: [📊 數據] [🧍 紙娃娃] [🏷️ 浮水印] */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setShowStats((v) => !v)}
            aria-pressed={showStats}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-black border flex items-center justify-center gap-1 transition ${
              showStats
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {showStats ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>數據 {showStats ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowAvatar((v) => !v)}
            aria-pressed={showAvatar}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-black border flex items-center justify-center gap-1 transition ${
              showAvatar
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {showAvatar ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>我的娃 {showAvatar ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowWatermark((v) => !v)}
            aria-pressed={showWatermark}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-black border flex items-center justify-center gap-1 transition ${
              showWatermark
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>浮水印 {showWatermark ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* 4. Interactive Composite Canvas Stage */}
        <div className="game-stage-dark bg-slate-950 rounded-2xl p-2 border border-slate-800 flex flex-col items-center gap-1.5">
          <div className="w-full flex items-center justify-between text-[11px] text-cyan-300 px-1">
            <span className="flex items-center gap-1 font-bold">
              <Move className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{showAvatar ? '直接在照片上拖曳紙娃娃調整位置' : '目前已隱藏紙娃娃'}</span>
            </span>
            {showAvatar && (
              <button
                onClick={() => {
                  const found = SHARE_TEMPLATES.find((t) => t.id === templateId);
                  setAvatarNormPos(found ? found.defaultAvatarPos : { x: 0.78, y: 0.76 });
                  setAvatarScale(1.35);
                  setAvatarRotationDeg(0);
                  setFacingRight(false);
                }}
                className="text-slate-400 hover:text-white flex items-center gap-0.5 text-[10px] font-bold"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>重置位置</span>
              </button>
            )}
          </div>

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`w-full max-w-[320px] rounded-xl border border-slate-700 shadow-lg touch-none ${
              showAvatar ? 'cursor-move' : 'cursor-default'
            }`}
          />
        </div>

        {/* 5. TEMPLATE & WORKOUT DATA CONTROLS (Shown when showStats is ON) */}
        {showStats && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
            {/* 4 Templates Selector */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-black text-slate-300 flex items-center gap-1 shrink-0">
                <LayoutTemplate className="w-3.5 h-3.5 text-emerald-400" />
                <span>排版模板</span>
              </span>
              <div className="grid grid-cols-4 gap-1 flex-1 max-w-[270px]">
                {SHARE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-black transition ${
                      templateId === tpl.id
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {tpl.nameZh}
                  </button>
                ))}
              </div>
            </div>

            {/* Sport Metric Type Selector + Custom Value Editor Toggle */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'strength', label: '重訓容量(kg)' },
                    { id: 'cardio', label: '跑步有氧(km)' },
                    { id: 'rpg_raid', label: '討伐戰報(HP)' },
                  ] as { id: StatCategoryMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setStatMode(m.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                      statMode === m.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setEditStatsOpen((v) => !v)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-black text-amber-300 flex items-center gap-1 shrink-0"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{editStatsOpen ? '收起數值' : '微調數值'}</span>
              </button>
            </div>

            {/* Inline Quick Inputs for Customizing KM / KCAL / KG */}
            {editStatsOpen && (
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {statMode === 'cardio' ? (
                  <>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                      <label className="text-[9px] text-slate-400 block">距離 (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customDistanceKm}
                        onChange={(e) => setCustomDistanceKm(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent font-mono font-black text-xs text-white outline-none"
                      />
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                      <label className="text-[9px] text-slate-400 block">熱量 (kcal)</label>
                      <input
                        type="number"
                        value={customKcal}
                        onChange={(e) => setCustomKcal(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent font-mono font-black text-xs text-amber-300 outline-none"
                      />
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                      <label className="text-[9px] text-slate-400 block">配速 (/km)</label>
                      <input
                        type="text"
                        value={customPaceStr}
                        onChange={(e) => setCustomPaceStr(e.target.value)}
                        className="w-full bg-transparent font-mono font-black text-xs text-emerald-300 outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                      <label className="text-[9px] text-slate-400 block">總容量 (kg)</label>
                      <input
                        type="number"
                        step="50"
                        value={customVolumeKg}
                        onChange={(e) => setCustomVolumeKg(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent font-mono font-black text-xs text-white outline-none"
                      />
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                      <label className="text-[9px] text-slate-400 block">消耗 (kcal)</label>
                      <input
                        type="number"
                        step="10"
                        value={customKcal}
                        onChange={(e) => setCustomKcal(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent font-mono font-black text-xs text-amber-300 outline-none"
                      />
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                      <label className="text-[9px] text-slate-400 block">時長 (分鐘)</label>
                      <input
                        type="number"
                        value={customDurationMin}
                        onChange={(e) => setCustomDurationMin(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-transparent font-mono font-black text-xs text-emerald-300 outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. AVATAR CONTROLS (Shown when showAvatar is ON) */}
        {showAvatar && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <ZoomIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="text-[11px] font-black text-slate-300 shrink-0">娃娃大小</span>
                <input
                  type="range"
                  min={0.6}
                  max={2.4}
                  step={0.05}
                  value={avatarScale}
                  onChange={(e) => setAvatarScale(parseFloat(e.target.value))}
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
                <span>翻轉</span>
              </button>
            </div>

            {/* 360-Degree Rotation Slider + Quick Angle Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-2 flex-1">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span className="text-[11px] font-black text-slate-300 shrink-0">旋轉角度</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={avatarRotationDeg}
                  onChange={(e) => setAvatarRotationDeg(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-[11px] font-mono font-bold text-amber-400 w-10 text-right">
                  {avatarRotationDeg > 0 ? `+${avatarRotationDeg}°` : `${avatarRotationDeg}°`}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() =>
                    setAvatarRotationDeg((d) => Math.max(-180, Math.min(180, d - 15)))
                  }
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono font-black text-slate-300"
                  title="逆時針轉 15°"
                >
                  -15°
                </button>
                <button
                  onClick={() => setAvatarRotationDeg(0)}
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-black text-amber-300"
                  title="角度回正 0°"
                >
                  0°
                </button>
                <button
                  onClick={() =>
                    setAvatarRotationDeg((d) => Math.max(-180, Math.min(180, d + 15)))
                  }
                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono font-black text-slate-300"
                  title="順時針轉 15°"
                >
                  +15°
                </button>
              </div>
            </div>

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
                      className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition ${
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
        )}

        {/* 7. Pure External Share & Save Actions */}
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
