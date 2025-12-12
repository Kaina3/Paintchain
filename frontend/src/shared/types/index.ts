// ゲームモード
export type GameMode = 'normal' | 'animation' | 'shiritori';

// モード別設定
export interface NormalModeSettings {
  promptTimeSec: number;
  drawingTimeSec: number;
  guessTimeSec: number;
  resultOrder: 'first' | 'last';
}

export interface AnimationModeSettings {
  drawingTimeSec: number;
  viewMode: 'previous' | 'sequence';
  firstFrameMode: 'free' | 'prompt';
  promptTimeSec?: number;
  frameCount: number; // フレーム数（デフォルトは人数分、最小2）
}

export interface ShiritoriModeSettings {
  drawingTimeSec: number;
  totalDrawings: number;
}

// Room types
export interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  players: Player[];
  settings: Settings;
  createdAt: string;
  currentPhase?: GamePhase;
  currentTurn?: number;
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

export type ContentPayload =
  | { type: 'text'; payload: string }
  | { type: 'drawing'; payload: string }
  | { type: 'frames'; payload: string[] };

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
  submittedAt: string;
}

// Shiritori
export interface ShiritoriDrawingPublic {
  order: number;
  authorId: string;
  imageData: string;
  letterCount: number;
  submittedAt: string;
}

export interface ShiritoriDrawingResult extends ShiritoriDrawingPublic {
  answer: string;
  previousAnswer?: string;
  isConnected: boolean;
  connectionDetail?: string;
}

export interface ShiritoriResult {
  drawings: ShiritoriDrawingResult[];
  totalCorrect: number;
  totalDrawings: number;
}

// WebSocket event types
export type WSClientEvent =
  | { type: 'join_room'; payload: { roomId: string; playerName: string } }
  | { type: 'leave_room'; payload: { roomId: string } }
  | { type: 'toggle_ready'; payload: { roomId: string } }
  | { type: 'start_game'; payload: { roomId: string } }
  | { type: 'mark_ready'; payload: Record<string, never> }
  | { type: 'unmark_ready'; payload: Record<string, never> }
  | { type: 'submit_prompt'; payload: { text: string } }
  | { type: 'submit_drawing'; payload: { imageData: string } }
  | { type: 'submit_guess'; payload: { text: string } }
  | { type: 'submit_shiritori'; payload: { imageData: string; answer: string } }
  | { type: 'shiritori_canvas_sync'; payload: { imageData: string } }
  | { type: 'rejoin_room'; payload: { roomId: string; playerId: string } }
  | { type: 'result_navigate'; payload: { chainIndex: number; entryIndex: number; displayOrder?: 'first-to-last' | 'last-to-first' } }
  | { type: 'animation_unlock'; payload: { chainIndex: number } }
  | { type: 'return_to_lobby'; payload: Record<string, never> }
  | { type: 'update_settings'; payload: { settings: Partial<Settings> } }
  | { type: 'select_mode'; payload: { mode: GameMode } };

export type WSServerEvent =
  | { type: 'room_joined'; payload: { room: Room; playerId: string } }
  | { type: 'rejoined'; payload: { room: Room; playerId: string; playerName: string; gameState: { phase: GamePhase; timeRemaining: number; deadline?: string; currentTurn: number; totalTurns: number } | null; content: ContentPayload | null; hasSubmitted: boolean } }
  | { type: 'players_updated'; payload: { players: Player[] } }
  | { type: 'game_started'; payload: { roomId: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'phase_changed'; payload: { phase: GamePhase; timeRemaining: number; deadline?: string; currentTurn?: number; totalTurns?: number } }
  | { type: 'timer_sync'; payload: { timeRemaining: number } }
  | { type: 'submission_received'; payload: { playerId: string; submittedCount: number; totalCount: number } }
  | { type: 'phase_complete'; payload: { nextPhase: GamePhase } }
  | { type: 'receive_content'; payload: ContentPayload }
  | { type: 'game_result'; payload: { chains: Chain[]; players?: Player[] } }
  | { type: 'result_sync'; payload: { chainIndex: number; entryIndex: number; displayOrder?: 'first-to-last' | 'last-to-first' } }
  | { type: 'animation_unlocked'; payload: { chainIndex: number } }
  | { type: 'returned_to_lobby'; payload: { room: Room } }
  | { type: 'settings_updated'; payload: { settings: Settings } }
  | { type: 'mode_changed'; payload: { mode: GameMode } }
  | { type: 'shiritori_turn'; payload: { drawerId: string | null; previousLetterHint: string | null; order: number; total: number; gallery: ShiritoriDrawingPublic[] } }
  | { type: 'shiritori_your_turn'; payload: { previousLetterHint: string | null } }
  | { type: 'shiritori_drawing_added'; payload: { drawing: ShiritoriDrawingPublic; nextDrawerId: string | null } }
  | { type: 'shiritori_result'; payload: ShiritoriResult }
  | { type: 'shiritori_canvas_update'; payload: { drawerId: string; imageData: string } };
