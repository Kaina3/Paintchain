import type { Chain, DrawingStroke, GamePhase, Room } from '../domain/entities.js';
import type { ContentPayload, GameModeHandler, SubmissionData } from '../domain/gameMode.js';
import { ShiritoriModeHandler, type ShiritoriDrawingPublic, type ShiritoriResult } from './gameModes/shiritoriMode.js';
import { QuizModeHandler, type QuizFeedItem } from './gameModes/quizMode.js';
import { generatePlayerId } from '../infra/services/idGenerator.js';
import { getGameModeHandler } from './gameModes/index.js';
import { getRoom } from './roomUseCases.js';

// In-memory store
const chains = new Map<string, Chain[]>(); // roomId -> chains
const roomTimers = new Map<string, NodeJS.Timeout>();
const roomSubmissions = new Map<string, Set<string>>(); // roomId -> Set of playerIds who submitted
const timerSyncIntervals = new Map<string, NodeJS.Timeout>(); // roomId -> interval for timer sync

export interface GameCallbacks {
  onPhaseChanged: (room: Room, phase: GamePhase, timeRemaining: number, deadline: Date) => void;
  onSubmissionReceived: (room: Room, playerId: string, submittedCount: number, totalCount: number) => void;
  onPhaseComplete: (room: Room, nextPhase: GamePhase | 'result') => void;
  onReceiveContent: (playerId: string, content: ContentPayload) => void;
  onTimerSync: (room: Room, remaining: number) => void;
  onGameResult: (room: Room, chains: Chain[]) => void;
  onShiritoriTurn?: (
    room: Room,
    payload: { drawerId: string | null; previousLetterHint: string | null; order: number; total: number; gallery: ShiritoriDrawingPublic[] }
  ) => void;
  onShiritoriDrawingAdded?: (room: Room, drawing: ShiritoriDrawingPublic, nextDrawerId: string | null) => void;
  onShiritoriAnswerSubmitted?: (room: Room, playerId: string, drawing: ShiritoriDrawingPublic) => void;
  onShiritoriResult?: (room: Room, result: ShiritoriResult) => void;
  onQuizState?: (room: Room, playerId: string, state: ReturnType<QuizModeHandler['getQuizStateForClient']>) => void;
  onQuizFeed?: (room: Room, item: QuizFeedItem) => void;
  onQuizRoundEnded?: (room: Room, data: { prompt: string; winners: { playerId: string; rank: number }[]; scores: Record<string, number> }) => void;
  onQuizResult?: (room: Room, result: { scores: Record<string, number>; players: { id: string; name: string }[] }) => void;
}

let callbacks: GameCallbacks | null = null;

export function setGameCallbacks(cb: GameCallbacks) {
  callbacks = cb;
}

function getExpectedSubmitters(room: Room, handler: GameModeHandler): string[] {
  return handler.getExpectedSubmitters?.(room) ?? room.players.map((p) => p.id);
}

function getRequiredSubmissions(room: Room, handler: GameModeHandler, phase: GamePhase): number {
  return handler.getRequiredSubmissions?.(room, phase) ?? getExpectedSubmitters(room, handler).length;
}

function emitShiritoriTurn(room: Room, handler: GameModeHandler) {
  if (!(handler instanceof ShiritoriModeHandler)) return;
  const drawer = handler.getCurrentDrawer(room);
  const previousLetterHint = handler.getPreviousLetterHint(room.id);
  callbacks?.onShiritoriTurn?.(room, {
    drawerId: drawer?.id ?? null,
    previousLetterHint,
    order: (room.currentTurn ?? 0) + 1,
    total: room.totalTurns ?? room.settings.shiritoriSettings.totalDrawings,
    gallery: handler.getPublicGallery(room.id),
  });
}

function emitQuizState(room: Room, handler: GameModeHandler) {
  if (!(handler instanceof QuizModeHandler)) return;
  room.players.forEach((player) => {
    const state = handler.getQuizStateForClient(room.id, player.id, room);
    if (state) {
      callbacks?.onQuizState?.(room, player.id, state);
    }
  });
}

