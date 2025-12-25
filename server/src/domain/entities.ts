export type GameMode = 'normal' | 'animation' | 'shiritori' | 'quiz';

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

// プレイヤーカラーパレット（12色、重複禁止）
export const PLAYER_COLORS = [
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00AA00', // Green
  '#FFCC00', // Yellow
  '#FF6600', // Orange
  '#9900FF', // Purple
  '#FF69B4', // Pink
  '#00BFFF', // Light Blue
  '#7CFC00', // Yellow Green
  '#8B4513', // Brown
  '#000000', // Black
  '#808080', // Gray
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
}

export type GamePhase = 'prompt' | 'first-frame' | 'drawing' | 'guessing' | 'result' | 'quiz_prompt' | 'quiz_drawing' | 'quiz_guessing' | 'quiz_reveal';

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
    },
  };
}
