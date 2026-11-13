import React, { useState } from 'react';
import {
  Users,
  ShieldAlert,
  Swords,
  Trophy,
  Bell,
  Share2,
  Zap,
  Shirt,
  Sparkles,
  Copy,
  X,
  Gift,
  Wrench,
  UserPlus,
  Edit3,
  Flame,
} from 'lucide-react';
import {
  useGameStore,
  SquadMemberState,
  SQUAD_CANDIDATE_POOL,
  getSquadInviteCode,
} from '../../stores/useGameStore';
import {
  ADVENTURE_BOSS_CATALOG,
  AVATAR_ITEMS,
  FRIEND_PROFILES,
  hasFriendProfile,
  resolveFriendProfileId,
} from '../../config/catalogConfig';
import { AvatarPortraitCanvas } from '../../game/AvatarPortraitCanvas';
import { bossSpriteUrl } from '../../game/pixelSpriteDrawer';
import { AdventureRaidPane } from '../../features/adventure/battle/AdventureRaidPane';
import { AdventureModeSelect } from '../../features/adventure/flow/AdventureModeSelect';
import { SquadConfirmScreen } from '../../features/adventure/flow/SquadConfirmScreen';
import { GymIslandMapScreen } from '../../features/adventure/flow/GymIslandMapScreen';
import { VenueTowerScreen } from '../../features/adventure/flow/VenueTowerScreen';
import { RareLootShareModal } from '../../features/adventure/share/RareLootShareModal';
import { RareLootPosterData } from '../../features/adventure/share/types';
import { TeammateInspectSheet } from '../adventure/TeammateInspectSheet';

type AdventureMainSubTab = 'raid' | 'combat_stats' | 'squad_invite' | 'ladder';
type LadderCategory = 'solo_stage' | 'squad_stage' | 'max_damage';

