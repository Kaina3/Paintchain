import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';
import { TurnIndicator } from '@/features/game/components/TurnIndicator';
import { PaintSplashOverlay } from '@/shared/components/PaintSplashOverlay';
import museumBg from '@/assets/museum_simple.png';

interface GuessInputProps {
  onSubmit: (text: string) => void;
}

export function GuessInput({ onSubmit }: GuessInputProps) {
  const [text, setText] = useState('');
  const { hasSubmitted, receivedContent } = useGameStore();
  const imageUrl = receivedContent?.type === 'drawing' ? receivedContent.payload : '';
  const textRef = useRef(text);
  textRef.current = text;
  
  // useRefで最新の状態を追跡（クロージャ問題を回避）
  const hasSubmittedRef = useRef(hasSubmitted);
  const onSubmitRef = useRef(onSubmit);
  
  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);
  
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const handleSubmit = () => {
    onSubmitRef.current(textRef.current.trim());
  };

  // 時間切れ時に現在の入力を自動提出
  const handleTimeout = useCallback(() => {
    if (hasSubmittedRef.current) return;
    onSubmitRef.current(textRef.current.trim());
  }, []);

  if (hasSubmitted) {
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
        {/* 絵の具飛沫アニメーション */}
        <PaintSplashOverlay />
        
        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-black/10 z-[1]" />

        <div className="relative z-10 w-full max-w-md space-y-6">
          <div 
            className="museum-frame rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl"
            style={{ 
              border: '6px solid transparent',
              borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)'
            }}
          >
            <div className="rounded bg-white/95 backdrop-blur-xl p-6 md:p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🖼️</div>
                <h2 className="text-2xl font-serif font-bold text-stone-800">Submitted!</h2>
                <p className="mt-3 text-stone-600 font-serif italic">Waiting for other artists...</p>
              </div>
              <div className="mt-8">
                <SubmissionProgress />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-auto flex flex-col p-4"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 絵の具飛沫アニメーション */}
      <PaintSplashOverlay />
      
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/10 z-[1]" />

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 
            className="text-2xl font-serif font-bold text-amber-100 mb-2"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            🤔 What is This?
          </h1>
          <div className="flex justify-center mb-2">
            <TurnIndicator />
          </div>
          <p 
            className="text-sm text-amber-200/90 font-serif italic"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
          >
            Interpret the artwork before you
          </p>
        </div>

        {/* タイマーと進捗 */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <Timer onTimeout={handleTimeout} />
          <div className="flex-1">
            <SubmissionProgress />
          </div>
        </div>

        {/* Image Display - 美術館フレーム */}
        <div 
          className="flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl"
          style={{ 
            border: '6px solid transparent',
            borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)'
          }}
        >
          <div className="w-full h-full rounded bg-white/95 backdrop-blur-xl p-4 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="描かれた絵"
                className="max-h-full max-w-full rounded-lg shadow-lg object-contain"
              />
            ) : (
              <div className="text-stone-500 font-serif font-semibold">🖼️ Artwork loading...</div>
            )}
          </div>
        </div>

        {/* Answer Form - 美術館風 */}
        <div
          className="sticky bottom-4 mt-4 rounded-lg bg-stone-800/90 backdrop-blur-md p-4 shadow-2xl border-2 border-amber-700/50"
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="guess" className="block text-sm font-serif font-bold text-amber-100 mb-2">
                💡 Your Interpretation (140 characters max)
              </label>
              <input
                id="guess"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="これは○○だと思う"
                maxLength={140}
                className="block w-full rounded-lg border-2 border-stone-600 px-4 py-3 
                         bg-stone-700/50 font-medium text-amber-100 placeholder:text-stone-400
                         focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50
                         transition-all duration-200"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 
                       px-6 py-3 font-serif font-bold text-amber-100 
                       shadow-lg hover:from-amber-600 hover:to-amber-700
                       transition-all duration-300 transform hover:scale-[1.02] active:scale-95
                       border-2 border-amber-600/50"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              📤 Submit Interpretation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
