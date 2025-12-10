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
    resultEntryIndex,
    revealedChainIndex,
    revealedEntryIndices,
    setResultPosition,
    updateRevealedPosition,
    reset: resetGame,
  } = useGameStore();
  const { room, playerId } = useRoomStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastEntryRef = useRef<HTMLDivElement>(null);

  // Local viewing state for non-host users
  const [localChainIndex, setLocalChainIndex] = useState(0);
  
  const players = resultPlayers.length > 0 ? resultPlayers : room?.players || [];
  const isHost = room?.hostId === playerId;
  
  // Check if all content has been revealed
  const isAllRevealed = revealedChainIndex === chains.length - 1 && 
    (revealedEntryIndices[chains.length - 1] ?? 0) >= (chains[chains.length - 1]?.entries.length ?? 1) - 1;

  // Determine which chain to display
  const displayChainIndex = isHost || !isAllRevealed ? resultChainIndex : localChainIndex;
  const currentChain = chains[displayChainIndex];
  
  // Get visible entries count for current chain
  const getVisibleEntriesCount = (chainIdx: number) => {
    if (isAllRevealed) {
      // All revealed - show all entries
      return chains[chainIdx]?.entries.length ?? 0;
    }
    if (chainIdx < resultChainIndex) {
      // Previous chains are fully visible
      return chains[chainIdx]?.entries.length ?? 0;
    }
    if (chainIdx === resultChainIndex) {
      // Current chain shows up to current entry
      return resultEntryIndex + 1;
    }
    // Future chains not visible yet
    return 0;
  };
  
  const visibleEntriesCount = getVisibleEntriesCount(displayChainIndex);

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
  }, [displayChainIndex, visibleEntriesCount]);

  const handleNext = () => {
    if (!currentChain || !isHost) return;

    let newChainIndex = resultChainIndex;
    let newEntryIndex = resultEntryIndex;

    if (resultEntryIndex < currentChain.entries.length - 1) {
      newEntryIndex = resultEntryIndex + 1;
    } else if (resultChainIndex < chains.length - 1) {
      newChainIndex = resultChainIndex + 1;
      newEntryIndex = 0;
    } else {
      return; // Already at the end
    }

    setResultPosition(newChainIndex, newEntryIndex);
    updateRevealedPosition(newChainIndex, newEntryIndex);
    send({
      type: 'result_navigate',
      payload: { chainIndex: newChainIndex, entryIndex: newEntryIndex },
    });
  };

  const handlePrev = () => {
    if (!isHost) return;
    
    let newChainIndex = resultChainIndex;
    let newEntryIndex = resultEntryIndex;

    if (resultEntryIndex > 0) {
      newEntryIndex = resultEntryIndex - 1;
    } else if (resultChainIndex > 0) {
      newChainIndex = resultChainIndex - 1;
      newEntryIndex = chains[resultChainIndex - 1].entries.length - 1;
    } else {
      return; // Already at the beginning
    }

    setResultPosition(newChainIndex, newEntryIndex);
    send({
      type: 'result_navigate',
      payload: { chainIndex: newChainIndex, entryIndex: newEntryIndex },
    });
  };

  const handleBackToLobby = () => {
    // Send return_to_lobby to reset player's ready state on server
    send({ type: 'return_to_lobby', payload: {} });
    resetGame();
    navigate(`/room/${roomId}`);
  };

  // Host jumping to chain (while revealing)
  const hostJumpToChain = (chainIndex: number) => {
    if (!isHost) return;
    const entryIndex = chains[chainIndex]?.entries.length ? chains[chainIndex].entries.length - 1 : 0;
    setResultPosition(chainIndex, entryIndex);
    updateRevealedPosition(chainIndex, entryIndex);
    send({
      type: 'result_navigate',
      payload: { chainIndex, entryIndex },
    });
  };

  // Non-host switching between revealed chains
  const switchToChain = (chainIndex: number) => {
    setLocalChainIndex(chainIndex);
  };

  const isFirst = resultChainIndex === 0 && resultEntryIndex === 0;
  const isLast =
    resultChainIndex === chains.length - 1 &&
    resultEntryIndex === (chains[chains.length - 1]?.entries.length ?? 1) - 1;

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
        <div className="mt-3 flex justify-center gap-2 overflow-x-auto">
          {chains.map((chain, idx) => {
            // Determine if this chain is accessible
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
        
        {isAllRevealed && !isHost && (
          <p className="mt-2 text-center text-xs text-gray-500">
            自由に他のチェーンを見られます
          </p>
        )}
      </div>

      {/* Chat-like entries display */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {currentChain.entries.slice(0, visibleEntriesCount).map((entry, idx) => {
            const isLastVisible = idx === visibleEntriesCount - 1;
            const isCurrentUser = entry.authorId === playerId;

            return (
              <div
                key={idx}
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
              {resultEntryIndex + 1} / {chains[resultChainIndex]?.entries.length ?? 0}
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
