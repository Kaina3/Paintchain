import { create } from 'zustand';
import type {
  GamePhase,
  Chain,
  Player,
  ContentPayload,
  ShiritoriDrawingPublic,
  ShiritoriResult,
  QuizFeedItem,
  QuizState,
  QuizResult,
} from '@/shared/types';

interface GameState {
  phase: GamePhase | null;
  timeRemaining: number;
  deadline: Date | null;
  currentTurn: number;
  totalTurns: number;
  submittedCount: number;
  totalCount: number;
  hasSubmitted: boolean;
  receivedContent: ContentPayload | null;
  chains: Chain[];
  resultPlayers: Player[];
  resultChainIndex: number;
  resultEntryIndices: number[]; // Per-chain current entry index
  // Track the maximum revealed position (for non-host browsing)
  revealedChainIndex: number;
  revealedEntryIndices: number[]; // Per-chain revealed entry index
  unlockedChainIndices: number[]; // Track which chains have been unlocked
  resultDisplayOrder: 'first-to-last' | 'last-to-first'; // Synced display order from host

  // Shiritori mode
  shiritoriGallery: ShiritoriDrawingPublic[];
  shiritoriDrawerId: string | null;
  shiritoriHint: string | null;
  shiritoriOrder: number;
  shiritoriTotal: number;
  shiritoriResult: ShiritoriResult | null;
  shiritoriLiveCanvas: string | null;
  // 絵を提出済みで答え待ち状態
  shiritoriPendingAnswer: boolean;
  shiritoriMyPendingImage: string | null;

  // Quiz mode
  quizState: QuizState | null;
  quizFeed: QuizFeedItem[];
  quizRevealedAnswer: string | null;
  quizResult: QuizResult | null;

  setPhase: (phase: GamePhase, timeRemaining: number, deadline?: string, currentTurn?: number, totalTurns?: number) => void;
  setTimeRemaining: (time: number) => void;
  syncTimer: (serverTime: number) => void;
  setSubmissionProgress: (submitted: number, total: number) => void;
  setHasSubmitted: (submitted: boolean) => void;
  setReceivedContent: (content: ContentPayload | null) => void;
  setChains: (chains: Chain[], players?: Player[]) => void;
  setResultPosition: (chainIndex: number, entryIndex: number) => void;
  resetAllEntryIndices: () => void;
  updateRevealedPosition: (chainIndex: number, entryIndex: number, displayOrder?: 'first-to-last' | 'last-to-first') => void;
  setResultDisplayOrder: (order: 'first-to-last' | 'last-to-first') => void;
  unlockChain: (chainIndex: number) => void;
  setShiritoriTurn: (drawerId: string | null, hint: string | null, order: number, total: number, gallery: ShiritoriDrawingPublic[]) => void;
  addShiritoriDrawing: (drawing: ShiritoriDrawingPublic, nextDrawerId: string | null) => void;
  updateShiritoriDrawingAnswer: (drawing: ShiritoriDrawingPublic) => void;
  setShiritoriResult: (result: ShiritoriResult) => void;
  setShiritoriLiveCanvas: (imageData: string | null) => void;
  setShiritoriPendingAnswer: (pending: boolean, imageData: string | null) => void;
  setQuizState: (state: QuizState) => void;
  addQuizFeed: (item: QuizFeedItem) => void;
  removeRecentLocalGuess: (playerId: string) => void;
  setQuizRevealedAnswer: (answer: string | null) => void;
  setQuizResult: (result: QuizResult) => void;
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
  resultEntryIndices: [],
  revealedChainIndex: 0,
  revealedEntryIndices: [],
  unlockedChainIndices: [],
  resultDisplayOrder: 'first-to-last',

  shiritoriGallery: [],
  shiritoriDrawerId: null,
  shiritoriHint: null,
  shiritoriOrder: 1,
  shiritoriTotal: 1,
  shiritoriResult: null,
  shiritoriLiveCanvas: null,
  shiritoriPendingAnswer: false,
  shiritoriMyPendingImage: null,

  quizState: null,
  quizFeed: [],
  quizRevealedAnswer: null,
  quizResult: null,

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

  setResultPosition: (chainIndex, entryIndex) => {
    const { resultEntryIndices, chains } = get();
    const newEntryIndices = [...resultEntryIndices];
    
    // Ensure array is long enough
    while (newEntryIndices.length < chains.length) {
      newEntryIndices.push(-1); // -1 means not yet initialized
    }
    
    newEntryIndices[chainIndex] = entryIndex;
    
    set({
      resultChainIndex: chainIndex,
      resultEntryIndices: newEntryIndices,
    });
  },

  setResultDisplayOrder: (order) => set({ resultDisplayOrder: order }),

  resetAllEntryIndices: () => set({
    resultChainIndex: 0,
    resultEntryIndices: [],
    revealedChainIndex: 0,
    revealedEntryIndices: [],
    unlockedChainIndices: [],
  }),

