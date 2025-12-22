import type { Player } from '@/shared/types';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  currentPlayerId: string | null;
  onReorder?: (playerIds: string[]) => void;
}

export function PlayerList({ players, hostId, currentPlayerId, onReorder }: PlayerListProps) {
  const canReorder = onReorder && players.length > 1;

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

  return (
    <ul className="space-y-3">
      {players.map((player, index) => (
        <li
          key={player.id}
          className={`flex items-center justify-between rounded-xl p-4 transition-all duration-300
                    transform hover:scale-[1.02] animate-scale-in ${
            player.id === currentPlayerId 
              ? 'bg-gradient-to-r from-primary-50 to-secondary-50 border-2 border-primary-200 shadow-md' 
              : 'bg-white border border-gray-200'
          }`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="flex items-center gap-3">
            {/* 順番番号 */}
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
              {index + 1}
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                          ${player.id === currentPlayerId 
                            ? 'bg-gradient-to-br from-pink-600 to-pink-700 shadow-lg' 
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-gray-800 block">
                {player.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {player.id === currentPlayerId && (
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
      ))}
    </ul>
  );
}
