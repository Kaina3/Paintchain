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
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="text-center">
              <div className="text-4xl">✓</div>
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
        <h1 className="text-xl font-bold text-primary-700">🤔 これは何？</h1>
        <TurnIndicator />
        <p className="mt-1 text-sm text-gray-600">この絵が何を表しているか当ててください</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Timer onTimeout={handleTimeout} />
        <SubmissionProgress />
      </div>

      {/* Image Display */}
      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-white p-4 shadow-lg">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="描かれた絵"
            className="max-h-full max-w-full rounded border border-gray-200 object-contain"
          />
        ) : (
          <div className="text-gray-400">(絵が読み込まれていません)</div>
        )}
      </div>

      {/* Answer Form */}
      <div className="mt-4 rounded-xl bg-white p-4 shadow-lg">
        <div className="space-y-4">
          <div>
            <label htmlFor="guess" className="block text-sm font-medium text-gray-700">
              回答（140文字まで）
            </label>
            <input
              id="guess"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="これは○○だと思う"
              maxLength={140}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700"
          >
            提出する
          </button>
        </div>
      </div>
    </div>
  );
}
