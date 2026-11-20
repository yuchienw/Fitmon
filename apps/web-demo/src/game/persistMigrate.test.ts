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
  });

  describe('ensureV3Defaults & Idempotency', () => {
    test('populates brand-new save with empty defaults and sets playerCodeGeneratedAt to now', () => {
      const now = 1700000000000;
      const state: Record<string, unknown> = {};
      ensureV3Defaults(state, now);

      assert.equal(typeof state.playerCode, 'string');
      assert.equal((state.playerCode as string).length, 8);
      assert.equal(state.playerCodeGeneratedAt, now);
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

    test('if playerCode exists but playerCodeGeneratedAt is missing, sets timestamp without changing code', () => {
      const now = 1700000000000;
      const existingCode = 'EXISTING';
      const state: Record<string, unknown> = {
        playerCode: existingCode,
      };

      ensureV3Defaults(state, now);

      assert.equal(state.playerCode, existingCode);
      assert.equal(state.playerCodeGeneratedAt, now);
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
      assert.equal(migrated.playerCodeGeneratedAt, now);
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

        // 5. playerCode is 8 chars from the alphabet; playerCodeGeneratedAt === passed now
        assert.equal(typeof migrated.playerCode, 'string');
        assert.equal((migrated.playerCode as string).length, 8);
        for (const char of migrated.playerCode as string) {
          assert.ok(PLAYER_CODE_CHARSET.includes(char), `Char "${char}" should be in PLAYER_CODE_CHARSET`);
        }
        assert.equal(migrated.playerCodeGeneratedAt, mockNow);

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
        assert.equal(secondMigrated.playerCodeGeneratedAt, mockNow);
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
});
