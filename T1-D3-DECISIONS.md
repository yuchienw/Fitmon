# T1-D3 技術決策與文案審核紀錄

本文件記錄 **T1-D3「移除獨立打卡按鈕」** 及對齊定稿 v1.1 四個 Today／Boss 狀態的架構決策、邊界設定與健身文案對齊清單。

---

## 1. 架構決策與實作摘要

### 1.1 移除空按領獎路徑與 CheckInSheet
- 徹底刪除 `apps/web-demo/src/components/sheets/CheckInSheet.tsx`，並在 `App.tsx` 移除掛載與引用。
- 移除首頁與冒險入口的所有「打卡」按鈕及「今天有動」領獎流程。
- `useGameStore` 保留 `checkinSheetOpen: false` 與 `setCheckinSheetOpen` 定義以維持型別向下相容，但 UI 絕不再開啟此 Sheet。
- `store.checkin()` 保留底層純函式能力與開發外掛支援（「設為今天已打卡／尚未打卡」維持可用），UI 不再直接呼叫空領。
- 「今日已打卡」僅作為 D3b／D3c 的狀態標籤展示，不再作為互動按鈕。

### 1.2 不 bump persist 與不新增 persist 欄位
- **維持 persist version 4**，維持 persist key `fitmon-mvp-storage-v6`。
- 新增的 UI 狀態 `bossLockedSheetOpen` 與 `pendingDisclaimerAction` 皆為記憶體中（in-memory）狀態，**未納入 `partialize`**，絕不污染持久化資料。
- 既有金幣、經驗值與打卡獎勵數值常數維持原樣，未作任何調整。

### 1.3 T6 旗標維持不動
- 未使用或寫入 T6 新手引導旗標（`onboardingCompletedAt`、`onboardingWorkoutHintSeenAt`、`onboardingSortieHintSeenAt`）。這些欄位維持現狀留待 T6 工單處理。

### 1.4 TodayHeroCard 四態流轉與資料判定
抽離純函式 `getTodayHeroCardState` (`apps/web-demo/src/game/todayCardState.ts`) 進行狀態計算：
1. **`idle`（D3a）**：今天尚未打卡 (`!checkedIn`) 且當天無運動紀錄 (`daySessionsCount === 0`)。
2. **`progress`（沿用 T4-D5）**：今天尚未打卡 (`!checkedIn`)，但當天已有紀錄且尚未達標 (`daySessionsCount > 0 && !dayProgressMet`)。保留既有 `day-progress-hint`（「再 X 分鐘就算數」等），主按鈕為「繼續運動」。
3. **`ready`（D3b）**：當日已打卡且尚未出擊 (`checkedIn && !bossDone`)。若當天有紀錄，在週條資訊列上方顯示運動摘要（例如「快走 32 分・3.1 公里」與「+N 筆」）。主按鈕為「去出擊」。
4. **`sortied`（D3c）**：當日已打卡且已完成出擊 (`checkedIn && bossDone`)。無主按鈕，顯示倒數計時與「再記一筆運動・只存紀錄」。

> **舊存檔相容**：若舊存檔在當天已打卡但無運動紀錄，不收回打卡獎勵，依 `bossDone` 走 `ready` 或 `sortied`。

### 1.5 隊友列顯示規則
- 隊友列在 `ready` 與 `sortied` 保留。
- 依 D3a 設計稿，在 `idle`（及 `progress`）中隱藏隊友列，達成與設計稿像素級對齊。

### 1.6 今天休息入口邊界（T1-D5 邊界約定）
- 在 `idle` 與 `progress` 狀態保留 D3a 的兩顆次要按鈕「今天休息」「我不舒服」。
- 「我不舒服」打開既有 `UnwellSheet`（關閉時不再回到 CheckInSheet）。
- **「今天休息」**：未發明 T1-D5b 休息日 Today 卡，亦未自製未定案之確認 Sheet 或寫入 `restDayKeys`。點擊時以 toast 提示教練定稿文案「休息也是訓練的一部分」（copy 60），完整休息確認與休息日卡留待 T1-D5 實作。

### 1.7 BossLockedSheet（D3d）
- 當日未打卡時，於冒險分頁點擊「進入戰鬥」或戰鬥中的「出擊」，均不打開 CheckInSheet，亦不直接出擊，改為開啟 `BossLockedSheet`。
- Boss 入口維持可點擊（不灰階、不上鎖）。
- Sheet 內提供當日進度晶片（例如「今天 n／10 分」與「跑走 1 公里也算」）、主按鈕「去運動」（切換至運動分頁）與文字按鈕「先逛逛地圖」（僅關閉 Sheet）。

