import React, { useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { WorkoutSessionSportType } from '../../game/workoutRecord';
import { accumulateDayProgress, getSessionDayKey } from '../../game/dayProgress';
import { getLocalDayKey } from '../../game/day';

export interface SportCardItem {
  id: WorkoutSessionSportType;
  name: string;
  threshold: string;
  icon: string;
}

export const SPORT_CARDS: SportCardItem[] = [
  {
    id: 'strength',
    name: '重訓',
    threshold: '課表・2 組以上，組間休息一下',
    icon: '/t4-d4/icon-dumbbell.png',
  },
  {
    id: 'run',
    name: '跑步',
    threshold: '10 分或 1 公里',
    icon: '/t4-d4/icon-run.png',
  },
  {
    id: 'walk',
    name: '快走',
    threshold: '10 分或 1 公里',
    icon: '/t4-d4/icon-walk.png',
  },
  {
    id: 'swim',
    name: '游泳',
    threshold: '10 分或 200 公尺',
    icon: '/t4-d4/icon-swim.png',
  },
  {
    id: 'cycle',
    name: '單車',
    threshold: '10 分或 3 公里',
    icon: '/t4-d4/icon-cycle.png',
  },
  {
    id: 'yoga_stretch',
    name: '瑜珈／伸展',
    threshold: '10 分鐘',
    icon: '/t4-d4/icon-yoga.png',
  },
  {
    id: 'ball',
    name: '球類',
    threshold: '10 分鐘',
    icon: '/t4-d4/icon-ball.png',
  },
  {
    id: 'circuit_hiit',
    name: '循環訓練／HIIT',
    threshold: '10 分鐘',
    icon: '/t4-d4/icon-hiit.png',
  },
  {
    id: 'custom',
    name: '自訂',
    threshold: '10 分鐘',
    icon: '/t4-d4/icon-custom.png',
  },
];

export function getSportName(sportType?: string | null): string {
  switch (sportType) {
    case 'strength':
      return '重訓';
    case 'run':
      return '跑步';
    case 'walk':
      return '快走';
    case 'swim':
      return '游泳';
    case 'cycle':
      return '單車';
    case 'yoga_stretch':
      return '瑜珈／伸展';
    case 'ball':
      return '球類';
    case 'circuit_hiit':
      return '循環訓練／HIIT';
    case 'custom':
      return '自訂';
    default:
      return '運動';
  }
}

export function getSportIcon(sportType?: string | null): string {
  switch (sportType) {
    case 'strength':
      return '/t4-d4/icon-dumbbell.png';
    case 'run':
      return '/t4-d4/icon-run.png';
    case 'walk':
      return '/t4-d4/icon-walk.png';
    case 'swim':
      return '/t4-d4/icon-swim.png';
    case 'cycle':
      return '/t4-d4/icon-cycle.png';
    case 'yoga_stretch':
      return '/t4-d4/icon-yoga.png';
    case 'ball':
      return '/t4-d4/icon-ball.png';
    case 'circuit_hiit':
      return '/t4-d4/icon-hiit.png';
    case 'custom':
      return '/t4-d4/icon-custom.png';
    default:
      return '/t4-d4/icon-dumbbell.png';
  }
}

interface SportTypePickerProps {
  onStartSport?: (sportType: WorkoutSessionSportType) => void;
}

export const SportTypePicker: React.FC<SportTypePickerProps> = ({ onStartSport }) => {
  const store = useGameStore();
  const [selectedType, setSelectedType] = useState<WorkoutSessionSportType>('walk');

  const nowMs = Date.now();
  const todayKey = getLocalDayKey(nowMs);
  const todaySessions = store.workoutHistory.filter(
    (s, idx) => getSessionDayKey(s, idx, nowMs) === todayKey
  );
  const dayProgress = accumulateDayProgress(store.workoutHistory, {
    dayKey: todayKey,
    now: nowMs,
  });

  const handleStartLog = () => {
    store.requestWithDisclaimer(() => {
      if (selectedType === 'strength') {
        store.setWorkoutSubView('strength_hub');
      } else {
        if (onStartSport) {
          onStartSport(selectedType);
        } else {
          // Fallback if not hooked up yet
          store.setWorkoutSubView('strength_hub');
        }
      }
    });
  };

  const handleAfterFact = () => {
    store.showToast('補記功能將在稍後開放');
  };

  return (
    <div data-testid="sport-type-picker" className="p-3.5 space-y-3 text-[#29221E] pb-10">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-black leading-tight text-[#29221E]">
            今天做什麼運動？
          </h1>
          <div className="text-[11.5px] text-[#786B63] mt-0.5">
            任何運動都算，選最接近的就好
          </div>
        </div>
        <span
          style={{
            backgroundColor: '#F4EFE6',
            color: '#786B63',
            borderColor: '#E5DCCB',
          }}
          className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap"
        >
          今天 {Math.min(10, dayProgress.minutes_done)}／10 分
        </span>
      </div>

      {/* 2. 3x3 Card Grid */}
      <div className="grid grid-cols-3 gap-2">
        {SPORT_CARDS.map((card) => {
          const isSelected = selectedType === card.id;
          return (
            <div
              key={card.id}
              data-testid={`sport-type-card-${card.id}`}
              onClick={() => setSelectedType(card.id)}
              style={{
                borderColor: isSelected ? '#FB923C' : '#E5DCCB',
                backgroundColor: isSelected ? '#FFF7EE' : '#FFFFFF',
                boxShadow: isSelected ? '0 3px 0 #F3C29A' : '0 3px 0 #E5DCCB',
              }}
              className="border-[1.5px] rounded-[14px] pt-[7px] px-1 pb-[6px] text-center cursor-pointer transition active:scale-[0.98] relative flex flex-col items-center justify-between min-h-[84px]"
            >
              <img
                src={card.icon}
                alt={card.name}
                className="h-[38px] max-w-[62px] object-contain block mx-auto mb-[3px]"
              />
              <b className="text-[12.5px] font-black leading-tight block text-[#29221E]">
                {card.name}
              </b>
              <span className="text-[9.5px] text-[#786B63] block mt-0.5 leading-snug">
                {card.threshold}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. Small note below cards */}
      <div className="text-[11.5px] text-[#786B63] text-center">
        卡片下的小字是「算數」的門檻：達到其中一個就算，強度不限
      </div>

      {/* 4. Action Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          data-testid="sport-start-log"
          onClick={handleStartLog}
          style={{
            background: 'linear-gradient(#FB923C, #EA580C)',
            boxShadow: '0 4px 0 #B8460A',
          }}
          className="flex-[1.3] py-3 rounded-2xl text-white font-black text-base active:translate-y-0.5 transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          開始記錄
        </button>

        <button
          type="button"
          data-testid="sport-after-fact"
          onClick={handleAfterFact}
          style={{
            backgroundColor: '#FFFDF8',
            borderColor: '#E5DCCB',
            color: '#5C4A3E',
            boxShadow: '0 3px 0 #E5DCCB',
          }}
          className="flex-1 py-3 rounded-2xl border-[1.5px] font-black text-sm active:translate-y-0.5 transition cursor-pointer flex items-center justify-center"
        >
          練完了，補記
        </button>
      </div>

      {/* 5. T4-D7 Sync Note Placeholder */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-[#786B63] pt-0.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F7A55"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M20 12a8 8 0 01-14 5.3M4 12a8 8 0 0114-5.3" />
          <path d="M18 3v4h-4M6 21v-4h4" />
        </svg>
        <span>手錶紀錄？運動完打開 Fitmon 就會同步</span>
      </div>

      {/* 6. Today's Record Card */}
      <div
        style={{
          backgroundColor: '#FFFDF8',
          borderColor: '#E5DCCB',
          boxShadow: '0 4px 0 #D8CCB8',
        }}
        className="mt-2 rounded-2xl border-[1.5px] p-3 text-[#29221E] space-y-2"
      >
        <div className="flex items-center justify-between">
          <b className="text-[13.5px] font-black">今天的紀錄</b>
          <span className="text-[11.5px] font-extrabold text-[#786B63]">
            {Math.min(10, dayProgress.minutes_done)}／10 分
          </span>
        </div>

        {/* 10-bar progress */}
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isFilled = idx < dayProgress.minutes_done;
            return (
              <div
                key={idx}
                style={{
                  background: isFilled
                    ? dayProgress.met
                      ? 'linear-gradient(#6EE7B7, #10B981)'
                      : 'linear-gradient(#FDBA74, #EA580C)'
                    : '#EFE8DC',
                  borderColor: isFilled
                    ? dayProgress.met
                      ? '#059669'
                      : '#C2410C'
                    : '#E5DCCB',
                }}
                className="flex-1 h-3 rounded-[3px] border"
              />
            );
          })}
        </div>

        {/* List of today sessions or empty state */}
        {todaySessions.length === 0 ? (
          <div className="text-[11.5px] text-[#786B63] leading-relaxed pt-0.5">
            還沒有紀錄。一天可以分好幾次，加起來滿 10 分鐘就算數。
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            {todaySessions.map((s, idx) => {
              const durMin = s.durationMinutes || (s.durationSec ? Math.round(s.durationSec / 60) : 0);
              const distText =
                s.distanceM !== undefined && s.distanceM > 0
                  ? s.distanceM >= 1000
                    ? `・${(s.distanceM / 1000).toFixed(1)} 公里`
                    : `・${s.distanceM} 公尺`
                  : s.totalSets
                  ? `・${s.totalSets} 組`
                  : '';
              const icon = getSportIcon(s.sportType);
              const name = getSportName(s.sportType);

              return (
                <div
                  key={s.id || idx}
                  style={{
                    borderColor: '#E5DCCB',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 0 #E5DCCB',
                  }}
                  className="border-[1.5px] rounded-xl p-2.5 flex items-center gap-2.5"
                >
                  <img src={icon} alt="" className="w-8 h-8 object-contain shrink-0" />
                  <div className="flex-1 min-w-0">
                    <b className="text-[13px] font-black block text-[#29221E] truncate">
                      {name}
                    </b>
                    <div className="text-[11px] text-[#786B63] truncate">
                      {durMin} 分鐘{distText}
                    </div>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#F4EFE6',
                      color: '#786B63',
                      borderColor: '#E5DCCB',
                    }}
                    className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0"
                  >
                    已存
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
