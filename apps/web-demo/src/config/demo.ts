/**
 * 假陌生人、試玩加速、檢舉標示等試玩專用碼。
 * 正式版建置時改為 false，以便 tree-shake / 整包拿掉。
 */
export const IS_DEMO = true;

/** 試玩加速開關（供後續工單串接，試玩版預設與 IS_DEMO 連動） */
export const DEMO_SPEEDUP_ENABLED = IS_DEMO;

/** 試玩版檢舉警語（僅在 IS_DEMO 為 true 時提供/顯示） */
export const DEMO_REPORT_DISCLAIMER = '試玩版不會真的送出檢舉';

export interface DemoFakeSquad {
  id: string;
  name: string;
  leaderId: string;
  leaderNameZh: string;
  members: any[];
  inviteCode: string;
}

// 測試用，上線前移除
// 資安規定：假角色與假戰隊不得使用真實個資（無真實姓名、電話、Email 或真人照片）。
// 正式版建置時 IS_DEMO 為 false，DEMO_FAKE_SQUADS 為空陣列。
export const DEMO_FAKE_SQUADS: DemoFakeSquad[] = IS_DEMO
  ? [
      {
        id: 'squad_titan',
        name: '泰坦力量戰隊',
        leaderId: 'celeb_titan_chen', // 陳巨石 (stranger / celebrity)
        leaderNameZh: '健力金牌 · 陳巨石',
        members: [
          {
            id: 'celeb_titan_chen',
            nameZh: '健力金牌 · 陳巨石',
            roleType: 'phy',
            roleBadgeZh: '👑 泰坦物攻王',
            gearDescZh: '奧林匹亞紀念腰帶 + 頂級魔攻加護',
            hasWorkedOutToday: true,
            workoutAuditZh: '✅ 巨力破壞 12組 · 心率 155bpm · 組間計時嚴謹',
            isSuspectedCheater: false,
            comboSkillAppliedZh: '⚡ 施放【泰坦暴擊】：本輪個人傷害提升 50%',
            damageDealt: 1200,
            nudgedCount: 0,
            bodyStage: 'powerlifter',
            equipped: {
              hair: 'hair_ headband_red',
              face: 'face_pixel_shades',
              top: 'top_crimson_sbd',
              bottom: 'bottom_navy_shorts',
              accessory: 'acc_iron_dumbbell',
            },
          },
          {
            id: 'celeb_aesthetic_lin',
            nameZh: '林健美 · Jay',
            roleType: 'mag',
            roleBadgeZh: '✨ 魔攻美學',
            gearDescZh: '無袖健美背心 + 緊身金短褲',
            hasWorkedOutToday: true,
            workoutAuditZh: '✅ 肩背雕塑 15組 · 組間計時 60s 完整',
            isSuspectedCheater: false,
            damageDealt: 850,
            nudgedCount: 0,
            bodyStage: 'aesthetic',
            equipped: {
              hair: 'hair_spiky_gold',
              face: 'face_pixel_shades',
              top: 'top_bare_muscles',
              bottom: 'bottom_gold_tights',
              accessory: 'acc_protein_shaker',
            },
          },
        ],
        inviteCode: 'FIT442' // getSquadInviteCode('泰坦力量戰隊'),
      },
      {
        id: 'squad_cardio',
        name: '有氧魔焰戰隊',
        leaderId: 'user_leo', // 街頭健體 · Leo
        leaderNameZh: '街頭健體 · Leo',
        members: [
          {
            id: 'user_leo',
            nameZh: '街頭健體 · Leo',
            roleType: 'phy',
            roleBadgeZh: '🥊 力量型',
            gearDescZh: '黑魂訓練吊嘎 + 鑄鐵 20kg 啞鈴',
            hasWorkedOutToday: true,
            workoutAuditZh: '🤥 耗時 5 秒狂按 6 組深蹲 (組間休息 0秒 · 疑似空氣健身)',
            isSuspectedCheater: true,
            comboSkillAppliedZh: '⚠️ 未通過組間休息驗證（無法觸發連攜技）',
            damageDealt: 15,
            nudgedCount: 0,
            bodyStage: 'aesthetic',
            equipped: {
              hair: 'hair_spiky_gold',
              face: 'face_confident_smile',
              top: 'top_bare_muscles',
              bottom: 'bottom_camo_joggers',
              accessory: 'acc_iron_dumbbell',
            },
          },
        ],
        inviteCode: 'FIT110' // getSquadInviteCode('有氧魔焰戰隊'),
      },
    ]
  : [];

export interface DemoSearchablePlayer {
  id: string;
  playerCode: string;
  nickname: string;
  level: number;
  isMinor?: boolean;
  discoverableByCode?: boolean;
  blockedYou?: boolean;
  inviteFrom?: 'everyone' | 'friends';
  avatar?: string;
  privacy?: {
    inviteFrom?: 'everyone' | 'friends';
    discoverableByCode?: boolean;
  };
}

// 測試用假陌生人搜尋名錄（上線前移除，IS_DEMO 為 false 時整包為空陣列）
export const DEMO_PLAYER_DIRECTORY: DemoSearchablePlayer[] = IS_DEMO
  ? [
      {
        id: 'user_mika',
        playerCode: 'K7PM4XQ9',
        nickname: 'Mika',
        level: 18,
        isMinor: false,
        discoverableByCode: true,
        inviteFrom: 'everyone',
      },
      {
        id: 'user_jun',
        playerCode: 'R3HW8NTE',
        nickname: 'Jun',
        level: 25,
        isMinor: false,
        discoverableByCode: true,
        inviteFrom: 'everyone',
      },
      {
        id: 'user_leo',
        playerCode: 'W9CT2KMF',
        nickname: 'Leo',
        level: 22,
        isMinor: false,
        discoverableByCode: false, // 隱藏（搜不到）
        inviteFrom: 'everyone',
      },
      {
        id: 'user_tree',
        playerCode: 'T2MN8XWP',
        nickname: '小樹',
        level: 4,
        isMinor: true, // 未成年（搜不到）
        discoverableByCode: true,
        inviteFrom: 'friends',
      },
    ]
  : [];

