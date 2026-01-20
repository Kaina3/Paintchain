import type { Chain, GamePhase, Room, DrawingStroke } from '../../domain/entities.js';
import type { ContentPayload, GameModeHandler, SubmissionData } from '../../domain/gameMode.js';
import { generatePlayerId } from '../../infra/services/idGenerator.js';
import { getWerewolfPromptPair } from '../../data/werewolfPrompts.js';

// ========== 型定義 ==========

interface DrawingEntry {
  round: number;
  imageData: string;
  strokes?: DrawingStroke[];
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

interface VoteResult {
  playerId: string;
  voteCount: number;
}

export interface WerewolfState {
  roomId: string;
  werewolfType: 'wordwolf' | 'impostor';
  category: string;
  villagerPrompt: string;
  werewolfPrompt: string | null;
  promptChoices: string[];
  werewolves: Set<string>;
  currentRound: number;
  totalRounds: number;
  currentRevealIndex: number;
  drawings: Map<string, DrawingEntry[]>;
  votes: Map<string, string>;
  wolfGuess: string | null;
  scores: Record<string, number>;
  chatMessages: ChatMessage[];
}

export interface WerewolfResult {
  werewolves: string[];
  villagerPrompt: string;
  werewolfPrompt: string | null;
  votes: { voterId: string; targetId: string }[];
  voteResults: VoteResult[];
  caught: boolean;
  wolfGuessedPrompt: boolean;
  scores: Record<string, number>;
  drawings: { playerId: string; entries: DrawingEntry[] }[];
  players: { id: string; name: string; color: string }[];
}

// ========== 状態管理 ==========

const werewolfStates = new Map<string, WerewolfState>();

export function getWerewolfState(roomId: string): WerewolfState | undefined {
  return werewolfStates.get(roomId);
}

export function clearWerewolfState(roomId: string): void {
  werewolfStates.delete(roomId);
}

// ========== ユーティリティ ==========

function getWerewolfCount(playerCount: number, manual: number, auto: boolean): number {
  if (!auto && manual > 0) {
    return Math.min(manual, Math.floor(playerCount / 2) - 1);
  }
  if (playerCount <= 4) return 1;
  if (playerCount <= 7) return 1;
  if (playerCount <= 10) return 2;
  return 3;
}

function selectWerewolves(playerIds: string[], count: number): Set<string> {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  return new Set(shuffled.slice(0, count));
}

function calculateVoteResults(votes: Map<string, string>): VoteResult[] {
  const counts = new Map<string, number>();
  for (const target of votes.values()) {
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([playerId, voteCount]) => ({ playerId, voteCount }))
    .sort((a, b) => b.voteCount - a.voteCount);
}

// ========== GameModeHandler ==========

export class WerewolfModeHandler implements GameModeHandler {
  getPhases(room?: Room): GamePhase[] {
    const rounds = room?.settings.werewolfSettings.drawingRounds ?? 2;
    const phases: GamePhase[] = ['werewolf_assign'];

    for (let i = 0; i < rounds; i++) {
      phases.push('werewolf_drawing', 'werewolf_reveal', 'werewolf_discussion');
    }

    phases.push('werewolf_voting', 'werewolf_result');
    return phases;
  }

  getNextPhase(currentPhase: GamePhase, _turn: number, _totalTurns: number, room?: Room): GamePhase | 'result' {
    const state = room ? werewolfStates.get(room.id) : undefined;
    const totalRounds = state?.totalRounds ?? 2;
    const currentRound = state?.currentRound ?? 1;

    switch (currentPhase) {
      case 'werewolf_assign':
        return 'werewolf_drawing';

      case 'werewolf_drawing':
        return 'werewolf_reveal';

      case 'werewolf_reveal':
        return 'werewolf_discussion';

      case 'werewolf_discussion':
        if (currentRound < totalRounds) {
          if (state) state.currentRound++;
          return 'werewolf_drawing';
        }
        return 'werewolf_voting';

      case 'werewolf_voting':
        return 'werewolf_result';

      case 'werewolf_result':
        return 'result';

      default:
        return 'result';
    }
  }

  getTimeLimit(phase: GamePhase, settings: Room['settings']): number {
    const ws = settings.werewolfSettings;
    switch (phase) {
      case 'werewolf_assign':
        return ws.assignTimeSec;
      case 'werewolf_drawing':
        return ws.drawingTimeSec;
      case 'werewolf_reveal':
        return ws.revealTimeSec * 8; // 仮で8人分
      case 'werewolf_discussion':
        return ws.discussionTimeSec;
      case 'werewolf_voting':
        return ws.votingTimeSec;
      case 'werewolf_result':
        return 10;
      default:
        return 5;
    }
  }

  initializeGame(room: Room): void {
    const settings = room.settings.werewolfSettings;
    const playerIds = room.players.map((p) => p.id);

    // 人狼を選出
    const wolfCount = getWerewolfCount(playerIds.length, settings.werewolfCount, settings.autoWerewolfCount);
    const werewolves = selectWerewolves(playerIds, wolfCount);

    // お題を取得
    const { category, villagerPrompt, werewolfPrompt, choices } = getWerewolfPromptPair(
      settings.werewolfType,
      settings.selectedCategories
    );

    // スコア初期化
    const scores: Record<string, number> = {};
    playerIds.forEach((id) => {
      scores[id] = 0;
    });

    // 状態を作成
    const state: WerewolfState = {
      roomId: room.id,
      werewolfType: settings.werewolfType,
      category,
      villagerPrompt,
      werewolfPrompt,
      promptChoices: choices,
      werewolves,
      currentRound: 1,
      totalRounds: settings.drawingRounds,
      currentRevealIndex: 0,
      drawings: new Map(),
      votes: new Map(),
      wolfGuess: null,
      scores,
      chatMessages: [],
    };

    // 描画エントリを初期化
    playerIds.forEach((id) => {
      state.drawings.set(id, []);
    });

    werewolfStates.set(room.id, state);

    room.currentPhase = 'werewolf_assign';
    room.currentTurn = 1;
    room.totalTurns = settings.drawingRounds * 3 + 2;
  }

