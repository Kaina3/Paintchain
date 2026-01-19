import { create } from 'zustand';
import type {
  WerewolfPromptInfo,
  WerewolfChatMessage,
  WerewolfResult,
  WerewolfDrawingEntry,
} from '@/shared/types';

interface WerewolfStore {
  // 自分の役割とお題情報
  promptInfo: WerewolfPromptInfo | null;
  isWerewolf: boolean;
  promptChoices: string[]; // インポスターモード用の選択肢
  setPromptInfo: (info: WerewolfPromptInfo, isWerewolf: boolean, choices?: string[]) => void;

  // 現在のラウンド
  currentRound: number;
  totalRounds: number;
  setRound: (current: number, total: number) => void;

  // 発表中のプレイヤー
  revealingPlayerId: string | null;
  revealingDrawing: string | null;
  revealIndex: number;
  setRevealing: (playerId: string | null, drawing: string | null, index?: number) => void;

  // 全員の描画（発表後に蓄積）
  allDrawings: Map<string, WerewolfDrawingEntry[]>;
  addDrawing: (playerId: string, entry: WerewolfDrawingEntry) => void;
  setAllDrawings: (drawings: { playerId: string; entries: WerewolfDrawingEntry[] }[]) => void;

  // チャットメッセージ
  chatMessages: WerewolfChatMessage[];
  addChatMessage: (message: WerewolfChatMessage) => void;

  // 投票状態
  myVote: string | null;
  setMyVote: (targetId: string | null) => void;
  voteCount: number;
  totalPlayers: number;
  setVoteProgress: (count: number, total: number) => void;

  // お題推測（インポスターモード）
  myGuess: string | null;
  setMyGuess: (guess: string | null) => void;

  // 結果
  result: WerewolfResult | null;
  setResult: (result: WerewolfResult) => void;

  // リセット
  reset: () => void;
}

export const useWerewolfStore = create<WerewolfStore>((set) => ({
  promptInfo: null,
  isWerewolf: false,
  promptChoices: [],
  setPromptInfo: (info, isWerewolf, choices = []) =>
    set({ promptInfo: info, isWerewolf, promptChoices: choices }),

  currentRound: 1,
  totalRounds: 2,
  setRound: (current, total) => set({ currentRound: current, totalRounds: total }),

  revealingPlayerId: null,
  revealingDrawing: null,
  revealIndex: 0,
  setRevealing: (playerId, drawing, index = 0) =>
    set({
      revealingPlayerId: playerId,
      revealingDrawing: drawing,
      revealIndex: index,
    }),

  allDrawings: new Map(),
  addDrawing: (playerId, entry) =>
    set((state) => {
      const newMap = new Map(state.allDrawings);
      const entries = newMap.get(playerId) ?? [];
      // 同じラウンドの絵がある場合は上書き
      const existingIndex = entries.findIndex((e) => e.round === entry.round);
      if (existingIndex >= 0) {
        entries[existingIndex] = entry;
      } else {
        entries.push(entry);
      }
      newMap.set(playerId, [...entries]);
      return { allDrawings: newMap };
    }),
  setAllDrawings: (drawings) =>
    set(() => {
      const newMap = new Map<string, WerewolfDrawingEntry[]>();
      drawings.forEach(({ playerId, entries }) => {
        newMap.set(playerId, entries);
      });
      return { allDrawings: newMap };
    }),

  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-99), message],
    })),

  myVote: null,
  setMyVote: (targetId) => set({ myVote: targetId }),
  voteCount: 0,
  totalPlayers: 0,
  setVoteProgress: (count, total) => set({ voteCount: count, totalPlayers: total }),

  myGuess: null,
  setMyGuess: (guess) => set({ myGuess: guess }),

  result: null,
  setResult: (result) => set({ result }),

  reset: () =>
    set({
      promptInfo: null,
      isWerewolf: false,
      promptChoices: [],
      currentRound: 1,
      totalRounds: 2,
      revealingPlayerId: null,
      revealingDrawing: null,
      revealIndex: 0,
      allDrawings: new Map(),
      chatMessages: [],
      myVote: null,
      voteCount: 0,
      totalPlayers: 0,
      myGuess: null,
      result: null,
    }),
}));
