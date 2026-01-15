import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PLAYER_AVATARS } from '@/shared/types';

export interface AvatarSettings {
  positionX: number; // -50 to 50 (%)
  positionY: number; // -50 to 50 (%)
  scale: number;     // 1.0-2.5
}

const DEFAULT_SETTINGS: AvatarSettings = {
  positionX: 0,
  positionY: 0,
  scale: 1.2,
};

// カラーごとのデフォルト設定
const DEFAULT_AVATAR_SETTINGS: Record<string, AvatarSettings> = {
  '#acbfd6': { positionX: -39, positionY: 27, scale: 2.3 },  // アテナイ
  '#053827': { positionX: -6, positionY: 15, scale: 1.4 },   // ボッティチェリ
  '#561269': { positionX: -26, positionY: 50, scale: 2.5 },  // ダリ
  '#ba9356': { positionX: 0, positionY: 0, scale: 1.2 },     // 真珠の耳飾りの少女
  '#7a0000': { positionX: 5, positionY: 9, scale: 1.2 },     // 黄金の兜
  '#dbdcd8': { positionX: 0, positionY: 9, scale: 1.3 },     // 牛乳を注ぐ女
  '#7b481e': { positionX: 0, positionY: 7, scale: 1.2 },     // モナリザ
  '#657863': { positionX: -17, positionY: 10, scale: 1.8 },  // モネ
  '#c74f18': { positionX: 0, positionY: 0, scale: 1.5 },     // 叫び
  '#ffc2c2': { positionX: 0, positionY: 0, scale: 1.4 },     // 浮世絵
  '#004e7a': { positionX: 0, positionY: 0, scale: 1.2 },     // ゴッホ
  '#1f1a14': { positionX: 10, positionY: 18, scale: 1.6 },   // 夜景
};

// localStorageのキー
const STORAGE_KEY = 'avatar_settings';

// 設定を読み込み
export function loadAvatarSettings(): Record<string, AvatarSettings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return {};
}

// 特定カラーの設定を取得（localStorageになければカラーごとのデフォルト、それもなければ汎用デフォルト）
export function getAvatarSettings(color: string): AvatarSettings {
  const all = loadAvatarSettings();
  return all[color] ?? DEFAULT_AVATAR_SETTINGS[color] ?? DEFAULT_SETTINGS;
}

// 設定を保存
function saveAvatarSettings(color: string, settings: AvatarSettings) {
  const all = loadAvatarSettings();
  all[color] = settings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

interface AvatarEditorProps {
  color: string;
  onClose: () => void;
  onSave: () => void;
}

export function AvatarEditor({ color, onClose, onSave }: AvatarEditorProps) {
  const avatarSrc = PLAYER_AVATARS[color];
  const [settings, setSettings] = useState<AvatarSettings>(() => getAvatarSettings(color));
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ドラッグで位置調整
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    // 中心からの相対位置（-50〜50%）
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 100;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 100;
    
    setSettings(prev => ({
      ...prev,
      positionX: Math.max(-50, Math.min(50, x)),
      positionY: Math.max(-50, Math.min(50, y)),
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ESCで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    saveAvatarSettings(color, settings);
    onSave();
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (!avatarSrc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
          🖼️ アバター位置調整
        </h3>
        
        {/* プレビューエリア */}
        <div className="flex justify-center mb-4">
          <div
            ref={previewRef}
            onMouseDown={handleMouseDown}
            className={`relative w-32 h-32 rounded-full overflow-hidden border-4 border-amber-500 shadow-lg ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ backgroundColor: color }}
          >
            <img
              src={avatarSrc}
              alt="avatar"
              className="absolute pointer-events-none"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `translate(${settings.positionX}%, ${settings.positionY}%) scale(${settings.scale})`,
              }}
              draggable={false}
            />
            {/* ドラッグヒント */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-bold drop-shadow">ドラッグで移動</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mb-4">
          画像をドラッグして位置を調整できます
        </p>

        {/* スライダー */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              横位置: {Math.round(settings.positionX)}
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={settings.positionX}
              onChange={(e) => setSettings(prev => ({ ...prev, positionX: Number(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              縦位置: {Math.round(settings.positionY)}
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={settings.positionY}
              onChange={(e) => setSettings(prev => ({ ...prev, positionY: Number(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              拡大: {settings.scale.toFixed(1)}x
            </label>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={settings.scale}
              onChange={(e) => setSettings(prev => ({ ...prev, scale: Number(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 transition"
          >
            リセット
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
