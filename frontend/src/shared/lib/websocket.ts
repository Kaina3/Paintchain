import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import type { WSClientEvent, WSServerEvent, Room } from '@/shared/types';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentRoomId: string | null = null;
  private isReconnecting = false;

  connect(roomId: string) {
    if (this.currentRoomId === roomId && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Close existing connection if different room
    if (this.ws && this.currentRoomId !== roomId) {
      this.ws.close();
      this.ws = null;
    }

    this.currentRoomId = roomId;
    this.doConnect(roomId, false);
  }

  private doConnect(roomId: string, isReconnect: boolean) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      useRoomStore.getState().setConnected(true);
      this.isReconnecting = false;
      this.reconnectAttempts = 0;

      // Check if we have saved session data for rejoin
      const savedPlayerId = localStorage.getItem(`playerId_${roomId}`);
      if (savedPlayerId && isReconnect) {
        this.send({
          type: 'rejoin_room',
          payload: { roomId, playerId: savedPlayerId },
        });
      }
    };

    ws.onmessage = (event) => {
      const data: WSServerEvent = JSON.parse(event.data);
      this.handleMessage(data, roomId);
    };

    ws.onclose = () => {
      useRoomStore.getState().setConnected(false);
      
      // Only clear ws if it's the current connection
      if (this.ws === ws) {
        this.ws = null;
      }

      // Don't attempt reconnection if this room is no longer current (intentional disconnect)
      if (this.currentRoomId !== roomId) {
        return;
      }

      // Attempt reconnection
      if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;
        this.isReconnecting = true;
        
        this.reconnectTimeout = setTimeout(() => {
          if (this.currentRoomId === roomId) {
            this.doConnect(roomId, true);
          }
        }, delay);
      } else {
        useRoomStore.getState().setError('再接続に失敗しました。ページを再読み込みしてください。');
        this.isReconnecting = false;
      }
    };

    ws.onerror = () => {
      // Error will be followed by close event
    };

    this.ws = ws;
  }

  private handleMessage(data: WSServerEvent, roomId: string) {
    const roomStore = useRoomStore.getState();
    const gameStore = useGameStore.getState();

    switch (data.type) {
      case 'room_joined':
        roomStore.setRoom(data.payload.room);
        roomStore.setPlayerId(data.payload.playerId);
        localStorage.setItem(`playerId_${roomId}`, data.payload.playerId);
        break;
      case 'rejoined': {
        const payload = data.payload as {
          room: Room;
          playerId: string;
          gameState: { phase: string; timeRemaining: number; deadline?: string; currentTurn: number; totalTurns: number } | null;
          content: { type: 'text' | 'drawing'; payload: string } | null;
          hasSubmitted: boolean;
        };
        roomStore.setRoom(payload.room);
        roomStore.setPlayerId(payload.playerId);

        if (payload.gameState) {
          gameStore.setPhase(
            payload.gameState.phase as 'prompt' | 'drawing' | 'guessing' | 'result',
            payload.gameState.timeRemaining,
            payload.gameState.deadline,
            payload.gameState.currentTurn,
            payload.gameState.totalTurns
          );
        }

        if (payload.content) {
          gameStore.setReceivedContent(payload.content);
        }

        if (payload.hasSubmitted) {
          gameStore.setHasSubmitted(true);
        }
        break;
      }
      case 'players_updated':
        roomStore.setPlayers(data.payload.players);
        break;
      case 'game_started':
        break;
      case 'phase_changed':
        gameStore.setPhase(
          data.payload.phase,
          data.payload.timeRemaining,
          data.payload.deadline,
          data.payload.currentTurn,
          data.payload.totalTurns
        );
        break;
      case 'timer_sync':
        gameStore.syncTimer(data.payload.timeRemaining);
        break;
      case 'submission_received':
        gameStore.setSubmissionProgress(data.payload.submittedCount, data.payload.totalCount);
        break;
      case 'receive_content':
        gameStore.setReceivedContent(data.payload);
        break;
      case 'game_result':
        gameStore.setChains(data.payload.chains, data.payload.players);
        gameStore.setResultPosition(0, 0);
        gameStore.updateRevealedPosition(0, 0);
        gameStore.setPhase('result', 0);
        break;
      case 'result_sync':
        gameStore.setResultPosition(data.payload.chainIndex, data.payload.entryIndex);
        gameStore.updateRevealedPosition(data.payload.chainIndex, data.payload.entryIndex);
        break;
      case 'returned_to_lobby':
        // Update room state when returning to lobby
        roomStore.setRoom(data.payload.room);
        break;
      case 'error':
        roomStore.setError(data.payload.message);
        break;
    }
  }

  send(event: WSClientEvent) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.currentRoomId = null;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
    useGameStore.getState().reset();
  }

  getIsReconnecting() {
    return this.isReconnecting;
  }
}

export const wsManager = new WebSocketManager();
