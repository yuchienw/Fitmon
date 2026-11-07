import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  ShieldAlert,
  Swords,
  Trophy,
  Bell,
  Share2,
  Zap,
  Clock,
  Ticket,
  Gem,
  Shirt,
  Sparkles,
  Copy,
  X,
  Gift,
  Lock,
  Wrench,
  UserPlus,
  Edit3,
  Download,
  Flame,
} from 'lucide-react';
import {
  useGameStore,
  TodayWorkoutStatus,
  AdventureSportSkillType,
  SquadMemberState,
  SQUAD_CANDIDATE_POOL,
} from '../../stores/useGameStore';
import {
  ADVENTURE_BOSS_CATALOG,
  AVATAR_ITEMS,
  AdventureBoss,
} from '../../config/catalogConfig';
import { BRAND_CONFIG } from '../../config/economyConfig';
import { AvatarPortraitCanvas } from '../../game/AvatarPortraitCanvas';
import { drawMapleChibiAvatar } from '../../game/pixelSpriteDrawer';

type AdventureMainSubTab = 'raid' | 'squad_invite' | 'ladder';
type LadderCategory = 'solo_stage' | 'squad_stage' | 'max_damage';

interface FinalBlowVictoryReport {
  clearedStage: number;
  boss: AdventureBoss;
  finalBlowDamage: number;
  attackTypeLabel: string;
  droppedLootName: string;
}

interface RareLootDropReport {
  stage: number;
  boss: AdventureBoss;
  strikeDamage: number;
}

