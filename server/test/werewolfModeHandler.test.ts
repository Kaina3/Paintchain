import { describe, expect, it } from 'vitest';
import { WerewolfModeHandler } from '../src/application/gameModes/werewolfMode.js';
import { createDefaultSettings, type Room } from '../src/domain/entities.js';

function createRoom(rounds: number): Room {
  const settings = createDefaultSettings();
  settings.gameMode = 'werewolf';
  settings.werewolfSettings.drawingRounds = rounds;

  return {
    id: 'room-test',
    status: 'waiting',
    hostId: 'p1',
    players: [
      { id: 'p1', name: 'A', ready: true, connected: true, color: '#111111' },
      { id: 'p2', name: 'B', ready: true, connected: true, color: '#222222' },
      { id: 'p3', name: 'C', ready: true, connected: true, color: '#333333' },
    ],
    settings,
    createdAt: new Date(),
  };
}

describe('WerewolfModeHandler', () => {
  it('builds phase list based on drawing rounds', () => {
    const handler = new WerewolfModeHandler();
    const room = createRoom(2);

    expect(handler.getPhases(room)).toEqual([
      'werewolf_assign',
      'werewolf_drawing',
      'werewolf_reveal',
      'werewolf_discussion',
      'werewolf_drawing',
      'werewolf_reveal',
      'werewolf_discussion',
      'werewolf_voting',
    ]);
  });

  it('moves from voting directly to result', () => {
    const handler = new WerewolfModeHandler();
    expect(handler.getNextPhase('werewolf_voting', 0, 0)).toBe('result');
  });

  it('uses configured time limits', () => {
    const handler = new WerewolfModeHandler();
    const room = createRoom(1);

    expect(handler.getTimeLimit('werewolf_assign', room.settings)).toBe(room.settings.werewolfSettings.assignTimeSec);
    expect(handler.getTimeLimit('werewolf_reveal', room.settings)).toBe(room.settings.werewolfSettings.revealTimeSec * 8);
  });
});
