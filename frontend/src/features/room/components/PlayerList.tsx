import type { Player } from '@/shared/types';

interface PlayerListProps {
  players: Player[];
  hostId: string;
  currentPlayerId: string | null;
}

export function PlayerList({ players, hostId, currentPlayerId }: PlayerListProps) {
  return (
    <ul className="space-y-2">
      {players.map((player) => (
        <li
          key={player.id}
          className={`flex items-center justify-between rounded-lg p-3 ${
            player.id === currentPlayerId ? 'bg-primary-50' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">
              {player.name}
              {player.id === currentPlayerId && (
                <span className="ml-1 text-xs text-primary-600">(あなた)</span>
              )}
            </span>
            {player.id === hostId && (
              <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                ホスト
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!player.connected && (
              <span className="text-xs text-gray-400">切断中</span>
            )}
            <span
              className={`text-lg ${player.ready ? 'text-green-600' : 'text-gray-300'}`}
            >
              {player.ready ? '✓' : '○'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