export const PlazaTab: React.FC = () => {
  const store = useGameStore();
  const [mainSubTab, setMainSubTab] = useState<AdventureMainSubTab>('raid');
  const [ladderCat, setLadderCat] = useState<LadderCategory>('squad_stage');

  // Squad Invite state
  const [squadNameInput, setSquadNameInput] = useState(store.squadName);
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Floating HUD popovers & modals
  const [devCheatOpen, setDevCheatOpen] = useState(false);
  const [lootBagOpen, setLootBagOpen] = useState(false);
  const [inspectedMember, setInspectedMember] = useState<SquadMemberState | null>(null);

  // Final-Blow Boss Victory Auto-Popup Modal State (Only pops up when player lands the killing blow!)
  const [finalBlowReport, setFinalBlowReport] = useState<FinalBlowVictoryReport | null>(null);
  const killPosterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rare Loot Drop Auto-Popup Modal State (Pops up when player rolls the ~18% rare loot drop!)
  const [lootDropReport, setLootDropReport] = useState<RareLootDropReport | null>(null);
  const lootPosterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Combat animation states
  const [isBossHit, setIsBossHit] = useState(false);
  const [isAvatarLunging, setIsAvatarLunging] = useState(false);
  const [floatingHit, setFloatingHit] = useState<{
    damage: number;
    isCrit: boolean;
    label: string;
    droppedLootName?: string;
    isCheatPenalty?: boolean;
  } | null>(null);
  const [shakingMemberId, setShakingMemberId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate player's current gear stats
  const equippedIds = Object.values(store.equipped);
  let myPhyAtk = 20;
  let myMagAtk = 10;
  equippedIds.forEach((id) => {
    const item = AVATAR_ITEMS.find((a) => a.id === id);
    if (item?.combatStat) {
      if (item.combatStat.type === 'phy') myPhyAtk += item.combatStat.value;
      if (item.combatStat.type === 'mag') myMagAtk += item.combatStat.value;
    }
  });

  // Shared Squad Boss info calculation (All teammates in the same squad share this exact Stage & Boss HP)
  const currentStage = store.squadStage;
  const bossTemplate =
    ADVENTURE_BOSS_CATALOG[(currentStage - 1) % ADVENTURE_BOSS_CATALOG.length];
  const maxHp = Math.round(bossTemplate.maxHp * 1.8 * (1 + (currentStage - 1) * 0.25));
  const currentHp = Math.min(maxHp, store.squadBossHp);
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  const isLootCollected = store.collectedBossLoots.includes(bossTemplate.hiddenLoot.id);

  // Cooldown status
  const cooldownRemainingSec = Math.max(
    0,
    Math.floor((store.adventureCooldownUntil - nowMs) / 1000)
  );
  const isOnCooldown = cooldownRemainingSec > 0;

  const formatCooldown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Squad attendance
  const legitSquadCount =
    (store.todayWorkoutStatus === 'legit_rest' ? 1 : 0) +
    store.squadMembers.filter((m) => m.hasWorkedOutToday && !m.isSuspectedCheater).length;
  const totalSquadSize = 1 + store.squadMembers.length;
  const isFullAttendance = legitSquadCount === totalSquadSize;
  const missingMember = store.squadMembers.find((m) => !m.hasWorkedOutToday);

  const handleManualStrike = () => {
    if (store.todayWorkoutStatus === 'none') {
      store.setActiveTab('workout');
      store.showToast('🏋️ 請先完成今日運動並跑完組間休息，即可回來與隊友一起消磨 Boss 血量！');
      return;
    }
    if (isOnCooldown) return;

    // Capture the Boss & Stage before the strike in case this strike is the Final Blow
    const stageBeforeStrike = store.squadStage;
    const bossBeforeStrike =
      ADVENTURE_BOSS_CATALOG[(stageBeforeStrike - 1) % ADVENTURE_BOSS_CATALOG.length];

    setIsAvatarLunging(true);
    setTimeout(() => {
      const res = store.attackAdventureBoss('squad');
      setIsAvatarLunging(false);
      if (res) {
        setIsBossHit(true);
        setFloatingHit({
          damage: res.damage,
          isCrit: res.isCrit,
          label: res.attackTypeLabel,
          droppedLootName: res.droppedLootName,
          isCheatPenalty: res.isCheatPenalty,
        });
        setTimeout(() => setIsBossHit(false), 500);
        setTimeout(() => setFloatingHit(null), 2200);

        // 1. When this player delivers the FINAL BLOW that defeats the Boss:
        //    Pop up the pre-composed Boss Victory Share Modal!
        // 2. Or when this player triggers the rare (~18%) Hidden Loot Drop:
        //    Pop up the pre-composed Rare Loot Drop Share Modal!
        if (res.defeated) {
          setTimeout(() => {
            setFinalBlowReport({
              clearedStage: stageBeforeStrike,
              boss: bossBeforeStrike,
              finalBlowDamage: res.damage,
              attackTypeLabel: res.attackTypeLabel,
              droppedLootName:
                res.droppedLootName ||
                `${bossBeforeStrike.hiddenLoot.emoji} ${bossBeforeStrike.hiddenLoot.nameZh}`,
            });
          }, 450);
        } else if (res.droppedLootName) {
          setTimeout(() => {
            setLootDropReport({
              stage: stageBeforeStrike,
              boss: bossBeforeStrike,
              strikeDamage: res.damage,
            });
          }, 450);
        }
      }
    }, 220);
  };

  const handleNudge = (memberId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShakingMemberId(memberId);
    store.nudgeSquadMember(memberId);
    setTimeout(() => setShakingMemberId(null), 600);
  };

  // Render the fixed, pre-composed Final-Blow Boss Victory Poster whenever finalBlowReport is present
  useEffect(() => {
    if (!finalBlowReport) return;
    const canvas = killPosterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 720;
    const H = 960;
    canvas.width = W;
    canvas.height = H;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Dark Golden-Crimson Raid Colosseum Background
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.34, 30, W * 0.5, H * 0.42, W * 0.85);
    bgGrad.addColorStop(0, '#451a03');
    bgGrad.addColorStop(0.45, '#1e1b4b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Victory Sunburst Rays
    ctx.save();
    ctx.translate(W * 0.5, H * 0.34);
    for (let i = 0; i < 18; i++) {
      ctx.rotate((Math.PI * 2) / 18);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(244, 63, 94, 0.04)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-38, -W);
      ctx.lineTo(38, -W);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Outer Gold Arcade Frame
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // 2. Top Header: FINAL BLOW · BOSS CLEARED
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(44, 42, W - 88, 86, 18);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 18px "Barlow Condensed", "Noto Sans TC", sans-serif';
    ctx.fillText(`⚡ FINAL BLOW · 戰隊討伐最後一擊捷報 ⚡`, W / 2, 74);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px "Noto Sans TC", sans-serif';
    ctx.fillText(
      `STAGE ${finalBlowReport.clearedStage} 【${finalBlowReport.boss.nameZh}】討伐成功！`,
      W / 2,
      110
    );

    // 3. Arena Floor & Visual Showdown (Defeated Boss on Left + Final-Blow Hero Avatar on Right)
    const floorY = 500;
    const floorGrad = ctx.createLinearGradient(22, floorY, 22, H - 22);
    floorGrad.addColorStop(0, '#1e293b');
    floorGrad.addColorStop(0.2, '#0f172a');
    floorGrad.addColorStop(1, '#020617');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(22, floorY, W - 44, H - floorY - 22);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, floorY);
    ctx.lineTo(W - 22, floorY);
    ctx.stroke();

    // Left: Defeated Boss Medallion + Slanted "最後一擊斬殺" Stamp
    const bossX = 220;
    const bossY = 320;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(bossX, bossY, 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = '106px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(finalBlowReport.boss.emoji, bossX, bossY);

    // Slanted Stamp
    ctx.translate(bossX, bossY + 54);
    ctx.rotate(-0.14);
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.roundRect(-110, -22, 220, 44, 10);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px "Barlow Condensed", "Noto Sans TC", sans-serif';
    ctx.fillText('💥 DEFEATED 擊破', 0, 2);
    ctx.restore();

    // Right: Final-Blow Player's Chibi Avatar on Victory Podium
    const heroX = 505;
    const heroY = 445;
    ctx.save();
    ctx.translate(heroX, heroY);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 62, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    const avatarScale = 3.7;
    ctx.scale(avatarScale, avatarScale);
    drawMapleChibiAvatar(ctx, {
      x: -28,
      y: -60,
      bodyStage: store.bodyStage,
      equipped: store.equipped,
      state: 'CHEER',
      expressionOverride: 'smile',
      facingRight: false,
      frameTick: 10,
    });
    ctx.restore();

    // Final-Blow Badge under Hero
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.beginPath();
    ctx.roundRect(heroX - 135, 458, 270, 36, 10);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#022c22';
    ctx.font = '900 17px "Noto Sans TC", sans-serif';
    ctx.fillText(`👑 最後一擊終結者：${store.nickname}`, heroX, 481);
    ctx.restore();

    // 4. Lower Section: Final Blow Damage + Shared Squad Co-op Contribution Card
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(44, 526, W - 88, 134, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = '800 16px "Noto Sans TC", sans-serif';
    ctx.fillText(`⚔️ 致勝絕招：${finalBlowReport.attackTypeLabel}`, 68, 560);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 44px "Barlow Condensed", monospace';
    ctx.fillText(`-${finalBlowReport.finalBlowDamage.toLocaleString()} HP (最後一擊)`, 68, 608);

    ctx.fillStyle = '#fde047';
    ctx.font = '800 17px "Noto Sans TC", sans-serif';
    ctx.fillText(
      `🎁 戰利品掉落：${finalBlowReport.droppedLootName}   ·   賞金 +${finalBlowReport.boss.rewardCoins} 🪙`,
      68,
      642
    );

    // Squad Co-op Contribution Box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(44, 678, W - 88, 190, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 18px "Noto Sans TC", sans-serif';
    ctx.fillText(`🛡️ ${store.squadName} · 全隊共同消磨血量紀錄`, 68, 712);

    const allPartyRows = [
      {
        name: `${store.nickname} (最後一擊 👑)`,
        dmg: `${finalBlowReport.finalBlowDamage.toLocaleString()} HP`,
        highlight: true,
      },
      ...store.squadMembers.map((m) => ({
        name: m.nameZh,
        dmg: m.hasWorkedOutToday ? `${m.damageDealt.toLocaleString()} HP` : '未出勤 (0 HP)',
        highlight: false,
      })),
    ];

    allPartyRows.slice(0, 4).forEach((row, idx) => {
      const y = 748 + idx * 30;
      ctx.fillStyle = row.highlight ? '#34d399' : '#cbd5e1';
      ctx.font = row.highlight
        ? '900 16px "Noto Sans TC", sans-serif'
        : '700 15px "Noto Sans TC", sans-serif';
      ctx.fillText(`${idx + 1}. ${row.name}`, 68, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = row.highlight ? '#fbbf24' : '#f8fafc';
      ctx.font = '900 17px "Barlow Condensed", monospace';
      ctx.fillText(row.dmg, W - 68, y);
      ctx.textAlign = 'left';
    });

    // 5. Bottom Official Brand Watermark
    const todayStr = new Date().toLocaleDateString('zh-TW');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 16px "Barlow Condensed", "Noto Sans TC", sans-serif';
    ctx.fillText(
      `⚡ ${BRAND_CONFIG.appName} Official Raid Certificate · Lv.${store.level} ${store.nickname} · ${todayStr}`,
      W / 2,
      H - 42
    );

    ctx.restore();
  }, [finalBlowReport, store.bodyStage, store.equipped, store.level, store.nickname, store.squadMembers, store.squadName]);

  const handleDownloadKillPoster = () => {
    const canvas = killPosterCanvasRef.current;
    if (!canvas || !finalBlowReport) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `fitmon-boss-clear-stage-${finalBlowReport.clearedStage}.png`;
    link.href = dataUrl;
    link.click();
    store.showToast('💾 已儲存 Boss 最後一擊討伐戰報圖！');
  };

  const handleShareKillPoster = async () => {
    const canvas = killPosterCanvasRef.current;
    if (!canvas || !finalBlowReport) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob && typeof navigator !== 'undefined' && navigator.share) {
        const file = new File(
          [blob],
          `fitmon-boss-clear-stage-${finalBlowReport.clearedStage}.png`,
          { type: 'image/png' }
        );
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `FitMon 討伐捷報：我給出了 Stage ${finalBlowReport.clearedStage} Boss 最後一擊！`,
            files: [file],
          });
          store.showToast('📲 已開啟系統分享選單！');
          return;
        }
      }
    } catch {
      // fallback to download
    }
    handleDownloadKillPoster();
  };

  // Render the fixed, pre-composed SSR Rare Loot Drop Poster whenever lootDropReport is present
  useEffect(() => {
    if (!lootDropReport) return;
    const canvas = lootPosterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 720;
    const H = 960;
    canvas.width = W;
    canvas.height = H;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Royal Purple & Gold SSR Treasure Background
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.34, 30, W * 0.5, H * 0.42, W * 0.85);
    bgGrad.addColorStop(0, '#581c87');
    bgGrad.addColorStop(0.45, '#1e1b4b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Golden SSR Sunburst Rays
    ctx.save();
    ctx.translate(W * 0.5, H * 0.35);
    for (let i = 0; i < 20; i++) {
      ctx.rotate((Math.PI * 2) / 20);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.11)' : 'rgba(192, 132, 252, 0.05)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-34, -W);
      ctx.lineTo(34, -W);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Outer Gold & Purple Frame
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // 2. Top Header: SSR RARE LOOT DROP
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(44, 42, W - 88, 86, 18);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 18px "Barlow Condensed", "Noto Sans TC", sans-serif';
    ctx.fillText(`✨ SSR RARE LOOT DROP · 歐皇稀有噴裝捷報 ✨`, W / 2, 74);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 26px "Noto Sans TC", sans-serif';
    ctx.fillText(
      `恭喜打落隱藏神裝【${lootDropReport.boss.hiddenLoot.nameZh}】！`,
      W / 2,
      110
    );

    // 3. Treasure Stage Floor & Showcase (Giant SSR Item Pedestal on Left + Lucky Hero Avatar on Right)
    const floorY = 500;
    const floorGrad = ctx.createLinearGradient(22, floorY, 22, H - 22);
    floorGrad.addColorStop(0, '#311042');
    floorGrad.addColorStop(0.25, '#0f172a');
    floorGrad.addColorStop(1, '#020617');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(22, floorY, W - 44, H - floorY - 22);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, floorY);
    ctx.lineTo(W - 22, floorY);
    ctx.stroke();

    // Left: Glowing SSR Treasure Circle
    const itemX = 225;
    const itemY = 320;
    ctx.save();
    ctx.fillStyle = 'rgba(88, 28, 135, 0.65)';
    ctx.beginPath();
    ctx.arc(itemX, itemY, 102, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = '112px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lootDropReport.boss.hiddenLoot.emoji, itemX, itemY - 4);

    // Slanted SSR Stamp
    ctx.translate(itemX, itemY + 62);
    ctx.rotate(-0.1);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-115, -21, 230, 42, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#090d16';
    ctx.font = '900 20px "Barlow Condensed", "Noto Sans TC", sans-serif';
    ctx.fillText('★ SSR 稀有掉率 18% ★', 0, 2);
    ctx.restore();

    // Right: Lucky Player's Chibi Avatar Cheering
    const heroX = 505;
    const heroY = 445;
    ctx.save();
    ctx.translate(heroX, heroY);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 62, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    const avatarScale = 3.7;
    ctx.scale(avatarScale, avatarScale);
    drawMapleChibiAvatar(ctx, {
      x: -28,
      y: -60,
      bodyStage: store.bodyStage,
      equipped: store.equipped,
      state: 'CHEER',
      expressionOverride: 'smile',
      facingRight: false,
      frameTick: 10,
    });
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
    ctx.beginPath();
    ctx.roundRect(heroX - 135, 458, 270, 36, 10);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#090d16';
    ctx.font = '900 17px "Noto Sans TC", sans-serif';
    ctx.fillText(`🎉 歐皇得主：${store.nickname}`, heroX, 481);
    ctx.restore();

    // 4. Lower Section: Item Attribute Card + Lucky Drop Quote
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(44, 530, W - 88, 175, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = '900 16px "Noto Sans TC", sans-serif';
    ctx.fillText(
      `👾 掉落出處：STAGE ${lootDropReport.stage} 【${lootDropReport.boss.nameZh}】`,
      68,
      568
    );

    ctx.fillStyle = '#fde047';
    ctx.font = '900 34px "Noto Sans TC", sans-serif';
    ctx.fillText(
      `${lootDropReport.boss.hiddenLoot.emoji} ${lootDropReport.boss.hiddenLoot.nameZh}`,
      68,
      618
    );

    ctx.fillStyle = '#34d399';
    ctx.font = '900 22px "Noto Sans TC", sans-serif';
    ctx.fillText(`⚡ 裝備加成：${lootDropReport.boss.hiddenLoot.statDescZh}`, 68, 660);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 15px "Noto Sans TC", sans-serif';
    ctx.fillText(
      `（平均需全隊揮拳討伐 5～6 次才會爆出 1 件，非人人皆可入手！）`,
      68,
      690
    );

    // Bragging Banner
    ctx.fillStyle = 'rgba(88, 28, 135, 0.45)';
    ctx.beginPath();
    ctx.roundRect(44, 725, W - 88, 132, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 22px "Noto Sans TC", sans-serif';
    ctx.fillText('「誰說運動不會噴寶？今天組間休息練滿直接掉神裝！」', W / 2, 778);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 17px "Noto Sans TC", sans-serif';
    ctx.fillText(`🛡️ 所屬戰隊：${store.squadName}`, W / 2, 822);

    // 5. Bottom Official Brand Watermark
    const todayStr = new Date().toLocaleDateString('zh-TW');
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 16px "Barlow Condensed", "Noto Sans TC", sans-serif';
    ctx.fillText(
      `⚡ ${BRAND_CONFIG.appName} Official Rare Loot Certificate · Lv.${store.level} ${store.nickname} · ${todayStr}`,
      W / 2,
      H - 42
    );

    ctx.restore();
  }, [lootDropReport, store.bodyStage, store.equipped, store.level, store.nickname, store.squadName]);

  const handleDownloadLootPoster = () => {
    const canvas = lootPosterCanvasRef.current;
    if (!canvas || !lootDropReport) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `fitmon-rare-loot-${lootDropReport.boss.hiddenLoot.id}.png`;
    link.href = dataUrl;
    link.click();
    store.showToast('💾 已儲存歐皇稀有噴裝炫耀圖！');
  };

  const handleShareLootPoster = async () => {
    const canvas = lootPosterCanvasRef.current;
    if (!canvas || !lootDropReport) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob && typeof navigator !== 'undefined' && navigator.share) {
        const file = new File(
          [blob],
          `fitmon-rare-loot-${lootDropReport.boss.hiddenLoot.id}.png`,
          { type: 'image/png' }
        );
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `FitMon 歐皇噴裝：我打到了隱藏神裝【${lootDropReport.boss.hiddenLoot.nameZh}】！`,
            files: [file],
          });
          store.showToast('📲 已開啟系統分享選單！');
          return;
        }
      }
    } catch {
      // fallback to download
    }
    handleDownloadLootPoster();
  };

  // Sync inspectedMember with latest store state
  const liveInspectedMember = inspectedMember
    ? store.squadMembers.find((m) => m.id === inspectedMember.id) || null
    : null;

  return (
    <div className="p-3 space-y-2.5 pb-10 relative">
      {/* 1. COMPACT GAME HUD TOP BAR: 3 RPG VIEW PILLS + LOOT BAG + DEV CHEAT BUTTON */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div
          role="tablist"
          aria-label="冒險模式切換"
          className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800"
        >
          {(
            [
              { id: 'raid', label: '共同戰場', icon: Swords },
              {
                id: 'squad_invite',
                label: `我的隊伍(${1 + store.squadMembers.length}/4)`,
                icon: Users,
              },
              { id: 'ladder', label: '天梯', icon: Trophy },
            ] as const
          ).map((tab) => {
            const TabIcon = tab.icon;
            const active = mainSubTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setMainSubTab(tab.id)}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-black transition whitespace-nowrap flex items-center gap-1 ${
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLootBagOpen(true)}
            title="查看掉落寶物袋"
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-[11px] font-black text-amber-300 flex items-center gap-1"
          >
            <Gift className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>寶物</span>
            <span className="font-mono">{store.collectedBossLoots.length}</span>
          </button>

          <button
            onClick={() => setDevCheatOpen((v) => !v)}
            className="px-2 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-black flex items-center gap-1 active:scale-95 transition"
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>外掛</span>
          </button>
        </div>
      </div>

      {/* FLOATING DEV CHEAT POPOVER (Hidden until 🛠️ 外掛 is tapped) */}
      {devCheatOpen && (
        <div className="p-3 rounded-2xl bg-slate-950/95 backdrop-blur-md border-2 border-cyan-400 shadow-2xl space-y-2.5 z-40">
          <div className="flex items-center justify-between text-xs font-black text-cyan-300">
            <span>🛠️ MVP 驗收測試外掛（運動判定 / 最後一擊斬殺測試）</span>
            <button
              onClick={() => setDevCheatOpen(false)}
              className="p-1 rounded-lg bg-slate-800 text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                {
                  id: 'legit_rest',
                  label: '✅ 完整休息',
                  sub: '100%威力+掉寶',
                  cls: 'border-emerald-400 bg-emerald-950/60 text-emerald-300',
                },
                {
                  id: 'cheated_fast',
                  label: '🤥 3秒作弊',
                  sub: '-95%刮痧懲罰',
                  cls: 'border-rose-400 bg-rose-950/60 text-rose-300',
                },
                {
                  id: 'none',
                  label: '🔒 尚未運動',
                  sub: '鎖定出拳',
                  cls: 'border-slate-500 bg-slate-800 text-slate-200',
                },
              ] as { id: TodayWorkoutStatus; label: string; sub: string; cls: string }[]
            ).map((st) => {
              const active = store.todayWorkoutStatus === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => store.setTodayWorkoutStatus(st.id)}
                  className={`p-1.5 rounded-xl border text-center transition ${
                    active
                      ? st.cls + ' ring-1 ring-white/40 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-black">{st.label}</div>
                  <div className="text-[9px] opacity-80">{st.sub}</div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 border-t border-slate-800 grid grid-cols-1 gap-1.5">
            <button
              onClick={() => {
                store.setDevForceNextLootDrop();
                setDevCheatOpen(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow"
            >
              <Gift className="w-4 h-4 stroke-[2.5px]" />
              <span>🎁 下一拳 100% 必噴隱藏神裝（測試 18% 歐皇噴裝分享）</span>
            </button>

            <button
              onClick={() => {
                store.setDevBossHpToLow();
                setDevCheatOpen(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow"
            >
              <Flame className="w-4 h-4 stroke-[2.5px]" />
              <span>⚡ 將 Boss 設為殘血 10 HP（揮拳即觸發「最後一擊」戰報分享）</span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: ⚔️ SHARED SQUAD BOSS ARENA + HUD COMMAND DECK              */}
      {/* ================================================================= */}
      {mainSubTab === 'raid' && (
        <div className="space-y-2.5">
          {/* 1. IMMERSIVE DARK RPG BATTLE STAGE VIEWPORT */}
          <div className="game-stage-dark rounded-3xl border-2 border-slate-700/90 shadow-2xl overflow-hidden relative p-3.5 space-y-3">
            {/* Ambient Dungeon Grid & Glow */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 75% 30%, rgba(244,63,94,0.35), transparent 55%), radial-gradient(circle at 25% 45%, rgba(16,185,129,0.25), transparent 50%)',
              }}
            />

            {/* Top HUD Row: Unified Squad Progress Pill + Boss Weakness & Loot Pill */}
            <div className="relative z-10 flex items-center justify-between gap-1.5 flex-wrap">
              <div className="px-2.5 py-1 rounded-xl bg-black/60 border border-emerald-400/40 text-[11px] font-black text-emerald-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>全隊同步進度 · STAGE {currentStage}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="px-2 py-1 rounded-lg bg-black/60 border border-amber-400/50 text-[10px] font-black text-amber-300">
                  弱點:{bossTemplate.weakness === 'phy' ? '🥊物攻' : bossTemplate.weakness === 'mag' ? '🪄魔攻' : '⚡全能'}
                </span>
                <button
                  onClick={() => setLootBagOpen(true)}
                  className="px-2 py-1 rounded-lg bg-black/60 border border-purple-400/50 text-[10px] font-black text-amber-300 flex items-center gap-1"
                >
                  <span>{bossTemplate.hiddenLoot.emoji}</span>
                  <span>{isLootCollected ? '已掉寶' : '可噴裝'}</span>
                </button>
              </div>
            </div>

            {/* Boss Name Banner + Shared Squad HP Bar */}
            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black shrink-0">
                    STAGE {currentStage}
                  </span>
                  <h3 className="text-sm font-black text-white break-words">
                    {bossTemplate.nameZh}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-black text-amber-300 shrink-0">
                  賞金 +{bossTemplate.rewardCoins}🪙
                </span>
              </div>

              <div className="relative h-6 w-full rounded-full bg-black/80 border-2 border-rose-500/60 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${hpPercent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-black text-white drop-shadow">
                  ❤️ 全隊共同消磨血量：{currentHp.toLocaleString()} / {maxHp.toLocaleString()} HP ({hpPercent}%)
                </div>
              </div>

              {store.activeTeamComboBuff === 'armor_break' && (
                <div className="px-2.5 py-1 rounded-lg bg-cyan-950/90 border border-cyan-400/60 text-center text-[10px] font-black text-cyan-200">
                  🔨 隊友阿凱已破甲！選【🔥 燃脂魔焰】出擊享 2.0 倍連攜引爆！
                </div>
              )}
            </div>

            {/* Visual Showdown Stage: Hero Paper-Doll vs Giant Boss */}
            <div className="relative z-10 h-44 flex items-center justify-between px-3 pt-2">
              {/* Left: Player Hero + Quick Gear Pill */}
              <div
                className={`flex flex-col items-center transition-transform duration-200 ${
                  isAvatarLunging ? 'translate-x-14 scale-110' : ''
                }`}
              >
                <div className="rounded-2xl border-2 border-emerald-400/60 bg-slate-900/90 p-1.5 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                  <AvatarPortraitCanvas
                    bodyStage={store.bodyStage}
                    equipped={store.equipped}
                    size={78}
                  />
                </div>
                <button
                  onClick={() => store.setWardrobeModalOpen(true)}
                  className="mt-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-[10px] font-black text-white flex items-center gap-1 shadow"
                >
                  <Shirt className="w-3 h-3 text-cyan-300" />
                  <span>🥊{myPhyAtk} · 🪄{myMagAtk}</span>
                </button>
              </div>

              {/* Center: Floating Hit Numbers & Loot Drop Callout */}
              <div className="flex flex-col items-center justify-center z-20 pointer-events-none">
                {floatingHit ? (
                  <div className="animate-bounce text-center space-y-1">
                    <span className="px-2 py-0.5 rounded-full bg-black/90 border border-amber-400 text-[10px] font-black text-amber-300 block">
                      {floatingHit.label}
                    </span>
                    <div
                      className={`font-mono font-black ${
                        floatingHit.isCheatPenalty
                          ? 'text-base text-slate-400'
                          : floatingHit.isCrit
                          ? 'text-2xl text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.9)]'
                          : 'text-xl text-rose-400'
                      }`}
                    >
                      -{floatingHit.damage} HP!
                    </div>
                    {floatingHit.droppedLootName && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black block shadow-lg">
                        🎁 噴裝：{floatingHit.droppedLootName}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono font-black text-slate-400">
                    VS
                  </div>
                )}
              </div>

              {/* Right: Giant Animated Boss Sprite */}
              <div
                onClick={handleManualStrike}
                className={`cursor-pointer flex flex-col items-center transition-transform duration-150 ${
                  isBossHit ? 'translate-x-3 -translate-y-2 scale-90 brightness-150' : ''
                }`}
              >
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-rose-950/90 to-slate-900 border-2 border-rose-500/60 flex items-center justify-center text-6xl shadow-[0_0_30px_rgba(244,63,94,0.35)] relative">
                  <span>{bossTemplate.emoji}</span>
                  {isBossHit && (
                    <span className="absolute -top-2 -right-2 text-2xl animate-ping">💥</span>
                  )}
                </div>
                <span className="mt-1.5 px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/40 text-rose-200 text-[10px] font-black text-center leading-tight">
                  {bossTemplate.subtitleZh}
                </span>
              </div>
            </div>

            {/* Bottom of Stage: 4-Player Shared Squad Dock */}
            <div className="relative z-10 pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between px-0.5 gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black text-white break-words">
                    🛡️ {store.squadName}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      isFullAttendance
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    今日已出擊 {legitSquadCount}/{totalSquadSize} {isFullAttendance ? '⚡狂暴1.5x' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMainSubTab('squad_invite')}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-black text-[10px] flex items-center gap-1 hover:bg-cyan-500/30 transition"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>邀請朋友</span>
                  </button>
                  <button
                    onClick={() => store.setShareRaidModalOpen(true)}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>催促全隊</span>
                  </button>
                </div>
              </div>

              {/* 4-Slot Horizontal Squad Cards */}
              <div className="grid grid-cols-4 gap-1.5">
                {/* Slot 1: Captain / Me */}
                <div
                  className={`p-1.5 rounded-xl border text-center flex flex-col items-center justify-between ${
                    store.todayWorkoutStatus === 'legit_rest'
                      ? 'bg-emerald-950/60 border-emerald-400'
                      : store.todayWorkoutStatus === 'cheated_fast'
                      ? 'bg-rose-950/60 border-rose-400'
                      : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <div className="text-base">
                    {store.todayWorkoutStatus === 'legit_rest'
                      ? '🦸'
                      : store.todayWorkoutStatus === 'cheated_fast'
                      ? '🤥'
                      : '😴'}
                  </div>
                  <div className="text-[10px] font-black text-white break-words leading-tight w-full">
                    {store.nickname}
                  </div>
                  <span className="mt-1 px-1 py-0.5 rounded bg-black/50 text-[9px] font-black text-emerald-300 w-full leading-tight">
                    {store.todayWorkoutStatus === 'legit_rest'
                      ? '✅ 已充能'
                      : store.todayWorkoutStatus === 'cheated_fast'
                      ? '⚠️ 刮痧中'
                      : '🔒 未運動'}
                  </span>
                </div>

                {/* Slots 2~4: Joined Squad Friends or Captain Invite Slot */}
                {[0, 1, 2].map((slotIdx) => {
                  const member = store.squadMembers[slotIdx];
                  if (!member) {
                    return (
                      <button
                        key={`empty_slot_${slotIdx}`}
                        onClick={() => setMainSubTab('squad_invite')}
                        className="p-1.5 rounded-xl border border-dashed border-cyan-400/50 bg-slate-900/50 hover:bg-cyan-950/40 text-center flex flex-col items-center justify-center gap-1 transition min-h-[72px]"
                      >
                        <UserPlus className="w-4 h-4 text-cyan-400" />
                        <span className="text-[10px] font-black text-cyan-300 leading-tight">
                          ＋ 邀朋友入隊
                        </span>
                      </button>
                    );
                  }
                  const isShaking = shakingMemberId === member.id;
                  return (
                    <div
                      key={member.id}
                      onClick={() => setInspectedMember(member)}
                      className={`cursor-pointer p-1.5 rounded-xl border text-center flex flex-col items-center justify-between transition ${
                        isShaking ? 'animate-bounce border-rose-400 bg-rose-950/80' : ''
                      } ${
                        member.isSuspectedCheater
                          ? 'bg-amber-950/60 border-amber-400'
                          : member.hasWorkedOutToday
                          ? 'bg-emerald-950/50 border-emerald-500/50'
                          : 'bg-rose-950/40 border-rose-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="text-base">
                          {member.isSuspectedCheater
                            ? '🤥'
                            : member.hasWorkedOutToday
                            ? '💪'
                            : '💤'}
                        </span>
                        <span className="text-[9px] font-black text-slate-300">
                          {member.roleType === 'phy'
                            ? '🥊'
                            : member.roleType === 'mag'
                            ? '🪄'
                            : '🛡️'}
                        </span>
                      </div>

                      <div className="text-[10px] font-black text-white break-words leading-tight w-full">
                        {member.nameZh.split(' · ').pop()}
                      </div>

                      {member.isSuspectedCheater ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            store.reportCheatingMember(member.id);
                          }}
                          className="mt-1 w-full py-0.5 rounded bg-rose-600 text-white text-[9px] font-black shadow animate-pulse"
                        >
                          🚨 抓包
                        </button>
                      ) : !member.hasWorkedOutToday ? (
                        <button
                          onClick={(e) => handleNudge(member.id, e)}
                          className="mt-1 w-full py-0.5 rounded bg-rose-500 text-white text-[9px] font-black shadow"
                        >
                          🔨 敲他{member.nudgedCount > 0 ? `(${member.nudgedCount})` : ''}
                        </button>
                      ) : (
                        <span className="mt-1 px-1 py-0.5 rounded bg-black/50 text-[9px] font-black text-emerald-300 w-full leading-tight">
                          ✅ -{member.damageDealt}HP
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. TACTICAL COMMAND DECK: 3 COMPACT SKILL SLOTS + GIANT 3D STRIKE BUTTON */}
          <div className="retro-box rounded-2xl p-3 space-y-2.5">
            {/* 3 Sport Combo Skill Orbs */}
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  {
                    id: 'strength',
                    icon: '🔨',
                    skill: '破甲重擊',
                    sub: '重訓 · 掛破甲',
                  },
                  {
                    id: 'cardio',
                    icon: '🔥',
                    skill: '燃脂魔焰',
                    sub: '有氧 · 2x引爆',
                  },
                  {
                    id: 'bodyweight',
                    icon: '🌪️',
                    skill: '聚氣暴擊',
                    sub: '徒手 · 掉寶x2',
                  },
                ] as {
                  id: AdventureSportSkillType;
                  icon: string;
                  skill: string;
                  sub: string;
                }[]
              ).map((sp) => {
                const active = store.todaySportType === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => store.setTodaySportType(sp.id)}
                    className={`p-2 rounded-xl border text-center transition ${
                      active
                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow ring-1 ring-cyan-400/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
                      <span>{sp.icon}</span>
                      <span>{sp.skill}</span>
                    </div>
                    <div className="text-[10px] text-cyan-300 font-bold mt-0.5">{sp.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Giant 3D Strike CTA or Cooldown Bar (No on-demand Boss report button here!) */}
            {store.todayWorkoutStatus === 'none' ? (
              <button
                onClick={handleManualStrike}
                className="w-full retro-btn py-3.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Lock className="w-4 h-4" />
                <span>🔒 先去【運動】完成組間休息充能 ➔</span>
              </button>
            ) : !isOnCooldown ? (
              <button
                onClick={handleManualStrike}
                className={`w-full retro-btn py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl ${
                  store.todayWorkoutStatus === 'cheated_fast'
                    ? 'bg-rose-600 text-white'
                    : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950'
                }`}
              >
                <Swords className="w-5 h-5 stroke-[2.5px]" />
                <span>
                  {store.todayWorkoutStatus === 'cheated_fast'
                    ? '🤥 心虛出擊（未休息懲罰刮痧 -15 HP）'
                    : `⚔️ 施放【${
                        store.todaySportType === 'strength'
                          ? '破甲重擊'
                          : store.todaySportType === 'cardio'
                          ? '燃脂魔焰'
                          : '聚氣暴擊'
                      }】與隊友消磨 Boss 血量！`}
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>今日已出拳消磨血量 · 下次冷卻：</span>
                  </span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {formatCooldown(cooldownRemainingSec)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => store.resetAdventureCooldown('ticket')}
                    className="retro-btn py-2.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>討伐券重置 ({store.raidTickets})</span>
                  </button>
                  <button
                    onClick={() => store.resetAdventureCooldown('iap')}
                    className="retro-btn py-2.5 px-3 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center gap-1.5"
                  >
                    <Gem className="w-3.5 h-3.5" />
                    <span>NT$30 秒解冷卻</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1.5: 🛡️ 我的隊伍（隊長邀請制 · 固定隊友共同消磨同一隻怪）          */}
      {/* ================================================================= */}
      {mainSubTab === 'squad_invite' && (
        <div className="space-y-3">
          {/* 1. CAPTAIN INVITE & SHARED PROGRESS EXPLANATION */}
          <div className="retro-box rounded-2xl p-3.5 space-y-3 border-2 border-cyan-500/40">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black">
                  🛡️ 隊長邀請制 · 全隊共享討伐進度
                </span>
                <h2 className="text-sm font-black text-white mt-1 break-words">
                  {store.squadName}（{1 + store.squadMembers.length}/4 人固定隊伍）
                </h2>
              </div>
              <button
                onClick={() => setMainSubTab('raid')}
                className="retro-btn px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>返回共同戰場</span>
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
              💡 <strong className="text-amber-300">共鬥規則：</strong>
              組隊由隊長發送邀請連結給現實朋友加入。同一隊伍裡所有人看到的
              <strong className="text-emerald-300">
                「當前關卡 (Stage {currentStage})」與「Boss 剩餘血量 ({currentHp.toLocaleString()} HP)」完全相同
              </strong>
              ，全隊每天運動打卡一起消磨同一隻怪的血量！
            </div>

            {/* Captain Rename Squad */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={squadNameInput}
                  onChange={(e) => setSquadNameInput(e.target.value)}
                  placeholder="隊長修改隊伍名稱..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>
              <button
                onClick={() => store.setSquadName(squadNameInput)}
                className="px-3 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shrink-0"
              >
                改隊名
              </button>
            </div>

            {/* Captain Invite Link / Code & Join Friend's Squad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">隊長專屬邀請碼</div>
                  <div className="text-xs font-mono font-black text-amber-300">FIT-8842</div>
                </div>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(
                        `🛡️ 隊長【${store.nickname}】邀請你加入 FitMon 固定戰隊【${store.squadName}】！我們正在共同討伐 Stage ${currentStage}【${bossTemplate.nameZh}】（剩餘 ${currentHp} HP），輸入邀請碼 FIT-8842 加入同隊一起消磨血量：https://yuchienw.github.io/Fitmon/`
                      );
                    }
                    store.showToast('📲 已複製隊長邀請連結與邀請碼 FIT-8842！傳給朋友即可入隊同打一隻王！');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-[11px] font-black flex items-center gap-1 shrink-0 shadow"
                >
                  <Copy className="w-3 h-3" />
                  <span>複製邀請給朋友</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="輸入朋友隊伍邀請碼"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white outline-none focus:border-emerald-400"
                />
                <button
                  onClick={() => {
                    if (!inviteCodeInput.trim()) {
                      store.showToast('⚠️ 請輸入朋友給你的隊伍邀請碼！');
                      return;
                    }
                    if (store.squadMembers.length >= 3) {
                      store.showToast('⚠️ 目前隊伍已滿 4 人！');
                      return;
                    }
                    const nextFriend =
                      SQUAD_CANDIDATE_POOL.find(
                        (c) => !store.squadMembers.some((m) => m.id === c.id)
                      ) || SQUAD_CANDIDATE_POOL[3];
                    store.recruitSquadMember(nextFriend);
                    setInviteCodeInput('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-black shrink-0"
                >
                  入隊
                </button>
              </div>
            </div>
          </div>

          {/* 2. SHARED SQUAD ROSTER & DAMAGE CONTRIBUTION ON CURRENT BOSS */}
          <div className="retro-box rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                同隊成員與本關削血進度（{1 + store.squadMembers.length}/4 人）
              </span>
              <span className="text-[11px] font-mono font-bold text-rose-300">
                目標：Stage {currentStage} {bossTemplate.nameZh}
              </span>
            </div>

            <div className="space-y-2">
              {/* Slot 1: Captain (Player) */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/50 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-emerald-400 flex items-center justify-center text-xl shrink-0">
                    🦸
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black">
                        隊長 · 你
                      </span>
                      <span className="text-xs font-black text-white break-words">
                        {store.nickname}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-bold">
                        🥊物攻 {myPhyAtk} / 🪄魔攻 {myMagAtk}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-300 font-bold break-words">
                      {store.todayWorkoutStatus === 'legit_rest'
                        ? '✅ 今日已完成運動充能（可對 Boss 揮拳削血）'
                        : store.todayWorkoutStatus === 'cheated_fast'
                        ? '🤥 今日疑似 3 秒快速打卡（傷害 -95% 刮痧懲罰中）'
                        : '🔒 今日尚未完成運動打卡'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Slots 2~4: Joined Friends */}
              {[0, 1, 2].map((slotIdx) => {
                const member = store.squadMembers[slotIdx];
                if (!member) {
                  return (
                    <div
                      key={`invite_empty_${slotIdx}`}
                      className="p-3.5 rounded-xl border-2 border-dashed border-cyan-500/40 bg-slate-900/50 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-dashed border-cyan-400/50 flex items-center justify-center text-cyan-400">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-cyan-300">
                            隊友空位 #{slotIdx + 2}（等待朋友接受邀請）
                          </div>
                          <div className="text-[11px] text-slate-400">
                            點擊上方【複製邀請給朋友】傳至 LINE 群組，朋友點連結即可加入同隊！
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={member.id}
                    onClick={() => setInspectedMember(member)}
                    className={`cursor-pointer p-3 rounded-xl border flex items-start justify-between gap-2.5 ${
                      member.isSuspectedCheater
                        ? 'bg-amber-950/30 border-amber-400/60'
                        : member.hasWorkedOutToday
                        ? 'bg-slate-900/90 border-slate-700'
                        : 'bg-rose-950/25 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-xl shrink-0 mt-0.5">
                        {member.isSuspectedCheater
                          ? '🤥'
                          : member.hasWorkedOutToday
                          ? '💪'
                          : '💤'}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white break-words">
                            {member.nameZh}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black">
                            {member.roleBadgeZh}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-300">
                            已消磨 -{member.damageDealt} HP
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 break-words">
                          👕 穿戴：{member.gearDescZh}
                        </div>
                        <div className="text-[11px] text-emerald-300 font-bold break-words">
                          {member.workoutAuditZh}
                        </div>
                      </div>
                    </div>

                    {!member.hasWorkedOutToday && (
                      <button
                        onClick={(e) => handleNudge(member.id, e)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500 text-white text-[11px] font-black shrink-0 shadow"
                      >
                        🔨 敲他
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: 🏆 榮譽天梯 (Squad Stage, Solo Stage, Max Damage)           */}
      {/* ================================================================= */}
      {mainSubTab === 'ladder' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: 'squad_stage', label: '🛡️ 戰隊推圖榜' },
                { id: 'solo_stage', label: '👤 個人關卡榜' },
                { id: 'max_damage', label: '💥 最高傷害榜' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setLadderCat(cat.id)}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-black transition ${
                  ladderCat === cat.id
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-400/50 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black text-amber-300 uppercase">
                我的當前天梯紀錄
              </div>
              <div className="text-sm font-black text-white mt-0.5">
                {ladderCat === 'squad_stage' &&
                  `${store.squadName}：共同推進至 Stage ${store.squadMaxStage}`}
                {ladderCat === 'solo_stage' &&
                  `個人最高闖關：Stage ${store.personalMaxStage}（連勝 ${store.streakDays} 天）`}
                {ladderCat === 'max_damage' &&
                  `單次最高爆發傷害：${store.personalMaxDamage.toLocaleString()} HP`}
              </div>
            </div>
            <Trophy className="w-7 h-7 text-amber-400 shrink-0" />
          </div>

          <div className="space-y-2">
            {ladderCat === 'solo_stage' &&
              [
                {
                  name: '健力泰坦 · 館長級巨巨',
                  title: '👑 連續打卡 45 天',
                  score: 'Stage 18',
                  badge: '🥊 物攻 180',
                  isMe: false,
                },
                {
                  name: '有氧女神 · 小愛',
                  title: '⚡ 連續打卡 21 天',
                  score: 'Stage 11',
                  badge: '🪄 魔攻 145',
                  isMe: false,
                },
                {
                  name: '重訓狂人 · 阿凱',
                  title: '🔥 連續打卡 14 天',
                  score: 'Stage 8',
                  badge: '🥊 物攻 130',
                  isMe: false,
                },
                {
                  name: `${store.nickname} (我)`,
                  title: `🔥 連續打卡 ${store.streakDays} 天`,
                  score: `Stage ${store.personalMaxStage}`,
                  badge: `🥊 ${myPhyAtk} / 🪄 ${myMagAtk}`,
                  isMe: true,
                },
                {
                  name: '街頭健體 · Leo',
                  title: '🤥 作弊被抓包懲處中',
                  score: 'Stage 1',
                  badge: '🥊 物攻 45',
                  isMe: false,
                },
              ]
                .sort((a, b) => {
                  const sA = parseInt(a.score.replace('Stage ', ''), 10);
                  const sB = parseInt(b.score.replace('Stage ', ''), 10);
                  return sB - sA;
                })
                .map((row, idx) => (
                  <div
                    key={row.name}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                      row.isMe
                        ? 'bg-emerald-950/40 border-emerald-400'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>{row.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-cyan-300">
                            {row.badge}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{row.title}</div>
                      </div>
                    </div>
                    <div className="text-sm font-mono font-black text-amber-400">{row.score}</div>
                  </div>
                ))}

            {ladderCat === 'squad_stage' &&
              [
                {
                  name: '👑 晨間六點半修羅團 (4人)',
                  sub: '組間休息全勤率 100% · 物魔雙修',
                  score: 'Stage 24',
                  isMe: false,
                },
                {
                  name: '⚡ 乳清狂飲者聯盟 (3人)',
                  sub: '組間休息全勤率 95% · 暴擊特化',
                  score: 'Stage 15',
                  isMe: false,
                },
                {
                  name: `${store.squadName} (${totalSquadSize}人 · 我的戰隊)`,
                  sub: `真實出勤 ${legitSquadCount}/${totalSquadSize} · 全隊同步削血中`,
                  score: `Stage ${store.squadMaxStage}`,
                  isMe: true,
                },
                {
                  name: '🌱 下班順便動一下 (2人)',
                  sub: '組間休息全勤率 75%',
                  score: 'Stage 2',
                  isMe: false,
                },
              ]
                .sort((a, b) => {
                  const sA = parseInt(a.score.replace('Stage ', ''), 10);
                  const sB = parseInt(b.score.replace('Stage ', ''), 10);
                  return sB - sA;
                })
                .map((row, idx) => (
                  <div
                    key={row.name}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                      row.isMe
                        ? 'bg-amber-950/40 border-amber-400'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : 'bg-amber-700 text-white'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white">{row.name}</div>
                        <div className="text-[10px] text-slate-400">{row.sub}</div>
                      </div>
                    </div>
                    <div className="text-sm font-mono font-black text-emerald-400">
                      {row.score}
                    </div>
                  </div>
                ))}

            {ladderCat === 'max_damage' &&
              [
                {
                  name: '健力泰坦 · 館長級巨巨',
                  sub: '破甲＋燃脂魔焰連攜引爆',
                  dmg: 2450,
                  isMe: false,
                },
                {
                  name: '重訓狂人 · 阿凱',
                  sub: '紅黑健力服 + 破甲重擊',
                  dmg: 1420,
                  isMe: false,
                },
                {
                  name: `${store.nickname} (我)`,
                  sub: '真實組間計時 + 連攜技能爆發',
                  dmg: store.personalMaxDamage,
                  isMe: true,
                },
                {
                  name: '街頭健體 · Leo',
                  sub: '🤥 3秒亂按作弊刮痧懲罰',
                  dmg: 15,
                  isMe: false,
                },
              ]
                .sort((a, b) => b.dmg - a.dmg)
                .map((row, idx) => (
                  <div
                    key={row.name}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                      row.isMe
                        ? 'bg-cyan-950/40 border-cyan-400'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-300 flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-black text-white">{row.name}</div>
                        <div className="text-[10px] text-slate-400">{row.sub}</div>
                      </div>
                    </div>
                    <div className="text-sm font-mono font-black text-rose-400">
                      {row.dmg.toLocaleString()} HP
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL A: TEAMMATE AUDIT & URGE SHEET (點隊友頭像彈出詳情與督促)     */}
      {/* ================================================================= */}
      {liveInspectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="retro-box w-full max-w-sm rounded-2xl p-4 space-y-3 border-2 border-amber-400 relative">
            <button
              onClick={() => setInspectedMember(null)}
              className="absolute top-3 right-3 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl">
                {liveInspectedMember.isSuspectedCheater
                  ? '🤥'
                  : liveInspectedMember.hasWorkedOutToday
                  ? '💪'
                  : '🛋️'}
              </div>
              <div>
                <div className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>{liveInspectedMember.nameZh}</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">
                    {liveInspectedMember.roleBadgeZh}
                  </span>
                </div>
                <div className="text-xs font-bold text-amber-300 mt-0.5">
                  本關共同削血貢獻：-{liveInspectedMember.damageDealt} HP
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[10px] font-black text-slate-400">
                🔍 組間休息計時器驗證紀錄：
              </div>
              <div className="text-xs font-bold text-white">
                {liveInspectedMember.workoutAuditZh}
              </div>
              {liveInspectedMember.comboSkillAppliedZh && (
                <div className="text-[11px] font-black text-cyan-300 pt-1">
                  {liveInspectedMember.comboSkillAppliedZh}
                </div>
              )}
            </div>

            {liveInspectedMember.isSuspectedCheater && (
              <button
                onClick={() => {
                  store.reportCheatingMember(liveInspectedMember.id);
                }}
                className="w-full retro-btn py-2.5 px-3 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>🚨 抓包作弊（沒收刮痧傷害 · 罰他重練）</span>
              </button>
            )}

            {!liveInspectedMember.hasWorkedOutToday && (
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleNudge(liveInspectedMember.id)}
                  className="py-2 px-2 rounded-xl bg-rose-500 text-white text-[11px] font-black flex items-center justify-center gap-1 shadow"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>敲他 ({liveInspectedMember.nudgedCount})</span>
                </button>
                <button
                  onClick={() => {
                    setInspectedMember(null);
                    store.setShareRaidModalOpen(true);
                  }}
                  className="py-2 px-2 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-black flex items-center justify-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>討伐令</span>
                </button>
                <button
                  onClick={() => store.simulateFriendWorkoutJoin(liveInspectedMember.id)}
                  className="py-2 px-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[11px] font-black flex items-center justify-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>模擬運動</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL B: BOSS HIDDEN LOOT COLLECTION BAG (隱藏神裝收藏袋)          */}
      {/* ================================================================= */}
      {lootBagOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="retro-box w-full max-w-sm rounded-2xl p-4 space-y-3 border-2 border-amber-400 relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                <Gift className="w-4 h-4" />
                Boss 隱藏神裝圖鑑 ({store.collectedBossLoots.length}/{ADVENTURE_BOSS_CATALOG.length})
              </span>
              <button
                onClick={() => setLootBagOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {ADVENTURE_BOSS_CATALOG.map((b, idx) => {
                const owned = store.collectedBossLoots.includes(b.hiddenLoot.id);
                return (
                  <div
                    key={b.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      owned
                        ? 'bg-amber-950/30 border-amber-400'
                        : 'bg-slate-900/80 border-slate-800 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{b.hiddenLoot.emoji}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white break-words">
                          {b.hiddenLoot.nameZh}
                        </div>
                        <div className="text-[10px] text-amber-300 font-bold break-words">
                          {b.hiddenLoot.statDescZh} · 出處：{b.nameZh} (掉率 18%)
                        </div>
                      </div>
                    </div>
                    {owned ? (
                      <button
                        onClick={() => {
                          setLootBagOpen(false);
                          setLootDropReport({
                            stage: idx + 1,
                            boss: b,
                            strikeDamage: store.personalMaxDamage || 680,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black shrink-0 flex items-center gap-1 shadow"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>曬裝分享</span>
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black shrink-0 bg-slate-800 text-slate-400">
                        未掉落
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL C: LINE / IG 8-BIT 緊急討伐召集令 MODAL                      */}
      {/* ================================================================= */}
      {store.shareRaidModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="retro-box w-full max-w-sm rounded-2xl p-4 bg-slate-950 border-2 border-amber-400 space-y-3 relative">
            <button
              onClick={() => store.setShareRaidModalOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-black">
                🚨 戰隊緊急討伐召集令
              </span>
              <h3 className="text-base font-black text-white mt-1.5">
                #拯救全隊就差你一個！
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/50 border-2 border-rose-500/50 text-center space-y-2">
              <div className="text-5xl">{bossTemplate.emoji}</div>
              <div className="text-sm font-black text-white">
                STAGE {store.squadStage} · {bossTemplate.nameZh}
              </div>
              <div className="text-xs font-mono font-black text-rose-400">
                全隊同步殘餘血量：{currentHp.toLocaleString()} / {maxHp.toLocaleString()} HP
              </div>
              <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-amber-300 font-bold leading-relaxed">
                {missingMember
                  ? `「全隊出勤 ${legitSquadCount}/${totalSquadSize}！@${missingMember.nameZh} 快去運動跑組間休息，一起消磨【${bossTemplate.nameZh}】的血量！」`
                  : `「全隊全員狂暴啟動中！快上線給 ${bossTemplate.nameZh} 最後一擊！」`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const shareText = `🚨【FitMon 戰隊緊急討伐令】\n我們固定隊伍正在共同討伐 Stage ${store.squadStage}【${bossTemplate.nameZh}】（剩餘 ${currentHp} HP），有機會掉落隱藏神裝【${bossTemplate.hiddenLoot.nameZh}】！\n#拯救全隊就差你 快去運動打卡：\nhttps://yuchienw.github.io/Fitmon/`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareText);
                  }
                  store.showToast('📲 已複製 LINE 討伐召集令文字與連結！快貼給隊友！');
                  store.setShareRaidModalOpen(false);
                }}
                className="retro-btn py-2.5 px-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>複製傳送 LINE</span>
              </button>

              <button
                onClick={() => {
                  store.showToast('📸 已儲存 8-Bit 討伐召集卡，可發佈至 IG 限動！');
                  store.setShareRaidModalOpen(false);
                }}
                className="retro-btn py-2.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>分享 IG 限動</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL D: 🏆 FINAL-BLOW BOSS VICTORY SHARE PROMPT                  */}
      {/* (ONLY pops up when player delivers the killing blow to the Boss!  */}
      {/*  Renders a single pre-composed poster image — NOT MemeStudio!)     */}
      {/* ================================================================= */}
      {finalBlowReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
          <div className="retro-box w-full max-w-sm rounded-2xl p-4 bg-slate-950 border-2 border-amber-400 space-y-3 relative max-h-[94vh] overflow-y-auto">
            <button
              onClick={() => setFinalBlowReport(null)}
              aria-label="關閉最後一擊戰報"
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1 pr-6">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 text-[10px] font-black inline-block">
                👑 FINAL BLOW · 你給出了 Boss 最後一擊！
              </span>
              <h3 className="text-sm font-black text-white">
                成功斬殺 Stage {finalBlowReport.clearedStage}【{finalBlowReport.boss.nameZh}】！是否分享戰報？
              </h3>
              <p className="text-[11px] text-slate-400">
                系統已自動為你與隊友搭配好專屬討伐捷報圖，可直接分享至 IG / LINE
              </p>
            </div>

            {/* Pre-composed fixed artwork poster (no complex sliders or photo upload) */}
            <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 flex justify-center">
              <canvas
                ref={killPosterCanvasRef}
                className="w-full max-w-[290px] rounded-xl border border-amber-400/40 shadow-2xl block"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadKillPoster}
                className="retro-btn py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>儲存戰報圖</span>
              </button>

              <button
                onClick={handleShareKillPoster}
                className="retro-btn py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Share2 className="w-4 h-4 stroke-[2.5px]" />
                <span>立即分享 (IG/LINE)</span>
              </button>
            </div>

            <button
              onClick={() => setFinalBlowReport(null)}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition"
            >
              稍後再說，繼續推進 Stage {store.squadStage}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL E: 🎁 RARE LOOT DROP SHARE PROMPT (歐皇稀有噴裝炫耀卡)        */}
      {/* (Pops up when player rolls the ~18% hidden loot drop on a strike! */}
      {/*  Renders a single pre-composed SSR treasure poster!)              */}
      {/* ================================================================= */}
      {lootDropReport && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
          <div className="retro-box w-full max-w-sm rounded-2xl p-4 bg-slate-950 border-2 border-purple-400 space-y-3 relative max-h-[94vh] overflow-y-auto">
            <button
              onClick={() => setLootDropReport(null)}
              aria-label="關閉稀有噴裝分享視窗"
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1 pr-6">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 text-[10px] font-black inline-block">
                🎁 SSR RARE LOOT · 歐皇降臨噴裝（掉寶率 18%）
              </span>
              <h3 className="text-sm font-black text-white">
                幸運打落【{lootDropReport.boss.hiddenLoot.nameZh}】！是否分享炫耀？
              </h3>
              <p className="text-[11px] text-slate-400">
                不是每個人揮拳都有機會打到！系統已為你搭配好專屬歐皇噴裝圖
              </p>
            </div>

            {/* Pre-composed fixed SSR loot drop poster */}
            <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 flex justify-center">
              <canvas
                ref={lootPosterCanvasRef}
                className="w-full max-w-[290px] rounded-xl border border-purple-400/50 shadow-2xl block"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadLootPoster}
                className="retro-btn py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-black text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>儲存噴裝圖</span>
              </button>

              <button
                onClick={handleShareLootPoster}
                className="retro-btn py-2.5 rounded-xl bg-gradient-to-r from-purple-400 via-fuchsia-400 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Share2 className="w-4 h-4 stroke-[2.5px]" />
                <span>立即曬裝 (IG/LINE)</span>
              </button>
            </div>

            <button
              onClick={() => setLootDropReport(null)}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition"
            >
              收進寶物袋，繼續戰鬥
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
