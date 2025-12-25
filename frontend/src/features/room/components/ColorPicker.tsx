import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PLAYER_COLORS } from '@/shared/types';

interface ColorPickerProps {
  currentColor: string;
  usedColors: string[]; // 他プレイヤーが使用中のカラー
  anchorEl: HTMLElement;
  onSelect: (color: string) => void;
  onClose: () => void;
}

type PickerPosition = { left: number; top: number };

const VIEWPORT_PADDING = 8;
const GAP = 12;

export function ColorPicker({ currentColor, usedColors, anchorEl, onSelect, onClose }: ColorPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PickerPosition>({ left: 0, top: 0 });

  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.body;
  }, []);

  const updatePosition = () => {
    const el = ref.current;
    if (!el) return;

    const anchor = anchorEl.getBoundingClientRect();
    const pickerWidth = el.offsetWidth;
    const pickerHeight = el.offsetHeight;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 横はアンカー中央基準でクランプ
    const anchorCenterX = anchor.left + anchor.width / 2;
    const minLeft = VIEWPORT_PADDING;
    const maxLeft = Math.max(VIEWPORT_PADDING, vw - VIEWPORT_PADDING - pickerWidth);
    const left = Math.min(maxLeft, Math.max(minLeft, Math.round(anchorCenterX - pickerWidth / 2)));

    // 縦は基本「下」に出して、入らなければ「上」へ
    const belowTop = Math.round(anchor.bottom + GAP);
    const aboveTop = Math.round(anchor.top - GAP - pickerHeight);

    const fitsBelow = belowTop + pickerHeight <= vh - VIEWPORT_PADDING;
    const fitsAbove = aboveTop >= VIEWPORT_PADDING;

    let top = belowTop;
    if (!fitsBelow && fitsAbove) top = aboveTop;
    if (!fitsBelow && !fitsAbove) {
      // どちらも厳しい場合は画面内にクランプ
      const minTop = VIEWPORT_PADDING;
      const maxTop = Math.max(VIEWPORT_PADDING, vh - VIEWPORT_PADDING - pickerHeight);
      top = Math.min(maxTop, Math.max(minTop, belowTop));
    }

    setPos({ left, top });
  };

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorEl.contains(target)) return;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorEl, onClose]);

  // ESCキーで閉じる
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 初期表示/リサイズ/スクロールで位置補正
  useLayoutEffect(() => {
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, currentColor, usedColors.join(',')]);

  useEffect(() => {
    const handler = () => updatePosition();
    window.addEventListener('resize', handler);
    // scrollはバブリングしないのでcaptureで拾う
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  if (!portalTarget) return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 w-72 max-w-[calc(100vw-16px)] rounded-2xl bg-white p-4 shadow-xl border border-gray-200"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="mb-2 text-xs font-semibold text-gray-500">色を選択</div>
      <div className="grid grid-cols-6 gap-3">
        {PLAYER_COLORS.map((color) => {
          const isUsed = usedColors.includes(color) && color !== currentColor;
          const isCurrent = color === currentColor;

          return (
            <button
              key={color}
              onClick={() => {
                if (!isUsed) {
                  onSelect(color);
                  onClose();
                }
              }}
              disabled={isUsed}
              className={`relative box-border w-8 h-8 rounded-full border-2 transition-all ${
                isCurrent
                  ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400'
                  : isUsed
                    ? 'border-gray-300 opacity-30 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-400 hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={isUsed ? '使用中' : isCurrent ? '現在の色' : '選択'}
            >
              {isCurrent && (
                <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                  ✓
                </span>
              )}
              {isUsed && (
                <span className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    portalTarget
  );
}
