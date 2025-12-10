import { useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';
import { TurnIndicator } from '@/features/game/components/TurnIndicator';
import { Canvas, CanvasRef } from '@/shared/components/Canvas';

interface DrawingCanvasProps {
  onSubmit: (imageData: string) => void;
}

export function DrawingCanvas({ onSubmit }: DrawingCanvasProps) {
  const canvasRef = useRef<CanvasRef>(null);
  const { hasSubmitted, receivedContent } = useGameStore();
  const prompt = receivedContent?.type === 'text' ? receivedContent.payload : '';
  
  // useRefで最新の状態を追跡（クロージャ問題を回避）
  const hasSubmittedRef = useRef(hasSubmitted);
  const onSubmitRef = useRef(onSubmit);
  
  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);
  
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const handleSubmit = useCallback(() => {
    if (!canvasRef.current) return;
    const imageData = canvasRef.current.getImageData();
    onSubmitRef.current(imageData);
  }, []);

  // 時間切れ時に現在の描画を自動提出
  const handleTimeout = useCallback(() => {
    if (hasSubmittedRef.current) return;
    if (!canvasRef.current) return;
    const imageData = canvasRef.current.getImageData();
    onSubmitRef.current(imageData);
  }, []);

  if (hasSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="text-center">
              <div className="text-4xl">🎨</div>
              <h2 className="mt-2 text-xl font-semibold text-gray-800">提出完了!</h2>
              <p className="mt-2 text-gray-600">他のプレイヤーを待っています...</p>
            </div>
            <div className="mt-6">
              <SubmissionProgress />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-xl font-bold text-primary-700">🎨 お絵描きタイム</h1>
        <TurnIndicator />
        <div className="mt-2 rounded-lg bg-yellow-100 p-3">
          <p className="text-sm text-gray-600">お題:</p>
          <p className="text-lg font-semibold text-gray-800">{prompt || '(お題なし)'}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Timer onTimeout={handleTimeout} />
        <SubmissionProgress />
      </div>

      {/* Canvas with toolbar */}
      <Canvas ref={canvasRef} className="flex-1" />

      {/* Submit button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
        >
          提出する
        </button>
      </div>
    </div>
  );
}
