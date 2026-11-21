import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test, describe } from 'node:test';
import {
  generatePlayerCode,
  formatPlayerCode,
  normalizePlayerCode,
  canRegeneratePlayerCode,
  regeneratePlayerCode,
  PLAYER_CODE_CHARSET,
  PLAYER_CODE_REGEN_COOLDOWN_MS,
  calculateSeedUnlockCheckinDays,
  ensureV3Defaults,
  ensureV4Defaults,
  migratePersistedState,
  NOTIFICATIONS_CAP,
  NOTIFICATIONS_KEEP_MS,
  INVITE_SEND_LOG_KEEP_MS,
  DEMO_PLAYER_ID,
  appendLocalReportLog,
  type NotificationItem,
  type InviteSendLogItem,
} from './persistMigrate.ts';
import {
  DEFAULT_ADULT_INVITE_FROM,
  DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
  MINOR_PRIVACY,
  POSE_UNLOCK_THRESHOLDS,
  OUTFIT_UNLOCK_THRESHOLDS,
  unlockedIdsForDays,
  SOCIAL_RATE_LIMITS,
  NEW_ACCOUNT_WINDOW_MS,
} from '../config/economy.ts';
import {
  IS_DEMO,
  DEMO_SPEEDUP_ENABLED,
  DEMO_REPORT_DISCLAIMER,
  DEMO_FAKE_SQUADS,
} from '../config/demo.ts';

