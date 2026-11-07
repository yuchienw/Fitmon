import React, { useState } from 'react';
import { X, Shirt, Home, Check, Ban, ShoppingBag } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  AVATAR_ITEMS,
  ROOM_ITEMS,
  AvatarBodyStage,
  EquipSlot,
  RoomSlot,
} from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';
import { ItemSpriteThumbnail } from '../../game/ItemSpriteThumbnail';

const AVATAR_SLOTS: { id: EquipSlot; label: string; emoji: string }[] = [
  { id: 'hair', label: '頭飾', emoji: '🧢' },
  { id: 'face', label: '表情', emoji: '😊' },
  { id: 'top', label: '上衣', emoji: '👕' },
  { id: 'bottom', label: '下身', emoji: '🩳' },
  { id: 'accessory', label: '手持', emoji: '🏋️' },
];

const ROOM_SLOTS: { id: RoomSlot; label: string; desc: string }[] = [
  { id: 'slotLeft', label: '📍 左側', desc: '可放器材、街機、植栽或寵物' },
  { id: 'slotCenter', label: '📍 中央', desc: '可放寵物、植栽或器材' },
  { id: 'slotRight', label: '📍 右側', desc: '可放街機、啞鈴塔、深蹲架或寵物' },
  { id: 'wallpaper', label: '🧱 牆面', desc: '切換房間背景牆' },
  { id: 'floor', label: '🟫 地板', desc: '切換地板材質' },
];

