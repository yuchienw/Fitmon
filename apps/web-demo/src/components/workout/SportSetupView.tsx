import React, { useState } from 'react';
import { useGameStore, ActiveSportSessionDraft } from '../../stores/useGameStore';
import { WorkoutSessionSportType } from '../../game/workoutRecord';
import { getSportIcon, getSportName } from './SportTypePicker';

interface SportSetupViewProps {
  sportType: WorkoutSessionSportType;
  onBack: () => void;
  onStartLive: (draft: ActiveSportSessionDraft) => void;
  onDirectInput: (draft: ActiveSportSessionDraft) => void;
}

export const SportSetupView: React.FC<SportSetupViewProps> = ({
  sportType,
  onBack,
  onStartLive,
  onDirectInput,
}) => {
  const store = useGameStore();

  // Mode: 'live' (邊跑邊計時) vs 'direct' (跑完直接輸入)
  const [recordMode, setRecordMode] = useState<'live' | 'direct'>('live');

  // Venue state
  const isRunOrWalk = sportType === 'run' || sportType === 'walk';
  const isCycle = sportType === 'cycle';
  const isSwim = sportType === 'swim';

  const [runWalkVenue, setRunWalkVenue] = useState<'outdoor' | 'treadmill'>('outdoor');
  const [cycleVenue, setCycleVenue] = useState<'outdoor' | 'indoor_bike'>('outdoor');
  const [poolLength, setPoolLength] = useState<25 | 50>(25);

  const getThresholdText = () => {
    switch (sportType) {
      case 'run':
      case 'walk':
        return '滿 10 分鐘或 1 公里就算數';
      case 'swim':
        return '滿 10 分鐘或 200 公尺就算數';
      case 'cycle':
        return '滿 10 分鐘或 3 公里就算數';
      default:
        return '滿 10 分鐘就算數';
    }
  };

  const getCanvasBg = () => {
    switch (sportType) {
      case 'run':
        return '/t4-d4/px-track.png';
      case 'cycle':
        return '/t4-d4/px-road.png';
      case 'swim':
        return '/t4-d4/px-pool.png';
      case 'circuit_hiit':
        return '/t4-d4/px-gym.png';
      case 'ball':
        return '/t4-d4/px-court.png';
      case 'yoga_stretch':
        return '/t4-d4/px-yoga.png';
      default:
        return '/t4-d4/px-field.png';
    }
  };

  const getSubHint = () => {
    if (isRunOrWalk) return '距離可以跑完再填，不填也可以';
    if (isCycle) return cycleVenue === 'indoor_bike' ? '飛輪沒有距離也沒關係' : '距離可以騎完再填，不填也可以';
    if (isSwim) return '距離可以游完再填，或用趟數快速計算';
    return '時長可以做完再填，隨時可以結束';
  };

  const handleStart = () => {
    let resolvedVenue: ActiveSportSessionDraft['venue'] = undefined;
    if (isRunOrWalk) resolvedVenue = runWalkVenue;
    else if (isCycle) resolvedVenue = cycleVenue;
    else if (isSwim) resolvedVenue = poolLength === 25 ? 'pool_25' : 'pool_50';

    const draft: ActiveSportSessionDraft = {
      sportType,
      venue: resolvedVenue,
      loggingMode: 'live_focus',
      startedAt: Date.now(),
      durationSec: 0,
      distanceM: 0,
      poolLengthM: isSwim ? poolLength : undefined,
      pauseSegments: [],
      isPaused: false,
    };

    if (recordMode === 'direct') {
      onDirectInput(draft);
    } else {
      onStartLive(draft);
    }
  };

  return (
    <div data-testid="sport-setup" className="p-3.5 space-y-3.5 text-[#29221E] pb-10">
      {/* 1. Focus Top Bar */}
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
          boxShadow: '0 3px 0 #D8CCB8',
        }}
        className="rounded-2xl border-[1.5px] p-2.5 flex items-center gap-2.5"
      >
        <img
          src={getSportIcon(sportType)}
          alt=""
          className="h-8 max-w-[44px] object-contain"
        />
        <div className="flex-1 min-w-0">
          <div className="font-black text-[15px] leading-tight text-[#29221E]">
            {getSportName(sportType)}
          </div>
          <div className="text-[11.5px] text-[#786B63] mt-0.5">
            {getThresholdText()}
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-[12.5px] font-black text-[#C2410C] hover:underline cursor-pointer px-1 py-0.5"
        >
          換類型
        </button>
      </div>

      {/* 2. Pixel Canvas Preview */}
      <div
        style={{
          borderColor: '#29221E',
          boxShadow: '0 4px 0 #D8CCB8',
        }}
        className="relative h-48 rounded-2xl overflow-hidden border-2"
      >
        <img
          src={getCanvasBg()}
          alt=""
          className="absolute inset-0 w-full h-full object-cover image-pixelated"
        />
        <img
          src="/t4-d4/hero-idle.png"
          alt=""
          className="absolute left-1/2 -translate-x-1/2 bottom-1.5 h-[150px] object-contain"
        />
      </div>

      {/* 3. Record Mode Toggle (邊動邊計時 / 結束直接輸入) */}
      <div>
        <div className="text-[11.5px] font-extrabold text-[#786B63] mb-1">
          怎麼記？
        </div>
        <div
          style={{
            backgroundColor: '#F4EFE6',
            borderColor: '#E5DCCB',
          }}
          className="flex border-[1.5px] rounded-xl p-1 gap-1"
        >
          <button
            type="button"
            onClick={() => setRecordMode('live')}
            style={{
              backgroundColor: recordMode === 'live' ? '#FFFFFF' : 'transparent',
              color: recordMode === 'live' ? '#C2410C' : '#786B63',
              boxShadow: recordMode === 'live' ? '0 2px 0 #E5DCCB' : 'none',
            }}
            className="flex-1 py-1.5 rounded-lg text-[12.5px] font-extrabold text-center transition cursor-pointer"
          >
            {sportType === 'run'
              ? '邊跑邊計時'
              : sportType === 'walk'
              ? '邊走邊計時'
              : sportType === 'cycle'
              ? '邊騎邊計時'
              : '邊動邊計時'}
          </button>
          <button
            type="button"
            onClick={() => setRecordMode('direct')}
            style={{
              backgroundColor: recordMode === 'direct' ? '#FFFFFF' : 'transparent',
              color: recordMode === 'direct' ? '#C2410C' : '#786B63',
              boxShadow: recordMode === 'direct' ? '0 2px 0 #E5DCCB' : 'none',
            }}
            className="flex-1 py-1.5 rounded-lg text-[12.5px] font-extrabold text-center transition cursor-pointer"
          >
            {sportType === 'run'
              ? '跑完直接輸入'
              : sportType === 'walk'
              ? '走完直接輸入'
              : sportType === 'cycle'
              ? '騎完直接輸入'
              : '練完直接輸入'}
          </button>
        </div>
      </div>

      {/* 4. Venue Option Field */}
      {(isRunOrWalk || isCycle || isSwim) && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E5DCCB',
          }}
          className="border-[1.5px] rounded-2xl p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-extrabold text-[#786B63]">
              {isSwim ? '泳池規格' : '場地'}
            </span>

            {isRunOrWalk && (
              <div
                style={{
                  backgroundColor: '#F4EFE6',
                  borderColor: '#E5DCCB',
                }}
                className="flex border-[1.5px] rounded-xl p-0.5 w-[170px]"
              >
                <button
                  type="button"
                  onClick={() => setRunWalkVenue('outdoor')}
                  style={{
                    backgroundColor: runWalkVenue === 'outdoor' ? '#FFFFFF' : 'transparent',
                    color: runWalkVenue === 'outdoor' ? '#C2410C' : '#786B63',
                    boxShadow: runWalkVenue === 'outdoor' ? '0 2px 0 #E5DCCB' : 'none',
                  }}
                  className="flex-1 py-1 text-xs font-black rounded-lg transition"
                >
                  戶外
                </button>
                <button
                  type="button"
                  onClick={() => setRunWalkVenue('treadmill')}
                  style={{
                    backgroundColor: runWalkVenue === 'treadmill' ? '#FFFFFF' : 'transparent',
                    color: runWalkVenue === 'treadmill' ? '#C2410C' : '#786B63',
                    boxShadow: runWalkVenue === 'treadmill' ? '0 2px 0 #E5DCCB' : 'none',
                  }}
                  className="flex-1 py-1 text-xs font-black rounded-lg transition"
                >
                  跑步機
                </button>
              </div>
            )}

            {isCycle && (
              <div
                style={{
                  backgroundColor: '#F4EFE6',
                  borderColor: '#E5DCCB',
                }}
                className="flex border-[1.5px] rounded-xl p-0.5 w-[170px]"
              >
                <button
                  type="button"
                  onClick={() => setCycleVenue('outdoor')}
                  style={{
                    backgroundColor: cycleVenue === 'outdoor' ? '#FFFFFF' : 'transparent',
                    color: cycleVenue === 'outdoor' ? '#C2410C' : '#786B63',
                    boxShadow: cycleVenue === 'outdoor' ? '0 2px 0 #E5DCCB' : 'none',
                  }}
                  className="flex-1 py-1 text-xs font-black rounded-lg transition"
                >
                  戶外
                </button>
                <button
                  type="button"
                  onClick={() => setCycleVenue('indoor_bike')}
                  style={{
                    backgroundColor: cycleVenue === 'indoor_bike' ? '#FFFFFF' : 'transparent',
                    color: cycleVenue === 'indoor_bike' ? '#C2410C' : '#786B63',
                    boxShadow: cycleVenue === 'indoor_bike' ? '0 2px 0 #E5DCCB' : 'none',
                  }}
                  className="flex-1 py-1 text-xs font-black rounded-lg transition"
                >
                  室內飛輪
                </button>
              </div>
            )}

            {isSwim && (
              <div
                style={{
                  backgroundColor: '#F4EFE6',
                  borderColor: '#E5DCCB',
                }}
                className="flex border-[1.5px] rounded-xl p-0.5 w-[170px]"
              >
                <button
                  type="button"
                  onClick={() => setPoolLength(25)}
                  style={{
                    backgroundColor: poolLength === 25 ? '#FFFFFF' : 'transparent',
                    color: poolLength === 25 ? '#C2410C' : '#786B63',
                    boxShadow: poolLength === 25 ? '0 2px 0 #E5DCCB' : 'none',
                  }}
                  className="flex-1 py-1 text-xs font-black rounded-lg transition"
                >
                  25 公尺
                </button>
                <button
                  type="button"
                  onClick={() => setPoolLength(50)}
                  style={{
                    backgroundColor: poolLength === 50 ? '#FFFFFF' : 'transparent',
                    color: poolLength === 50 ? '#C2410C' : '#786B63',
                    boxShadow: poolLength === 50 ? '0 2px 0 #E5DCCB' : 'none',
                  }}
                  className="flex-1 py-1 text-xs font-black rounded-lg transition"
                >
                  50 公尺
                </button>
              </div>
            )}
          </div>

          <div className="text-[11.5px] text-[#786B63] mt-1.5">
            {getSubHint()}
          </div>
        </div>
      )}

      {/* 5. Start Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleStart}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="w-full py-3.5 rounded-2xl text-white font-black text-[17px] active:translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          {recordMode === 'live' ? '開始計時' : '直接輸入'}
        </button>
      </div>
    </div>
  );
};
