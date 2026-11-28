import React from 'react';
import { getLocalDayKey, getWeekKey, getWeekDayKeys, parseDayKey } from '../../game/day';

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface WeekStripProps {
  checkinDayKeys: string[];
  joinDayKey: string;
  now?: number;
  showRookieNote?: boolean;
  restDayKeys?: string[];
  caringDayKeys?: string[];
}

export const WeekStrip: React.FC<WeekStripProps> = ({
  checkinDayKeys,
  joinDayKey,
  now = Date.now(),
  showRookieNote = true,
  restDayKeys = [],
  caringDayKeys = [],
}) => {
  const todayKey = getLocalDayKey(now);
  const currentWeekKey = getWeekKey(todayKey);
  const joinWeekKey = getWeekKey(joinDayKey || todayKey);
  const isRookieWeek = currentWeekKey === joinWeekKey;

  const allWeekDayKeys = getWeekDayKeys(todayKey);
  const checkinSet = new Set(checkinDayKeys || []);
  const restSet = new Set(restDayKeys || []);
  const caringSet = new Set(caringDayKeys || []);

  // For rookie week, hide days before join day
  const visibleDayIndices: number[] = [];
  allWeekDayKeys.forEach((key, idx) => {
    if (!isRookieWeek || key >= joinDayKey) {
      visibleDayIndices.push(idx);
    }
  });

  // Calculate join day Chinese label if rookie week
  let joinDayLabel = '';
  if (isRookieWeek && joinDayKey) {
    const joinDate = parseDayKey(joinDayKey);
    const dayOfWeek = (joinDate.getDay() + 6) % 7;
    joinDayLabel = DAY_LABELS[dayOfWeek] || '';
  }

  return (
    <div className="w-full">
      {/* Indicator Bars */}
      <div className="flex items-center gap-1">
        {visibleDayIndices.map((dayIdx) => {
          const dayKey = allWeekDayKeys[dayIdx];
          const isDone = checkinSet.has(dayKey);
          const isCaring = !isDone && caringSet.has(dayKey);
          const isRest = !isDone && !isCaring && restSet.has(dayKey);
          const isTodayNotChecked = dayKey === todayKey && !isDone && !isRest && !isCaring;

          if (isDone) {
            return (
              <i
                key={dayKey}
                style={{ backgroundColor: '#EA580C' }}
                className="flex-1 h-[9px] rounded-full block"
              />
            );
          }
          if (isRest) {
            return (
              <i
                key={dayKey}
                data-testid="week-day-rest"
                aria-label="休息日"
                style={{
                  background: 'repeating-linear-gradient(45deg, #EFE6D6 0 4px, #F8F2E8 4px 8px)',
                  outline: '1.5px solid #D9CBB5',
                  outlineOffset: '1px',
                }}
                className="flex-1 h-[9px] rounded-full block"
              />
            );
          }
          if (isCaring) {
            return (
              <i
                key={dayKey}
                data-testid="week-day-caring"
                aria-label="照顧身體日"
                style={{
                  backgroundColor: '#F6E9EC',
                  outline: '1.5px solid #E9C9CF',
                  outlineOffset: '1px',
                }}
                className="flex-1 h-[9px] rounded-full block"
              />
            );
          }
          if (isTodayNotChecked) {
            return (
              <i
                key={dayKey}
                style={{
                  backgroundColor: '#F5E0CC',
                  outline: '1.5px dashed #EA580C',
                  outlineOffset: '1px',
                }}
                className="flex-1 h-[9px] rounded-full block"
              />
            );
          }
          return (
            <i
              key={dayKey}
              style={{ backgroundColor: '#E5DCCB' }}
              className="flex-1 h-[9px] rounded-full block"
            />
          );
        })}
      </div>

      {/* Day of Week Labels */}
      <div className="flex items-center gap-1 mt-1">
        {visibleDayIndices.map((dayIdx) => {
          const dayKey = allWeekDayKeys[dayIdx];
          const isDone = checkinSet.has(dayKey);
          const isCaring = !isDone && caringSet.has(dayKey);
          const isRest = !isDone && !isCaring && restSet.has(dayKey);
          const isToday = dayKey === todayKey;

          let labelText = DAY_LABELS[dayIdx];
          let labelColor = isDone || isToday ? '#C2410C' : '#786B63';
          let labelWeight = isToday ? 800 : 700;

          if (isDone) {
            labelText = DAY_LABELS[dayIdx];
            labelColor = '#C2410C';
            labelWeight = isToday ? 800 : 700;
          } else if (isRest) {
            labelText = '休';
            labelColor = '#6B5B4E';
            labelWeight = 800;
          } else if (isCaring) {
            labelText = DAY_LABELS[dayIdx];
            labelColor = '#8E3B4C';
            labelWeight = 800;
          }

          return (
            <span
              key={dayKey}
              style={{
                color: labelColor,
                fontWeight: labelWeight,
              }}
              className="flex-1 text-center text-[9.5px]"
            >
              {labelText}
            </span>
          );
        })}
      </div>

      {/* Rookie note if applicable */}
      {isRookieWeek && showRookieNote && (
        <div className="text-[11px] text-[#786B63] mt-1 text-left">
          {joinDayLabel ? `本週從加入日（${joinDayLabel}）起算` : '本週從加入日起算'}
        </div>
      )}
    </div>
  );
};
