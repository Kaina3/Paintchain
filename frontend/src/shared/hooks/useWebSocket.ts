import { useCallback } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { wsManager } from '@/shared/lib/websocket';
import type { DrawingStroke } from '@/shared/types';

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

  const submitDrawing = useCallback((imageData: string, strokes?: DrawingStroke[]) => {
    wsManager.send({ type: 'submit_drawing', payload: { imageData, strokes } });
    useGameStore.getState().setHasSubmitted(true);
  }, []);

  const submitShiritori = useCallback((imageData: string | null, answer: string | null) => {
    if (!imageData && !answer) return;
    wsManager.send({ type: 'submit_shiritori', payload: { imageData, answer } });
  }, []);

  const submitGuess = useCallback((text: string) => {
    wsManager.send({ type: 'submit_guess', payload: { text } });
    useGameStore.getState().setHasSubmitted(true);
  }, []);

  const submitQuizGuess = useCallback((text: string) => {
    wsManager.send({ type: 'submit_quiz_guess', payload: { text } });
  }, []);

  // 人狼モード用
  const sendWerewolfVote = useCallback((targetId: string) => {
    wsManager.send({ type: 'werewolf_vote', payload: { targetId } });
  }, []);

  const sendWerewolfChat = useCallback((message: string) => {
    wsManager.send({ type: 'werewolf_chat', payload: { message } });
  }, []);

  const sendWerewolfGuess = useCallback((guess: string) => {
    wsManager.send({ type: 'werewolf_guess_prompt', payload: { guess } });
  }, []);

  const endWerewolfDiscussion = useCallback(() => {
    wsManager.send({ type: 'werewolf_end_discussion', payload: {} });
  }, []);

  const advanceWerewolfReveal = useCallback(() => {
    wsManager.send({ type: 'werewolf_advance_reveal', payload: {} });
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  return {
    connect,
    send,
    disconnect,
    submitPrompt,
    submitDrawing,
    submitShiritori,
    submitGuess,
    submitQuizGuess,
    sendWerewolfVote,
    sendWerewolfChat,
    sendWerewolfGuess,
    endWerewolfDiscussion,
    advanceWerewolfReveal,
    isReconnecting: wsManager.getIsReconnecting(),
  };
}
