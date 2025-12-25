import { useState } from 'react';
import type { Player } from '@/shared/types';
import { ColorPicker } from './ColorPicker';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  currentPlayerId: string | null;
  onReorder?: (playerIds: string[]) => void;
  onChangeColor?: (color: string) => void;
}

export function PlayerList({ players, hostId, currentPlayerId, onReorder, onChangeColor }: PlayerListProps) {
  const canReorder = onReorder && players.length > 1;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleMoveUp = (index: number) => {
    if (index === 0 || !onReorder) return;
    const newOrder = [...players];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onReorder(newOrder.map(p => p.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === players.length - 1 || !onReorder) return;
    const newOrder = [...players];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder.map(p => p.id));
  };

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const usedColors = players.filter(p => p.id !== currentPlayerId).map(p => p.color);

  // 白文字が見やすいかどうかを判定（暗い色ならtrue）
  const isColorDark = (hex: string): boolean => {
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    // 輝度計算
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  };

  return (
    <ul className="space-y-3">
      {players.map((player, index) => {
        const isCurrentPlayer = player.id === currentPlayerId;
        const textColorClass = isColorDark(player.color) ? 'text-white' : 'text-gray-800';
        const isPickerOpenForThisRow = isCurrentPlayer && !!anchorEl;

        return (
          <li
            key={player.id}
            className={`relative overflow-visible flex items-center justify-between rounded-xl p-4 transition-all duration-300
                      transform hover:scale-[1.02] animate-scale-in ${
              isCurrentPlayer 
                ? 'bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200 shadow-md' 
                : 'bg-white border border-gray-200'
            } ${isPickerOpenForThisRow ? 'z-50' : 'z-0'}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center gap-3">
              {/* 順番番号 */}
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                {index + 1}
              </div>
              {/* プレイヤーアイコン（カラー付き） */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    if (!isCurrentPlayer || !onChangeColor) return;
                    const el = e.currentTarget as unknown as HTMLElement;
                    setAnchorEl((prev) => (prev ? null : el));
                  }}
                  disabled={!isCurrentPlayer || !onChangeColor}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md
                            transition-all ${textColorClass}
                            ${isCurrentPlayer && onChangeColor 
                              ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 hover:scale-110' 
                              : 'cursor-default'}`}
                  style={{ backgroundColor: player.color }}
                  title={isCurrentPlayer && onChangeColor ? 'クリックして色を変更' : undefined}
                >
                  {player.name.charAt(0).toUpperCase()}
                </button>
                {/* カラーピッカー */}
                {isCurrentPlayer && !!anchorEl && onChangeColor && currentPlayer && (
                  <ColorPicker
                    currentColor={currentPlayer.color}
                    usedColors={usedColors}
                    anchorEl={anchorEl}
                    onSelect={onChangeColor}
                    onClose={() => setAnchorEl(null)}
                  />
                )}
              </div>
              <div>
                <span className="font-bold text-gray-800 block">
                  {player.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isCurrentPlayer && (
                    <span className="text-xs font-semibold text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded">
                      あなた
                    </span>
                  )}
                  {player.id === hostId && (
                    <span className="rounded-md bg-gradient-to-r from-accent-400 to-accent-500 px-2 py-0.5 
                                 text-xs font-bold text-white shadow-sm">
                      👑 ホスト
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 並び替えボタン（ホストのみ表示） */}
              {canReorder && (
                <div className="flex flex-col gap-0.5 mr-2">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-600"
                    title="上に移動"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === players.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-600"
                    title="下に移動"
                  >
                    ▼
                  </button>
                </div>
              )}
              {!player.connected && (
                <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-md animate-pulse">
                  ⚠️ 切断中
                </span>
              )}
              <div className={`text-2xl transition-transform ${player.ready ? 'scale-110' : ''}`}>
                {player.ready ? '✅' : '⭕'}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
