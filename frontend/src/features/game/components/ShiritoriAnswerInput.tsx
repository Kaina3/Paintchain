interface ShiritoriAnswerInputProps {
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (answer: string) => void;
}

// ひらがなのみかチェック
function isHiraganaOnly(text: string): boolean {
  return /^[\u3041-\u3096]+$/.test(text);
}

export function ShiritoriAnswerInput({ disabled, onSubmit, value, onChange }: ShiritoriAnswerInputProps) {
  const isValidAnswer = value.length > 0 && isHiraganaOnly(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // ひらがなのみ、または空文字を許可
    if (newValue === '' || isHiraganaOnly(newValue)) {
      onChange(newValue);
    }
  };

  const handleSubmit = () => {
    if (isValidAnswer) {
      onSubmit(value);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">答え（ひらがな）</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={handleInputChange}
          placeholder="りんご"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          disabled={disabled}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !isValidAnswer}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          提出
        </button>
      </div>
      {value.length > 0 && !isValidAnswer && (
        <p className="text-xs text-red-600">ひらがなのみ入力してください</p>
      )}
    </div>
  );
}
