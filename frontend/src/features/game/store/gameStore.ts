import { create } from 'zustand';
import type { GamePhase, Chain, Player } from '@/shared/types';

interface GameState {
  phase: GamePhase | null;
  timeRemaining: number;
  deadline: Date | null;
  currentTurn: number;
  totalTurns: number;
  submittedCount: number;
  totalCount: number;
  hasSubmitted: boolean;
  receivedContent: { type: 'text' | 'drawing'; payload: string } | null;
  chains: Chain[];
  resultPlayers: Player[];
  resultChainIndex: number;
  resultEntryIndex: number;
  // Track the maximum revealed position (for non-host browsing)
  revealedChainIndex: number;
  revealedEntryIndices: number[]; // Per-chain revealed entry index

  setPhase: (phase: GamePhase, timeRemaining: number, deadline?: string, currentTurn?: number, totalTurns?: number) => void;
  setTimeRemaining: (time: number) => void;
  syncTimer: (serverTime: number) => void;
  setSubmissionProgress: (submitted: number, total: number) => void;
  setHasSubmitted: (submitted: boolean) => void;
  setReceivedContent: (content: { type: 'text' | 'drawing'; payload: string } | null) => void;
  setChains: (chains: Chain[], players?: Player[]) => void;
  setResultPosition: (chainIndex: number, entryIndex: number) => void;
  updateRevealedPosition: (chainIndex: number, entryIndex: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: null,
  timeRemaining: 0,
  deadline: null,
  currentTurn: 1,
  totalTurns: 1,
  submittedCount: 0,
  totalCount: 0,
  hasSubmitted: false,
  receivedContent: null,
  chains: [],
  resultPlayers: [],
  resultChainIndex: 0,
  resultEntryIndex: 0,
  revealedChainIndex: 0,
  revealedEntryIndices: [],

  setPhase: (phase, timeRemaining, deadline, currentTurn, totalTurns) =>
    set({
      phase,
      timeRemaining,
      deadline: deadline ? new Date(deadline) : null,
      currentTurn: currentTurn ?? get().currentTurn,
      totalTurns: totalTurns ?? get().totalTurns,
      hasSubmitted: false,
      receivedContent: null,
    }),

  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),

  // Server-synced timer update using deadline
  syncTimer: (serverTime: number) => {
    const { deadline } = get();
    if (deadline) {
      // Calculate based on deadline for better accuracy
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      set({ timeRemaining: remaining });
    } else {
      set({ timeRemaining: serverTime });
    }
  },

  setSubmissionProgress: (submittedCount, totalCount) =>
    set({ submittedCount, totalCount }),

  setHasSubmitted: (hasSubmitted) => set({ hasSubmitted }),

  setReceivedContent: (receivedContent) => set({ receivedContent }),

  setChains: (chains, players) => set({ 
    chains,
    resultPlayers: players ?? get().resultPlayers,
  }),

  setResultPosition: (chainIndex, entryIndex) => set({
    resultChainIndex: chainIndex,
    resultEntryIndex: entryIndex,
  }),

  updateRevealedPosition: (chainIndex, entryIndex) => {
    const { revealedChainIndex, revealedEntryIndices, chains } = get();
    const newRevealedEntryIndices = [...revealedEntryIndices];
    
    // Ensure array is long enough
    while (newRevealedEntryIndices.length < chains.length) {
      newRevealedEntryIndices.push(0);
    }
    
    // Update the revealed entry index for this chain (only if greater)
    if (entryIndex > (newRevealedEntryIndices[chainIndex] ?? 0)) {
      newRevealedEntryIndices[chainIndex] = entryIndex;
    }
    
    set({
      revealedChainIndex: Math.max(revealedChainIndex, chainIndex),
      revealedEntryIndices: newRevealedEntryIndices,
    });
  },

  reset: () =>
    set({
      phase: null,
      timeRemaining: 0,
      deadline: null,
      currentTurn: 1,
      totalTurns: 1,
      submittedCount: 0,
      totalCount: 0,
      hasSubmitted: false,
      receivedContent: null,
      chains: [],
      resultPlayers: [],
      resultChainIndex: 0,
      resultEntryIndex: 0,
      revealedChainIndex: 0,
      revealedEntryIndices: [],
    }),
}));
