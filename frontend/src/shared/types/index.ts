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
  drawingTimeSec: number;
  guessTimeSec: number;
  promptTimeSec: number;
}

export type GamePhase = 'prompt' | 'drawing' | 'guessing' | 'result';

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

// WebSocket event types
export type WSClientEvent =
  | { type: 'join_room'; payload: { roomId: string; playerName: string } }
  | { type: 'leave_room'; payload: { roomId: string } }
  | { type: 'toggle_ready'; payload: { roomId: string } }
  | { type: 'start_game'; payload: { roomId: string } }
  | { type: 'submit_prompt'; payload: { text: string } }
  | { type: 'submit_drawing'; payload: { imageData: string } }
  | { type: 'submit_guess'; payload: { text: string } }
  | { type: 'rejoin_room'; payload: { roomId: string; playerId: string } }
  | { type: 'result_navigate'; payload: { chainIndex: number; entryIndex: number } }
  | { type: 'return_to_lobby'; payload: Record<string, never> };

export type WSServerEvent =
  | { type: 'room_joined'; payload: { room: Room; playerId: string } }
  | { type: 'rejoined'; payload: { room: Room; playerId: string; playerName: string; gameState: { phase: GamePhase; timeRemaining: number; deadline?: string; currentTurn: number; totalTurns: number } | null; content: { type: 'text' | 'drawing'; payload: string } | null; hasSubmitted: boolean } }
  | { type: 'players_updated'; payload: { players: Player[] } }
  | { type: 'game_started'; payload: { roomId: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'phase_changed'; payload: { phase: GamePhase; timeRemaining: number; deadline?: string; currentTurn?: number; totalTurns?: number } }
  | { type: 'timer_sync'; payload: { timeRemaining: number } }
  | { type: 'submission_received'; payload: { playerId: string; submittedCount: number; totalCount: number } }
  | { type: 'phase_complete'; payload: { nextPhase: GamePhase } }
  | { type: 'receive_content'; payload: { type: 'text' | 'drawing'; payload: string } }
  | { type: 'game_result'; payload: { chains: Chain[]; players?: Player[] } }
  | { type: 'result_sync'; payload: { chainIndex: number; entryIndex: number } }
  | { type: 'returned_to_lobby'; payload: { room: Room } };
