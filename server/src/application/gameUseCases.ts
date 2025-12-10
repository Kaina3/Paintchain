import type { Chain, Entry, GamePhase, Room } from '../domain/entities.js';
import { generatePlayerId } from '../infra/services/idGenerator.js';
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
  onReceiveContent: (playerId: string, content: { type: 'text' | 'drawing'; payload: string }) => void;
  onTimerSync: (room: Room, remaining: number) => void;
  onGameResult: (room: Room, chains: Chain[]) => void;
}

let callbacks: GameCallbacks | null = null;

export function setGameCallbacks(cb: GameCallbacks) {
  callbacks = cb;
}

export function initializeGame(roomId: string): Chain[] | null {
  const room = getRoom(roomId);
  if (!room) return null;

  // Create a chain for each player
  const roomChains: Chain[] = room.players.map((player) => ({
    id: generatePlayerId(),
    roomId,
    ownerPlayerId: player.id,
    entries: [],
  }));

  chains.set(roomId, roomChains);
  roomSubmissions.set(roomId, new Set());

  // Set initial phase and turn info
  room.currentPhase = 'prompt';
  room.currentTurn = 0;
  room.totalTurns = room.players.length;

  return roomChains;
}

export function startPhase(roomId: string, phase: GamePhase): void {
  const room = getRoom(roomId);
  if (!room) return;

  room.currentPhase = phase;
  roomSubmissions.set(roomId, new Set());

  const timeLimit = getTimeLimitForPhase(room, phase);
  const deadline = new Date(Date.now() + timeLimit * 1000);
  room.phaseDeadline = deadline;

  // Notify phase change with deadline for timer sync
  callbacks?.onPhaseChanged(room, phase, timeLimit, deadline);

  // Distribute content to players for drawing/guessing phases
  if (phase === 'drawing' || phase === 'guessing') {
    distributeContent(roomId);
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

function getTimeLimitForPhase(room: Room, phase: GamePhase): number {
  switch (phase) {
    case 'prompt':
      return room.settings.promptTimeSec;
    case 'drawing':
      return room.settings.drawingTimeSec;
    case 'guessing':
      return room.settings.guessTimeSec;
    default:
      return 60;
  }
}

function distributeContent(roomId: string): void {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  if (!room || !roomChains) return;

  const playerCount = room.players.length;
  const turn = room.currentTurn ?? 0;

  // Each player receives content from a different chain based on turn
  room.players.forEach((player, playerIndex) => {
    // Calculate which chain this player should work on
    const chainIndex = (playerIndex + turn) % playerCount;
    const chain = roomChains[chainIndex];
    const lastEntry = chain.entries[chain.entries.length - 1];

    if (lastEntry) {
      callbacks?.onReceiveContent(player.id, {
        type: lastEntry.type,
        payload: lastEntry.payload,
      });
    }
  });
}

export function submitPrompt(roomId: string, playerId: string, text: string): boolean {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !roomChains || !submissions) return false;
  if (room.currentPhase !== 'prompt') return false;
  if (submissions.has(playerId)) return false;

  // Find player's own chain and add the prompt
  const playerChain = roomChains.find((c) => c.ownerPlayerId === playerId);
  if (!playerChain) return false;

  const entry: Entry = {
    order: 0,
    type: 'text',
    authorId: playerId,
    payload: text.trim() || '(お題なし)',
    submittedAt: new Date(),
  };

  playerChain.entries.push(entry);
  submissions.add(playerId);

  callbacks?.onSubmissionReceived(room, playerId, submissions.size, room.players.length);

  // Check if all submitted
  if (submissions.size >= room.players.length) {
    advancePhase(roomId);
  }

  return true;
}

export function submitDrawing(roomId: string, playerId: string, imageUrl: string): boolean {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !roomChains || !submissions) return false;
  if (room.currentPhase !== 'drawing') return false;
  if (submissions.has(playerId)) return false;

  const playerCount = room.players.length;
  const turn = room.currentTurn ?? 0;
  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return false;

  // Find which chain this player is working on
  const chainIndex = (playerIndex + turn) % playerCount;
  const chain = roomChains[chainIndex];

  const entry: Entry = {
    order: chain.entries.length,
    type: 'drawing',
    authorId: playerId,
    payload: imageUrl,
    submittedAt: new Date(),
  };

  chain.entries.push(entry);
  submissions.add(playerId);

  callbacks?.onSubmissionReceived(room, playerId, submissions.size, room.players.length);

  if (submissions.size >= room.players.length) {
    advancePhase(roomId);
  }

  return true;
}

