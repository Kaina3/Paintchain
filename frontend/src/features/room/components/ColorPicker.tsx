import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PLAYER_COLORS, PLAYER_AVATARS } from '@/shared/types';
import { AvatarEditor, getAvatarSettings } from './AvatarEditor';

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
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

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

  // 外側クリックで閉じる（編集モーダルが開いている間は無効）
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (editingColor) return; // 編集中は閉じない
      const target = e.target as Node;
      if (anchorEl.contains(target)) return;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorEl, onClose, editingColor]);

  // ESCキーで閉じる（編集モーダルが開いている間は無効）
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingColor) return; // 編集中は閉じない
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
    <>
      <div
        ref={ref}
        className="fixed z-50 w-80 max-w-[calc(100vw-16px)] rounded-2xl bg-white/20 backdrop-blur-md p-4 shadow-xl border border-stone-200/50"
        style={{ left: pos.left, top: pos.top }}
      >
        <div className="mb-2 text-xs font-semibold text-gray-500">キャラクターを選択</div>
        <div className="grid grid-cols-4 gap-3">
          {PLAYER_COLORS.map((color) => {
            const isUsed = usedColors.includes(color) && color !== currentColor;
            const isCurrent = color === currentColor;
            const avatarSrc = PLAYER_AVATARS[color];
            const settings = getAvatarSettings(color);

            return (
              <div key={color} className="relative flex flex-col items-center">
                <button
                  onClick={() => {
                    if (!isUsed) {
                      onSelect(color);
                      onClose();
                    }
                  }}
                  disabled={isUsed}
                  className={`relative box-border w-14 h-14 rounded-full border-2 overflow-hidden transition-all ${
                    isCurrent
                      ? 'border-amber-500 ring-2 ring-offset-2 ring-amber-400'
                      : isUsed
                        ? 'border-gray-300 opacity-30 cursor-not-allowed'
                        : 'border-gray-300 hover:border-amber-400 hover:ring-2 hover:ring-offset-2 hover:ring-amber-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={isUsed ? '使用中' : isCurrent ? '現在のキャラ' : '選択'}
                >
                  {avatarSrc && (
                    <img
                      src={avatarSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        transform: `translate(${settings.positionX}%, ${settings.positionY}%) scale(${settings.scale})`,
                      }}
                    />
                  )}
                  {isCurrent && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xl drop-shadow-md">
                      ✓
                    </span>
                  )}
                  {isUsed && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xl">
                      ✕
                    </span>
                  )}
                </button>
                {/* テーマカラー表示 */}
                <div 
                  className="mt-1 w-10 h-2 rounded-full border border-gray-300/50 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={`テーマカラー: ${color}`}
                />
                {/* 編集ボタン（現在選択中のキャラのみ） */}
                {isCurrent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingColor(color);
                    }}
                    className="absolute top-0 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center shadow hover:bg-amber-600 transition"
                    title="位置を調整"
                  >
                    ✎
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* アバター編集モーダル */}
      {editingColor && (
        <AvatarEditor
          color={editingColor}
          onClose={() => setEditingColor(null)}
          onSave={() => forceUpdate(n => n + 1)}
        />
      )}
    </>,
    portalTarget
  );
}
