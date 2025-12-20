import type { Chain, DrawingStroke, GamePhase, Room, Settings } from './entities.js';

export interface SubmissionData {
  type: 'text' | 'drawing';
  payload: string;
  strokes?: DrawingStroke[]; // タイムラプス用ストローク履歴
  // Shiritori mode uses these optional fields
  answer?: string;
  imageData?: string;
}

export type ContentPayload =
  | { type: 'text'; payload: string }
  | { type: 'drawing'; payload: string }
  | { type: 'frames'; payload: string[] };

export interface GameResult {
  chains: Chain[];
  players: Room['players'];
}

export interface GameModeHandler {
  getPhases(): GamePhase[];
  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number): GamePhase | 'result';
  getTimeLimit(phase: GamePhase, settings: Settings): number;
  initializeGame(room: Room): void;
  distributeContent(room: Room, chains: Chain[]): Map<string, ContentPayload>;
  handleSubmission(room: Room, playerId: string, data: SubmissionData, chains: Chain[]): boolean;
  generateResult(room: Room, chains: Chain[]): unknown;

  // Optional hooks for modes with different submission rules
  getExpectedSubmitters?(room: Room): string[];
  getRequiredSubmissions?(room: Room, phase: GamePhase): number;
}
