import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GameMode, Settings, LobbyChatItem } from '@/shared/types';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { PlayerList } from '@/features/room/components/PlayerList';
import { ModeSelectionPanel } from '@/features/room/components/ModeSelectionPanel';

// 弾幕アイテム
function DanmakuItem({ item, lane }: { item: LobbyChatItem; lane: number }) {
  return (
    <div
      className="danmaku-item absolute whitespace-nowrap font-bold"
      style={{ 
        top: `${lane * 40 + 12}px`,
        color: item.playerColor || '#FFFFFF',
        fontSize: '1.2rem',
        WebkitTextStroke: '1.5px white',
        paintOrder: 'stroke fill',
        textShadow: `
          0 0 4px white,
          0 0 4px white,
          0 0 8px rgba(255,255,255,0.5)
        `,
      }}
    >
      {item.playerName}: {item.text}
    </div>
  );
}

// 弾幕オーバーレイ
function LobbyChatDanmaku({ messages }: { messages: LobbyChatItem[] }) {
  const [activeItems, setActiveItems] = useState<{ item: LobbyChatItem; lane: number; key: string }[]>([]);
  const lanes = useRef<number[]>(new Array(5).fill(0));
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    
    // 既に処理済みのメッセージはスキップ
    if (processedIds.current.has(latest.id)) return;
    processedIds.current.add(latest.id);
    
    // 最も古いレーンを選択
    const now = Date.now();
    let minLane = 0;
    let minTime = lanes.current[0];
    for (let i = 1; i < lanes.current.length; i++) {
      if (lanes.current[i] < minTime) {
        minTime = lanes.current[i];
        minLane = i;
      }
    }
    lanes.current[minLane] = now;

    setActiveItems((prev) => [...prev, { item: latest, lane: minLane, key: latest.id }]);

    // 10秒後に削除（アニメーション時間と同じ）
    const timer = setTimeout(() => {
      setActiveItems((prev) => prev.filter((i) => i.key !== latest.id));
    }, 10000);

    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <div className="danmaku-container pointer-events-none fixed inset-0 overflow-hidden z-50">
      {activeItems.map(({ item, lane, key }) => (
        <DanmakuItem key={key} item={item} lane={lane} />
      ))}
    </div>
  );
}

// チャット入力欄（固定表示・最小化対応）
function LobbyChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleExpand = () => {
    setIsMinimized(false);
    // 少し遅延させてからフォーカス
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 最小化状態：左下に丸いボタン
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={handleExpand}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-2xl text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
          title="チャットを開く"
        >
          💬
        </button>
      </div>
    );
  }

  // 展開状態：下部に固定されたチャット入力欄
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
          title="最小化"
        >
          ✕
        </button>
        <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={50}
            placeholder="メッセージを入力... (Enter で送信)"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}

export function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connect, send, disconnect } = useWebSocket(roomId ?? null);
  const { room, playerId, connected, error, reset, setSettings, lobbyChatMessages } = useRoomStore();
  const { phase } = useGameStore();
  const hasJoinedRef = useRef(false);
  const quizMaxWinnersManualRef = useRef(false);

  const playerName = sessionStorage.getItem('playerName');

  const handleSendChat = useCallback((text: string) => {
    send({ type: 'lobby_chat', payload: { text } });
  }, [send]);

  const handleLeaveToHome = useCallback(() => {
    // Persist last-room info only when user explicitly leaves to Home
    if (roomId && playerName) {
      sessionStorage.setItem('paintchain_last_room', JSON.stringify({ roomId, playerName }));
    }

    // Explicitly leave so server removes the player immediately (not just "disconnected")
    try {
      if (roomId) {
        send({ type: 'leave_room', payload: { roomId } });
      }
    } catch {
      // no-op
    }

    if (roomId) {
      sessionStorage.removeItem(`playerId_${roomId}`);
    }

    disconnect();
    reset();
    navigate('/');
  }, [disconnect, navigate, reset, roomId, send]);

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
      
      // Check if we have a saved playerId for this room (page reload)
      const savedPlayerId = sessionStorage.getItem(`playerId_${roomId}`);
      if (savedPlayerId) {
        // Rejoin with existing playerId
        send({ type: 'rejoin_room', payload: { roomId, playerId: savedPlayerId } });
      } else {
        // Join as new player
        send({ type: 'join_room', payload: { roomId, playerName } });
      }
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

  const handleReorderPlayers = useCallback(
    (playerIds: string[]) => {
      if (!roomId) return;
      send({ type: 'reorder_players', payload: { playerIds } });
    },
    [roomId, send]
  );

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

  const handleUpdateSettingsFromUI = useCallback(
    (partial: Partial<Settings>) => {
      // UIから maxWinners を変更したら、以後は自動追従しない
      if (typeof partial.quizSettings?.maxWinners === 'number') {
        quizMaxWinnersManualRef.current = true;
      }
      handleUpdateSettings(partial);
    },
    [handleUpdateSettings]
  );

  useEffect(() => {
    if (!roomId || !isHost || !room) return;
    if (room.settings.gameMode !== 'quiz') return;

    const playerCount = room.players.length ?? 0;
    if (quizMaxWinnersManualRef.current) return;

    // デフォ: 人数-1（ただし最大3）
    // 1人=1、2人=1、3人=2、4人以上=3
    const desiredMaxWinners = Math.min(3, Math.max(1, playerCount - 1));
    const currentMaxWinners = room.settings.quizSettings.maxWinners;
    if (currentMaxWinners === desiredMaxWinners) return;

    handleUpdateSettings({
      quizSettings: {
        ...room.settings.quizSettings,
        maxWinners: desiredMaxWinners,
      },
    });
  }, [handleUpdateSettings, isHost, room, roomId]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleLeaveToHome}
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
              <p className="mb-3 text-xs text-gray-500">
                💡 ▲▼ボタンでプレイヤーの順番を変更できます。アイコンをクリックで色を変更。
              </p>
              <PlayerList 
                players={room.players} 
                hostId={room.hostId} 
                currentPlayerId={playerId}
                onReorder={handleReorderPlayers}
                onChangeColor={(color) => send({ type: 'change_color', payload: { color } })}
              />

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
                  onClick={handleLeaveToHome}
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
            onUpdateSettings={handleUpdateSettingsFromUI}
          />
        </div>

        {/* 下部の余白（固定チャット欄分） */}
        <div className="h-20" />
      </div>

      {/* 弾幕オーバーレイ */}
      <LobbyChatDanmaku messages={lobbyChatMessages} />

      {/* 固定チャット入力欄 */}
      <LobbyChatInput onSend={handleSendChat} />
    </div>
  );
}
