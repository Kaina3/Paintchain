import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GameMode, Settings, LobbyChatItem } from '@/shared/types';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { PlayerList } from '@/features/room/components/PlayerList';
import { ModeSelectionPanel } from '@/features/room/components/ModeSelectionPanel';
import { preloadMuseumBackgrounds, isMuseumBackgroundsReady } from '@/shared/lib/preloadMuseumBackgrounds';
import { HangingFrame } from '@/shared/components/HangingFrame';
import paletteImg from '@/assets/palette.png';

const museumBg = '/img/gallery_room.png';
const museumBgDark = '/img/gallery_dark.png';

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

// チャット入力欄（固定表示・最小化対応）- 美術館風
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
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-stone-700 to-stone-800 text-2xl text-amber-100 shadow-lg border-2 border-stone-600 transition-all hover:scale-110 hover:shadow-xl active:scale-95"
          title="チャットを開く"
        >
          💬
        </button>
      </div>
    );
  }

  // 展開状態：下部に固定されたチャット入力欄（美術館風）
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-stone-600 bg-gradient-to-r from-stone-800/95 to-stone-900/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-stone-400 transition hover:bg-stone-600 hover:text-stone-300"
          title="最小化"
        >
          ✕
        </button>
        <form onSubmit={handleSubmit} className="flex flex-1 gap-3">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={50}
            placeholder="Add your critique..."
            className="flex-1 rounded-lg border-2 border-stone-600 bg-stone-700/50 px-4 py-2 text-sm text-amber-100 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-2 text-sm font-bold text-amber-100 shadow-md transition hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 flex items-center gap-1"
          >
            🎨 SEND
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

  // 入場アニメーション状態
  const [lightOn, setLightOn] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [bgReady, setBgReady] = useState(isMuseumBackgroundsReady());
  const [isLeaving, setIsLeaving] = useState(false);

  const playerName = sessionStorage.getItem('playerName');

  const handleSendChat = useCallback((text: string) => {
    send({ type: 'lobby_chat', payload: { text } });
  }, [send]);

  const handleLeaveToHome = useCallback(() => {
    if (isLeaving) return;
    setIsLeaving(true);
    setIsExiting(true);
    setPanelVisible(false);

    // Trigger Home enter animation (must be set before navigation)
    sessionStorage.setItem('homeTransition', 'entering');

    // Persist last-room info only when there are other players in the room
    // If user is the last one, don't save (room will be deleted anyway)
    const hasOtherPlayers = !!room && room.players.length > 1;
    if (roomId && playerName && hasOtherPlayers) {
      sessionStorage.setItem('paintchain_last_room', JSON.stringify({ roomId, playerName }));
    } else {
      sessionStorage.removeItem('paintchain_last_room');
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

    setTimeout(() => {
      disconnect();
      reset();
      navigate('/');
    }, 450);
  }, [disconnect, isLeaving, navigate, playerName, reset, room, roomId, send]);

  // LobbyPage表示中はbody背景を無効化
  useEffect(() => {
    document.body.classList.add('lobby-page-active');
    return () => {
      document.body.classList.remove('lobby-page-active');
    };
  }, []);

  // 入場アニメーション
  useEffect(() => {
    let cancelled = false;
    const isEntering = sessionStorage.getItem('pageTransition') === 'entering';

    preloadMuseumBackgrounds().then(() => {
      if (cancelled) return;
      setBgReady(true);

      if (isEntering) {
        sessionStorage.removeItem('pageTransition');

        // 1. 最初は暗い状態でパネルは画面外（上）
        setLightOn(false);
        setPanelVisible(false);

        // 2. 次フレームで開始（描画を挟んで滑らかに）
        requestAnimationFrame(() => {
          if (cancelled) return;
          setTimeout(() => {
            if (cancelled) return;
            setPanelVisible(true);
          }, 200);

          setTimeout(() => {
            if (cancelled) return;
            setLightOn(true);
          }, 300);
        });
      } else {
        // 通常表示
        setLightOn(true);
        setPanelVisible(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="rounded-xl border border-stone-200/50 bg-white/20 backdrop-blur-md p-6 shadow-lg">
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
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景レイヤー */}
      <div className="fixed inset-0" style={{ backgroundColor: '#0b0b0c' }}>
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-opacity duration-500"
          style={{
            backgroundImage: `url(${museumBgDark})`,
            opacity: lightOn ? 0 : 1,
            backgroundAttachment: 'fixed',
          }}
        />
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-opacity duration-500"
          style={{
            backgroundImage: `url(${museumBg})`,
            opacity: lightOn ? 1 : 0,
            backgroundAttachment: 'fixed',
          }}
        />
        {!bgReady && <div className="absolute inset-0 bg-black" />}
      </div>

      {/* 暗めのオーバーレイ */}
      <div className="fixed inset-0 bg-black/10 z-[1]" />

      {/* コンテンツ */}
      <div className="relative z-[2] overflow-auto min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col p-4 md:p-6">
        {/* ヘッダー：タイトルと部屋コード */}
        <div
          className="mb-4 flex flex-wrap items-center justify-center gap-4 text-center transition-opacity duration-500"
          style={{ opacity: panelVisible ? 1 : 0 }}
        >
          <div>
            <div className="flex items-center justify-center gap-2">
              <img src={paletteImg} alt="palette" className="w-12 h-12 md:w-14 md:h-14 drop-shadow-lg" />
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-wide text-amber-100 drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                THE EXHIBITION HALL
              </h1>
            </div>
            <p className="mt-1 text-sm text-amber-200/80 italic" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              Awaiting the artists for a new showing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-stone-800/80 px-4 py-2 font-mono text-xl font-bold text-amber-100 shadow-lg border border-amber-700/50">
              {roomId}
            </span>
            <button
              onClick={handleCopyLink}
              className="rounded-lg bg-stone-800/80 px-4 py-2 text-sm font-semibold text-amber-100 shadow-lg border border-amber-700/50 transition hover:bg-stone-700/80"
            >
              LINK
            </button>
          </div>
        </div>

        {/* メインコンテンツ：2つのフレーム */}
        <div
          className="flex-1 grid gap-4 lg:gap-6 lg:grid-cols-[1fr_1.2fr] items-start mt-12 transition-all duration-700 ease-out"
          style={{
            transform: panelVisible ? 'translateY(0)' : 'translateY(-100vh)',
            opacity: panelVisible ? 1 : 0,
          }}
        >
          {/* 左パネル：GALLERY OF ARTISTS（プレイヤーリスト） */}
          <HangingFrame delay={0.1} isExiting={isExiting} ropeLength={18}>
            <div
              className="museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
              style={{
                border: '6px solid transparent',
                borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
              }}
            >
              <div className="rounded bg-white/5 backdrop-blur-xl p-4 md:p-5">
                <div className="mb-4 text-center border-b border-stone-300 pb-3">
                  <h2 className="font-serif text-lg md:text-xl font-bold text-stone-800 tracking-wide">
                    GALLERY OF ARTISTS
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    {room.players.length}/{room.settings.maxPlayers} artists
                  </p>
                </div>

                <PlayerList
                  players={room.players}
                  hostId={room.hostId}
                  currentPlayerId={playerId}
                  onReorder={handleReorderPlayers}
                  onChangeColor={(color) => send({ type: 'change_color', payload: { color } })}
                />

                {isHost && !canStart && (
                  <div className="mt-4 rounded-lg border border-amber-600/40 bg-amber-100/50 p-3 text-center text-sm font-semibold text-amber-800">
                    {(room.players.length ?? 0) < 2
                      ? '⏳ 2人以上必要です'
                      : '⏳ 全員が準備完了するとゲームを開始できます'}
                  </div>
                )}
              </div>
            </div>
          </HangingFrame>

          {/* 右パネル：GAME MODES & SETTINGS */}
          <HangingFrame delay={0.2} isExiting={isExiting} ropeLength={18}>
            <div
              className="museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
              style={{
                border: '6px solid transparent',
                borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
              }}
            >
              <div className="rounded bg-white/5 backdrop-blur-md p-4 md:p-5">
                <div className="mb-4 text-center border-b border-stone-300 pb-3">
                  <h2 className="font-serif text-lg md:text-xl font-bold text-stone-800 tracking-wide">
                    GAME MODES & SETTINGS
                  </h2>
                </div>
                <ModeSelectionPanel
                  settings={room.settings}
                  isHost={isHost}
                  onSelectMode={handleSelectMode}
                  onUpdateSettings={handleUpdateSettingsFromUI}
                />
              </div>
            </div>
          </HangingFrame>
        </div>

        {/* 下部ボタンエリア */}
        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-4 transition-opacity duration-500"
          style={{ opacity: panelVisible ? 1 : 0 }}
        >
          <button
            onClick={handleToggleReady}
            className={`museum-btn flex items-center gap-2 rounded-lg px-6 py-3 font-serif font-bold text-lg shadow-lg transition-all duration-300 ${
              currentPlayer?.ready
                ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-amber-100 border-2 border-emerald-600'
                : 'bg-gradient-to-r from-stone-600 to-stone-700 text-stone-200 border-2 border-stone-500 hover:from-stone-500 hover:to-stone-600'
            }`}
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            {currentPlayer?.ready ? '✓ READY' : '○ NOT READY'}
          </button>

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className="museum-btn flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-8 py-3 font-serif font-bold text-lg text-amber-100 shadow-lg border-2 border-amber-600 transition-all duration-300 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              ✏️ BEGIN SHOWCASE
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="museum-btn flex items-center gap-2 rounded-lg bg-gradient-to-r from-stone-700 to-stone-800 px-6 py-3 font-serif font-bold text-lg text-stone-200 shadow-lg border-2 border-stone-600 transition-all duration-300 hover:from-stone-600 hover:to-stone-700"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            SHARE INVITATION 📋
          </button>

          <button
            onClick={handleLeaveToHome}
            className="museum-btn flex items-center gap-2 rounded-lg bg-stone-800/80 px-4 py-2 text-sm font-semibold text-stone-300 border border-stone-600 transition hover:bg-stone-700/80"
          >
            🏠 EXIT
          </button>
        </div>

        {/* 下部の余白（固定チャット欄分） */}
        <div className="h-24" />
      </div>

      {/* 弾幕オーバーレイ */}
      <div className="transition-opacity duration-500" style={{ opacity: panelVisible ? 1 : 0 }}>
        <LobbyChatDanmaku messages={lobbyChatMessages} />
      </div>

      {/* 固定チャット入力欄 */}
      <div className="transition-opacity duration-500" style={{ opacity: panelVisible ? 1 : 0 }}>
        <LobbyChatInput onSend={handleSendChat} />
      </div>
      </div>
    </div>
  );
}
