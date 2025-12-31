import { create } from 'zustand';
import type { Room, Player, Settings, GameMode, LobbyChatItem } from '@/shared/types';

interface RoomState {
  room: Room | null;
  playerId: string | null;
  connected: boolean;
  error: string | null;
  lobbyChatMessages: LobbyChatItem[];
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  setSettings: (settings: Settings) => void;
  setGameMode: (mode: GameMode) => void;
  setPlayerId: (id: string) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  addLobbyChatMessage: (message: LobbyChatItem) => void;
  clearLobbyChatMessages: () => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  playerId: null,
  connected: false,
  error: null,
  lobbyChatMessages: [],

  setRoom: (room) => set({ room }),

  setPlayers: (players) =>
    set((state) => ({
      room: state.room ? { ...state.room, players } : null,
    })),

  setSettings: (settings) =>
    set((state) =>
      state.room
        ? {
            room: {
              ...state.room,
              settings,
            },
          }
        : { room: null }
    ),

  setGameMode: (mode) =>
    set((state) =>
      state.room
        ? {
            room: {
              ...state.room,
              settings: {
                ...state.room.settings,
                gameMode: mode,
              },
            },
          }
        : { room: null }
    ),

  setPlayerId: (playerId) => set({ playerId }),

  setConnected: (connected) => set({ connected }),

  setError: (error) => set({ error }),

  addLobbyChatMessage: (message) =>
    set((state) => ({
      lobbyChatMessages: [...state.lobbyChatMessages, message],
    })),

  clearLobbyChatMessages: () => set({ lobbyChatMessages: [] }),

  reset: () =>
    set({
      room: null,
      playerId: null,
      connected: false,
      error: null,
      lobbyChatMessages: [],
    }),
}));
