import { describe, expect, it } from 'vitest';
import {
  cleanupGame,
  getChains,
  initializeGame,
  setGameCallbacks,
  startPhase,
  submitDrawing,
  submitGuess,
  submitPrompt,
} from '../src/application/gameUseCases.js';
import { addPlayerToRoom, createRoom, startGame, togglePlayerReady } from '../src/application/roomUseCases.js';

describe('Normal mode turn rotation', () => {
  it('rotates turns for 7 players with alternating prompt/drawing entries', () => {
    const room = createRoom();
    const playerIds: string[] = [];

    for (let i = 0; i < 7; i++) {
      const joined = addPlayerToRoom(room.id, `P${i + 1}`);
      expect(joined).not.toBeNull();
      playerIds.push(joined!.playerId);
      togglePlayerReady(room.id, joined!.playerId);
    }

    const started = startGame(room.id, room.hostId);
    expect(started).not.toBeNull();

    setGameCallbacks({
      onPhaseChanged: () => {},
      onSubmissionReceived: () => {},
      onPhaseComplete: () => {},
      onReceiveContent: () => {},
      onTimerSync: () => {},
      onGameResult: () => {},
    });

    const initialized = initializeGame(room.id);
    expect(initialized).not.toBeNull();
    startPhase(room.id, initialized!.initialPhase);

    for (const playerId of playerIds) {
      expect(submitPrompt(room.id, playerId, `prompt-${playerId}`)).toBe(true);
    }

    // 交互進行を最後まで回す（最大20ステップでガード）
    for (let step = 0; step < 20; step++) {
      if (room.currentPhase === 'result') break;

      if (room.currentPhase === 'drawing') {
        for (const playerId of playerIds) {
          expect(submitDrawing(room.id, playerId, `img-${step}-${playerId}`)).toBe(true);
        }
        continue;
      }

      if (room.currentPhase === 'guessing') {
        for (const playerId of playerIds) {
          expect(submitGuess(room.id, playerId, `guess-${step}-${playerId}`)).toBe(true);
        }
        continue;
      }
    }

    expect(room.currentPhase).toBe('result');

    const roomChains = getChains(room.id);
    expect(roomChains).toBeDefined();

    for (const chain of roomChains ?? []) {
      expect(chain.entries[0]?.type).toBe('text');
      for (let i = 1; i < chain.entries.length; i++) {
        expect(chain.entries[i].type).not.toBe(chain.entries[i - 1].type);
      }
    }

    cleanupGame(room.id);
  });
});