export const WardrobeModal: React.FC = () => {
  const store = useGameStore();
  const [mode, setMode] = useState<'avatar' | 'room'>('avatar');
  const [activeAvatarSlot, setActiveAvatarSlot] = useState<EquipSlot>('hair');
  const [activeRoomSlot, setActiveRoomSlot] = useState<RoomSlot>('slotLeft');

  if (!store.wardrobeModalOpen) return null;

  // Owned items for selected avatar slot
  const slotAvatarItems = AVATAR_ITEMS.filter(
    (item) => item.slot === activeAvatarSlot && store.ownedItemIds.includes(item.id)
  );

  // Owned items for selected room slot
  const slotRoomItems = ROOM_ITEMS.filter((item) => {
    if (!store.ownedItemIds.includes(item.id)) return false;
    if (activeRoomSlot === 'wallpaper') return item.roomSubType === 'wallpaper';
    if (activeRoomSlot === 'floor') return item.roomSubType === 'floor';
    return item.roomSubType === 'furniture' || item.roomSubType === 'pet';
  });

  const canBeEmpty =
    activeRoomSlot === 'slotLeft' ||
    activeRoomSlot === 'slotCenter' ||
    activeRoomSlot === 'slotRight';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3">
      <div className="w-full max-w-md retro-box rounded-2xl overflow-hidden border-2 border-slate-700 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-black text-white">🎒 衣櫃與房間佈置</h3>
          <button
            onClick={() => store.setWardrobeModalOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky Top Live Preview */}
        <div className="p-3 bg-[#0b0d13] border-b border-slate-800 shrink-0">
          <PixelRoomCanvas isActive={store.wardrobeModalOpen} compact />
        </div>

        {/* Mode Switcher */}
        <div className="px-3 pt-2.5 bg-[#0b0d13] shrink-0">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('avatar')}
              className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                mode === 'avatar' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>角色換裝</span>
            </button>
            <button
              onClick={() => setMode('room')}
              className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
                mode === 'room' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>房間擺設</span>
            </button>
          </div>
        </div>

        {/* Scrollable Slot Content */}
        <div className="p-3.5 overflow-y-auto space-y-3 flex-1">
          {mode === 'avatar' ? (
            <>
              {/* 5 Paper-Doll Slot Tabs (V2-13) */}
              <div className="grid grid-cols-5 gap-1">
                {AVATAR_SLOTS.map((s) => {
                  const active = activeAvatarSlot === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveAvatarSlot(s.id)}
                      className={`py-2 px-1 rounded-xl border text-center transition ${
                        active
                          ? 'bg-emerald-500/20 border-emerald-400 text-white font-black'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-base">{s.emoji}</div>
                      <div className="text-[10px] mt-0.5 truncate">{s.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Body Stage Selector */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300 shrink-0">💪 體態</span>
                <div className="flex gap-1">
                  {(
                    [
                      { id: 'beginner', label: '🌱菜鳥' },
                      { id: 'aesthetic', label: '⚡精實' },
                      { id: 'powerlifter', label: '🐻巨巨' },
                      { id: 'titan', label: '👑泰坦' },
                    ] as { id: AvatarBodyStage; label: string }[]
                  ).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => store.setBodyStage(st.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        store.bodyStage === st.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owned Items Grid for Selected Slot */}
              <div className="grid grid-cols-2 gap-2.5">
                {slotAvatarItems.map((item) => {
                  const isEquipped = store.equipped[activeAvatarSlot] === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => store.equipOwnedAvatarItem(activeAvatarSlot, item.id)}
                      className={`p-2.5 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                        isEquipped
                          ? 'bg-emerald-950/40 border-emerald-400'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <ItemSpriteThumbnail item={item} sizeClass="w-12 h-12" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-white truncate">{item.nameZh}</div>
                        {item.combatStat && (
                          <div
                            className={`text-[9px] font-black mt-0.5 ${
                              item.combatStat.type === 'phy'
                                ? 'text-orange-300'
                                : item.combatStat.type === 'mag'
                                ? 'text-cyan-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {item.combatStat.labelZh}
                          </div>
                        )}
                        <div className="text-[10px] font-bold mt-1 flex items-center gap-1">
                          {isEquipped ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> 穿戴中
                            </span>
                          ) : (
                            <span className="text-slate-400">點擊穿戴</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* 5 Room Placement Anchor Slots (V2-08) */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {ROOM_SLOTS.map((rs) => {
                  const active = activeRoomSlot === rs.id;
                  return (
                    <button
                      key={rs.id}
                      onClick={() => setActiveRoomSlot(rs.id)}
                      className={`px-3 py-2 rounded-xl border text-left shrink-0 transition ${
                        active
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-black'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="text-xs">{rs.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-400 px-1">
                💡 {ROOM_SLOTS.find((r) => r.id === activeRoomSlot)?.desc}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Option to leave slot empty (V2-04 & V2-08) */}
                {canBeEmpty && (
                  <button
                    onClick={() => store.assignRoomSlotItem(activeRoomSlot, 'empty')}
                    className={`p-2.5 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                      store.room[activeRoomSlot] === 'empty'
                        ? 'bg-rose-950/40 border-rose-400'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-rose-400 shrink-0">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">收起 / 留空</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">此位置不擺放物件</div>
                    </div>
                  </button>
                )}

                {slotRoomItems.map((item) => {
                  const isPlacedHere = store.room[activeRoomSlot] === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => store.assignRoomSlotItem(activeRoomSlot, item.id)}
                      className={`p-2.5 rounded-2xl border flex items-center gap-2.5 text-left transition ${
                        isPlacedHere
                          ? 'bg-amber-950/40 border-amber-400'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <ItemSpriteThumbnail item={item} sizeClass="w-12 h-12" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-white truncate">{item.nameZh}</div>
                        <div className="text-[10px] font-bold mt-1">
                          {isPlacedHere ? (
                            <span className="text-amber-300 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> 已擺放此處
                            </span>
                          ) : (
                            <span className="text-slate-400">擺放到此位置</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Go to Shop Shortcut */}
          <div className="pt-2">
            <button
              onClick={() => {
                store.setWardrobeModalOpen(false);
                store.setActiveTab('shop');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>前往商城試穿更多新裝備與家具 ➔</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
