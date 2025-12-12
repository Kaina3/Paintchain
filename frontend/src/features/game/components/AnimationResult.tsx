import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/features/game/store/gameStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useWebSocket } from '@/shared/hooks/useWebSocket';

export function AnimationResult() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { send } = useWebSocket(roomId ?? null);
  const {
    chains,
    resultPlayers,
    resultChainIndex,
    unlockedChainIndices,
    setResultPosition,
    unlockChain,
    reset: resetGame,
  } = useGameStore();
  const { room, playerId } = useRoomStore();
  const [localChainIndex, setLocalChainIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1 = normal, 0.5 = slow, 2 = fast
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const players = resultPlayers.length > 0 ? resultPlayers : room?.players || [];
  const isHost = room?.hostId === playerId;
  
  // Check if all chains have been unlocked (not just revealed/navigated to)
  const isAllRevealed = chains.length > 0 && unlockedChainIndices.length >= chains.length;
  
  // Determine which chain to display
  const displayChainIndex = isHost || !isAllRevealed ? resultChainIndex : localChainIndex;
  const currentChain = chains[displayChainIndex];
  
  // Check if current chain is unlocked (always true if all revealed)
  const isCurrentChainUnlocked = isAllRevealed || unlockedChainIndices.includes(displayChainIndex);

  const frames = useMemo(() => {
    if (!currentChain) return [] as string[];
    return currentChain.entries.filter((e) => e.type === 'drawing').map((e) => e.payload);
  }, [currentChain]);

  const promptText = useMemo(() => {
    return currentChain?.entries.find((e) => e.type === 'text')?.payload ?? null;
  }, [currentChain]);

  useEffect(() => {
    // Reset playback when chain changes
    setFrameIndex(0);
  }, [displayChainIndex]);

  // Auto-start playing when animation is unlocked
  useEffect(() => {
    if (isCurrentChainUnlocked && frames.length > 0) {
      setIsPlaying(true);
    }
  }, [isCurrentChainUnlocked, frames.length]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0 || !isCurrentChainUnlocked) return;
    // Base interval is 1000ms, divided by speed (0.5 = 2000ms, 1 = 1000ms, 2 = 500ms)
    const interval = 1000 / speed;
    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [frames.length, isPlaying, speed, isCurrentChainUnlocked]);

  useEffect(() => {
    // Stop playback if frames are missing
    if (frames.length === 0) {
      setIsPlaying(false);
    }
  }, [frames.length]);

  const getPlayerName = (pid: string) => {
    return players.find((p) => p.id === pid)?.name || '不明';
  };

  // Sync local view with host when not all revealed
  useEffect(() => {
    if (!isAllRevealed) {
      setLocalChainIndex(resultChainIndex);
    }
  }, [resultChainIndex, isAllRevealed]);

  // Reset playback when unlocked
  useEffect(() => {
    if (isCurrentChainUnlocked) {
      setFrameIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isCurrentChainUnlocked]);

  const handleBackToLobby = () => {
    send({ type: 'return_to_lobby', payload: {} });
    resetGame();
    navigate(`/room/${roomId}`);
  };

  const handleUnlock = () => {
    if (!isHost) return;
    unlockChain(resultChainIndex);
    send({
      type: 'animation_unlock',
      payload: { chainIndex: resultChainIndex },
    });
  };

  const handleNext = () => {
    if (!isHost) return;
    
    const newChainIndex = resultChainIndex + 1;
    if (newChainIndex >= chains.length) return;

    // entryIndex is not used in animation mode; keep it hidden (-1) to avoid
    // interfering with normal-mode reverse-order semantics.
    setResultPosition(newChainIndex, -1);
    send({
      type: 'result_navigate',
      payload: { chainIndex: newChainIndex, entryIndex: -1 },
    });
  };

  const handlePrev = () => {
    if (!isHost) return;
    
    const newChainIndex = resultChainIndex - 1;
    if (newChainIndex < 0) return;

    // Keep hidden (-1) for the same reason as handleNext.
    setResultPosition(newChainIndex, -1);
    send({
      type: 'result_navigate',
      payload: { chainIndex: newChainIndex, entryIndex: -1 },
    });
  };
  
  // Host jumping to specific chain
  const hostJumpToChain = (chainIndex: number) => {
    if (!isHost) return;
    setResultPosition(chainIndex, -1);
    send({
      type: 'result_navigate',
      payload: { chainIndex, entryIndex: -1 },
    });
  };

  // Non-host switching between revealed chains
  const switchToChain = (chainIndex: number) => {
    setLocalChainIndex(chainIndex);
  };

  if (!currentChain || chains.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎞️</div>
          <p className="text-gray-600">結果を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  const ownerName = getPlayerName(currentChain.ownerPlayerId);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 p-4 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-xl font-bold text-primary-700">🎞️ アニメーション結果</h1>
            <p className="mt-1 text-sm text-gray-600">
              チェーン {displayChainIndex + 1} / {chains.length}
              <span className="ml-2">（{ownerName} のお題）</span>
            </p>
          </div>

          {/* Chain selector */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {chains.map((chain, idx) => {
              const isAccessible = isHost || isAllRevealed || unlockedChainIndices.includes(idx);
              const isSelected = idx === displayChainIndex;
              
              return (
                <button
                  key={chain.id}
                  onClick={() => {
                    if (isHost) {
                      hostJumpToChain(idx);
                    } else if (isAllRevealed) {
                      switchToChain(idx);
                    }
                  }}
                  disabled={!isAccessible}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-sm transition ${
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : isAccessible
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          
          {isAllRevealed && !isHost && (
            <p className="mt-2 text-center text-xs text-gray-500">
              自由に他のチェーンを見られます
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto p-4">
        {promptText && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">お題</p>
            <p className="text-lg font-semibold text-gray-800">{promptText}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">フレーム {frameIndex + 1} / {frames.length || 1}</span>
              <span className="text-gray-400">自動再生: {isPlaying ? 'オン' : 'オフ'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying((prev) => !prev)}
                disabled={!isCurrentChainUnlocked}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? '一時停止' : '再生'}
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <button
                  onClick={() => setFrameIndex((idx) => (idx - 1 + Math.max(frames.length, 1)) % Math.max(frames.length, 1))}
                  disabled={!isCurrentChainUnlocked}
                  className="rounded border border-gray-200 bg-white px-3 py-2 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ◀
                </button>
                <button
                  onClick={() => setFrameIndex((idx) => (idx + 1) % Math.max(frames.length, 1))}
                  disabled={!isCurrentChainUnlocked}
                  className="rounded border border-gray-200 bg-white px-3 py-2 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* Speed control slider */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">速度:</span>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              disabled={!isCurrentChainUnlocked}
              className="flex-1 accent-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs font-mono text-gray-700 w-10 text-right">{speed.toFixed(1)}x</span>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
            {frames.length > 0 ? (
              <>
                <img
                  key={frameIndex}
                  src={frames[frameIndex]}
                  alt={`フレーム${frameIndex + 1}`}
                  className={`h-auto w-full max-h-[70vh] object-contain ${!isCurrentChainUnlocked ? 'blur-lg' : ''}`}
                />
                {!isCurrentChainUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="text-center">
                      {isHost ? (
                        <button
                          onClick={handleUnlock}
                          className="group flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-2xl transition hover:scale-105"
                        >
                          <div className="text-6xl transition group-hover:scale-110">🔒</div>
                          <div className="text-lg font-bold text-gray-800">アニメーションをロック解除</div>
                          <div className="text-sm text-gray-600">クリックして再生開始</div>
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-2xl">
                          <div className="text-6xl animate-pulse">🔒</div>
                          <div className="text-lg font-bold text-gray-800">ロック中</div>
                          <div className="text-sm text-gray-600">ホストが再生を開始するまでお待ちください</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                フレームがまだありません
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700">参加者</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
            {players.map((player) => (
              <span
                key={player.id}
                className={`rounded-full px-3 py-1 shadow-sm ${player.id === currentChain.ownerPlayerId ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {player.name}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Navigation controls */}
      <div className="flex-shrink-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        {isHost ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrev}
              disabled={resultChainIndex === 0}
              className="rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              ← 前のチェーン
            </button>

            <div className="text-center text-sm text-gray-500">
              {resultChainIndex + 1} / {chains.length}
            </div>

            {resultChainIndex >= chains.length - 1 ? (
              <button
                onClick={handleBackToLobby}
                className="rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700"
              >
                🎮 ロビーに戻る
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700"
              >
                次のチェーン →
              </button>
            )}
          </div>
        ) : isAllRevealed ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => switchToChain(Math.max(0, localChainIndex - 1))}
              disabled={localChainIndex === 0}
              className="rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              ← 前のチェーン
            </button>

            <button
              onClick={handleBackToLobby}
              className="rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700"
            >
              🎮 ロビーに戻る
            </button>

            <button
              onClick={() => switchToChain(Math.min(chains.length - 1, localChainIndex + 1))}
              disabled={localChainIndex === chains.length - 1}
              className="rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              次のチェーン →
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-2 text-sm text-gray-500">
              ホストが結果を操作しています...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
