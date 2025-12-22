import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import type { WSClientEvent, WSServerEvent, Room, ContentPayload, GamePhase } from '@/shared/types';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentRoomId: string | null = null;
  private isReconnecting = false;
  private errorCallback: ((message: string) => void) | null = null;

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
    const wsUrl = import.meta.env.VITE_WS_URL 
      ? `${import.meta.env.VITE_WS_URL}/ws`
      : (() => {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${protocol}//${window.location.host}/ws`;
        })();
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      useRoomStore.getState().setConnected(true);
      this.isReconnecting = false;
      this.reconnectAttempts = 0;

      // Auto-rejoin only if this was a reconnection attempt (not initial page load)
      const savedPlayerId = sessionStorage.getItem(`playerId_${roomId}`);
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
        sessionStorage.setItem(`playerId_${roomId}`, data.payload.playerId);
        break;
      case 'rejoined': {
        const payload = data.payload as {
          room: Room;
          playerId: string;
          gameState: { phase: GamePhase; timeRemaining: number; deadline?: string; currentTurn: number; totalTurns: number } | null;
          content: ContentPayload | null;
          hasSubmitted: boolean;
        };
        roomStore.setRoom(payload.room);
        roomStore.setPlayerId(payload.playerId);

        if (payload.gameState) {
          gameStore.setPhase(
            payload.gameState.phase,
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
        // New result phase: clear any stale navigation/reveal state from a previous game.
        gameStore.resetAllEntryIndices();
        // Don't set initial position here - let GameResult component handle it
        // based on the display order setting
        gameStore.setPhase('result', 0);
        break;
      case 'result_sync':
        gameStore.setResultPosition(data.payload.chainIndex, data.payload.entryIndex);
        if (data.payload.displayOrder) {
          gameStore.setResultDisplayOrder(data.payload.displayOrder);
        }
        gameStore.updateRevealedPosition(data.payload.chainIndex, data.payload.entryIndex, data.payload.displayOrder);
        break;
      case 'animation_unlocked':
        gameStore.unlockChain(data.payload.chainIndex);
        break;
      case 'settings_updated':
        roomStore.setSettings(data.payload.settings);
        break;
      case 'mode_changed':
        roomStore.setGameMode(data.payload.mode);
        break;
      case 'shiritori_turn':
        gameStore.setShiritoriTurn(
          data.payload.drawerId,
          data.payload.previousLetterHint,
          data.payload.order,
          data.payload.total,
          data.payload.gallery
        );
        break;
      case 'shiritori_your_turn':
        gameStore.setReceivedContent({ type: 'text', payload: data.payload.previousLetterHint ?? '' });
        break;
      case 'shiritori_drawing_added': {
        gameStore.addShiritoriDrawing(data.payload.drawing, data.payload.nextDrawerId);
        // 自分が絵を提出した場合、答え入力モードに移行（hasSubmittedはまだfalse）
        const currentPlayerId = roomStore.playerId;
        if (currentPlayerId === data.payload.drawing.authorId) {
          // 絵は提出済み、答え待ちモード
          gameStore.setShiritoriPendingAnswer(true, data.payload.drawing.imageData);
        }
        break;
      }
      case 'shiritori_answer_submitted': {
        // 答えが提出された
        gameStore.updateShiritoriDrawingAnswer(data.payload.drawing);
        // 自分が答えを提出した場合
        const myPlayerId = roomStore.playerId;
        if (myPlayerId === data.payload.playerId) {
          gameStore.setShiritoriPendingAnswer(false, null);
          gameStore.setHasSubmitted(true);
        }
        break;
      }
      case 'shiritori_result':
        gameStore.setShiritoriResult(data.payload);
        gameStore.setPhase('result', 0);
        break;
      case 'shiritori_canvas_update':
        console.log('[Shiritori] Received canvas update from drawer:', data.payload.drawerId);
        gameStore.setShiritoriLiveCanvas(data.payload.imageData);
        break;
      case 'returned_to_lobby':
        // Update room state when returning to lobby
        roomStore.setRoom(data.payload.room);
        break;
      case 'error':
        roomStore.setError(data.payload.message);
        // Also call error callback if registered
        if (this.errorCallback) {
          this.errorCallback(data.payload.message);
        }
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

  setErrorCallback(callback: ((message: string) => void) | null) {
    this.errorCallback = callback;
  }
}

export const wsManager = new WebSocketManager();
