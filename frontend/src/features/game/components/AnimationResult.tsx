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
    resultEntryIndices,
    revealedEntryIndices,
    setResultPosition,
    updateRevealedPosition,
    reset: resetGame,
  } = useGameStore();
  const { room, playerId } = useRoomStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastEntryRef = useRef<HTMLDivElement>(null);

  // Local state for viewing
  const [localChainIndex, setLocalChainIndex] = useState(0);

  // Animation playback state (for when animation is shown)
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const players = resultPlayers.length > 0 ? resultPlayers : room?.players || [];
  const isHost = room?.hostId === playerId;
  const hasBackground = room?.settings.animationSettings.hasBackground ?? false;

  // Current entry index for current chain (-1 means nothing shown yet)
  const resultEntryIndex = resultEntryIndices[resultChainIndex] ?? -1;

  // Check if all content has been revealed (including animation step)
  const isAllRevealed = (() => {
    if (chains.length === 0) return false;
    return chains.every((chain, chainIdx) => {
      const revealedIdx = revealedEntryIndices[chainIdx] ?? -1;
      if (revealedIdx < 0) return false;
      // All frames + animation revealed (entryIndex >= entries.length)
      return revealedIdx >= chain.entries.length;
    });
  })();

  // Determine which chain to display
  const displayChainIndex = !isAllRevealed ? resultChainIndex : (isHost ? resultChainIndex : localChainIndex);
  const currentChain = chains[displayChainIndex];

  // Extract all drawing frames
  const allDrawingFrames = useMemo(() => {
    if (!currentChain) return [] as string[];
    return currentChain.entries.filter((e) => e.type === 'drawing').map((e) => e.payload);
  }, [currentChain]);

  // Background frame (first drawing if hasBackground is true)
  const backgroundFrame = useMemo(() => {
    if (!hasBackground || allDrawingFrames.length === 0) return null;
    return allDrawingFrames[0];
  }, [hasBackground, allDrawingFrames]);

  // Animation frames (excluding background if hasBackground is true)
  const frames = useMemo(() => {
    if (hasBackground && allDrawingFrames.length > 0) {
      return allDrawingFrames.slice(1);
    }
    return allDrawingFrames;
  }, [hasBackground, allDrawingFrames]);

  // Get prompt text
  const promptText = useMemo(() => {
    return currentChain?.entries.find((e) => e.type === 'text')?.payload ?? null;
  }, [currentChain]);

  // Calculate visible range for the current chain
  const getVisibleRange = (chainIdx: number): { min: number; max: number } => {
    const chain = chains[chainIdx];
    if (!chain) return { min: 0, max: -1 };

    const lastIndex = chain.entries.length - 1;

    if (isAllRevealed) {
      return { min: 0, max: lastIndex };
    }

    if (chainIdx > resultChainIndex) {
      return { min: 0, max: -1 };
    }

    const storedIndex = resultEntryIndices[chainIdx];
    if (storedIndex === undefined || storedIndex < 0) {
      return { min: 0, max: -1 };
    }

    return { min: 0, max: storedIndex };
  };

  const { min: minVisibleIndex, max: maxVisibleIndex } = getVisibleRange(displayChainIndex);
  const visibleEntries = (currentChain?.entries ?? []).filter(
    (_, idx) => idx >= minVisibleIndex && idx <= maxVisibleIndex
  );

  // Check if animation should be shown (after all frames revealed + one more step)
  const isAnimationUnlocked = (() => {
    if (!currentChain) return false;
    // Animation shows when entryIndex >= entries.length (one step after last entry)
    if (isAllRevealed) return true;
    const storedIndex = resultEntryIndices[displayChainIndex] ?? -1;
    return storedIndex >= currentChain.entries.length;
  })();

  const getPlayerName = (pid: string) => {
    return players.find((p) => p.id === pid)?.name || '不明';
  };

  // Initialize on mount
  useEffect(() => {
    if (isHost && chains.length > 0) {
      if (resultEntryIndices[0] === undefined) {
        setResultPosition(0, -1);
        send({
          type: 'result_navigate',
          payload: { chainIndex: 0, entryIndex: -1 },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chains.length, isHost]);

  // Sync local view with host when not all revealed
  useEffect(() => {
    if (!isAllRevealed) {
      setLocalChainIndex(resultChainIndex);
    }
  }, [resultChainIndex, isAllRevealed]);

  // Scroll to the latest entry when it changes
  useEffect(() => {
    if (lastEntryRef.current) {
      lastEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [displayChainIndex, visibleEntries.length, isAnimationUnlocked]);

  // Auto-start animation when unlocked
  useEffect(() => {
    if (isAnimationUnlocked && frames.length > 0) {
      setIsPlaying(true);
      setFrameIndex(0);
    }
  }, [isAnimationUnlocked, frames.length, displayChainIndex]);

  // Animation playback timer
  useEffect(() => {
    if (!isPlaying || frames.length === 0 || !isAnimationUnlocked) return;
    const interval = 1000 / speed;
    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [frames.length, isPlaying, speed, isAnimationUnlocked]);

  const handleNext = () => {
    if (!isHost) return;

    const chain = chains[resultChainIndex];
    if (!chain) return;

    // lastIndex for entries, entries.length for animation step
    const animationStep = chain.entries.length;

    if (resultEntryIndex < animationStep) {
      const newEntryIndex = resultEntryIndex < 0 ? 0 : resultEntryIndex + 1;
      setResultPosition(resultChainIndex, newEntryIndex);
      updateRevealedPosition(resultChainIndex, newEntryIndex, 'first-to-last');
      send({
        type: 'result_navigate',
        payload: { chainIndex: resultChainIndex, entryIndex: newEntryIndex },
      });
    }
  };

  const handlePrev = () => {
    if (!isHost) return;

    if (resultEntryIndex > 0) {
      const newEntryIndex = resultEntryIndex - 1;
      setResultPosition(resultChainIndex, newEntryIndex);
      send({
        type: 'result_navigate',
        payload: { chainIndex: resultChainIndex, entryIndex: newEntryIndex },
      });
    } else if (resultEntryIndex === 0) {
      setResultPosition(resultChainIndex, -1);
      send({
        type: 'result_navigate',
        payload: { chainIndex: resultChainIndex, entryIndex: -1 },
      });
    }
  };

  const handleBackToLobby = () => {
    send({ type: 'return_to_lobby', payload: {} });
    resetGame();
    navigate(`/room/${roomId}`);
  };

  const hostJumpToChain = (chainIndex: number) => {
    if (!isHost) return;
    const targetChain = chains[chainIndex];
    if (!targetChain) return;

    const entryIndex = resultEntryIndices[chainIndex] ?? -1;
    setResultPosition(chainIndex, entryIndex);
    send({
      type: 'result_navigate',
      payload: { chainIndex, entryIndex },
    });
  };

  const switchToChain = (chainIndex: number) => {
    setLocalChainIndex(chainIndex);
  };

  // Calculate current entry display (including animation as +1 step)
  const getCurrentEntryDisplay = () => {
    const totalEntries = currentChain?.entries.length ?? 0;
    const totalSteps = totalEntries + 1; // +1 for animation
    if (resultEntryIndex < 0) {
      return `0 / ${totalSteps}`;
    }
    return `${Math.min(resultEntryIndex + 1, totalSteps)} / ${totalSteps}`;
  };

  const isFirst = resultEntryIndex < 0;
  const isLast = (() => {
    const chain = chains[resultChainIndex];
    if (!chain) return false;
    // isLast when we've shown the animation (entryIndex >= entries.length)
    return resultEntryIndex >= chain.entries.length;
  })();

  // Count frame number for a drawing entry
  const getFrameNumber = (entryIndex: number) => {
    if (!currentChain) return 0;
    let count = 0;
    for (let i = 0; i <= entryIndex; i++) {
      if (currentChain.entries[i]?.type === 'drawing') {
        count++;
      }
    }
    return count;
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
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white p-4 shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-700">🎞️ アニメーション結果</h1>
          <p className="mt-1 text-gray-600">
            チェーン {displayChainIndex + 1} / {chains.length}
            <span className="ml-2 text-sm">（{ownerName} のお題）</span>
          </p>
        </div>

        {/* Chain selector */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {chains.map((chain, idx) => {
            const isChainRevealed = (revealedEntryIndices[idx] ?? -1) >= 0;
            const isAccessible = isHost || isAllRevealed || isChainRevealed;
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

      {/* Chat-like entries display */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {visibleEntries.map((entry, idx) => {
            const isLastVisible = idx === visibleEntries.length - 1 && !isAnimationUnlocked;
            const isCurrentUser = entry.authorId === playerId;
            const originalIndex = currentChain.entries.indexOf(entry);
            const frameNumber = getFrameNumber(originalIndex);
            const isBackgroundEntry = hasBackground && entry.type === 'drawing' && frameNumber === 1;

            return (
              <div
                key={`${entry.authorId}-${entry.order}`}
                ref={isLastVisible ? lastEntryRef : null}
                className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
              >
                {/* Author name */}
                <div
                  className={`mb-1 flex items-center gap-1 text-sm text-gray-500 ${
                    isCurrentUser ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span>{entry.type === 'text' ? '📝' : isBackgroundEntry ? '🖼️' : '🎨'}</span>
                  <span>{getPlayerName(entry.authorId)}</span>
                  {entry.type === 'drawing' && (
                    <span className={`text-xs ${isBackgroundEntry ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                      {isBackgroundEntry ? '(背景)' : `(フレーム ${hasBackground ? frameNumber - 1 : frameNumber})`}
                    </span>
                  )}
                </div>

                {/* Entry content */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow ${
                    isBackgroundEntry
                      ? 'bg-amber-50 border-2 border-amber-200'
                      : isCurrentUser
                        ? 'bg-primary-100'
                        : 'bg-white'
                  } ${isLastVisible && !isAllRevealed ? 'animate-fade-in' : ''}`}
                >
                  {entry.type === 'text' ? (
                    <p className="text-lg font-medium text-gray-800">{entry.payload}</p>
                  ) : entry.payload ? (
                    <img
                      src={entry.payload}
                      alt={isBackgroundEntry ? '背景' : 'フレーム'}
                      className="max-h-64 rounded-lg"
                    />
                  ) : (
                    <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <div className="text-center">
                        <div className="text-3xl">⏰</div>
                        <p className="mt-1 text-sm">(時間切れ)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Animation player - shown after all frames are revealed */}
          {isAnimationUnlocked && frames.length > 0 && (
            <div
              ref={lastEntryRef}
              className="flex flex-col items-center animate-fade-in"
            >
              <div className="mb-2 text-center">
                <span className="inline-block rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 text-sm font-semibold text-white shadow-lg">
                  🎬 完成アニメーション
                </span>
              </div>

              <div className="w-full max-w-lg rounded-2xl border-2 border-purple-200 bg-white p-4 shadow-lg">
                {/* Animation controls */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                      フレーム {frameIndex + 1} / {frames.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying((prev) => !prev)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      {isPlaying ? '⏸ 停止' : '▶ 再生'}
                    </button>
                    <button
                      onClick={() => setFrameIndex((idx) => (idx - 1 + frames.length) % frames.length)}
                      className="rounded border border-gray-200 bg-white px-2 py-1.5 shadow-sm hover:bg-gray-50"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => setFrameIndex((idx) => (idx + 1) % frames.length)}
                      className="rounded border border-gray-200 bg-white px-2 py-1.5 shadow-sm hover:bg-gray-50"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* Speed control */}
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                  <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">速度:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="flex-1 accent-purple-600"
                  />
                  <span className="text-xs font-mono text-gray-700 w-10 text-right">{speed.toFixed(1)}x</span>
                </div>

                {/* Animation display */}
                <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {/* Background layer (fixed) */}
                  {backgroundFrame && (
                    <img
                      src={backgroundFrame}
                      alt="背景"
                      className="h-auto w-full object-contain"
                    />
                  )}
                  {/* Animation frame layer */}
                  <img
                    key={frameIndex}
                    src={frames[frameIndex]}
                    alt={`フレーム${frameIndex + 1}`}
                    className={`h-auto w-full object-contain ${backgroundFrame ? 'absolute inset-0' : ''}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex-shrink-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        {isHost ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className="rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                ← 前へ
              </button>

              <div className="text-center text-sm text-gray-500">
                {getCurrentEntryDisplay()}
              </div>

              {isLast ? (
                <button
                  onClick={handleNext}
                  disabled
                  className="rounded-lg bg-gray-300 px-4 py-3 font-semibold text-gray-500"
                >
                  次へ →
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700"
                >
                  次へ →
                </button>
              )}
            </div>

            {isAllRevealed ? (
              <button
                onClick={handleBackToLobby}
                className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700"
              >
                🎮 ロビーに戻る
              </button>
            ) : isLast ? (
              <p className="text-center text-sm text-gray-500">
                他のチェインを選択して続きを開示してください
              </p>
            ) : null}
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
