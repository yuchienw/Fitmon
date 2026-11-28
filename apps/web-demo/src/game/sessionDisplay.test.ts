import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getSessionSummaryVisibility, formatSessionDistance } from './sessionDisplay.ts';
import type { WorkoutSessionSportType } from './workoutRecord.ts';

describe('T4-D4 歷史紀錄卡非重訓欄位與金額能見度 (sessionDisplay)', () => {
  test('legacy record (no sportType) shows everything incl. coins even when 0', () => {
    // 舊版重訓紀錄無 sportType，即使金幣為 0，組數、容量與金幣標籤均維持原本顯示
    const legacySession = {
      routineName: '胸肌槓鈴臥推課表',
      totalSets: 5,
      totalVolume: 4500,
      coinsEarned: 0,
      durationMinutes: 40,
    };
    const vis = getSessionSummaryVisibility(legacySession);
    assert.deepEqual(vis, {
      showVolume: true,
      showSets: true,
      showCoins: true,
    });
  });

  test('strength shows everything', () => {
    // 明確標記 sportType: 'strength' 的重訓紀錄，維持顯示容量、組數與金幣
    const strengthSessionWithCoins = {
      sportType: 'strength' as WorkoutSessionSportType,
      routineName: '黃金腿推增肌',
      totalSets: 6,
      totalVolume: 6000,
      coinsEarned: 50,
      durationMinutes: 45,
    };
    const vis1 = getSessionSummaryVisibility(strengthSessionWithCoins);
    assert.deepEqual(vis1, {
      showVolume: true,
      showSets: true,
      showCoins: true,
    });

    const strengthSessionZeroCoins = {
      sportType: 'strength' as WorkoutSessionSportType,
      routineName: '深蹲突破',
      totalSets: 4,
      totalVolume: 3200,
      coinsEarned: 0,
      durationMinutes: 30,
    };
    const vis2 = getSessionSummaryVisibility(strengthSessionZeroCoins);
    assert.deepEqual(vis2, {
      showVolume: true,
      showSets: true,
      showCoins: true,
    });
  });

  test('run/swim/yoga with coinsEarned 0 hides volume, sets, coins', () => {
    // 新類型運動結算金幣 0 時，隱藏組數、容量與零金額金幣標籤 (+0🪙)
    const runSession = {
      sportType: 'run' as WorkoutSessionSportType,
      routineName: '戶外晨跑',
      totalSets: 0,
      totalVolume: 0,
      coinsEarned: 0,
      durationMinutes: 25,
      distanceM: 3000,
    };
    assert.deepEqual(getSessionSummaryVisibility(runSession), {
      showVolume: false,
      showSets: false,
      showCoins: false,
    });

    const swimSession = {
      sportType: 'swim' as WorkoutSessionSportType,
      routineName: '自由式泳訓',
      totalSets: 0,
      totalVolume: 0,
      coinsEarned: 0,
      durationMinutes: 30,
      distanceM: 500,
    };
    assert.deepEqual(getSessionSummaryVisibility(swimSession), {
      showVolume: false,
      showSets: false,
      showCoins: false,
    });

    const yogaSession = {
      sportType: 'yoga_stretch' as WorkoutSessionSportType,
      routineName: '動態伸展瑜珈',
      totalSets: 0,
      totalVolume: 0,
      coinsEarned: 0,
      durationMinutes: 20,
    };
    assert.deepEqual(getSessionSummaryVisibility(yogaSession), {
      showVolume: false,
      showSets: false,
      showCoins: false,
    });
  });

  test('non-strength with coinsEarned 70 shows coins', () => {
    // 非重訓運動若已由打卡獎等機制取得金幣 (coinsEarned: 70)，金幣標籤應顯示，但容量與組數仍隱藏
    const runWithGrant = {
      sportType: 'run' as WorkoutSessionSportType,
      routineName: '快走慢跑達標',
      totalSets: 0,
      totalVolume: 0,
      coinsEarned: 70,
      durationMinutes: 20,
      distanceM: 2000,
    };
    assert.deepEqual(getSessionSummaryVisibility(runWithGrant), {
      showVolume: false,
      showSets: false,
      showCoins: true,
    });

    const yogaWithGrant = {
      sportType: 'yoga_stretch' as WorkoutSessionSportType,
      routineName: '晨間瑜珈',
      totalSets: 0,
      totalVolume: 0,
      coinsEarned: 70,
      durationMinutes: 15,
    };
    assert.deepEqual(getSessionSummaryVisibility(yogaWithGrant), {
      showVolume: false,
      showSets: false,
      showCoins: true,
    });
  });

  describe('formatSessionDistance 距離格式化純函式', () => {
    test('swim 格式化為公尺', () => {
      assert.equal(formatSessionDistance(300, 'swim'), '300 公尺');
      assert.equal(formatSessionDistance(1000, 'swim'), '1000 公尺');
    });

    test('run, cycle, walk 等非游泳運動格式化為 km', () => {
      assert.equal(formatSessionDistance(5000, 'run'), '5 km');
      assert.equal(formatSessionDistance(2500, 'run'), '2.5 km');
      assert.equal(formatSessionDistance(4250, 'walk'), '4.25 km');
      assert.equal(formatSessionDistance(10000, 'cycle'), '10 km');
    });

    test('無效或無距離回傳 null', () => {
      assert.equal(formatSessionDistance(0, 'run'), null);
      assert.equal(formatSessionDistance(undefined, 'yoga_stretch'), null);
      assert.equal(formatSessionDistance(-100, 'swim'), null);
    });
  });
});
