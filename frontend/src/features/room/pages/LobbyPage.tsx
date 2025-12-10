import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { PlayerList } from '@/features/room/components/PlayerList';

export function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connect, send, disconnect } = useWebSocket(roomId ?? null);
  const { room, playerId, connected, error, reset } = useRoomStore();
  const { phase } = useGameStore();
  const hasJoinedRef = useRef(false);

  const playerName = sessionStorage.getItem('playerName');

  useEffect(() => {
    if (!playerName) {
      // Redirect to home with roomId so user can enter name and join
      navigate(`/?join=${roomId}`);
      return;
    }

    if (roomId) {
      connect();
    }
  }, [roomId]); // Only depend on roomId - connect once per roomId

  useEffect(() => {
    // Skip if already have a playerId (returning from game)
    if (playerId) {
      hasJoinedRef.current = true;
      return;
    }
    
    if (connected && roomId && playerName && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      send({ type: 'join_room', payload: { roomId, playerName } });
    }
  }, [connected, roomId, playerName, playerId, send]);

  // Navigate to game when phase changes
  useEffect(() => {
    if (phase && roomId) {
      navigate(`/game/${roomId}`);
    }
  }, [phase, roomId, navigate]);

  const handleToggleReady = useCallback(() => {
    if (roomId) {
      send({ type: 'toggle_ready', payload: { roomId } });
    }
  }, [roomId, send]);

  const handleStartGame = useCallback(() => {
    if (roomId) {
      send({ type: 'start_game', payload: { roomId } });
    }
  }, [roomId, send]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('リンクをコピーしました！');
    } catch {
      alert('コピーに失敗しました');
    }
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId ?? '');
      alert('部屋コードをコピーしました！');
    } catch {
      alert('コピーに失敗しました');
    }
  }, [roomId]);

  const currentPlayer = room?.players.find((p) => p.id === playerId);
  const isHost = room?.hostId === playerId;
  const allReady = room?.players.every((p) => p.ready) ?? false;
  const canStart = isHost && allReady && (room?.players.length ?? 0) >= 2;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-gray-600 px-4 py-2 text-white"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">接続中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-700">🎨 ロビー</h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="rounded bg-gray-200 px-3 py-1 font-mono text-lg">{roomId}</span>
            <button
              onClick={handleCopyCode}
              className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
            >
              コードをコピー
            </button>
            <button
              onClick={handleCopyLink}
              className="rounded bg-primary-100 px-3 py-1 text-sm text-primary-700 hover:bg-primary-200"
            >
              リンクをコピー
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            プレイヤー ({room.players.length}/{room.settings.maxPlayers})
          </h2>
          <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleToggleReady}
            className={`flex-1 rounded-lg px-4 py-3 font-semibold transition ${
              currentPlayer?.ready
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {currentPlayer?.ready ? '✓ 準備OK' : '準備する'}
          </button>

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              ゲーム開始
            </button>
          )}
        </div>

        <button
          onClick={() => {
            disconnect();
            reset();
            navigate('/');
          }}
          className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
        >
          ホームに戻る
        </button>

        {isHost && !canStart && (
          <p className="text-center text-sm text-gray-500">
            {(room.players.length ?? 0) < 2
              ? '2人以上必要です'
              : '全員が準備完了するとゲームを開始できます'}
          </p>
        )}
      </div>
    </div>
  );
}
