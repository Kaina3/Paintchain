import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { WerewolfGallery } from './WerewolfGallery';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

const museumBg = '/img/gallery_room.png';

interface WerewolfVotingProps {
  onVote: (targetId: string) => void;
}

export function WerewolfVoting({ onVote }: WerewolfVotingProps) {
  const { allDrawings, currentRound, myVote, voteCount, totalPlayers, setMyVote } =
    useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [featuredPlayerId, setFeaturedPlayerId] = useState<string | null>(null);

  const players = room?.players ?? [];

  // 全プレイヤーのギャラリーアイテム
  const galleryItems = useMemo(() => {
    return players.map((player) => {
      const entries = allDrawings.get(player.id) ?? [];
      const entry = entries.find((e) => e.round === currentRound);
      return { player, imageData: entry?.imageData ?? null };
    });
  }, [players, allDrawings, currentRound]);

  const handleVoteConfirm = useCallback(() => {
    if (!selectedId || myVote) return;
    setMyVote(selectedId);
    onVote(selectedId);
  }, [selectedId, myVote, onVote, setMyVote]);

  const handleTimeout = useCallback(() => {
    if (!myVote && room?.players) {
      const firstOther = room.players.find((p) => p.id !== playerId);
      if (firstOther) {
        setMyVote(firstOther.id);
        onVote(firstOther.id);
      }
    }
  }, [myVote, room, playerId, onVote, setMyVote]);

  const handleSelectPlayer = useCallback((pid: string) => {
    setFeaturedPlayerId(pid);
  }, []);

  const handleVoteSelect = useCallback((pid: string) => {
    if (!myVote) {
      setSelectedId(pid);
    }
  }, [myVote]);

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
      <div className="relative z-10 bg-gradient-to-r from-stone-800/95 to-stone-900/95 p-3 sm:p-4 text-amber-100 border-b-2 border-stone-600 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
              🗳️ 投票タイム
            </div>
            <div className="text-sm opacity-90 font-serif">人狼だと思う人の絵をクリック</div>
          </div>
          <Timer onTimeout={handleTimeout} />
        </div>
      </div>

      {/* 投票進捗 */}
      <div className="relative z-10 mx-3 sm:mx-4 mt-3">
        <div className="bg-stone-900/60 backdrop-blur-sm rounded-lg p-2 border border-stone-600/50">
          <div className="flex items-center justify-between text-sm text-amber-200/80 font-serif mb-1">
            <span>投票済み</span>
            <span className="text-amber-100 font-bold">{voteCount} / {totalPlayers}</span>
          </div>
          <div className="h-2 bg-stone-700/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-red-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${totalPlayers > 0 ? (voteCount / totalPlayers) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* メインエリア: ギャラリー */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-3 sm:p-4">
        <WerewolfGallery
          revealedItems={galleryItems}
          featuredPlayerId={featuredPlayerId}
          onSelectPlayer={handleSelectPlayer}
          voteMode={true}
          selectedVoteId={selectedId}
          confirmedVoteId={myVote}
          onVoteSelect={handleVoteSelect}
        />
      </div>

      {/* 投票確定ボタン */}
      {!myVote && (
        <div className="relative z-10 border-t border-stone-600 p-3 sm:p-4">
          <button
            onClick={handleVoteConfirm}
            disabled={!selectedId}
            className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-4 text-lg font-bold text-white hover:from-red-500 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] border-2 border-red-500/50 shadow-lg"
          >
            {selectedId
              ? `🗳️ ${players.find((p) => p.id === selectedId)?.name} に投票する`
              : '絵をクリックして選択してください'}
          </button>
        </div>
      )}

      {/* 投票済みメッセージ */}
      {myVote && (
        <div className="relative z-10 border-t border-stone-600 p-3 sm:p-4 text-center">
          <div className="text-amber-200/80 font-serif italic">
            ✅ 投票完了！他のプレイヤーを待っています...
          </div>
        </div>
      )}
    </div>
  );
}
