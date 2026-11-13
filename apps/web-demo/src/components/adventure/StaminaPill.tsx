import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { STAMINA_MAX } from '../../config/economy';
import { Zap } from 'lucide-react';

export const StaminaPill: React.FC = () => {
  const store = useGameStore();
  const stamina = store.stamina;
  const percent = Math.min(100, Math.max(0, (stamina / STAMINA_MAX) * 100));

  return (
    <div
      style={{
        borderColor: '#E5DCCB',
        backgroundColor: '#FFFFFF',
      }}
      className="flex items-center gap-1.5 border rounded-[10px] px-2 py-1 shadow-xs shrink-0 select-none"
      title={`體力 ${stamina}/${STAMINA_MAX}`}
      data-testid="stamina-pill"
    >
      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
      <div>
        <div className="text-[10px] font-extrabold text-[#29221E] leading-none whitespace-nowrap font-mono">
          體力 {stamina}/{STAMINA_MAX}
        </div>
        <div className="w-[54px] h-1 bg-[#EFE8DC] rounded-full overflow-hidden mt-1">
          <div
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
            }}
            className="h-full rounded-full transition-all duration-200"
          />
        </div>
      </div>
    </div>
  );
};
