import { useEffect, useState } from 'react';
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

export function WerewolfAssign() {
  const { promptInfo, isWerewolf, promptChoices } = useWerewolfStore();
  const { room } = useRoomStore();
  const isWordWolf = room?.settings.werewolfSettings.werewolfType === 'wordwolf';
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
      <div
        className="min-h-screen relative overflow-auto flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${museumBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/30 z-[1]" aria-hidden />
        <div
          className="relative z-10 text-2xl animate-pulse text-amber-100 font-serif"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          🎭 役職を配布中...
        </div>
        <div className="absolute bottom-4 left-4 text-xs text-amber-200 z-10">
          DEBUG: promptInfo is null
        </div>
      </div>
    );
  }

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
      <div className="absolute inset-0 bg-black/30 z-[1]" aria-hidden />
      <ReturnToLobbyButton />
      <div className="absolute top-4 right-4 z-10">
        <Timer />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center max-w-md w-full"
      >
        {/* 役職表示 (インポスターのみ) */}
        <AnimatePresence>
          {showRole && !isWordWolf && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div
                className={`inline-block rounded-full px-6 py-2 text-lg font-bold border shadow-lg backdrop-blur-sm ${
                  isWerewolf
                    ? 'bg-red-900/80 text-amber-100 border-red-700/60'
                    : 'bg-sky-900/80 text-amber-100 border-sky-700/60'
                }`}
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
              >
                {isWerewolf ? '🐺 あなたは人狼です' : '👤 あなたは村人です'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ジャンル表示 */}
        <div
          className="mb-4 text-lg text-amber-200/90 font-serif"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
        >
          お題ジャンル
        </div>
        <div
          className="mb-8 text-3xl font-bold text-amber-100 font-serif"
          style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
        >
          【{promptInfo.category}】
        </div>

        {/* お題表示 */}
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl"
              style={museumFrameStyle}
            >
              <div className="rounded bg-white/95 backdrop-blur-xl p-7 md:p-8">
                {promptInfo.isHidden ? (
                  // インポスター: お題なし
                  <div className="text-center">
                    <div className="text-6xl mb-4">❓</div>
                    <div className="text-xl text-stone-600 font-serif">あなたのお題は...</div>
                    <div className="mt-2 text-2xl font-bold text-red-700 font-serif">わかりません</div>
                    <div className="mt-4 text-sm text-stone-600 font-serif italic">
                      他のプレイヤーの絵を見て推測しましょう
                    </div>
                    {promptChoices.length > 0 && (
                      <div className="mt-4 text-sm text-stone-600 font-serif">
                        候補: {promptChoices.join('、')}
                      </div>
                    )}
                  </div>
                ) : (
                  // 通常: お題あり
                  <div className="text-center">
                    <div className="text-xl text-stone-600 mb-2 font-serif">あなたのお題</div>
                    <div className="text-4xl font-bold text-stone-900 font-serif">{promptInfo.prompt}</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 注意書き */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-sm text-amber-200/80 font-serif"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
        >
          ⚠️ お題を直接描くのはNGです。関連するものを描きましょう。
        </motion.div>
      </motion.div>
    </div>
  );
}
