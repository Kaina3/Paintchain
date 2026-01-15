import { useState, useEffect } from 'react';
import { FaImage, FaFilm, FaLink, FaQuestion } from 'react-icons/fa';
import type {
  AnimationModeSettings,
  GameMode,
  NormalModeSettings,
  Settings,
  ShiritoriModeSettings,
  QuizModeSettings,
  QuizPromptCategory,
} from '@/shared/types';
import { QUIZ_CATEGORY_LABELS } from '@/shared/types';

interface ModeSelectionPanelProps {
  settings: Settings;
  isHost: boolean;
  onSelectMode: (mode: GameMode) => void;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

interface ModeCardProps {
  mode: GameMode;
  title: string;
  badge: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function ModeCard({ mode, title, badge, selected, disabled, onSelect }: ModeCardProps) {
  const iconMap: Record<GameMode, React.ReactNode> = {
    normal: <FaImage className="w-6 h-6" />,
    animation: <FaFilm className="w-6 h-6" />,
    shiritori: <FaLink className="w-6 h-6" />,
    quiz: <FaQuestion className="w-6 h-6" />,
  };
  
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
        className={`group relative flex flex-col items-center justify-center rounded-lg p-3 text-center backdrop-blur-sm transition-all duration-200
        ${selected 
          ? 'bg-amber-200/25 border-2 border-amber-500/70 shadow-lg ring-2 ring-amber-400/40' 
          : 'bg-white/10 border-2 border-stone-300/40 hover:bg-white/20 hover:border-stone-400/60'}
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg mb-1 ${
        selected ? 'bg-amber-500/30 text-amber-700' : 'bg-stone-200/50 text-stone-500'
      }`}>
        {iconMap[mode]}
      </div>
      <p className={`text-xs font-bold ${selected ? 'text-amber-800' : 'text-stone-600'}`}>
        {title}
      </p>
      <p className={`text-[10px] ${selected ? 'text-amber-700' : 'text-stone-500'}`}>
        {badge}
      </p>
    </button>
  );
}

interface SettingFieldProps {
  label: string;
  value: number | string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number | string) => void;
  suffix?: string;
  options?: { label: string; value: string }[];
}

function SettingField({ label, value, min, max, step = 1, disabled, onChange, suffix, options }: SettingFieldProps) {
  const baseClasses = 'w-full rounded-xl border border-stone-300/50 bg-white/10 backdrop-blur-sm px-3 py-2 text-sm font-semibold text-gray-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  if (options) {
    return (
      <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
        <span>{label}</span>
        <select
          className={baseClasses}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const clampValue = (inputValue: string): number => {
    const num = Number(inputValue);
    if (isNaN(num) || inputValue === '') return value as number;
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    return num;
  };

  const handleBlur = () => {
    const clamped = clampValue(inputValue);
    setInputValue(String(clamped));
    onChange(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const clamped = clampValue(inputValue);
      setInputValue(String(clamped));
      onChange(clamped);
      e.currentTarget.blur();
    }
  };

  const rangeText = min !== undefined && max !== undefined ? ` (${min}-${max})` : '';

  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
      <span>{label}{rangeText}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={baseClasses}
          disabled={disabled}
          value={inputValue}
          step={step}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {suffix && <span className="text-xs font-semibold text-gray-500">{suffix}</span>}
      </div>
    </label>
  );
}