export function submitGuess(roomId: string, playerId: string, guess: string): boolean {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !roomChains || !submissions) return false;
  if (room.currentPhase !== 'guessing') return false;
  if (submissions.has(playerId)) return false;

  const playerCount = room.players.length;
  const turn = room.currentTurn ?? 0;
  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return false;

  const chainIndex = (playerIndex + turn) % playerCount;
  const chain = roomChains[chainIndex];

  const entry: Entry = {
    order: chain.entries.length,
    type: 'text',
    authorId: playerId,
    payload: guess.trim() || '(回答なし)',
    submittedAt: new Date(),
  };

  chain.entries.push(entry);
  submissions.add(playerId);

  callbacks?.onSubmissionReceived(room, playerId, submissions.size, room.players.length);

  if (submissions.size >= room.players.length) {
    advancePhase(roomId);
  }

  return true;
}

function handlePhaseTimeout(roomId: string): void {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  const submissions = roomSubmissions.get(roomId);

  if (!room || !roomChains || !submissions) return;

  // Auto-submit for players who haven't submitted
  room.players.forEach((player, playerIndex) => {
    if (submissions.has(player.id)) return;

    const playerCount = room.players.length;
    const turn = room.currentTurn ?? 0;

    if (room.currentPhase === 'prompt') {
      const playerChain = roomChains.find((c) => c.ownerPlayerId === player.id);
      if (playerChain) {
        playerChain.entries.push({
          order: 0,
          type: 'text',
          authorId: player.id,
          payload: '(時間切れ)',
          submittedAt: new Date(),
        });
      }
    } else if (room.currentPhase === 'drawing') {
      const chainIndex = (playerIndex + turn) % playerCount;
      const chain = roomChains[chainIndex];
      chain.entries.push({
        order: chain.entries.length,
        type: 'drawing',
        authorId: player.id,
        payload: '', // Empty drawing
        submittedAt: new Date(),
      });
    } else if (room.currentPhase === 'guessing') {
      const chainIndex = (playerIndex + turn) % playerCount;
      const chain = roomChains[chainIndex];
      chain.entries.push({
        order: chain.entries.length,
        type: 'text',
        authorId: player.id,
        payload: '(時間切れ)',
        submittedAt: new Date(),
      });
    }

    submissions.add(player.id);
  });

  advancePhase(roomId);
}

function advancePhase(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  clearRoomTimer(roomId);
  clearTimerSyncInterval(roomId);

  const playerCount = room.players.length;
  const currentTurn = room.currentTurn ?? 0;
  const totalTurns = room.totalTurns ?? playerCount;

  let nextPhase: GamePhase | 'result';

  if (room.currentPhase === 'prompt') {
    // After prompt, start drawing phase
    nextPhase = 'drawing';
    room.currentTurn = 1; // Turn 1 (0 was prompt)
  } else if (room.currentPhase === 'drawing') {
    // After drawing, either guess or result
    if (currentTurn >= totalTurns - 1) {
      nextPhase = 'result';
    } else {
      nextPhase = 'guessing';
    }
  } else if (room.currentPhase === 'guessing') {
    // After guessing, increment turn and draw again
    room.currentTurn = currentTurn + 1;
    if (room.currentTurn >= totalTurns - 1) {
      nextPhase = 'result';
    } else {
      nextPhase = 'drawing';
    }
  } else {
    nextPhase = 'result';
  }

  callbacks?.onPhaseComplete(room, nextPhase);

  if (nextPhase !== 'result') {
    startPhase(roomId, nextPhase);
  } else {
    room.status = 'finished';
    room.currentPhase = 'result';
    const roomChains = chains.get(roomId);
    if (roomChains) {
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
export function getPlayerContent(roomId: string, playerId: string): { type: 'text' | 'drawing'; payload: string } | null {
  const room = getRoom(roomId);
  const roomChains = chains.get(roomId);
  if (!room || !roomChains) return null;

  // During prompt phase, no content to distribute
  if (room.currentPhase === 'prompt') return null;

  const playerCount = room.players.length;
  const turn = room.currentTurn ?? 0;
  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return null;

  const chainIndex = (playerIndex + turn) % playerCount;
  const chain = roomChains[chainIndex];
  const lastEntry = chain.entries[chain.entries.length - 1];

  if (!lastEntry) return null;

  return {
    type: lastEntry.type,
    payload: lastEntry.payload,
  };
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
}
