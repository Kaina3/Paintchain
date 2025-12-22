import type { Chain, GamePhase, Player, Room } from '../../domain/entities.js';
import type { ContentPayload, GameModeHandler, SubmissionData } from '../../domain/gameMode.js';
import {
  getFirstCharacter,
  getLastCharacter,
  isConnected,
  isHiraganaOnly,
} from './shiritoriRules.js';

export interface ShiritoriDrawing {
  order: number;
  authorId: string;
  imageData: string;
  answer: string;
  letterCount: number;
  submittedAt: Date;
}

export interface ShiritoriDrawingPublic {
  order: number;
  authorId: string;
  imageData: string;
  letterCount: number;
  submittedAt: Date;
  hasAnswer?: boolean;
}

export interface ShiritoriDrawingResult extends ShiritoriDrawingPublic {
  answer: string;
  previousAnswer?: string;
  isConnected: boolean;
  connectionDetail?: string;
}

export interface ShiritoriResult {
  drawings: ShiritoriDrawingResult[];
  totalCorrect: number;
  totalDrawings: number;
}

// 絵のみ提出された状態（答え待ち）
interface PendingDrawing {
  order: number;
  authorId: string;
  imageData: string;
  submittedAt: Date;
}

export class ShiritoriModeHandler implements GameModeHandler {
  private galleries = new Map<string, ShiritoriDrawing[]>();
  private currentDrawerIndex = new Map<string, number>();
  private lastSubmission = new Map<
    string,
    { drawing: ShiritoriDrawingPublic; nextDrawerId: string | null }
  >();
  // 答え待ちの絵を管理（roomId:playerId -> PendingDrawing）
  private pendingAnswers = new Map<string, PendingDrawing>();

