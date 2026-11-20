import React from 'react';
import { IS_DEMO } from '../../config/demo';

export interface DemoDevTagProps {
  text: string;
  dataTestId?: string;
  className?: string;
}

/**
 * 9.4 / 10c 試玩版標籤元件
 * 樣式：左邊 10px 黃黑斜紋，中間淡黃底 #FEF9C3 配深棕字，右邊黑底黃字「上線前移除」，外框 1.5px 虛線 #A16207
 */
export const DemoDevTag: React.FC<DemoDevTagProps> = ({
  text,
  dataTestId,
  className = '',
}) => {
  if (!IS_DEMO) return null;
  return (
    <span
      data-testid={dataTestId}
      className={`inline-flex items-stretch rounded overflow-hidden text-[10px] font-black border border-dashed border-[#A16207] whitespace-nowrap align-middle select-none shrink-0 ${className}`}
      title="上線前移除"
    >
      <span
        style={{
          width: 8,
          background:
            'repeating-linear-gradient(-45deg,#FDE047 0 4px,#29221E 4px 8px)',
        }}
      />
      <span className="bg-[#FEF9C3] text-[#713F12] px-1 py-0.5">{text}</span>
      <span className="bg-[#29221E] text-[#FEF9C3] px-1 py-0.5 font-normal">
        上線前移除
      </span>
    </span>
  );
};
