import { useRef, useState } from 'react';

interface ShiritoriAnswerInputProps {
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (answer: string) => void;
}

// ひらがなのみかチェック（長音「ー」も許可）
function isHiraganaOnly(text: string): boolean {
  return /^[\u3041-\u3096ー]+$/.test(text);
}

export function ShiritoriAnswerInput({ disabled, onSubmit, value, onChange }: ShiritoriAnswerInputProps) {
  // IME変換中かどうかを追跡
  const isComposingRef = useRef(false);
  // ローカルの入力値（IME変換中の文字も含む）
  const [localValue, setLocalValue] = useState(value);

  const isValidAnswer = value.length > 0 && isHiraganaOnly(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // IME変換中は親への通知をスキップ（変換確定後に処理）
    if (isComposingRef.current) {
      return;
    }

    // 無効文字でも親へ渡して、UI側でエラー表示できるようにする
    onChange(newValue);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const newValue = e.currentTarget.value;
    setLocalValue(newValue);

    // 変換確定後は無条件で親に通知（バリデーションは表示側で行う）
    onChange(newValue);
  };

  const handleSubmit = () => {
    if (isValidAnswer) {
      onSubmit(value);
    }
  };

  // 表示用の値（IME変換中はローカル値、それ以外は親の値）
  const displayValue = isComposingRef.current ? localValue : value;
  const hasError = value.length > 0 && !isValidAnswer;

  return (
    <div className="space-y-2">
      <label className="font-serif text-sm font-bold text-stone-700">TITLE (ひらがな)</label>
      <div className="flex gap-2">
        <input
          value={displayValue}
          onChange={handleInputChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="りんご"
          className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 transition font-medium ${
            hasError 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50 text-red-800' 
              : 'border-stone-300 focus:border-amber-500 focus:ring-amber-200 bg-white text-stone-800'
          }`}
          disabled={disabled}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !isValidAnswer}
          className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2 font-serif font-bold text-amber-100 shadow-sm transition hover:from-amber-500 hover:to-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          SUBMIT
        </button>
      </div>
      {hasError && (
        <div className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-700 font-medium">
          ひらがなのみ入力してください
        </div>
      )}
    </div>
  );
}
