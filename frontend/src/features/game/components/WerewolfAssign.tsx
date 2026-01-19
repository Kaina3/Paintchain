import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';

export function WerewolfAssign() {
  const { promptInfo, isWerewolf, promptChoices } = useWerewolfStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showRole, setShowRole] = useState(false);

  useEffect(() => {
    // 演出: 少し遅れて役職を表示
    const roleTimer = setTimeout(() => setShowRole(true), 300);
    // さらに遅れてお題を表示
    const promptTimer = setTimeout(() => setShowPrompt(true), 1000);
    return () => {
      clearTimeout(roleTimer);
      clearTimeout(promptTimer);
    };
  }, []);

  if (!promptInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-2xl animate-pulse text-white">🎭 役職を配布中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="absolute top-4 right-4">
        <Timer />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md w-full"
      >
        {/* 役職表示 */}
        <AnimatePresence>
          {showRole && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div
                className={`inline-block rounded-full px-6 py-2 text-lg font-bold ${
                  isWerewolf
                    ? 'bg-red-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isWerewolf ? '🐺 あなたは人狼です' : '👤 あなたは村人です'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ジャンル表示 */}
        <div className="mb-4 text-lg text-gray-400">お題ジャンル</div>
        <div className="mb-8 text-3xl font-bold text-indigo-400">
          【{promptInfo.category}】
        </div>

        {/* お題表示 */}
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gray-800 p-8 shadow-xl border border-gray-700"
            >
              {promptInfo.isHidden ? (
                // インポスター: お題なし
                <div className="text-center">
                  <div className="text-6xl mb-4">❓</div>
                  <div className="text-xl text-gray-400">あなたのお題は...</div>
                  <div className="mt-2 text-2xl font-bold text-red-400">わかりません</div>
                  <div className="mt-4 text-sm text-gray-500">
                    他のプレイヤーの絵を見て推測しましょう
                  </div>
                  {promptChoices.length > 0 && (
                    <div className="mt-4 text-sm text-gray-500">
                      候補: {promptChoices.join('、')}
                    </div>
                  )}
                </div>
              ) : (
                // 通常: お題あり
                <div className="text-center">
                  <div className="text-xl text-gray-400 mb-2">あなたのお題</div>
                  <div className="text-4xl font-bold text-white">{promptInfo.prompt}</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 注意書き */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-sm text-gray-500"
        >
          ⚠️ お題を直接描くのはNGです。関連するものを描きましょう。
        </motion.div>
      </motion.div>
    </div>
  );
}