function NormalModeSettings({
  value,
  disabled,
  onChange,
}: {
  value: NormalModeSettings;
  disabled: boolean;
  onChange: (next: Partial<NormalModeSettings>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SettingField
        label="お題時間"
        value={value.promptTimeSec}
        min={5}
        max={120}
        onChange={(v) => onChange({ promptTimeSec: Number(v) })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="描画時間"
        value={value.drawingTimeSec}
        min={30}
        max={300}
        onChange={(v) => onChange({ drawingTimeSec: Number(v) })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="回答時間"
        value={value.guessTimeSec}
        min={20}
        max={180}
        onChange={(v) => onChange({ guessTimeSec: Number(v) })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="結果表示順"
        value={value.resultOrder}
        options={[
          { label: '最初から', value: 'first' },
          { label: '最後から', value: 'last' },
        ]}
        onChange={(v) => onChange({ resultOrder: v as NormalModeSettings['resultOrder'] })}
        disabled={disabled}
      />
    </div>
  );
}

function AnimationModeSettingsSection({
  value,
  disabled,
  onChange,
}: {
  value: AnimationModeSettings;
  disabled: boolean;
  onChange: (next: Partial<AnimationModeSettings>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SettingField
        label="描画時間"
        value={value.drawingTimeSec}
        min={30}
        max={300}
        onChange={(v) => onChange({ drawingTimeSec: Number(v) })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="表示モード"
        value={value.viewMode}
        options={[
          { label: '順番に表示', value: 'sequence' },
          { label: '1つ前のみ', value: 'previous' },
        ]}
        onChange={(v) => onChange({ viewMode: v as AnimationModeSettings['viewMode'] })}
        disabled={disabled}
      />
      <SettingField
        label="最初のフレーム"
        value={value.firstFrameMode}
        options={[
          { label: 'お題なし', value: 'free' },
          { label: 'お題あり', value: 'prompt' },
          { label: '背景モード', value: 'background' },
        ]}
        onChange={(v) => onChange({ firstFrameMode: v as AnimationModeSettings['firstFrameMode'] })}
        disabled={disabled}
      />
      <SettingField
        label="フレーム数"
        value={value.frameCount ?? 0}
        min={0}
        max={20}
        onChange={(v) => onChange({ frameCount: Number(v) })}
        disabled={disabled}
        suffix="枚（0=人数分。背景/最初のフレームは別）"
      />
      {value.firstFrameMode === 'prompt' && (
        <SettingField
          label="お題時間"
          value={value.promptTimeSec ?? 20}
          min={5}
          max={120}
          onChange={(v) => onChange({ promptTimeSec: Number(v) })}
          disabled={disabled}
          suffix="秒"
        />
      )}
      {value.firstFrameMode === 'background' && (
        <div className="sm:col-span-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              🖼️ 最初のフレームが背景として固定され、他のプレイヤーはその上でアニメーションを描きます
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ShiritoriModeSettingsSection({
  value,
  disabled,
  onChange,
}: {
  value: ShiritoriModeSettings;
  disabled: boolean;
  onChange: (next: Partial<ShiritoriModeSettings>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SettingField
        label="描画時間"
        value={value.drawingTimeSec}
        min={20}
        max={180}
        onChange={(v) => onChange({ drawingTimeSec: Number(v) })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="総ラウンド数"
        value={value.totalDrawings}
        min={4}
        max={40}
        onChange={(v) => onChange({ totalDrawings: Number(v) })}
        disabled={disabled}
        suffix="枚"
      />
    </div>
  );
}

function QuizModeSettingsSection({
  value,
  disabled,
  onChange,
}: {
  value: QuizModeSettings;
  disabled: boolean;
  onChange: (next: Partial<QuizModeSettings>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // winnerPointsの特定順位を更新
  const updateWinnerPoint = (index: number, points: number) => {
    const newPoints = [...(value.winnerPoints || [3, 2, 1])];
    while (newPoints.length <= index) {
      newPoints.push(newPoints[newPoints.length - 1] ?? 1);
    }
    newPoints[index] = points;
    onChange({ winnerPoints: newPoints });
  };

  const isRevealMode = value.quizFormat === 'reveal';
  const isSeparatePrompt = value.promptDisplayMode === 'separate';

  return (
    <div className="space-y-4">
      {/* クイズ形式 */}
      <div className="rounded-xl border border-violet-200/70 bg-violet-50/20 backdrop-blur-sm p-4 space-y-3">
        <p className="text-sm font-semibold text-violet-700">🎮 クイズ形式</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ quizFormat: 'realtime' })}
            className={`rounded-lg p-3 text-left transition ${
              !isRevealMode
                ? 'bg-violet-600 text-white'
                : 'bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/35'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="font-bold block">リアルタイム</span>
            <span className="text-xs opacity-80">描いてる途中で当てる</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ quizFormat: 'reveal' })}
            className={`rounded-lg p-3 text-left transition ${
              isRevealMode
                ? 'bg-violet-600 text-white'
                : 'bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/35'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="font-bold block">先描きモード</span>
            <span className="text-xs opacity-80">描いてから見せて当てる</span>
          </button>
        </div>
        {isRevealMode && (
          <div className="grid gap-3 sm:grid-cols-2 mt-2">
            <SettingField
              label="描画時間"
              value={value.revealDrawTimeSec ?? 15}
              min={5}
              max={60}
              onChange={(v) => onChange({ revealDrawTimeSec: Number(v) })}
              disabled={disabled}
              suffix="秒"
            />
            <SettingField
              label="回答時間"
              value={value.revealGuessTimeSec ?? 30}
              min={10}
              max={120}
              onChange={(v) => onChange({ revealGuessTimeSec: Number(v) })}
              disabled={disabled}
              suffix="秒"
            />
          </div>
        )}
      </div>

      {/* お題表示形式 */}
      <div className="rounded-xl border border-amber-200/70 bg-amber-50/20 backdrop-blur-sm p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-700">📝 お題表示</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ promptDisplayMode: 'immediate' })}
            className={`rounded-lg p-3 text-left transition ${
              !isSeparatePrompt
                ? 'bg-amber-600 text-white'
                : 'bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/35'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="font-bold block">即スタート</span>
            <span className="text-xs opacity-80">お題と同時に開始</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ promptDisplayMode: 'separate' })}
            className={`rounded-lg p-3 text-left transition ${
              isSeparatePrompt
                ? 'bg-amber-600 text-white'
                : 'bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/35'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="font-bold block">準備時間あり</span>
            <span className="text-xs opacity-80">お題確認→描画開始</span>
          </button>
        </div>
        {isSeparatePrompt && (
          <SettingField
            label="お題確認時間"
            value={value.promptViewTimeSec ?? 5}
            min={3}
            max={30}
            onChange={(v) => onChange({ promptViewTimeSec: Number(v) })}
            disabled={disabled}
            suffix="秒"
          />
        )}
      </div>

      {/* 基本設定 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {!isRevealMode && (
          <SettingField
            label="描画＋回答時間"
            value={value.drawingTimeSec}
            min={30}
            max={300}
            onChange={(v) => onChange({ drawingTimeSec: Number(v) })}
            disabled={disabled}
            suffix="秒"
          />
        )}
        <SettingField
          label="ラウンド数"
          value={value.totalRounds}
          min={0}
          max={20}
          onChange={(v) => onChange({ totalRounds: Number(v) })}
          disabled={disabled}
          suffix="回（0=人数分）"
        />
        <SettingField
          label="正解者数"
          value={value.maxWinners}
          min={1}
          max={10}
          onChange={(v) => onChange({ maxWinners: Number(v) })}
          disabled={disabled}
          suffix="人で次へ"
        />
      </div>

      {/* カテゴリ選択 */}
      <button
        type="button"
        onClick={() => setShowCategories(!showCategories)}
        className="flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
        disabled={disabled}
      >
        <span className={`transition-transform ${showCategories ? 'rotate-90' : ''}`}>▶</span>
        お題カテゴリ
      </button>

      {showCategories && (
        <div className="rounded-xl border border-cyan-200/70 bg-cyan-50/20 backdrop-blur-sm p-4 space-y-3">
          <p className="text-xs text-cyan-600">選択しない場合は全カテゴリから出題されます</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUIZ_CATEGORY_LABELS) as QuizPromptCategory[]).map((category) => {
              const isSelected = value.selectedCategories?.includes(category) ?? false;
              return (
                <button
                  key={category}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const current = value.selectedCategories ?? [];
                    const next = isSelected
                      ? current.filter((c) => c !== category)
                      : [...current, category];
                    onChange({ selectedCategories: next });
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-cyan-600 text-white'
                      : 'bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/35'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {QUIZ_CATEGORY_LABELS[category]}
                </button>
              );
            })}
          </div>
          {(value.selectedCategories?.length ?? 0) > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ selectedCategories: [] })}
              className="text-xs text-cyan-600 hover:text-cyan-800 underline"
            >
              選択をクリア
            </button>
          )}
        </div>
      )}

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
        disabled={disabled}
      >
        <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
        得点設定（詳細）
      </button>

      {showAdvanced && (
        <div className="space-y-4">
          {/* 正解時の得点 */}
              <div className="rounded-xl border border-green-200/70 bg-green-50/20 backdrop-blur-sm p-4 space-y-3">
            <p className="text-sm font-semibold text-green-700">✅ 正解時の得点</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: Math.max(value.maxWinners, 3) }).map((_, i) => (
                <SettingField
                  key={i}
                  label={`${i + 1}位`}
                  value={value.winnerPoints?.[i] ?? (i < (value.winnerPoints?.length ?? 0) ? value.winnerPoints[value.winnerPoints.length - 1] : 1)}
                  min={0}
                  max={5}
                  onChange={(v) => updateWinnerPoint(i, Number(v))}
                  disabled={disabled}
                  suffix="点"
                />
              ))}
            </div>
            <SettingField
              label="出題者ボーナス"
              value={value.drawerBonus}
              min={0}
              max={5}
              onChange={(v) => onChange({ drawerBonus: Number(v) })}
              disabled={disabled}
              suffix="点"
            />
          </div>

          {/* 不正解時の得点 */}
              <div className="rounded-xl border border-red-200/70 bg-red-50/20 backdrop-blur-sm p-4 space-y-3">
            <p className="text-sm font-semibold text-red-700">❌ 誰も正解しなかった時</p>
            <SettingField
              label="出題者ボーナス"
              value={value.noWinnerBonus}
              min={0}
              max={5}
              onChange={(v) => onChange({ noWinnerBonus: Number(v) })}
              disabled={disabled}
              suffix="点"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ModeSelectionPanel({ settings, isHost, onSelectMode, onUpdateSettings }: ModeSelectionPanelProps) {
  const selectedMode = settings.gameMode;

  return (
    <div className="space-y-4">
      {/* GAME MODES セクション */}
      <div>
        <div className="mb-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">— GAME MODES —</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <ModeCard
            mode="normal"
            title="Standard"
            badge="スタンダード"
            selected={selectedMode === 'normal'}
            disabled={!isHost}
            onSelect={() => onSelectMode('normal')}
          />
          <ModeCard
            mode="animation"
            title="Animation"
            badge="アニメーション"
            selected={selectedMode === 'animation'}
            disabled={!isHost}
            onSelect={() => onSelectMode('animation')}
          />
          <ModeCard
            mode="shiritori"
            title="Chain"
            badge="しりとり"
            selected={selectedMode === 'shiritori'}
            disabled={!isHost}
            onSelect={() => onSelectMode('shiritori')}
          />
          <ModeCard
            mode="quiz"
            title="Quiz"
            badge="クイズ"
            selected={selectedMode === 'quiz'}
            disabled={!isHost}
            onSelect={() => onSelectMode('quiz')}
          />
        </div>
      </div>

      {/* SETTINGS セクション */}
      <div className="rounded-lg border border-stone-300/60 bg-white/8 backdrop-blur-md p-4">
        <div className="mb-3 text-center border-b border-stone-300/70 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">— SETTINGS —</p>
        </div>
        {!isHost && (
          <p className="text-xs text-stone-500 text-center mb-3">ホストのみ変更可能</p>
        )}

        {selectedMode === 'normal' && (
          <NormalModeSettings
            value={settings.normalSettings}
            disabled={!isHost}
            onChange={(next) =>
              onUpdateSettings({
                normalSettings: { ...settings.normalSettings, ...next },
              })
            }
          />
        )}

        {selectedMode === 'animation' && (
          <AnimationModeSettingsSection
            value={settings.animationSettings}
            disabled={!isHost}
            onChange={(next) =>
              onUpdateSettings({
                animationSettings: { ...settings.animationSettings, ...next },
              })
            }
          />
        )}

        {selectedMode === 'shiritori' && (
          <ShiritoriModeSettingsSection
            value={settings.shiritoriSettings}
            disabled={!isHost}
            onChange={(next) =>
              onUpdateSettings({
                shiritoriSettings: { ...settings.shiritoriSettings, ...next },
              })
            }
          />
        )}

        {selectedMode === 'quiz' && (
          <QuizModeSettingsSection
            value={settings.quizSettings}
            disabled={!isHost}
            onChange={(next) =>
              onUpdateSettings({
                quizSettings: { ...settings.quizSettings, ...next },
              })
            }
          />
        )}
      </div>
    </div>
  );
}
