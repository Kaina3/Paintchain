export type GameMode = 'normal' | 'animation' | 'shiritori';

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

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface Settings {
  maxPlayers: number;
  gameMode: GameMode;
  normalSettings: NormalModeSettings;
  animationSettings: AnimationModeSettings;
  shiritoriSettings: ShiritoriModeSettings;
}

export type GamePhase = 'prompt' | 'first-frame' | 'drawing' | 'guessing' | 'result';

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
      frameCount: 0, // 0 = 人数分
    },
    shiritoriSettings: {
      drawingTimeSec: 60,
      totalDrawings: 12,
    },
  };
}
