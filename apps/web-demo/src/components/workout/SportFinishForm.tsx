import React, { useState } from 'react';
import { useGameStore, ActiveSportSessionDraft, SaveSportSessionInput } from '../../stores/useGameStore';
import { WorkoutSessionSportType } from '../../game/workoutRecord';
import { getSportIcon, getSportName, SPORT_CARDS } from './SportTypePicker';
import { getLocalDayKey } from '../../game/day';
import { accumulateDayProgress } from '../../game/dayProgress';
import {
  evaluateImplausibleSession,
  type ImplausibleEvaluationResult,
} from '../../game/implausibleCapsEvaluator';
import { ImplausibleSheet } from '../modals/ImplausibleSheet';
import { WalkToRunSheet } from '../modals/WalkToRunSheet';

interface SportFinishFormProps {
  draft: ActiveSportSessionDraft;
  onCancel: () => void;
}

const BALL_KINDS = ['羽球', '籃球', '網球', '桌球', '足球', '排球', '棒壘球', '其他'];

const INTENSITY_OPTIONS: { id: '輕鬆' | '中等' | '喘喘'; label: string }[] = [
  { id: '輕鬆', label: '輕鬆：還能唱歌。' },
  { id: '中等', label: '中等：能說話，但不能唱歌。' },
  { id: '喘喘', label: '喘喘：說不出完整的句子。' },
];

