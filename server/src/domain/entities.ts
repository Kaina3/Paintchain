export type GameMode = 'normal' | 'animation' | 'shiritori' | 'quiz' | 'werewolf';

// 描画ツールタイプ
export type DrawingToolType = 'brush' | 'eraser' | 'bucket' | 'stamp' | 'line';

// 描画ストローク（タイムラプス用）
export interface DrawingStroke {
  tool: DrawingToolType;
  color: string;
  brushSize: number;
  opacity: number;
  timestamp: number;
  points?: { x: number; y: number }[];
  fillPoint?: { x: number; y: number };
  stampShape?: string;
  stampBounds?: { x: number; y: number; width: number; height: number };
  fillStamp?: boolean;
}

export interface NormalModeSettings {
  promptTimeSec: number;
  drawingTimeSec: number;
  guessTimeSec: number;
  resultOrder: 'first' | 'last';
}

export interface AnimationModeSettings {
  drawingTimeSec: number;
  viewMode: 'previous' | 'sequence';
  firstFrameMode: 'free' | 'prompt' | 'background';
  promptTimeSec?: number;
  frameCount: number; // フレーム数（デフォルトは人数分、最小2）
}

export interface ShiritoriModeSettings {
  drawingTimeSec: number;
  totalDrawings: number;
}

// クイズお題カテゴリ
export type QuizPromptCategory = 
  | 'animals' | 'foods' | 'nature' | 'vehicles' | 'buildings'
  | 'items' | 'sportsAndEntertainment' | 'occupations' | 'bodyParts'
  | 'fantasy' | 'animeCharacters' | 'stories' | 'famousPeople' | 'history' | 'seasonsAndEvents';

export interface QuizModeSettings {
  drawingTimeSec: number;
  maxWinners: number;
  revealTimeSec: number;
  totalRounds: number; // 0 = 人数分
  // クイズ形式: realtime=リアルタイム, reveal=先描きモード
  quizFormat: 'realtime' | 'reveal';
  revealDrawTimeSec: number; // revealモード時の描画時間（デフォルト15秒）
  revealGuessTimeSec: number; // revealモード時の回答時間（デフォルト30秒）
  // お題表示形式: immediate=即表示, separate=準備時間あり
  promptDisplayMode: 'immediate' | 'separate';
  promptViewTimeSec: number; // お題準備時間（デフォルト5秒）
  // スコア設定
  winnerPoints: number[];   // [1位, 2位, 3位, ...] 足りない順位は最後の値を使用
  drawerBonus: number;      // 親の得点（誰か正解時）
  noWinnerBonus: number;    // 誰も正解しなかった時の親以外への得点
  // カテゴリ選択（空の場合は全カテゴリ）
  selectedCategories: QuizPromptCategory[];
}

// 人狼モード種別
export type WerewolfType = 'wordwolf' | 'impostor';

// 人狼お題カテゴリ
export type WerewolfPromptCategory =
  | 'food' | 'animal' | 'vehicle' | 'sport' | 'place' | 'item' | 'nature' | 'person' | 'event' | 'entertainment';

export interface WerewolfModeSettings {
  // モードタイプ
  werewolfType: WerewolfType;
  // 時間設定
  assignTimeSec: number;        // お題確認時間（デフォルト: 5秒）
  drawingTimeSec: number;       // 描画時間（デフォルト: 60秒）
  revealTimeSec: number;        // 1人あたりの発表時間（デフォルト: 5秒）
  discussionTimeSec: number;    // 議論時間（デフォルト: 90秒）
  votingTimeSec: number;        // 投票時間（デフォルト: 30秒）
  // ゲーム設定
  drawingRounds: number;        // 描画ラウンド数（デフォルト: 2）
  werewolfCount: number;        // 人狼の人数（デフォルト: 1）
  autoWerewolfCount: boolean;   // プレイ人数に応じて自動決定
  // スコア設定
  scoring: {
    villagerCatchWolf: number;  // 村人が人狼を当てた（デフォルト: 2）
    wolfSurvive: number;        // 人狼がバレなかった（デフォルト: 3）
    wolfGuessPrompt: number;    // 人狼がお題を当てた（インポスター、デフォルト: 1）
  };
  // お題設定
  selectedCategories: WerewolfPromptCategory[];
}

export interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  players: Player[];
  settings: Settings;
  createdAt: Date;
  currentPhase?: GamePhase;
  currentTurn?: number;
  totalTurns?: number;
  phaseDeadline?: Date;
}

// プレイヤーカラーパレット（12色、重複禁止）- 各アバター画像のテーマカラーに対応
export const PLAYER_COLORS = [
  '#acbfd6', // アテナイ (athenai)
  '#053827', // ボッティチェリ (botticheri)
  '#561269', // ダリ (dali)
  '#ba9356', // 真珠の耳飾りの少女 (girl-with-pearl-earring)
  '#7a0000', // 黄金の兜 (golden-helmet)
  '#dbdcd8', // 牛乳を注ぐ女 (milk)
  '#7b481e', // モナリザ (monaliza)
  '#657863', // モネ (mone)
  '#c74f18', // 叫び (screem)
  '#ffc2c2', // 浮世絵 (ukiyoe)
  '#004e7a', // ゴッホ (vango)
  '#1f1a14', // 夜景 (yakei)
];

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  color: string; // プレイヤーカラー（hex）
}

export interface Settings {
  maxPlayers: number;
  gameMode: GameMode;
  normalSettings: NormalModeSettings;
  animationSettings: AnimationModeSettings;
  shiritoriSettings: ShiritoriModeSettings;
  quizSettings: QuizModeSettings;
  werewolfSettings: WerewolfModeSettings;
}

export type GamePhase = 
  | 'prompt' | 'first-frame' | 'drawing' | 'guessing' | 'result'
  | 'quiz_prompt' | 'quiz_drawing' | 'quiz_guessing' | 'quiz_reveal'
  | 'werewolf_assign' | 'werewolf_drawing' | 'werewolf_reveal' | 'werewolf_discussion' | 'werewolf_voting' | 'werewolf_result';

export interface Chain {
  id: string;
  roomId: string;
  ownerPlayerId: string;
  entries: Entry[];
}

export interface Entry {
  order: number;
  type: 'text' | 'drawing';
  authorId: string;
  payload: string;
  strokes?: DrawingStroke[]; // タイムラプス用ストローク履歴
  submittedAt: Date;
}

export function createDefaultSettings(): Settings {
  return {
    maxPlayers: 12,
    gameMode: 'normal',
    normalSettings: {
      promptTimeSec: 20,
      drawingTimeSec: 90,
      guessTimeSec: 50,
      resultOrder: 'first',
    },
    animationSettings: {
      drawingTimeSec: 90,
      viewMode: 'sequence',
      firstFrameMode: 'free',
      promptTimeSec: 20,
      frameCount: 0,
    },
    shiritoriSettings: {
      drawingTimeSec: 60,
      totalDrawings: 12,
    },
    quizSettings: {
      drawingTimeSec: 120,
      maxWinners: 3,
      revealTimeSec: 3,
      totalRounds: 0,
      quizFormat: 'realtime',
      revealDrawTimeSec: 15,
      revealGuessTimeSec: 30,
      promptDisplayMode: 'immediate',
      promptViewTimeSec: 5,
      winnerPoints: [3, 2, 1],
      drawerBonus: 2,
      noWinnerBonus: 1,
      selectedCategories: [], // 空=全カテゴリ
    },
    werewolfSettings: {
      werewolfType: 'wordwolf',
      assignTimeSec: 5,
      drawingTimeSec: 60,
      revealTimeSec: 5,
      discussionTimeSec: 90,
      votingTimeSec: 30,
      drawingRounds: 2,
      werewolfCount: 1,
      autoWerewolfCount: true,
      scoring: {
        villagerCatchWolf: 2,
        wolfSurvive: 3,
        wolfGuessPrompt: 1,
      },
      selectedCategories: [],
    },
  };
}
