import type { Chain, GamePhase, Room } from '../../domain/entities.js';
import type { ContentPayload, GameModeHandler, SubmissionData } from '../../domain/gameMode.js';
import { generatePlayerId } from '../../infra/services/idGenerator.js';

// クイズお題リスト
const QUIZ_PROMPTS = [
  'りんご', 'ねこ', 'いぬ', 'たいよう', 'つき', 'ほし', 'やま', 'うみ', 'さかな',
  'とり', 'はな', 'き', 'くるま', 'でんしゃ', 'ひこうき', 'いえ', 'ビル',
  'じてんしゃ', 'ボール', 'ケーキ', 'アイス', 'ピアノ', 'ギター', 'テレビ',
  'スマホ', 'パソコン', 'めがね', 'かさ', 'くつ', 'ぼうし', 'かばん', 'とけい',
  'コップ', 'おにぎり', 'ラーメン', 'すし', 'カレー', 'ハンバーガー',
  'サッカー', 'やきゅう', 'バスケ', 'テニス', 'ゆきだるま', 'さくら',
  'かえる', 'ちょう', 'ぞう', 'きりん', 'ライオン', 'ペンギン', 'パンダ',
];

export interface QuizFeedItem {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string; // プレイヤーカラー（弾幕表示用）
  text: string;
  kind: 'guess' | 'correct' | 'system';
  createdAt: number;
  rank?: number;
}

export interface QuizState {
  round: number;
  drawerId: string;
  prompt: string;
  normalizedAnswer: string;
  winners: { playerId: string; at: number }[];
  scores: Record<string, number>;
  hasCorrect: Set<string>;
  recentFeed: QuizFeedItem[];
  currentDrawing: string | null;
  canvasLocked: boolean; // revealモード: 描画中は他のプレイヤーはキャンバスが見えない
}

export interface QuizResult {
  rounds: { round: number; prompt: string; drawerId: string; winners: string[] }[];
  scores: Record<string, number>;
  players: { id: string; name: string }[];
}

// In-memory quiz states
const quizStates = new Map<string, QuizState>();

export function getQuizState(roomId: string): QuizState | undefined {
  return quizStates.get(roomId);
}

function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/[ー－−]/g, '').normalize('NFKC');
}

function getRandomPrompt(): string {
  return QUIZ_PROMPTS[Math.floor(Math.random() * QUIZ_PROMPTS.length)];
}

