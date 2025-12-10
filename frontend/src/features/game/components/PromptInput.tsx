import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';

interface PromptInputProps {
  onSubmit: (text: string) => void;
}

export function PromptInput({ onSubmit }: PromptInputProps) {
  const [text, setText] = useState('');
  const { hasSubmitted } = useGameStore();
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
    if (textRef.current.trim() || !hasSubmittedRef.current) {
      onSubmitRef.current(textRef.current.trim());
    }
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-700">🎨 お題を入力</h1>
          <p className="mt-2 text-gray-600">他のプレイヤーが描くお題を考えてください</p>
        </div>

        <div className="flex justify-center">
          <Timer onTimeout={handleTimeout} />
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                お題（140文字まで）
              </label>
              <textarea
                id="prompt"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="例: バナナを食べるゴリラ"
                maxLength={140}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <div className="mt-1 text-right text-xs text-gray-500">{text.length}/140</div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700"
            >
              提出する
            </button>
          </div>
        </div>

        <SubmissionProgress />
      </div>
    </div>
  );
}
