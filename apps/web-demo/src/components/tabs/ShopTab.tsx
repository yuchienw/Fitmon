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
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  AVATAR_ITEMS,
  ROOM_ITEMS,
  CONSUMABLE_ITEMS,
  CosmeticItem,
  EquipSlot,
  RoomSlot,
} from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { ItemSpriteThumbnail } from '../../game/ItemSpriteThumbnail';

type MainShopCategory = 'avatar' | 'room' | 'consumables';
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

  // Merge current equipped/room with live Try-On overrides
  const mergedEquipped: Record<EquipSlot, string> = {
    ...store.equipped,
    ...(store.tryOnEquipped as Record<EquipSlot, string>),
  };

  const mergedRoom: Record<RoomSlot, string> = {
    ...store.room,
    ...(store.tryOnRoom as Record<RoomSlot, string>),
  };

  const hasTryOnChanges =
    Object.keys(store.tryOnEquipped).length > 0 || Object.keys(store.tryOnRoom).length > 0;

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
    <div className="flex flex-col pb-24">
      {/* =====================================================================
          1. STICKY PINNED TOP LIVE TRY-ON STAGE + CATEGORY CONTROLS (V2-05)
         ===================================================================== */}
      <div className="sticky top-0 z-30 bg-[#0d111a]/95 backdrop-blur-md px-3.5 pt-2.5 pb-2.5 border-b border-slate-800/90 shadow-xl space-y-2">
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
              <span>{hasTryOnChanges ? '試穿預覽中 (尚未結帳)' : '點選下方商品可即時試穿'}</span>
            </div>

            <button
              onClick={() => store.setWardrobeModalOpen(true)}
              className="pointer-events-auto px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-md hover:bg-amber-300"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>紙娃娃衣櫃與房間佈置</span>
            </button>
          </div>
        </div>

        {/* Main 3 Shop Category Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCategory('avatar')}
            className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
              category === 'avatar'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>紙娃娃造型</span>
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
            <span>傢俱與寵物</span>
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
            <span>能量道具</span>
          </button>
        </div>

        {/* Sub-Filter Pills for Paper-Doll Slots (V2-13) */}
        {category === 'avatar' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {(
              [
                { id: 'all', label: '全部部位' },
                { id: 'hair', label: '🧢 頭飾/髮型' },
                { id: 'face', label: '😊 臉部/表情' },
                { id: 'top', label: '👕 上衣' },
                { id: 'bottom', label: '🩳 下身短褲' },
                { id: 'accessory', label: '🏋️ 手持裝備' },
              ] as const
            ).map((sub) => (
              <button
                key={sub.id}
                onClick={() => setAvatarFilter(sub.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 border transition ${
                  avatarFilter === sub.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-Filter Pills + Flexible Slot Target Selector for Room & Pets (V2-04, V2-08) */}
        {category === 'room' && (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: '全部佈景' },
                  { id: 'furniture', label: '🏋️ 器材與傢俱' },
                  { id: 'pet', label: '🐶 寵物夥伴' },
                  { id: 'wallpaper', label: '🧱 牆面壁紙' },
                  { id: 'floor', label: '🟫 地板材質' },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setRoomFilter(sub.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 border transition ${
                    roomFilter === sub.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Flexible Target Slot Selector for Furniture/Pets */}
            {(roomFilter === 'all' || roomFilter === 'furniture' || roomFilter === 'pet') && (
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-bold text-slate-400">
                  📍 傢俱/寵物試擺位置 (可自由放任意位置):
                </span>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'slotLeft', label: '左側區' },
                      { id: 'slotCenter', label: '中央前景' },
                      { id: 'slotRight', label: '右側區' },
                    ] as const
                  ).map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setTargetAnchorSlot(slot.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black transition ${
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
          2. SCROLLABLE VISUAL ITEM CATALOG GRID (V2-05, V2-13)
         ===================================================================== */}
      <div className="p-3.5">
        {category !== 'consumables' ? (
          <div className="grid grid-cols-2 gap-2.5">
            {(category === 'avatar' ? filteredAvatarItems : filteredRoomItems).map((item) => {
              const isOwned = store.ownedItemIds.includes(item.id);
              const inCart = store.cartItemIds.includes(item.id);
              const activePreview = isEquippedOrPreviewed(item);

              const slotBadgeLabel = !item.isRoomDecor
                ? item.slot === 'hair'
                  ? '🧢 頭飾'
                  : item.slot === 'face'
                  ? '😊 臉部'
                  : item.slot === 'top'
                  ? '👕 上衣'
                  : item.slot === 'bottom'
                  ? '🩳 下身'
                  : '🏋️ 手持'
                : item.roomSubType === 'pet'
                ? '🐶 寵物裝飾'
                : item.roomSubType === 'furniture'
                ? '🏋️ 自由擺設'
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
                    {/* Top Row: Pixel-Art Item Sprite Thumbnail + Slot/Rarity Badges */}
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

                    <div className="text-xs font-black text-white truncate">{item.nameZh}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.nameEn}</div>
                  </div>

                  {/* Bottom Action Button: Equip if Owned, or Toggle Shopping Cart if Unowned */}
                  <div className="mt-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                        <span>{activePreview ? '已裝備於身上' : '免費換裝套用'}</span>
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
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-black border transition ${
                            activePreview
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                          title="在上方固定視窗試穿"
                        >
                          試穿
                        </button>
                        <button
                          onClick={() => {
                            store.previewShopItem(
                              item.id,
                              item.isRoomDecor &&
                                (item.roomSubType === 'furniture' || item.roomSubType === 'pet')
                                ? targetAnchorSlot
                                : undefined
                            );
                            store.toggleCartItem(item.id);
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
        ) : (
          /* 3. CONSUMABLES LIST */
          <div className="space-y-2.5">
            {CONSUMABLE_ITEMS.map((c) => {
              const count = store.consumables[c.id] || 0;
              return (
                <div
                  key={c.id}
                  className="retro-box rounded-2xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                      {c.iconEmoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{c.nameZh}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold">
                          庫存 {count}
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
                        className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black"
                      >
                        使用
                      </button>
                    )}
                    <button
                      onClick={() => store.buyConsumable(c.id, false)}
                      className="px-3 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      {c.priceCoins}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          3. FLOATING SHOPPING CART & TRY-ON CHECKOUT BAR (V2-05)
         ===================================================================== */}
      {(store.cartItemIds.length > 0 || hasTryOnChanges) && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[460px] px-3.5 z-40">
          <div className="retro-box rounded-2xl p-3 bg-slate-950/95 border-2 border-amber-400 shadow-2xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-black text-white">
                  試穿購物車 ({store.cartItemIds.length} 件商品)
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-300 font-bold mt-0.5">
                總計：{cartTotalCoins.toLocaleString()} 🪙 (持有 {store.coins.toLocaleString()} 🪙)
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
                  <span>一次購買並穿戴</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
