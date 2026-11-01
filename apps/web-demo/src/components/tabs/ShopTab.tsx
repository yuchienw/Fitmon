import React, { useState } from 'react';
import {
  Shirt,
  Home,
  FlaskConical,
  Crown,
  Check,
  Coins,
  Sparkles,
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
              className={`rounded-xl p-3 border flex flex-col justify-between transition ${
                isEquipped
                  ? 'bg-emerald-950/30 border-emerald-400 shadow-md'
                  : 'bg-[#131722] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0"
                      style={{ backgroundColor: item.primaryColor }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-sm border border-white/20 shrink-0"
                      style={{ backgroundColor: item.accentColor }}
                    />
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                      item.rarity === 'legendary'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : item.rarity === 'epic'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : item.rarity === 'rare'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badgeText || item.rarity}
                  </span>
                </div>

                <h4 className="text-xs font-black text-white">{item.nameZh}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{item.descZh}</p>
              </div>

              <button
                onClick={() => {
                  setSelectedCelebId(null);
                  store.buyOrEquipCosmetic(item.id, isRoom);
                }}
                disabled={isEquipped}
                className={`mt-3 w-full py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
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
                  <span>點擊換裝</span>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5" />
                    <span>{item.priceCoins} 購買</span>
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
      {/* 1. LIVE DRESSING ROOM PREVIEW */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {previewCeleb
              ? `正在預覽：${previewCeleb.nameZh} 的特展訓練室`
              : '雙軌紙娃娃即時更衣鏡（純外觀不影響數值）'}
          </span>
          {previewCeleb && (
            <button
              onClick={() => setSelectedCelebId(null)}
              className="text-[11px] text-amber-400 underline font-bold"
            >
              返回我的房間
            </button>
          )}
        </div>

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
      </div>

      {/* 2. CATEGORY SUB-TABS */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {[
          { id: 'avatar' as const, label: '角色衣櫃', icon: Shirt },
          { id: 'room' as const, label: '房間家具', icon: Home },
          { id: 'consumables' as const, label: '道具/扭蛋', icon: FlaskConical },
          { id: 'celebrity' as const, label: '名人特展', icon: Crown },
        ].map((t) => {
          const Icon = t.icon;
          const active = categoryTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCategoryTab(t.id)}
              className={`py-2 px-1 rounded-lg text-[11px] font-black flex flex-col items-center gap-1 transition ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SUB-TAB CONTENT */}
      {categoryTab === 'avatar' && renderCosmeticGrid(AVATAR_ITEMS, false)}

      {categoryTab === 'room' && renderCosmeticGrid(ROOM_ITEMS, true)}

      {categoryTab === 'consumables' && (
        <div className="space-y-3">
          {/* Gacha Banner */}
          <div className="retro-box-amber rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Dices className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white">黃金像素扭蛋機 (Pixel Gacha)</h4>
              </div>
              <p className="text-xs text-slate-300">
                保證抽出尚未擁有的稀有外觀或家具！目前持有扭蛋代幣：
                <strong className="text-amber-300 font-mono ml-1">
                  {store.consumables.gacha_ticket || 0} 枚
                </strong>
              </p>
            </div>
            <button
              onClick={() => {
                if ((store.consumables.gacha_ticket || 0) > 0) {
                  store.useConsumableItem('gacha_ticket');
                } else {
                  store.buyConsumable('gacha_ticket', false);
                }
              }}
              className="retro-btn px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0"
            >
              {(store.consumables.gacha_ticket || 0) > 0 ? '🎰 立即轉扭蛋' : '🪙 120 買代幣'}
            </button>
          </div>

          {/* Consumable Items List */}
          <div className="space-y-2.5">
            {CONSUMABLE_ITEMS.map((c) => {
              const ownedCount = store.consumables[c.id] || 0;
              return (
                <div
                  key={c.id}
                  className={`rounded-xl p-3.5 border bg-gradient-to-r ${c.colorClass} space-y-2.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{c.iconEmoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-white">{c.nameZh}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950/70 text-emerald-300 font-bold">
                            {c.effectBadge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">{c.descZh}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-mono font-bold text-white shrink-0">
                      背包 ×{ownedCount}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => store.useConsumableItem(c.id)}
                      disabled={ownedCount <= 0}
                      className={`py-1.5 rounded-lg text-xs font-black transition ${
                        ownedCount > 0
                          ? 'retro-btn bg-emerald-500 text-slate-950'
                          : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      ✨ 立即使用
                    </button>
                    <button
                      onClick={() => store.buyConsumable(c.id, false)}
                      className="retro-btn py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold"
                    >
                      🪙 {c.priceCoins} 金幣買
                    </button>
                    <button
                      onClick={() => store.buyConsumable(c.id, true)}
                      className="retro-btn py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black"
                    >
                      💎 {c.iapPriceUsd} 內購
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {categoryTab === 'celebrity' && (
        <div className="space-y-3">
          {CELEBRITY_SHOWCASES.map((celeb) => {
            const isPreviewing = selectedCelebId === celeb.id;
            return (
              <div
                key={celeb.id}
                className="retro-box-amber rounded-xl p-4 space-y-3 border-amber-500/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                      {celeb.verifiedBadge}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">{celeb.nameZh}</h3>
                    <p className="text-xs text-amber-200/90 font-medium">{celeb.titleZh}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{celeb.followers}</span>
                </div>

                <blockquote className="text-xs italic text-slate-200 bg-slate-950/70 p-2.5 rounded-lg border-l-2 border-amber-400">
                  {celeb.quoteZh}
                </blockquote>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedCelebId(isPreviewing ? null : celeb.id)}
                    className="retro-btn py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-bold"
                  >
                    {isPreviewing ? '👀 正在上方預覽房間' : '🏠 參觀名人訓練室'}
                  </button>
                  <button
                    onClick={() => store.loadWorkoutTemplate(celeb.routineTemplate)}
                    className="retro-btn py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>一鍵複製名人課表</span>
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
