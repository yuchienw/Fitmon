import React, { useState } from 'react';
import {
  Shirt,
  Sofa,
  Zap,
  Check,
  Coins,
  ShoppingCart,
  RotateCcw,
  Eye,
  Sparkles,
  SlidersHorizontal,
  Gem,
  CreditCard,
  ShieldCheck,
  X,
  LayoutGrid,
  Crown,
  Smile,
  Dumbbell,
  Dog,
  Layers,
  MapPin,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  AVATAR_ITEMS,
  ROOM_ITEMS,
  CONSUMABLE_ITEMS,
  IAP_PACKAGES,
  IapPackageItem,
  ConsumableItem,
  CosmeticItem,
  EquipSlot,
  RoomSlot,
} from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { ItemSpriteThumbnail } from '../../game/ItemSpriteThumbnail';

type MainShopCategory = 'avatar' | 'room' | 'consumables' | 'iap';
type AvatarSubFilter = 'all' | EquipSlot;
type RoomSubFilter = 'all' | 'furniture' | 'pet' | 'wallpaper' | 'floor';

export const ShopTab: React.FC = () => {
  const store = useGameStore();
  const [category, setCategory] = useState<MainShopCategory>('avatar');
  const [avatarFilter, setAvatarFilter] = useState<AvatarSubFilter>('all');
  const [roomFilter, setRoomFilter] = useState<RoomSubFilter>('all');
  const [targetAnchorSlot, setTargetAnchorSlot] = useState<'slotLeft' | 'slotCenter' | 'slotRight'>(
    'slotRight'
  );
  const [pendingIapSheet, setPendingIapSheet] = useState<{
    title: string;
    priceLabel: string;
    desc: string;
    onConfirm: () => void;
  } | null>(null);

  // Merge current equipped/room with live Try-On overrides (filtering out any undefined entries)
  const cleanTryOnEquipped = Object.fromEntries(
    Object.entries(store.tryOnEquipped).filter(([, v]) => Boolean(v))
  ) as Partial<Record<EquipSlot, string>>;
  const cleanTryOnRoom = Object.fromEntries(
    Object.entries(store.tryOnRoom).filter(([, v]) => Boolean(v))
  ) as Partial<Record<RoomSlot, string>>;

  const mergedEquipped: Record<EquipSlot, string> = {
    ...store.equipped,
    ...(cleanTryOnEquipped as Record<EquipSlot, string>),
  };

  const mergedRoom: Record<RoomSlot, string> = {
    ...store.room,
    ...(cleanTryOnRoom as Record<RoomSlot, string>),
  };

  const hasTryOnChanges =
    Object.keys(cleanTryOnEquipped).length > 0 || Object.keys(cleanTryOnRoom).length > 0;
  const hasCheckoutBar = store.cartItemIds.length > 0 || hasTryOnChanges;

  const allCatalog = [...AVATAR_ITEMS, ...ROOM_ITEMS];
  const cartItems = store.cartItemIds
    .map((id) => allCatalog.find((i) => i.id === id))
    .filter((i): i is CosmeticItem => Boolean(i));
  const cartTotalCoins = cartItems.reduce((sum, item) => sum + item.priceCoins, 0);

  const filteredAvatarItems = AVATAR_ITEMS.filter(
    (item) => avatarFilter === 'all' || item.slot === avatarFilter
  );

  const filteredRoomItems = ROOM_ITEMS.filter(
    (item) => roomFilter === 'all' || item.roomSubType === roomFilter
  );

  const isEquippedOrPreviewed = (item: CosmeticItem) => {
    if (!item.isRoomDecor) {
      return mergedEquipped[item.slot as EquipSlot] === item.id;
    }
    if (item.roomSubType === 'wallpaper') return mergedRoom.wallpaper === item.id;
    if (item.roomSubType === 'floor') return mergedRoom.floor === item.id;
    return (
      mergedRoom.slotLeft === item.id ||
      mergedRoom.slotCenter === item.id ||
      mergedRoom.slotRight === item.id
    );
  };

  return (
    <div className="flex flex-col">
      {/* =====================================================================
          1. STICKY PINNED TOP LIVE TRY-ON STAGE + CATEGORY CONTROLS (V2-05)
         ===================================================================== */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md px-3.5 pt-2.5 pb-2.5 border-b border-slate-800/90 shadow-md space-y-2"
        style={{ backgroundColor: 'var(--app-bar-bg)' }}
      >
        <div className="relative">
          <PixelRoomCanvas
            isActive={store.activeTab === 'shop'}
            compact
            customAvatar={{
              bodyStage: store.bodyStage,
              equipped: mergedEquipped,
              room: mergedRoom,
            }}
          />

          {/* Top-left Try-on indicator & Wardrobe quick button */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            <div className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-cyan-500/40 text-[10px] font-black text-cyan-300 flex items-center gap-1 shadow">
              <Eye className="w-3 h-3" />
              <span>{hasTryOnChanges ? '試穿預覽中' : '點商品即時試穿'}</span>
            </div>

            <button
              onClick={() => store.setWardrobeModalOpen(true)}
              className="pointer-events-auto px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-md hover:bg-amber-300"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>衣櫃佈置</span>
            </button>
          </div>
        </div>

        {/* Main 4 Shop Category Tabs (造型 / 傢俱 / 道具 / 💎儲值) */}
        <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCategory('avatar')}
            className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
              category === 'avatar'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>造型</span>
          </button>
          <button
            onClick={() => setCategory('room')}
            className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
              category === 'room'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sofa className="w-3.5 h-3.5" />
            <span>傢俱</span>
          </button>
          <button
            onClick={() => setCategory('consumables')}
            className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
              category === 'consumables'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>道具</span>
          </button>
          <button
            onClick={() => setCategory('iap')}
            className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
              category === 'iap'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-amber-300 hover:text-amber-200'
            }`}
          >
            <Gem className="w-3.5 h-3.5" />
            <span>儲值</span>
          </button>
        </div>

        {/* Sub-Filter Pills for Paper-Doll Slots */}
        {category === 'avatar' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {(
              [
                { id: 'all', label: '全部', icon: LayoutGrid },
                { id: 'hair', label: '頭飾', icon: Crown },
                { id: 'face', label: '表情', icon: Smile },
                { id: 'top', label: '上衣', icon: Shirt },
                { id: 'bottom', label: '下身', icon: Layers },
                { id: 'accessory', label: '手持', icon: Dumbbell },
              ] as const
            ).map((sub) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setAvatarFilter(sub.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 border transition flex items-center gap-1 ${
                    avatarFilter === sub.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <SubIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sub-Filter Pills + Flexible Slot Target Selector for Room & Pets */}
        {category === 'room' && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: '全部', icon: LayoutGrid },
                  { id: 'furniture', label: '器材', icon: Dumbbell },
                  { id: 'pet', label: '寵物', icon: Dog },
                  { id: 'wallpaper', label: '牆面', icon: Sofa },
                  { id: 'floor', label: '地板', icon: Layers },
                ] as const
              ).map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setRoomFilter(sub.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 border transition flex items-center gap-1 ${
                      roomFilter === sub.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <SubIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Flexible Target Slot Selector for Furniture/Pets */}
            {(roomFilter === 'all' || roomFilter === 'furniture' || roomFilter === 'pet') && (
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>擺放位置</span>
                </span>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'slotLeft', label: '左側' },
                      { id: 'slotCenter', label: '中央' },
                      { id: 'slotRight', label: '右側' },
                    ] as const
                  ).map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setTargetAnchorSlot(slot.id)}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-black transition ${
                        targetAnchorSlot === slot.id
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          2. SCROLLABLE VISUAL ITEM CATALOG GRID
         ===================================================================== */}
      <div
        className="p-3.5"
        style={{
          paddingBottom: hasCheckoutBar
            ? 'calc(172px + max(env(safe-area-inset-bottom, 0px), var(--safe-bottom, 0px)))'
            : 'calc(100px + max(env(safe-area-inset-bottom, 0px), var(--safe-bottom, 0px)))',
        }}
      >
        {category === 'avatar' || category === 'room' ? (
          <div className="grid grid-cols-2 gap-2.5">
            {(category === 'avatar' ? filteredAvatarItems : filteredRoomItems).map((item) => {
              const isOwned = store.ownedItemIds.includes(item.id);
              const inCart = store.cartItemIds.includes(item.id);
              const activePreview = isEquippedOrPreviewed(item);

              const slotBadgeLabel = !item.isRoomDecor
                ? item.slot === 'hair'
                  ? '🧢 頭飾'
                  : item.slot === 'face'
                  ? '😊 表情'
                  : item.slot === 'top'
                  ? '👕 上衣'
                  : item.slot === 'bottom'
                  ? '🩳 下身'
                  : '🏋️ 手持'
                : item.roomSubType === 'pet'
                ? '🐶 寵物'
                : item.roomSubType === 'furniture'
                ? '🏋️ 器材'
                : item.roomSubType === 'wallpaper'
                ? '🧱 牆面'
                : '🟫 地板';

              return (
                <div
                  key={item.id}
                  onClick={() =>
                    store.previewShopItem(
                      item.id,
                      item.isRoomDecor &&
                        (item.roomSubType === 'furniture' || item.roomSubType === 'pet')
                        ? targetAnchorSlot
                        : undefined
                    )
                  }
                  className={`retro-box rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition relative ${
                    activePreview
                      ? 'border-emerald-400 bg-emerald-950/20 ring-1 ring-emerald-400/50'
                      : inCart
                      ? 'border-amber-400/80 bg-amber-950/15'
                      : 'hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <ItemSpriteThumbnail item={item} size={56} />
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300">
                          {slotBadgeLabel}
                        </span>
                        {item.badgeText && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-black">
                            {item.badgeText}
                          </span>
                        )}
                        {activePreview && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                            {isOwned ? '穿戴中' : '試穿中'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-black text-white break-words leading-snug">{item.nameZh}</div>
                    {item.combatStat && (
                      <div
                        className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-black border ${
                          item.combatStat.type === 'phy'
                            ? 'bg-orange-500/20 border-orange-400/50 text-orange-300'
                            : item.combatStat.type === 'mag'
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                            : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        }`}
                      >
                        {item.combatStat.labelZh}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Button */}
                  <div className="mt-2.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {isOwned ? (
                      <button
                        onClick={() =>
                          store.previewShopItem(
                            item.id,
                            item.isRoomDecor &&
                              (item.roomSubType === 'furniture' || item.roomSubType === 'pet')
                              ? targetAnchorSlot
                              : undefined
                          )
                        }
                        className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition ${
                          activePreview
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{activePreview ? '已穿戴' : '套用'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            store.previewShopItem(
                              item.id,
                              item.isRoomDecor &&
                                (item.roomSubType === 'furniture' || item.roomSubType === 'pet')
                                ? targetAnchorSlot
                                : undefined
                            )
                          }
                          className={`px-2.5 py-2 rounded-xl text-xs font-black border transition ${
                            activePreview
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          試穿
                        </button>
                        <button
                          onClick={() => {
                            if (inCart) {
                              store.toggleCartItem(item.id);
                            } else {
                              store.previewShopItem(
                                item.id,
                                item.isRoomDecor &&
                                  (item.roomSubType === 'furniture' || item.roomSubType === 'pet')
                                  ? targetAnchorSlot
                                  : undefined
                              );
                            }
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition ${
                            inCart
                              ? 'bg-amber-400 text-slate-950 shadow'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{inCart ? '已入車' : `${item.priceCoins}🪙`}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : category === 'consumables' ? (
          /* 3. CONSUMABLES LIST (Supports both Coins and Simulated NT$ IAP) */
          <div className="space-y-2.5">
            {CONSUMABLE_ITEMS.map((c: ConsumableItem) => {
              const count = store.consumables[c.id] || 0;
              return (
                <div
                  key={c.id}
                  className="retro-box rounded-2xl p-3.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                      {c.iconEmoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white break-words">{c.nameZh}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold shrink-0">
                          ×{count}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-emerald-400 mt-0.5">
                        {c.effectBadge}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {count > 0 && (
                      <button
                        onClick={() => store.useConsumableItem(c.id)}
                        className="px-2.5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black"
                      >
                        使用
                      </button>
                    )}
                    <button
                      onClick={() => store.buyConsumable(c.id, false)}
                      className="px-2.5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      {c.priceCoins}
                    </button>
                    <button
                      onClick={() =>
                        setPendingIapSheet({
                          title: c.nameZh,
                          priceLabel: c.iapPriceUsd,
                          desc: c.effectBadge,
                          onConfirm: () => store.buyConsumable(c.id, true),
                        })
                      }
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-black"
                    >
                      {c.iapPriceUsd}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 4. SIMULATED IN-APP PURCHASE (IAP) STORE TAB (Item 4) */
          <div className="space-y-3">
            <div className="retro-box rounded-2xl p-3 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-400/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">金幣儲值與特惠禮包</div>
                  <div className="text-[11px] text-slate-400">
                    沙盒模擬內購 · 免串接真實信用卡即可測試
                  </div>
                </div>
              </div>
              <span className="px-2 py-1 rounded-lg bg-amber-400/20 text-amber-300 text-[10px] font-black shrink-0">
                測試沙盒
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {IAP_PACKAGES.map((pack: IapPackageItem) => (
                <div
                  key={pack.id}
                  className="retro-box rounded-2xl p-3.5 flex flex-col justify-between relative border-amber-500/30 hover:border-amber-400 transition"
                >
                  {pack.tagZh && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black">
                      {pack.tagZh}
                    </span>
                  )}
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mb-2">
                      {pack.iconEmoji}
                    </div>
                    <div className="text-xs font-black text-white">{pack.nameZh}</div>
                    <div className="text-sm font-mono font-black text-amber-300 mt-1">
                      +{pack.rewardCoins.toLocaleString()} 🪙
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{pack.descZh}</div>
                  </div>

                  <button
                    onClick={() =>
                      setPendingIapSheet({
                        title: pack.nameZh,
                        priceLabel: pack.priceNtd,
                        desc: pack.descZh,
                        onConfirm: () => store.purchaseIapPackage(pack.id),
                      })
                    }
                    className="mt-3 w-full retro-btn py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1 shadow"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{pack.priceNtd}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          3. SHOPPING CART & TRY-ON CHECKOUT BAR (Cleared above BottomNav)
         ===================================================================== */}
      {hasCheckoutBar && (
        <div
          className="fixed left-0 right-0 mx-auto max-w-[430px] w-full px-3.5 z-20 pointer-events-none"
          style={{
            bottom: 'calc(92px + max(env(safe-area-inset-bottom, 0px), var(--safe-bottom, 0px)))',
          }}
        >
          <div className="pointer-events-auto retro-box rounded-2xl p-3 bg-slate-950/95 border-2 border-amber-400 shadow-2xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-black text-white">
                  購物車 · {store.cartItemIds.length} 件
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-300 font-bold mt-0.5">
                合計 {cartTotalCoins.toLocaleString()} 🪙
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => store.clearTryOnAndCart()}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>還原</span>
              </button>
              {store.cartItemIds.length > 0 && (
                <button
                  onClick={() => store.checkoutCart()}
                  className="retro-btn px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-lg"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>結帳穿戴</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. SIMULATED APPLE APP STORE / GOOGLE PLAY IAP PAYMENT SHEET
         ===================================================================== */}
      {pendingIapSheet && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-sm retro-box rounded-3xl p-4 space-y-3.5 border-2 border-amber-400/70 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white">App Store / Google Play 內購模擬</span>
              </div>
              <button
                onClick={() => setPendingIapSheet(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-white">{pendingIapSheet.title}</div>
                <div className="text-xs text-emerald-400 font-bold mt-0.5">
                  {pendingIapSheet.desc}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  此為測試沙盒模擬，不會產生真實扣款
                </div>
              </div>
              <div className="text-lg font-mono font-black text-amber-300 shrink-0">
                {pendingIapSheet.priceLabel}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPendingIapSheet(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-black"
              >
                取消
              </button>
              <button
                onClick={() => {
                  pendingIapSheet.onConfirm();
                  setPendingIapSheet(null);
                }}
                className="retro-btn py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-black shadow-lg"
              >
                一鍵模擬付款
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
