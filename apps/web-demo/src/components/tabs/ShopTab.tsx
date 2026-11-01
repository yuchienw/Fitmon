import React, { useState } from 'react';
import {
  Shirt,
  Home,
  FlaskConical,
  Crown,
  Check,
  Coins,
  Copy,
  Dices,
} from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import {
  AVATAR_ITEMS,
  ROOM_ITEMS,
  CONSUMABLE_ITEMS,
  CELEBRITY_SHOWCASES,
  CosmeticItem,
} from '../../config/catalogConfig';
import { PixelRoomCanvas } from '../../game/PixelRoomCanvas';

export const ShopTab: React.FC = () => {
  const store = useGameStore();
  const [categoryTab, setCategoryTab] = useState<'avatar' | 'room' | 'consumables' | 'celebrity'>(
    'avatar'
  );
  const [selectedCelebId, setSelectedCelebId] = useState<string | null>(null);

  const previewCeleb = CELEBRITY_SHOWCASES.find((c) => c.id === selectedCelebId);

  const renderCosmeticGrid = (items: CosmeticItem[], isRoom: boolean) => {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => {
          const isOwned = store.ownedItemIds.includes(item.id);
          const isEquipped = isRoom
            ? Object.values(store.room).includes(item.id)
            : Object.values(store.equipped).includes(item.id);

          return (
            <div
              key={item.id}
              className={`rounded-2xl p-3 border flex flex-col justify-between transition ${
                isEquipped
                  ? 'bg-emerald-950/35 border-emerald-400 shadow-md'
                  : 'bg-[#131722] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                {/* Visual Color Swatch Icon */}
                <div
                  className="w-8 h-8 rounded-xl border-2 border-white/20 flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: item.primaryColor }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-sm"
                    style={{ backgroundColor: item.accentColor }}
                  />
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    item.rarity === 'legendary'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : item.rarity === 'epic'
                      ? 'bg-purple-500/20 text-purple-300'
                      : item.rarity === 'rare'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badgeText || item.rarity}
                </span>
              </div>

              <h4 className="text-xs font-black text-white truncate">{item.nameZh}</h4>

              <button
                onClick={() => {
                  setSelectedCelebId(null);
                  store.buyOrEquipCosmetic(item.id, isRoom);
                }}
                disabled={isEquipped}
                className={`mt-2.5 w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition ${
                  isEquipped
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : isOwned
                    ? 'retro-btn bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                    : 'retro-btn bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                {isEquipped ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>裝備中</span>
                  </>
                ) : isOwned ? (
                  <span>換上</span>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5" />
                    <span>{item.priceCoins}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-3.5 space-y-3.5 pb-10">
      {/* 1. LIVE MAPLESTORY CHIBI DRESSING MIRROR */}
      <PixelRoomCanvas
        isActive={store.activeTab === 'shop'}
        compact
        customOverride={
          previewCeleb
            ? {
                ownerName: previewCeleb.nameZh,
                ownerBadge: previewCeleb.verifiedBadge,
                bodyStage: previewCeleb.bodyStage,
                equipped: previewCeleb.equipped,
                room: previewCeleb.room,
              }
            : undefined
        }
      />

      {/* 2. 4-TAB CATEGORY SWITCHER */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {[
          { id: 'avatar' as const, label: '造型', icon: Shirt },
          { id: 'room' as const, label: '家具', icon: Home },
          { id: 'consumables' as const, label: '道具', icon: FlaskConical },
          { id: 'celebrity' as const, label: '名人', icon: Crown },
        ].map((t) => {
          const Icon = t.icon;
          const active = categoryTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCategoryTab(t.id)}
              className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. CONTENT */}
      {categoryTab === 'avatar' && renderCosmeticGrid(AVATAR_ITEMS, false)}

      {categoryTab === 'room' && renderCosmeticGrid(ROOM_ITEMS, true)}

      {categoryTab === 'consumables' && (
        <div className="space-y-2.5">
          {/* Gacha Card */}
          <div className="retro-box-amber rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Dices className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-white">幸運扭蛋機</h4>
                <span className="text-xs text-amber-300 font-mono">
                  代幣 ×{store.consumables.gacha_ticket || 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                if ((store.consumables.gacha_ticket || 0) > 0) {
                  store.useConsumableItem('gacha_ticket');
                } else {
                  store.buyConsumable('gacha_ticket', false);
                }
              }}
              className="retro-btn px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shrink-0"
            >
              {(store.consumables.gacha_ticket || 0) > 0 ? '🎰 抽獎' : '🪙 120 買'}
            </button>
          </div>

          {/* Clean Consumables List */}
          {CONSUMABLE_ITEMS.map((c) => {
            const ownedCount = store.consumables[c.id] || 0;
            return (
              <div
                key={c.id}
                className={`rounded-2xl p-3.5 border bg-gradient-to-r ${c.colorClass} flex items-center justify-between gap-3`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0">{c.iconEmoji}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate">{c.nameZh}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-emerald-300 font-bold">
                        {c.effectBadge}
                      </span>
                      <span className="text-[10px] font-mono text-slate-300">
                        (持有 ×{ownedCount})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => store.useConsumableItem(c.id)}
                    disabled={ownedCount <= 0}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                      ownedCount > 0
                        ? 'retro-btn bg-emerald-500 text-slate-950'
                        : 'bg-slate-800/70 text-slate-500'
                    }`}
                  >
                    使用
                  </button>
                  <button
                    onClick={() => store.buyConsumable(c.id, false)}
                    className="retro-btn px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black"
                  >
                    🪙{c.priceCoins}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {categoryTab === 'celebrity' && (
        <div className="space-y-2.5">
          {CELEBRITY_SHOWCASES.map((celeb) => {
            const isPreviewing = selectedCelebId === celeb.id;
            return (
              <div
                key={celeb.id}
                className="retro-box-amber rounded-2xl p-3.5 space-y-2.5 border-amber-500/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                      {celeb.verifiedBadge}
                    </span>
                    <h3 className="text-sm font-black text-white mt-1">{celeb.nameZh}</h3>
                  </div>
                  <span className="text-xs font-mono text-amber-200">{celeb.followers}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedCelebId(isPreviewing ? null : celeb.id)}
                    className="retro-btn py-2 rounded-xl bg-slate-800 text-white border border-slate-600 text-xs font-bold"
                  >
                    {isPreviewing ? '👀 預覽中' : '🏠 看房間'}
                  </button>
                  <button
                    onClick={() => store.loadWorkoutTemplate(celeb.routineTemplate)}
                    className="retro-btn py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>複製課表</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
