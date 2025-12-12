import type { Room, Player, Settings, GameMode } from '../domain/entities.js';
import { createDefaultSettings } from '../domain/entities.js';
import { generateRoomId, generatePlayerId } from '../infra/services/idGenerator.js';

// In-memory store
const rooms = new Map<string, Room>();

export function createRoom(): Room {
  const roomId = generateRoomId();
  const room: Room = {
    id: roomId,
    status: 'waiting',
    hostId: '',
    players: [],
    settings: createDefaultSettings(),
    createdAt: new Date(),
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function addPlayerToRoom(
  roomId: string,
  playerName: string
): { room: Room; playerId: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.players.length >= room.settings.maxPlayers) {
    return null;
  }

  const playerId = generatePlayerId();
  const player: Player = {
    id: playerId,
    name: playerName,
    ready: false,
    connected: true,
  };

  room.players.push(player);

  // First player becomes host
  if (room.players.length === 1) {
    room.hostId = playerId;
  }

  return { room, playerId };
}

export function removePlayerFromRoom(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.players = room.players.filter((p) => p.id !== playerId);

  // If host left, assign new host
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }

  // Delete room if empty
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  return room;
}

export function setPlayerConnected(
  roomId: string,
  playerId: string,
  connected: boolean
): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = connected;
  }

  return room;
}

// Rejoin room - returns room state if player exists
export function rejoinRoom(
  roomId: string,
  playerId: string
): { room: Room; playerName: string } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.connected = true;
  return { room, playerName: player.name };
}

// Get current game state for reconnection
export function getGameState(roomId: string): {
  phase: Room['currentPhase'];
  currentTurn: number;
  totalTurns: number;
  timeRemaining: number;
  deadline?: Date;
} | null {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'playing') return null;

  const deadline = room.phaseDeadline;
  const timeRemaining = deadline
    ? Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000))
    : 0;

  return {
    phase: room.currentPhase,
    currentTurn: room.currentTurn ?? 1,
    totalTurns: room.totalTurns ?? room.players.length,
    timeRemaining,
    deadline,
  };
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeSettings(settings: Settings): Settings {
  const defaults = createDefaultSettings();

  const normalSettings = {
    ...defaults.normalSettings,
    ...settings.normalSettings,
  };

  const animationSettings = {
    ...defaults.animationSettings,
    ...settings.animationSettings,
  };

  const shiritoriSettings = {
    ...defaults.shiritoriSettings,
    ...settings.shiritoriSettings,
  };

  return {
    maxPlayers: clampNumber(settings.maxPlayers, 2, 12, defaults.maxPlayers),
    gameMode: settings.gameMode,
    normalSettings: {
      ...normalSettings,
      promptTimeSec: clampNumber(normalSettings.promptTimeSec, 5, 180, defaults.normalSettings.promptTimeSec),
      drawingTimeSec: clampNumber(normalSettings.drawingTimeSec, 20, 300, defaults.normalSettings.drawingTimeSec),
      guessTimeSec: clampNumber(normalSettings.guessTimeSec, 10, 240, defaults.normalSettings.guessTimeSec),
      resultOrder: normalSettings.resultOrder,
    },
    animationSettings: {
      ...animationSettings,
      drawingTimeSec: clampNumber(animationSettings.drawingTimeSec, 20, 300, defaults.animationSettings.drawingTimeSec),
      viewMode: animationSettings.viewMode,
      firstFrameMode: animationSettings.firstFrameMode,
      promptTimeSec:
        animationSettings.firstFrameMode === 'prompt'
          ? clampNumber(animationSettings.promptTimeSec ?? defaults.animationSettings.promptTimeSec ?? 20, 5, 180, defaults.animationSettings.promptTimeSec ?? 20)
          : animationSettings.promptTimeSec,
    },
    shiritoriSettings: {
      ...shiritoriSettings,
      drawingTimeSec: clampNumber(shiritoriSettings.drawingTimeSec, 10, 240, defaults.shiritoriSettings.drawingTimeSec),
      totalDrawings: clampNumber(shiritoriSettings.totalDrawings, 4, 40, defaults.shiritoriSettings.totalDrawings),
    },
  };
}

export function togglePlayerReady(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.ready = !player.ready;
  }

  return room;
}

export function updateRoomSettings(roomId: string, playerId: string, partial: Partial<Settings>): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.hostId !== playerId) return null;
  if (room.status !== 'waiting') return null;

  const merged: Settings = normalizeSettings({
    ...room.settings,
    ...partial,
    normalSettings: {
      ...room.settings.normalSettings,
      ...(partial.normalSettings ?? {}),
    },
    animationSettings: {
      ...room.settings.animationSettings,
      ...(partial.animationSettings ?? {}),
    },
    shiritoriSettings: {
      ...room.settings.shiritoriSettings,
      ...(partial.shiritoriSettings ?? {}),
    },
  });

  room.settings = merged;
  return room;
}

export function selectGameMode(roomId: string, playerId: string, mode: GameMode): Room | null {
  return updateRoomSettings(roomId, playerId, { gameMode: mode });
}

export function startGame(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  // Only host can start
  if (room.hostId !== playerId) return null;

  // Check all players are ready
  if (!room.players.every((p) => p.ready)) return null;

  // Need at least 2 players
  if (room.players.length < 2) return null;

  room.status = 'playing';
  return room;
}

// Reset a single player's ready state when returning to lobby
export function playerReturnToLobby(roomId: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.ready = false;
  }

  // If room was finished/playing but player returns to lobby, 
  // check if we should reset room status
  if (room.status === 'finished' || room.status === 'playing') {
    room.status = 'waiting';
    room.currentPhase = undefined;
    room.currentTurn = undefined;
    room.totalTurns = undefined;
    room.phaseDeadline = undefined;
    
    // Reset all players' ready status
    for (const p of room.players) {
      p.ready = false;
    }
  }

  return room;
}

// Reset room to waiting state (after game ends)
export function resetRoomToLobby(roomId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.status = 'waiting';
  room.currentPhase = undefined;
  room.currentTurn = undefined;
  room.totalTurns = undefined;
  room.phaseDeadline = undefined;
  
  // Reset all players' ready status
  for (const player of room.players) {
    player.ready = false;
  }

  return room;
}
