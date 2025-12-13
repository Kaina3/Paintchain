import type { Chain, GamePhase, Room } from '../../domain/entities.js';
import type {
  ContentPayload,
  GameModeHandler,
  SubmissionData,
} from '../../domain/gameMode.js';

export class NormalModeHandler implements GameModeHandler {
  getPhases(): GamePhase[] {
    return ['prompt', 'drawing', 'guessing'];
  }

  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number): GamePhase | 'result' {
    if (currentPhase === 'prompt') return 'drawing';
    if (currentPhase === 'drawing') {
      return turn < totalTurns - 1 ? 'guessing' : 'result';
    }
    if (currentPhase === 'guessing') {
      return turn < totalTurns - 1 ? 'drawing' : 'result';
    }
    return 'result';
  }

  getTimeLimit(phase: GamePhase, settings: Room['settings']): number {
    const normalSettings = settings.normalSettings;
    switch (phase) {
      case 'prompt':
        return normalSettings.promptTimeSec;
      case 'drawing':
        return normalSettings.drawingTimeSec;
      case 'guessing':
        return normalSettings.guessTimeSec;
      default:
        return 60;
    }
  }

  initializeGame(room: Room): void {
    room.currentPhase = 'prompt';
    room.currentTurn = 0;
    room.totalTurns = room.players.length;
  }

  distributeContent(room: Room, chains: Chain[]): Map<string, ContentPayload> {
    const payloads = new Map<string, ContentPayload>();
    if (room.currentPhase === 'prompt') return payloads;

    const turn = room.currentTurn ?? 0;
    const playerCount = room.players.length;

    // チェーンはプレイヤー順に作成されている（chains[i]はplayers[i]のチェーン）
    // turn番目のフェーズ: プレイヤーiは(i+turn)%nのチェーンから受け取る
    // これにより、ターンが進むごとに異なるプレイヤーのチェーンを受け取る
    room.players.forEach((player, index) => {
      // (index + turn) で、ターンが進むごとに次のチェーンを受け取る
      const chainIndex = (index + turn) % playerCount;
      const chain = chains[chainIndex];
      const lastEntry = chain.entries[chain.entries.length - 1];

      if (lastEntry) {
        payloads.set(player.id, {
          type: lastEntry.type,
          payload: lastEntry.payload,
        });
      }
    });

    return payloads;
  }

  handleSubmission(room: Room, playerId: string, data: SubmissionData, chains: Chain[]): boolean {
    const phase = room.currentPhase;
    if (!phase) return false;

    const playerCount = room.players.length;
    const turn = room.currentTurn ?? 0;
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return false;

    if (phase === 'prompt') {
      const playerChain = chains.find((c) => c.ownerPlayerId === playerId);
      if (!playerChain) return false;

      const existingEntry = playerChain.entries.find((e) => e.authorId === playerId && e.type === 'text' && e.order === 0);
      if (existingEntry) {
        existingEntry.payload = data.payload.trim() || '(お題なし)';
        existingEntry.submittedAt = new Date();
      } else {
        playerChain.entries.push({
          order: 0,
          type: 'text',
          authorId: playerId,
          payload: data.payload.trim() || '(お題なし)',
          submittedAt: new Date(),
        });
      }
      return true;
    }

    // distributeContentと同じロジックでチェーンを決定
    // プレイヤーiはターンごとに (i + turn) % playerCount のチェーンに書き込む
    const chainIndex = (playerIndex + turn) % playerCount;
    const chain = chains[chainIndex];
    if (!chain) return false;

    const entryType: 'text' | 'drawing' = phase === 'drawing' ? 'drawing' : 'text';
    const sanitizedText = phase === 'guessing' ? data.payload.trim() || '(回答なし)' : data.payload;

    // 既存のエントリーを探す（同じプレイヤー、同じフェーズのエントリー）
    const existingEntry = chain.entries.find((e) => e.authorId === playerId && e.type === entryType);
    if (existingEntry) {
      existingEntry.payload = sanitizedText;
      existingEntry.submittedAt = new Date();
    } else {
      chain.entries.push({
        order: chain.entries.length,
        type: entryType,
        authorId: playerId,
        payload: sanitizedText,
        submittedAt: new Date(),
      });
    }

    return true;
  }

  generateResult(room: Room, chains: Chain[]) {
    return {
      chains,
      players: room.players,
    };
  }
}
