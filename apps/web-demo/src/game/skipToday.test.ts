import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  getSkipTodayStatus,
  canShowSkipEntry,
  markSkipToday,
  getRecipientSkipFlags,
  getTeammatePublicStatus,
  maskTeammateWeekDays,
} from './skipToday.ts';
import { getTodayHeroCardState } from './todayCardState.ts';
import { evaluateCheckinValidity } from './checkinValidity.ts';
import { applyCheckinGrant, type CheckinGrantStateSnapshot } from './checkinGrant.ts';
import { CHECKIN_COINS, CHECKIN_XP } from '../config/economy.ts';
import {
  visibleNotifications,
  type NotificationItem,
  type RecipientNotifyContext,
} from './notificationCenter.ts';

describe('T1-D5 / T1-D6 Skip Today Pure Logic & Privacy Engine (skipToday)', () => {
  const TODAY_KEY = '2026-11-20';
  const OTHER_KEY = '2026-11-21';
  const BASE_NOW_MS = new Date('2026-11-20T10:00:00+08:00').getTime();

  describe('1. getSkipTodayStatus and canShowSkipEntry matrix', () => {
    test('getSkipTodayStatus returns null when neither array contains dayKey', () => {
      assert.equal(getSkipTodayStatus({}, TODAY_KEY), null);
      assert.equal(getSkipTodayStatus({ restDayKeys: [], caringDayKeys: [] }, TODAY_KEY), null);
      assert.equal(getSkipTodayStatus({ restDayKeys: [OTHER_KEY] }, TODAY_KEY), null);
    });

    test('getSkipTodayStatus returns rest when restDayKeys contains dayKey', () => {
      assert.equal(getSkipTodayStatus({ restDayKeys: [TODAY_KEY] }, TODAY_KEY), 'rest');
    });

    test('getSkipTodayStatus returns caring when caringDayKeys contains dayKey', () => {
      assert.equal(getSkipTodayStatus({ caringDayKeys: [TODAY_KEY] }, TODAY_KEY), 'caring');
    });

    test('getSkipTodayStatus: caring wins if both somehow present', () => {
      assert.equal(
        getSkipTodayStatus({ restDayKeys: [TODAY_KEY], caringDayKeys: [TODAY_KEY] }, TODAY_KEY),
        'caring'
      );
    });

    test('canShowSkipEntry visibility matrix', () => {
      // Allowed: idle or progress, with no skipStatus
      assert.equal(canShowSkipEntry({ cardState: 'idle', status: null }), true);
      assert.equal(canShowSkipEntry({ cardState: 'progress', status: null }), true);

      // Hidden when already checked in / sortied
      assert.equal(canShowSkipEntry({ cardState: 'ready', status: null }), false);
      assert.equal(canShowSkipEntry({ cardState: 'sortied', status: null }), false);

      // Hidden when already marked rest or caring
      assert.equal(canShowSkipEntry({ cardState: 'idle', status: 'rest' }), false);
      assert.equal(canShowSkipEntry({ cardState: 'idle', status: 'caring' }), false);
      assert.equal(canShowSkipEntry({ cardState: 'progress', status: 'rest' }), false);
      assert.equal(canShowSkipEntry({ cardState: 'progress', status: 'caring' }), false);
      assert.equal(canShowSkipEntry({ cardState: 'rest', status: null }), false);
      assert.equal(canShowSkipEntry({ cardState: 'caring', status: null }), false);
    });
  });

  describe('2. markSkipToday patches & irreversibility', () => {
    test('mark rest on clean state returns { restDayKeys: [dayKey] }', () => {
      const patch = markSkipToday({ restDayKeys: [], caringDayKeys: [] }, 'rest', TODAY_KEY);
      assert.deepEqual(patch, { restDayKeys: [TODAY_KEY] });
      assert.deepEqual(Object.keys(patch!), ['restDayKeys']);
    });

    test('mark caring on clean state returns { caringDayKeys: [dayKey] }', () => {
      const patch = markSkipToday({ restDayKeys: [], caringDayKeys: [] }, 'caring', TODAY_KEY);
      assert.deepEqual(patch, { caringDayKeys: [TODAY_KEY] });
      assert.deepEqual(Object.keys(patch!), ['caringDayKeys']);
    });

    test('duplicate mark on same day returns null (already marked rest)', () => {
      const patch = markSkipToday({ restDayKeys: [TODAY_KEY] }, 'rest', TODAY_KEY);
      assert.equal(patch, null);
    });

    test('duplicate mark on same day returns null (already marked caring)', () => {
      const patch = markSkipToday({ caringDayKeys: [TODAY_KEY] }, 'caring', TODAY_KEY);
      assert.equal(patch, null);
    });

    test('no switching: rest marked day cannot be marked caring', () => {
      const patch = markSkipToday({ restDayKeys: [TODAY_KEY] }, 'caring', TODAY_KEY);
      assert.equal(patch, null);
    });

    test('no switching: caring marked day cannot be marked rest', () => {
      const patch = markSkipToday({ caringDayKeys: [TODAY_KEY] }, 'rest', TODAY_KEY);
      assert.equal(patch, null);
    });

    test('checkedIn = true returns null (cannot mark rest/caring if already checked in)', () => {
      const patchRest = markSkipToday({}, 'rest', TODAY_KEY, { checkedIn: true });
      assert.equal(patchRest, null);
      const patchCaring = markSkipToday({}, 'caring', TODAY_KEY, { checkedIn: true });
      assert.equal(patchCaring, null);
    });

    test('marking a different day is allowed and appends de-duplicated', () => {
      const patch = markSkipToday({ restDayKeys: [OTHER_KEY] }, 'rest', TODAY_KEY);
      assert.ok(patch && 'restDayKeys' in patch);
      assert.deepEqual(patch.restDayKeys, [OTHER_KEY, TODAY_KEY]);
    });

    test('patch strictly contains no keys other than the one array', () => {
      const patchRest = markSkipToday({}, 'rest', TODAY_KEY);
      assert.deepEqual(Object.keys(patchRest!), ['restDayKeys']);

      const patchCaring = markSkipToday({}, 'caring', TODAY_KEY);
      assert.deepEqual(Object.keys(patchCaring!), ['caringDayKeys']);
    });
  });

  describe('3. getRecipientSkipFlags (real + devDemo OR logic)', () => {
    test('combines real rest marks with dev simulation toggles', () => {
      // Neither set
      assert.deepEqual(
        getRecipientSkipFlags({ restDayKeys: [], caringDayKeys: [] }, TODAY_KEY),
        { isRestDay: false, isCaringForBody: false }
      );

      // Real rest mark true
      assert.deepEqual(
        getRecipientSkipFlags({ restDayKeys: [TODAY_KEY] }, TODAY_KEY),
        { isRestDay: true, isCaringForBody: false }
      );

      // Real caring mark true
      assert.deepEqual(
        getRecipientSkipFlags({ caringDayKeys: [TODAY_KEY] }, TODAY_KEY),
        { isRestDay: false, isCaringForBody: true }
      );

      // Dev demo toggle OR'ed with real
      assert.deepEqual(
        getRecipientSkipFlags({}, TODAY_KEY, { isRestDay: true }),
        { isRestDay: true, isCaringForBody: false }
      );

      assert.deepEqual(
        getRecipientSkipFlags({}, TODAY_KEY, { isCaringForBody: true }),
        { isRestDay: false, isCaringForBody: true }
      );

      // Both real and dev active
      assert.deepEqual(
        getRecipientSkipFlags({ restDayKeys: [TODAY_KEY] }, TODAY_KEY, { isCaringForBody: true }),
        { isRestDay: true, isCaringForBody: true }
      );
    });
  });

  describe('4. Teammate Privacy (資安 T3-D5 Q19)', () => {
    const FORBIDDEN_WORDS = ['caring', 'rest', 'unwell', '照顧', '休息', '不舒服'];

    test('getTeammatePublicStatus depends ONLY on hasWorkedOutToday', () => {
      const workedMember = {
        nameZh: '艾利克斯',
        hasWorkedOutToday: true,
        damageDealt: 1500,
        // Sensitive private health fields that must NOT leak
        isRestDay: true,
        isCaringForBody: true,
        restDayKeys: [TODAY_KEY],
        caringDayKeys: [TODAY_KEY],
        unwellCount: 2,
        unwellNotes: '頭痛不舒服',
      };

      const publicStatus = getTeammatePublicStatus(workedMember);
      assert.deepEqual(publicStatus, { worked: true, label: null });

      const json = JSON.stringify(publicStatus);
      for (const word of FORBIDDEN_WORDS) {
        assert.ok(
          !json.includes(word),
          `Leaked forbidden word "${word}" in getTeammatePublicStatus output: ${json}`
        );
      }

      const idleMember = {
        nameZh: '小綠',
        hasWorkedOutToday: false,
        damageDealt: 0,
        isRestDay: true,
        restDayKeys: [TODAY_KEY],
      };
      const idleStatus = getTeammatePublicStatus(idleMember);
      assert.deepEqual(idleStatus, { worked: false, label: '還沒動' });

      const idleJson = JSON.stringify(idleStatus);
      for (const word of FORBIDDEN_WORDS) {
        assert.ok(
          !idleJson.includes(word),
          `Leaked forbidden word "${word}" in getTeammatePublicStatus output: ${idleJson}`
        );
      }
    });

    test('maskTeammateWeekDays masks rest/caring/unwell days to not_yet if not checked in', () => {
      const daysInput = [
        { dayKey: '2026-11-16', checkedIn: true },
        { dayKey: '2026-11-17', checkedIn: false, isRest: true },
        { dayKey: '2026-11-18', checkedIn: false, isCaring: true, unwellCount: 1 },
        { dayKey: '2026-11-19', checkedIn: true, isRest: true }, // worked out and checked in on rest day
        { dayKey: '2026-11-20', checkedIn: false },
      ];

      const masked = maskTeammateWeekDays(daysInput);
      assert.equal(masked.length, 5);

      assert.deepEqual(masked[0], { dayKey: '2026-11-16', status: 'done' });
      assert.deepEqual(masked[1], { dayKey: '2026-11-17', status: 'not_yet' });
      assert.deepEqual(masked[2], { dayKey: '2026-11-18', status: 'not_yet' });
      assert.deepEqual(masked[3], { dayKey: '2026-11-19', status: 'done' });
      assert.deepEqual(masked[4], { dayKey: '2026-11-20', status: 'not_yet' });

      for (const item of masked) {
        assert.deepEqual(Object.keys(item).sort(), ['dayKey', 'status']);
      }

      const json = JSON.stringify(masked);
      for (const word of FORBIDDEN_WORDS) {
        assert.ok(
          !json.includes(word),
          `Leaked forbidden word "${word}" in maskTeammateWeekDays output: ${json}`
        );
      }
    });
  });

  describe('5. getTodayHeroCardState with rest/caring & checkedIn precedence', () => {
    test('skipStatus rest and caring produce rest and caring when not checked in', () => {
      const restState = getTodayHeroCardState({
        checkedIn: false,
        bossDone: false,
        daySessionsCount: 0,
        skipStatus: 'rest',
      });
      assert.equal(restState, 'rest');

      const caringState = getTodayHeroCardState({
        checkedIn: false,
        bossDone: false,
        daySessionsCount: 0,
        skipStatus: 'caring',
      });
      assert.equal(caringState, 'caring');
    });

    test('skipStatus passed as second argument works identically', () => {
      assert.equal(
        getTodayHeroCardState(
          { checkedIn: false, bossDone: false, daySessionsCount: 0 },
          'rest'
        ),
        'rest'
      );
      assert.equal(
        getTodayHeroCardState(
          { checkedIn: false, bossDone: false, daySessionsCount: 0 },
          'caring'
        ),
        'caring'
      );
    });

    test('checkedIn always wins over rest/caring (ready / sortied)', () => {
      // Marked rest but checked in (e.g. worked out on rest day)
      assert.equal(
        getTodayHeroCardState({
          checkedIn: true,
          bossDone: false,
          daySessionsCount: 1,
          dayProgressMet: true,
          skipStatus: 'rest',
        }),
        'ready'
      );

      assert.equal(
        getTodayHeroCardState({
          checkedIn: true,
          bossDone: true,
          daySessionsCount: 1,
          dayProgressMet: true,
          skipStatus: 'rest',
        }),
        'sortied'
      );

      // Marked caring but checked in
      assert.equal(
        getTodayHeroCardState({
          checkedIn: true,
          bossDone: false,
          daySessionsCount: 1,
          dayProgressMet: true,
          skipStatus: 'caring',
        }),
        'ready'
      );

      assert.equal(
        getTodayHeroCardState({
          checkedIn: true,
          bossDone: true,
          daySessionsCount: 1,
          dayProgressMet: true,
          skipStatus: 'caring',
        }),
        'sortied'
      );
    });
  });

  describe('6. Rewards integration (evaluateCheckinValidity + applyCheckinGrant)', () => {
    const createInitialState = (
      overrides?: Partial<CheckinGrantStateSnapshot>
    ): CheckinGrantStateSnapshot => ({
      lastCheckinDate: null,
      checkinDayKeys: [],
      checkinLogs: [],
      level: 1,
      exp: 0,
      joinDayKey: '2026-11-01',
      coins: 100,
      coinsEarnedToday: 0,
      coinsEarnedDayKey: null,
      doubleCoinUntil: 0,
      unlockCheckinDays: 0,
      unwellHalfUsedByWeek: {},
      unlockedPoseIds: [],
      unlockedOutfitIds: [],
      ...overrides,
    });

    const createValid10MinWalkSession = (dayKey: string, nowMs: number) => ({
      id: `walk_${dayKey}`,
      dayKey,
      timestamp: nowMs,
      sportType: 'walk' as const,
      durationSec: 600,
      distanceM: 800,
      source: 'in_app' as const,
      loggingMode: 'live_focus' as const,
    });

    test('(a) a rest-marked day with a valid 10-minute walk still checks in and grants exactly CHECKIN_COINS/CHECKIN_XP', () => {
      const sessions = [createValid10MinWalkSession(TODAY_KEY, BASE_NOW_MS)];
      const validity = evaluateCheckinValidity({
        sessions,
        dayKey: TODAY_KEY,
        now: BASE_NOW_MS,
        restDayKeys: [TODAY_KEY], // Day is marked rest
      });

      assert.equal(validity.wouldCheckIn, true);
      assert.equal(validity.wouldGrantRewards, true);

      const state = createInitialState();
      const res = applyCheckinGrant({
        dayKey: TODAY_KEY,
        nowMs: BASE_NOW_MS,
        validity,
        state,
      });

      assert.equal(res.ok, true);
      assert.equal(res.granted, true);
      assert.equal(res.checkedIn, true);
      assert.equal(res.result?.coinsGranted, CHECKIN_COINS); // exactly 70 from config
      assert.equal(res.result?.xpGained, CHECKIN_XP); // exactly 100 from config
      assert.equal(res.patch?.coins, 100 + CHECKIN_COINS);
      assert.equal(res.patch?.lastCheckinDate, TODAY_KEY);
      assert.ok(res.patch?.checkinDayKeys?.includes(TODAY_KEY));
    });

    test('(b) a rest-marked day with no workout does not check in/grant', () => {
      const validity = evaluateCheckinValidity({
        sessions: [],
        dayKey: TODAY_KEY,
        now: BASE_NOW_MS,
        restDayKeys: [TODAY_KEY],
      });

      assert.equal(validity.wouldCheckIn, false);
      assert.equal(validity.wouldGrantRewards, false);

      const state = createInitialState();
      const res = applyCheckinGrant({
        dayKey: TODAY_KEY,
        nowMs: BASE_NOW_MS,
        validity,
        state,
      });

      assert.equal(res.granted, false);
      assert.equal(res.checkedIn, false);
      assert.equal(res.result, undefined);
      assert.equal(res.patch, undefined);
    });

    test('(c) a caring-marked day with no workout does not check in/grant', () => {
      const validity = evaluateCheckinValidity({
        sessions: [],
        dayKey: TODAY_KEY,
        now: BASE_NOW_MS,
        caringDayKeys: [TODAY_KEY],
      });

      assert.equal(validity.wouldCheckIn, false);
      assert.equal(validity.wouldGrantRewards, false);

      const state = createInitialState();
      const res = applyCheckinGrant({
        dayKey: TODAY_KEY,
        nowMs: BASE_NOW_MS,
        validity,
        state,
      });

      assert.equal(res.granted, false);
      assert.equal(res.checkedIn, false);
      assert.equal(res.result, undefined);
      assert.equal(res.patch, undefined);
    });

    test('(d) a caring-marked day does not change coins/exp just by marking (markSkipToday only returns the array)', () => {
      const patch = markSkipToday({ caringDayKeys: [] }, 'caring', TODAY_KEY);
      assert.ok(patch);
      assert.deepEqual(Object.keys(patch), ['caringDayKeys']);
      assert.equal('coins' in (patch as Record<string, unknown>), false);
      assert.equal('exp' in (patch as Record<string, unknown>), false);
    });
  });

  describe('7. NotificationCenter nudge suppression by real rest/caring marks', () => {
    const friendNudge: NotificationItem = {
      id: 'nudge_1',
      type: 'nudge',
      actorId: 'friend_akai',
      createdAt: BASE_NOW_MS,
      status: 'pending',
    };

    const squadInvite: NotificationItem = {
      id: 'invite_1',
      type: 'squad_invite',
      actorId: 'friend_akai',
      createdAt: BASE_NOW_MS,
      status: 'pending',
    };

    const baseCtx: RecipientNotifyContext = {
      isRestDay: false,
      isCaringForBody: false,
      isPaused: false,
      isMinor: false,
      friendIds: ['friend_akai'],
      blockedIds: [],
    };

    test('hides pending nudge when real restDayKeys contains todayKey', () => {
      const skipFlags = getRecipientSkipFlags({ restDayKeys: [TODAY_KEY] }, TODAY_KEY);
      const recipientCtx = { ...baseCtx, ...skipFlags };
      const visible = visibleNotifications([friendNudge, squadInvite], recipientCtx, BASE_NOW_MS).all;

      // Nudge is hidden silently; squad_invite remains visible
      assert.equal(visible.some((n) => n.id === 'nudge_1'), false);
      assert.equal(visible.some((n) => n.id === 'invite_1'), true);
    });

    test('hides pending nudge when real caringDayKeys contains todayKey', () => {
      const skipFlags = getRecipientSkipFlags({ caringDayKeys: [TODAY_KEY] }, TODAY_KEY);
      const recipientCtx = { ...baseCtx, ...skipFlags };
      const visible = visibleNotifications([friendNudge, squadInvite], recipientCtx, BASE_NOW_MS).all;

      // Nudge is hidden silently; squad_invite remains visible
      assert.equal(visible.some((n) => n.id === 'nudge_1'), false);
      assert.equal(visible.some((n) => n.id === 'invite_1'), true);
    });

    test('does NOT hide pending nudge when neither rest nor caring is set', () => {
      const skipFlags = getRecipientSkipFlags({ restDayKeys: [], caringDayKeys: [] }, TODAY_KEY);
      const recipientCtx = { ...baseCtx, ...skipFlags };
      const visible = visibleNotifications([friendNudge, squadInvite], recipientCtx, BASE_NOW_MS).all;

      // Both nudge and invite are visible
      assert.equal(visible.some((n) => n.id === 'nudge_1'), true);
      assert.equal(visible.some((n) => n.id === 'invite_1'), true);
    });
  });

  describe('8. Store invariants & persist compatibility', () => {
    test('useGameStore source adheres to persist constraints and has markRestDayToday / confirmUnwellToday', () => {
      const storeCode = fs.readFileSync(new URL('../stores/useGameStore.ts', import.meta.url), 'utf8');

      // 1. Actions exist in interface and implementation
      assert.ok(storeCode.includes('markRestDayToday: () => boolean;'));
      assert.ok(storeCode.includes('confirmUnwellToday: () => boolean;'));
      assert.ok(storeCode.includes('markRestDayToday: () => {'));
      assert.ok(storeCode.includes('confirmUnwellToday: () => {'));

      // 2. Persist key and version unchanged
      assert.ok(storeCode.includes("name: 'fitmon-mvp-storage-v6'"));
      assert.ok(storeCode.includes('version: 4'));

      // 3. restDayKeys & caringDayKeys in partialize
      const partializeMatch = storeCode.match(/partialize:\s*\(state\)\s*=>\s*\(\{([\s\S]*?)\}\)/);
      assert.ok(partializeMatch, 'partialize function must exist');
      assert.ok(partializeMatch[1].includes('restDayKeys: state.restDayKeys'));
      assert.ok(partializeMatch[1].includes('caringDayKeys: state.caringDayKeys'));

      // 4. No function anywhere removes restDayKeys or caringDayKeys entries
      assert.equal(storeCode.includes('unmarkRestDay'), false);
      assert.equal(storeCode.includes('removeRestDay'), false);
      assert.equal(storeCode.includes('unmarkCaringDay'), false);
      assert.equal(storeCode.includes('removeCaringDay'), false);
    });
  });
});