export class QuizModeHandler implements GameModeHandler {
  getPhases(room: Room): GamePhase[] {
    const { quizFormat, promptDisplayMode } = room.settings.quizSettings;
    const phases: GamePhase[] = [];
    
    // お題準備時間がある場合
    if (promptDisplayMode === 'separate') {
      phases.push('quiz_prompt');
    }
    
    // 描画フェーズ
    phases.push('quiz_drawing');
    
    // revealモード時は回答フェーズが別
    if (quizFormat === 'reveal') {
      phases.push('quiz_guessing');
    }
    
    phases.push('quiz_reveal');
    return phases;
  }

  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number, room: Room): GamePhase | 'result' {
    const { quizFormat, promptDisplayMode } = room.settings.quizSettings;
    
    if (currentPhase === 'quiz_prompt') {
      return 'quiz_drawing';
    }
    if (currentPhase === 'quiz_drawing') {
      return quizFormat === 'reveal' ? 'quiz_guessing' : 'quiz_reveal';
    }
    if (currentPhase === 'quiz_guessing') {
      return 'quiz_reveal';
    }
    if (currentPhase === 'quiz_reveal') {
      if (turn < totalTurns) {
        return promptDisplayMode === 'separate' ? 'quiz_prompt' : 'quiz_drawing';
      }
      return 'result';
    }
    return 'result';
  }

  getTimeLimit(phase: GamePhase, settings: Room['settings']): number {
    const { quizFormat, drawingTimeSec, revealDrawTimeSec, revealGuessTimeSec, revealTimeSec, promptViewTimeSec } = settings.quizSettings;
    
    if (phase === 'quiz_prompt') {
      return promptViewTimeSec;
    }
    if (phase === 'quiz_drawing') {
      // realtimeモード: 描画+回答時間 / revealモード: 描画のみ
      return quizFormat === 'realtime' ? drawingTimeSec : revealDrawTimeSec;
    }
    if (phase === 'quiz_guessing') {
      return revealGuessTimeSec;
    }
    if (phase === 'quiz_reveal') {
      return revealTimeSec;
    }
    return 5;
  }

  initializeGame(room: Room): void {
    const { promptDisplayMode } = room.settings.quizSettings;
    room.currentPhase = promptDisplayMode === 'separate' ? 'quiz_prompt' : 'quiz_drawing';
    room.currentTurn = 0;
    const configuredRounds = room.settings.quizSettings.totalRounds;
    room.totalTurns = configuredRounds > 0 ? configuredRounds : room.players.length;

    const prompt = getRandomPrompt();
    const scores: Record<string, number> = {};
    room.players.forEach((p) => { scores[p.id] = 0; });

    quizStates.set(room.id, {
      round: 0,
      drawerId: room.players[0]?.id ?? '',
      prompt,
      normalizedAnswer: normalizeAnswer(prompt),
      winners: [],
      scores,
      hasCorrect: new Set(),
      recentFeed: [],
      currentDrawing: null,
      canvasLocked: room.settings.quizSettings.quizFormat === 'reveal',
    });
  }

  getExpectedSubmitters(room: Room): string[] {
    const state = quizStates.get(room.id);
    return state ? [state.drawerId] : [];
  }

  distributeContent(room: Room, _chains: Chain[]): Map<string, ContentPayload> {
    const payloads = new Map<string, ContentPayload>();
    const state = quizStates.get(room.id);
    if (!state) return payloads;

    // 親にお題を送る
    payloads.set(state.drawerId, { type: 'text', payload: state.prompt });
    return payloads;
  }

  handleSubmission(room: Room, playerId: string, data: SubmissionData, chains: Chain[]): boolean {
    const state = quizStates.get(room.id);
    if (!state || playerId !== state.drawerId) return false;

    // 描画データを保存
    state.currentDrawing = data.payload;

    // チェーンにも保存（結果表示用）
    const chain = chains.find((c) => c.ownerPlayerId === playerId) ?? chains[0];
    if (chain) {
      chain.entries.push({
        order: state.round,
        type: 'drawing',
        authorId: playerId,
        payload: data.payload,
        submittedAt: new Date(),
      });
    }
    return true;
  }

  generateResult(room: Room, _chains: Chain[]): QuizResult {
    const state = quizStates.get(room.id);
    return {
      rounds: [],
      scores: state?.scores ?? {},
      players: room.players.map((p) => ({ id: p.id, name: p.name })),
    };
  }

  // クイズ回答処理
  submitGuess(room: Room, playerId: string, text: string): {
    correct: boolean;
    rank?: number;
    feedItem: QuizFeedItem;
    winnersReached: boolean;
  } | null {
    const state = quizStates.get(room.id);
    if (!state) return null;
    if (playerId === state.drawerId) return null; // 親は回答不可
    if (state.hasCorrect.has(playerId)) return null; // 既に正解済み

    const player = room.players.find((p) => p.id === playerId);
    const playerName = player?.name ?? '匿名';
    const playerColor = player?.color ?? '#808080';
    const normalized = normalizeAnswer(text);
    const isCorrect = normalized === state.normalizedAnswer;

    if (isCorrect) {
      state.hasCorrect.add(playerId);
      const rank = state.winners.length + 1;
      state.winners.push({ playerId, at: Date.now() });

      // スコア加算（設定から取得、足りない順位は最後の値を使用）
      const { winnerPoints, drawerBonus } = room.settings.quizSettings;
      const points = winnerPoints[rank - 1] ?? winnerPoints[winnerPoints.length - 1] ?? 1;
      state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
      if (rank === 1) {
        state.scores[state.drawerId] = (state.scores[state.drawerId] ?? 0) + drawerBonus;
      }

      const feedItem: QuizFeedItem = {
        id: generatePlayerId(),
        playerId,
        playerName,
        playerColor,
        text: `正解（${playerName}: ${rank}位）`,
        kind: 'correct',
        createdAt: Date.now(),
        rank,
      };
      state.recentFeed.push(feedItem);
      if (state.recentFeed.length > 50) state.recentFeed.shift();

      const guesserCount = Math.max(0, room.players.length - 1);
      const allCorrect = guesserCount > 0 && state.hasCorrect.size >= guesserCount;
      const winnersReached =
        state.winners.length >= room.settings.quizSettings.maxWinners || allCorrect;

      return {
        correct: true,
        rank,
        feedItem,
        winnersReached,
      };
    }

    const feedItem: QuizFeedItem = {
      id: generatePlayerId(),
      playerId,
      playerName,
      playerColor,
      text,
      kind: 'guess',
      createdAt: Date.now(),
    };
    state.recentFeed.push(feedItem);
    if (state.recentFeed.length > 50) state.recentFeed.shift();

    return { correct: false, feedItem, winnersReached: false };
  }

  // ラウンド終了処理
  endRound(room: Room): { prompt: string; winners: { playerId: string; rank: number }[]; scores: Record<string, number> } {
    const state = quizStates.get(room.id);
    if (!state) return { prompt: '', winners: [], scores: {} };

    // 誰も当てなかった場合
    if (state.winners.length === 0) {
      const { noWinnerBonus } = room.settings.quizSettings;
      room.players.forEach((p) => {
        if (p.id !== state.drawerId) {
          state.scores[p.id] = (state.scores[p.id] ?? 0) + noWinnerBonus;
        }
      });
    }

    return {
      prompt: state.prompt,
      winners: state.winners.map((w, i) => ({ playerId: w.playerId, rank: i + 1 })),
      scores: { ...state.scores },
    };
  }

  // 次のラウンドへ
  nextRound(room: Room): void {
    const state = quizStates.get(room.id);
    if (!state) return;

    const nextRound = state.round + 1;
    const nextDrawerIndex = nextRound % room.players.length;
    const newPrompt = getRandomPrompt();

    state.round = nextRound;
    state.drawerId = room.players[nextDrawerIndex]?.id ?? '';
    state.prompt = newPrompt;
    state.normalizedAnswer = normalizeAnswer(newPrompt);
    state.winners = [];
    state.hasCorrect = new Set();
    state.recentFeed = [];
    state.currentDrawing = null;
    state.canvasLocked = room.settings.quizSettings.quizFormat === 'reveal';
  }

  // revealモードでキャンバスロックを解除
  unlockCanvas(roomId: string): void {
    const state = quizStates.get(roomId);
    if (state) state.canvasLocked = false;
  }

  getDrawerId(roomId: string): string | null {
    const state = quizStates.get(roomId);
    return state?.drawerId ?? null;
  }

  setCurrentDrawing(roomId: string, imageData: string): void {
    const state = quizStates.get(roomId);
    if (!state) return;
    state.currentDrawing = imageData;
  }

  getQuizStateForClient(roomId: string, forPlayerId?: string, room?: Room): {
    round: number;
    drawerId: string;
    scores: Record<string, number>;
    maxWinners: number;
    winners: { playerId: string; rank: number }[];
    recentFeed: QuizFeedItem[];
    currentDrawing: string | null;
    prompt?: string;
    canvasLocked: boolean;
    quizFormat: 'realtime' | 'reveal';
    promptDisplayMode: 'immediate' | 'separate';
  } | null {
    const state = quizStates.get(roomId);
    if (!state) return null;

    const isDrawer = forPlayerId === state.drawerId;
    const hasCorrect = forPlayerId ? state.hasCorrect.has(forPlayerId) : false;
    const settings = room?.settings.quizSettings;

    return {
      round: state.round,
      drawerId: state.drawerId,
      scores: state.scores,
      maxWinners: settings?.maxWinners ?? 3,
      winners: state.winners.map((w, i) => ({ playerId: w.playerId, rank: i + 1 })),
      recentFeed: state.recentFeed,
      // revealモードでロック中は親以外にはnullを返す
      currentDrawing: state.canvasLocked && !isDrawer ? null : state.currentDrawing,
      // 親または正解者には答えを送る
      prompt: (isDrawer || hasCorrect) ? state.prompt : undefined,
      canvasLocked: state.canvasLocked,
      quizFormat: settings?.quizFormat ?? 'realtime',
      promptDisplayMode: settings?.promptDisplayMode ?? 'immediate',
    };
  }

  cleanup(roomId: string): void {
    quizStates.delete(roomId);
  }
}
