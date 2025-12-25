import type { Room, Player, Settings, GameMode } from '../domain/entities.js';
import { createDefaultSettings, PLAYER_COLORS } from '../domain/entities.js';
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

  // 未使用のカラーを取得
  const usedColors = new Set(room.players.map(p => p.color));
  const availableColor = PLAYER_COLORS.find(c => !usedColors.has(c)) ?? PLAYER_COLORS[0];

  const playerId = generatePlayerId();
  const player: Player = {
    id: playerId,
    name: playerName,
    ready: false,
    connected: true,
    color: availableColor,
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

  const quizSettings = {
    ...defaults.quizSettings,
    ...settings.quizSettings,
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
    quizSettings: {
      ...quizSettings,
      drawingTimeSec: clampNumber(quizSettings.drawingTimeSec, 30, 300, defaults.quizSettings.drawingTimeSec),
      maxWinners: clampNumber(quizSettings.maxWinners, 1, 10, defaults.quizSettings.maxWinners),
      revealTimeSec: clampNumber(quizSettings.revealTimeSec, 1, 10, defaults.quizSettings.revealTimeSec),
      totalRounds: clampNumber(quizSettings.totalRounds, 0, 20, defaults.quizSettings.totalRounds),
      quizFormat: quizSettings.quizFormat === 'reveal' ? 'reveal' : 'realtime',
      revealDrawTimeSec: clampNumber(quizSettings.revealDrawTimeSec, 5, 60, defaults.quizSettings.revealDrawTimeSec),
      revealGuessTimeSec: clampNumber(quizSettings.revealGuessTimeSec, 10, 120, defaults.quizSettings.revealGuessTimeSec),
      promptDisplayMode: quizSettings.promptDisplayMode === 'separate' ? 'separate' : 'immediate',
      promptViewTimeSec: clampNumber(quizSettings.promptViewTimeSec, 3, 30, defaults.quizSettings.promptViewTimeSec),
      winnerPoints: quizSettings.winnerPoints?.length > 0 ? quizSettings.winnerPoints.slice(0, 10) : defaults.quizSettings.winnerPoints,
      drawerBonus: clampNumber(quizSettings.drawerBonus, 0, 10, defaults.quizSettings.drawerBonus),
      noWinnerBonus: clampNumber(quizSettings.noWinnerBonus, 0, 10, defaults.quizSettings.noWinnerBonus),
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

// Reorder players (any player can reorder in waiting state)
export function reorderPlayers(roomId: string, playerId: string, playerIds: string[]): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  // Verify the player is in this room
  if (!room.players.some(p => p.id === playerId)) return null;
  
  // Only in waiting state
  if (room.status !== 'waiting') return null;
  
  // Validate that all playerIds exist and match current players
  const currentIds = new Set(room.players.map(p => p.id));
  const newIds = new Set(playerIds);
  
  if (playerIds.length !== room.players.length) return null;
  for (const id of playerIds) {
    if (!currentIds.has(id)) return null;
  }
  for (const id of currentIds) {
    if (!newIds.has(id)) return null;
  }
  
  // Create new ordered array
  const playerMap = new Map(room.players.map(p => [p.id, p]));
  room.players = playerIds.map(id => playerMap.get(id)!);
  
  return room;
}

// プレイヤーカラー変更
export function changePlayerColor(
  roomId: string,
  playerId: string,
  color: string
): { success: boolean; room?: Room; error?: string } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  // ロビー状態でのみ変更可能
  if (room.status !== 'waiting') {
    return { success: false, error: 'Cannot change color during game' };
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  // 有効なカラーかチェック
  if (!PLAYER_COLORS.includes(color)) {
    return { success: false, error: 'Invalid color' };
  }

  // 他のプレイヤーが使用中かチェック
  const colorInUse = room.players.some(p => p.id !== playerId && p.color === color);
  if (colorInUse) {
    return { success: false, error: 'Color already in use' };
  }

  player.color = color;
  return { success: true, room };
}
