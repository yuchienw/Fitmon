import React, { useState, useEffect } from 'react';
import {
  Coins,
  Droplets,
  BadgeCheck,
  Home,
  Globe,
  Users,
  UserCheck,
  Contact,
  ShieldAlert,
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
  Gift,
  Lock,
  Wrench,
  UserPlus,
  UserMinus,
  Edit3,
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
  FRIEND_PROFILES,
} from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { AvatarPortraitCanvas } from '../../game/AvatarPortraitCanvas';

type AdventureMainSubTab = 'raid' | 'squad_builder' | 'ladder' | 'social';
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

  // Squad Builder state
  const [squadNameInput, setSquadNameInput] = useState(store.squadName);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [recruitFilter, setRecruitFilter] = useState<'all' | 'phy' | 'mag' | 'support'>('all');

  // Floating HUD popovers & modals
  const [devCheatOpen, setDevCheatOpen] = useState(false);
  const [lootBagOpen, setLootBagOpen] = useState(false);
  const [inspectedMember, setInspectedMember] = useState<SquadMemberState | null>(null);

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
      store.showToast('🏋️ 請先完成今日運動並跑完組間休息，即可回來揮拳討伐 Boss！');
      return;
    }
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
          droppedLootName: res.droppedLootName,
          isCheatPenalty: res.isCheatPenalty,
        });
        setTimeout(() => setIsBossHit(false), 500);
        setTimeout(() => setFloatingHit(null), 2200);
      }
    }, 220);
  };

  const handleNudge = (memberId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  // Sync inspectedMember with latest store state
  const liveInspectedMember = inspectedMember
    ? store.squadMembers.find((m) => m.id === inspectedMember.id) || null
    : null;

  return (
    <div className="p-3 space-y-2.5 pb-10 relative">
      {/* 1. COMPACT GAME HUD TOP BAR: 4 VIEW PILLS + LOOT BAG + DEV CHEAT BUTTON */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(
            [
              { id: 'raid', label: '⚔️ 戰場' },
              { id: 'squad_builder', label: `🛡️ 組隊(${1 + store.squadMembers.length}/4)` },
              { id: 'ladder', label: '🏆 天梯' },
              { id: 'social', label: '💬 動態' },
            ] as const
          ).map((tab) => {
            const active = mainSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainSubTab(tab.id)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition whitespace-nowrap ${
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLootBagOpen(true)}
            title="查看掉落寶物袋"
            className="px-2 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-[11px] font-black text-amber-300 flex items-center gap-1"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>寶物 {store.collectedBossLoots.length}</span>
          </button>

          <button
            onClick={() => setDevCheatOpen((v) => !v)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-black flex items-center gap-1 active:scale-95 transition"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>🛠️ 外掛</span>
          </button>
        </div>
      </div>

      {/* FLOATING DEV CHEAT POPOVER (Hidden until 🛠️ 外掛 is tapped) */}
      {devCheatOpen && (
        <div className="p-3 rounded-2xl bg-slate-950/95 backdrop-blur-md border-2 border-cyan-400 shadow-2xl space-y-2 z-40">
          <div className="flex items-center justify-between text-xs font-black text-cyan-300">
            <span>🛠️ MVP 驗收測試外掛（切換今日運動休息判定）</span>
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
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: ⚔️ FULL-STAGE MOBILE RPG BOSS ARENA + HUD COMMAND DECK     */}
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

            {/* Top HUD Row: Mode Switcher Pill + Boss Weakness & Loot Pill */}
            <div className="relative z-10 flex items-center justify-between gap-1.5">
              <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-white/15">
                <button
                  onClick={() => setRaidMode('squad')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition flex items-center gap-1 ${
                    raidMode === 'squad'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-300'
                  }`}
                >
                  <span>🛡️ 戰隊 S.{store.squadStage}</span>
                </button>
                <button
                  onClick={() => setRaidMode('solo')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition flex items-center gap-1 ${
                    raidMode === 'solo'
                      ? 'bg-cyan-400 text-slate-950 shadow'
                      : 'text-slate-300'
                  }`}
                >
                  <span>👤 單人 S.{store.soloStage}</span>
                </button>
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

            {/* Boss Name Banner + Chunky Arcade HP Bar */}
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
                  ❤️ {currentHp.toLocaleString()} / {maxHp.toLocaleString()} HP ({hpPercent}%)
                </div>
              </div>

              {store.activeTeamComboBuff === 'armor_break' && (
                <div className="px-2.5 py-1 rounded-lg bg-cyan-950/90 border border-cyan-400/60 text-center text-[10px] font-black text-cyan-200">
                  🔨 阿凱已破甲！選【🔥 燃脂魔焰】出擊享 2.0 倍連攜引爆！
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

            {/* Bottom of Stage: 4-Player RPG Party Formation Dock (Squad Mode) */}
            {raidMode === 'squad' && (
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
                      出勤 {legitSquadCount}/{totalSquadSize} {isFullAttendance ? '⚡狂暴1.5x' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMainSubTab('squad_builder')}
                      className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-black text-[10px] flex items-center gap-1 hover:bg-cyan-500/30 transition"
                    >
                      <Users className="w-3 h-3" />
                      <span>編組隊伍</span>
                    </button>
                    <button
                      onClick={() => store.setShareRaidModalOpen(true)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>發討伐令</span>
                    </button>
                  </div>
                </div>

                {/* 4-Slot Horizontal RPG Party Cards (Tap to urge, catch cheater, or recruit!) */}
                <div className="grid grid-cols-4 gap-1.5">
                  {/* Slot 1: Me */}
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

                  {/* Slots 2~4: Squad Teammates or Empty Recruitment Slots */}
                  {[0, 1, 2].map((slotIdx) => {
                    const member = store.squadMembers[slotIdx];
                    if (!member) {
                      return (
                        <button
                          key={`empty_slot_${slotIdx}`}
                          onClick={() => setMainSubTab('squad_builder')}
                          className="p-1.5 rounded-xl border border-dashed border-cyan-400/50 bg-slate-900/50 hover:bg-cyan-950/40 text-center flex flex-col items-center justify-center gap-1 transition min-h-[72px]"
                        >
                          <UserPlus className="w-4 h-4 text-cyan-400" />
                          <span className="text-[10px] font-black text-cyan-300 leading-tight">
                            ＋ 招募隊友
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
                            ✅ +{member.damageDealt}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

            {/* Giant 3D Strike CTA or Cooldown Bar */}
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
                      }】痛扁 Boss！`}
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>下次出擊冷卻：</span>
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
      {/* TAB 1.5: 🛡️ 組隊大廳 (Squad Formation, Name, Invite Code & Recruit) */}
      {/* ================================================================= */}
      {mainSubTab === 'squad_builder' && (
        <div className="space-y-3">
          {/* 1. SQUAD BANNER, NAME EDITOR & INVITE CODE */}
          <div className="retro-box rounded-2xl p-3.5 space-y-3 border-2 border-cyan-500/40">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black">
                  🛡️ 4人遠征戰隊編成大廳
                </span>
                <h2 className="text-sm font-black text-white mt-1 break-words">
                  目前戰隊：{store.squadName}（{1 + store.squadMembers.length}/4 人）
                </h2>
              </div>
              <button
                onClick={() => {
                  setRaidMode('squad');
                  setMainSubTab('raid');
                }}
                className="retro-btn px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>返回戰場開打</span>
              </button>
            </div>

            {/* Edit Squad Name */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={squadNameInput}
                  onChange={(e) => setSquadNameInput(e.target.value)}
                  placeholder="輸入戰隊名稱..."
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

            {/* Invite Code & Join by Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">我的戰隊邀請碼</div>
                  <div className="text-xs font-mono font-black text-amber-300">FIT-8842</div>
                </div>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(
                        `🛡️ 邀請你加入我的 FitMon 遠征戰隊【${store.squadName}】！輸入邀請碼 FIT-8842 一起運動刷 Boss 神裝：https://yuchienw.github.io/Fitmon/`
                      );
                    }
                    store.showToast('📲 已複製戰隊邀請碼 FIT-8842 與連結！快傳給好友組隊！');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-[11px] font-black flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>複製邀好友</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="輸入好友邀請碼 (如 FIT-999)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white outline-none focus:border-emerald-400"
                />
                <button
                  onClick={() => {
                    if (!inviteCodeInput.trim()) {
                      store.showToast('⚠️ 請先輸入好友的戰隊邀請碼！');
                      return;
                    }
                    const nextCandidate =
                      SQUAD_CANDIDATE_POOL.find(
                        (c) => !store.squadMembers.some((m) => m.id === c.id)
                      ) || SQUAD_CANDIDATE_POOL[3];
                    store.recruitSquadMember(nextCandidate);
                    setInviteCodeInput('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-black shrink-0"
                >
                  加入
                </button>
              </div>
            </div>
          </div>

          {/* 2. CURRENT 4-SLOT SQUAD ROSTER */}
          <div className="retro-box rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                當前出戰陣容（{1 + store.squadMembers.length}/4 人）
              </span>
              <span className="text-[11px] font-bold text-amber-300">
                💡 建議搭配：物攻破甲 ＋ 魔攻破盾 ＋ 輔助掉寶
              </span>
            </div>

            <div className="space-y-2">
              {/* Slot 1: Player Leader */}
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
                        ? '✅ 今日已完成真實運動與組間休息（100% 充能完畢）'
                        : store.todayWorkoutStatus === 'cheated_fast'
                        ? '🤥 今日疑似 3 秒快速打卡（傷害 -95% 刮痧懲罰中）'
                        : '🔒 今日尚未完成運動打卡'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Slots 2~4: 3 Teammate Slots */}
              {[0, 1, 2].map((slotIdx) => {
                const member = store.squadMembers[slotIdx];
                if (!member) {
                  return (
                    <div
                      key={`builder_empty_${slotIdx}`}
                      className="p-3.5 rounded-xl border-2 border-dashed border-cyan-500/40 bg-slate-900/50 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-dashed border-cyan-400/50 flex items-center justify-center text-cyan-400">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-cyan-300">
                            隊友槽位 #{slotIdx + 2}（空缺中）
                          </div>
                          <div className="text-[11px] text-slate-400">
                            請從下方「戰友與傭兵招募大廳」點擊【＋招募入隊】補齊人數！
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={member.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 ${
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
                            今日輸出 {member.damageDealt} HP
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 break-words">
                          👕 裝備：{member.gearDescZh}
                        </div>
                        <div className="text-[11px] text-emerald-300 font-bold break-words">
                          {member.workoutAuditZh}
                        </div>
                        {member.comboSkillAppliedZh && (
                          <div className="text-[11px] text-cyan-300 font-bold break-words">
                            {member.comboSkillAppliedZh}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => store.kickSquadMember(member.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-[11px] font-black flex items-center gap-1 shrink-0 transition"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>移出</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. RECRUITMENT HALL (FRIEND & GUILD CANDIDATES) */}
          <div className="retro-box rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  戰友與酒館招募大廳（點擊即可拉進隊伍）
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  可根據本關 Boss 弱點自由更換物攻手、魔攻手或掉寶輔助隊友！
                </p>
              </div>
            </div>

            {/* Role Filter */}
            <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'all', label: '全部職業' },
                  { id: 'phy', label: '🥊 物攻' },
                  { id: 'mag', label: '🪄 魔攻' },
                  { id: 'support', label: '🛡️ 輔助' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRecruitFilter(f.id)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-black transition ${
                    recruitFilter === f.id
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {SQUAD_CANDIDATE_POOL.filter(
                (c) => recruitFilter === 'all' || c.roleType === recruitFilter
              ).map((cand) => {
                const inSquad = store.squadMembers.some((m) => m.id === cand.id);
                return (
                  <div
                    key={cand.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition ${
                      inSquad
                        ? 'bg-emerald-950/25 border-emerald-500/50'
                        : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-xl shrink-0 mt-0.5">
                        {cand.roleType === 'phy'
                          ? '🥊'
                          : cand.roleType === 'mag'
                          ? '🪄'
                          : '🛡️'}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white break-words">
                            {cand.nameZh}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-black">
                            {cand.roleBadgeZh}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 break-words">
                          👕 {cand.gearDescZh}
                        </div>
                        <div className="text-[11px] text-emerald-300 font-bold break-words">
                          {cand.workoutAuditZh}
                        </div>
                        {cand.comboSkillAppliedZh && (
                          <div className="text-[11px] text-amber-300 font-bold break-words">
                            {cand.comboSkillAppliedZh}
                          </div>
                        )}
                      </div>
                    </div>

                    {inSquad ? (
                      <button
                        onClick={() => store.kickSquadMember(cand.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-emerald-300 border border-emerald-500/40 text-[11px] font-black shrink-0"
                      >
                        ✓ 已入隊
                      </button>
                    ) : (
                      <button
                        onClick={() => store.recruitSquadMember(cand)}
                        className="retro-btn px-3 py-1.5 rounded-xl bg-cyan-400 text-slate-950 text-[11px] font-black flex items-center gap-1 shrink-0 shadow"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{store.squadMembers.length >= 3 ? '替換入隊' : '＋招募'}</span>
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
      {/* TAB 2: 🏆 榮譽天梯 (Solo Max Stage, Squad Max Stage, Max Damage)   */}
      {/* ================================================================= */}
      {mainSubTab === 'ladder' && (
        <div className="space-y-3">
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

          <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-400/50 flex items-center justify-between">
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
                  sub: `真實出勤 ${legitSquadCount}/${totalSquadSize} · 接力削血中`,
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
      {/* TAB 3: 💬 戰友動態 (Friends Directory & Meme Posts Feed)          */}
      {/* ================================================================= */}
      {mainSubTab === 'social' && (
        <div className="space-y-3">
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white break-words">
                            {friend.nameZh}
                          </span>
                          {friend.isVerified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 break-words">
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
                        <span>＋加戰友</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => {
                const linkedFriend = FRIEND_PROFILES.find(
                  (f) => f.id === post.authorId || f.nameZh === post.authorName
                );
                const isAuthorFriend = linkedFriend
                  ? store.friendIds.includes(linkedFriend.id)
                  : false;
                const isMe = post.authorId === 'me_player' || post.authorId === 'me';
                const visBadge = getVisibilityBadge(post.visibility, isAuthorFriend);
                const isVisiting = visitingPostId === post.id;

                return (
                  <div key={post.id} className="retro-box rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => {
                          if (linkedFriend) store.setSelectedProfileId(linkedFriend.id);
                        }}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-sm shrink-0">
                          🏋️
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-white break-words">
                              {post.authorName}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${visBadge.cls}`}
                            >
                              {visBadge.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold break-words">
                            {post.workoutSummary}
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
                  今日貢獻：{liveInspectedMember.damageDealt} HP
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

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <button
                onClick={() => {
                  const id = liveInspectedMember.id;
                  setInspectedMember(null);
                  store.kickSquadMember(id);
                }}
                className="py-2 px-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-black flex items-center justify-center gap-1"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>踢出隊伍</span>
              </button>
              <button
                onClick={() => {
                  setInspectedMember(null);
                  setMainSubTab('squad_builder');
                }}
                className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 text-xs font-black flex items-center justify-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span>去編隊換人</span>
              </button>
            </div>
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
              {ADVENTURE_BOSS_CATALOG.map((b) => {
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
                          {b.hiddenLoot.statDescZh} · 出處：{b.nameZh}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                        owned
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {owned ? '✓ 已入手' : '未掉落'}
                    </span>
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
                殘餘血量：{currentHp.toLocaleString()} / {maxHp.toLocaleString()} HP
              </div>
              <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-amber-300 font-bold leading-relaxed">
                {missingMember
                  ? `「全隊出勤 ${legitSquadCount}/${totalSquadSize}！@${missingMember.nameZh} 快去運動跑組間休息破盾，一起刷【${bossTemplate.hiddenLoot.nameZh}】！」`
                  : `「全隊全員狂暴啟動中！快上線給 ${bossTemplate.nameZh} 最後一擊！」`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const shareText = `🚨【FitMon 戰隊緊急討伐令】\n我們正在討伐 Stage ${store.squadStage}【${bossTemplate.nameZh}】（剩餘 ${currentHp} HP），有機會掉落隱藏神裝【${bossTemplate.hiddenLoot.nameZh}】！\n#拯救全隊就差你 快去運動打卡：\nhttps://yuchienw.github.io/Fitmon/`;
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
