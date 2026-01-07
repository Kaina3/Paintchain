// ゲームモード
export type GameMode = 'normal' | 'animation' | 'shiritori' | 'quiz';

// 描画ツールタイプ
export type DrawingToolType = 'brush' | 'eraser' | 'bucket' | 'stamp' | 'line';

// 描画ストローク（タイムラプス用）
export interface DrawingStroke {
  tool: DrawingToolType;
  color: string;
  brushSize: number;
  opacity: number;
  timestamp: number; // 描画開始からの経過ミリ秒
  // ブラシ/消しゴム/ライン用の点群
  points?: { x: number; y: number }[];
  // バケツ用
  fillPoint?: { x: number; y: number };
  // スタンプ用
  stampShape?: string;
  stampBounds?: { x: number; y: number; width: number; height: number };
  fillStamp?: boolean;
}

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
  | 'fantasy' | 'animeCharacters' | 'seasonsAndEvents';

export const QUIZ_CATEGORY_LABELS: Record<QuizPromptCategory, string> = {
  animals: '🐾 動物',
  foods: '🍔 食べ物',
  nature: '🌿 自然',
  vehicles: '🚗 乗り物',
  buildings: '🏠 建物・場所',
  items: '🔧 道具・日用品',
  sportsAndEntertainment: '⚽ スポーツ・娯楽',
  occupations: '👨‍⚕️ 職業',
  bodyParts: '👋 体の部位',
  fantasy: '🐉 キャラクター',
  animeCharacters: '📺 アニメキャラ',
  seasonsAndEvents: '🎉 季節・イベント',
};

export interface QuizModeSettings {
  drawingTimeSec: number;
  maxWinners: number;
  revealTimeSec: number;
  totalRounds: number; // 0 = 人数分
  quizFormat: 'realtime' | 'reveal';
  revealDrawTimeSec: number;
  revealGuessTimeSec: number;
  promptDisplayMode: 'immediate' | 'separate';
  promptViewTimeSec: number;
  winnerPoints: number[];
  drawerBonus: number;
  noWinnerBonus: number;
  selectedCategories: QuizPromptCategory[]; // 選択されたカテゴリ（空の場合は全カテゴリ）
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

export type ContentPayload =
  | { type: 'text'; payload: string }
  | { type: 'drawing'; payload: string }
  | { type: 'frames'; payload: string[] }
  | { type: 'frames_with_bg'; payload: string[]; background: string };

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
  submittedAt: string;
}

// Shiritori
export interface ShiritoriDrawingPublic {
  order: number;
  authorId: string;
  imageData: string;
  letterCount: number;
  submittedAt: string;
  hasAnswer?: boolean;
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

// Quiz
export interface QuizFeedItem {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string; // プレイヤーカラー（弾幕表示用）
  text: string;
  kind: 'guess' | 'correct' | 'system';
  createdAt: number;
  rank?: number;
}

export interface QuizState {
  round: number;
  drawerId: string;
  scores: Record<string, number>;
  maxWinners: number;
  winners: { playerId: string; rank: number }[];
  recentFeed: QuizFeedItem[];
  currentDrawing: string | null;
  prompt?: string;
  promptHint?: string; // お題のヒント（説明）
  canvasLocked: boolean;
  quizFormat: 'realtime' | 'reveal';
  promptDisplayMode: 'immediate' | 'separate';
}

export interface QuizResult {
  scores: Record<string, number>;
  players: { id: string; name: string }[];
}

// Lobby Chat
export interface LobbyChatItem {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  createdAt: number;
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
  | { type: 'submit_drawing'; payload: { imageData: string; strokes?: DrawingStroke[] } }
  | { type: 'submit_guess'; payload: { text: string } }
  | { type: 'submit_shiritori'; payload: { imageData?: string | null; answer?: string | null } }
  | { type: 'shiritori_canvas_sync'; payload: { imageData: string } }
  | { type: 'quiz_canvas_sync'; payload: { imageData: string } }
  | { type: 'submit_quiz_guess'; payload: { text: string } }
  | { type: 'rejoin_room'; payload: { roomId: string; playerId: string } }
  | { type: 'result_navigate'; payload: { chainIndex: number; entryIndex: number; displayOrder?: 'first-to-last' | 'last-to-first' } }
  | { type: 'animation_unlock'; payload: { chainIndex: number } }
  | { type: 'return_to_lobby'; payload: Record<string, never> }
  | { type: 'update_settings'; payload: { settings: Partial<Settings> } }
  | { type: 'select_mode'; payload: { mode: GameMode } }
  | { type: 'reorder_players'; payload: { playerIds: string[] } }
  | { type: 'change_color'; payload: { color: string } }
  | { type: 'lobby_chat'; payload: { text: string } };

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
  | { type: 'shiritori_answer_submitted'; payload: { playerId: string; drawing: ShiritoriDrawingPublic } }
  | { type: 'shiritori_result'; payload: ShiritoriResult }
  | { type: 'shiritori_canvas_update'; payload: { drawerId: string; imageData: string } }
  | { type: 'quiz_canvas_update'; payload: { drawerId: string; imageData: string } }
  | { type: 'quiz_state'; payload: QuizState }
  | { type: 'quiz_feed'; payload: { item: QuizFeedItem } }
  | { type: 'quiz_round_ended'; payload: { prompt: string; winners: { playerId: string; rank: number }[]; scores: Record<string, number> } }
  | { type: 'quiz_result'; payload: QuizResult }
  | { type: 'lobby_chat'; payload: LobbyChatItem };
