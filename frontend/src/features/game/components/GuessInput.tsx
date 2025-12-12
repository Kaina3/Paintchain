import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';
import { TurnIndicator } from '@/features/game/components/TurnIndicator';

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
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="glass rounded-2xl p-8 shadow-pop animate-scale-in">
            <div className="text-center">
              <div className="text-6xl animate-bounce mb-4">✅</div>
              <h2 className="text-2xl font-black gradient-text">提出完了!</h2>
              <p className="mt-3 text-gray-700 font-medium">他のプレイヤーを待っています...</p>
            </div>
            <div className="mt-8">
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
      <div className="mb-4 text-center animate-slide-down">
        <h1 className="text-2xl font-black gradient-text mb-2">🤔 これは何？</h1>
        <div className="flex justify-center mb-2">
          <TurnIndicator />
        </div>
        <p className="text-sm text-gray-700 font-medium">この絵が何を表しているか当ててください</p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 animate-scale-in">
        <Timer onTimeout={handleTimeout} />
        <div className="flex-1">
          <SubmissionProgress />
        </div>
      </div>

      {/* Image Display */}
      <div className="flex flex-1 items-center justify-center overflow-hidden 
                    glass rounded-2xl p-4 shadow-pop border-2 border-white/50
                    animate-scale-in" 
           style={{ animationDelay: '0.1s' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="描かれた絵"
            className="max-h-full max-w-full rounded-xl shadow-lg object-contain"
          />
        ) : (
          <div className="text-gray-500 font-semibold">🖼️ 絵が読み込まれていません</div>
        )}
      </div>

      {/* Answer Form */}
      <div
        className="sticky bottom-4 mt-4 glass rounded-2xl p-4 shadow-pop animate-scale-in backdrop-blur"
        style={{ animationDelay: '0.2s' }}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="guess" className="block text-sm font-bold text-gray-800 mb-2">
              💡 回答（140文字まで）
            </label>
            <input
              id="guess"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="これは○○だと思う"
              maxLength={140}
              className="block w-full rounded-xl border-2 border-gray-200 px-5 py-3 
                       bg-white font-medium
                       focus:border-secondary-400 focus:outline-none focus:ring-4 focus:ring-secondary-100
                       transition-all duration-200 placeholder:text-gray-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 
                     px-6 py-4 font-bold text-white 
                     shadow-[0_4px_14px_0_rgba(37,99,235,0.5)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.7)]
                     hover:from-blue-700 hover:to-blue-800 
                     transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
          >
            📤 提出する
          </button>
        </div>
      </div>
    </div>
  );
}
