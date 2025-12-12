import type { Chain, GamePhase, Player, Room } from '../../domain/entities.js';
import type { ContentPayload, GameModeHandler, SubmissionData } from '../../domain/gameMode.js';
import {
  getFirstCharacter,
  getLastCharacter,
  isConnected,
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

export class ShiritoriModeHandler implements GameModeHandler {
  private galleries = new Map<string, ShiritoriDrawing[]>();
  private currentDrawerIndex = new Map<string, number>();
  private lastSubmission = new Map<
    string,
    { drawing: ShiritoriDrawingPublic; nextDrawerId: string | null }
  >();

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

  handleSubmission(room: Room, playerId: string, data: SubmissionData): boolean {
    const drawer = this.getCurrentDrawer(room);
    if (!drawer || drawer.id !== playerId) return false;

    const gallery = this.galleries.get(room.id);
    if (!gallery) return false;
    if (gallery.length >= room.settings.shiritoriSettings.totalDrawings) return false;

    const image = data.imageData ?? data.payload;
    const answer = (data.answer ?? '').trim();
    if (!image) return false;

    const drawing: ShiritoriDrawing = {
      order: gallery.length + 1,
      authorId: playerId,
      imageData: image,
      answer,
      letterCount: answer.length,
      submittedAt: new Date(),
    };

    gallery.push(drawing);

    const nextDrawer = this.getNextDrawer(room);
    this.currentDrawerIndex.set(room.id, this.getNextDrawerIndex(room));

    this.lastSubmission.set(room.id, {
      drawing: this.toPublic(drawing),
      nextDrawerId: nextDrawer?.id ?? null,
    });

    return true;
  }

  // chains are unused in this mode; signature matches interface via unused param
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
    return gallery.map((d) => this.toPublic(d));
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
