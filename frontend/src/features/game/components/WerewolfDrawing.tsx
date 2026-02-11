import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, CanvasRef } from '@/shared/components/Canvas';
import { Timer } from './Timer';
import { SubmissionProgress } from './SubmissionProgress';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';
import { useWerewolfStore } from '../store/werewolfStore';
import { useGameStore } from '../store/gameStore';
import type { DrawingStroke } from '@/shared/types';

const museumBg = '/img/gallery_room.png';
const museumFrameStyle: React.CSSProperties = {
  border: '6px solid transparent',
  borderImage:
    'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)',
};

interface WerewolfDrawingProps {
  onSubmit: (imageData: string, strokes?: DrawingStroke[]) => void;
}

export function WerewolfDrawing({ onSubmit }: WerewolfDrawingProps) {
  const canvasRef = useRef<CanvasRef>(null);
  const { promptInfo, currentRound, totalRounds, isWerewolf } = useWerewolfStore();
  const { hasSubmitted, setHasSubmitted } = useGameStore();

  const hasSubmittedRef = useRef(hasSubmitted);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const handleSubmit = useCallback(() => {
    if (hasSubmittedRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.getImageData();
    const strokes = canvas.getStrokeHistory();
    setHasSubmitted(true);
    onSubmitRef.current(imageData, strokes);
  }, [setHasSubmitted]);

  const handleTimeout = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  // ラウンドが変わったらキャンバスをクリア
  useEffect(() => {
    setHasSubmitted(false);
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  }, [currentRound, setHasSubmitted]);

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
            <div className="text-sm opacity-90 font-serif">
              ラウンド {currentRound} / {totalRounds}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium border shadow-sm ${
                  isWerewolf ? 'bg-red-900/80 border-red-700/60' : 'bg-sky-900/80 border-sky-700/60'
                }`}
              >
                {isWerewolf ? '🐺 人狼' : '👤 村人'}
              </span>
              <span className="text-lg font-bold font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
                【{promptInfo?.category}】
              </span>
              {!promptInfo?.isHidden && (
                <span className="text-lg font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
                  {promptInfo?.prompt}
                </span>
              )}
            </div>
          </div>
          <Timer onTimeout={handleTimeout} />
        </div>
      </div>

      {/* 提出状況 */}
      <div className="relative z-10 px-4 py-2">
        <SubmissionProgress />
      </div>

      {/* キャンバス */}
      <div className="relative z-10 flex-1 overflow-hidden p-2">
        <div className="h-full rounded-lg bg-white/15 backdrop-blur-md p-1" style={museumFrameStyle}>
          <div className="h-full rounded bg-white/95 overflow-hidden">
            <Canvas ref={canvasRef} showToolbar={!hasSubmitted} museumTheme={true} />
          </div>
        </div>
      </div>

      {/* 提出ボタン */}
      {!hasSubmitted && (
        <div className="relative z-10 flex justify-center p-4">
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-8 py-3 text-lg font-bold text-amber-100 shadow-lg transition-all hover:from-amber-600 hover:to-amber-700 border-2 border-amber-600/50"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            提出する
          </button>
        </div>
      )}

      {/* 提出完了オーバーレイ */}
      {hasSubmitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-4 w-full max-w-sm rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl"
            style={museumFrameStyle}
          >
            <div className="rounded bg-white/95 backdrop-blur-xl p-7 text-center">
              <div className="text-5xl mb-4">✅</div>
              <div className="text-xl font-bold text-stone-800 font-serif">提出完了！</div>
              <div className="mt-2 text-stone-600 font-serif italic">他のプレイヤーを待っています...</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