  getExpectedSubmitters(room: Room): string[] {
    if (room.currentPhase === 'werewolf_drawing') {
      return room.players.map((p) => p.id);
    }
    if (room.currentPhase === 'werewolf_voting') {
      return room.players.map((p) => p.id);
    }
    return [];
  }

  distributeContent(room: Room, _chains: Chain[]): Map<string, ContentPayload> {
    const payloads = new Map<string, ContentPayload>();
    const state = werewolfStates.get(room.id);
    if (!state) return payloads;

    // 各プレイヤーにお題を配布
    for (const player of room.players) {
      const isWerewolf = state.werewolves.has(player.id);

      if (isWerewolf) {
        payloads.set(
          player.id,
          {
            type: 'text',
            payload: JSON.stringify({
              category: state.category,
              prompt: state.werewolfType === 'impostor' ? null : state.werewolfPrompt,
              isHidden: state.werewolfType === 'impostor',
              isWerewolf: true,
            }),
          }
        );
      } else {
        payloads.set(
          player.id,
          {
            type: 'text',
            payload: JSON.stringify({
              category: state.category,
              prompt: state.villagerPrompt,
              isHidden: false,
              isWerewolf: false,
            }),
          }
        );
      }
    }

    return payloads;
  }

  handleSubmission(room: Room, playerId: string, data: SubmissionData, _chains: Chain[]): boolean {
    const state = werewolfStates.get(room.id);
    if (!state) return false;

    if (room.currentPhase === 'werewolf_drawing' && data.type === 'drawing') {
      const entries = state.drawings.get(playerId) ?? [];
      entries.push({
        round: state.currentRound,
        imageData: data.payload,
        strokes: data.strokes,
      });
      state.drawings.set(playerId, entries);
      return true;
    }

    return false;
  }

  generateResult(room: Room, _chains: Chain[]): WerewolfResult {
    const state = werewolfStates.get(room.id);
    if (!state) {
      return {
        werewolves: [],
        villagerPrompt: '',
        werewolfPrompt: null,
        votes: [],
        voteResults: [],
        caught: false,
        wolfGuessedPrompt: false,
        scores: {},
        drawings: [],
        players: [],
      };
    }

    // 投票結果を集計
    const voteResults = calculateVoteResults(state.votes);
    const topVoted = voteResults[0];
    const caught = topVoted ? state.werewolves.has(topVoted.playerId) : false;

    // スコア計算
    const settings = room.settings.werewolfSettings;
    for (const player of room.players) {
      const isWerewolf = state.werewolves.has(player.id);

      if (caught && !isWerewolf) {
        state.scores[player.id] += settings.scoring.villagerCatchWolf;
      } else if (!caught && isWerewolf) {
        state.scores[player.id] += settings.scoring.wolfSurvive;
      }
    }

    // インポスターがお題を当てた場合のボーナス
    const wolfGuessedPrompt = state.wolfGuess === state.villagerPrompt;
    if (wolfGuessedPrompt) {
      for (const wolfId of state.werewolves) {
        state.scores[wolfId] += settings.scoring.wolfGuessPrompt;
      }
    }

    return {
      werewolves: Array.from(state.werewolves),
      villagerPrompt: state.villagerPrompt,
      werewolfPrompt: state.werewolfPrompt,
      votes: Array.from(state.votes.entries()).map(([voterId, targetId]) => ({ voterId, targetId })),
      voteResults,
      caught,
      wolfGuessedPrompt,
      scores: state.scores,
      drawings: Array.from(state.drawings.entries()).map(([playerId, entries]) => ({
        playerId,
        entries,
      })),
      players: room.players.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    };
  }
}

// ========== 追加のエクスポート関数 ==========

export function handleVote(roomId: string, voterId: string, targetId: string): boolean {
  const state = werewolfStates.get(roomId);
  if (!state || voterId === targetId) return false;

  state.votes.set(voterId, targetId);
  return true;
}

export function addChatMessage(
  roomId: string,
  playerId: string,
  playerName: string,
  playerColor: string,
  text: string
): ChatMessage | null {
  const state = werewolfStates.get(roomId);
  if (!state) return null;

  const message: ChatMessage = {
    id: generatePlayerId(),
    playerId,
    playerName,
    playerColor,
    text,
    timestamp: Date.now(),
  };

  state.chatMessages.push(message);

  if (state.chatMessages.length > 100) {
    state.chatMessages = state.chatMessages.slice(-100);
  }

  return message;
}

export function handleWolfGuess(roomId: string, playerId: string, guess: string): boolean {
  const state = werewolfStates.get(roomId);
  if (!state || !state.werewolves.has(playerId)) return false;

  state.wolfGuess = guess;
  return true;
}

export function advanceRevealIndex(roomId: string): number {
  const state = werewolfStates.get(roomId);
  if (!state) return -1;

  state.currentRevealIndex++;
  return state.currentRevealIndex;
}

export function getCurrentRevealIndex(roomId: string): number {
  const state = werewolfStates.get(roomId);
  return state?.currentRevealIndex ?? 0;
}

export function resetRevealIndex(roomId: string): void {
  const state = werewolfStates.get(roomId);
  if (state) {
    state.currentRevealIndex = 0;
  }
}
