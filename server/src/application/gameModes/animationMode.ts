import type { Chain, GamePhase, Room } from '../../domain/entities.js';
import type {
  ContentPayload,
  GameModeHandler,
  SubmissionData,
} from '../../domain/gameMode.js';

function getDrawingFrames(chain: Chain): string[] {
  return chain.entries.filter((e) => e.type === 'drawing').map((e) => e.payload);
}

// 背景モード用: 最初のフレーム（背景）を除いたフレームを取得
function getAnimationFrames(chain: Chain, hasBackground: boolean): string[] {
  const frames = getDrawingFrames(chain);
  if (hasBackground && frames.length > 0) {
    return frames.slice(1); // 背景（最初のフレーム）を除く
  }
  return frames;
}

// 背景モード用: 背景画像を取得
function getBackgroundFrame(chain: Chain): string | null {
  const frames = getDrawingFrames(chain);
  return frames.length > 0 ? frames[0] : null;
}

export class AnimationModeHandler implements GameModeHandler {
  getPhases(): GamePhase[] {
    return ['prompt', 'first-frame', 'drawing', 'result'];
  }

  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number): GamePhase | 'result' {
    if (currentPhase === 'prompt') return 'first-frame';
    if (currentPhase === 'first-frame') return totalTurns <= 1 ? 'result' : 'drawing';
    if (currentPhase === 'drawing') {
      return turn < totalTurns - 1 ? 'drawing' : 'result';
    }
    return 'result';
  }

  getTimeLimit(phase: GamePhase, settings: Room['settings']): number {
    const animation = settings.animationSettings;
    if (phase === 'prompt') {
      return animation.promptTimeSec ?? 20;
    }
    if (phase === 'first-frame' || phase === 'drawing') {
      return animation.drawingTimeSec;
    }
    return 60;
  }

  initializeGame(room: Room): void {
    const { animationSettings } = room.settings;
    room.currentTurn = 0;
    // frameCountが0または未設定の場合は人数分
    const frameCount = animationSettings.frameCount > 0 ? animationSettings.frameCount : room.players.length;
    room.totalTurns = frameCount;
    room.currentPhase = animationSettings.firstFrameMode === 'prompt' ? 'prompt' : 'first-frame';
  }

  distributeContent(room: Room, chains: Chain[]): Map<string, ContentPayload> {
    const payloads = new Map<string, ContentPayload>();
    const { viewMode, hasBackground } = room.settings.animationSettings;
    const turn = room.currentTurn ?? 0;
    const playerCount = room.players.length;
    const phase = room.currentPhase;

    room.players.forEach((player, index) => {
      // first-frame: 自分のチェーン (チェーン回転なし)
      // drawing: ターン+1でオフセットしたチェーン (次のプレイヤーのチェーンから)
      const chainOffset = phase === 'first-frame' ? 0 : turn + 1;
      const chainIndex = (index + chainOffset) % playerCount;
      const chain = chains[chainIndex];
      if (!chain) return;

      // For first-frame with prompt mode, surface the prompt text if present
      if (phase === 'first-frame') {
        const promptEntry = chain.entries.find((e) => e.type === 'text');
        if (promptEntry) {
          payloads.set(player.id, { type: 'text', payload: promptEntry.payload });
          return;
        }
        // お題なしの場合は何も送らない（フロントでは「お題なし」と表示）
        return;
      }

      const frames = getDrawingFrames(chain);
      if (frames.length === 0) return;

      // 背景モードの場合
      if (hasBackground) {
        const background = getBackgroundFrame(chain);
        const animFrames = getAnimationFrames(chain, true);
        
        if (viewMode === 'previous') {
          // 前のフレームのみ表示（背景は常に含める）
          const lastFrame = animFrames.length > 0 ? animFrames[animFrames.length - 1] : null;
          if (background) {
            if (lastFrame) {
              payloads.set(player.id, { type: 'frames_with_bg', payload: [lastFrame], background });
            } else {
              // まだアニメーションフレームがない場合は背景のみ
              payloads.set(player.id, { type: 'frames_with_bg', payload: [], background });
            }
          }
        } else {
          // 全フレーム表示（背景付き）
          if (background) {
            payloads.set(player.id, { type: 'frames_with_bg', payload: animFrames, background });
          }
        }
        return;
      }

      // 通常モード
      if (viewMode === 'previous') {
        payloads.set(player.id, { type: 'drawing', payload: frames[frames.length - 1] });
      } else {
        payloads.set(player.id, { type: 'frames', payload: frames });
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
      // お題は自分のチェーンに追加
      const chain = chains.find((c) => c.ownerPlayerId === playerId);
      if (!chain) return false;
      
      const existingEntry = chain.entries.find((e) => e.authorId === playerId && e.type === 'text');
      if (existingEntry) {
        existingEntry.payload = data.payload.trim() || '(お題なし)';
        existingEntry.submittedAt = new Date();
      } else {
        chain.entries.push({
          order: chain.entries.length,
          type: 'text',
          authorId: playerId,
          payload: data.payload.trim() || '(お題なし)',
          submittedAt: new Date(),
        });
      }
      return true;
    }

    if (phase === 'first-frame') {
      // 最初のフレームは自分のチェーンに追加
      const chain = chains.find((c) => c.ownerPlayerId === playerId);
      if (!chain) return false;
      
      // 自分がこのチェーンに提出した最初のdrawingを探す
      const existingEntry = chain.entries.find((e) => e.authorId === playerId && e.type === 'drawing');
      if (existingEntry) {
        existingEntry.payload = data.payload;
        existingEntry.strokes = data.strokes;
        existingEntry.submittedAt = new Date();
      } else {
        chain.entries.push({
          order: chain.entries.length,
          type: 'drawing',
          authorId: playerId,
          payload: data.payload,
          strokes: data.strokes,
          submittedAt: new Date(),
        });
      }
      return true;
    }

    if (phase === 'drawing') {
      // ターン+1でオフセットしたチェーンに描く (distributeContentと同じロジック)
      const chainOffset = turn + 1;
      const chainIndex = (playerIndex + chainOffset) % playerCount;
      const chain = chains[chainIndex];
      if (!chain) return false;
      
      // 現在のターンでこのプレイヤーがこのチェーンに提出したdrawingを探す
      // 最後のエントリがこのプレイヤーのものなら書き直し
      const lastEntry = chain.entries[chain.entries.length - 1];
      
      if (lastEntry && lastEntry.authorId === playerId && lastEntry.type === 'drawing') {
        // 書き直しの場合
        lastEntry.payload = data.payload;
        lastEntry.strokes = data.strokes;
        lastEntry.submittedAt = new Date();
      } else {
        // 新規追加
        chain.entries.push({
          order: chain.entries.length,
          type: 'drawing',
          authorId: playerId,
          payload: data.payload,
          strokes: data.strokes,
          submittedAt: new Date(),
        });
      }
      return true;
    }

    return false;
  }

  generateResult(room: Room, chains: Chain[]) {
    return {
      chains,
      players: room.players,
    };
  }
}
