import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  X,
  MoreHorizontal,
  Check,
  Shield,
  Flag,
  User,
  Users,
  Compass,
  Eye,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  visibleNotifications,
  toNotificationView,
  type NotificationItem,
  type NotificationView,
  type RecipientNotifyContext,
} from '../../game/notificationCenter';
import {
  previewSwitchSquadFromInvite,
  type SquadSocialStateSnapshot,
  type PreviewSwitchSquadResult,
} from '../../game/squadInviteRules';
import { IS_DEMO, DEMO_REPORT_DISCLAIMER } from '../../config/demo';
import { getFriendProfile } from '../../config/catalogConfig';
import { DemoDevTag } from '../social/DemoDevTag';
import { BlockConfirmModal } from '../social/BlockConfirmModal';
import { ReportModal } from '../social/ReportModal';

interface NotificationCenterProps {
  resolvedTheme?: 'light' | 'dark';
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  resolvedTheme = 'light',
}) => {
  const store = useGameStore();
  const notifications = useGameStore((s) => s.notifications);
  const devRecipientNotifyDemo = useGameStore((s) => s.devRecipientNotifyDemo);
  const devMinorTestAccount = useGameStore((s) => s.devMinorTestAccount);
  const friendIds = useGameStore((s) => s.friendIds);
  const blockedIds = useGameStore((s) => s.blockedIds);

  const [actingId, setActingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [blockingTarget, setBlockingTarget] = useState<{ id: string; nickname: string } | null>(null);
  const [reportingTarget, setReportingTarget] = useState<{ id: string; nickname: string } | null>(null);

  const recipientCtx: RecipientNotifyContext = useMemo(
    () => ({
      ...devRecipientNotifyDemo,
      isMinor: devMinorTestAccount,
      friendIds,
      blockedIds: blockedIds || [],
    }),
    [devRecipientNotifyDemo, devMinorTestAccount, friendIds, blockedIds]
  );

  const now = Date.now();

  const visibleResult = useMemo(
    () => visibleNotifications(notifications, recipientCtx, now),
    [notifications, recipientCtx, now]
  );

  // 記錄打開此 panel 當下有哪些卡片為未讀（用於顯示 4px 橘色細條 #FB923C）
  const [sessionUnreadIds] = useState<Set<string>>(() => {
    const unread = new Set<string>();
    for (const item of visibleResult.all) {
      if (item.readAt == null || item.readAt === undefined) {
        unread.add(item.id);
      }
    }
    return unread;
  });

  // 打開面板時，將所有當前可見的未讀通知標記為已讀（紅點歸零）
  useEffect(() => {
    store.markAllVisibleNotificationsRead();
    // 僅在初次 mount 時執行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileLookup = useMemo(
    () => ({
      getProfile: (id: string) => {
        const p = getFriendProfile(id);
        return p ? { nameZh: p.nameZh, level: p.level } : undefined;
      },
      friendIds,
    }),
    [friendIds]
  );

  const [confirmSwitchModal, setConfirmSwitchModal] = useState<{
    notificationId: string;
    preview: PreviewSwitchSquadResult;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleAction = (id: string, action: 'join' | 'decline' | 'accept' | 'skip') => {
    if (actingId) return; // 防止連點
    setActingId(id);
    store.applyNotificationAction(id, action);
    setTimeout(() => {
      setActingId(null);
    }, 400);
  };

  const executeJoin = (notifId: string) => {
    handleAction(notifId, 'join');
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 1200);
  };

  const handleJoinClick = (item: NotificationItem) => {
    if (actingId) return;
    const snapshot: SquadSocialStateSnapshot = {
      playerId: 'self',
      currentSquadId: store.currentSquadId,
      isSquadLeader: store.isSquadLeader,
      squadName: store.squadName,
      squadMembers: store.squadMembers,
      squadInvites: store.squadInvites,
      friendIds: store.friendIds,
      devMinorTestAccount: store.devMinorTestAccount,
      squadJoinOrder: store.squadJoinOrder,
      recentTeammates: store.recentTeammates,
      inviteSendLog: store.inviteSendLog,
      privacy: store.privacy,
      blockedIds: store.blockedIds,
      bossRewardClaimedWeekKey: store.bossRewardClaimedWeekKey,
      notifications: store.notifications,
      squadStage: store.squadStage,
      squadBossHp: store.squadBossHp,
    };
    const preview = previewSwitchSquadFromInvite(snapshot, item.refId || item.id, Date.now());
    if (preview.kind === 'confirm_5b' || preview.kind === 'confirm_5c') {
      setConfirmSwitchModal({
        notificationId: item.id,
        preview,
      });
      return;
    }
    executeJoin(item.id);
  };

  const handleMenuClick = (
    actionName: 'block' | 'report',
    actorId?: string,
    nickname?: string
  ) => {
    setActiveMenuId(null);
    const targetId = actorId || 'user_mika';
    const targetNick = nickname || '此玩家';
    if (actionName === 'block') {
      setBlockingTarget({ id: targetId, nickname: targetNick });
    } else {
      setReportingTarget({ id: targetId, nickname: targetNick });
    }
  };

  const renderCard = (item: NotificationItem) => {
    const view: NotificationView = toNotificationView(item, profileLookup, now);
    const isSessionUnread = sessionUnreadIds.has(item.id);
    const isPendingCard =
      ['squad_invite', 'join_request', 'friend_request'].includes(item.type) &&
      (!item.status || item.status === 'pending') &&
      !view.isExpired &&
      !view.isInvalid;

    const isActing = actingId === item.id;
    const isMenuOpen = activeMenuId === item.id;

    return (
      <div
        key={item.id}
        data-testid="notif-card"
        data-testid-card-id={item.id}
        className={`rounded-[14px] p-3 transition relative flex flex-col gap-2.5 ${
          isSessionUnread ? 'border-l-4 !border-l-[#FB923C]' : ''
        } ${
          view.isExpired || view.isInvalid
            ? 'bg-[#F6F1E8] dark:bg-[#1C1816] border border-[#E5DCCB] dark:border-[#38302B] text-[#6E6259] dark:text-[#A89A8C] shadow-none'
            : isPendingCard
            ? 'bg-[#FFFCF7] dark:bg-[#2A2420] border border-[#F3C29A] dark:border-[#8C5028] shadow-[0_3px_0_#F3C29A] dark:shadow-[0_3px_0_#5C341A]'
            : 'bg-white dark:bg-[#241F1C] border border-[#E5DCCB] dark:border-[#3D3530] shadow-[0_3px_0_#E5DCCB] dark:shadow-[0_3px_0_#2E2723]'
        }`}
      >
        {/* 卡片本體 data-testid 附加特定 ID 供測試選取 */}
        <span className="hidden" data-testid={`notif-card-${item.id}`} />

        {/* 頂部列：頭像 + 主要資訊 + ⋯ 選單 */}
        <div className="flex items-start gap-2.5">
          {/* 左側頭像 (36x36) */}
          <div className="shrink-0">
            {view.actorId ? (
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border shadow-xs ${
                  view.isExpired || view.isInvalid
                    ? 'bg-[#E5DCCB] text-[#6E6259] border-[#D1C5B8]'
                    : isPendingCard
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-amber-600/30'
                    : 'bg-[#F4EFE6] dark:bg-[#38302B] text-[#5C4A3E] dark:text-[#E8DDD0] border-[#E5DCCB] dark:border-[#4A4038]'
                }`}
              >
                {view.avatar || '友'}
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#F0EAE1] dark:bg-[#2E2723] flex items-center justify-center text-[#5C4A3E] dark:text-[#D1C5B8] border border-[#E5DCCB] dark:border-[#3D3530]">
                {item.type.includes('squad') ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </div>
            )}
          </div>

          {/* 中間主要文案 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[13px] font-extrabold leading-snug ${
                  view.isExpired || view.isInvalid
                    ? 'text-[#6E6259] dark:text-[#A89A8C]'
                    : 'text-[#2C241E] dark:text-[#F3ECE2]'
                }`}
              >
                {view.title}
              </span>

              {/* 陌生人標籤（不是你的好友：淡藍底中性提示，絕不用紅色警告） */}
              {view.isStranger && view.actorId && view.actorId !== 'self' && (
                <>
                  <span
                    data-testid="notif-stranger-tag"
                    className="px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-[#EEF4FB] text-[#3B5B7A] dark:bg-[#1E293B] dark:text-[#93C5FD] border border-[#D0E2F5] dark:border-[#2D4560]"
                  >
                    不是你的好友
                  </span>
                  <DemoDevTag text="試玩角色" />
                </>
              )}
            </div>

            {/* 資訊膠囊與說明 */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {view.squadName && (
                <span className="px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[#F5EFE6] dark:bg-[#2E2824] text-[#786B63] dark:text-[#B5A898] border border-[#E5DCCB] dark:border-[#423830]">
                  {view.squadName}
                </span>
              )}

              {item.type === 'squad_invite' && view.memberCount && (
                <span className="px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[#F5EFE6] dark:bg-[#2E2824] text-[#786B63] dark:text-[#B5A898] border border-[#E5DCCB] dark:border-[#423830]">
                  {view.memberCount}／4 人
                </span>
              )}

              {item.type === 'squad_invite' && view.bossName && (
                <span className="px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[#F5EFE6] dark:bg-[#2E2824] text-[#786B63] dark:text-[#B5A898] border border-[#E5DCCB] dark:border-[#423830]">
                  本週 {view.bossName}
                </span>
              )}

              {item.type === 'join_request' && view.actorLevel && (
                <span className="px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[#F5EFE6] dark:bg-[#2E2824] text-[#786B63] dark:text-[#B5A898] border border-[#E5DCCB] dark:border-[#423830]">
                  Lv.{view.actorLevel}
                </span>
              )}

              {view.subtitle && (
                <span className="text-[11px] text-[#786B63] dark:text-[#A89A8C]">
                  {view.subtitle}
                </span>
              )}

              {view.expiryLabel && (
                <span className="text-[11px] text-[#786B63] dark:text-[#A89A8C] inline-flex items-center gap-1">
                  <span>{view.expiryLabel}</span>
                  {item.type === 'squad_invite' && <DemoDevTag text="試玩加速" />}
                </span>
              )}
            </div>
          </div>

          {/* 右上角時間與 ⋯ 選單按鈕 */}
          <div className="shrink-0 flex items-center gap-1">
            <span className="text-[10.5px] text-[#A89A8C] dark:text-[#786B63]">
              {view.relativeTimeLabel}
            </span>

            <button
              onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
              aria-label="更多選項"
              className="p-1 rounded-md text-[#A89A8C] hover:text-[#5C4A3E] dark:hover:text-[#D1C5B8] transition"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ⋯ 彈出選單（封鎖 / 檢舉） */}
        {isMenuOpen && (
          <div
            className={`absolute right-3 top-10 z-30 w-36 rounded-xl border shadow-xl p-1.5 flex flex-col gap-1 transition-all ${
              resolvedTheme === 'dark'
                ? 'bg-[#26211E] border-[#4A4038] text-slate-200'
                : 'bg-white border-[#E5DCCB] text-[#5C4A3E]'
            }`}
          >
            <button
              onClick={() => handleMenuClick('block', item.actorId, view.nickname)}
              data-testid="notif-menu-block"
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>封鎖</span>
            </button>
            <button
              onClick={() => handleMenuClick('report', item.actorId, view.nickname)}
              data-testid="notif-menu-report"
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>檢舉</span>
            </button>
          </div>
        )}

        {/* 已處理標籤（已加入 / 已拒絕 / 已同意 / 已略過） */}
        {view.isHandled && (
          <div className="flex items-center gap-1 text-[11px] text-[#786B63] dark:text-[#A89A8C] pt-0.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{view.handledLabel}</span>
          </div>
        )}

        {/* 動作按鈕列 */}
        {view.actionType === 'invite' && (
          <div className="flex items-center gap-2 pt-1">
            {view.isExpired || view.isInvalid ? (
              <>
                <button
                  disabled
                  className="h-[34px] px-3.5 rounded-xl bg-[#EFE8DC] dark:bg-[#2A2521] text-[#A89A8C] dark:text-[#6E6259] text-xs font-bold cursor-not-allowed"
                >
                  加入
                </button>
                <button
                  disabled
                  className="h-[34px] px-3 rounded-xl bg-[#EFE8DC] dark:bg-[#2A2521] text-[#A89A8C] dark:text-[#6E6259] text-xs font-bold cursor-not-allowed"
                >
                  拒絕
                </button>
                <button
                  data-testid="notif-action-find-squad"
                  onClick={() => {
                    store.setNotificationsOpen(false);
                    store.setActiveTab('plaza');
                  }}
                  className="h-[30px] px-3 rounded-lg border border-[#FB923C] text-[#C2410C] dark:text-[#FB923C] bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-xs font-black active:scale-95 transition"
                >
                  去找隊伍
                </button>
              </>
            ) : !view.isHandled ? (
              <>
                <button
                  data-testid="notif-action-join"
                  disabled={isActing}
                  onClick={() => handleJoinClick(item)}
                  className="h-[34px] px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold shadow-sm active:scale-95 transition flex items-center justify-center min-w-[64px]"
                >
                  {isActing ? '加入中...' : '加入'}
                </button>
                <button
                  data-testid="notif-action-decline"
                  disabled={isActing}
                  onClick={() => handleAction(item.id, 'decline')}
                  className="h-[34px] px-3.5 rounded-xl bg-[#FFFCF7] dark:bg-[#2A2420] border border-[#E5DCCB] dark:border-[#4A4038] text-[#5C4A3E] dark:text-[#D1C5B8] hover:bg-[#F5EFE6] text-xs font-bold active:scale-95 transition"
                >
                  拒絕
                </button>
              </>
            ) : null}
          </div>
        )}

        {view.actionType === 'join_request' && (
          <div className="flex items-center gap-2 pt-1">
            {view.isExpired || view.isInvalid ? (
              <>
                <button
                  disabled
                  className="h-[34px] px-3.5 rounded-xl bg-[#EFE8DC] dark:bg-[#2A2521] text-[#A89A8C] dark:text-[#6E6259] text-xs font-bold cursor-not-allowed"
                >
                  同意
                </button>
                <button
                  disabled
                  className="h-[34px] px-3 rounded-xl bg-[#EFE8DC] dark:bg-[#2A2521] text-[#A89A8C] dark:text-[#6E6259] text-xs font-bold cursor-not-allowed"
                >
                  拒絕
                </button>
              </>
            ) : !view.isHandled ? (
              <>
                <button
                  data-testid="notif-action-accept"
                  disabled={isActing}
                  onClick={() => handleAction(item.id, 'accept')}
                  className="h-[34px] px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold shadow-sm active:scale-95 transition flex items-center justify-center min-w-[64px]"
                >
                  {isActing ? '處理中...' : '同意'}
                </button>
                <button
                  data-testid="notif-action-decline"
                  disabled={isActing}
                  onClick={() => handleAction(item.id, 'decline')}
                  className="h-[34px] px-3.5 rounded-xl bg-[#FFFCF7] dark:bg-[#2A2420] border border-[#E5DCCB] dark:border-[#4A4038] text-[#5C4A3E] dark:text-[#D1C5B8] hover:bg-[#F5EFE6] text-xs font-bold active:scale-95 transition"
                >
                  拒絕
                </button>
              </>
            ) : null}
          </div>
        )}

        {view.actionType === 'friend_request' && (
          <div className="flex items-center gap-2 pt-1">
            {view.isExpired || view.isInvalid ? (
              <>
                <button
                  disabled
                  className="h-[34px] px-3.5 rounded-xl bg-[#EFE8DC] dark:bg-[#2A2521] text-[#A89A8C] dark:text-[#6E6259] text-xs font-bold cursor-not-allowed"
                >
                  同意
                </button>
                <button
                  disabled
                  className="h-[34px] px-3 rounded-xl bg-[#EFE8DC] dark:bg-[#2A2521] text-[#A89A8C] dark:text-[#6E6259] text-xs font-bold cursor-not-allowed"
                >
                  略過
                </button>
              </>
            ) : !view.isHandled ? (
              <>
                <button
                  data-testid="notif-action-accept"
                  disabled={isActing}
                  onClick={() => handleAction(item.id, 'accept')}
                  className="h-[34px] px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold shadow-sm active:scale-95 transition flex items-center justify-center min-w-[64px]"
                >
                  {isActing ? '處理中...' : '同意'}
                </button>
                <button
                  data-testid="notif-action-skip"
                  disabled={isActing}
                  onClick={() => handleAction(item.id, 'skip')}
                  className="h-[34px] px-3.5 rounded-xl bg-[#FFFCF7] dark:bg-[#2A2420] border border-[#E5DCCB] dark:border-[#4A4038] text-[#5C4A3E] dark:text-[#D1C5B8] hover:bg-[#F5EFE6] text-xs font-bold active:scale-95 transition"
                >
                  略過
                </button>
              </>
            ) : null}
          </div>
        )}

        {view.actionType === 'nudge' && (
          <div className="flex items-center gap-2 pt-1">
            <button
              data-testid="notif-action-view-boss"
              onClick={() => {
                store.setNotificationsOpen(false);
                store.setActiveTab('home');
              }}
              className="h-[30px] px-3 rounded-lg border border-[#FB923C] text-[#C2410C] dark:text-[#FB923C] bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-xs font-black active:scale-95 transition"
            >
              看看 Boss
            </button>
          </div>
        )}

        {view.actionType === 'goto_squad' && (
          <div className="flex items-center gap-2 pt-1">
            <button
              data-testid="notif-action-goto-squad"
              onClick={() => {
                store.setNotificationsOpen(false);
                store.setActiveTab('plaza');
              }}
              className="h-[30px] px-3 rounded-lg border border-[#FB923C] text-[#C2410C] dark:text-[#FB923C] bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-xs font-black active:scale-95 transition"
            >
              前往隊伍
            </button>
          </div>
        )}

        {view.actionType === 'find_squad' && (
          <div className="flex items-center gap-2 pt-1">
            <button
              data-testid="notif-action-find-squad"
              onClick={() => {
                store.setNotificationsOpen(false);
                store.setActiveTab('plaza');
              }}
              className="h-[30px] px-3 rounded-lg border border-[#FB923C] text-[#C2410C] dark:text-[#FB923C] bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-xs font-black active:scale-95 transition"
            >
              去找隊伍
            </button>
          </div>
        )}
      </div>
    );
  };

  const hasNotifications = visibleResult.all.length > 0;

  return (
    <div
      data-testid="notif-panel"
      className={`absolute inset-0 z-30 flex flex-col overflow-hidden transition-colors ${
        resolvedTheme === 'dark' ? 'bg-[#1E1A17]' : 'bg-[#FAF6F0]'
      }`}
    >
      {/* 標題列 (高約 46px)：鈴鐺 + 「通知」 + ✕ 按鈕 */}
      <div
        className={`h-[46px] px-3.5 flex items-center justify-between border-b shrink-0 ${
          resolvedTheme === 'dark'
            ? 'bg-[#26211E] border-[#3D3530]'
            : 'bg-[#FFFCF7] border-[#E5DCCB]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#FB923C]" />
          <span className="text-base font-extrabold text-[#2C241E] dark:text-[#F3ECE2]">
            通知
          </span>
        </div>

        <button
          data-testid="notif-close"
          onClick={() => store.setNotificationsOpen(false)}
          aria-label="關閉通知"
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 列表捲動區 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
        {!hasNotifications ? (
          /* 空狀態 (2j) */
          <div
            data-testid="notif-empty"
            className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bell className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="text-base font-bold text-[#2C241E] dark:text-[#F3ECE2]">
                目前沒有通知
              </div>
              <div className="text-xs text-[#786B63] dark:text-[#A89A8C] max-w-[240px]">
                隊友的邀請、入隊申請和好友申請會出現在這裡
              </div>
            </div>

            <button
              data-testid="notif-go-invite"
              onClick={() => {
                store.setNotificationsOpen(false);
                store.setInvitePanelOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-sm active:scale-95 transition"
            >
              去邀請隊友
            </button>
          </div>
        ) : (
          <>
            {/* 「需要處理」置頂區 (只有在至少有一筆待處理項目時顯示) */}
            {visibleResult.pendingActionable.length > 0 && (
              <div
                data-testid="notif-section-pending"
                className="space-y-2.5"
              >
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-xs font-black text-[#8C5028] dark:text-[#F3C29A]">
                    需要處理
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-black border border-orange-300/40">
                    {visibleResult.pendingActionable.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {visibleResult.pendingActionable.map((item) => renderCard(item))}
                </div>
              </div>
            )}

            {/* 「一般」區 */}
            {visibleResult.general.length > 0 && (
              <div
                data-testid="notif-section-general"
                className="space-y-2.5"
              >
                <div className="px-1 text-xs font-black text-[#786B63] dark:text-[#A89A8C]">
                  一般
                </div>

                <div className="space-y-2.5">
                  {visibleResult.general.map((item) => renderCard(item))}
                </div>
              </div>
            )}

            {/* 頁尾小字說明 */}
            <div className="text-center py-4 text-[11px] text-[#A89A8C] dark:text-[#6E6259]">
              只保留最近 30 天、最多 50 則
            </div>
          </>
        )}
      </div>

      {/* 5b / 5c 換隊確認框 */}
      {confirmSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#FFFCF7] border-2 border-[#F3C29A] rounded-2xl p-5 shadow-2xl space-y-3.5 text-[#29221E]">
            <div className="text-base font-black text-center text-[#29221E]">
              {confirmSwitchModal.preview.confirmTitle}
            </div>

            <div className="text-xs text-[#5C4A3E] leading-relaxed space-y-2">
              <p>{confirmSwitchModal.preview.confirmBody}</p>

              {confirmSwitchModal.preview.claimedNote && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold leading-relaxed">
                  ⚠️ {confirmSwitchModal.preview.claimedNote}
                </div>
              )}

              <p className="text-[11px] text-[#786B63] pt-1">
                {confirmSwitchModal.preview.footerText}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                data-testid="confirm-switch-cancel"
                onClick={() => setConfirmSwitchModal(null)}
                className="py-2.5 rounded-xl bg-white border border-[#E5DCCB] text-[#5C4A3E] text-xs font-black hover:bg-slate-100 transition"
              >
                先不要
              </button>
              <button
                data-testid="confirm-switch-accept"
                onClick={() => {
                  const notifId = confirmSwitchModal.notificationId;
                  setConfirmSwitchModal(null);
                  executeJoin(notifId);
                }}
                className="py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black shadow transition"
              >
                確定加入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti 彩紙動畫 (Q26: 1.2 秒) */}
      {showConfetti && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px] animate-fade-in" />
          <div className="text-center z-10 space-y-2">
            <div className="text-5xl animate-bounce">🎉✨🎊</div>
            <div className="text-lg font-black text-amber-600 bg-white/95 px-5 py-2 rounded-full shadow-xl border border-amber-300">
              成功加入戰隊！
            </div>
          </div>
        </div>
      )}

      {/* 封鎖確認框 */}
      {blockingTarget && (
        <BlockConfirmModal
          isOpen={!!blockingTarget}
          targetId={blockingTarget.id}
          targetNickname={blockingTarget.nickname}
          onCancel={() => setBlockingTarget(null)}
          onConfirm={() => {
            store.blockPlayerAction(blockingTarget.id);
            setBlockingTarget(null);
          }}
        />
      )}

      {/* 檢舉彈窗 */}
      {reportingTarget && (
        <ReportModal
          isOpen={!!reportingTarget}
          targetId={reportingTarget.id}
          targetNickname={reportingTarget.nickname}
          onClose={() => setReportingTarget(null)}
        />
      )}
    </div>
  );
};
