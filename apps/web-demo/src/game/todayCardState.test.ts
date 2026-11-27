import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTodayHeroCardState,
  formatTodaySessionSummary,
  type TodaySessionInput,
} from './todayCardState.ts';

describe('T1-D3 TodayHeroCard State Decisions & Summary (todayCardState)', () => {
  describe('getTodayHeroCardState', () => {
    test('idle: 今天尚未打卡且當日無運動紀錄', () => {
      const state = getTodayHeroCardState({
        checkedIn: false,
        bossDone: false,
        daySessionsCount: 0,
      });
      assert.equal(state, 'idle');
    });

    test('progress: 尚未打卡，但當天已有紀錄且尚未達標', () => {
      const state = getTodayHeroCardState({
        checkedIn: false,
        bossDone: false,
        daySessionsCount: 1,
        dayProgressMet: false,
      });
      assert.equal(state, 'progress');
    });

    test('ready: 當天已打卡且尚未出擊 (一般達標後有紀錄)', () => {
      const state = getTodayHeroCardState({
        checkedIn: true,
        bossDone: false,
        daySessionsCount: 1,
        dayProgressMet: true,
      });
      assert.equal(state, 'ready');
    });

    test('ready: 舊存檔當天已用舊路徑拿過獎（無當日運動紀錄但 checkedIn=true），不收回走 ready', () => {
      const state = getTodayHeroCardState({
        checkedIn: true,
        bossDone: false,
        daySessionsCount: 0,
      });
      assert.equal(state, 'ready');
    });

    test('sortied: 當天已打卡且已完成 Boss 出擊', () => {
      const state = getTodayHeroCardState({
        checkedIn: true,
        bossDone: true,
        daySessionsCount: 1,
        dayProgressMet: true,
      });
      assert.equal(state, 'sortied');
    });

    test('sortied: 舊存檔當天已出擊（無當日運動紀錄但 checkedIn=true, bossDone=true）', () => {
      const state = getTodayHeroCardState({
        checkedIn: true,
        bossDone: true,
        daySessionsCount: 0,
      });
      assert.equal(state, 'sortied');
    });
  });

  describe('formatTodaySessionSummary', () => {
    test('無紀錄時回傳 null', () => {
      assert.equal(formatTodaySessionSummary([]), null);
    });

    test('格式化含距離運動（例如快走 32 分・3.1 公里）', () => {
      const session: TodaySessionInput = {
        routineName: '晨間快走',
        durationMinutes: 32,
        sportType: 'walk',
        exerciseLogs: [
          {
            exerciseNameZh: '快走',
            sets: [{ distanceM: 3100 }],
          },
        ],
      };
      const summary = formatTodaySessionSummary([session]);
      assert.ok(summary);
      assert.equal(summary?.primaryLabel, '快走 32 分・3.1 公里');
      assert.equal(summary?.additionalCount, 0);
    });

    test('多筆紀錄時標示額外筆數 +N 筆', () => {
      const s1: TodaySessionInput = {
        routineName: '早上重訓',
        durationMinutes: 20,
        sportType: 'strength',
        exerciseLogs: [],
      };
      const s2: TodaySessionInput = {
        routineName: '慢跑',
        durationMinutes: 15,
        sportType: 'run',
        exerciseLogs: [
          {
            exerciseNameZh: '跑步',
            sets: [{ distanceM: 2000 }],
          },
        ],
      };
      const summary = formatTodaySessionSummary([s1, s2]);
      assert.ok(summary);
      assert.equal(summary?.primaryLabel, '跑步 15 分・2 公里');
      assert.equal(summary?.additionalCount, 1);
    });

    test('重訓無距離時只顯示分鐘', () => {
      const session: TodaySessionInput = {
        routineName: '重訓課表',
        durationMinutes: 45,
        sportType: 'strength',
        exerciseLogs: [],
      };
      const summary = formatTodaySessionSummary([session]);
      assert.ok(summary);
      assert.equal(summary?.primaryLabel, '重訓 45 分');
      assert.equal(summary?.additionalCount, 0);
    });
  });
});
