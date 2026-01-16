import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';
import { PaintSplashOverlay } from '@/shared/components/PaintSplashOverlay';

const museumBg = '/img/gallery_room.png';

interface PromptInputProps {
  onSubmit: (text: string) => void;
  onRetry?: () => void;
}

export function PromptInput({ onSubmit, onRetry }: PromptInputProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { hasSubmitted, setHasSubmitted } = useGameStore();
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
    const value = textRef.current.trim();
    if (!value) {
      setError('1文字以上入力してください');
      return;
    }
    setError(null);
    onSubmitRef.current(value);
  };

  // 時間切れ時に現在の入力を自動提出
  const handleTimeout = useCallback(() => {
    if (hasSubmittedRef.current) return;
    onSubmitRef.current(textRef.current.trim());
  }, []);

  // 書き直しボタン
  const handleRetry = useCallback(() => {
    setHasSubmitted(false);
    onRetry?.();
  }, [setHasSubmitted, onRetry]);

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
        {/* 提出完了オーバーレイ */}
        {hasSubmitted && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div 
              className="mx-4 w-full max-w-sm rounded-lg p-1 shadow-2xl"
              style={{ 
                border: '6px solid transparent',
                borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)'
              }}
            >
              <div className="rounded bg-white/95 backdrop-blur-xl p-6">
                <div className="text-center">
                  <div className="text-5xl">🖼️</div>
                  <h2 className="mt-3 text-xl font-serif font-bold text-stone-800">Submitted!</h2>
                  <p className="mt-2 text-sm text-stone-600 font-serif italic">Waiting for other artists...</p>
                </div>
                <div className="mt-5">
                  <SubmissionProgress />
                </div>
                <button
                  onClick={handleRetry}
                  className="mt-5 w-full rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 border-2 border-stone-500 
                           px-4 py-2 text-sm font-serif font-bold text-stone-200 shadow-md 
                           transition hover:from-stone-500 hover:to-stone-600"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                >
                  ✏️ Revise
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="text-center">
          <h1 
            className="text-3xl font-serif font-bold text-amber-100 mb-2"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            🎨 Create Your Theme
          </h1>
          <p 
            className="text-amber-200/90 font-serif italic"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
          >
            Compose a subject for others to illustrate
          </p>
        </div>

        {/* タイマー */}
        <div className="flex justify-center">
          <Timer onTimeout={handleTimeout} />
        </div>

        {/* メインカード */}
        <div 
          className="museum-frame rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl" 
          style={{ 
            border: '6px solid transparent',
            borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)'
          }}
        >
          <div className="rounded bg-white/95 backdrop-blur-xl p-5 md:p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-serif font-bold text-stone-700 mb-2">
                  💭 Theme (140 characters max)
                </label>
                <p className="mb-2 text-xs font-serif text-stone-500 italic">Short and specific phrases work best.</p>
                <textarea
                  id="prompt"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="例: バナナを食べるゴリラ"
                  maxLength={140}
                  rows={3}
                  disabled={hasSubmitted}
                  className="block w-full rounded-lg border-2 border-stone-300 px-4 py-3 
                           bg-white font-medium
                           focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                           transition-all duration-200 placeholder:text-stone-400
                           disabled:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="mt-2 text-right text-xs font-serif font-semibold text-stone-600 
                              bg-stone-100 inline-block px-2 py-1 rounded-md float-right">
                  {text.length}/140
                </div>
                {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
              </div>

              <button
                onClick={handleSubmit}
                disabled={hasSubmitted}
                className="w-full rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-4 
                         font-serif font-bold text-amber-100 
                         shadow-lg hover:from-amber-600 hover:to-amber-700
                         transition-all duration-300 
                         transform hover:scale-[1.02] active:scale-95 mt-6
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100
                         border-2 border-amber-600/50"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                📤 Submit Theme
              </button>
            </div>
          </div>
        </div>

        {/* 進捗表示 */}
        <div className="flex justify-center">
          <SubmissionProgress />
        </div>
      </div>
    </div>
  );
}
