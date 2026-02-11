import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { WerewolfGallery } from './WerewolfGallery';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

const museumBg = '/img/gallery_room.png';

interface WerewolfRevealProps {
  onAdvanceReveal: () => void;
}

export function WerewolfReveal({ onAdvanceReveal }: WerewolfRevealProps) {
  const { allDrawings, currentRound, revealIndex } = useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const [showDrawing, setShowDrawing] = useState(false);

  const players = room?.players ?? [];
  const isHost = room?.hostId === playerId;
  const isLastPlayer = revealIndex >= players.length - 1;

  // revealIndex が変わったら演出
  useEffect(() => {
    setShowDrawing(false);
    const timer = setTimeout(() => setShowDrawing(true), 400);
    return () => clearTimeout(timer);
  }, [revealIndex]);

  // 全発表対象（現在含む）
  const allRevealedItems = useMemo(() => {
    return players.slice(0, revealIndex + 1).map((player) => {
      const entries = allDrawings.get(player.id) ?? [];
      const entry = entries.find((e) => e.round === currentRound);
      return { player, imageData: entry?.imageData ?? null };
    });
  }, [players, revealIndex, allDrawings, currentRound]);

  // サムネ行: 発表済み（現在発表中を除く）
  const thumbnailItems = useMemo(() => {
    return players.slice(0, revealIndex).map((player) => {
      const entries = allDrawings.get(player.id) ?? [];
      const entry = entries.find((e) => e.round === currentRound);
      return { player, imageData: entry?.imageData ?? null };
    });
  }, [players, revealIndex, allDrawings, currentRound]);

  const currentPlayer = players[revealIndex];

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
      <div className="absolute inset-0 bg-black/20 z-[1]" aria-hidden />
      <ReturnToLobbyButton />

      {/* ラウンド表示（右上に控えめに） */}
      <div className="absolute top-4 right-4 z-20">
        <div
          className="text-sm text-amber-200/70 font-serif"
          style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}
        >
          R{currentRound} — {revealIndex + 1}/{players.length}
        </div>
      </div>

      {/* メインエリア: 壁に絵を飾るレイアウト */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-12 pb-4">
        {/* ギャラリー – 常時マウント（サムネ行を維持） */}
        <WerewolfGallery
          revealedItems={allRevealedItems}
          featuredPlayerId={showDrawing ? (currentPlayer?.id ?? null) : null}
          revealMode={true}
          thumbnailItems={thumbnailItems}
        />

        {/* 名前お披露目オーバーレイ（絵の表示前） */}
        <AnimatePresence>
          {!showDrawing && (
            <motion.div
              key={`name-${revealIndex}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <div className="text-5xl mb-4 animate-bounce">🎭</div>
                <div
                  className="text-3xl font-bold text-amber-100 font-serif"
                  style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.6)' }}
                >
                  {currentPlayer?.name ?? ''}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ホスト用「次へ」ボタン */}
        {isHost && showDrawing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <button
              onClick={onAdvanceReveal}
              className="px-10 py-3 rounded-xl text-lg font-bold text-white shadow-xl transition-all active:scale-95
                bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700
                border border-indigo-400/30"
            >
              {isLastPlayer ? '議論へ進む →' : `次の人へ → (${revealIndex + 2}/${players.length})`}
            </button>
          </motion.div>
        )}

        {/* ゲスト用メッセージ */}
        {!isHost && showDrawing && (
          <div className="mt-6 text-amber-200/40 text-sm font-serif">
            ホストが次の発表へ進めます...
          </div>
        )}
      </div>
    </div>
  );
}
