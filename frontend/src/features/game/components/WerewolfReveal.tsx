import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from './Timer';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import type { Player } from '@/shared/types';

const museumBg = '/img/gallery_room.png';
const museumFrameStyle: React.CSSProperties = {
  border: '6px solid transparent',
  borderImage:
    'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)',
};

export function WerewolfReveal() {
  const { allDrawings, currentRound, revealIndex } = useWerewolfStore();
  const { room } = useRoomStore();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [showDrawing, setShowDrawing] = useState(false);

  const players = room?.players ?? [];
  const currentPlayer = players[currentPlayerIndex];

  // サーバーからのrevealIndex更新で自動進行
  useEffect(() => {
    if (revealIndex >= 0 && revealIndex < players.length) {
      setCurrentPlayerIndex(revealIndex);
      setShowDrawing(false);
      // 演出: 少し遅れて絵を表示
      const timer = setTimeout(() => setShowDrawing(true), 500);
      return () => clearTimeout(timer);
    }
  }, [revealIndex, players.length]);

  // 現在のプレイヤーの描画を取得
  const getCurrentDrawing = (player: Player | undefined) => {
    if (!player) return null;
    const entries = allDrawings.get(player.id);
    if (!entries) return null;
    // 現在のラウンドの絵を取得
    const entry = entries.find((e) => e.round === currentRound);
    return entry?.imageData ?? null;
  };

  const currentDrawing = getCurrentDrawing(currentPlayer);

  return (
    <div
      className="min-h-screen relative overflow-auto flex flex-col items-center justify-center p-4"
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
      <div className="absolute top-4 right-4 z-10">
        <Timer />
      </div>

      <div className="relative z-10 text-center mb-8">
        <div className="text-lg text-amber-100 font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
          ラウンド {currentRound} - 発表
        </div>
        <div className="text-sm text-amber-200/80 mt-1 font-serif">
          {currentPlayerIndex + 1} / {players.length} 人目
        </div>
      </div>

      {/* 発表プレイヤー情報と絵 */}
      <AnimatePresence mode="wait">
        {currentPlayer && (
          <motion.div
            key={`${currentPlayer.id}-${currentRound}`}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 text-center"
          >
            {/* プレイヤー名 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center justify-center gap-3"
            >
              <div
                className="h-6 w-6 rounded-full shadow-lg"
                style={{ backgroundColor: currentPlayer.color }}
              />
              <span className="text-3xl font-bold text-amber-100 font-serif" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                {currentPlayer.name}
              </span>
            </motion.div>

            {/* 絵 */}
            <AnimatePresence>
              {showDrawing && currentDrawing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl"
                  style={museumFrameStyle}
                >
                  <div className="rounded bg-white/95 p-4">
                    <img
                      src={currentDrawing}
                      alt={`${currentPlayer.name}の絵`}
                      className="max-w-sm rounded-lg"
                    />
                  </div>
                </motion.div>
              )}
              {showDrawing && !currentDrawing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg bg-stone-900/60 p-8 text-amber-200/70 border border-stone-600/60 font-serif"
                >
                  絵がありません
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 進行状況バー */}
      <div className="absolute bottom-8 left-4 right-4 z-10">
        <div className="flex gap-2 justify-center">
          {players.map((player, idx) => (
            <div
              key={player.id}
              className={`h-2 w-8 rounded-full transition-all ${
                idx < currentPlayerIndex
                  ? 'bg-green-500'
                  : idx === currentPlayerIndex
                  ? 'bg-indigo-500 animate-pulse'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