export function initializeGame(roomId: string): { chains: Chain[]; initialPhase: GamePhase } | null {
  const room = getRoom(roomId);
  if (!room) return null;

  const handler = getGameModeHandler(room.settings.gameMode);

  // Create a chain for each player
  const roomChains: Chain[] = room.players.map((player) => ({
    id: generatePlayerId(),
    roomId,
    ownerPlayerId: player.id,
    entries: [],
  }));

  chains.set(roomId, roomChains);
  roomSubmissions.set(roomId, new Set());

  // Handler sets the initial phase on room.currentPhase
  handler.initializeGame(room);
  const initialPhase = room.currentPhase ?? 'prompt';

  return { chains: roomChains, initialPhase };
}

export function startPhase(roomId: string, phase: GamePhase): void {
  const room = getRoom(roomId);
  if (!room) return;

  const handler = getGameModeHandler(room.settings.gameMode);

  room.currentPhase = phase;
  roomSubmissions.set(roomId, new Set());

  const timeLimit = handler.getTimeLimit(phase, room.settings);
  const deadline = new Date(Date.now() + timeLimit * 1000);
  room.phaseDeadline = deadline;

  // quiz_reveal開始時は、phase_changedより先に答え/結果を確定して通知する
  if (phase === 'quiz_reveal' && handler instanceof QuizModeHandler) {
    const roundResult = handler.endRound(room);
    callbacks?.onQuizRoundEnded?.(room, roundResult);
  }

  // Notify phase change with deadline for timer sync
  callbacks?.onPhaseChanged(room, phase, timeLimit, deadline);

  // Distribute content to players for drawing/guessing phases
  if (phase === 'drawing' || phase === 'guessing' || phase === 'first-frame') {
    distributeContent(roomId);
    if (room.settings.gameMode === 'shiritori') {
      emitShiritoriTurn(room, handler);
    }
  }

  // Quiz mode: send state at phase start
  if (phase === 'quiz_prompt' || phase === 'quiz_drawing' || phase === 'quiz_guessing' || phase === 'quiz_reveal') {
    distributeContent(roomId);
    // quiz_guessingフェーズ開始時にキャンバスロックを解除（revealモード）
    if (phase === 'quiz_guessing' && handler instanceof QuizModeHandler) {
      handler.unlockCanvas(roomId);
    }
    emitQuizState(room, handler);
  }

  // Start timer sync interval (every 10 seconds)
  clearTimerSyncInterval(roomId);
  const syncInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 1000));
    if (remaining > 0) {
      callbacks?.onTimerSync(room, remaining);
    }
  }, 10000);
  timerSyncIntervals.set(roomId, syncInterval);

  // Start timeout timer with grace period for client submissions
  clearRoomTimer(roomId);
  const GRACE_PERIOD_MS = 2000; // 2 seconds grace period for client auto-submit
  const timer = setTimeout(() => {
    handlePhaseTimeout(roomId);
  }, timeLimit * 1000 + GRACE_PERIOD_MS);
  roomTimers.set(roomId, timer);
}

function distributeContent(roomId: string): void {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  if (!room || !roomChains) return;

  const handler = getGameModeHandler(room.settings.gameMode);
  const payloads = handler.distributeContent(room, roomChains);

  payloads.forEach((content, playerId) => {
    callbacks?.onReceiveContent(playerId, content);
  });
}