  updateRevealedPosition: (chainIndex, entryIndex, displayOrder?: 'first-to-last' | 'last-to-first') => {
    const { revealedChainIndex, revealedEntryIndices, chains, resultDisplayOrder } = get();
    const newRevealedEntryIndices = [...revealedEntryIndices];
    const order = displayOrder ?? resultDisplayOrder;
    
    // Ensure array is long enough
    while (newRevealedEntryIndices.length < chains.length) {
      newRevealedEntryIndices.push(-1);
    }
    
    // Ignore "hidden" state
    if (entryIndex < 0) {
      return;
    }

    const currentRevealed = newRevealedEntryIndices[chainIndex] ?? -1;
    
    // Track the revealed position based on display order
    // For first-to-last: higher index = more revealed
    // For last-to-first: lower index = more revealed
    if (order === 'first-to-last') {
      // Update if greater (more entries revealed)
      if (entryIndex > currentRevealed) {
        newRevealedEntryIndices[chainIndex] = entryIndex;
      }
    } else {
      // Reverse order: entryIndex goes from lastIndex down to 0
      // First reveal: currentRevealed is -1, entryIndex is lastIndex -> update
      // Subsequent reveals: entryIndex decreases, we want to track the smallest (most revealed)
      if (currentRevealed < 0 || entryIndex < currentRevealed) {
        newRevealedEntryIndices[chainIndex] = entryIndex;
      }
    }
    
    set({
      revealedChainIndex: Math.max(revealedChainIndex, chainIndex),
      revealedEntryIndices: newRevealedEntryIndices,
    });
  },

  unlockChain: (chainIndex) => {
    const { unlockedChainIndices } = get();
    if (!unlockedChainIndices.includes(chainIndex)) {
      set({ unlockedChainIndices: [...unlockedChainIndices, chainIndex] });
    }
  },

  setShiritoriTurn: (drawerId, hint, order, total, gallery) =>
    set({
      shiritoriDrawerId: drawerId,
      shiritoriHint: hint,
      shiritoriOrder: order,
      shiritoriTotal: total,
      shiritoriGallery: gallery,
      shiritoriResult: null,
      shiritoriPendingAnswer: false,
      shiritoriMyPendingImage: null,
    }),

  addShiritoriDrawing: (drawing, nextDrawerId) => {
    const { shiritoriGallery, shiritoriOrder, shiritoriTotal } = get();
    set({
      shiritoriGallery: [...shiritoriGallery, drawing],
      shiritoriDrawerId: nextDrawerId,
      shiritoriOrder: Math.min(shiritoriOrder + 1, shiritoriTotal),
    });
  },

  updateShiritoriDrawingAnswer: (updatedDrawing) => {
    const { shiritoriGallery } = get();
    set({
      shiritoriGallery: shiritoriGallery.map((d) =>
        d.order === updatedDrawing.order ? updatedDrawing : d
      ),
    });
  },

  setShiritoriResult: (result) => set({ shiritoriResult: result }),

  setShiritoriLiveCanvas: (imageData) => set({ shiritoriLiveCanvas: imageData }),

  setShiritoriPendingAnswer: (pending, imageData) => set({
    shiritoriPendingAnswer: pending,
    shiritoriMyPendingImage: imageData,
  }),

  setQuizState: (state) => set({ quizState: state }),

  addQuizFeed: (item) => {
    const { quizFeed } = get();
    const newFeed = [...quizFeed, item].slice(-50);
    set({ quizFeed: newFeed });
  },

  removeRecentLocalGuess: (playerId) => {
    const { quizFeed } = get();
    // 最近3秒以内のローカルguessを削除（正解時に入力文字を消すため）
    const now = Date.now();
    const filtered = quizFeed.filter((item) => {
      if (item.playerId !== playerId) return true;
      if (item.kind !== 'guess') return true;
      if (!item.id.startsWith('local-')) return true;
      if (now - item.createdAt > 3000) return true;
      return false;
    });
    set({ quizFeed: filtered });
  },

  setQuizRevealedAnswer: (answer) => set({ quizRevealedAnswer: answer }),

  setQuizResult: (result) => set({ quizResult: result }),

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
      resultEntryIndices: [],
      revealedChainIndex: 0,
      revealedEntryIndices: [],
      unlockedChainIndices: [],
      resultDisplayOrder: 'first-to-last',
      shiritoriGallery: [],
      shiritoriDrawerId: null,
      shiritoriHint: null,
      shiritoriOrder: 1,
      shiritoriTotal: 1,
      shiritoriResult: null,
      shiritoriLiveCanvas: null,
      shiritoriPendingAnswer: false,
      shiritoriMyPendingImage: null,
      quizState: null,
      quizFeed: [],
      quizRevealedAnswer: null,
      quizResult: null,
    }),
}));
