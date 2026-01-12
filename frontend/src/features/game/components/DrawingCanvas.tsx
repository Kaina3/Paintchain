import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';
import { TurnIndicator } from '@/features/game/components/TurnIndicator';
import { Canvas, CanvasRef } from '@/shared/components/Canvas';
import { useRoomStore } from '@/features/room/store/roomStore';
import { AnimationReference } from '@/features/game/components/AnimationReference';
import type { DrawingStroke } from '@/shared/types';
import museumBg from '@/assets/museum_simple.png';
import paletteImg from '@/assets/palette.png';

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
  const hasBackground = room?.settings.animationSettings.firstFrameMode === 'background';
  
  // オニオンスキン（前フレーム）の透明度
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(30);
  
  // 背景画像（背景モード用）
  const backgroundImage = useMemo(() => {
    if (!receivedContent) return undefined;
    if (receivedContent.type === 'frames_with_bg') return receivedContent.background;
    return undefined;
  }, [receivedContent]);
  
  const frames = useMemo(() => {
    if (!receivedContent) return [] as string[];
    if (receivedContent.type === 'frames') return receivedContent.payload;
    if (receivedContent.type === 'frames_with_bg') return receivedContent.payload;
    if (receivedContent.type === 'drawing') return [receivedContent.payload];
    return [] as string[];
  }, [receivedContent]);
  
  // アニメーションモードでの前フレーム（オニオンスキン）
  const onionSkinImage = useMemo(() => {
    // アニメーションモードで、drawingフェーズのときのみオニオンスキンを表示
    if (gameMode !== 'animation') return undefined;
    if (phase !== 'drawing') return undefined;
    // 背景モードの場合は、最後のアニメーションフレームをオニオンスキンとして使用（背景は別レイヤー）
    if (hasBackground) {
      // frames には背景を除いたアニメーションフレームが入っている
      if (frames.length === 0) return undefined;
      return frames[frames.length - 1];
    }
    // 最後のフレームを取得
    if (frames.length === 0) return undefined;
    return frames[frames.length - 1];
  }, [gameMode, phase, frames, hasBackground]);
  
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
    <div 
      className="min-h-screen relative overflow-auto"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 提出完了オーバーレイ */}
      {hasSubmitted && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div 
            className="mx-4 w-full max-w-sm rounded-lg bg-white/10 backdrop-blur-md p-6 shadow-2xl"
            style={{ 
              border: '6px solid transparent',
              borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
            }}
          >
            <div className="text-center">
              <img src={paletteImg} alt="palette" className="w-16 h-16 mx-auto drop-shadow-lg" />
              <h2 className="mt-3 font-serif text-xl font-bold text-amber-100" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                ARTWORK SUBMITTED
              </h2>
              <p className="mt-2 text-sm text-amber-200/80 italic">Awaiting other artists...</p>
            </div>
            <div className="mt-5">
              <SubmissionProgress />
            </div>
            <button
              onClick={handleRetry}
              className="mt-5 w-full rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 border-2 border-stone-500 px-4 py-3 font-serif font-semibold text-amber-100 shadow-lg transition hover:from-stone-500 hover:to-stone-600"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              ✏️ REVISE ARTWORK
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col p-4 md:p-6">
        {/* コンパクトヘッダー */}
        <div 
          className="mb-3 rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl" 
          style={{ 
            border: '4px solid transparent',
            borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
          }}
        >
          <div className="rounded bg-white/5 backdrop-blur-xl px-4 py-2">
            {/* 1行目: タイトル + お題 + 状況 + 提出ボタン */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <img src={paletteImg} alt="palette" className="w-7 h-7 drop-shadow-lg" />
                <TurnIndicator />
              </div>
              <div className="flex-1 min-w-0 text-center px-2">
                <span className="text-xs font-serif text-amber-400 mr-1">SUBJECT:</span>
                <span className="font-serif font-bold text-amber-100 truncate" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                  {prompt || '---'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Timer onTimeout={handleTimeout} />
                <SubmissionProgress />
                <button
                  onClick={handleSubmit}
                  disabled={hasSubmitted}
                  className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-1.5 font-serif font-bold text-sm text-amber-100 shadow-md border border-amber-600 transition-all duration-300 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                >
                  ✏️ SUBMIT
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className={isAnimation ? 'grid gap-4 md:grid-cols-[0.9fr_1.1fr]' : ''}>
          {isAnimation && (
            <div 
              className="rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl max-h-[300px] overflow-y-auto md:max-h-none"
              style={{ 
                border: '6px solid transparent',
                borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
              }}
            >
              <div className="rounded bg-white/5 backdrop-blur-xl p-4">
                <h3 className="mb-3 font-serif text-sm font-semibold text-amber-100 tracking-wide border-b border-amber-700/30 pb-2">
                  REFERENCE COLLECTION
                </h3>
                <AnimationReference frames={frames} viewMode={viewMode} background={backgroundImage} />
              </div>
            </div>
          )}

          <div className="flex flex-col pb-4">
            <div 
              className="rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
              style={{ 
                border: '6px solid transparent',
                borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
              }}
            >
              <div className="rounded bg-white/5 backdrop-blur-xl p-4">
                <Canvas 
                  ref={canvasRef} 
                  onionSkinImage={onionSkinImage}
                  onionSkinOpacity={onionSkinOpacity}
                  onOnionSkinOpacityChange={setOnionSkinOpacity}
                  backgroundImage={backgroundImage}
                  museumTheme={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