function handleSubmission(
  roomId: string,
  playerId: string,
  data: SubmissionData,
  expectedPhase: GamePhase
): boolean {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !roomChains || !submissions) return false;
  if (room.currentPhase !== expectedPhase) return false;

  const handler = getGameModeHandler(room.settings.gameMode);
  const expectedPlayers = getExpectedSubmitters(room, handler);
  if (expectedPlayers.length > 0 && !expectedPlayers.includes(playerId)) return false;

  const alreadySubmitted = submissions.has(playerId);
  const success = handler.handleSubmission(room, playerId, data, roomChains);
  if (!success) return false;

  if (handler instanceof ShiritoriModeHandler) {
    const latest = handler.popLastSubmission(roomId);
    if (latest) {
      callbacks?.onShiritoriDrawingAdded?.(room, latest.drawing, latest.nextDrawerId);
    }
  }

  if (!alreadySubmitted) {
    submissions.add(playerId);
    const required = getRequiredSubmissions(room, handler, expectedPhase);
    callbacks?.onSubmissionReceived(room, playerId, submissions.size, getExpectedSubmitters(room, handler).length);

    if (submissions.size >= required) {
      advancePhase(roomId);
    }
  }

  return true;
}

export function markPlayerReady(roomId: string, playerId: string): boolean {
  const room = getRoom(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !submissions) return false;
  if (submissions.has(playerId)) return false;

  submissions.add(playerId);
  callbacks?.onSubmissionReceived(room, playerId, submissions.size, room.players.length);

  if (submissions.size >= room.players.length) {
    advancePhase(roomId);
  }

  return true;
}

export function unmarkPlayerReady(roomId: string, playerId: string): boolean {
  const room = getRoom(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !submissions) return false;
  if (!submissions.has(playerId)) return false;

  submissions.delete(playerId);
  callbacks?.onSubmissionReceived(room, playerId, submissions.size, room.players.length);

  return true;
}

export function submitPrompt(roomId: string, playerId: string, text: string): boolean {
  return handleSubmission(roomId, playerId, { type: 'text', payload: text || '' }, 'prompt');
}

export function submitDrawing(roomId: string, playerId: string, imageUrl: string, strokes?: DrawingStroke[]): boolean {
  const room = getRoom(roomId);
  if (!room) return false;
  
  // アニメーションモードではfirst-frameフェーズでもdrawingを受け付ける
  const phase = room.currentPhase;
  if (phase === 'first-frame' || phase === 'drawing') {
    return handleSubmission(roomId, playerId, { type: 'drawing', payload: imageUrl, strokes }, phase);
  }
  
  // クイズモードでの描画
  if (phase === 'quiz_drawing' && room.settings.gameMode === 'quiz') {
    const handler = getGameModeHandler(room.settings.gameMode);
    if (!(handler instanceof QuizModeHandler)) return false;
    
    const roomChains = chains.get(roomId) ?? [];
    const success = handler.handleSubmission(room, playerId, { type: 'drawing', payload: imageUrl, strokes }, roomChains);
    if (!success) return false;

    // 描画更新を全員に通知（revealモードではロック中のため親以外には見えない）
    emitQuizState(room, handler);

    // 提出済みとして記録して、タイムアウト時の自動提出で上書きされるのを防ぐ
    const submissions = roomSubmissions.get(roomId);
    if (submissions && !submissions.has(playerId)) {
      submissions.add(playerId);
      callbacks?.onSubmissionReceived(room, playerId, submissions.size, getExpectedSubmitters(room, handler).length);

      // 先描き(reveal)は提出したら即回答フェーズへ
      if (room.settings.quizSettings.quizFormat === 'reveal') {
        const required = getRequiredSubmissions(room, handler, 'quiz_drawing');
        if (submissions.size >= required) {
          advancePhase(roomId);
        }
      }
    }

    return true;
  }
  
  return false;
}

