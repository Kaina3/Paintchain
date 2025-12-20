import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';
import { TurnIndicator } from '@/features/game/components/TurnIndicator';
import { Canvas, CanvasRef } from '@/shared/components/Canvas';
import { useRoomStore } from '@/features/room/store/roomStore';
import { AnimationReference } from '@/features/game/components/AnimationReference';
import type { DrawingStroke } from '@/shared/types';

interface DrawingCanvasProps {
  onSubmit: (imageData: string, strokes?: DrawingStroke[]) => void;
  onRetry?: () => void;
}

export function DrawingCanvas({ onSubmit, onRetry }: DrawingCanvasProps) {
  const canvasRef = useRef<CanvasRef>(null);
  const { hasSubmitted, receivedContent, setHasSubmitted, phase } = useGameStore();
  const { room } = useRoomStore();
  const prompt = receivedContent?.type === 'text' ? receivedContent.payload : '';
  const gameMode = room?.settings.gameMode ?? 'normal';
  const viewMode = room?.settings.animationSettings.viewMode ?? 'sequence';
  
  // オニオンスキン（前フレーム）の透明度
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(30);
  
  const frames = useMemo(() => {
    if (!receivedContent) return [] as string[];
    if (receivedContent.type === 'frames') return receivedContent.payload;
    if (receivedContent.type === 'drawing') return [receivedContent.payload];
    return [] as string[];
  }, [receivedContent]);
  
  // アニメーションモードでの前フレーム（オニオンスキン）
  const onionSkinImage = useMemo(() => {
    // アニメーションモードで、drawingフェーズのときのみオニオンスキンを表示
    if (gameMode !== 'animation') return undefined;
    if (phase !== 'drawing') return undefined;
    // 最後のフレームを取得
    if (frames.length === 0) return undefined;
    return frames[frames.length - 1];
  }, [gameMode, phase, frames]);
  
  // useRefで最新の状態を追跡（クロージャ問題を回避）
  const hasSubmittedRef = useRef(hasSubmitted);
  const onSubmitRef = useRef(onSubmit);
  
  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);
  
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  // ターンが変わったときにキャンバスをクリア
  // 注意: Canvas側でonionSkinImageの変更時に再初期化されるので、
  // receivedContentの変更をトリガーとして使う
  const prevReceivedContentRef = useRef(receivedContent);
  useEffect(() => {
    // receivedContentが変わったときのみクリア（新しいターンに移った証拠）
    if (prevReceivedContentRef.current !== receivedContent && canvasRef.current) {
      canvasRef.current.clear();
    }
    prevReceivedContentRef.current = receivedContent;
  }, [receivedContent]);

  const handleSubmit = useCallback(() => {
    if (!canvasRef.current) return;
    const imageData = canvasRef.current.getImageData();
    const strokes = canvasRef.current.getStrokeHistory();
    onSubmitRef.current(imageData, strokes);
  }, []);

  // 時間切れ時に現在の描画を自動提出
  const handleTimeout = useCallback(() => {
    if (hasSubmittedRef.current) return;
    if (!canvasRef.current) return;
    const imageData = canvasRef.current.getImageData();
    const strokes = canvasRef.current.getStrokeHistory();
    onSubmitRef.current(imageData, strokes);
  }, []);

  // 書き直しボタン（提出後にキャンバスを再度編集可能にする）
  const handleRetry = useCallback(() => {
    setHasSubmitted(false);
    onRetry?.();
  }, [setHasSubmitted, onRetry]);

  const isAnimation = gameMode === 'animation';

  return (
    <div className="relative flex min-h-screen flex-col p-4">
      {/* 提出完了オーバーレイ */}
      {hasSubmitted && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="text-5xl">🎨</div>
              <h2 className="mt-3 text-xl font-bold text-gray-800">提出完了!</h2>
              <p className="mt-2 text-sm text-gray-600">他のプレイヤーを待っています...</p>
            </div>
            <div className="mt-5">
              <SubmissionProgress />
            </div>
            <button
              onClick={handleRetry}
              className="mt-5 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ✏️ 書き直す
            </button>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 mb-4 space-y-3 rounded-2xl border border-yellow-100 bg-white/90 p-4 text-center shadow-sm backdrop-blur">
        <h1 className="text-xl font-bold text-primary-700">🎨 お絵描きタイム</h1>
        <TurnIndicator />
        <div className="rounded-lg bg-yellow-50 p-3 text-left shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-800">お題</p>
          <p className="text-lg font-semibold text-gray-800">{prompt || '(お題なし)'}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Timer onTimeout={handleTimeout} />
          <SubmissionProgress />
        </div>
      </div>

      <div className={isAnimation ? 'grid flex-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]' : 'flex-1'}>
        {isAnimation && (
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">参照</h3>
            <AnimationReference frames={frames} viewMode={viewMode} />
          </div>
        )}

        <div className="flex flex-col">
          <Canvas 
            ref={canvasRef} 
            className="flex-1" 
            onionSkinImage={onionSkinImage}
            onionSkinOpacity={onionSkinOpacity}
            onOnionSkinOpacityChange={setOnionSkinOpacity}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={hasSubmitted}
              className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              提出する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
