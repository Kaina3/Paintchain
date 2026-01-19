import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

interface WerewolfVotingProps {
  onVote: (targetId: string) => void;
}

export function WerewolfVoting({ onVote }: WerewolfVotingProps) {
  const { allDrawings, myVote, voteCount, totalPlayers, setMyVote } =
    useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleVote = useCallback(() => {
    if (!selectedId || myVote) return;
    setMyVote(selectedId);
    onVote(selectedId);
  }, [selectedId, myVote, onVote, setMyVote]);

  const handleTimeout = useCallback(() => {
    // 未投票の場合は自動で最初の他プレイヤーに投票
    if (!myVote && room?.players) {
      const firstOther = room.players.find((p) => p.id !== playerId);
      if (firstOther) {
        setMyVote(firstOther.id);
        onVote(firstOther.id);
      }
    }
  }, [myVote, room, playerId, onVote, setMyVote]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-900 to-gray-800">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">🗳️ 投票タイム</div>
            <div className="text-sm opacity-80">人狼だと思う人を選んでください</div>
          </div>
          <Timer onTimeout={handleTimeout} />
        </div>
      </div>

      {/* 投票進捗 */}
      <div className="bg-gray-800 p-3 text-center">
        <div className="text-sm text-gray-400">
          投票済み: <span className="text-white font-bold">{voteCount}</span> /{' '}
          {totalPlayers} 人
        </div>
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${totalPlayers > 0 ? (voteCount / totalPlayers) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* プレイヤー一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {room?.players
            .filter((p) => p.id !== playerId) // 自分は除外
            .map((player) => {
              const entries = allDrawings.get(player.id) ?? [];
              const isSelected = selectedId === player.id;
              const isVoted = myVote === player.id;

              return (
                <motion.button
                  key={player.id}
                  whileHover={{ scale: myVote ? 1 : 1.02 }}
                  whileTap={{ scale: myVote ? 1 : 0.98 }}
                  onClick={() => !myVote && setSelectedId(player.id)}
                  disabled={!!myVote}
                  className={`rounded-xl p-4 text-left transition-all ${
                    isVoted
                      ? 'bg-red-900 ring-2 ring-red-500'
                      : isSelected
                      ? 'bg-indigo-900 ring-2 ring-indigo-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  } shadow-lg`}
                >
                  {/* プレイヤー情報 */}
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-bold text-white">{player.name}</span>
                  </div>

                  {/* 絵の履歴（全ラウンド） */}
                  <div className="flex flex-wrap gap-1">
                    {entries.length > 0 ? (
                      entries.map((entry, i) => (
                        <div key={i} className="relative">
                          <img
                            src={entry.imageData}
                            alt={`Round ${entry.round}`}
                            className="h-16 w-16 rounded object-cover bg-white"
                          />
                          <div className="absolute bottom-0 left-0 bg-black/50 text-white text-xs px-1 rounded-tr">
                            R{entry.round}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-16 w-16 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-xs">
                        なし
                      </div>
                    )}
                  </div>

                  {isVoted && (
                    <div className="mt-3 text-center text-sm text-red-400 font-medium">
                      ✓ 投票済み
                    </div>
                  )}
                </motion.button>
              );
            })}
        </div>
      </div>

      {/* 投票ボタン */}
      {!myVote && (
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleVote}
            disabled={!selectedId}
            className="w-full rounded-full bg-red-600 py-4 text-lg font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {selectedId
              ? `${room?.players.find((p) => p.id === selectedId)?.name} に投票する`
              : 'プレイヤーを選択してください'}
          </button>
        </div>
      )}

      {/* 投票済みメッセージ */}
      {myVote && (
        <div className="border-t border-gray-700 p-4 text-center">
          <div className="text-gray-400">投票完了！他のプレイヤーを待っています...</div>
        </div>
      )}
    </div>
  );
}
