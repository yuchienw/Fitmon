import React from 'react';
import { Download, Share2 } from 'lucide-react';
import { ShareAspect } from './types';

interface ShareActionsProps {
  aspect: ShareAspect;
  onAspect: (aspect: ShareAspect) => void;
  onShare: () => void;
  onSave: () => void;
}

export const ShareActions: React.FC<ShareActionsProps> = ({ aspect, onAspect, onShare, onSave }) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="分享圖比例">
        {(
          [
            { id: '9:16' as const, label: '9:16', detail: '1080×1920' },
            { id: '4:5' as const, label: '4:5', detail: '1080×1350' },
          ]
        ).map((item) => {
          const active = aspect === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              data-testid={`share-aspect-${item.id}`}
              onClick={() => onAspect(item.id)}
              className={`rounded-xl border-2 px-2 py-1.5 text-center transition-colors duration-150 ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-muted text-foreground'
              }`}
            >
              <span className="block text-xs font-black">{item.label}</span>
              <span className="block font-mono text-[10px] font-bold">{item.detail}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSave}
          className="retro-btn flex items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-card py-2.5 text-xs font-black text-foreground"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          儲存
        </button>
        <button
          type="button"
          onClick={onShare}
          className="retro-btn flex items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-xs font-black text-accent-foreground"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          分享
        </button>
      </div>
    </div>
  );
};

export async function shareOrDownloadCanvas(
  canvas: HTMLCanvasElement,
  fileName: string,
  title: string,
  text?: string,
): Promise<'shared' | 'downloaded'> {
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
    if (blob && typeof navigator !== 'undefined' && navigator.share) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          ...(text ? { text } : {}),
          files: [file],
        });
        return 'shared';
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
  }
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return 'downloaded';
}