export const PlazaTab: React.FC = () => {
  const store = useGameStore();
  const [mainSubTab, setMainSubTab] = useState<AdventureMainSubTab>('raid');
  const [adventureMode, setAdventureMode] = useState<'solo' | 'squad'>('solo');
  const [adventureStep, setAdventureStep] = useState<
    'mode_select' | 'squad_confirm' | 'map' | 'tower' | 'battle'
  >('mode_select');
  const [selectedVenueIdx, setSelectedVenueIdx] = useState<number>(() => {
    return Math.max(0, (store.soloStage - 1) % 6);
  });
  const [ladderCat, setLadderCat] = useState<LadderCategory>('solo_stage');

  // Squad Invite state
  const [squadNameInput, setSquadNameInput] = useState(store.squadName);
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Floating HUD popovers & modals
  const [devCheatOpen, setDevCheatOpen] = useState(false);
  const [lootBagOpen, setLootBagOpen] = useState(false);
  const [bagLootReport, setBagLootReport] = useState<RareLootPosterData | null>(null);

  const [shakingMemberId, setShakingMemberId] = useState<string | null>(null);
  // Calculate player's current gear stats & attack damage range
  const slotLabels: { slot: keyof typeof store.equipped; labelZh: string }[] = [
    { slot: 'hair', labelZh: '頭飾' },
    { slot: 'face', labelZh: '臉部' },
    { slot: 'top', labelZh: '上衣' },
    { slot: 'bottom', labelZh: '下身' },
    { slot: 'accessory', labelZh: '手持' },
  ];
  let phyBonus = 0;
  let magBonus = 0;
  let supportBonus = 0;
  const equippedGearDetails = slotLabels.map(({ slot, labelZh }) => {
    const id = store.equipped[slot];
    const item = AVATAR_ITEMS.find((a) => a.id === id);
    if (item?.combatStat) {
      if (item.combatStat.type === 'phy') phyBonus += item.combatStat.value;
      if (item.combatStat.type === 'mag') magBonus += item.combatStat.value;
      if (item.combatStat.type === 'support') supportBonus += item.combatStat.value;
    }
    return {
      slot,
      slotLabelZh: labelZh,
      nameZh: item?.nameZh || '基礎裝備',
      statLabelZh: item?.combatStat?.labelZh || '基礎 +0',
      statType: item?.combatStat?.type || 'phy',
    };
  });
  const myPhyAtk = 20 + phyBonus;
  const myMagAtk = 10 + magBonus;
  const mySupportAtk = 10 + supportBonus;

  const completedQuestsCount = store.quests.filter((q) => q.progress >= q.target).length;
  const baseWorkoutAtk = 340 + completedQuestsCount * 60 + store.streakDays * 25;
  const phyNormalDmg = baseWorkoutAtk + phyBonus * 7 + magBonus * 4;
  const magNormalDmg = baseWorkoutAtk + phyBonus * 4 + magBonus * 7;
  const coreNormalDmg = Math.round((baseWorkoutAtk + phyBonus * 4 + magBonus * 4) * 1.4);
  const minAttackDamage = Math.min(phyNormalDmg, magNormalDmg, coreNormalDmg);
  const maxSoloCritDamage = Math.round(Math.max(phyNormalDmg, magNormalDmg) * 2.0);
  const maxSquadComboDamage = Math.round(maxSoloCritDamage * 1.6);

  // Boss info calculation based on selected adventureMode ('solo' vs 'squad' — different monster strength!)
  const isSoloMode = adventureMode === 'solo';
  const currentStage = isSoloMode ? store.soloStage : store.squadStage;
  const bossTemplate =
    ADVENTURE_BOSS_CATALOG[(currentStage - 1) % ADVENTURE_BOSS_CATALOG.length];
  const maxHp = isSoloMode
    ? Math.round(bossTemplate.maxHp * (1 + (currentStage - 1) * 0.25))
    : Math.round(bossTemplate.maxHp * 1.8 * (1 + (currentStage - 1) * 0.25));
  const currentHp = Math.min(maxHp, isSoloMode ? store.soloBossHp : store.squadBossHp);

  // Squad Boss info for Squad Invite tab reference
  const squadBossTemplate =
    ADVENTURE_BOSS_CATALOG[(store.squadStage - 1) % ADVENTURE_BOSS_CATALOG.length];
  const squadMaxHp = Math.round(
    squadBossTemplate.maxHp * 1.8 * (1 + (store.squadStage - 1) * 0.25)
  );
  const squadCurrentHp = Math.min(squadMaxHp, store.squadBossHp);
  const squadInviteCode = getSquadInviteCode(store.squadName);

  // Squad attendance
  const legitSquadCount =
    (store.isCheckedInToday() ? 1 : 0) +
    store.squadMembers.filter((m) => m.hasWorkedOutToday && !m.isSuspectedCheater).length;
  const totalSquadSize = 1 + store.squadMembers.length;
  const missingMember = store.squadMembers.find((m) => !m.hasWorkedOutToday);

  const handleNudge = (memberId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShakingMemberId(memberId);
    store.nudgeSquadMember(memberId);
    setTimeout(() => setShakingMemberId(null), 600);
  };

  return (
    <div className={mainSubTab === 'raid' ? 'relative flex min-h-0 flex-1 flex-col overflow-hidden' : 'relative space-y-2.5 p-3 pb-10'}>
      {mainSubTab !== 'raid' && (
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div
          role="tablist"
          aria-label="冒險模式切換"
          className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800"
        >
          {(
            [
              { id: 'raid', label: '冒險', icon: Swords },
              { id: 'combat_stats', label: '個人素質', icon: Sparkles },
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
      )}

      {/* FLOATING DEV CHEAT POPOVER (Hidden until 🛠️ 外掛 is tapped) */}
      {devCheatOpen && (
        <div className="absolute left-2 right-2 top-2 z-40 space-y-2.5 rounded-2xl border-2 border-cyan-400 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md">
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
            {[
              {
                id: 'checked_in',
                label: '✅ 今天已打卡',
                sub: '解鎖出擊',
                active: store.isCheckedInToday(),
                cls: 'border-emerald-400 bg-emerald-950/60 text-emerald-300',
                onClick: () => store.setDevCheckinToday(true),
              },
              {
                id: 'not_checked_in',
                label: '🔒 尚未打卡',
                sub: '鎖定出擊',
                active: !store.isCheckedInToday(),
                cls: 'border-slate-500 bg-slate-800 text-slate-200',
                onClick: () => store.setDevCheckinToday(false),
              },
              {
                id: 'reset_boss',
                label: '🔄 重置今日 Boss',
                sub: store.isBossDoneToday() ? '已出擊' : '可出擊',
                active: !store.isBossDoneToday(),
                cls: 'border-cyan-400 bg-cyan-950/60 text-cyan-300',
                onClick: () => store.setDevResetBoss(),
              },
            ].map((st) => (
              <button
                key={st.id}
                onClick={st.onClick}
                className={`p-1.5 rounded-xl border text-center transition ${
                  st.active
                    ? st.cls + ' ring-1 ring-white/40 font-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-black">{st.label}</div>
                <div className="text-[9px] opacity-80">{st.sub}</div>
              </button>
            ))}
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

      {mainSubTab === 'raid' && (
        <>
          {adventureStep === 'mode_select' && (
            <AdventureModeSelect
              onSelectMode={(mode) => {
                setAdventureMode(mode);
                if (mode === 'squad') {
                  setAdventureStep('squad_confirm');
                } else {
                  setAdventureStep('map');
                }
              }}
              onOpenSubTab={setMainSubTab}
              onOpenLootBag={() => setLootBagOpen(true)}
              onOpenDevCheat={() => setDevCheatOpen((open) => !open)}
            />
          )}

          {adventureStep === 'squad_confirm' && (
            <SquadConfirmScreen
              onBack={() => setAdventureStep('mode_select')}
              onEnterGymIsland={() => setAdventureStep('map')}
              onOpenSquadManage={() => setMainSubTab('squad_invite')}
            />
          )}

          {adventureStep === 'map' && (
            <GymIslandMapScreen
              mode={adventureMode}
              onBack={() => {
                if (adventureMode === 'squad') {
                  setAdventureStep('squad_confirm');
                } else {
                  setAdventureStep('mode_select');
                }
              }}
              onEnterVenueTower={(venueIdx) => {
                setSelectedVenueIdx(venueIdx);
                setAdventureStep('tower');
              }}
            />
          )}

          {adventureStep === 'tower' && (
            <VenueTowerScreen
              venueIndex={selectedVenueIdx}
              mode={adventureMode}
              onBack={() => setAdventureStep('map')}
              onEnterBattle={() => {
                setAdventureStep('battle');
              }}
              onJumpToVenue={(venueIdx) => {
                setSelectedVenueIdx(venueIdx);
              }}
            />
          )}

          {adventureStep === 'battle' && (
            <AdventureRaidPane
              adventureMode={adventureMode}
              onBackToMap={() => setAdventureStep('tower')}
              onAdventureModeChange={setAdventureMode}
              onOpenSubTab={setMainSubTab}
              onOpenLootBag={() => setLootBagOpen(true)}
              onOpenDevCheat={() => setDevCheatOpen((open) => !open)}
            />
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* TAB 1.2: ⚡ 個人戰鬥素質 (獨立分頁：屬性傷害、裝備配裝、討伐生涯戰績) */}
      {/* ================================================================= */}
      {mainSubTab === 'combat_stats' && (
        <div className="space-y-3">
          {/* Header Card with Character Portrait */}
          <div className="retro-box rounded-2xl p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border-2 border-cyan-500/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-cyan-400/50 bg-slate-950 p-1 shrink-0">
                  <AvatarPortraitCanvas
                    bodyStage={store.bodyStage}
                    equipped={store.equipped}
                    size={64}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black">
                      Lv.{store.level} · 戰鬥角色
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 font-bold">
                      🔥 連勝 {store.streakDays} 天加成
                    </span>
                  </div>
                  <h2 className="text-base font-black text-white mt-1">
                    {store.nickname} 的個人戰鬥素質
                  </h2>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => store.setWardrobeModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow"
                >
                  <Shirt className="w-3.5 h-3.5" />
                  <span>衣櫃換裝</span>
                </button>
                <button
                  onClick={() => setMainSubTab('raid')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-black flex items-center gap-1"
                >
                  <Swords className="w-3.5 h-3.5 text-amber-300" />
                  <span>去冒險</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              💡 戰鬥傷害取決於：<strong className="text-emerald-300">真實運動課表完成度</strong>、
              <strong className="text-amber-300">連勝天數</strong>、
              <strong className="text-cyan-300">穿戴配裝屬性</strong>與當日所選運動技能（重訓破甲／有氧魔焰／徒手聚氣）。
            </p>
          </div>

          {/* Section 1: Combat Attribute Breakdown & Damage Ranges */}
          <div className="retro-box rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>各屬性傷害與最大攻擊數值範圍</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-300 font-bold">
                基礎運動力 {baseWorkoutAtk}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1">
                    <span>🥊 物理攻擊屬性</span>
                  </span>
                  <span className="text-xs font-mono font-black text-rose-400 px-2 py-0.5 rounded bg-rose-950/40 border border-rose-500/30">
                    ATK {myPhyAtk}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  重訓【破甲重擊】基傷：<strong className="text-amber-300 font-black">{phyNormalDmg} HP</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  對「弱物理」Boss 自動觸發暴擊放大至 <span className="text-rose-300 font-bold">{(phyNormalDmg * 2.0).toFixed(0)} HP</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1">
                    <span>🪄 魔法攻擊屬性</span>
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30">
                    MATK {myMagAtk}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  有氧【燃脂魔焰】基傷：<strong className="text-cyan-300 font-black">{magNormalDmg} HP</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  隊友破甲後施放享 2.0x 連攜引爆至 <span className="text-cyan-200 font-bold">{(magNormalDmg * 2.0).toFixed(0)} HP</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1">
                    <span>🌪️ 核心暴擊與輔助</span>
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                    SUP {mySupportAtk}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  徒手【聚氣暴擊】基傷：<strong className="text-emerald-300 font-black">{coreNormalDmg} HP</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  全屬性弱點全覆蓋，且享隱藏神裝掉率 <span className="text-emerald-200 font-bold">× 2.0 倍</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <span>🎯 揮拳總傷害數值範圍</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-200 px-1.5 py-0.5 rounded bg-amber-500/20">
                    弱點與連攜極限
                  </span>
                </div>
                <div className="text-sm font-mono font-black text-white">
                  {minAttackDamage.toLocaleString()} ～{' '}
                  <span className="text-amber-300 text-base">
                    {maxSquadComboDamage.toLocaleString()} HP
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  單人弱點極限 {maxSoloCritDamage.toLocaleString()} HP · 戰隊狂暴連攜最高可達 {maxSquadComboDamage.toLocaleString()} HP
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Current Gear Loadout & Buffs */}
          <div className="retro-box rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-cyan-400" />
                <span>目前穿戴配裝清單（5 槽位屬性）</span>
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">
                🎁 收集秘寶：{store.collectedBossLoots.length}/{ADVENTURE_BOSS_CATALOG.length} 件
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {equippedGearDetails.map((g) => (
                <div
                  key={g.slot}
                  onClick={() => store.setWardrobeModalOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {g.slotLabelZh}
                    </span>
                    <span className="text-xs font-black text-white truncate block">
                      {g.nameZh}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-black shrink-0 ${
                      g.statType === 'phy'
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                        : g.statType === 'mag'
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {g.statLabelZh}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Career Adventure Records */}
          <div className="retro-box rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>生涯討伐數據與榮譽紀錄</span>
              </span>
              <button
                onClick={() => setMainSubTab('ladder')}
                className="text-[11px] font-black text-cyan-400 hover:underline"
              >
                查看天梯榜單 ➔
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold">造成最大傷害</div>
                <div className="text-base font-mono font-black text-amber-300">
                  {store.personalMaxDamage.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">單拳最高爆擊</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold">撿尾刀次數</div>
                <div className="text-base font-mono font-black text-rose-400">
                  {store.totalFinalBlows ?? 2} 次
                </div>
                <div className="text-[10px] text-slate-500">Boss 終結斬殺</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold">擊敗 Boss 隻數</div>
                <div className="text-base font-mono font-black text-emerald-400">
                  {store.totalBossesDefeated ?? 3} 隻
                </div>
                <div className="text-[10px] text-slate-500">
                  個人 S.{store.personalMaxStage} · 戰隊 S.{store.squadMaxStage}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold">累計總輸出</div>
                <div className="text-base font-mono font-black text-cyan-300">
                  {((store.totalDamageDealt ?? 6420) / 1000).toFixed(1)}k
                </div>
                <div className="text-[10px] text-slate-500">
                  累計揮拳 {store.totalStrikesCount ?? 11} 次
                </div>
              </div>
            </div>
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
                onClick={() => {
                  setAdventureMode('squad');
                  setMainSubTab('raid');
                }}
                className="retro-btn px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>返回冒險</span>
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
              💡 <strong className="text-amber-300">共鬥規則：</strong>
              組隊由隊長發送邀請連結給現實朋友加入。同一隊伍裡所有人看到的
              <strong className="text-emerald-300">
                「當前關卡 (Stage {store.squadStage})」與「Boss 剩餘血量 ({squadCurrentHp.toLocaleString()} HP)」完全相同
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
                  <div className="text-xs font-mono font-black text-amber-300">{squadInviteCode}</div>
                </div>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(
                        `🛡️ 隊長【${store.nickname}】邀請你加入 FitMon 固定戰隊【${store.squadName}】！我們正在共同討伐 Stage ${store.squadStage}【${squadBossTemplate.nameZh}】（剩餘 ${squadCurrentHp} HP），輸入邀請碼 ${squadInviteCode} 加入同隊一起消磨血量：https://yuchienw.github.io/Fitmon/`
                      );
                    }
                    store.showToast(`📲 已複製隊長邀請連結與邀請碼 ${squadInviteCode}！傳給朋友即可入隊同打一隻王！`);
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
                        (c) =>
                          !store.squadMembers.some(
                            (m) => (resolveFriendProfileId(m.id) || m.id) === c.id
                          )
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
                目標：Stage {store.squadStage} {squadBossTemplate.nameZh}
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
                      {store.isCheckedInToday()
                        ? '✅ 今日已完成運動打卡（可出擊討伐 Boss）'
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
                    onClick={() => store.setInspectMemberId(member.id)}
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
                          <span
                            onClick={(e) => {
                              if (hasFriendProfile(member.id)) {
                                e.stopPropagation();
                                store.setSelectedProfileId(member.id);
                              }
                            }}
                            className={`text-xs font-black text-white break-words ${
                              hasFriendProfile(member.id) ? 'hover:underline cursor-pointer' : ''
                            }`}
                          >
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
                  sub: '有氧飛輪破盾',
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
      {/* TeammateInspectSheet (組隊確認／島／爬塔／我的隊伍清單 共用)          */}
      {/* ================================================================= */}
      {store.inspectMemberId && !(mainSubTab === 'raid' && adventureStep === 'battle') && (
        <TeammateInspectSheet
          memberId={store.inspectMemberId}
          context={
            mainSubTab !== 'raid'
              ? 'list'
              : adventureStep === 'squad_confirm'
              ? 'squad_confirm'
              : adventureStep === 'map'
              ? 'island'
              : adventureStep === 'tower'
              ? 'tower'
              : 'squad_confirm'
          }
          onClose={() => store.setInspectMemberId(null)}
          onNavigateToSquadConfirm={() => {
            store.setInspectMemberId(null);
            setAdventureStep('squad_confirm');
          }}
          onSelectMember={(id) => store.setInspectMemberId(id)}
        />
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
                          setBagLootReport({
                            stage: b.stageNumber,
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
              <img
                src={bossSpriteUrl(bossTemplate.spriteKey)}
                alt={bossTemplate.nameZh}
                className="mx-auto h-24 w-24 object-contain"
              />
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

      {bagLootReport && (
        <div
          className="fixed z-[60]"
          style={{
            top: 'var(--adventure-top-header-h)',
            bottom: 'var(--adventure-bottom-nav-h)',
            left: '50%',
            width: 'min(100vw, 430px)',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="relative h-full w-full">
            <RareLootShareModal report={bagLootReport} onClose={() => setBagLootReport(null)} />
          </div>
        </div>
      )}

    </div>
  );
};
