import React, { useState, useEffect } from 'react';
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
  UserPlus,
  Check,
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
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  ADVENTURE_BOSS_CATALOG,
  AVATAR_ITEMS,
  FRIEND_PROFILES,
} from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { AvatarPortraitCanvas } from '../../game/AvatarPortraitCanvas';

type AdventureMainSubTab = 'raid' | 'ladder' | 'social';
type RaidMode = 'solo' | 'squad';
type LadderCategory = 'solo_stage' | 'squad_stage' | 'max_damage';
type SocialSubFilter = 'all_public' | 'friends_feed' | 'my_posts' | 'friends_directory';

export const PlazaTab: React.FC = () => {
  const store = useGameStore();
  const [mainSubTab, setMainSubTab] = useState<AdventureMainSubTab>('raid');
  const [raidMode, setRaidMode] = useState<RaidMode>('squad');
  const [ladderCat, setLadderCat] = useState<LadderCategory>('solo_stage');
  const [socialFilter, setSocialFilter] = useState<SocialSubFilter>('all_public');
  const [visitingPostId, setVisitingPostId] = useState<string | null>(null);

  // Combat animation states
  const [isBossHit, setIsBossHit] = useState(false);
  const [isAvatarLunging, setIsAvatarLunging] = useState(false);
  const [floatingHit, setFloatingHit] = useState<{
    damage: number;
    isCrit: boolean;
    label: string;
  } | null>(null);
  const [shakingMemberId, setShakingMemberId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate player's current gear stats
  const equippedIds = Object.values(store.equipped);
  let myPhyAtk = 20; // base
  let myMagAtk = 10; // base
  let mySupportVal = 0;
  equippedIds.forEach((id) => {
    const item = AVATAR_ITEMS.find((a) => a.id === id);
    if (item?.combatStat) {
      if (item.combatStat.type === 'phy') myPhyAtk += item.combatStat.value;
      if (item.combatStat.type === 'mag') myMagAtk += item.combatStat.value;
      if (item.combatStat.type === 'support') mySupportVal += item.combatStat.value;
    }
  });

  // Boss info calculation
  const currentStage = raidMode === 'solo' ? store.soloStage : store.squadStage;
  const bossTemplate =
    ADVENTURE_BOSS_CATALOG[(currentStage - 1) % ADVENTURE_BOSS_CATALOG.length];
  const maxHp =
    raidMode === 'solo'
      ? Math.round(bossTemplate.maxHp * (1 + (currentStage - 1) * 0.25))
      : Math.round(bossTemplate.maxHp * 1.8 * (1 + (currentStage - 1) * 0.25));
  const currentHp = Math.min(
    maxHp,
    raidMode === 'solo' ? store.soloBossHp : store.squadBossHp
  );
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));

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
  const attendedCount =
    1 + store.squadMembers.filter((m) => m.hasWorkedOutToday).length;
  const totalSquadSize = 1 + store.squadMembers.length;
  const isFullAttendance = attendedCount === totalSquadSize;
  const missingMember = store.squadMembers.find((m) => !m.hasWorkedOutToday);

  const handleManualStrike = () => {
    if (isOnCooldown) return;
    setIsAvatarLunging(true);
    setTimeout(() => {
      const res = store.attackAdventureBoss(raidMode);
      setIsAvatarLunging(false);
      if (res) {
        setIsBossHit(true);
        setFloatingHit({
          damage: res.damage,
          isCrit: res.isCrit,
          label: res.attackTypeLabel,
        });
        setTimeout(() => setIsBossHit(false), 500);
        setTimeout(() => setFloatingHit(null), 1600);
      }
    }, 220);
  };

  const handleNudge = (memberId: string) => {
    setShakingMemberId(memberId);
    store.nudgeSquadMember(memberId);
    setTimeout(() => setShakingMemberId(null), 600);
  };

  const filteredPosts = store.posts.filter((post) => {
    const isAuthorFriend = store.friendIds.includes(post.authorId);
    if (socialFilter === 'all_public') return true;
    if (socialFilter === 'friends_feed') return post.visibility === 'friends' || isAuthorFriend;
    if (socialFilter === 'my_posts')
      return post.visibility === 'mine' || post.authorId === 'me_player' || post.authorId === 'me';
    return true;
  });

  const getVisibilityBadge = (vis: 'public' | 'friends' | 'mine', isFriendAuthor: boolean) => {
    if (vis === 'mine') {
      return {
        label: '我的',
        cls: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
      };
    }
    if (vis === 'friends' || isFriendAuthor) {
      return {
        label: '好友',
        cls: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
      };
    }
    return {
      label: '公開',
      cls: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300',
    };
  };

  return (
    <div className="p-3.5 space-y-3.5 pb-12">
      {/* 1. TOP HEADER + MAIN 3-WAY ADVENTURE TABS */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🏰</span>
          <h2 className="text-sm font-black text-white">冒險公會大廳</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-amber-300 flex items-center gap-1">
            <Ticket className="w-3 h-3" />
            討伐券: {store.raidTickets}
          </span>
          <button
            onClick={() => store.setMemeStudioOpen(true)}
            className="retro-btn px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shrink-0"
          >
            <Camera className="w-3 h-3" />
            <span>拍貼</span>
          </button>
        </div>
      </div>

      {/* 3 Main Sub-Tabs: 討伐戰 | 天梯榜 | 戰友動態 */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {(
          [
            { id: 'raid', label: '👹 討伐推圖', icon: Swords },
            { id: 'ladder', label: '🏆 榮譽天梯', icon: Trophy },
            { id: 'social', label: '👥 戰友動態', icon: Users },
          ] as const
        ).map((tab) => {
          const active = mainSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMainSubTab(tab.id)}
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: 👹 討伐推圖 (Tap Titans Style Solo & Squad Boss Progression) */}
      {/* ================================================================= */}
      {mainSubTab === 'raid' && (
        <div className="space-y-3">
          {/* Dual-Track Mode Switcher: Solo Dungeon vs 2~4 Squad Raid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRaidMode('solo')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                raidMode === 'solo'
                  ? 'bg-cyan-950/60 border-cyan-400 text-white shadow'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400'
              }`}
            >
              <div>
                <div className="text-xs font-black flex items-center gap-1">
                  <span>👤 個人試煉</span>
                </div>
                <div className="text-[10px] text-cyan-300 font-bold mt-0.5">
                  目前關卡：Stage {store.soloStage}
                </div>
              </div>
              <span className="text-lg">🗡️</span>
            </button>

            <button
              onClick={() => setRaidMode('squad')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                raidMode === 'squad'
                  ? 'bg-amber-950/60 border-amber-400 text-white shadow'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400'
              }`}
            >
              <div>
                <div className="text-xs font-black flex items-center gap-1">
                  <span>👥 戰隊討伐</span>
                </div>
                <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                  目前關卡：Stage {store.squadStage}
                </div>
              </div>
              <span className="text-lg">🛡️</span>
            </button>
          </div>

          {/* Player's Current Combat Gear Stats Bar */}
          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold flex-wrap">
              <span className="text-slate-400">我的戰力：</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-400/40 text-orange-300 font-black">
                🥊 物攻 {myPhyAtk}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-black">
                🪄 魔攻 {myMagAtk}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black">
                🔥 連勝 +{store.streakDays * 10}%
              </span>
            </div>
            <button
              onClick={() => store.setWardrobeModalOpen(true)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-black flex items-center gap-1 shrink-0 border border-slate-700"
            >
              <Shirt className="w-3 h-3" />
              <span>換裝配屬性</span>
            </button>
          </div>

          {/* TAP TITANS BOSS BATTLE ARENA */}
          <div className="retro-box rounded-2xl p-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-800 relative overflow-hidden">
            {/* Stage Banner & Weakness Badge */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black mb-1">
                  <span>STAGE {currentStage}</span>
                  <span>·</span>
                  <span>{raidMode === 'solo' ? '個人地下城' : '3人彈性戰隊副本'}</span>
                </div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <span>{bossTemplate.emoji}</span>
                  <span>{bossTemplate.nameZh}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{bossTemplate.subtitleZh}</p>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`px-2 py-1 rounded-xl text-[10px] font-black border ${
                    bossTemplate.weakness === 'phy'
                      ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                      : bossTemplate.weakness === 'mag'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-amber-500/20 border-amber-400 text-amber-300'
                  }`}
                >
                  ⚡ {bossTemplate.weaknessLabelZh}
                </div>
                <div className="text-[10px] text-amber-300 font-bold mt-1">
                  擊破獎勵: +{bossTemplate.rewardCoins} 🪙
                </div>
              </div>
            </div>

            {/* Elemental Shield Lock Alert (When in Squad Mode & Teammate hasn't worked out) */}
            {raidMode === 'squad' && missingMember && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-between gap-2 animate-pulse">
                <div className="text-[11px] text-rose-200 font-bold leading-snug">
                  🛡️ <span className="font-black text-amber-300">高糖護盾鎖定中！</span>
                  等待隊友【{missingMember.nameZh}】運動出拳破除魔攻護盾！
                </div>
                <button
                  onClick={() => handleNudge(missingMember.id)}
                  className="px-2 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black shrink-0 shadow"
                >
                  🔔 催他
                </button>
              </div>
            )}

            {/* Boss HP Bar (Persistent Cumulative Damage) */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-black mb-1">
                <span className="text-rose-400 flex items-center gap-1">
                  ❤️ BOSS 血量（殘血累積不重置）
                </span>
                <span className="font-mono text-white">
                  {currentHp.toLocaleString()} / {maxHp.toLocaleString()} HP ({hpPercent}%)
                </span>
              </div>
              <div className="w-full h-4 rounded-full bg-slate-800 border border-slate-700 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            {/* Battle Visual Stage: Player Paper-Doll vs Giant Life-Humor Boss */}
            <div className="relative h-40 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-around px-4 overflow-hidden">
              {/* Retro dungeon floor grid effect */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#f59e0b 1px, #020617 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Left: Player Paper-Doll Fighter */}
              <div
                className={`relative z-10 flex flex-col items-center transition-transform duration-200 ${
                  isAvatarLunging ? 'translate-x-12 scale-110' : ''
                }`}
              >
                <div className="rounded-xl border border-emerald-500/40 bg-slate-900/80 p-1 shadow-lg">
                  <AvatarPortraitCanvas
                    bodyStage={store.bodyStage}
                    equipped={store.equipped}
                    size={76}
                  />
                </div>
                <span className="mt-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                  {store.nickname}
                </span>
              </div>

              {/* Center VS & Floating Damage Text */}
              <div className="relative z-20 flex flex-col items-center justify-center">
                {floatingHit ? (
                  <div className="animate-bounce text-center">
                    <div className="text-[10px] font-black text-amber-300 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-400/50">
                      {floatingHit.label}
                    </div>
                    <div
                      className={`font-mono font-black ${
                        floatingHit.isCrit
                          ? 'text-2xl text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]'
                          : 'text-xl text-rose-400'
                      }`}
                    >
                      -{floatingHit.damage} HP!
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-black text-slate-500 font-mono">VS</div>
                )}
              </div>

              {/* Right: Giant Humor Boss Sprite */}
              <div
                className={`relative z-10 flex flex-col items-center transition-transform duration-150 ${
                  isBossHit
                    ? 'translate-x-3 -translate-y-2 scale-90 brightness-150'
                    : 'animate-pulse'
                }`}
              >
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-rose-950/90 to-slate-900 border-2 border-rose-500/50 flex items-center justify-center text-6xl shadow-[0_0_25px_rgba(244,63,94,0.3)] relative">
                  <span>{bossTemplate.emoji}</span>
                  {isBossHit && (
                    <span className="absolute -top-2 -right-2 text-2xl animate-ping">💥</span>
                  )}
                </div>
                <span className="mt-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black">
                  Lv.{currentStage * 5} {bossTemplate.nameZh}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2.5 text-center">
              💡 {bossTemplate.descriptionZh}（完成任務與連續簽到即可提升出擊威力，不比拼舉重重量！）
            </p>

            {/* MANUAL STRIKE BUTTON OR COOLDOWN RESET CONTROLS */}
            <div className="mt-3.5">
              {!isOnCooldown ? (
                <button
                  onClick={handleManualStrike}
                  className="w-full retro-btn py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  <Swords className="w-4 h-4" />
                  <span>⚔️ 出擊挑戰 Boss（揮拳造成傷害）</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>下次免費出擊冷卻：</span>
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
                      <span>用討伐券重置 ({store.raidTickets})</span>
                    </button>
                    <button
                      onClick={() => store.resetAdventureCooldown('iap')}
                      className="retro-btn py-2.5 px-3 rounded-xl bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-1.5"
                    >
                      <Gem className="w-3.5 h-3.5" />
                      <span>NT$30 立即解鎖</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SQUAD ACCOUNTABILITY & PEER-URGING PANEL */}
          {raidMode === 'squad' && (
            <div className="retro-box rounded-2xl p-3.5 space-y-3 border border-amber-500/40 bg-slate-900/90">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>🔥 {store.squadName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                      出勤 {attendedCount}/{totalSquadSize}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isFullAttendance
                      ? '⚡ 全員已打卡到齊！全隊享有【狂暴 1.5 倍傷害】加成！'
                      : `👉 只差 @${missingMember?.nameZh} 運動打卡，即可解鎖全隊 1.5 倍狂暴傷害！`}
                  </p>
                </div>

                <button
                  onClick={() => store.setShareRaidModalOpen(true)}
                  className="retro-btn px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center gap-1 shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>發討伐令</span>
                </button>
              </div>

              {/* Squad Members Cards */}
              <div className="space-y-2">
                {/* Me */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xs font-black text-emerald-300">
                      我
                    </span>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{store.nickname}</span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[9px]">
                          🥊 物攻 {myPhyAtk} / 🪄 魔攻 {myMagAtk}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-bold">
                        ✓ 今日已備戰 · 最高單擊 {store.personalMaxDamage} HP
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 px-2 py-1 rounded bg-emerald-950">
                    隊長
                  </span>
                </div>

                {/* Teammates */}
                {store.squadMembers.map((member) => {
                  const isShaking = shakingMemberId === member.id;
                  return (
                    <div
                      key={member.id}
                      className={`p-2.5 rounded-xl border transition flex flex-col gap-2 ${
                        isShaking ? 'animate-bounce border-rose-400 bg-rose-950/40' : ''
                      } ${
                        member.hasWorkedOutToday
                          ? 'bg-slate-950/80 border-slate-800'
                          : 'bg-rose-950/25 border-rose-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                              member.hasWorkedOutToday
                                ? 'bg-cyan-500/20 border border-cyan-400/50'
                                : 'bg-rose-500/20 border border-rose-400/50'
                            }`}
                          >
                            {member.hasWorkedOutToday ? '💪' : '🛋️'}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{member.nameZh}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  member.roleType === 'phy'
                                    ? 'bg-orange-500/20 text-orange-300'
                                    : 'bg-cyan-500/20 text-cyan-300'
                                }`}
                              >
                                {member.roleBadgeZh}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              配裝：{member.gearDescZh}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {member.hasWorkedOutToday ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                              ✓ 已出擊 (-{member.damageDealt} HP)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black">
                              ⚠️ 今日未運動
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Urge Buttons for Slacking Teammate */}
                      {!member.hasWorkedOutToday && (
                        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80">
                          <button
                            onClick={() => handleNudge(member.id)}
                            className="py-1.5 px-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-black flex items-center justify-center gap-1 shadow"
                          >
                            <Bell className="w-3 h-3" />
                            <span>
                              拿啞鈴敲他 {member.nudgedCount > 0 ? `(${member.nudgedCount})` : ''}
                            </span>
                          </button>

                          <button
                            onClick={() => store.setShareRaidModalOpen(true)}
                            className="py-1.5 px-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black flex items-center justify-center gap-1"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>LINE 討伐令</span>
                          </button>

                          <button
                            onClick={() => store.simulateFriendWorkoutJoin(member.id)}
                            className="py-1.5 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-[10px] font-black flex items-center justify-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>模擬他打卡</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: 🏆 榮譽天梯 (Solo Max Stage, Squad Max Stage, Max Damage)   */}
      {/* ================================================================= */}
      {mainSubTab === 'ladder' && (
        <div className="space-y-3">
          {/* 3 Ladder Categories */}
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: 'solo_stage', label: '👤 個人關卡榜' },
                { id: 'squad_stage', label: '🛡️ 戰隊推圖榜' },
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

          {/* My Current Record Highlight Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-cyan-500/20 border border-amber-400/50 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black text-amber-300 uppercase">
                我的當前天梯紀錄
              </div>
              <div className="text-sm font-black text-white mt-0.5">
                {ladderCat === 'solo_stage' &&
                  `個人最高闖關：Stage ${store.personalMaxStage}（連勝 ${store.streakDays} 天）`}
                {ladderCat === 'squad_stage' &&
                  `${store.squadName}：Stage ${store.squadMaxStage}`}
                {ladderCat === 'max_damage' &&
                  `單次最高爆發傷害：${store.personalMaxDamage.toLocaleString()} HP`}
              </div>
            </div>
            <Trophy className="w-7 h-7 text-amber-400 shrink-0" />
          </div>

          {/* Leaderboard List */}
          <div className="space-y-2">
            {ladderCat === 'solo_stage' &&
              [
                {
                  rank: 1,
                  name: '健力泰坦 · 館長級巨巨',
                  title: '👑 連續打卡 45 天',
                  score: 'Stage 18',
                  badge: '🥊 物攻 180',
                  isMe: false,
                },
                {
                  rank: 2,
                  name: '有氧女神 · 小愛',
                  title: '⚡ 連續打卡 21 天',
                  score: 'Stage 11',
                  badge: '🪄 魔攻 145',
                  isMe: false,
                },
                {
                  rank: 3,
                  name: '重訓狂人 · 阿凱',
                  title: '🔥 連續打卡 14 天',
                  score: 'Stage 8',
                  badge: '🥊 物攻 130',
                  isMe: false,
                },
                {
                  rank: 4,
                  name: `${store.nickname} (我)`,
                  title: `🔥 連續打卡 ${store.streakDays} 天`,
                  score: `Stage ${store.personalMaxStage}`,
                  badge: `🥊 ${myPhyAtk} / 🪄 ${myMagAtk}`,
                  isMe: true,
                },
                {
                  rank: 5,
                  name: '街頭健體 · Leo',
                  title: '🌱 連續打卡 3 天',
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
                        ? 'bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-400/40'
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
                  sub: '本週全勤率 100% · 物魔雙修',
                  score: 'Stage 24',
                  isMe: false,
                },
                {
                  name: '⚡ 乳清狂飲者聯盟 (3人)',
                  sub: '本週全勤率 95% · 暴擊特化',
                  score: 'Stage 15',
                  isMe: false,
                },
                {
                  name: `${store.squadName} (3人 · 我的戰隊)`,
                  sub: `今日出勤 ${attendedCount}/${totalSquadSize} · 接力削血中`,
                  score: `Stage ${store.squadMaxStage}`,
                  isMe: true,
                },
                {
                  name: '🌱 下班順便動一下 (2人)',
                  sub: '本週全勤率 75%',
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
                        ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/40'
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
                  sub: '斯巴達披風 + 24K金槓 (弱點暴擊)',
                  dmg: 2450,
                  isMe: false,
                },
                {
                  name: '重訓狂人 · 阿凱',
                  sub: '紅黑健力服 + 全勤狂暴加成',
                  dmg: 1420,
                  isMe: false,
                },
                {
                  name: `${store.nickname} (我)`,
                  sub: '任務達成 + 屬性弱點克制',
                  dmg: store.personalMaxDamage,
                  isMe: true,
                },
                {
                  name: '有氧女神 · 小愛',
                  sub: '高溫有氧魔法破盾',
                  dmg: 620,
                  isMe: false,
                },
              ]
                .sort((a, b) => b.dmg - a.dmg)
                .map((row, idx) => (
                  <div
                    key={row.name}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                      row.isMe
                        ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/40'
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
      {/* TAB 3: 👥 戰友動態 (Friends Directory & Meme Posts Feed)          */}
      {/* ================================================================= */}
      {mainSubTab === 'social' && (
        <div className="space-y-3">
          {/* Sub-filter */}
          <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: 'all_public', label: '公開', icon: Globe },
                { id: 'friends_feed', label: '好友', icon: Users },
                { id: 'my_posts', label: '我的', icon: UserCheck },
                { id: 'friends_directory', label: '找戰友', icon: Contact },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = socialFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSocialFilter(t.id)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition ${
                    active
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Friends Directory */}
          {socialFilter === 'friends_directory' ? (
            <div className="space-y-2.5">
              {FRIEND_PROFILES.map((friend) => {
                const isFriend = store.friendIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    className="retro-box rounded-2xl p-3 flex items-center justify-between gap-2.5"
                  >
                    <div
                      onClick={() => store.setSelectedProfileId(friend.id)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                        {friend.isVerified ? '👑' : '🏋️'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate">
                            {friend.nameZh}
                          </span>
                          {friend.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {friend.titleZh} · 🔥 {friend.streakDays}天
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => store.toggleFriend(friend.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 shrink-0 transition ${
                        isFriend
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                          : 'bg-emerald-500 text-slate-950 shadow'
                      }`}
                    >
                      {isFriend ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>戰友</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>加戰友</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => {
                const isVisiting = visitingPostId === post.id;
                const isAuthorFriend = store.friendIds.includes(post.authorId);
                const isMe = post.authorId === 'me_player' || post.authorId === 'me';
                const visBadge = getVisibilityBadge(post.visibility, isAuthorFriend);
                const linkedFriend = FRIEND_PROFILES.find((f) => f.id === post.authorId);

                return (
                  <div key={post.id} className="retro-box rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => {
                          if (linkedFriend) store.setSelectedProfileId(linkedFriend.id);
                        }}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs text-emerald-400 shrink-0">
                          {post.authorName.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-black text-white truncate">
                              {post.authorName}
                            </span>
                            {post.isVerified && (
                              <BadgeCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${visBadge.cls}`}
                            >
                              {visBadge.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {post.authorTitle} · {post.createdAtLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isMe && linkedFriend && (
                          <button
                            onClick={() => store.toggleFriend(linkedFriend.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black border transition ${
                              isAuthorFriend
                                ? 'bg-slate-900 border-slate-700 text-emerald-400'
                                : 'bg-emerald-500 border-emerald-400 text-slate-950'
                            }`}
                          >
                            {isAuthorFriend ? '✓ 戰友' : '＋ 加戰友'}
                          </button>
                        )}
                        <button
                          onClick={() => setVisitingPostId(isVisiting ? null : post.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-900 text-cyan-300 border border-slate-700"
                        >
                          <Home className="w-3 h-3 inline mr-0.5" />
                          {isVisiting ? '收起' : '串門'}
                        </button>
                      </div>
                    </div>

                    {isVisiting && (
                      <div className="rounded-xl overflow-hidden border border-cyan-500/40">
                        <PixelRoomCanvas
                          isActive={true}
                          customOverride={{
                            ownerName: post.authorName,
                            bodyStage: post.bodyStage,
                            equipped: post.equipped,
                            room: post.room,
                          }}
                          visitorAvatar={{
                            nickname: store.nickname,
                            bodyStage: store.bodyStage,
                            equipped: store.equipped,
                          }}
                          compact
                        />
                      </div>
                    )}

                    <p className="text-xs text-slate-200 leading-relaxed">{post.caption}</p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => store.tipPost(post.id)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-black text-amber-300 flex items-center justify-center gap-1"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>打賞 ({post.tipsCount})</span>
                      </button>
                      <button
                        onClick={() => store.giftWaterPost(post.id)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-black text-cyan-300 flex items-center justify-center gap-1"
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        <span>送水 ({post.waterCount})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* LINE / IG 8-BIT 緊急討伐召集令 MODAL                              */}
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

            {/* Retro Share Poster Card */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-rose-950/70 via-slate-900 to-slate-950 border-2 border-rose-500/50 text-center space-y-2.5">
              <div className="text-5xl">{bossTemplate.emoji}</div>
              <div className="text-sm font-black text-white">
                STAGE {store.squadStage} · {bossTemplate.nameZh}
              </div>
              <div className="text-xs font-mono font-black text-rose-400">
                殘餘血量：{currentHp.toLocaleString()} / {maxHp.toLocaleString()} HP
              </div>
              <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-amber-300 font-bold leading-relaxed">
                {missingMember
                  ? `「全隊出勤 ${attendedCount}/${totalSquadSize}！高糖護盾鎖定中，@${missingMember.nameZh} 快去運動打卡破盾，別讓全隊拿不到本週寶箱！」`
                  : `「全隊全員狂暴啟動中！快上線給 ${bossTemplate.nameZh} 最後一擊！」`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const shareText = `🚨【FitMon 戰隊緊急討伐令】\n我們正在討伐 Stage ${store.squadStage}【${bossTemplate.nameZh}】（剩餘 ${currentHp} HP）！\n#拯救全隊就差你 快去運動打卡破盾：\nhttps://yuchienw.github.io/Fitmon/`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareText);
                  }
                  store.showToast('📲 已複製 LINE 討伐召集令文字與連結！快貼給朋友！');
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
    </div>
  );
};
