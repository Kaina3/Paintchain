import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { PromptInput } from '@/features/game/components/PromptInput';
import { DrawingCanvas } from '@/features/game/components/DrawingCanvas';
import { GuessInput } from '@/features/game/components/GuessInput';
import { GameResult } from '@/features/game/components/GameResult';
import { AnimationResult } from '@/features/game/components/AnimationResult';
import { ShiritoriDrawing } from '@/features/game/components/ShiritoriDrawing';
import { ShiritoriResult } from '@/features/game/components/ShiritoriResult';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connect, send, submitPrompt, submitDrawing, submitGuess } = useWebSocket(roomId ?? null);
  const { room, playerId } = useRoomStore();
  const { phase } = useGameStore();

  const playerName = sessionStorage.getItem('playerName');

  useEffect(() => {
    if (!playerName || !room) {
      navigate('/');
      return;
    }

    if (!playerId) {
      connect();
    }

    return () => {
      // Don't disconnect on unmount if game is in progress
    };
  }, [connect, navigate, playerName, room, playerId]);

  const handleRetry = useCallback(() => {
    send({ type: 'unmark_ready', payload: {} });
  }, [send]);

  // If no phase yet, show loading
  if (!phase) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-bounce">🎮</div>
          <p className="mt-4 text-gray-600">ゲーム開始を待っています...</p>
        </div>
      </div>
    );
  }

  const gameMode = room?.settings.gameMode ?? 'normal';

  if (gameMode === 'shiritori') {
    if (phase === 'drawing') return <ShiritoriDrawing />;
    if (phase === 'result') return <ShiritoriResult />;
  }

  switch (phase) {
    case 'prompt':
      return <PromptInput onSubmit={submitPrompt} onRetry={handleRetry} />;
    case 'first-frame':
    case 'drawing':
      return <DrawingCanvas onSubmit={submitDrawing} onRetry={handleRetry} />;
    case 'guessing':
      return <GuessInput onSubmit={submitGuess} />;
    case 'result':
      return gameMode === 'animation' ? <AnimationResult /> : <GameResult />;
    default:
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">不明なフェーズです</p>
        </div>
      );
  }
}