  getPhases(): GamePhase[] {
    return ['drawing'];
  }

  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number): GamePhase | 'result' {
    if (currentPhase === 'drawing' && turn < totalTurns) return 'drawing';
    return 'result';
  }

  getTimeLimit(phase: GamePhase, settings: Room['settings']): number {
    if (phase === 'drawing') return settings.shiritoriSettings.drawingTimeSec;
    return 60;
  }

  initializeGame(room: Room): void {
    this.galleries.set(room.id, []);
    this.currentDrawerIndex.set(room.id, 0);
    room.currentPhase = 'drawing';
    room.currentTurn = 0;
    room.totalTurns = room.settings.shiritoriSettings.totalDrawings;
  }

  distributeContent(room: Room, _chains: Chain[] = []): Map<string, ContentPayload> {
    const payloads = new Map<string, ContentPayload>();
    const drawer = this.getCurrentDrawer(room);
    const previousHint = this.getPreviousLetterHint(room.id);
    const hintText = previousHint ? `「${previousHint}」から始まる言葉を描いてね` : '最初の一枚です';
    if (drawer) {
      payloads.set(drawer.id, { type: 'text', payload: hintText });
    }
    return payloads;
  }

  // 絵のみの提出を処理
  handleImageSubmission(room: Room, playerId: string, imageData: string): { success: boolean; error?: string; isLastDrawing?: boolean } {
    const drawer = this.getCurrentDrawer(room);
    if (!drawer || drawer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const gallery = this.galleries.get(room.id);
    if (!gallery) return { success: false, error: 'Gallery not found' };
    
    const totalTurns = room.settings.shiritoriSettings.totalDrawings;
    const currentCount = gallery.length;
    let pendingCount = 0;
    for (const [key] of this.pendingAnswers) {
      if (key.startsWith(`${room.id}:`)) pendingCount++;
    }
    
    if (currentCount + pendingCount >= totalTurns) {
      return { success: false, error: 'Max drawings reached' };
    }

    // 既にpending状態の場合はエラー
    const pendingKey = `${room.id}:${playerId}`;
    if (this.pendingAnswers.has(pendingKey)) {
      return { success: false, error: 'Already submitted image' };
    }

    const order = currentCount + pendingCount + 1;
    const isLastDrawing = order >= totalTurns;
    
    // 答え待ちとして保存
    this.pendingAnswers.set(pendingKey, {
      order,
      authorId: playerId,
      imageData,
      submittedAt: new Date(),
    });

    // 最後の絵でなければ、次の描画者に移動
    if (!isLastDrawing) {
      const nextDrawer = this.getNextDrawer(room);
      this.currentDrawerIndex.set(room.id, this.getNextDrawerIndex(room));

      // 絵のみの情報を通知用に保存
      this.lastSubmission.set(room.id, {
        drawing: {
          order,
          authorId: playerId,
          imageData,
          letterCount: 0,
          submittedAt: new Date(),
          hasAnswer: false,
        },
        nextDrawerId: nextDrawer?.id ?? null,
      });
    } else {
      // 最後の絵の場合、nextDrawerIdはnull
      this.lastSubmission.set(room.id, {
        drawing: {
          order,
          authorId: playerId,
          imageData,
          letterCount: 0,
          submittedAt: new Date(),
          hasAnswer: false,
        },
        nextDrawerId: null,
      });
    }

    return { success: true, isLastDrawing };
  }

  // 答えのみの提出を処理
  handleAnswerSubmission(room: Room, playerId: string, answer: string): { success: boolean; error?: string; drawing?: ShiritoriDrawingPublic; shouldEndGame?: boolean } {
    const pendingKey = `${room.id}:${playerId}`;
    const pending = this.pendingAnswers.get(pendingKey);
    
    if (!pending) {
      return { success: false, error: 'No pending drawing found' };
    }

    if (!answer || !isHiraganaOnly(answer)) {
      return { success: false, error: 'ひらがなのみ入力してください' };
    }

    const gallery = this.galleries.get(room.id);
    if (!gallery) return { success: false, error: 'Gallery not found' };

    // 完成した絵として追加
    const drawing: ShiritoriDrawing = {
      order: pending.order,
      authorId: pending.authorId,
      imageData: pending.imageData,
      answer,
      letterCount: answer.length,
      submittedAt: pending.submittedAt,
    };

    gallery.push(drawing);
    // orderでソート
    gallery.sort((a, b) => a.order - b.order);
    
    this.pendingAnswers.delete(pendingKey);

    // ゲーム終了チェック（全員の答えが揃った && 最後の絵まで描いた）
    const totalTurns = room.settings.shiritoriSettings.totalDrawings;
    const shouldEndGame = gallery.length >= totalTurns && !this.hasPendingAnswers(room.id);

    return { 
      success: true, 
      drawing: { ...this.toPublic(drawing), hasAnswer: true },
      shouldEndGame,
    };
  }

  // 旧handleSubmission（互換性のため残す、timeoutなどで使用）
  handleSubmission(room: Room, playerId: string, data: SubmissionData): boolean {
    const image = data.imageData ?? data.payload;
    const answer = (data.answer ?? '').trim();
    
    // 絵のみの提出
    if (image && !answer) {
      const result = this.handleImageSubmission(room, playerId, image);
      return result.success;
    }
    
    // 答えのみの提出
    if (!image && answer) {
      const result = this.handleAnswerSubmission(room, playerId, answer);
      return result.success;
    }
    
    // 両方同時（従来の動作）
    if (image && answer) {
      // pending状態でなければ先に絵を提出
      const pendingKey = `${room.id}:${playerId}`;
      if (!this.pendingAnswers.has(pendingKey)) {
        const imgResult = this.handleImageSubmission(room, playerId, image);
        if (!imgResult.success) return false;
      }
      const ansResult = this.handleAnswerSubmission(room, playerId, answer);
      return ansResult.success;
    }
    
    return false;
  }

  // 答え待ちのプレイヤーがいるかチェック
  hasPendingAnswers(roomId: string): boolean {
    for (const [key] of this.pendingAnswers) {
      if (key.startsWith(`${roomId}:`)) {
        return true;
      }
    }
    return false;
  }

  // プレイヤーが答え待ち状態かチェック
  isWaitingForAnswer(roomId: string, playerId: string): boolean {
    return this.pendingAnswers.has(`${roomId}:${playerId}`);
  }

  // プレイヤーのpending絵を取得
  getPendingDrawing(roomId: string, playerId: string): PendingDrawing | null {
    return this.pendingAnswers.get(`${roomId}:${playerId}`) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateResult(room: Room, _chains: unknown[] = []): ShiritoriResult {
    const gallery = this.galleries.get(room.id) ?? [];
    const results: ShiritoriDrawingResult[] = gallery.map((drawing, idx) => {
      const prev = gallery[idx - 1];
      const isOk = idx === 0 ? true : isConnected(prev.answer, drawing.answer);
      const detail = prev
        ? `${getLastCharacter(prev.answer)} → ${getFirstCharacter(drawing.answer)}`
        : undefined;
      return {
        ...this.toPublic(drawing),
        answer: drawing.answer,
        previousAnswer: prev?.answer,
        isConnected: isOk,
        connectionDetail: detail,
      };
    });

    return {
      drawings: results,
      totalDrawings: results.length,
      totalCorrect: results.filter((d, idx) => idx === 0 ? true : d.isConnected).length,
    };
  }

  getExpectedSubmitters(room: Room): string[] {
    const drawer = this.getCurrentDrawer(room);
    return drawer ? [drawer.id] : [];
  }

  getRequiredSubmissions(_: Room, _phase: GamePhase): number {
    return 1;
  }

  getCurrentDrawer(room: Room): Player | undefined {
    const index = this.currentDrawerIndex.get(room.id) ?? 0;
    return room.players[index % room.players.length];
  }

  getNextDrawer(room: Room): Player | undefined {
    const nextIndex = this.getNextDrawerIndex(room);
    return room.players[nextIndex % room.players.length];
  }

  getPreviousLetterHint(roomId: string): string | null {
    const gallery = this.galleries.get(roomId);
    if (!gallery || gallery.length === 0) return null;
    return getLastCharacter(gallery[gallery.length - 1].answer);
  }

  getPublicGallery(roomId: string): ShiritoriDrawingPublic[] {
    const gallery = this.galleries.get(roomId) ?? [];
    return gallery.map((d) => ({ ...this.toPublic(d), hasAnswer: true }));
  }

  popLastSubmission(roomId: string): { drawing: ShiritoriDrawingPublic; nextDrawerId: string | null } | null {
    const info = this.lastSubmission.get(roomId) ?? null;
    this.lastSubmission.delete(roomId);
    return info;
  }

  cleanup(roomId: string) {
    this.galleries.delete(roomId);
    this.currentDrawerIndex.delete(roomId);
    this.lastSubmission.delete(roomId);
    // pending answersもクリーンアップ
    for (const [key] of this.pendingAnswers) {
      if (key.startsWith(`${roomId}:`)) {
        this.pendingAnswers.delete(key);
      }
    }
  }

  private getNextDrawerIndex(room: Room): number {
    const current = this.currentDrawerIndex.get(room.id) ?? 0;
    return (current + 1) % room.players.length;
  }

  private toPublic(drawing: ShiritoriDrawing): ShiritoriDrawingPublic {
    return {
      order: drawing.order,
      authorId: drawing.authorId,
      imageData: drawing.imageData,
      letterCount: drawing.letterCount,
      submittedAt: drawing.submittedAt,
    };
  }
}
