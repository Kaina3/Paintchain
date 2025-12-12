import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative w-full max-w-md space-y-6">
        {/* 提出完了オーバーレイ */}
        {hasSubmitted && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="text-center">
                <div className="text-5xl">✅</div>
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

        <div className="text-center animate-slide-down">
          <h1 className="text-3xl font-black gradient-text mb-2">🎨 お題を入力</h1>
          <p className="text-gray-700 font-medium">他のプレイヤーが描くお題を考えてください</p>
        </div>

        <div className="flex justify-center animate-scale-in">
          <Timer onTimeout={handleTimeout} />
        </div>

        <div className="glass rounded-2xl p-6 shadow-pop animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-bold text-gray-800 mb-2">
                💭 お題（140文字まで）
              </label>
              <p className="mb-2 text-xs font-semibold text-gray-500">短く具体的なフレーズが伝わりやすいです。</p>
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
                className="block w-full rounded-xl border-2 border-gray-200 px-5 py-3 
                         bg-white font-medium
                         focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100
                         transition-all duration-200 placeholder:text-gray-400
                         disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="mt-2 text-right text-xs font-semibold text-gray-600 
                            bg-gray-100 inline-block px-2 py-1 rounded-md float-right">
                {text.length}/140
              </div>
              {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={hasSubmitted}
              className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 px-6 py-4 font-bold text-white 
                       shadow-[0_4px_14px_0_rgba(221,32,115,0.5)] hover:shadow-[0_6px_20px_rgba(221,32,115,0.7)] 
                       hover:from-pink-700 hover:to-pink-800
                       transition-all duration-300 
                       transform hover:scale-[1.02] active:scale-95 mt-8
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
            >
              📤 提出する
            </button>
          </div>
        </div>

        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <SubmissionProgress />
        </div>
      </div>
    </div>
  );
}
