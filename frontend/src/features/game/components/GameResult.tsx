import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/features/game/store/gameStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { DrawingTimelapse } from '@/features/game/components/DrawingTimelapse';
import museumBg from '@/assets/museum_simple.png';

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
  // All revealed when we've shown all entries of ALL chains
  const isAllRevealed = (() => {
    if (chains.length === 0) return false;
    
    // Check if every chain has been fully revealed
    return chains.every((chain, chainIdx) => {
      const revealedIdx = revealedEntryIndices[chainIdx] ?? -1;
      
      // Not revealed at all
      if (revealedIdx < 0) return false;
      
      // For first-to-last: fully revealed when we've reached the last entry
      // For last-to-first: fully revealed when we've reached the first entry (0)
      if (resultDisplayOrder === 'first-to-last') {
        return revealedIdx >= chain.entries.length - 1;
      } else {
        return revealedIdx === 0;
      }
    });
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
      } else {
        // Current chain fully revealed - no automatic chain switching
        return;
      }
    } else {
      // Reverse order: go from lastIndex -> lastIndex-1 -> ... -> 0
      if (resultEntryIndex < 0) {
        // Reveal the first item in reverse (the last entry)
        newEntryIndex = lastIndex;
      } else if (resultEntryIndex > 0) {
        // Still have more entries in current chain (going backwards)
        newEntryIndex = resultEntryIndex - 1;
      } else {
        // Current chain fully revealed - no automatic chain switching
        return;
      }
    }

    setResultPosition(newChainIndex, newEntryIndex);
    // Always update revealed position when showing an entry
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
      } else {
        // Already hidden - can't go back further in this chain
        return;
      }
    } else {
      // Reverse order: go forward in index (backwards in reveal order)
      const lastIndex = chain.entries.length - 1;
      if (resultEntryIndex < 0) {
        // Already hidden - can't go back further
        return;
      } else if (resultEntryIndex < lastIndex) {
        // Go back within current chain (increase index)
        newEntryIndex = resultEntryIndex + 1;
      } else if (resultEntryIndex === lastIndex) {
        // Hide all again
        newEntryIndex = -1;
      } else {
        return;
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

  // Host jumping to chain - allow jumping to any chain regardless of order
  const hostJumpToChain = (chainIndex: number) => {
    if (!isHost) return;
    const targetChain = chains[chainIndex];
    if (!targetChain) return;
    
    // Keep per-chain state; if not initialized, stay hidden.
    const entryIndex = resultEntryIndices[chainIndex] ?? -1;
    
    setResultPosition(chainIndex, entryIndex);
    // No need to track revealedChainIndex anymore since we can jump freely
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

  // isFirst: at the very beginning of current chain
  const isFirst = resultEntryIndex < 0;
  
  // isLast: at the very end of current chain
  const isLast = (() => {
    const currentChainData = chains[resultChainIndex];
    if (!currentChainData) return false;
    
    if (displayOrder === 'first-to-last') {
      return resultEntryIndex === currentChainData.entries.length - 1;
    } else {
      return resultEntryIndex === 0;
    }
  })();

  if (!currentChain || chains.length === 0) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${museumBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/10 z-[1]" />
        <div className="relative z-10 text-center">
          <div className="mb-4 text-4xl">🎨</div>
          <p 
            className="text-amber-100 font-serif"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
          >
            Loading gallery...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative flex flex-col"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/10 z-[1]" />

      {/* Header */}
      <div className="relative z-10 flex-shrink-0 bg-stone-800/90 backdrop-blur-md p-4 shadow-lg border-b-2 border-amber-700/50">
        <div className="text-center">
          <h1 
            className="text-2xl font-serif font-bold text-amber-100"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
          >
            🎉 THE GRAND EXHIBITION
          </h1>
          <p 
            className="mt-1 text-amber-200/80 font-serif italic"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}
          >
            Gallery {displayChainIndex + 1} / {chains.length}
            <span className="ml-2 text-sm">
              （Theme by {getPlayerName(currentChain.ownerPlayerId)}）
            </span>
          </p>
        </div>

        {/* Chain selector */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 overflow-x-auto">
          <div className="flex flex-wrap items-center gap-2">
            {chains.map((chain, idx) => {
              // Host can always access any chain, non-host can only access revealed chains or after all revealed
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
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-sm font-serif font-bold transition ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow-lg'
                      : isAccessible
                        ? 'bg-stone-700/80 text-stone-300 hover:bg-stone-600/80 border border-stone-600'
                        : 'bg-stone-800/50 text-stone-500 border border-stone-700'
                  }`}
                  style={isSelected ? { textShadow: '1px 1px 2px rgba(0,0,0,0.3)' } : {}}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={toggleDisplayOrder}
            disabled={!isHost && !isAllRevealed}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-serif font-semibold shadow-sm transition ${
              !isHost && !isAllRevealed
                ? 'cursor-not-allowed bg-stone-700/50 text-stone-500 border-stone-600'
                : 'bg-stone-700/80 text-amber-100 border-amber-700/50 hover:bg-stone-600/80'
            }`}
          >
            Order: {displayOrder === 'first-to-last' ? 'First → Last' : 'Last → First'}
          </button>
        </div>
        
        {isAllRevealed && !isHost && (
          <p className="mt-2 text-center text-xs text-amber-200/70 font-serif italic">
            You can now freely browse all galleries
          </p>
        )}
      </div>

      {/* Chat-like entries display */}
      <div ref={scrollContainerRef} className="relative z-10 flex-1 overflow-y-auto p-4">
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
                  className={`mb-1 flex items-center gap-1 text-sm font-serif ${
                    isCurrentUser ? 'flex-row-reverse text-amber-200' : 'text-amber-100'
                  }`}
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  <span>{entry.type === 'text' ? '📝' : '🎨'}</span>
                  <span>{getPlayerName(entry.authorId)}</span>
                </div>

                {/* Entry content - Museum frame style */}
                <div
                  className={`max-w-[85%] rounded-lg p-1 shadow-2xl ${
                    isLastVisible && !isAllRevealed ? 'animate-fade-in' : ''
                  }`}
                  style={{ 
                    border: '4px solid transparent',
                    borderImage: isCurrentUser 
                      ? 'linear-gradient(135deg, #c4a574 0%, #8b7355 50%, #c4a574 100%) 1'
                      : 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <div className={`rounded p-4 ${isCurrentUser ? 'bg-amber-50/95' : 'bg-white/95'} backdrop-blur-sm`}>
                    {entry.type === 'text' ? (
                      <p className="text-lg font-serif font-medium text-stone-800">{entry.payload}</p>
                    ) : entry.payload ? (
                      <div className="flex flex-col gap-2">
                        {/* ストローク履歴がある場合はタイムラプス表示、なければ通常の画像 */}
                        {entry.strokes && entry.strokes.length > 0 ? (
                          <DrawingTimelapse
                            strokes={entry.strokes}
                            finalImage={entry.payload}
                            maxWidth={300}
                            maxHeight={225}
                            autoPlay={true}
                          />
                        ) : (
                          <img
                            src={entry.payload}
                            alt="描かれた絵"
                            className="max-h-64 rounded-lg"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                        <div className="text-center font-serif">
                          <div className="text-3xl">⏰</div>
                          <p className="mt-1 text-sm italic">Time expired</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="relative z-10 flex-shrink-0 bg-stone-800/90 backdrop-blur-md p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-t-2 border-amber-700/50">
        {isHost ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className="rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 px-4 py-3 font-serif font-semibold text-stone-200 
                         hover:from-stone-500 hover:to-stone-600 disabled:opacity-50 border-2 border-stone-500 transition-all"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                ← Previous
              </button>

              <div className="text-center text-sm text-amber-200 font-serif">
                {getCurrentEntryDisplay()}
              </div>

              {isLast ? (
                <button
                  disabled
                  className="rounded-lg bg-stone-700/50 px-4 py-3 font-serif font-semibold text-stone-500 border-2 border-stone-600"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-3 font-serif font-semibold text-amber-100 
                           hover:from-amber-600 hover:to-amber-700 border-2 border-amber-600/50 transition-all"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                >
                  Next →
                </button>
              )}
            </div>
            
            {isAllRevealed ? (
              <button
                onClick={handleBackToLobby}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-800 px-4 py-3 font-serif font-bold text-emerald-100 
                         hover:from-emerald-600 hover:to-emerald-700 border-2 border-emerald-600/50 transition-all"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                🏛️ Return to Lobby
              </button>
            ) : isLast ? (
              <p className="text-center text-sm text-amber-200/70 font-serif italic">
                Select another gallery to continue the exhibition
              </p>
            ) : null}
          </div>
        ) : isAllRevealed ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => switchToChain(Math.max(0, localChainIndex - 1))}
              disabled={localChainIndex === 0}
              className="rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 px-4 py-3 font-serif font-semibold text-stone-200 
                       hover:from-stone-500 hover:to-stone-600 disabled:opacity-50 border-2 border-stone-500 transition-all"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              ← Prev
            </button>

            <button
              onClick={handleBackToLobby}
              className="rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-800 px-4 py-3 font-serif font-bold text-emerald-100 
                       hover:from-emerald-600 hover:to-emerald-700 border-2 border-emerald-600/50 transition-all"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              🏛️ Return to Lobby
            </button>

            <button
              onClick={() => switchToChain(Math.min(chains.length - 1, localChainIndex + 1))}
              disabled={localChainIndex === chains.length - 1}
              className="rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 px-4 py-3 font-serif font-semibold text-stone-200 
                       hover:from-stone-500 hover:to-stone-600 disabled:opacity-50 border-2 border-stone-500 transition-all"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              Next →
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-2 text-sm text-amber-200/70 font-serif italic">
              The curator is presenting the exhibition...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
