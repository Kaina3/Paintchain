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
      return turn < totalTurns ? 'guessing' : 'result';
    }
    if (currentPhase === 'guessing') {
      return turn < totalTurns ? 'drawing' : 'result';
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

    // 伝言ゲーム方式: 各チェーンが1人ずつ順番に回っていく
    // 
    // 4人の例 (P0=ケイナ, P1=ゲスト, P2=ゲスト2, P3=ゲスト3):
    // Chain 0 (ケイナのお題): P0(prompt) → P1(drawing) → P2(guessing) → P3(drawing) → P0(guessing)...
    // 
    // turnはフェーズの進行を表す（prompt後にturn=1から開始、drawing後にturn++）:
    // - turn 1: drawing (P1が描く) → turn++
    // - turn 2: guessing (P2が回答)
    // - turn 2: drawing (P2が別チェーンを描く) → turn++
    // - turn 3: guessing (P3が回答)
    // 
    // チェーンiに対して、turn番目に参加するプレイヤーは (i + turn) % playerCount
    // 逆に、プレイヤーjがturn番目に受け取るチェーンは (j - turn + playerCount) % playerCount

    room.players.forEach((player, index) => {
      // プレイヤーindexがturn番目に受け取るチェーン
      const chainIndex = (index - turn + playerCount * 2) % playerCount;
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
    // drawingもguessingも同じturnで同じチェーンを操作する
    const chainIndex = (playerIndex - turn + playerCount * 2) % playerCount;
    const chain = chains[chainIndex];
    if (!chain) return false;

    const entryType: 'text' | 'drawing' = phase === 'drawing' ? 'drawing' : 'text';
    const sanitizedText = phase === 'guessing' ? data.payload.trim() || '(回答なし)' : data.payload;

    // 既存のエントリーを探す（同じプレイヤー、同じフェーズのエントリー）
    const existingEntry = chain.entries.find((e) => e.authorId === playerId && e.type === entryType);
    if (existingEntry) {
      existingEntry.payload = sanitizedText;
      existingEntry.submittedAt = new Date();
      // ストローク履歴を更新（描画フェーズのみ）
      if (phase === 'drawing' && data.strokes) {
        existingEntry.strokes = data.strokes;
      }
    } else {
      chain.entries.push({
        order: chain.entries.length,
        type: entryType,
        authorId: playerId,
        payload: sanitizedText,
        strokes: phase === 'drawing' ? data.strokes : undefined,
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
