import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Canvas, CanvasRef } from '@/shared/components/Canvas';
import { Timer } from './Timer';
import { SubmissionProgress } from './SubmissionProgress';
import { useWerewolfStore } from '../store/werewolfStore';
import { useGameStore } from '../store/gameStore';
import type { DrawingStroke } from '@/shared/types';

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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-900 to-gray-800">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">
              ラウンド {currentRound} / {totalRounds}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  isWerewolf ? 'bg-red-500' : 'bg-blue-500'
                }`}
              >
                {isWerewolf ? '🐺 人狼' : '👤 村人'}
              </span>
              <span className="text-lg font-bold">【{promptInfo?.category}】</span>
              {!promptInfo?.isHidden && (
                <span className="text-lg">{promptInfo?.prompt}</span>
              )}
            </div>
          </div>
          <Timer onTimeout={handleTimeout} />
        </div>
      </div>

      {/* 提出状況 */}
      <div className="px-4 py-2">
        <SubmissionProgress />
      </div>

      {/* キャンバス */}
      <div className="flex-1 overflow-hidden p-2">
        <Canvas
          ref={canvasRef}
          showToolbar={!hasSubmitted}
        />
      </div>

      {/* 提出ボタン */}
      {!hasSubmitted && (
        <div className="flex justify-center p-4">
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-green-500 px-8 py-3 text-lg font-bold text-white shadow-lg transition-colors hover:bg-green-600"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-white p-8 text-center shadow-xl"
          >
            <div className="text-5xl mb-4">✅</div>
            <div className="text-xl font-bold text-gray-800">提出完了！</div>
            <div className="mt-2 text-gray-500">他のプレイヤーを待っています...</div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
