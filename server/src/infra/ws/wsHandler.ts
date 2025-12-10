import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import {
  addPlayerToRoom,
  removePlayerFromRoom,
  togglePlayerReady,
  startGame,
  rejoinRoom,
  getGameState,
  setPlayerConnected,
  getRoom,
  playerReturnToLobby,
} from '../../application/roomUseCases.js';
import {
  initializeGame,
  startPhase,
  submitPrompt,
  submitDrawing,
  submitGuess,
  setGameCallbacks,
  getChains,
  getPlayerContent,
  hasPlayerSubmitted,
} from '../../application/gameUseCases.js';
import type { Room, GamePhase, Chain } from '../../domain/entities.js';

// Map playerId -> WebSocket
const playerConnections = new Map<string, WebSocket>();
// Map playerId -> roomId
const playerRooms = new Map<string, string>();
// Disconnection timers for graceful handling
const disconnectTimers = new Map<string, NodeJS.Timeout>();

const DISCONNECT_GRACE_PERIOD = 30000; // 30 seconds

interface WSClientEvent {
  type: 'join_room' | 'leave_room' | 'toggle_ready' | 'start_game' | 'submit_prompt' | 'submit_drawing' | 'submit_guess' | 'rejoin_room' | 'result_navigate' | 'return_to_lobby';
  payload: {
    roomId?: string;
    playerName?: string;
    playerId?: string;
    text?: string;
    imageData?: string;
    chainIndex?: number;
    entryIndex?: number;
  };
}

interface WSServerEvent {
  type: 'room_joined' | 'players_updated' | 'game_started' | 'error' | 'phase_changed' | 'submission_received' | 'phase_complete' | 'receive_content' | 'game_result' | 'timer_sync' | 'rejoined' | 'disconnected' | 'result_sync' | 'returned_to_lobby';
  payload: unknown;
}

function send(ws: WebSocket, event: WSServerEvent) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function sendToPlayer(playerId: string, event: WSServerEvent) {
  const ws = playerConnections.get(playerId);
  if (ws) {
    send(ws, event);
  }
}

function broadcastToRoom(room: Room, event: WSServerEvent) {
  for (const player of room.players) {
    const ws = playerConnections.get(player.id);
    if (ws) {
      send(ws, event);
    }
  }
}

// Initialize game callbacks
setGameCallbacks({
  onPhaseChanged: (room: Room, phase: GamePhase, timeRemaining: number, deadline?: Date) => {
    broadcastToRoom(room, {
      type: 'phase_changed',
      payload: {
        phase,
        timeRemaining,
        deadline: deadline?.toISOString(),
        currentTurn: room.currentTurn,
        totalTurns: room.totalTurns,
      },
    });
  },
  onSubmissionReceived: (room: Room, playerId: string, submittedCount: number, totalCount: number) => {
    broadcastToRoom(room, {
      type: 'submission_received',
      payload: { playerId, submittedCount, totalCount },
    });
  },
  onPhaseComplete: (room: Room, nextPhase: GamePhase | 'result') => {
    if (nextPhase === 'result') {
      const chains = getChains(room.id);
      broadcastToRoom(room, {
        type: 'game_result',
        payload: { chains },
      });
    } else {
      broadcastToRoom(room, {
        type: 'phase_complete',
        payload: { nextPhase },
      });
    }
  },
  onReceiveContent: (playerId: string, content: { type: 'text' | 'drawing'; payload: string }) => {
    sendToPlayer(playerId, {
      type: 'receive_content',
      payload: content,
    });
  },
  onTimerSync: (room: Room, timeRemaining: number) => {
    broadcastToRoom(room, {
      type: 'timer_sync',
      payload: { timeRemaining },
    });
  },
  onGameResult: (room: Room, chains: Chain[]) => {
    broadcastToRoom(room, {
      type: 'game_result',
      payload: {
        chains,
        players: room.players,
      },
    });
  },
});

export async function wsHandler(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (socket) => {
    let currentPlayerId: string | null = null;

    socket.on('message', (raw) => {
      try {
        const message: WSClientEvent = JSON.parse(raw.toString());
        handleMessage(socket, message, currentPlayerId, (playerId) => {
          currentPlayerId = playerId;
        });
      } catch (err) {
        console.error('Failed to parse message:', err);
        send(socket, { type: 'error', payload: { message: 'Invalid message format' } });
      }
    });

    socket.on('close', () => {
      if (currentPlayerId) {
        const roomId = playerRooms.get(currentPlayerId);
        if (roomId) {
          // Set player as disconnected but don't remove yet
          const room = setPlayerConnected(roomId, currentPlayerId, false);
          playerConnections.delete(currentPlayerId);

          if (room) {
            broadcastToRoom(room, {
              type: 'players_updated',
              payload: { players: room.players },
            });

            // Start grace period timer
            const playerId = currentPlayerId;
            const timer = setTimeout(() => {
              // After grace period, fully remove the player
              const updatedRoom = removePlayerFromRoom(roomId, playerId);
              playerRooms.delete(playerId);
              disconnectTimers.delete(playerId);

              if (updatedRoom) {
                broadcastToRoom(updatedRoom, {
                  type: 'players_updated',
                  payload: { players: updatedRoom.players },
                });
              }
            }, DISCONNECT_GRACE_PERIOD);

            disconnectTimers.set(currentPlayerId, timer);
          }
        }
      }
    });
  });
}

