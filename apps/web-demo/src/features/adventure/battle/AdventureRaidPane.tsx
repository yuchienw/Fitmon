import React, { useEffect, useRef, useState } from 'react';
import { ADVENTURE_BOSS_CATALOG } from '../../../config/catalogConfig';
import { loadBossSprite } from '../../../game/pixelSpriteDrawer';
import { resolveSquadMemberAvatar, useGameStore } from '../../../stores/useGameStore';
import { RareLootShareModal } from '../share/RareLootShareModal';
import { RareLootPosterData, VictoryPosterData } from '../share/types';
import { VictoryShareModal } from '../share/VictoryShareModal';
import { BattleHud } from './BattleHud';
import { bossForStage, displayedBossMaxHp } from './bossView';
import {
  BattleStageCanvas,
  BOSS_HIT_MS,
  FLOAT_MS,
  LUNGE_MS,
  StrikeFloat,
  TeammateDrawConfig,
} from './BattleStageCanvas';
import { SkillDeck } from './SkillDeck';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface AdventureRaidPaneProps {
  adventureMode: 'solo' | 'squad';
  onBackToMap: () => void;
  onAdventureModeChange?: (mode: 'solo' | 'squad') => void;
  onOpenSubTab: (tab: 'combat_stats' | 'squad_invite' | 'ladder') => void;
  onOpenLootBag: () => void;
  onOpenDevCheat: () => void;
}

export const AdventureRaidPane: React.FC<AdventureRaidPaneProps> = ({
  adventureMode,
  onBackToMap,
  onOpenSubTab,
  onOpenLootBag,
  onOpenDevCheat,
}) => {
  const store = useGameStore();
  const reducedMotion = usePrefersReducedMotion();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [phase, setPhase] = useState<'idle' | 'lunge' | 'hit'>('idle');
  const [lungeAt, setLungeAt] = useState<number | null>(null);
  const [hitAt, setHitAt] = useState<number | null>(null);
  const [floatHit, setFloatHit] = useState<StrikeFloat | null>(null);
  const [victory, setVictory] = useState<VictoryPosterData | null>(null);
  const [loot, setLoot] = useState<RareLootPosterData | null>(null);
  const timeouts = useRef<number[]>([]);

  useEffect(() => {
    store.setPeekMemberId(null);
    store.setInspectMemberId(null);
    return () => {
      store.setPeekMemberId(null);
      store.setInspectMemberId(null);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    ADVENTURE_BOSS_CATALOG.forEach((boss) => {
      void loadBossSprite(boss.spriteKey).catch(() => undefined);
    });
    return () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeouts.current.push(id);
  };

  const isSolo = adventureMode === 'solo';
  const stage = isSolo ? store.soloStage : store.squadStage;
  const boss = bossForStage(stage);
  const maxHp = displayedBossMaxHp(boss, stage, adventureMode);
  const currentHp = Math.min(maxHp, isSolo ? store.soloBossHp : store.squadBossHp);

  const teammates: TeammateDrawConfig[] = isSolo
    ? []
    : store.squadMembers.slice(0, 3).map((m) => {
        const avatar = resolveSquadMemberAvatar(m);
        return {
          id: m.id,
          nameZh: m.nameZh,
          avatarStatus: avatar.status,
          bodyStage: avatar.bodyStage,
          equipped: avatar.equipped,
          hasWorkedOutToday: m.hasWorkedOutToday,
        };
      });

  const strike = () => {
    if (phase !== 'idle') return;
    if (!store.isCheckedInToday()) {
      store.setCheckinSheetOpen(true);
      return;
    }
    if (store.isBossDoneToday()) {
      store.showToast('今天已出擊，明天 00:00 再來');
      return;
    }

    const stageBefore = stage;
    const bossBefore = boss;
    const lungeMs = reducedMotion ? 0 : LUNGE_MS;
    setPhase('lunge');
    setLungeAt(performance.now());
    later(() => {
      const result = store.bossAttack(adventureMode);
      setPhase('hit');
      setHitAt(performance.now());
      later(() => setPhase('idle'), BOSS_HIT_MS);
      if (!result) return;
      setFloatHit({
        id: Date.now(),
        damage: result.damage,
        isCrit: result.isCrit,
        droppedLootName: result.droppedLootName,
      });
      later(() => setFloatHit(null), FLOAT_MS);
      if (result.defeated) {
        later(() => {
          setVictory({
            clearedStage: stageBefore,
            stage: stageBefore,
            boss: bossBefore,
            finalBlowDamage: result.damage,
            attackTypeLabel: result.attackTypeLabel,
            droppedLootName: result.droppedLootName || bossBefore.hiddenLoot.nameZh,
          });
        }, FLOAT_MS);
      } else if (result.droppedLootName) {
        later(() => {
          setLoot({
            stage: stageBefore,
            boss: bossBefore,
            strikeDamage: result.damage,
          });
        }, FLOAT_MS);
      }
    }, lungeMs);
  };

  return (
    <div className="adventure-shell relative flex h-full min-h-0 flex-1 flex-col" data-testid="adventure-battle">
      <BattleStageCanvas
        boss={boss}
        bodyStage={store.bodyStage}
        equipped={store.equipped}
        teammates={teammates}
        phase={phase}
        lungeAt={lungeAt}
        hitAt={hitAt}
        reducedMotion={reducedMotion}
        floatHit={floatHit}
        hud={
          <BattleHud
            stage={stage}
            mode={adventureMode}
            boss={boss}
            currentHp={currentHp}
            maxHp={maxHp}
            armorBreak={store.activeTeamComboBuff === 'armor_break'}
            onBackToMap={onBackToMap}
            onOpenSubTab={onOpenSubTab}
            onOpenLootBag={onOpenLootBag}
            onOpenDevCheat={onOpenDevCheat}
          />
        }
      />
      <SkillDeck
        sport={store.todaySportType}
        checkedIn={store.isCheckedInToday()}
        bossDone={store.isBossDoneToday()}
        nextResetAt={store.getNextResetAt()}
        busy={phase !== 'idle'}
        onSport={store.setTodaySportType}
        onStrike={strike}
      />
      {victory && <VictoryShareModal report={victory} onClose={() => setVictory(null)} />}
      {loot && <RareLootShareModal report={loot} onClose={() => setLoot(null)} />}
    </div>
  );
};
