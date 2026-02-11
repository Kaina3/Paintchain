import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

const museumBg = '/img/gallery_room.png';
const museumFrameStyle: React.CSSProperties = {
  border: '6px solid transparent',
  borderImage:
    'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)',
};

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
    <div
      className="min-h-screen relative overflow-auto flex flex-col"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/25 z-[1]" aria-hidden />
      <ReturnToLobbyButton />
      {/* ヘッダー */}
      <div className="relative z-10 bg-gradient-to-r from-stone-800/95 to-stone-900/95 p-4 text-amber-100 border-b-2 border-stone-600 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
              🗳️ 投票タイム
            </div>
            <div className="text-sm opacity-90 font-serif">人狼だと思う人を選んでください</div>
          </div>
          <Timer onTimeout={handleTimeout} />
        </div>
      </div>

      {/* 投票進捗 */}
      <div className="relative z-10 mx-3 md:mx-4 mt-3 rounded-lg bg-white/10 backdrop-blur-md p-1" style={museumFrameStyle}>
        <div className="rounded bg-stone-900/60 p-3 text-center">
          <div className="text-sm text-amber-200/80 font-serif">
            投票済み: <span className="text-amber-100 font-bold">{voteCount}</span> / {totalPlayers} 人
          </div>
          <div className="mt-2 h-2 bg-stone-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${totalPlayers > 0 ? (voteCount / totalPlayers) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* プレイヤー一覧 */}
      <div className="relative z-10 flex-1 overflow-y-auto p-3 md:p-4">
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
                  className={`rounded-lg p-1 text-left transition-all shadow-2xl ${
                    isVoted ? 'ring-2 ring-red-500' : isSelected ? 'ring-2 ring-amber-500' : ''
                  }`}
                  style={museumFrameStyle}
                >
                  <div
                    className={`rounded p-4 border ${
                      isVoted
                        ? 'bg-red-900/40 border-red-700/60'
                        : isSelected
                        ? 'bg-stone-800/70 border-amber-600/60'
                        : 'bg-stone-800/70 border-stone-600/60 hover:bg-stone-700/70'
                    }`}
                  >
                  {/* プレイヤー情報 */}
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-bold text-amber-100 font-serif">{player.name}</span>
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
                      <div className="h-16 w-16 rounded bg-stone-700/60 flex items-center justify-center text-amber-200/60 text-xs font-serif">
                        なし
                      </div>
                    )}
                  </div>

                  {isVoted && (
                    <div className="mt-3 text-center text-sm text-red-300 font-medium font-serif">
                      ✓ 投票済み
                    </div>
                  )}
                  </div>
                </motion.button>
              );
            })}
        </div>
      </div>

      {/* 投票ボタン */}
      {!myVote && (
        <div className="relative z-10 border-t border-stone-600 p-3 md:p-4">
          <button
            onClick={handleVote}
            disabled={!selectedId}
            className="w-full rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 py-4 text-lg font-bold text-amber-100 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-2 border-amber-600/50"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            {selectedId
              ? `${room?.players.find((p) => p.id === selectedId)?.name} に投票する`
              : 'プレイヤーを選択してください'}
          </button>
        </div>
      )}

      {/* 投票済みメッセージ */}
      {myVote && (
        <div className="relative z-10 border-t border-stone-600 p-3 md:p-4 text-center">
          <div className="text-amber-200/80 font-serif italic">投票完了！他のプレイヤーを待っています...</div>
        </div>
      )}
    </div>
  );
}
