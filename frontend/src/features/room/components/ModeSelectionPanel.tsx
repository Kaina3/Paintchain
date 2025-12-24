import { useState, useEffect } from 'react';
import type {
  AnimationModeSettings,
  GameMode,
  NormalModeSettings,
  Settings,
  ShiritoriModeSettings,
  QuizModeSettings,
} from '@/shared/types';

interface ModeSelectionPanelProps {
  settings: Settings;
  isHost: boolean;
  onSelectMode: (mode: GameMode) => void;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

interface ModeCardProps {
  mode: GameMode;
  title: string;
  description: string;
  badge: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function ModeCard({ mode, title, description, badge, selected, disabled, onSelect }: ModeCardProps) {
  const iconMap: Record<GameMode, string> = {
    normal: '🎯',
    animation: '🎞️',
    shiritori: '🔗',
    quiz: '❓',
  };
  const colorMap: Record<GameMode, string> = {
    normal: 'bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700',
    animation: 'bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700',
    shiritori: 'bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-700',
    quiz: 'bg-gradient-to-br from-violet-100 to-purple-200 text-violet-700',
  };
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`group relative flex h-full flex-col justify-between rounded-2xl border-2 p-4 text-left shadow-sm transition-all duration-200 overflow-visible
        ${selected ? 'border-primary-500 bg-primary-50 shadow-lg' : 'border-gray-200 bg-white hover:-translate-y-1 hover:shadow-md'}
        ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
    >
      {selected && (
        <span className="absolute -top-2 -right-2 z-10 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          選択中
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${colorMap[mode]}`}>
          {iconMap[mode]}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500">{badge}</p>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-600 leading-relaxed">{description}</p>
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
  const baseClasses = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-inner focus:border-primary-400 focus:ring-2 focus:ring-primary-100';
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
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-violet-700">🎮 クイズ形式</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ quizFormat: 'realtime' })}
            className={`rounded-lg p-3 text-left transition ${
              !isRevealMode
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-700 hover:bg-violet-100'
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
                : 'bg-white text-gray-700 hover:bg-violet-100'
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
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-700">📝 お題表示</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ promptDisplayMode: 'immediate' })}
            className={`rounded-lg p-3 text-left transition ${
              !isSeparatePrompt
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-700 hover:bg-amber-100'
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
                : 'bg-white text-gray-700 hover:bg-amber-100'
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
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-3">
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
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
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
    <div className="glass h-full rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Game mode</p>
          <h2 className="text-2xl font-black text-gray-900">モード選択と設定</h2>
          <p className="mt-1 text-sm text-gray-600">ホストのみが変更できます。選択内容は全員に同期されます。</p>
        </div>
        {!isHost && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">閲覧のみ</span>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ModeCard
          mode="normal"
          title="ノーマル"
          description="お題→絵→回答を繰り返す標準ルール。結果はシネマティックに共有。"
          badge="Standard"
          selected={selectedMode === 'normal'}
          disabled={!isHost}
          onSelect={() => onSelectMode('normal')}
        />
        <ModeCard
          mode="animation"
          title="アニメーション"
          description="前のコマを引き継ぎながら1枚ずつ描き進めるリレーアニメ。"
          badge="Sequence"
          selected={selectedMode === 'animation'}
          disabled={!isHost}
          onSelect={() => onSelectMode('animation')}
        />
        <ModeCard
          mode="shiritori"
          title="絵しりとり"
          description="描いた絵でしりとり。つながるほど面白いカオスが生まれます。"
          badge="Chain"
          selected={selectedMode === 'shiritori'}
          disabled={!isHost}
          onSelect={() => onSelectMode('shiritori')}
        />
        <ModeCard
          mode="quiz"
          title="クイズ"
          description="1人が描いて他の人が当てる！リアルタイム早押しクイズ。"
          badge="Live"
          selected={selectedMode === 'quiz'}
          disabled={!isHost}
          onSelect={() => onSelectMode('quiz')}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Settings</p>
            <h3 className="text-lg font-bold text-gray-900">
              {selectedMode === 'normal' ? 'ノーマル設定' : 
               selectedMode === 'animation' ? 'アニメーション設定' : 
               selectedMode === 'shiritori' ? 'しりとり設定' : 'クイズ設定'}
            </h3>
          </div>
          {!isHost && <span className="text-xs font-semibold text-gray-500">ホストが変更します</span>}
        </div>

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
