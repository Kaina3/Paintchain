// ゲームモード
export type GameMode = 'normal' | 'animation' | 'shiritori' | 'quiz' | 'werewolf';

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
  | 'fantasy' | 'animeCharacters' | 'stories' | 'famousPeople' | 'history' | 'seasonsAndEvents';

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
  stories: '📖 物語',
  famousPeople: '👑 偉人・有名人',
  history: '🏺 歴史',
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

// 人狼モード種別
export type WerewolfType = 'wordwolf' | 'impostor';

// 人狼お題カテゴリ
export type WerewolfPromptCategory =
  | 'food' | 'animal' | 'vehicle' | 'sport' | 'place' | 'item' | 'nature' | 'person' | 'event' | 'entertainment';

export const WEREWOLF_CATEGORY_LABELS: Record<WerewolfPromptCategory, string> = {
  food: '🍔 食べ物',
  animal: '🐾 動物',
  vehicle: '🚗 乗り物',
  sport: '⚽ スポーツ',
  place: '🏠 場所',
  item: '🔧 日用品',
  nature: '🌿 自然',
  person: '👨‍⚕️ 人・職業',
  event: '🎉 イベント',
  entertainment: '🎸 エンタメ',
};

export interface WerewolfModeSettings {
  werewolfType: WerewolfType;
  assignTimeSec: number;
  drawingTimeSec: number;
  revealTimeSec: number;
  discussionTimeSec: number;
  votingTimeSec: number;
  drawingRounds: number;
  werewolfCount: number;
  autoWerewolfCount: boolean;
  scoring: {
    villagerCatchWolf: number;
    wolfSurvive: number;
    wolfGuessPrompt: number;
  };
  selectedCategories: WerewolfPromptCategory[];
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

// プレイヤーカラー → アバター画像のマッピング
export const PLAYER_AVATARS: Record<string, string> = {
  '#acbfd6': '/avatars/athenai.png',
  '#053827': '/avatars/botticheri.png',
  '#561269': '/avatars/dali.png',
  '#ba9356': '/avatars/girl-with-pearl-earring.png',
  '#7a0000': '/avatars/golden-helmet.png',
  '#dbdcd8': '/avatars/milk.png',
  '#7b481e': '/avatars/monaliza.jpg',
  '#657863': '/avatars/mone.png',
  '#c74f18': '/avatars/screem.png',
  '#ffc2c2': '/avatars/ukiyoe.png',
  '#004e7a': '/avatars/vango.png',
  '#1f1a14': '/avatars/yakei.png',
};

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

// Werewolf (人狼モード)
export interface WerewolfPromptInfo {
  category: string;
  prompt: string | null;
  isHidden: boolean;  // インポスターモードでお題が隠されているか
}

export interface WerewolfDrawingEntry {
  round: number;
  imageData: string;
}

export interface WerewolfChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

export interface WerewolfVoteResult {
  playerId: string;
  voteCount: number;
}

export interface WerewolfState {
  currentRound: number;
  totalRounds: number;
  werewolfType: WerewolfType;
  category: string;
  // 発表中の情報
  revealingPlayerId: string | null;
  revealingDrawing: string | null;
  // 投票進捗
  voteCount: number;
  totalPlayers: number;
}

export interface WerewolfResult {
  werewolves: string[];
  villagerPrompt: string;
  werewolfPrompt: string | null;
  votes: { voterId: string; targetId: string }[];
  voteResults: WerewolfVoteResult[];
  caught: boolean;              // 人狼が当てられたか
  wolfGuessedPrompt: boolean;   // 人狼がお題を当てたか（インポスター）
  scores: Record<string, number>;
  drawings: { playerId: string; entries: WerewolfDrawingEntry[] }[];
  players: { id: string; name: string; color: string }[];
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
  | { type: 'force_return_to_lobby'; payload: Record<string, never> }
  | { type: 'update_settings'; payload: { settings: Partial<Settings> } }
  | { type: 'select_mode'; payload: { mode: GameMode } }
  | { type: 'reorder_players'; payload: { playerIds: string[] } }
  | { type: 'change_color'; payload: { color: string } }
  | { type: 'lobby_chat'; payload: { text: string } }
  | { type: 'werewolf_vote'; payload: { targetId: string } }
  | { type: 'werewolf_chat'; payload: { message: string } }
  | { type: 'werewolf_guess_prompt'; payload: { guess: string } }
  | { type: 'werewolf_end_discussion'; payload: Record<string, never> };

export type WSServerEvent =
  | { type: 'room_joined'; payload: { room: Room; playerId: string } }
  | { type: 'rejoined'; payload: { room: Room; playerId: string; playerName: string; gameState: { phase: GamePhase; timeRemaining: number; deadline?: string; currentTurn: number; totalTurns: number } | null; content: ContentPayload | null; hasSubmitted: boolean } }
  | { type: 'players_updated'; payload: { players: Player[]; hostId: string } }
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
  | { type: 'force_returned_to_lobby'; payload: { room: Room } }
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
  | { type: 'lobby_chat'; payload: LobbyChatItem }
  | { type: 'werewolf_role_assigned'; payload: WerewolfPromptInfo }
  | { type: 'werewolf_state'; payload: WerewolfState }
  | { type: 'werewolf_drawing_update'; payload: { playerId: string; round: number; imageData: string } }
  | { type: 'werewolf_all_drawings'; payload: { drawings: { playerId: string; entries: { round: number; imageData: string }[] }[] } }
  | { type: 'werewolf_reveal_player'; payload: { playerId: string; drawing: string } }
  | { type: 'werewolf_chat_message'; payload: WerewolfChatMessage }
  | { type: 'werewolf_vote_update'; payload: { voterId: string; voteCount: number; totalPlayers: number } }
  | { type: 'werewolf_result'; payload: WerewolfResult };