### 1.8 首次免責聲明觸發時機
- 修正 `DisclaimerSheet` 原先在 `disclaimerAcceptedAt === null` 時自動蓋住整個 App 的行為，改為僅在 `disclaimerOpen === true` 時開啟。
- 觸發時機改為「第一次準備記錄運動前」（例如在首頁或 BossLockedSheet 點擊「去運動／繼續運動／再記一筆」，或在運動頁點擊開始訓練）。
- 使用者點擊「我知道了」後，自動記錄 `disclaimerAcceptedAt` 並接續執行原本欲進行的動作（例如進入運動頁或啟動訓練）。既有免責文案未作更動。

---

## 2. 出現的健身相關文案清單（供教練核對）

以下列出本工單畫面與流程中涉及的健身文案，皆完全遵循設計稿定稿 v1.1 及 `copy-for-coach.md` 通過條目：

| # | 文案內容 | 出現畫面 / 元件 | 對應工單 | 審稿來源與狀態 |
|---|---|---|---|---|
| 53 | 任何運動都算，一天加起來滿 10 分鐘就算數 | TodayHeroCard（idle、progress 副標） | T1-D3 | 通過（取代方案 B「散步也算、5 分鐘也算」） |
| 54 | 去運動 | TodayHeroCard（idle 主按鈕）、BossLockedSheet 主按鈕 | T1-D3 | 通過 |
| 54 | 繼續運動 | TodayHeroCard（progress 主按鈕） | T1-D3 / T1-D4 | 通過 |
| 14 / 55 | 再 X 分鐘就算數（依即時進度計算） | TodayHeroCard（progress 標題及進度提示） | T1-D4 / T4-D5 | 通過 |
| 55 | 今天的運動 n／10 分、可以累加 | TodayHeroCard（progress 進度提示列） | T1-D4 / T4-D5 | 通過 |
| 63 | 今天的 Boss 在等你。今天動滿 10 分鐘，就能出擊一次。散步、伸展、打球都算。 | BossLockedSheet（D3d 標題與說明） | T1-D3 | 通過 |
| 64 | 跑走 1 公里也算 | BossLockedSheet（D3d 進度 chip） | T1-D3 | 通過 |
| 65 | 還想動？再記一筆運動（今天的獎勵已領） | TodayHeroCard（ready 次要連結） | T1-D3 | 通過 |
| 65 | 再記一筆運動・只存紀錄 | TodayHeroCard（sortied 次要連結） | T1-D3 | 通過 |
| 60 | 今天休息？休息也是訓練的一部分。 | TodayHeroCard「今天休息」點擊回饋 | T1-D5 | 通過 |
| 33 | 先停止運動 | UnwellSheet（標題） | T1-D6 | 通過（沿用） |
| 34 | 先停止運動；頭暈、胸悶或疼痛持續的話，請就醫。如果胸痛、呼吸困難或快昏倒，請立即撥打 119。 | UnwellSheet（醫療指引與 119 緊急區塊） | T1-D6 | 定稿通過 |
| 35 | 今天不會跳提醒，隊友也不會催你。已經存的紀錄不受影響。 | UnwellSheet（底部備註，取代舊句「打卡不受影響…」） | T1-D6 | 通過 |
| D3a | 今天還沒動，動一下就能出擊 | TodayHeroCard（idle 標題） | T1-D3 | 定稿 v1.1 設計稿通過 |
| D3b | 可以出擊了、今日已打卡、去出擊 | TodayHeroCard（ready 狀態標題、標籤與主按鈕） | T1-D3 | 定稿 v1.1 設計稿通過 |
| D3c | 今天已出擊，明天 00:00 再來、今日已打卡 | TodayHeroCard（sortied 狀態標題與標籤） | T1-D3 | 定稿 v1.1 設計稿通過 |
| D3d | 先逛逛地圖 | BossLockedSheet（次要文字按鈕） | T1-D3 | 定稿 v1.1 設計稿通過 |

---

## 3. 測試驗證紀錄

在 `apps/web-demo` 執行：
1. `npm test`：
   - 總計 123 個測試套件、364 項測試全部通過（含新增之 `src/game/todayCardState.test.ts` 涵蓋 idle、progress、ready、sortied 四態判斷、舊存檔無紀錄相容、多運動紀錄摘要格式化等測試）。
2. `npm run build`：
   - TypeScript 型別檢查 (`tsc -b`) 通過，零錯誤、零警告。
   - Vite 生產版本打包成功。
