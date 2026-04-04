import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { allDrawings, totalRounds, myVote, voteCount, totalPlayers, setMyVote } =
    useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const [featuredPlayerId, setFeaturedPlayerId] = useState<string | null>(null);
  const [featuredRound, setFeaturedRound] = useState<number | null>(null);

  const players = room?.players ?? [];

  const galleryItems = useMemo(() => {
    return players.map((player) => {
      const entries = allDrawings.get(player.id) ?? [];
      // ラウンド順にソートして全ラウンドの絵を保持
      const sortedEntries = [...entries].sort((a, b) => a.round - b.round);
      return { player, entries: sortedEntries };
    });
  }, [players, allDrawings]);

  const featuredItem = useMemo(() => {
    if (!featuredPlayerId || featuredRound === null) return null;
    const item = galleryItems.find((item) => item.player.id === featuredPlayerId);
    if (!item) return null;
    const entry = item.entries.find((e) => e.round === featuredRound);
    if (!entry) return null;
    return { player: item.player, entry };
  }, [featuredPlayerId, featuredRound, galleryItems]);

  const handleVoteConfirm = useCallback(
    (targetId: string) => {
      if (myVote) return;
      setMyVote(targetId);
      onVote(targetId);
    },
    [myVote, onVote, setMyVote],
  );

  const handleTimeout = useCallback(() => {
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
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/25 z-[1]" aria-hidden />
      <ReturnToLobbyButton />

      {/* ヘッダー */}
      <div className="relative z-10 bg-gradient-to-r from-stone-800/95 to-stone-900/95 p-3 sm:p-4 text-amber-100 border-b-2 border-stone-600 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className="text-lg font-bold font-serif"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
            >
              🗳️ 投票タイム
            </div>
            <div className="text-sm opacity-90 font-serif">
              人狼だと思うプレイヤーに投票
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 投票進捗 */}
            {voteCount === totalPlayers ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-green-600/80 rounded-lg px-3 py-1.5 border border-green-400/60 shadow-lg shadow-green-400/20"
              >
                <span className="text-xs text-green-100 font-serif">全員投票完了！</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2 bg-stone-700/60 rounded-lg px-3 py-1.5 border border-stone-500/50">
                <span className="text-xs text-amber-200/70 font-serif">投票</span>
                <span className="text-sm font-bold text-amber-100">
                  {voteCount}/{totalPlayers}
                </span>
              </div>
            )}
            <Timer onTimeout={handleTimeout} />
          </div>
        </div>
      </div>

      {/* メインエリア: 左グリッド + 右プレビュー */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* 左サイド: プレイヤー一覧 + 投票ボタン */}
        <div className="w-[280px] sm:w-[320px] flex-shrink-0 overflow-y-auto p-3 sm:p-4 space-y-2">
          {galleryItems.map((item) => {
            const isMe = item.player.id === playerId;
            const isSelected = featuredPlayerId === item.player.id;
            const isVoted = myVote === item.player.id;

            return (
              <motion.div
                key={item.player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-2 rounded-xl p-2 transition-colors border-2 ${
                  isSelected
                    ? 'bg-stone-700/70 border-amber-400/80 shadow-lg shadow-amber-400/20'
                    : 'bg-stone-800/50 border-stone-600/40'
                } backdrop-blur-sm`}
              >
                {/* サムネイル画像（全ラウンド） */}
                <div className="flex gap-1 flex-shrink-0">
                  {Array.from({ length: totalRounds }, (_, i) => {
                    const entry = item.entries.find((e) => e.round === i + 1);
                    const isThisRoundSelected = featuredPlayerId === item.player.id && featuredRound === i + 1;
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (entry?.imageData) {
                            setFeaturedPlayerId(item.player.id);
                            setFeaturedRound(i + 1);
                          }
                        }}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          isThisRoundSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg scale-105'
                            : entry?.imageData
                            ? 'border-stone-500/40 hover:border-amber-400/60 cursor-pointer hover:scale-105'
                            : 'border-stone-600/30'
                        } bg-white/90`}
                      >
                        {entry?.imageData ? (
                          <img
                            src={entry.imageData}
                            alt={`${item.player.name}の絵 R${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-[10px] font-serif">
                            R{i + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* プレイヤー名 + 投票ボタン */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3.5 w-3.5 rounded-full flex-shrink-0 border border-white/20"
                      style={{ backgroundColor: item.player.color }}
                    />
                    <span className="text-sm text-amber-100 font-serif font-medium truncate">
                      {item.player.name}
                      {isMe && (
                        <span className="text-amber-200/50 text-xs ml-1">(自分)</span>
                      )}
                    </span>
                  </div>

                  {/* 投票ボタン */}
                  {isMe ? (
                    <div className="text-xs text-stone-400 font-serif italic px-1">
                      自分には投票できません
                    </div>
                  ) : myVote ? (
                    isVoted ? (
                      <div className="flex items-center gap-1 rounded-lg bg-red-600/80 px-3 py-1.5 border border-red-500/60">
                        <span className="text-xs font-bold text-white">🗳️ 投票済み</span>
                      </div>
                    ) : (
                      <div className="text-xs text-stone-500 font-serif italic px-1">—</div>
                    )
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoteConfirm(item.player.id);
                      }}
                      className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-3 py-1.5 text-xs font-bold text-white hover:from-red-500 hover:to-red-600 transition-all active:scale-95 border border-red-500/50 shadow-md"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                    >
                      🗳️ この人に投票
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 右サイド: 選択した絵の大きなプレビュー */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {featuredItem ? (
              <motion.div
                key={`preview-${featuredItem.player.id}-${featuredItem.entry.round}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="text-center max-w-full"
              >
                {/* 名前とラウンド */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-3 flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-full shadow-lg border border-white/30"
                      style={{ backgroundColor: featuredItem.player.color }}
                    />
                    <span
                      className="text-2xl sm:text-3xl font-bold text-amber-100 font-serif"
                      style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                    >
                      {featuredItem.player.name}
                    </span>
                  </div>
                  <span className="text-sm text-amber-200/70 font-serif">
                    ラウンド {featuredItem.entry.round}
                  </span>
                </motion.div>

                {/* 絵 */}
                <div
                  className="inline-block rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
                  style={museumFrameStyle}
                >
                  <div className="rounded bg-white/95 p-2 sm:p-3">
                    <img
                      src={featuredItem.entry.imageData}
                      alt={`${featuredItem.player.name}の絵 R${featuredItem.entry.round}`}
                      className="max-h-[55vh] max-w-full rounded-lg"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="text-amber-200/40 font-serif text-lg">
                  ← 左の絵をクリックして拡大
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 投票済みフッター */}
      {myVote && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 border-t border-stone-600 p-3 sm:p-4 text-center bg-stone-900/60 backdrop-blur-sm"
        >
          <div className="text-amber-200/80 font-serif italic">
            ✅ 投票完了！他のプレイヤーを待っています...
          </div>
        </motion.div>
      )}
    </div>
  );
}
