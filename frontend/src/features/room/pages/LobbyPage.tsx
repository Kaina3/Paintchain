import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GameMode, Settings } from '@/shared/types';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { PlayerList } from '@/features/room/components/PlayerList';
import { ModeSelectionPanel } from '@/features/room/components/ModeSelectionPanel';

export function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connect, send, disconnect } = useWebSocket(roomId ?? null);
  const { room, playerId, connected, error, reset, setSettings } = useRoomStore();
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

  const mergeSettings = useCallback(
    (partial: Partial<Settings>) => {
      if (!room) return null;

      return {
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
      } satisfies Settings;
    },
    [room]
  );

  const handleSelectMode = useCallback(
    (mode: GameMode) => {
      if (!roomId || !isHost) return;
      const next = mergeSettings({ gameMode: mode });
      if (!next) return;
      setSettings(next);
      send({ type: 'select_mode', payload: { mode } });
    },
    [isHost, mergeSettings, roomId, send, setSettings]
  );

  const handleUpdateSettings = useCallback(
    (partial: Partial<Settings>) => {
      if (!roomId || !isHost) return;
      const next = mergeSettings(partial);
      if (!next) return;
      setSettings(next);
      send({ type: 'update_settings', payload: { settings: partial } });
    },
    [isHost, mergeSettings, roomId, send, setSettings]
  );

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Room</p>
            <h1 className="text-3xl font-black text-gray-900">🎨 ロビー</h1>
            <p className="text-sm text-gray-600">モードを選んで全員の準備を待ちましょう。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-gradient-to-r from-primary-100 to-secondary-100 px-4 py-2 font-mono text-xl font-bold text-primary-700 shadow-sm">
              {roomId}
            </span>
            <button
              onClick={handleCopyCode}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              📋 コード
            </button>
            <button
              onClick={handleCopyLink}
              className="rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              🔗 リンク
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <div className="glass rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-pop">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <span className="text-2xl">👥</span>
                  プレイヤー ({room.players.length}/{room.settings.maxPlayers})
                </h2>
                {isHost && <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">ホスト</span>}
              </div>
              <PlayerList players={room.players} hostId={room.hostId} currentPlayerId={playerId} />

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <button
                  onClick={handleToggleReady}
                  className={`flex-1 rounded-xl px-6 py-4 font-bold shadow-md transition-all duration-300 transform hover:scale-[1.01] active:scale-95 ${
                    currentPlayer?.ready
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-glow-sm hover:shadow-glow'
                      : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 hover:from-gray-300 hover:to-gray-400'
                  }`}
                >
                  {currentPlayer?.ready ? '✓ 準備OK' : '👋 準備する'}
                </button>

                {isHost && (
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="flex-1 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 px-6 py-4 font-bold text-white shadow-[0_4px_14px_0_rgba(221,32,115,0.5)] transition-all duration-300 hover:translate-y-[-1px] hover:shadow-[0_10px_24px_rgba(221,32,115,0.45)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    🚀 ゲーム開始
                  </button>
                )}
              </div>

              {isHost && !canStart && (
                <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-3 text-center text-sm font-semibold text-accent-700">
                  {(room.players.length ?? 0) < 2
                    ? '⏳ 2人以上必要です'
                    : '⏳ 全員が準備完了するとゲームを開始できます'}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</p>
                  <h3 className="text-lg font-bold text-gray-900">ルーム操作</h3>
                </div>
                <span className="text-xs font-semibold text-gray-500">接続 {connected ? 'オンライン' : '切断'}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    disconnect();
                    reset();
                    navigate('/');
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                >
                  🏠 ホームに戻る
                </button>
                <button
                  onClick={handleCopyLink}
                  className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  🔗 招待リンクを共有
                </button>
              </div>
            </div>
          </div>

          <ModeSelectionPanel
            settings={room.settings}
            isHost={isHost}
            onSelectMode={handleSelectMode}
            onUpdateSettings={handleUpdateSettings}
          />
        </div>
      </div>
    </div>
  );
}