export function submitShiritori(
  roomId: string,
  playerId: string,
  imageData: string | null,
  answer: string | null
): { success: boolean; error?: string; isLastDrawing?: boolean; shouldEndGame?: boolean } {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.settings.gameMode !== 'shiritori') return { success: false, error: 'Not in shiritori mode' };

  const handler = getGameModeHandler(room.settings.gameMode);
  if (!(handler instanceof ShiritoriModeHandler)) {
    return { success: false, error: 'Invalid handler' };
  }

  // 絵のみの提出
  if (imageData && !answer) {
    const result = handler.handleImageSubmission(room, playerId, imageData);
    if (!result.success) return result;
    
    // 絵の提出成功を通知
    const latest = handler.popLastSubmission(roomId);
    if (latest) {
      callbacks?.onShiritoriDrawingAdded?.(room, latest.drawing, latest.nextDrawerId);
    }
    
    return { success: true, isLastDrawing: result.isLastDrawing };
  }

  // 答えのみの提出
  if (!imageData && answer) {
    // ひらがなバリデーション
    const hiraganaPattern = /^[\u3041-\u3096ー]+$/;
    if (!hiraganaPattern.test(answer)) {
      return { success: false, error: 'ひらがなのみ入力してください' };
    }
    
    const result = handler.handleAnswerSubmission(room, playerId, answer);
    if (!result.success) return result;
    
    // 答え提出を通知
    if (result.drawing) {
      callbacks?.onShiritoriAnswerSubmitted?.(room, playerId, result.drawing);
    }
    
    // ゲーム終了チェック
    if (result.shouldEndGame) {
      // 結果発表へ
      const shiritoriResult = handler.generateResult(room, []);
      callbacks?.onShiritoriResult?.(room, shiritoriResult);
    }
    
    return { success: true, shouldEndGame: result.shouldEndGame };
  }

  return { success: false, error: 'Invalid submission' };
}

export function submitGuess(roomId: string, playerId: string, guess: string): boolean {
  return handleSubmission(roomId, playerId, { type: 'text', payload: guess || '' }, 'guessing');
}

export function submitQuizGuess(
  roomId: string,
  playerId: string,
  text: string
): { success: boolean; winnersReached?: boolean } {
  const room = getRoom(roomId);
  if (!room) return { success: false };
  // realtimeモード: quiz_drawing / revealモード: quiz_guessing で回答可能
  if (room.currentPhase !== 'quiz_drawing' && room.currentPhase !== 'quiz_guessing') {
    return { success: false };
  }

  const handler = getGameModeHandler(room.settings.gameMode);
  if (!(handler instanceof QuizModeHandler)) return { success: false };

  const result = handler.submitGuess(room, playerId, text);
  if (!result) return { success: false };

  callbacks?.onQuizFeed?.(room, result.feedItem);

  if (result.winnersReached) {
    forceAdvancePhase(roomId);
    return { success: true, winnersReached: true };
  }

  return { success: true, winnersReached: false };
}

export function forceAdvancePhase(roomId: string): void {
  advancePhase(roomId);
}

function handlePhaseTimeout(roomId: string): void {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !roomChains || !submissions) return;

  const handler = getGameModeHandler(room.settings.gameMode);
  const expectedPlayers = getExpectedSubmitters(room, handler);
  const isDrawingPhase = room.currentPhase === 'drawing' || room.currentPhase === 'first-frame';
  const fallbackPayload = isDrawingPhase ? '(timeout)' : '(時間切れ)';

  expectedPlayers.forEach((playerId) => {
    if (submissions.has(playerId)) return;

    handler.handleSubmission(
      room,
      playerId,
      room.currentPhase === 'prompt'
        ? { type: 'text', payload: fallbackPayload }
        : { type: 'drawing', payload: fallbackPayload, answer: '(時間切れ)', imageData: fallbackPayload },
      roomChains
    );

    submissions.add(playerId);
    callbacks?.onSubmissionReceived(room, playerId, submissions.size, expectedPlayers.length);
  });

  advancePhase(roomId);
}

