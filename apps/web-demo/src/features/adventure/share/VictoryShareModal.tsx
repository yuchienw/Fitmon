import React, { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BRAND_CONFIG } from '../../../config/economyConfig';
import { useGameStore } from '../../../stores/useGameStore';
import { ShareActions, shareOrDownloadCanvas } from './ShareActions';
import { SharePosterCanvas } from './SharePosterCanvas';
import { PosterIdentity, ShareAspect, VictoryPosterData } from './types';
import { watermarkCopy } from './watermark';

interface VictoryShareModalProps {
  report: VictoryPosterData;
  onClose: () => void;
}

export const VictoryShareModal: React.FC<VictoryShareModalProps> = ({ report, onClose }) => {
  const store = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspect, setAspect] = useState<ShareAspect>('9:16');
  const stage = report.stage ?? report.clearedStage;
  const identity = useMemo<PosterIdentity>(
    () => ({
      brand: BRAND_CONFIG.appName,
      level: store.level,
      nickname: store.nickname,
      squadName: store.squadName,
      bodyStage: store.bodyStage,
      equipped: store.equipped,
      rows: [
        {
          nameZh: store.nickname,
          damageText: `${report.finalBlowDamage.toLocaleString()} HP`,
          highlight: true,
        },
        ...store.squadMembers.map((member) => ({
          nameZh: member.nameZh,
          damageText: member.hasWorkedOutToday ? `${member.damageDealt.toLocaleString()} HP` : '還沒動',
          highlight: false,
        })),
      ],
    }),
    [
      report.finalBlowDamage,
      store.bodyStage,
      store.equipped,
      store.level,
      store.nickname,
      store.squadMembers,
      store.squadName,
    ],
  );
  const watermark = watermarkCopy(identity.brand, identity.level, identity.nickname);

  const fileName = `fitmon-stage${stage}-${aspect.replace(':', 'x')}.png`;
  const shareTitle = `Fitmon・第 ${stage} 關通關！`;
  const shareText = `我在 Fitmon 打倒了第 ${stage} 關的${report.boss.nameZh}！一起來動一下 💪 #Fitmon`;

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = await shareOrDownloadCanvas(canvas, fileName, shareTitle, shareText);
    if (result === 'downloaded') store.showToast('已儲存最後一擊戰報');
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = await shareOrDownloadCanvas(canvas, fileName, shareTitle, shareText);
    store.showToast(result === 'shared' ? '已開啟系統分享' : '已儲存最後一擊戰報');
  };

  return (
    <div
      className="absolute inset-0 z-20 flex p-2"
      style={{ background: 'rgba(41, 34, 30, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-share-title"
      data-testid="victory-share-modal"
    >
      <div className="m-auto max-h-full w-full overflow-y-auto rounded-2xl border-2 border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-primary">最後一擊</p>
            <h3 id="victory-share-title" className="text-sm font-black text-foreground">
              第 {stage} 關・{report.boss.nameZh}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉結算"
            className="rounded-lg border border-border bg-muted p-1.5 text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <SharePosterCanvas
          canvasRef={canvasRef}
          aspect={aspect}
          kind="victory"
          victory={report}
          identity={identity}
        />
        <p className="sr-only">固定品牌浮水印：{watermark}</p>
        <div className="mt-2">
          <ShareActions aspect={aspect} onAspect={setAspect} onSave={() => void save()} onShare={() => void share()} />
        </div>
      </div>
    </div>
  );
};
