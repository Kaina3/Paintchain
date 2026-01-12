import { useState } from 'react';
import type { Player } from '@/shared/types';
import { PLAYER_AVATARS } from '@/shared/types';
import { ColorPicker } from './ColorPicker';
import { getAvatarSettings } from './AvatarEditor';

// 色の明るさを調整するヘルパー関数
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {players.map((player, index) => {
        const isCurrentPlayer = player.id === currentPlayerId;
        const isPickerOpenForThisRow = isCurrentPlayer && !!anchorEl;
        const avatarUrl = PLAYER_AVATARS[player.color];
        const avatarSettings = getAvatarSettings(player.color);

        return (
          <div
            key={player.id}
            className={`relative flex flex-col items-center ${isPickerOpenForThisRow ? 'z-50' : 'z-0'}`}
          >
            {/* 円形フレーム（美術館の肖像画風） */}
            <div className="relative">
              {/* 外側のフレーム（テーマカラー） */}
              <div 
                className="w-20 h-20 md:w-24 md:h-24 rounded-full p-1"
                style={{
                  background: `linear-gradient(135deg, ${player.color} 0%, ${adjustBrightness(player.color, 30)} 50%, ${player.color} 100%)`,
                  boxShadow: `0 4px 12px ${player.color}40, inset 0 2px 4px rgba(255,255,255,0.3)`,
                }}
              >
                {/* 内側のダークリング */}
                <div className="w-full h-full rounded-full bg-gradient-to-br from-stone-700 to-stone-900 p-0.5">
                  {/* プレイヤーアイコン（アバター画像） */}
                  <button
                    onClick={(e) => {
                      if (!isCurrentPlayer || !onChangeColor) return;
                      const el = e.currentTarget as unknown as HTMLElement;
                      setAnchorEl((prev) => (prev ? null : el));
                    }}
                    disabled={!isCurrentPlayer || !onChangeColor}
                    className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center
                              transition-all
                              ${isCurrentPlayer && onChangeColor 
                                ? 'cursor-pointer hover:scale-105' 
                                : 'cursor-default'}`}
                    style={{ backgroundColor: player.color }}
                    title={isCurrentPlayer && onChangeColor ? 'クリックしてキャラを変更' : undefined}
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={player.name}
                        className="w-full h-full object-cover"
                        style={{
                          transform: `translate(${avatarSettings.positionX}%, ${avatarSettings.positionY}%) scale(${avatarSettings.scale})`,
                        }}
                      />
                    ) : (
                      <span className="font-serif font-bold text-2xl md:text-3xl text-white">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* HOSTバッジ */}
              {player.id === hostId && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-0.5 text-[10px] font-bold text-amber-100 shadow-md border border-amber-500">
                  HOST
                </div>
              )}

              {/* Ready/NotReady インジケーター */}
              <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
                player.ready 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-stone-400 text-stone-800'
              }`}>
                {player.ready ? '✓' : '✗'}
              </div>

              {/* 切断中インジケーター */}
              {!player.connected && (
                <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white text-xs animate-pulse">
                  ⚠
                </div>
              )}

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

            {/* プレイヤー名 */}
            {/* プレイヤー名（自分のキャラは強調表示） */}
            <div className="mt-2 text-center">
              <span 
                className={`font-serif font-semibold text-sm block truncate max-w-[80px] md:max-w-[100px] px-2 py-0.5 rounded ${
                  isCurrentPlayer 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm' 
                    : 'text-stone-800'
                }`}
              >
                {isCurrentPlayer && <span className="text-amber-600 mr-1">★</span>}
                {player.name}
              </span>
              <span className={`text-[10px] font-medium ${player.ready ? 'text-emerald-600' : 'text-stone-500'}`}>
                {player.ready ? '✓ READY' : '○ NOT READY'}
              </span>
            </div>

            {/* 並び替えボタン（ホストのみ表示） */}
            {canReorder && (
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="w-5 h-5 flex items-center justify-center rounded bg-stone-200 hover:bg-stone-300 
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-stone-600 text-xs"
                  title="上に移動"
                >
                  ◀
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === players.length - 1}
                  className="w-5 h-5 flex items-center justify-center rounded bg-stone-200 hover:bg-stone-300 
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-stone-600 text-xs"
                  title="下に移動"
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