function advancePhase(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  clearRoomTimer(roomId);
  clearTimerSyncInterval(roomId);

  const playerCount = room.players.length;
  let currentTurn = room.currentTurn ?? 0;
  const totalTurns = room.totalTurns ?? playerCount;

  // アニメーションモード: drawingフェーズの終了時のみターンを進める
  // first-frameは自分のチェーンに描くのでターンは進めない
  // ターンの更新はgetNextPhaseの**前**に行う必要がある
  if (room.settings.gameMode === 'animation') {
    if (room.currentPhase === 'drawing') {
      currentTurn = currentTurn + 1;
      room.currentTurn = currentTurn;
    }
  } else if (room.settings.gameMode === 'shiritori') {
    if (room.currentPhase === 'drawing') {
      currentTurn = (currentTurn ?? 0) + 1;
      room.currentTurn = currentTurn;
    }
  } else if (room.settings.gameMode === 'quiz') {
    if (room.currentPhase === 'quiz_reveal') {
      currentTurn = currentTurn + 1;
      room.currentTurn = currentTurn;
      // 次のラウンド準備
      const handler = getGameModeHandler(room.settings.gameMode);
      if (handler instanceof QuizModeHandler) {
        if (currentTurn < totalTurns) {
          handler.nextRound(room);
        }
      }
    }
  } else {
    if (room.currentPhase === 'prompt') {
      currentTurn = 1;
      room.currentTurn = currentTurn;
    } else if (room.currentPhase === 'guessing') {
      currentTurn = currentTurn + 1;
      room.currentTurn = currentTurn;
    }
  }

  const handler = getGameModeHandler(room.settings.gameMode);
  const nextPhase = room.currentPhase
    ? handler.getNextPhase(room.currentPhase, currentTurn, totalTurns, room)
    : 'result';

  callbacks?.onPhaseComplete(room, nextPhase);

  if (nextPhase !== 'result') {
    startPhase(roomId, nextPhase);
  } else {
    room.status = 'finished';
    room.currentPhase = 'result';
    const roomChains = chains.get(roomId);
    if (room.settings.gameMode === 'shiritori') {
      const handler = getGameModeHandler(room.settings.gameMode);
      if (handler instanceof ShiritoriModeHandler) {
        const result = handler.generateResult(room, roomChains ?? []);
        callbacks?.onShiritoriResult?.(room, result);
      }
    } else if (room.settings.gameMode === 'quiz') {
      const handler = getGameModeHandler(room.settings.gameMode);
      if (handler instanceof QuizModeHandler) {
        const result = handler.generateResult(room, roomChains ?? []);
        callbacks?.onQuizResult?.(room, result);
      }
    } else if (roomChains) {
      callbacks?.onGameResult(room, roomChains);
    }
  }
}

function clearRoomTimer(roomId: string): void {
  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }
}

function clearTimerSyncInterval(roomId: string): void {
  const interval = timerSyncIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    timerSyncIntervals.delete(roomId);
  }
}

export function getChains(roomId: string): Chain[] | undefined {
  return chains.get(roomId);
}

export function getChain(roomId: string, chainId: string): Chain | undefined {
  const roomChains = chains.get(roomId);
  return roomChains?.find((c) => c.id === chainId);
}

// Get the content a player should be working on for reconnection
export function getPlayerContent(roomId: string, playerId: string): ContentPayload | null {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  if (!room || !roomChains) return null;

  if (room.currentPhase === 'prompt') return null;

  const handler = getGameModeHandler(room.settings.gameMode);
  const payloads = handler.distributeContent(room, roomChains);
  return payloads.get(playerId) ?? null;
}

// Check if player has already submitted in current phase
export function hasPlayerSubmitted(roomId: string, playerId: string): boolean {
  const submissions = roomSubmissions.get(roomId);
  return submissions?.has(playerId) ?? false;
}

export function cleanupGame(roomId: string): void {
  clearRoomTimer(roomId);
  clearTimerSyncInterval(roomId);
  chains.delete(roomId);
  roomSubmissions.delete(roomId);
  const room = getRoom(roomId);
  if (room?.settings.gameMode === 'shiritori') {
    const handler = getGameModeHandler(room.settings.gameMode);
    if (handler instanceof ShiritoriModeHandler) {
      handler.cleanup(roomId);
    }
  } else if (room?.settings.gameMode === 'quiz') {
    const handler = getGameModeHandler(room.settings.gameMode);
    if (handler instanceof QuizModeHandler) {
      handler.cleanup(roomId);
    }
  }
}