function handleMessage(
  ws: WebSocket,
  message: WSClientEvent,
  currentPlayerId: string | null,
  setPlayerId: (id: string) => void
) {
  switch (message.type) {
    case 'join_room': {
      const { roomId, playerName } = message.payload;
      if (!roomId || !playerName) {
        send(ws, { type: 'error', payload: { message: 'Missing roomId or playerName' } });
        return;
      }

      const result = addPlayerToRoom(roomId, playerName);
      if (!result) {
        send(ws, { type: 'error', payload: { message: 'Room not found or full' } });
        return;
      }

      const { room, playerId } = result;
      setPlayerId(playerId);
      playerConnections.set(playerId, ws);
      playerRooms.set(playerId, roomId);

      send(ws, { type: 'room_joined', payload: { room, playerId } });
      broadcastToRoom(room, {
        type: 'players_updated',
        payload: { players: room.players },
      });
      break;
    }

    case 'leave_room': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const room = removePlayerFromRoom(roomId, currentPlayerId);
      playerConnections.delete(currentPlayerId);
      playerRooms.delete(currentPlayerId);

      if (room) {
        broadcastToRoom(room, {
          type: 'players_updated',
          payload: { players: room.players },
        });
      }
      break;
    }

    case 'toggle_ready': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const room = togglePlayerReady(roomId, currentPlayerId);
      if (room) {
        broadcastToRoom(room, {
          type: 'players_updated',
          payload: { players: room.players },
        });
      }
      break;
    }

    case 'start_game': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const room = startGame(roomId, currentPlayerId);
      if (!room) {
        send(ws, { type: 'error', payload: { message: 'Cannot start game' } });
        return;
      }

      // Initialize game and start prompt phase
      initializeGame(roomId);

      broadcastToRoom(room, {
        type: 'game_started',
        payload: { roomId },
      });

      // Start the prompt phase
      startPhase(roomId, 'prompt');
      break;
    }

    case 'submit_prompt': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const { text } = message.payload;
      const success = submitPrompt(roomId, currentPlayerId, text || '');
      if (!success) {
        send(ws, { type: 'error', payload: { message: 'Failed to submit prompt' } });
      }
      break;
    }

    case 'submit_drawing': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const { imageData } = message.payload;
      if (!imageData) {
        send(ws, { type: 'error', payload: { message: 'Missing image data' } });
        return;
      }

      // For MVP, store base64 directly (in production, upload to S3)
      const success = submitDrawing(roomId, currentPlayerId, imageData);
      if (!success) {
        send(ws, { type: 'error', payload: { message: 'Failed to submit drawing' } });
      }
      break;
    }

    case 'submit_guess': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const { text } = message.payload;
      const success = submitGuess(roomId, currentPlayerId, text || '');
      if (!success) {
        send(ws, { type: 'error', payload: { message: 'Failed to submit guess' } });
      }
      break;
    }

    case 'rejoin_room': {
      const { roomId, playerId } = message.payload;
      if (!roomId || !playerId) {
        send(ws, { type: 'error', payload: { message: 'Missing roomId or playerId' } });
        return;
      }

      // Cancel disconnect timer if exists
      const timer = disconnectTimers.get(playerId);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(playerId);
      }

      const result = rejoinRoom(roomId, playerId);
      if (!result) {
        send(ws, { type: 'error', payload: { message: 'Cannot rejoin room' } });
        return;
      }

      const { room, playerName } = result;
      setPlayerId(playerId);
      playerConnections.set(playerId, ws);
      playerRooms.set(playerId, roomId);

      // Get current game state
      const gameState = getGameState(roomId);
      const content = getPlayerContent(roomId, playerId);
      const submitted = hasPlayerSubmitted(roomId, playerId);

      // Send rejoin confirmation with full state
      send(ws, {
        type: 'rejoined',
        payload: {
          room,
          playerId,
          playerName,
          gameState,
          content,
          hasSubmitted: submitted,
        },
      });

      // Notify other players
      broadcastToRoom(room, {
        type: 'players_updated',
        payload: { players: room.players },
      });
      break;
    }

    case 'result_navigate': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const room = getRoom(roomId);
      if (!room) return;

      // Only host can control navigation
      if (room.hostId !== currentPlayerId) return;

      const { chainIndex, entryIndex } = message.payload;
      if (chainIndex === undefined || entryIndex === undefined) return;

      // Broadcast to all players in the room
      broadcastToRoom(room, {
        type: 'result_sync',
        payload: { chainIndex, entryIndex },
      });
      break;
    }

    case 'return_to_lobby': {
      if (!currentPlayerId) return;
      const roomId = playerRooms.get(currentPlayerId);
      if (!roomId) return;

      const room = playerReturnToLobby(roomId, currentPlayerId);
      if (!room) return;

      // Only notify this player with updated room state
      send(ws, {
        type: 'returned_to_lobby',
        payload: { room },
      });

      // Also update other players about the player list (ready status changed)
      broadcastToRoom(room, {
        type: 'players_updated',
        payload: { players: room.players },
      });
      break;
    }
  }
}