export const SportFinishForm: React.FC<SportFinishFormProps> = ({ draft, onCancel }) => {
  const store = useGameStore();

  const [currentSportType, setCurrentSportType] = useState<WorkoutSessionSportType>(draft.sportType);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);

  // Duration in minutes
  const initialDurationMin =
    draft.durationSec > 0 ? Math.max(1, Math.round(draft.durationSec / 60)) : 10;
  const [durationMin, setDurationMin] = useState<number>(initialDurationMin);

  // Distance input
  const initialDistStr =
    draft.distanceM && draft.distanceM > 0
      ? draft.sportType === 'swim'
        ? draft.distanceM.toString()
        : (draft.distanceM / 1000).toString()
      : '';
  const [distanceStr, setDistanceStr] = useState<string>(initialDistStr);

  // Custom name & Ball kind
  const [customName, setCustomName] = useState<string>(draft.customName || '');
  const [ballKind, setBallKind] = useState<string>(draft.ballKind || '');

  // Intensity
  const [intensity, setIntensity] = useState<'輕鬆' | '中等' | '喘喘' | null>(
    draft.intensity || null
  );

  // Sheet states for T4-D6 checks
  const [implausibleSheetState, setImplausibleSheetState] = useState<{
    isOpen: boolean;
    evaluation: ImplausibleEvaluationResult | null;
    sessionSummary?: {
      durationMinutes?: number;
      distanceKm?: number;
      sportType?: string;
    };
  }>({ isOpen: false, evaluation: null });

  const [walkToRunSheetState, setWalkToRunSheetState] = useState<{
    isOpen: boolean;
    evaluation: ImplausibleEvaluationResult | null;
  }>({ isOpen: false, evaluation: null });

  const nowMs = Date.now();
  const todayKey = getLocalDayKey(nowMs);
  const isAlreadyCheckedInToday = store.checkinDayKeys.includes(todayKey);
  const priorDayProgress = accumulateDayProgress(store.workoutHistory, {
    dayKey: todayKey,
    now: nowMs,
  });

  const isRunOrWalk = currentSportType === 'run' || currentSportType === 'walk';
  const isCycle = currentSportType === 'cycle';
  const isSwim = currentSportType === 'swim';
  const hasDistance = isRunOrWalk || isCycle || isSwim;

  // Numerical distance calculation
  const distanceNum = parseFloat(distanceStr) || 0;
  let distanceM = 0;
  if (isSwim) {
    distanceM = Math.round(distanceNum);
  } else if (hasDistance) {
    distanceM = Math.round(distanceNum * 1000);
  }

  // Calculate live average speed if distance & duration available
  let avgSpeedKmH: number | null = null;
  if (hasDistance && distanceM > 0 && durationMin > 0) {
    const hours = durationMin / 60;
    const km = distanceM / 1000;
    avgSpeedKmH = Math.round((km / hours) * 10) / 10;
  }

  // Threshold check for result strip
  const totalMinutesToday = priorDayProgress.minutes_done + durationMin;
  const isTimeMet = durationMin >= 10 || totalMinutesToday >= 10;
  let isDistanceMet = false;
  if (isRunOrWalk) isDistanceMet = distanceM >= 1000;
  else if (isCycle) isDistanceMet = distanceM >= 3000;
  else if (isSwim) isDistanceMet = distanceM >= 200;

  const isMet = isTimeMet || isDistanceMet;

  // Result strip text
  const getMetThresholdText = () => {
    switch (currentSportType) {
      case 'run':
      case 'walk':
        return '滿 10 分鐘或 1 公里';
      case 'swim':
        return '滿 10 分鐘或 200 公尺';
      case 'cycle':
        return '滿 10 分鐘或 3 公里';
      default:
        return '滿 10 分鐘';
    }
  };

  const executeSave = (sportToSave: WorkoutSessionSportType = currentSportType) => {
    const finalSec =
      draft.durationSec > 0 && Math.round(draft.durationSec / 60) === durationMin
        ? draft.durationSec
        : durationMin * 60;

    const sessionInput: SaveSportSessionInput = {
      sportType: sportToSave,
      durationMinutes: durationMin,
      durationSec: finalSec,
      distanceM: distanceM > 0 ? distanceM : undefined,
      pauseSegments: draft.pauseSegments || [],
      customName: sportToSave === 'custom' ? customName.trim() : undefined,
      ballKind: sportToSave === 'ball' ? ballKind || undefined : undefined,
      exerciseList: draft.exerciseList,
      intensity: intensity || undefined,
      venue: draft.venue,
      startedAt: draft.startedAt,
      loggingMode: 'live_focus',
    };

    store.saveSportSession(sessionInput);
  };

  const handleSave = () => {
    if (currentSportType === 'custom' && !customName.trim()) {
      store.showToast('請輸入活動名稱');
      return;
    }

    const finalSec =
      draft.durationSec > 0 && Math.round(draft.durationSec / 60) === durationMin
        ? draft.durationSec
        : durationMin * 60;

    // T4-D6: Run implausible check before saving
    const evaluation = evaluateImplausibleSession(
      {
        sportType: currentSportType,
        totalDurationSec: finalSec,
        durationSec: finalSec,
        distanceM: distanceM > 0 ? distanceM : undefined,
        sets: [],
        totalSets: 0,
        timestamp: Date.now(),
      },
      {
        otherDaySessions: store.workoutHistory,
      }
    );

    if (evaluation.flagReason !== null) {
      setImplausibleSheetState({
        isOpen: true,
        evaluation,
        sessionSummary: {
          durationMinutes: durationMin,
          distanceKm: distanceM > 0 ? Math.round((distanceM / 1000) * 10) / 10 : undefined,
          sportType: currentSportType,
        },
      });
      return;
    }

    if (evaluation.suggestSportType === 'run') {
      setWalkToRunSheetState({
        isOpen: true,
        evaluation,
      });
      return;
    }

    executeSave(currentSportType);
  };

  return (
    <div data-testid="sport-finish" className="p-3.5 space-y-3.5 text-[#29221E] pb-10">
      {/* 1. Header with Type & "換類型" */}
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
          boxShadow: '0 3px 0 #D8CCB8',
        }}
        className="rounded-2xl border-[1.5px] p-2.5 flex items-center gap-2.5 relative"
      >
        <img
          src={getSportIcon(currentSportType)}
          alt=""
          className="h-8 max-w-[44px] object-contain shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-black text-[15px] leading-tight text-[#29221E]">
            {getSportName(currentSportType)}
            {draft.venue === 'treadmill'
              ? '・跑步機'
              : draft.venue === 'indoor_bike'
              ? '・室內飛輪'
              : ''}
          </div>
          <div className="text-[11.5px] text-[#786B63] mt-0.5">紀錄完成</div>
        </div>

        <button
          type="button"
          onClick={() => setIsTypePickerOpen(!isTypePickerOpen)}
          className="text-[12.5px] font-black text-[#C2410C] hover:underline cursor-pointer px-1 py-0.5"
        >
          換類型
        </button>

        {/* Inline Type Dropdown */}
        {isTypePickerOpen && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E5DCCB',
              boxShadow: '0 4px 12px rgba(41, 34, 30, 0.15)',
            }}
            className="absolute top-full right-2 mt-1 z-30 rounded-xl border-[1.5px] p-2 grid grid-cols-2 gap-1.5 w-48"
          >
            {SPORT_CARDS.filter((c) => c.id !== 'strength').map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCurrentSportType(c.id);
                  setIsTypePickerOpen(false);
                }}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left text-xs font-black transition ${
                  currentSportType === c.id
                    ? 'bg-[#FFF7EE] text-[#C2410C] border border-[#FB923C]'
                    : 'text-[#29221E] hover:bg-[#F4EFE6]'
                }`}
              >
                <img src={c.icon} alt="" className="w-5 h-5 object-contain" />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Custom Name Input if custom */}
      {currentSportType === 'custom' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E5DCCB',
          }}
          className="border-[1.5px] rounded-2xl p-3 space-y-1.5"
        >
          <label className="text-[11.5px] font-extrabold text-[#786B63] block">
            活動名稱（必填）
          </label>
          <input
            type="text"
            placeholder="例如：爬山、跳舞、攀岩..."
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5DCCB] text-[#29221E] focus:outline-none focus:border-[#FB923C]"
          />
        </div>
      )}

      {/* 3. Ball Kind Chips if ball */}
      {currentSportType === 'ball' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E5DCCB',
          }}
          className="border-[1.5px] rounded-2xl p-3 space-y-2"
        >
          <label className="text-[11.5px] font-extrabold text-[#786B63] block">
            球種（可不填）
          </label>
          <div className="flex flex-wrap gap-1.5">
            {BALL_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setBallKind(ballKind === kind ? '' : kind)}
                style={{
                  backgroundColor: ballKind === kind ? '#FFF7EE' : '#F4EFE6',
                  color: ballKind === kind ? '#C2410C' : '#5C4A3E',
                  borderColor: ballKind === kind ? '#FB923C' : '#E5DCCB',
                }}
                className="text-xs font-black px-2.5 py-1 rounded-xl border transition"
              >
                {kind}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Core Form Fields: Duration & Distance */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E5DCCB',
        }}
        className="border-[1.5px] rounded-2xl p-3.5 space-y-3"
      >
        {/* Duration Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-extrabold text-[#786B63]">時長</span>
            <span className="text-[11px] text-[#A8988B]">分鐘</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              data-testid="sport-finish-duration"
              type="number"
              min={1}
              value={durationMin || ''}
              onChange={(e) => setDurationMin(Math.max(1, parseInt(e.target.value) || 0))}
              className="flex-1 px-3 py-2.5 text-base font-black font-mono rounded-xl border border-[#E5DCCB] text-[#29221E] focus:outline-none focus:border-[#FB923C]"
            />
            <span className="text-sm font-black text-[#5C4A3E]">分鐘</span>
          </div>
        </div>

        {/* Distance Input (if applicable) */}
        {hasDistance && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-extrabold text-[#786B63]">
                距離{isSwim ? '（可不填或游完填）' : '（可不填）'}
              </span>
              <span className="text-[11px] text-[#A8988B]">
                {isSwim ? '公尺' : '公里 (km)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                data-testid="sport-finish-distance"
                type="number"
                step="any"
                min={0}
                placeholder={isSwim ? '例如 200' : '例如 1.5'}
                value={distanceStr}
                onChange={(e) => setDistanceStr(e.target.value)}
                className="flex-1 px-3 py-2.5 text-base font-black font-mono rounded-xl border border-[#E5DCCB] text-[#29221E] focus:outline-none focus:border-[#FB923C]"
              />
              <span className="text-sm font-black text-[#5C4A3E]">
                {isSwim ? '公尺' : '公里'}
              </span>
            </div>
          </div>
        )}

        {/* Live Average Speed Display */}
        {avgSpeedKmH !== null && (
          <div
            style={{
              backgroundColor: '#F4EFE6',
              borderColor: '#E5DCCB',
            }}
            className="rounded-xl border p-2 text-center"
          >
            <span className="text-xs font-black text-[#29221E]">
              平均時速 {avgSpeedKmH} 公里
            </span>
          </div>
        )}
      </div>

      {/* 5. Intensity 3 chips */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E5DCCB',
        }}
        className="border-[1.5px] rounded-2xl p-3 space-y-2"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-extrabold text-[#786B63]">
            強度（可不填）
          </span>
          <span className="text-[10.5px] text-[#A8988B]">不影響經驗</span>
        </div>
        <div className="space-y-1.5">
          {INTENSITY_OPTIONS.map((opt) => {
            const isSelected = intensity === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIntensity(isSelected ? null : opt.id)}
                style={{
                  backgroundColor: isSelected ? '#FFF7EE' : '#FAF6F0',
                  borderColor: isSelected ? '#FB923C' : '#E5DCCB',
                  color: isSelected ? '#C2410C' : '#5C4A3E',
                }}
                className="w-full text-left px-3 py-2 rounded-xl border-[1.5px] text-xs font-bold transition flex items-center justify-between"
              >
                <span>{opt.label}</span>
                {isSelected && <span className="text-[#FB923C] font-black">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Result Strip (三種結果條原文) */}
      <div
        style={{
          backgroundColor: isAlreadyCheckedInToday
            ? '#FEF3C7'
            : isMet
            ? '#E8F5EE'
            : '#FEF3C7',
          borderColor: isAlreadyCheckedInToday
            ? '#FDE68A'
            : isMet
            ? '#B9E3CF'
            : '#FDE68A',
          color: isAlreadyCheckedInToday
            ? '#92400E'
            : isMet
            ? '#065F46'
            : '#92400E',
        }}
        className="rounded-2xl border-[1.5px] p-3 text-center text-xs font-extrabold leading-snug"
      >
        {isAlreadyCheckedInToday ? (
          <span>今天已經打卡了，這筆會存進紀錄，不會重複發獎勵</span>
        ) : isMet ? (
          <span>這筆算數：{getMetThresholdText()}</span>
        ) : (
          <span>
            這筆會存好。今天再動{' '}
            {Math.max(1, 10 - priorDayProgress.minutes_done - durationMin)} 分鐘就算數
          </span>
        )}
      </div>

      {/* 7. Action Button */}
      <div className="pt-1">
        <button
          type="button"
          data-testid="sport-finish-save"
          onClick={handleSave}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="w-full py-3.5 rounded-2xl text-white font-black text-[17px] active:translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          存下紀錄
        </button>
      </div>

      {/* T4-D6 Evaluation Sheets */}
      <ImplausibleSheet
        isOpen={implausibleSheetState.isOpen}
        evaluation={implausibleSheetState.evaluation}
        sessionSummary={implausibleSheetState.sessionSummary}
        onEdit={() => setImplausibleSheetState({ isOpen: false, evaluation: null })}
        onSaveAnyway={() => {
          setImplausibleSheetState({ isOpen: false, evaluation: null });
          executeSave(currentSportType);
        }}
      />

      <WalkToRunSheet
        isOpen={walkToRunSheetState.isOpen}
        evaluation={walkToRunSheetState.evaluation}
        onChangeToRun={() => {
          setWalkToRunSheetState({ isOpen: false, evaluation: null });
          store.showToast('已改成跑步，這筆照樣算數');
          executeSave('run');
        }}
        onKeepWalk={() => {
          setWalkToRunSheetState({ isOpen: false, evaluation: null });
          executeSave('walk');
        }}
      />
    </div>
  );
};
