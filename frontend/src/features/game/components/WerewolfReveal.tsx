import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import type { Player } from '@/shared/types';

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="absolute top-4 right-4">
        <Timer />
      </div>

      <div className="text-center mb-8">
        <div className="text-lg text-gray-400">ラウンド {currentRound} - 発表</div>
        <div className="text-sm text-gray-500 mt-1">
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
            className="text-center"
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
              <span className="text-3xl font-bold text-white">{currentPlayer.name}</span>
            </motion.div>

            {/* 絵 */}
            <AnimatePresence>
              {showDrawing && currentDrawing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white p-4 shadow-2xl"
                >
                  <img
                    src={currentDrawing}
                    alt={`${currentPlayer.name}の絵`}
                    className="max-w-sm rounded-lg"
                  />
                </motion.div>
              )}
              {showDrawing && !currentDrawing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl bg-gray-700 p-8 text-gray-400"
                >
                  絵がありません
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 進行状況バー */}
      <div className="absolute bottom-8 left-4 right-4">
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