describe('persistMigrate & V3 Schema (資安 11/20 Overrides)', () => {
  describe('PLAYER_CODE_CHARSET & generatePlayerCode', () => {
    test('PLAYER_CODE_CHARSET length is exactly 31 and contains none of 0, O, 1, I, L', () => {
      assert.equal(PLAYER_CODE_CHARSET.length, 31);
      assert.equal(PLAYER_CODE_CHARSET, '23456789ABCDEFGHJKMNPQRSTUVWXYZ');
      for (const forbidden of ['0', 'O', '1', 'I', 'L']) {
        assert.ok(
          !PLAYER_CODE_CHARSET.includes(forbidden),
          `PLAYER_CODE_CHARSET should not contain forbidden char: ${forbidden}`
        );
      }
    });

    test('generatePlayerCode produces 8 chars, all in alphabet, using rejection sampling', () => {
      for (let i = 0; i < 50; i++) {
        const code = generatePlayerCode();
        assert.equal(typeof code, 'string');
        assert.equal(code.length, 8);
        for (const char of code) {
          assert.ok(PLAYER_CODE_CHARSET.includes(char), `Char "${char}" must be in PLAYER_CODE_CHARSET`);
        }
      }
    });

    test('generates different codes across runs', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(generatePlayerCode());
      }
      assert.equal(codes.size, 50);
    });
  });

  describe('formatPlayerCode & normalizePlayerCode', () => {
    test('normalizes input by trimming, stripping spaces/hyphens, and uppercasing', () => {
      assert.equal(normalizePlayerCode('  ab cd-efgh  '), 'ABCDEFGH');
      assert.equal(normalizePlayerCode('2345-6789'), '23456789');
      assert.equal(normalizePlayerCode(' jk mn pq rs '), 'JKMNPQRS');
      assert.equal(normalizePlayerCode(''), '');
      assert.equal(normalizePlayerCode(undefined as any), '');
    });

    test('formats 8-char code with hyphen into 4+4 display', () => {
      assert.equal(formatPlayerCode('ABCDEFGH'), 'ABCD-EFGH');
      assert.equal(formatPlayerCode('23456789'), '2345-6789');
    });

    test('formatPlayerCode returns original string if length is not 8', () => {
      assert.equal(formatPlayerCode('ABC'), 'ABC');
      assert.equal(formatPlayerCode('TOOLONGCODE99'), 'TOOLONGCODE99');
      assert.equal(formatPlayerCode(''), '');
      assert.equal(formatPlayerCode(undefined as any), '');
    });

    test('pipeline: ab cd-efgh -> stored/normalized ABCDEFGH -> display ABCD-EFGH', () => {
      const rawInput = '  ab cd-efgh  ';
      const normalized = normalizePlayerCode(rawInput);
      assert.equal(normalized, 'ABCDEFGH');
      const display = formatPlayerCode(normalized);
      assert.equal(display, 'ABCD-EFGH');
    });
  });

  describe('playerCode Regeneration & Cooldown', () => {
    test('PLAYER_CODE_REGEN_COOLDOWN_MS is 24 hours', () => {
      assert.equal(PLAYER_CODE_REGEN_COOLDOWN_MS, 24 * 60 * 60 * 1000);
    });

    test('canRegeneratePlayerCode enforces 24h cooldown', () => {
      const baseNow = 1700000000000;
      assert.equal(canRegeneratePlayerCode(undefined, baseNow), true);
      assert.equal(canRegeneratePlayerCode(null, baseNow), true);
      assert.equal(canRegeneratePlayerCode(0, baseNow), true);

      // 23 hours later: cannot regenerate
      assert.equal(canRegeneratePlayerCode(baseNow, baseNow + 23 * 3600_000), false);
      // 24h - 1ms: cannot regenerate
      assert.equal(canRegeneratePlayerCode(baseNow, baseNow + PLAYER_CODE_REGEN_COOLDOWN_MS - 1), false);
      // Exactly 24h: can regenerate
      assert.equal(canRegeneratePlayerCode(baseNow, baseNow + PLAYER_CODE_REGEN_COOLDOWN_MS), true);
      // 25 hours later: can regenerate
      assert.equal(canRegeneratePlayerCode(baseNow, baseNow + 25 * 3600_000), true);
    });

    test('fresh save (null timestamp) regenerates immediately, then blocks second regen within 24h', () => {
      const baseNow = 1700000000000;
      const state: Record<string, unknown> = {};
      ensureV3Defaults(state, baseNow);
      const initialCode = state.playerCode as string;
      assert.equal(state.playerCodeGeneratedAt, null);

      // (B) Fresh save can regenerate immediately
      assert.equal(canRegeneratePlayerCode(state.playerCodeGeneratedAt as number | null, baseNow), true);
      const firstRegenResult = regeneratePlayerCode(state, baseNow);
      const secondCode = firstRegenResult.playerCode as string;
      assert.notEqual(secondCode, initialCode);
      assert.equal(secondCode.length, 8);
      assert.equal(firstRegenResult.playerCodeGeneratedAt, baseNow);

      // (C) Second regeneration within 24h is blocked
      const tenHoursLater = baseNow + 10 * 3600_000;
      assert.equal(canRegeneratePlayerCode(firstRegenResult.playerCodeGeneratedAt as number, tenHoursLater), false);
      const blockedResult = regeneratePlayerCode(state, tenHoursLater);
      assert.equal(blockedResult.playerCode, secondCode);
      assert.equal(blockedResult.playerCodeGeneratedAt, baseNow);

      // After 24h, further regen succeeds and updates timestamp
      const afterCooldown = baseNow + PLAYER_CODE_REGEN_COOLDOWN_MS + 1000;
      assert.equal(canRegeneratePlayerCode(firstRegenResult.playerCodeGeneratedAt as number, afterCooldown), true);
      const thirdRegenResult = regeneratePlayerCode(state, afterCooldown);
      assert.notEqual(thirdRegenResult.playerCode, secondCode);
      assert.equal(thirdRegenResult.playerCodeGeneratedAt, afterCooldown);
    });

    test('regeneratePlayerCode leaves code and timestamp unchanged if cooldown has not elapsed', () => {
      const baseNow = 1700000000000;
      const state = {
        playerCode: 'ORIGINAL',
        playerCodeGeneratedAt: baseNow,
      };

      const result = regeneratePlayerCode(state, baseNow + 10 * 3600_000); // 10h later
      assert.equal(result.playerCode, 'ORIGINAL');
      assert.equal(result.playerCodeGeneratedAt, baseNow);
    });

    test('regeneratePlayerCode writes new code and new timestamp after 24h, replacing old code', () => {
      const baseNow = 1700000000000;
      const state = {
        playerCode: 'ORIGINAL',
        playerCodeGeneratedAt: baseNow,
      };

      const futureNow = baseNow + PLAYER_CODE_REGEN_COOLDOWN_MS + 1000;
      const result = regeneratePlayerCode(state, futureNow);
      assert.notEqual(result.playerCode, 'ORIGINAL');
      assert.equal((result.playerCode as string).length, 8);
      assert.equal(result.playerCodeGeneratedAt, futureNow);
    });
  });

  describe('Prune notifications and inviteSendLog', () => {
    test('constants match specification', () => {
      assert.equal(NOTIFICATIONS_CAP, 50);
      assert.equal(NOTIFICATIONS_KEEP_MS, 30 * 24 * 60 * 60 * 1000);
      assert.equal(INVITE_SEND_LOG_KEEP_MS, 7 * 24 * 60 * 60 * 1000);
    });

    test('prunes notifications older than 30 days and caps at newest 50', () => {
      const now = 1700000000000;
      const expiredAt = now - NOTIFICATIONS_KEEP_MS - 1000; // 30 days + 1s old

      // Create 60 notifications: 10 expired, 50 within window
      const notifications: NotificationItem[] = [];
      for (let i = 0; i < 10; i++) {
        notifications.push({
          id: `expired_${i}`,
          type: 'invite',
          createdAt: expiredAt - i * 1000,
        });
      }
      for (let i = 0; i < 55; i++) {
        notifications.push({
          id: `valid_${String(i).padStart(2, '0')}`,
          type: 'invite',
          createdAt: now - (55 - i) * 1000, // newest has highest timestamp
        });
      }

      const state: Record<string, unknown> = {
        notifications,
      };

      ensureV3Defaults(state, now);

      const pruned = state.notifications as NotificationItem[];
      assert.equal(pruned.length, 50);
      // All expired dropped
      assert.ok(!pruned.some((n) => n.id.startsWith('expired_')));
      // Sorted descending by createdAt: newest first
      assert.equal(pruned[0].id, 'valid_54');
      assert.equal(pruned[49].id, 'valid_05');

      // Idempotency check with same now
      const snapshot = JSON.stringify(pruned);
      ensureV3Defaults(state, now);
      assert.equal(JSON.stringify(state.notifications), snapshot);
    });

    test('prunes inviteSendLog older than 7 days and sorts descending by sentAt', () => {
      const now = 1700000000000;
      const expiredAt = now - INVITE_SEND_LOG_KEEP_MS - 500;
      const logs: InviteSendLogItem[] = [
        { targetId: 'user_old_1', sentAt: expiredAt },
        { targetId: 'user_old_2', sentAt: expiredAt - 10000 },
        { targetId: 'user_recent_1', sentAt: now - 1000 },
        { targetId: 'user_recent_2', sentAt: now - 500 },
      ];

      const state: Record<string, unknown> = {
        inviteSendLog: logs,
      };

      ensureV3Defaults(state, now);

      const pruned = state.inviteSendLog as InviteSendLogItem[];
      assert.equal(pruned.length, 2);
      assert.equal(pruned[0].targetId, 'user_recent_2'); // sentAt now - 500
      assert.equal(pruned[1].targetId, 'user_recent_1'); // sentAt now - 1000

      // Idempotency with same now
      const snapshot = JSON.stringify(pruned);
      ensureV3Defaults(state, now);
      assert.equal(JSON.stringify(state.inviteSendLog), snapshot);
    });

    test('notification missing createdAt, non-numeric, NaN, or non-finite is dropped during prune without throwing', () => {
      const now = 1700000000000;
      const state: Record<string, unknown> = {
        notifications: [
          { id: 'valid_1', type: 'invite', createdAt: now - 1000 },
          { id: 'no_created', type: 'invite' },
          { id: 'nan_created', type: 'invite', createdAt: NaN },
          { id: 'inf_created', type: 'invite', createdAt: Infinity },
          { id: 'neginf_created', type: 'invite', createdAt: -Infinity },
          { id: 'str_created', type: 'invite', createdAt: '1700000000000' as any },
          null as any,
          undefined as any,
          { id: 'valid_2', type: 'invite', createdAt: now - 500 },
        ],
      };

      assert.doesNotThrow(() => ensureV3Defaults(state, now));
      const pruned = state.notifications as NotificationItem[];
      assert.equal(pruned.length, 2);
      assert.equal(pruned[0].id, 'valid_2');
      assert.equal(pruned[1].id, 'valid_1');
    });

    test('inviteSendLog item missing sentAt, non-numeric, NaN, or non-finite is dropped during prune without throwing', () => {
      const now = 1700000000000;
      const state: Record<string, unknown> = {
        inviteSendLog: [
          { targetId: 'valid_1', sentAt: now - 1000 },
          { targetId: 'no_sent' } as any,
          { targetId: 'nan_sent', sentAt: NaN },
          { targetId: 'inf_sent', sentAt: Infinity },
          { targetId: 'neginf_sent', sentAt: -Infinity },
          { targetId: 'str_sent', sentAt: '1700000000000' as any },
          null as any,
          { targetId: 'valid_2', sentAt: now - 200 },
        ],
      };

      assert.doesNotThrow(() => ensureV3Defaults(state, now));
      const pruned = state.inviteSendLog as InviteSendLogItem[];
      assert.equal(pruned.length, 2);
      assert.equal(pruned[0].targetId, 'valid_2');
      assert.equal(pruned[1].targetId, 'valid_1');
    });
  });

  describe('ensureV3Defaults & Idempotency', () => {
    test('populates brand-new save with empty defaults and sets playerCodeGeneratedAt to null', () => {
      const now = 1700000000000;
      const state: Record<string, unknown> = {};
      ensureV3Defaults(state, now);

      assert.equal(typeof state.playerCode, 'string');
      assert.equal((state.playerCode as string).length, 8);
      assert.equal(state.playerCodeGeneratedAt, null);
      assert.deepEqual(state.friendRequests, []);
      assert.deepEqual(state.recentTeammates, []);
      assert.deepEqual(state.notifications, []);
      assert.deepEqual(state.inviteSendLog, []);
      assert.deepEqual(state.privacy, {
        inviteFrom: DEFAULT_ADULT_INVITE_FROM,
        discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
      });
      assert.deepEqual(state.blockedIds, []);
      assert.deepEqual(state.reportLog, []);
      assert.deepEqual(state.squadJoinOrder, [DEMO_PLAYER_ID]);
      assert.equal(state.bossRewardClaimedWeekKey, null);
      assert.equal(state.unlockCheckinDays, 0);
      assert.deepEqual(state.unlockedPoseIds, []);
      assert.deepEqual(state.unlockedOutfitIds, []);
    });

    test('if playerCode exists but playerCodeGeneratedAt is missing, normalizes timestamp to null without changing code', () => {
      const now = 1700000000000;
      const existingCode = 'EXISTING';
      const state: Record<string, unknown> = {
        playerCode: existingCode,
      };

      ensureV3Defaults(state, now);

      assert.equal(state.playerCode, existingCode);
      assert.equal(state.playerCodeGeneratedAt, null);
    });

    test('if playerCode and playerCodeGeneratedAt already exist, neither is modified', () => {
      const originalTime = 1600000000000;
      const laterTime = 1700000000000;
      const existingCode = 'MYCODE99';
      const state: Record<string, unknown> = {
        playerCode: existingCode,
        playerCodeGeneratedAt: originalTime,
      };

      ensureV3Defaults(state, laterTime);

      assert.equal(state.playerCode, existingCode);
      assert.equal(state.playerCodeGeneratedAt, originalTime);
    });

    test('locks privacy to MINOR_PRIVACY when devMinorTestAccount is true', () => {
      const state: Record<string, unknown> = {
        devMinorTestAccount: true,
      };
      ensureV3Defaults(state);

      assert.deepEqual(state.privacy, {
        inviteFrom: MINOR_PRIVACY.inviteFrom,
        discoverableByCode: MINOR_PRIVACY.discoverableByCode,
      });
      assert.equal(state.privacy.inviteFrom, 'friends');
      assert.equal(state.privacy.discoverableByCode, false);
    });

    test('unlockCheckinDays non-finite (Infinity, -Infinity, NaN) re-seeds from check-in records or 0, while finite values are preserved', () => {
      // With check-in records and Infinity
      const stateWithCheckins: Record<string, unknown> = {
        unlockCheckinDays: Infinity,
        checkinDayKeys: ['2026-11-01', '2026-11-02'],
      };
      ensureV3Defaults(stateWithCheckins);
      assert.equal(stateWithCheckins.unlockCheckinDays, 2);

      // With -Infinity
      const stateNegInf: Record<string, unknown> = {
        unlockCheckinDays: -Infinity,
        checkinDayKeys: ['2026-11-01'],
      };
      ensureV3Defaults(stateNegInf);
      assert.equal(stateNegInf.unlockCheckinDays, 1);

      // With NaN and no records -> 0
      const stateNaN: Record<string, unknown> = {
        unlockCheckinDays: NaN,
      };
      ensureV3Defaults(stateNaN);
      assert.equal(stateNaN.unlockCheckinDays, 0);

      // Already-persisted finite valid count is preserved and not shrunk
      const stateFinite: Record<string, unknown> = {
        unlockCheckinDays: 14,
        checkinDayKeys: ['2026-11-01'],
      };
      ensureV3Defaults(stateFinite);
      assert.equal(stateFinite.unlockCheckinDays, 14);
    });

    test('first-D3 partial v3 save gets new fields without requiring version 4', () => {
      const partialV3: Record<string, unknown> = {
        squadInvites: [],
        currentSquadId: 'squad_self',
        isSquadLeader: true,
        devMinorTestAccount: false,
        coins: 800,
        level: 3,
      };

      const now = 1700000000000;
      const migrated = migratePersistedState(partialV3, 3, now);

      assert.equal(migrated.coins, 800);
      assert.equal(migrated.level, 3);
      assert.equal(typeof migrated.playerCode, 'string');
      assert.equal((migrated.playerCode as string).length, 8);
      assert.equal(migrated.playerCodeGeneratedAt, null);
      assert.deepEqual(migrated.friendRequests, []);
      assert.deepEqual(migrated.notifications, []);
      assert.deepEqual(migrated.inviteSendLog, []);
      assert.deepEqual(migrated.blockedIds, []);
      assert.deepEqual(migrated.reportLog, []);
    });
  });

  describe('Official v2 Old Saves Migration', () => {
    const savePaths = [
      {
        path: '/workspace/fitmon-qa-2026-11-14/t3-d2/oldsave-main-ae12c43.json',
        expectedTeammateIds: ['friend_akai', 'user_leo', 'friend_alice'],
      },
      {
        path: '/workspace/fitmon-qa-2026-11-14/t3-d2/oldsave-main-with-chloe.json',
        expectedTeammateIds: ['friend_akai', 'user_leo', 'friend_chloe'],
      },
    ];

    for (const { path: savePath, expectedTeammateIds } of savePaths) {
      test(`correctly migrates official v2 old save: ${savePath.split('/').pop()}`, () => {
        const fileContent = fs.readFileSync(savePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        assert.equal(parsed.version, 2, 'Original save must be version 2');
        const v2State = parsed.state;

        // Snapshot original progress data before migration
        const originalFriendIds = [...v2State.friendIds];
        const originalSquadMembers = JSON.parse(JSON.stringify(v2State.squadMembers));
        const originalCheckinDayKeys = [...v2State.checkinDayKeys];

        const mockNow = 1763640000000;
        const migrated = migratePersistedState(v2State, 2, mockNow);

        // 1. Coins 420, level 2, exp 0 preserved
        assert.equal(migrated.coins, 420);
        assert.equal(migrated.level, 2);
        assert.equal(migrated.exp, 0);

        // 2. checkinDayKeys / joinDayKey / squadMembers / friendIds preserved exactly
        assert.deepEqual(migrated.checkinDayKeys, originalCheckinDayKeys);
        assert.equal(migrated.joinDayKey, '2026-11-13');
        assert.deepEqual(migrated.squadMembers, originalSquadMembers);
        assert.deepEqual(migrated.friendIds, originalFriendIds);

        // 3. friendIds remain accepted friends (unchanged), friendRequests stays []
        assert.deepEqual(migrated.friendIds, ['friend_akai', 'friend_alice']);
        assert.deepEqual(migrated.friendRequests, []);

        // 4. unlockCheckinDays === 1 (day 2026-11-13 >= joinDayKey), unlockedPoseIds & unlockedOutfitIds are []
        assert.equal(migrated.unlockCheckinDays, 1);
        assert.deepEqual(migrated.unlockedPoseIds, []);
        assert.deepEqual(migrated.unlockedOutfitIds, []);

        // 5. playerCode is 8 chars from the alphabet; playerCodeGeneratedAt === null on first auto-generation
        assert.equal(typeof migrated.playerCode, 'string');
        assert.equal((migrated.playerCode as string).length, 8);
        for (const char of migrated.playerCode as string) {
          assert.ok(PLAYER_CODE_CHARSET.includes(char), `Char "${char}" should be in PLAYER_CODE_CHARSET`);
        }
        assert.equal(migrated.playerCodeGeneratedAt, null);

        // 6. privacy is adult default; notifications []; inviteSendLog []
        assert.deepEqual(migrated.privacy, {
          inviteFrom: DEFAULT_ADULT_INVITE_FROM,
          discoverableByCode: DEFAULT_ADULT_DISCOVERABLE_BY_CODE,
        });
        assert.deepEqual(migrated.notifications, []);
        assert.deepEqual(migrated.inviteSendLog, []);

        // 7. recentTeammates seeded from current members (exclude self); squadJoinOrder starts with 'self'
        assert.deepEqual(
          migrated.recentTeammates,
          expectedTeammateIds.map((id) => ({ id, lastTogetherAt: mockNow }))
        );
        assert.deepEqual(migrated.squadJoinOrder, [DEMO_PLAYER_ID, ...expectedTeammateIds]);

        // 8. Second migrate with same now is idempotent
        const snapshotFirst = JSON.parse(JSON.stringify(migrated));
        const secondMigrated = migratePersistedState(migrated, 3, mockNow);
        assert.deepEqual(secondMigrated, snapshotFirst);
        assert.equal(secondMigrated.playerCode, snapshotFirst.playerCode);
        assert.equal(secondMigrated.playerCodeGeneratedAt, null);
      });
    }
  });

  describe('SOCIAL_RATE_LIMITS & NEW_ACCOUNT_WINDOW_MS', () => {
    test('values match 資安 11/20 specifications exactly', () => {
      assert.equal(NEW_ACCOUNT_WINDOW_MS, 7 * 24 * 60 * 60 * 1000);
      assert.equal(SOCIAL_RATE_LIMITS.newAccountWindowMs, 7 * 24 * 60 * 60 * 1000);

      // Squad invites: 20 per day, non-friends 10; per person 72h cooldown and max 3 per 7 days
      assert.equal(SOCIAL_RATE_LIMITS.squadInvite.maxPerDay, 20);
      assert.equal(SOCIAL_RATE_LIMITS.squadInvite.maxNonFriendPerDay, 10);
      assert.equal(SOCIAL_RATE_LIMITS.squadInvite.perPersonCooldownMs, 72 * 60 * 60 * 1000);
      assert.equal(SOCIAL_RATE_LIMITS.squadInvite.maxPerPersonPer7Days, 3);
      assert.equal(SOCIAL_RATE_LIMITS.squadInvite.window7DaysMs, 7 * 24 * 60 * 60 * 1000);

      // Friend requests: 20 per day; 7-day cooldown after 略過
      assert.equal(SOCIAL_RATE_LIMITS.friendRequest.maxPerDay, 20);
      assert.equal(SOCIAL_RATE_LIMITS.friendRequest.skipCooldownMs, 7 * 24 * 60 * 60 * 1000);

      // Code lookups: 5 per minute and 30 per day
      assert.equal(SOCIAL_RATE_LIMITS.codeLookup.maxPerMinute, 5);
      assert.equal(SOCIAL_RATE_LIMITS.codeLookup.maxPerDay, 30);
      assert.equal(SOCIAL_RATE_LIMITS.codeLookup.minuteWindowMs, 60 * 1000);

      // New-account daily values: 3, 5, 10
      assert.equal(SOCIAL_RATE_LIMITS.newAccount.squadInviteDailyMax, 3);
      assert.equal(SOCIAL_RATE_LIMITS.newAccount.friendRequestDailyMax, 5);
      assert.equal(SOCIAL_RATE_LIMITS.newAccount.codeLookupDailyMax, 10);
    });
  });

  describe('IS_DEMO & Demo Gating', () => {
    test('IS_DEMO is true in demo builds and constants are defined', () => {
      assert.equal(IS_DEMO, true);
      assert.equal(DEMO_SPEEDUP_ENABLED, true);
      assert.equal(DEMO_REPORT_DISCLAIMER, '試玩版不會真的送出檢舉');
    });

    test('DEMO_FAKE_SQUADS is non-empty when IS_DEMO is true', () => {
      assert.ok(Array.isArray(DEMO_FAKE_SQUADS));
      assert.ok(DEMO_FAKE_SQUADS.length > 0);
      // Ensure fake squads do not use real personal data
      for (const squad of DEMO_FAKE_SQUADS) {
        assert.ok(typeof squad.id === 'string' && squad.id.startsWith('squad_'));
        assert.ok(typeof squad.name === 'string');
        assert.ok(typeof squad.inviteCode === 'string');
      }
    });
  });

  describe('BlockedIds and ReportLog', () => {
    test('reportLog stays local and appendLocalReportLog creates valid item', () => {
      const state: Record<string, unknown> = { reportLog: [] };
      appendLocalReportLog(state, {
        targetId: 'bad_actor_1',
        reason: 'Harassment in squad',
        createdAt: 1700000000000,
      });

      const logs = state.reportLog as any[];
      assert.equal(logs.length, 1);
      assert.equal(logs[0].targetId, 'bad_actor_1');
      assert.equal(logs[0].reason, 'Harassment in squad');
      assert.equal(logs[0].createdAt, 1700000000000);
    });
  });

  describe('calculateSeedUnlockCheckinDays', () => {
    test('deduplicates between checkinDayKeys and checkinLogs', () => {
      const state = {
        joinDayKey: '2026-11-01',
        checkinDayKeys: ['2026-11-02', '2026-11-03'],
        checkinLogs: [
          { dayKey: '2026-11-03', timestamp: 1000 },
          { dayKey: '2026-11-04', timestamp: 2000 },
        ],
      };
      const days = calculateSeedUnlockCheckinDays(state);
      assert.equal(days, 3); // 2026-11-02, 2026-11-03, 2026-11-04
    });

    test('excludes days before joinDayKey when joinDayKey is a real YYYY-MM-DD', () => {
      const state = {
        joinDayKey: '2026-11-10',
        checkinDayKeys: ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'],
        checkinLogs: [],
      };
      const days = calculateSeedUnlockCheckinDays(state);
      assert.equal(days, 2); // 2026-11-10, 2026-11-11
    });

    test('counts all days when joinDayKey is the legacy sentinel 1970-01-01', () => {
      const state = {
        joinDayKey: '1970-01-01',
        checkinDayKeys: ['2026-10-01', '2026-10-02', '2026-11-05'],
        checkinLogs: [{ dayKey: '2026-11-06' }],
      };
      const days = calculateSeedUnlockCheckinDays(state);
      assert.equal(days, 4);
    });

    test('returns 0 when no check-ins exist', () => {
      const state = {
        joinDayKey: '2026-11-01',
        checkinDayKeys: [],
        checkinLogs: [],
      };
      assert.equal(calculateSeedUnlockCheckinDays(state), 0);
    });
  });

  describe('unlockedIdsForDays', () => {
    test('unlocks poses at 3, 7, 14 days', () => {
      assert.deepEqual(unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, 0), []);
      assert.deepEqual(unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, 2), []);
      assert.deepEqual(unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, 3), ['pose_unlock_3d']);
      assert.deepEqual(unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, 6), ['pose_unlock_3d']);
      assert.deepEqual(unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, 7), ['pose_unlock_3d', 'pose_unlock_7d']);
      assert.deepEqual(unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, 13), ['pose_unlock_3d', 'pose_unlock_7d']);
      assert.deepEqual(unlockedIdsForDays(POSE_UNLOCK_THRESHOLDS, 14), [
        'pose_unlock_3d',
        'pose_unlock_7d',
        'pose_unlock_14d',
      ]);
    });

    test('unlocks outfits at 5, 15, 30 days', () => {
      assert.deepEqual(unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, 0), []);
      assert.deepEqual(unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, 4), []);
      assert.deepEqual(unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, 5), ['outfit_unlock_5d']);
      assert.deepEqual(unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, 14), ['outfit_unlock_5d']);
      assert.deepEqual(unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, 15), [
        'outfit_unlock_5d',
        'outfit_unlock_15d',
      ]);
      assert.deepEqual(unlockedIdsForDays(OUTFIT_UNLOCK_THRESHOLDS, 30), [
        'outfit_unlock_5d',
        'outfit_unlock_15d',
        'outfit_unlock_30d',
      ]);
    });
  });

  describe('Official v2→v4 Old Saves Migration (T4-D1)', () => {
    const v2Files = [
      {
        path: '/workspace/fitmon-qa-2026-11-14/t3-d2/oldsave-main-ae12c43.json',
        expectedTeammates: ['friend_akai', 'user_leo', 'friend_alice'],
      },
      {
        path: '/workspace/fitmon-qa-2026-11-14/t3-d2/oldsave-main-with-chloe.json',
        expectedTeammates: ['friend_akai', 'user_leo', 'friend_chloe'],
      },
    ];

    for (const { path: savePath, expectedTeammates } of v2Files) {
      test(`migrates official v2 old save to v4: ${savePath.split('/').pop()}`, () => {
        const fileContent = fs.readFileSync(savePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        assert.equal(parsed.version, 2);
        const v2State = parsed.state;

        // Snapshot original progress data
        const origCoins = v2State.coins;
        const origLevel = v2State.level;
        const origExp = v2State.exp;
        const origSquadMembers = JSON.parse(JSON.stringify(v2State.squadMembers));
        const origFriendIds = [...v2State.friendIds];
        const origCheckinDayKeys = [...v2State.checkinDayKeys];
        const origHistory = JSON.parse(JSON.stringify(v2State.workoutHistory));

        const mockNow = 1763640000000;
        const migrated = migratePersistedState(v2State, 2, mockNow);

        // 1. Assert coins, level, exp, squadMembers, friendIds, checkinDayKeys, workoutHistory length
        assert.equal(migrated.coins, origCoins);
        assert.equal(migrated.level, origLevel);
        assert.equal(migrated.exp, origExp);
        assert.deepEqual(migrated.squadMembers, origSquadMembers);
        assert.deepEqual(migrated.friendIds, origFriendIds);
        assert.deepEqual(migrated.checkinDayKeys, origCheckinDayKeys);
        assert.equal((migrated.workoutHistory as any[]).length, origHistory.length);

        // 2. Each session's coinsEarned / expEarned / totalVolume unchanged; no records dropped
        const migratedHistory = migrated.workoutHistory as any[];
        for (let i = 0; i < origHistory.length; i++) {
          const origSess = origHistory[i];
          const migSess = migratedHistory[i];
          assert.equal(migSess.id, origSess.id);
          assert.equal(migSess.coinsEarned, origSess.coinsEarned);
          assert.equal(migSess.expEarned, origSess.expEarned);
          assert.equal(migSess.totalVolume, origSess.totalVolume);
          assert.equal(migSess.durationMinutes, origSess.durationMinutes);

          // V4 session fields
          assert.equal(migSess.source, 'in_app');
          assert.equal(migSess.loggingMode, 'live_focus');
          assert.equal(migSess.endedUnwell, false);
          assert.deepEqual(migSess.pauseSegments, []);
          assert.equal(migSess.totalDurationSec, origSess.durationMinutes * 60);
          assert.equal(typeof migSess.sportType, 'string');

          // Old records lack startedAt, marked timingIncomplete: true
          assert.equal(migSess.timingIncomplete, true);
          assert.equal(migSess.restShare, undefined);

          // Check sets
          for (const log of migSess.exerciseLogs) {
            for (const s of log.sets) {
              assert.equal(s.plannedRestSec, s.restSec);
              assert.equal(s.timingIncomplete, true);
              if (log.unitLabel === 'km' && typeof s.weightKg === 'number') {
                assert.equal(s.distanceM, s.weightKg * 1000);
              }
              if (log.unitLabel === '秒' && typeof s.weightKg === 'number') {
                assert.equal(s.durationSec, s.weightKg);
              }
            }
          }
        }

        // 3. V3 fields get defaults
        assert.deepEqual(migrated.friendIds, origFriendIds);
        assert.deepEqual(migrated.friendRequests, []);
        assert.equal(typeof migrated.playerCode, 'string');
        assert.equal((migrated.playerCode as string).length, 8);
        assert.deepEqual(migrated.notifications, []);
        assert.deepEqual(migrated.inviteSendLog, []);
        assert.deepEqual(
          migrated.recentTeammates,
          expectedTeammates.map((id) => ({ id, lastTogetherAt: mockNow }))
        );
        assert.deepEqual(migrated.squadJoinOrder, [DEMO_PLAYER_ID, ...expectedTeammates]);

        // 4. V4 fields get defaults
        assert.equal(migrated.selfCheckAnyYes, null);
        assert.equal(migrated.selfCheckCompletedAt, null);
        assert.equal(migrated.unwellNudgeShownWeek, null);
        assert.equal(migrated.onboardingCompletedAt, null);
        assert.equal(migrated.onboardingWorkoutHintSeenAt, null);
        assert.equal(migrated.onboardingSortieHintSeenAt, null);
        assert.deepEqual(migrated.restDayKeys, []);
        assert.deepEqual(migrated.caringDayKeys, []);
        assert.deepEqual(migrated.unwellHalfUsedByWeek, {});

        // 5. Idempotent: migrate again with fromVersion 4
        const snapshotFirst = JSON.parse(JSON.stringify(migrated));
        const secondMigrated = migratePersistedState(migrated, 4, mockNow);
        assert.deepEqual(secondMigrated, snapshotFirst);
      });
    }

    test('fills distanceM and durationSec from weightKg when unitLabel allows without mutating historical weightKg', () => {
      const stateWithCardioPlank: Record<string, unknown> = {
        workoutHistory: [
          {
            id: 'sess_mixed',
            durationMinutes: 30,
            coinsEarned: 50,
            expEarned: 500,
            totalVolume: 1500,
            exerciseLogs: [
              {
                exerciseId: 'cardio_incline_run',
                unitLabel: 'km',
                sets: [{ weightKg: 5, reps: 1, restSec: 60 }],
              },
              {
                exerciseId: 'bw_plank_core',
                unitLabel: '秒',
                sets: [{ weightKg: 45, reps: 3, restSec: 45 }],
              },
            ],
          },
        ],
      };

      const migrated = migratePersistedState(stateWithCardioPlank, 3, 1763640000000);
      const sess = (migrated.workoutHistory as any[])[0];

      // Cardio set
      const cardioSet = sess.exerciseLogs[0].sets[0];
      assert.equal(cardioSet.distanceM, 5000);
      assert.equal(cardioSet.weightKg, 5); // Historical weightKg left intact!
      assert.equal(cardioSet.plannedRestSec, 60);
      assert.equal(cardioSet.timingIncomplete, true);

      // Plank set
      const plankSet = sess.exerciseLogs[1].sets[0];
      assert.equal(plankSet.durationSec, 45);
      assert.equal(plankSet.weightKg, 45); // Historical weightKg left intact!
      assert.equal(plankSet.plannedRestSec, 45);
      assert.equal(plankSet.timingIncomplete, true);

      // Historical economy fields unchanged
      assert.equal(sess.coinsEarned, 50);
      assert.equal(sess.expEarned, 500);
      assert.equal(sess.totalVolume, 1500);
    });
  });

  describe('Official v3→v4 Migration with Social Data (T4-D1)', () => {
    test('preserves all v3 fields exactly from v3-save-with-social.json and applies v4 defaults', () => {
      const savePath = '/workspace/fitmon-qa-2026-11-21/t4-d1/v3-save-with-social.json';
      const fileContent = fs.readFileSync(savePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      assert.equal(parsed.version, 3);
      const v3State = parsed.state;

      // Capture v3 snapshots
      const expectedUnlockDays = v3State.unlockCheckinDays; // 8
      const expectedPlayerCode = v3State.playerCode; // "AB2CD3EF"
      const expectedPlayerCodeGenAt = v3State.playerCodeGeneratedAt;
      const expectedPoseIds = [...v3State.unlockedPoseIds];
      const expectedOutfitIds = [...v3State.unlockedOutfitIds];
      const expectedPrivacy = { ...v3State.privacy };
      const expectedBlockedIds = [...v3State.blockedIds];
      const expectedNotifications = JSON.parse(JSON.stringify(v3State.notifications)).sort(
        (a: any, b: any) => b.createdAt - a.createdAt || (b.id || '').localeCompare(a.id || '')
      );
      const expectedFriendRequests = JSON.parse(JSON.stringify(v3State.friendRequests));
      const expectedRecentTeammates = JSON.parse(JSON.stringify(v3State.recentTeammates));
      const expectedInviteSendLog = JSON.parse(JSON.stringify(v3State.inviteSendLog));
      const expectedSquadJoinOrder = [...v3State.squadJoinOrder];
      const expectedBossRewardWeekKey = v3State.bossRewardClaimedWeekKey;
      const expectedCoins = v3State.coins;
      const expectedLevel = v3State.level;
      const expectedExp = v3State.exp;

      const mockNow = 1795240000000;
      const migrated = migratePersistedState(v3State, 3, mockNow);

      // Verify v3 fields are preserved exactly
      assert.equal(migrated.unlockCheckinDays, expectedUnlockDays);
      assert.equal(migrated.playerCode, expectedPlayerCode);
      assert.equal(migrated.playerCodeGeneratedAt, expectedPlayerCodeGenAt);
      assert.deepEqual(migrated.unlockedPoseIds, expectedPoseIds);
      assert.deepEqual(migrated.unlockedOutfitIds, expectedOutfitIds);
      assert.deepEqual(migrated.privacy, expectedPrivacy);
      assert.deepEqual(migrated.blockedIds, expectedBlockedIds);
      assert.deepEqual(migrated.friendRequests, expectedFriendRequests);
      assert.deepEqual(migrated.recentTeammates, expectedRecentTeammates);
      assert.deepEqual(migrated.notifications, expectedNotifications);
      assert.deepEqual(migrated.inviteSendLog, expectedInviteSendLog);
      assert.deepEqual(migrated.squadJoinOrder, expectedSquadJoinOrder);
      assert.equal(migrated.bossRewardClaimedWeekKey, expectedBossRewardWeekKey);
      assert.equal(migrated.coins, expectedCoins);
      assert.equal(migrated.level, expectedLevel);
      assert.equal(migrated.exp, expectedExp);

      // Verify v4 defaults
      assert.equal(migrated.selfCheckAnyYes, null);
      assert.equal(migrated.selfCheckCompletedAt, null);
      assert.equal(migrated.unwellNudgeShownWeek, null);
      assert.equal(migrated.onboardingCompletedAt, null);
      assert.equal(migrated.onboardingWorkoutHintSeenAt, null);
      assert.equal(migrated.onboardingSortieHintSeenAt, null);
      assert.deepEqual(migrated.restDayKeys, []);
      assert.deepEqual(migrated.caringDayKeys, []);
      assert.deepEqual(migrated.unwellHalfUsedByWeek, {});

      // Idempotent: migrate again fromVersion 4
      const snapshotFirst = JSON.parse(JSON.stringify(migrated));
      const secondMigrated = migratePersistedState(migrated, 4, mockNow);
      assert.deepEqual(secondMigrated, snapshotFirst);
    });
  });

  describe('Malformed Input Handling & Idempotency (T4-D1)', () => {
    test('tolerates malformed workoutHistory (not array, non-object session, invalid numbers)', () => {
      const malformedState: Record<string, unknown> = {
        coins: 500,
        level: 5,
        friendIds: ['friend_akai'],
        workoutHistory: 'not an array' as any,
      };

      assert.doesNotThrow(() => {
        migratePersistedState(malformedState, 3);
      });
      assert.deepEqual(malformedState.workoutHistory, []);
      assert.equal(malformedState.coins, 500);
      assert.equal(malformedState.level, 5);
      assert.deepEqual(malformedState.friendIds, ['friend_akai']);

      // Session is not an object, sets with Infinity, -Infinity, NaN
      const malformedSessions: Record<string, unknown> = {
        workoutHistory: [
          null,
          'invalid_session',
          42,
          {
            id: 'sess_nan',
            durationMinutes: NaN,
            exerciseLogs: [
              {
                exerciseId: 'cardio_incline_run',
                unitLabel: 'km',
                sets: [
                  { weightKg: Infinity, reps: NaN, restSec: -Infinity },
                  { weightKg: -Infinity, reps: 5, timestamp: NaN },
                  { weightKg: NaN, reps: 5 },
                  null,
                  'not_a_set',
                ],
              },
            ],
          },
        ],
      };

      assert.doesNotThrow(() => {
        migratePersistedState(malformedSessions, 3);
      });
      const hist = malformedSessions.workoutHistory as any[];
      assert.equal(hist.length, 1);
      assert.equal(hist[0].id, 'sess_nan');
      // Set distanceM must not be NaN or Infinity
      for (const set of hist[0].exerciseLogs[0].sets) {
        assert.equal(set.distanceM, undefined);
      }
    });

    test('preserves selfCheckAnyYes: false, but normalizes invalid/undefined/0/"no" to null', () => {
      // Valid false must be preserved
      const stateFalse: Record<string, unknown> = { selfCheckAnyYes: false };
      ensureV4Defaults(stateFalse);
      assert.equal(stateFalse.selfCheckAnyYes, false);

      // Valid true must be preserved
      const stateTrue: Record<string, unknown> = { selfCheckAnyYes: true };
      ensureV4Defaults(stateTrue);
      assert.equal(stateTrue.selfCheckAnyYes, true);

      // undefined, "no", 0, {} must become null
      const stateInvalid1: Record<string, unknown> = { selfCheckAnyYes: undefined };
      ensureV4Defaults(stateInvalid1);
      assert.equal(stateInvalid1.selfCheckAnyYes, null);

      const stateInvalid2: Record<string, unknown> = { selfCheckAnyYes: 'no' };
      ensureV4Defaults(stateInvalid2);
      assert.equal(stateInvalid2.selfCheckAnyYes, null);

      const stateInvalid3: Record<string, unknown> = { selfCheckAnyYes: 0 };
      ensureV4Defaults(stateInvalid3);
      assert.equal(stateInvalid3.selfCheckAnyYes, null);
    });

    test('normalizes selfCheckCompletedAt (0 / Infinity / object -> null)', () => {
      const state1: Record<string, unknown> = { selfCheckCompletedAt: 0 };
      ensureV4Defaults(state1);
      assert.equal(state1.selfCheckCompletedAt, null);

      const state2: Record<string, unknown> = { selfCheckCompletedAt: Infinity };
      ensureV4Defaults(state2);
      assert.equal(state2.selfCheckCompletedAt, null);

      const state3: Record<string, unknown> = { selfCheckCompletedAt: { date: '2026-11-21' } };
      ensureV4Defaults(state3);
      assert.equal(state3.selfCheckCompletedAt, null);

      const stateValid: Record<string, unknown> = { selfCheckCompletedAt: '2026-11-21' };
      ensureV4Defaults(stateValid);
      assert.equal(stateValid.selfCheckCompletedAt, '2026-11-21');
    });

    test('normalizes unwellNudgeShownWeek (number -> null, string preserved)', () => {
      const stateNum: Record<string, unknown> = { unwellNudgeShownWeek: 202647 };
      ensureV4Defaults(stateNum);
      assert.equal(stateNum.unwellNudgeShownWeek, null);

      const stateValid: Record<string, unknown> = { unwellNudgeShownWeek: '2026-W47' };
      ensureV4Defaults(stateValid);
      assert.equal(stateValid.unwellNudgeShownWeek, '2026-W47');
    });

    test('normalizes restDayKeys, caringDayKeys, unwellHalfUsedByWeek', () => {
      const state: Record<string, unknown> = {
        restDayKeys: ['2026-11-20', '', null, 123, '2026-11-21'],
        caringDayKeys: 'invalid' as any,
        unwellHalfUsedByWeek: {
          '2026-W47': 2,
          '2026-W46': -1,
          '2026-W45': NaN,
          '2026-W44': Infinity,
          '2026-W43': 'two' as any,
        },
      };
      ensureV4Defaults(state);

      assert.deepEqual(state.restDayKeys, ['2026-11-20', '2026-11-21']);
      assert.deepEqual(state.caringDayKeys, []);
      assert.deepEqual(state.unwellHalfUsedByWeek, { '2026-W47': 2 });
    });

    test('normalizes onboarding flag fields (0, Infinity, {}, "", false, etc. -> null; valid strings preserved)', () => {
      const fields = [
        'onboardingCompletedAt',
        'onboardingWorkoutHintSeenAt',
        'onboardingSortieHintSeenAt',
      ] as const;

      const malformedValues = [0, Infinity, -Infinity, NaN, {}, [], '', '   ', false, true, 42];

      for (const field of fields) {
        for (const malformed of malformedValues) {
          const state: Record<string, unknown> = { [field]: malformed };
          ensureV4Defaults(state);
          assert.equal(
            state[field],
            null,
            `Expected ${field} with value ${JSON.stringify(malformed)} to normalize to null`
          );
        }

        const stateMissing: Record<string, unknown> = {};
        ensureV4Defaults(stateMissing);
        assert.equal(stateMissing[field], null);

        const stateNull: Record<string, unknown> = { [field]: null };
        ensureV4Defaults(stateNull);
        assert.equal(stateNull[field], null);

        const stateValid: Record<string, unknown> = { [field]: '2026-11-20' };
        ensureV4Defaults(stateValid);
        assert.equal(stateValid[field], '2026-11-20');
      }
    });

    test('preserves existing onboardingCompletedAt and hint timestamps from v3 state through migrate v3->v4 and second migrate v4 (idempotent)', () => {
      const v3StateWithOnboarding: Record<string, unknown> = {
        coins: 420,
        level: 2,
        exp: 0,
        onboardingCompletedAt: '2026-11-20',
        onboardingWorkoutHintSeenAt: '2026-11-20T14:30:00Z',
        onboardingSortieHintSeenAt: '2026-11-20T15:00:00Z',
      };

      const mockNow = 1795240000000;
      const migratedOnce = migratePersistedState(v3StateWithOnboarding, 3, mockNow);
      assert.equal(migratedOnce.onboardingCompletedAt, '2026-11-20');
      assert.equal(migratedOnce.onboardingWorkoutHintSeenAt, '2026-11-20T14:30:00Z');
      assert.equal(migratedOnce.onboardingSortieHintSeenAt, '2026-11-20T15:00:00Z');
      assert.equal(migratedOnce.coins, 420);
      assert.equal(migratedOnce.level, 2);
      assert.equal(migratedOnce.exp, 0);

      // Snapshot and migrate again from version 4
      const snapshot = JSON.parse(JSON.stringify(migratedOnce));
      const migratedTwice = migratePersistedState(migratedOnce, 4, mockNow);
      assert.deepEqual(migratedTwice, snapshot);
      assert.equal(migratedTwice.onboardingCompletedAt, '2026-11-20');
      assert.equal(migratedTwice.onboardingWorkoutHintSeenAt, '2026-11-20T14:30:00Z');
      assert.equal(migratedTwice.onboardingSortieHintSeenAt, '2026-11-20T15:00:00Z');
    });
  });

  describe('Write-Path State Machine & Persistence Pure Logic (T4-D1 Acceptance)', () => {
    test('end-to-end workout timing flow: natural rest completion, early start rest skip, cardio/yoga persistence', () => {
      // 1. Start workout focus at T0
      const t0 = 100000;
      let currentSetStartedAt: number | null = t0;
      let restStartedAt: number | null = null;
      let isRestRunning = false;
      const sessionSets: any[] = [];

      // 2. Perform Strength Set 1 (barbell_squat, 80kg x 8), logged at T1 (45s later)
      const t1 = 100045;
      const set1Persisted = {
        id: 's1',
        exerciseId: 'barbell_squat',
        unitLabel: 'kg',
        weightKg: 80,
        reps: 8,
        plannedRestSec: 120,
        startedAt: currentSetStartedAt ?? t1,
        completedAt: t1,
        timestamp: t1,
        timingIncomplete: false,
      };
      sessionSets.push(set1Persisted);
      // Rest timer starts
      isRestRunning = true;
      restStartedAt = t1;
      currentSetStartedAt = null;

      // 3. Rest timer completes naturally after 120s at T2
      const t2 = t1 + 120000; // 220045
      const set1Finalized = {
        ...sessionSets[0],
        restTimerElapsedSec: Math.max(0, Math.round((t2 - restStartedAt) / 1000)),
        startedEarly: false,
      };
      sessionSets[0] = set1Finalized;
      isRestRunning = false;
      restStartedAt = null;
      currentSetStartedAt = t2;

      assert.equal(sessionSets[0].restTimerElapsedSec, 120);
      assert.equal(sessionSets[0].startedEarly, false);
      assert.equal(currentSetStartedAt, t2);

      // 4. Perform Cardio Set 2 (cardio_incline_run, 5km), logged at T3 (600s later)
      const t3 = t2 + 600000; // 820045
      const set2Fields = {
        id: 's2',
        exerciseId: 'cardio_incline_run',
        unitLabel: 'km',
        weightKg: 0, // Persist 0 in weightKg!
        distanceM: 5 * 1000, // 5000m
        reps: 1,
        plannedRestSec: 60,
        startedAt: currentSetStartedAt ?? t3,
        completedAt: t3,
        timestamp: t3,
        timingIncomplete: false,
      };
      sessionSets.push(set2Fields);
      isRestRunning = true;
      restStartedAt = t3;
      currentSetStartedAt = null;

      assert.equal(sessionSets[1].weightKg, 0);
      assert.equal(sessionSets[1].distanceM, 5000);
      assert.equal(sessionSets[1].startedAt, t2);

      // 5. User rests for 20s and clicks "Skip Rest" early at T4 (20s later)
      const t4 = t3 + 20000; // 840045
      const set2Finalized = {
        ...sessionSets[1],
        restTimerElapsedSec: Math.max(0, Math.round((t4 - restStartedAt) / 1000)),
        startedEarly: true, // Started early!
      };
      sessionSets[1] = set2Finalized;
      isRestRunning = false;
      restStartedAt = null;
      currentSetStartedAt = t4;

      assert.equal(sessionSets[1].restTimerElapsedSec, 20);
      assert.equal(sessionSets[1].startedEarly, true);
      assert.equal(currentSetStartedAt, t4);

      // 6. Perform Yoga/Plank Set 3 (bw_plank_core, 60s hold), logged at T5 (60s later)
      const t5 = t4 + 60000; // 900045
      const set3Fields = {
        id: 's3',
        exerciseId: 'bw_plank_core',
        unitLabel: '秒',
        weightKg: 0, // Persist 0 in weightKg!
        durationSec: 60, // 60s
        reps: 1,
        plannedRestSec: 45,
        startedAt: currentSetStartedAt ?? t5,
        completedAt: t5,
        timestamp: t5,
        timingIncomplete: false,
        // Last set trailing rest is omitted/unset
      };
      sessionSets.push(set3Fields);

      assert.equal(sessionSets[2].weightKg, 0);
      assert.equal(sessionSets[2].durationSec, 60);
      assert.equal(sessionSets[2].startedAt, t4);
      assert.equal(sessionSets[2].restTimerElapsedSec, undefined);

      // 7. Finish session: compute total restSec and restShare
      const totalDurationSec = Math.round((t5 - t0) / 1000); // (900045 - 100000) / 1000 = 800
      let totalRestSec = 0;
      for (const s of sessionSets) {
        if (typeof s.restTimerElapsedSec === 'number') {
          totalRestSec += s.restTimerElapsedSec;
        }
      }
      assert.equal(totalRestSec, 120 + 20); // 140s
      const restShare = totalRestSec / totalDurationSec; // 140 / 800 = 0.175

      const sessionRecord = {
        id: 'sess_new_complete',
        durationMinutes: Math.round(totalDurationSec / 60),
        totalDurationSec,
        restSec: totalRestSec,
        restShare,
        timingIncomplete: false,
        exerciseLogs: [
          { exerciseId: 'barbell_squat', unitLabel: 'kg', sets: [sessionSets[0]] },
          { exerciseId: 'cardio_incline_run', unitLabel: 'km', sets: [sessionSets[1]] },
          { exerciseId: 'bw_plank_core', unitLabel: '秒', sets: [sessionSets[2]] },
        ],
      };

      // Assert complete timing
      assert.equal(sessionRecord.timingIncomplete, false);
      assert.ok(sessionRecord.restShare > 0);
      assert.equal(sessionSets[0].startedEarly, false);
      assert.equal(sessionSets[1].startedEarly, true);
    });
  });
});
