import React from 'react';
import {
  X,
  Globe,
  Volume2,
  RotateCcw,
  Coins,
  Zap,
  Wrench,
  Bot,
  User,
  Dumbbell,
  Flame,
  Footprints,
} from 'lucide-react';
import { useGameStore, RoomPoseOverride } from '../../stores/useGameStore';
import { IS_DEMO } from '../../config/demo';

export const SettingsModal: React.FC = () => {
  const store = useGameStore();
  if (!store.settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm retro-box rounded-2xl p-4 space-y-4 border-2 border-slate-700">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-black text-white">⚙️ 系統設定與 MVP 測試控制台</h3>
          <button
            onClick={() => store.setSettingsOpen(false)}
            aria-label="關閉"
            className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Mode, Language & Sound */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-200">
              🎨 主題
            </span>
            <div className="flex gap-1">
              {(
                [
                  { id: 'light', label: '淺色' },
                  { id: 'dark', label: '深色' },
                  { id: 'system', label: '跟隨系統' },
                ] as const
              ).map((tm) => (
                <button
                  key={tm.id}
                  onClick={() => store.setThemeMode(tm.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                    store.themeMode === tm.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tm.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              介面語系 (i18n)
            </span>
            <div className="flex gap-1">
              {(['zh-TW', 'en'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => store.setLocale(loc)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    store.locale === loc
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {loc === 'zh-TW' ? '繁體中文' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-400" />
              8-Bit 街機音效 (SFX)
            </span>
            <button
              onClick={() => store.toggleSound()}
              className={`px-3 py-1 rounded-lg text-xs font-black ${
                store.soundEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {store.soundEnabled ? '開啟 ON' : '靜音 OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Chiptune 背景音樂 (BGM)
            </span>
            <button
              onClick={() => store.toggleBgm()}
              className={`px-3 py-1 rounded-lg text-xs font-black ${
                store.bgmEnabled
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {store.bgmEnabled ? '播放中 ON' : '關閉 OFF'}
            </button>
          </div>
        </div>

        {/* Developer / MVP Quick Test Cheats */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 space-y-2.5">
          <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>MVP 驗收快速測試工具 (測試外掛)</span>
          </div>

          {/* Room Avatar Pose Override (Moved from Room Canvas to Dev Cheats) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>房間娃娃姿勢控制（一般玩家由 AI 自主行動）</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {(
                [
                  { id: 'AUTO', label: 'AI自主', icon: Bot },
                  { id: 'IDLE', label: '站姿', icon: User },
                  { id: 'SQUAT', label: '深蹲', icon: Dumbbell },
                  { id: 'CURL', label: '彎舉', icon: Flame },
                  { id: 'WALK', label: '散步', icon: Footprints },
                ] as { id: RoomPoseOverride; label: string; icon: React.FC<{ className?: string }> }[]
              ).map((p) => {
                const PoseIcon = p.icon;
                const active = store.devRoomPoseOverride === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => store.setDevRoomPoseOverride(p.id)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-black flex flex-col items-center justify-center gap-0.5 border transition ${
                      active
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    <PoseIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => store.addDemoCoins(500)}
              className="retro-btn py-2 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center justify-center gap-1"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>+500 測試金幣</span>
            </button>

            <button
              onClick={() => store.refillStaminaFull()}
              className="retro-btn py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>補滿 100 體力</span>
            </button>
          </div>
        </div>

        {/* 組隊試玩開關與通知測試（測試用，上線前移除） */}
        {IS_DEMO && (
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-3">
            <div className="text-xs font-black text-cyan-300">
              組隊與通知試玩開關（測試用，上線前移除）
            </div>

            {/* 未成年測試帳號 */}
            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-200">未成年測試帳號</div>
                <div className="text-[10px] text-slate-400">開啟後不會收到路人／陌生人的入隊請求與組隊邀請</div>
              </div>
              <button
                data-testid="dev-minor-toggle"
                onClick={() => store.setDevMinorTestAccount(!store.devMinorTestAccount)}
                className={`px-3 py-1 rounded-lg text-xs font-black ${
                  store.devMinorTestAccount
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {store.devMinorTestAccount ? '開啟 ON' : '關閉 OFF'}
              </button>
            </div>

            {/* 模擬收件狀態 (非正式存檔欄位，僅試玩模擬收件狀態，Q19 隊友催促過濾測試) */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-slate-200">
                模擬收件人狀態（Q19 隊友提醒過濾測試）
              </div>
              <div className="text-[10px] text-slate-400">
                非正式存檔欄位，任一開啟時隊友提醒通知隱藏且不計紅點
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  data-testid="dev-toggle-rest-day"
                  onClick={() =>
                    store.setDevRecipientNotifyDemo({
                      isRestDay: !store.devRecipientNotifyDemo.isRestDay,
                    })
                  }
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                    store.devRecipientNotifyDemo.isRestDay
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  休息日: {store.devRecipientNotifyDemo.isRestDay ? 'ON' : 'OFF'}
                </button>

                <button
                  data-testid="dev-toggle-caring-body"
                  onClick={() =>
                    store.setDevRecipientNotifyDemo({
                      isCaringForBody: !store.devRecipientNotifyDemo.isCaringForBody,
                    })
                  }
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                    store.devRecipientNotifyDemo.isCaringForBody
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  照顧身體: {store.devRecipientNotifyDemo.isCaringForBody ? 'ON' : 'OFF'}
                </button>

                <button
                  data-testid="dev-toggle-paused"
                  onClick={() =>
                    store.setDevRecipientNotifyDemo({
                      isPaused: !store.devRecipientNotifyDemo.isPaused,
                    })
                  }
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                    store.devRecipientNotifyDemo.isPaused
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  暫停中: {store.devRecipientNotifyDemo.isPaused ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* 通知中心測試種子 */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-slate-200">通知測試資料</div>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  data-testid="dev-seed-qa-mixed"
                  onClick={() => {
                    store.seedDemoNotifications('qa_mixed');
                    store.showToast('已塞入綜合測試通知 (QA)');
                  }}
                  className="py-1.5 px-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold"
                >
                  塞入綜合測試通知
                </button>

                <button
                  data-testid="dev-seed-ten-plus"
                  onClick={() => {
                    store.seedDemoNotifications('ten_plus');
                    store.showToast('已塞入 12 則通知 (測試 9+ 紅點)');
                  }}
                  className="py-1.5 px-2 rounded-lg bg-orange-950/50 hover:bg-orange-900/60 border border-orange-500/40 text-orange-300 text-xs font-bold"
                >
                  塞入 10+ 未讀 (紅點 9+)
                </button>

                <button
                  data-testid="dev-clear-notifications"
                  onClick={() => {
                    store.clearNotifications();
                    store.showToast('已清空所有通知');
                  }}
                  className="col-span-2 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold"
                >
                  清空所有通知
                </button>
              </div>
            </div>

            {/* 好友系統測試與 QA 代碼 (T3-D9) */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                <span>好友系統 QA 代碼與種子 (T3-D9)</span>
              </div>
              <div className="bg-slate-900/90 rounded-lg p-2 text-[11px] space-y-1 font-mono text-slate-300 border border-slate-800">
                <div className="text-[10px] font-sans font-bold text-slate-400 mb-1">
                  可複製於「找人」測試搜尋結果：
                </div>
                <div className="flex justify-between">
                  <span>Mika (成人・可搜尋):</span>
                  <span className="text-emerald-400 font-bold select-all">K7PM 4XQ9</span>
                </div>
                <div className="flex justify-between">
                  <span>Jun (成人・可搜尋):</span>
                  <span className="text-emerald-400 font-bold select-all">R3HW 8NTE</span>
                </div>
                <div className="flex justify-between">
                  <span>Leo (成人・關閉代碼找人):</span>
                  <span className="text-slate-400 select-all">W9CT 2KMF</span>
                </div>
                <div className="flex justify-between">
                  <span>小樹 (未成年・搜不到):</span>
                  <span className="text-slate-400 select-all">T2MN 8XWP</span>
                </div>
                <div className="flex justify-between">
                  <span>舊代碼 (失效舊碼・搜不到):</span>
                  <span className="text-slate-400 select-all">W9CT 2KMX</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  data-testid="dev-seed-incoming-friend"
                  onClick={() => store.seedIncomingFriendRequest()}
                  className="py-1.5 px-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
                >
                  塞入 Mika 好友申請
                </button>

                <button
                  data-testid="dev-seed-recent-teammates"
                  onClick={() => store.seedRecentTeammates()}
                  className="py-1.5 px-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold"
                >
                  塞入最近隊友資料
                </button>
              </div>
            </div>

            {/* 隊伍變動與每週獎勵測試 (T3-D4 測試用，上線前移除) */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-xs font-bold text-slate-200">
                隊伍變動與每週獎勵（測試用，上線前移除）
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  data-testid="dev-seed-squad-members"
                  onClick={() => store.seedSquadMembers()}
                  className="py-1.5 px-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
                >
                  加入假隊員
                </button>

                <button
                  data-testid="dev-join-fake-squad-as-member"
                  onClick={() => store.joinFakeSquadAsMember()}
                  className="py-1.5 px-2 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-bold"
                >
                  加入假隊伍當隊員
                </button>

                <button
                  data-testid="dev-simulate-kicked"
                  onClick={() => store.simulateKicked()}
                  className="py-1.5 px-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-bold"
                >
                  模擬被請離
                </button>

                <button
                  data-testid="dev-claim-boss-reward-week"
                  onClick={() => store.claimBossRewardWeek()}
                  className="py-1.5 px-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-bold"
                >
                  標記本週 Boss 獎勵已領
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset LocalStorage */}
        <button
          onClick={() => store.resetDemoState()}
          className="w-full py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置本機 LocalStorage 初始進度</span>
        </button>
      </div>
    </div>
  );
};
