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
  submittedAt: Date;
}

export function createDefaultSettings(): Settings {
  return {
    maxPlayers: 12,
    drawingTimeSec: 90,
    guessTimeSec: 50,
    promptTimeSec: 50,
  };
}
