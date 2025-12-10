import { useCallback } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { wsManager } from '@/shared/lib/websocket';

export function useWebSocket(roomId: string | null) {
  const connect = useCallback(() => {
    if (!roomId) return;
    wsManager.connect(roomId);
  }, [roomId]);

  const send = useCallback((event: Parameters<typeof wsManager.send>[0]) => {
    wsManager.send(event);
  }, []);

  const submitPrompt = useCallback((text: string) => {
    wsManager.send({ type: 'submit_prompt', payload: { text } });
    useGameStore.getState().setHasSubmitted(true);
  }, []);

  const submitDrawing = useCallback((imageData: string) => {
    wsManager.send({ type: 'submit_drawing', payload: { imageData } });
    useGameStore.getState().setHasSubmitted(true);
  }, []);

  const submitGuess = useCallback((text: string) => {
    wsManager.send({ type: 'submit_guess', payload: { text } });
    useGameStore.getState().setHasSubmitted(true);
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  return { connect, send, disconnect, submitPrompt, submitDrawing, submitGuess, isReconnecting: wsManager.getIsReconnecting() };
}
