import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/features/game/store/gameStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useWebSocket } from '@/shared/hooks/useWebSocket';

export function GameResult() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { send } = useWebSocket(roomId ?? null);
  const {
    chains,
    resultPlayers,
    resultChainIndex,
    resultEntryIndices,
    revealedChainIndex,
    revealedEntryIndices,
    resultDisplayOrder,
    setResultPosition,
    resetAllEntryIndices,
    updateRevealedPosition,
    setResultDisplayOrder,
    reset: resetGame,
  } = useGameStore();
  const { room, playerId } = useRoomStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastEntryRef = useRef<HTMLDivElement>(null);

  // Current entry index for the current chain.
  // -1 means "show nothing yet" (initial state; Next reveals the first item).
  const resultEntryIndex = resultEntryIndices[resultChainIndex] ?? -1;

  // Local viewing state for non-host users
  const [localChainIndex, setLocalChainIndex] = useState(0);
  // Local display order for when user can freely choose (after all revealed)
  const [localDisplayOrder, setLocalDisplayOrder] = useState<'first-to-last' | 'last-to-first'>('first-to-last');
  
  const players = resultPlayers.length > 0 ? resultPlayers : room?.players || [];
  const isHost = room?.hostId === playerId;
  
  // Check if all content has been revealed
  // All revealed when we've shown all entries of all chains
  const isAllRevealed = (() => {
    if (chains.length === 0) return false;
    const lastChainIdx = chains.length - 1;
    const lastChain = chains[lastChainIdx];
    if (!lastChain) return false;
    
    // Check if the last chain has been fully revealed
    const lastChainRevealed = revealedChainIndex >= lastChainIdx;
    const revealedIdx = revealedEntryIndices[lastChainIdx] ?? -1;
    
    // For first-to-last: fully revealed when we've reached the last entry (lastIndex)
    // For last-to-first: fully revealed when we've reached the first entry (0)
    const lastEntryRevealed = resultDisplayOrder === 'first-to-last'
      ? revealedIdx >= lastChain.entries.length - 1
      : revealedIdx === 0;
    
    return lastChainRevealed && lastEntryRevealed;
  })();

  // Check if reveal has started (at least one entry has been revealed)
  // For first-to-last: started when revealedEntryIndices[0] >= 0
  // For last-to-first: started when revealedEntryIndices[0] >= 0 (any valid index means started)
  const hasRevealStarted = revealedChainIndex > 0 || (revealedEntryIndices[0] ?? -1) >= 0;
  
  // During reveal: everyone uses the synced display order from host
  // After all revealed: everyone can use their own local display order
  const displayOrder = (hasRevealStarted && !isAllRevealed) 
    ? resultDisplayOrder  // During reveal: synced from host
    : (isAllRevealed ? localDisplayOrder : resultDisplayOrder);  // After reveal: local choice

  // Determine which chain to display
  // During reveal, everyone follows resultChainIndex. After all revealed, guests can browse freely.
  const displayChainIndex = !isAllRevealed ? resultChainIndex : (isHost ? resultChainIndex : localChainIndex);
  const currentChain = chains[displayChainIndex];

  // Initialize display order from settings (only once on mount)
  useEffect(() => {
    const defaultOrder = room?.settings?.normalSettings?.resultOrder === 'last' ? 'last-to-first' : 'first-to-last';
    setLocalDisplayOrder(defaultOrder);
    if (isHost && chains.length > 0) {
      setResultDisplayOrder(defaultOrder);
      // Do NOT reveal anything on load. Start with entryIndex = -1.
      if (resultEntryIndices[0] === undefined) {
        setResultPosition(0, -1);
        send({
          type: 'result_navigate',
          payload: { chainIndex: 0, entryIndex: -1, displayOrder: defaultOrder },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chains.length, isHost]);
  
  // Sync local display order with store when it changes (for non-host during reveal)
  useEffect(() => {
    if (!isHost && !isAllRevealed) {
      setLocalDisplayOrder(resultDisplayOrder);
    }
  }, [resultDisplayOrder, isHost, isAllRevealed]);
  
  // Calculate visible range for the current chain based on current position and display order
  const getVisibleRange = (chainIdx: number): { min: number; max: number } => {
    const chain = chains[chainIdx];
    if (!chain) return { min: 0, max: -1 };

    const lastIndex = chain.entries.length - 1;

    // All revealed - show everything
    if (isAllRevealed) {
      return { min: 0, max: lastIndex };
    }

    // For chains not yet reached in reveal (use resultChainIndex, not displayChainIndex)
    if (chainIdx > resultChainIndex) {
      return { min: 0, max: -1 }; // Not yet revealed
    }

    // For any chain (current or previous), use the stored entry index
    const storedIndex = resultEntryIndices[chainIdx];
    // If not initialized yet, or explicitly hidden (-1), don't show anything
    if (storedIndex === undefined || storedIndex < 0) {
      return { min: 0, max: -1 };
    }
    
    // Use the stored index to determine the visible range
    // The display order determines how we interpret the stored index
    if (resultDisplayOrder === 'first-to-last') {
      // Normal order: show from 0 up to storedIndex
      return { min: 0, max: storedIndex };
    } else {
      // Reverse order: show from storedIndex down to lastIndex
      return { min: storedIndex, max: lastIndex };
    }
  };

  const { min: minVisibleIndex, max: maxVisibleIndex } = getVisibleRange(displayChainIndex);
  const visibleEntries = (currentChain?.entries ?? []).filter(
    (_, idx) => idx >= minVisibleIndex && idx <= maxVisibleIndex
  );
  // In reverse order, show the entries in reverse order (last shown first visually)
  const orderedEntries =
    displayOrder === 'last-to-first' ? [...visibleEntries].reverse() : visibleEntries;

  const getPlayerName = (pid: string) => {
    return players.find((p) => p.id === pid)?.name || '不明';
  };

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
  }, [displayChainIndex, orderedEntries.length]);

  const handleNext = () => {
    if (!isHost) return;

    // Use resultChainIndex to get the current chain, not displayChainIndex
    const chain = chains[resultChainIndex];
    if (!chain) return;

    const lastIndex = chain.entries.length - 1;
    let newChainIndex = resultChainIndex;
    let newEntryIndex = resultEntryIndex;

    if (resultDisplayOrder === 'first-to-last') {
      // Normal order: go from 0 -> 1 -> 2 -> ... -> lastIndex
      if (resultEntryIndex < 0) {
        // Reveal the first item
        newEntryIndex = 0;
      } else if (resultEntryIndex < lastIndex) {
        // Still have more entries in current chain
        newEntryIndex = resultEntryIndex + 1;
      } else if (resultChainIndex < chains.length - 1) {
        // Move to next chain. Start hidden (-1); Next reveals the first item.
        newChainIndex = resultChainIndex + 1;
        newEntryIndex = -1;
      } else {
        return; // Already at the end
      }
    } else {
      // Reverse order: go from lastIndex -> lastIndex-1 -> ... -> 0
      if (resultEntryIndex < 0) {
        // Reveal the first item in reverse (the last entry)
        newEntryIndex = lastIndex;
      } else if (resultEntryIndex > 0) {
        // Still have more entries in current chain (going backwards)
        newEntryIndex = resultEntryIndex - 1;
      } else if (resultChainIndex < chains.length - 1) {
        // Move to next chain. Start hidden (-1); Next reveals the first item.
        newChainIndex = resultChainIndex + 1;
        newEntryIndex = -1;
      } else {
        return; // Already at the end
      }
    }

    setResultPosition(newChainIndex, newEntryIndex);
    // Only mark revealed when actually showing an item
    if (newEntryIndex >= 0) {
      updateRevealedPosition(newChainIndex, newEntryIndex, resultDisplayOrder);
    }
    send({
      type: 'result_navigate',
      payload: { chainIndex: newChainIndex, entryIndex: newEntryIndex, displayOrder: resultDisplayOrder },
    });
  };

  const handlePrev = () => {
    if (!isHost) return;
    
    // Use resultChainIndex to get the current chain
    const chain = chains[resultChainIndex];
    if (!chain) return;
    
    let newChainIndex = resultChainIndex;
    let newEntryIndex = resultEntryIndex;

    if (resultDisplayOrder === 'first-to-last') {
      // Normal order: go backwards from current index
      if (resultEntryIndex > 0) {
        // Go back within current chain
        newEntryIndex = resultEntryIndex - 1;
      } else if (resultEntryIndex === 0) {
        // Hide all again
        newEntryIndex = -1;
      } else if (resultChainIndex > 0) {
        // Go to previous chain
        newChainIndex = resultChainIndex - 1;
        newEntryIndex = resultEntryIndices[newChainIndex] ?? -1;
      } else {
        return; // Already at the beginning
      }
    } else {
      // Reverse order: go forward in index (backwards in reveal order)
      const lastIndex = chain.entries.length - 1;
      if (resultEntryIndex < 0) {
        // Already hidden; go to previous chain if any
        if (resultChainIndex > 0) {
          newChainIndex = resultChainIndex - 1;
          newEntryIndex = resultEntryIndices[newChainIndex] ?? -1;
        } else {
          return;
        }
      } else if (resultEntryIndex < lastIndex) {
        // Go back within current chain (increase index)
        newEntryIndex = resultEntryIndex + 1;
      } else if (resultEntryIndex === lastIndex) {
        // Hide all again
        newEntryIndex = -1;
      } else if (resultChainIndex > 0) {
        // Go to previous chain
        newChainIndex = resultChainIndex - 1;
        newEntryIndex = resultEntryIndices[newChainIndex] ?? -1;
      } else {
        return; // Already at the beginning
      }
    }

    setResultPosition(newChainIndex, newEntryIndex);
    send({
      type: 'result_navigate',
      payload: { chainIndex: newChainIndex, entryIndex: newEntryIndex, displayOrder: resultDisplayOrder },
    });
  };

  const handleBackToLobby = () => {
    // Send return_to_lobby to reset player's ready state on server
    send({ type: 'return_to_lobby', payload: {} });
    resetGame();
    navigate(`/room/${roomId}`);
  };

  // Host jumping to chain
  const hostJumpToChain = (chainIndex: number) => {
    if (!isHost) return;
    const targetChain = chains[chainIndex];
    if (!targetChain) return;
    
    // Keep per-chain state; if not initialized, stay hidden.
    const entryIndex = resultEntryIndices[chainIndex] ?? -1;
    
    setResultPosition(chainIndex, entryIndex);
    if (chainIndex > resultChainIndex && entryIndex >= 0) {
      updateRevealedPosition(chainIndex, entryIndex, resultDisplayOrder);
    }
    send({
      type: 'result_navigate',
      payload: { chainIndex, entryIndex, displayOrder: resultDisplayOrder },
    });
  };

  // Non-host switching between revealed chains
  const switchToChain = (chainIndex: number) => {
    setLocalChainIndex(chainIndex);
  };

  const toggleDisplayOrder = () => {
    if (!isHost && !isAllRevealed) return; // Only host or after all revealed can toggle
    
    const newOrder = localDisplayOrder === 'first-to-last' ? 'last-to-first' : 'first-to-last';
    setLocalDisplayOrder(newOrder);
    
    // If host (regardless of reveal state), sync with everyone and reset ALL chains
    if (isHost) {
      setResultDisplayOrder(newOrder);
      // Reset all chains and start from chain 0 with new order
      resetAllEntryIndices();
      // Start hidden; Next reveals according to new order.
      const newEntryIndex = -1;
      setResultPosition(0, newEntryIndex);
      send({
        type: 'result_navigate',
        payload: { 
          chainIndex: 0, 
          entryIndex: newEntryIndex, 
          displayOrder: newOrder 
        },
      });
    }
  };

  // Calculate current visible entry number for display
  const getCurrentEntryDisplay = () => {
    const totalEntries = currentChain?.entries.length ?? 0;
    if (resultEntryIndex < 0) {
      return `0 / ${totalEntries}`;
    }
    if (displayOrder === 'first-to-last') {
      // In normal order, resultEntryIndex 0 means we're showing entry 1
      return `${resultEntryIndex + 1} / ${totalEntries}`;
    } else {
      // In reverse order, resultEntryIndex goes from lastIndex down to 0
      // When at lastIndex, we've shown 1 entry; when at 0, we've shown all
      const shownCount = totalEntries - resultEntryIndex;
      return `${shownCount} / ${totalEntries}`;
    }
  };

  // isFirst: at the very beginning
  const isFirst = resultChainIndex === 0 && resultEntryIndex < 0;
  
  // isLast: at the very end (last chain, revealed to the end)
  const isLast = (() => {
    if (resultChainIndex !== chains.length - 1) return false;
    const lastChain = chains[chains.length - 1];
    if (!lastChain) return false;
    
    if (displayOrder === 'first-to-last') {
      return resultEntryIndex === lastChain.entries.length - 1;
    } else {
      return resultEntryIndex === 0;
    }
  })();

  if (!currentChain || chains.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 text-4xl">🎨</div>
          <p className="text-gray-600">結果を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white p-4 shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-700">🎉 結果発表</h1>
          <p className="mt-1 text-gray-600">
            チェーン {displayChainIndex + 1} / {chains.length}
            <span className="ml-2 text-sm">
              （{getPlayerName(currentChain.ownerPlayerId)} のお題）
            </span>
          </p>
        </div>

        {/* Chain selector */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 overflow-x-auto">
          <div className="flex flex-wrap items-center gap-2">
            {chains.map((chain, idx) => {
              const isAccessible = isHost || isAllRevealed || idx <= revealedChainIndex;
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

          <button
            onClick={toggleDisplayOrder}
            disabled={!isHost && !isAllRevealed}
            className={`flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold shadow-sm transition ${
              !isHost && !isAllRevealed
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-white text-gray-700 hover:-translate-y-0.5 hover:shadow'
            }`}
          >
            表示順: {displayOrder === 'first-to-last' ? '最初 → 最後' : '最後 → 最初'}
          </button>
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
          {orderedEntries.map((entry, idx) => {
            const isLastVisible = idx === orderedEntries.length - 1;
            const isCurrentUser = entry.authorId === playerId;

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
                  <span>{entry.type === 'text' ? '📝' : '🎨'}</span>
                  <span>{getPlayerName(entry.authorId)}</span>
                </div>

                {/* Entry content */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow ${
                    isCurrentUser ? 'bg-primary-100' : 'bg-white'
                  } ${isLastVisible && !isAllRevealed ? 'animate-fade-in' : ''}`}
                >
                  {entry.type === 'text' ? (
                    <p className="text-lg font-medium text-gray-800">{entry.payload}</p>
                  ) : entry.payload ? (
                    <img
                      src={entry.payload}
                      alt="描かれた絵"
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
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex-shrink-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        {isHost ? (
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
                次へ →
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
