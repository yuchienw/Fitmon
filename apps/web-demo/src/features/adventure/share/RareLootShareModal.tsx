import React, { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BRAND_CONFIG } from '../../../config/economyConfig';
import { useGameStore } from '../../../stores/useGameStore';
import { ShareActions, shareOrDownloadCanvas } from './ShareActions';
import { SharePosterCanvas } from './SharePosterCanvas';
import { PosterIdentity, RareLootPosterData, ShareAspect } from './types';
import { watermarkCopy } from './watermark';

interface RareLootShareModalProps {
  report: RareLootPosterData;
  onClose: () => void;
}

export const RareLootShareModal: React.FC<RareLootShareModalProps> = ({ report, onClose }) => {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspect, setAspect] = useState<ShareAspect>('9:16');
  const identity = useMemo<PosterIdentity>(
    () => ({
      brand: BRAND_CONFIG.appName,
      level: store.level,
      nickname: store.nickname,
      squadName: store.squadName,
      bodyStage: store.bodyStage,
      equipped: store.equipped,
      rows: [],
    }),
    [store.bodyStage, store.equipped, store.level, store.nickname, store.squadName],
  );
  const watermark = watermarkCopy(identity.brand, identity.level, identity.nickname);
  const fileName = `fitmon-rare-loot-${report.boss.hiddenLoot.id}-${aspect.replace(':', 'x')}.png`;

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await shareOrDownloadCanvas(canvas, fileName, `FitMon 噴裝：${report.boss.hiddenLoot.nameZh}`);
    store.showToast('已儲存噴裝圖');
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = await shareOrDownloadCanvas(
      canvas,
      fileName,
      `FitMon 噴裝：${report.boss.hiddenLoot.nameZh}`,
    );
    store.showToast(result === 'shared' ? '已開啟系統分享' : '已儲存噴裝圖');
  };

  return (
    <div
      className="absolute inset-0 z-20 flex p-2"
      style={{ background: 'rgba(41, 34, 30, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loot-share-title"
      data-testid="rare-loot-share-modal"
    >
      <div className="m-auto max-h-full w-full overflow-y-auto rounded-2xl border-2 border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-primary">Rare Loot</p>
            <h3 id="loot-share-title" className="text-sm font-black text-foreground">
              {report.boss.hiddenLoot.nameZh}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉噴裝"
            className="rounded-lg border border-border bg-muted p-1.5 text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <SharePosterCanvas canvasRef={canvasRef} aspect={aspect} kind="loot" loot={report} identity={identity} />
        <p className="sr-only">固定品牌浮水印：{watermark}</p>
        <div className="mt-2">
          <ShareActions aspect={aspect} onAspect={setAspect} onSave={() => void save()} onShare={() => void share()} />
        </div>
      </div>
    </div>
  );
};
