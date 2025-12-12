import type {
  AnimationModeSettings,
  GameMode,
  NormalModeSettings,
  Settings,
  ShiritoriModeSettings,
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
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`group relative flex h-full flex-col justify-between rounded-2xl border-2 p-4 text-left shadow-sm transition-all duration-200
        ${selected ? 'border-primary-500 bg-primary-50 shadow-lg' : 'border-gray-200 bg-white hover:-translate-y-1 hover:shadow-md'}
        ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
              mode === 'normal'
                ? 'bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700'
                : mode === 'animation'
                  ? 'bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700'
                  : 'bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-700'
            }`}
          >
            {mode === 'normal' ? '🎯' : mode === 'animation' ? '🎞️' : '🔗'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">{badge}</p>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
        </div>
        {selected && <span className="rounded-full bg-primary-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">選択中</span>}
      </div>
      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{description}</p>
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

  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={baseClasses}
          disabled={disabled}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
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
        onChange={(v) => onChange({ promptTimeSec: Number(v) || value.promptTimeSec })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="描画時間"
        value={value.drawingTimeSec}
        min={30}
        max={300}
        onChange={(v) => onChange({ drawingTimeSec: Number(v) || value.drawingTimeSec })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="回答時間"
        value={value.guessTimeSec}
        min={20}
        max={180}
        onChange={(v) => onChange({ guessTimeSec: Number(v) || value.guessTimeSec })}
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
        onChange={(v) => onChange({ drawingTimeSec: Number(v) || value.drawingTimeSec })}
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
        suffix="枚（0=人数分）"
      />
      {value.firstFrameMode === 'prompt' && (
        <SettingField
          label="お題時間"
          value={value.promptTimeSec ?? 20}
          min={5}
          max={120}
          onChange={(v) => onChange({ promptTimeSec: Number(v) || value.promptTimeSec || 20 })}
          disabled={disabled}
          suffix="秒"
        />
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
        onChange={(v) => onChange({ drawingTimeSec: Number(v) || value.drawingTimeSec })}
        disabled={disabled}
        suffix="秒"
      />
      <SettingField
        label="総ラウンド数"
        value={value.totalDrawings}
        min={4}
        max={40}
        onChange={(v) => onChange({ totalDrawings: Number(v) || value.totalDrawings })}
        disabled={disabled}
        suffix="枚"
      />
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

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Settings</p>
            <h3 className="text-lg font-bold text-gray-900">{selectedMode === 'normal' ? 'ノーマル設定' : selectedMode === 'animation' ? 'アニメーション設定' : 'しりとり設定'}</h3>
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
      </div>
    </div>
  );
}
