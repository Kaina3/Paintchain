# 20. 人狼モード - フロントエンド実装

## 概要
人狼モードのフロントエンド実装。React コンポーネント、状態管理、UIデザインを担当。


## ファイル構成

```
frontend/src/
├── features/
│   ├── game/
│   │   ├── components/
│   │   │   ├── WerewolfAssign.tsx      # お題配布画面（新規）
│   │   │   ├── WerewolfDrawing.tsx     # 描画画面（新規）
│   │   │   ├── WerewolfReveal.tsx      # 発表画面（新規）
│   │   │   ├── WerewolfDiscussion.tsx  # 議論画面（新規）
│   │   │   ├── WerewolfVoting.tsx      # 投票画面（新規）
│   │   │   └── WerewolfResult.tsx      # 結果画面（新規）
│   │   ├── pages/
│   │   │   └── GamePage.tsx            # ルーティング追加
│   │   └── store/
│   │       └── werewolfStore.ts        # 人狼モード専用ストア（新規）
│   └── room/
│       └── components/
│           └── GameModeSettings.tsx    # 人狼設定UI追加
└── shared/
    └── types/
        └── index.ts                    # 型定義追加
```


## 1. 型定義（shared/types/index.ts）

```typescript
// 人狼モード用型定義

export type WerewolfType = 'wordwolf' | 'impostor';

export interface WerewolfModeSettings {
  werewolfType: WerewolfType;
  assignTimeSec: number;
  drawingTimeSec: number;
  revealTimeSec: number;
  discussionTimeSec: number;
  votingTimeSec: number;
  drawingRounds: number;
  werewolfCount: number;
  autoWerewolfCount: boolean;
  scoring: {
    villagerCatchWolf: number;
    wolfSurvive: number;
    wolfGuessPrompt: number;
  };
  selectedCategories: string[];
}

export interface WerewolfPromptInfo {
  category: string;
  prompt: string | null;
  isHidden: boolean;
}

export interface WerewolfDrawingEntry {
  round: number;
  imageData: string;
}

export interface WerewolfChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

export interface WerewolfVoteResult {
  playerId: string;
  voteCount: number;
}

export interface WerewolfResult {
  werewolves: string[];
  villagerPrompt: string;
  werewolfPrompt: string | null;
  votes: { voterId: string; targetId: string }[];
  voteResults: WerewolfVoteResult[];
  caught: boolean;
  wolfGuessedPrompt: boolean;
  scores: Record<string, number>;
  drawings: { playerId: string; entries: WerewolfDrawingEntry[] }[];
  players: { id: string; name: string; color: string }[];
}
```


## 2. 状態管理（store/werewolfStore.ts）

```typescript
import { create } from 'zustand';
import type { 
  WerewolfPromptInfo, 
  WerewolfChatMessage, 
  WerewolfResult,
  WerewolfDrawingEntry
} from '@/shared/types';

interface WerewolfStore {
  // お題情報
  promptInfo: WerewolfPromptInfo | null;
  setPromptInfo: (info: WerewolfPromptInfo) => void;
  
  // 現在のラウンド
  currentRound: number;
  totalRounds: number;
  setRound: (current: number, total: number) => void;
  
  // 発表中のプレイヤー
  revealingPlayerId: string | null;
  revealingDrawing: string | null;
  setRevealing: (playerId: string | null, drawing: string | null) => void;
  
  // 全員の描画（発表後）
  allDrawings: Map<string, WerewolfDrawingEntry[]>;
  addDrawing: (playerId: string, entry: WerewolfDrawingEntry) => void;
  setAllDrawings: (drawings: Map<string, WerewolfDrawingEntry[]>) => void;
  
  // チャットメッセージ
  chatMessages: WerewolfChatMessage[];
  addChatMessage: (message: WerewolfChatMessage) => void;
  
  // 投票状態
  myVote: string | null;
  setMyVote: (targetId: string | null) => void;
  voteCount: number;
  totalPlayers: number;
  setVoteProgress: (count: number, total: number) => void;
  
  // 結果
  result: WerewolfResult | null;
  setResult: (result: WerewolfResult) => void;
  
  // お題推測（インポスターモード）
  promptChoices: string[];
  setPromptChoices: (choices: string[]) => void;
  
  // リセット
  reset: () => void;
}

export const useWerewolfStore = create<WerewolfStore>((set) => ({
  promptInfo: null,
  setPromptInfo: (info) => set({ promptInfo: info }),
  
  currentRound: 1,
  totalRounds: 2,
  setRound: (current, total) => set({ currentRound: current, totalRounds: total }),
  
  revealingPlayerId: null,
  revealingDrawing: null,
  setRevealing: (playerId, drawing) => set({ 
    revealingPlayerId: playerId, 
    revealingDrawing: drawing 
  }),
  
  allDrawings: new Map(),
  addDrawing: (playerId, entry) => set((state) => {
    const newMap = new Map(state.allDrawings);
    const entries = newMap.get(playerId) ?? [];
    newMap.set(playerId, [...entries, entry]);
    return { allDrawings: newMap };
  }),
  setAllDrawings: (drawings) => set({ allDrawings: drawings }),
  
  chatMessages: [],
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages.slice(-99), message]
  })),
  
  myVote: null,
  setMyVote: (targetId) => set({ myVote: targetId }),
  voteCount: 0,
  totalPlayers: 0,
  setVoteProgress: (count, total) => set({ voteCount: count, totalPlayers: total }),
  
  result: null,
  setResult: (result) => set({ result }),
  
  promptChoices: [],
  setPromptChoices: (choices) => set({ promptChoices: choices }),
  
  reset: () => set({
    promptInfo: null,
    currentRound: 1,
    totalRounds: 2,
    revealingPlayerId: null,
    revealingDrawing: null,
    allDrawings: new Map(),
    chatMessages: [],
    myVote: null,
    voteCount: 0,
    totalPlayers: 0,
    result: null,
    promptChoices: [],
  }),
}));
```


## 3. コンポーネント実装

### 3.1 WerewolfAssign.tsx（お題配布画面）

```tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

export function WerewolfAssign() {
  const { promptInfo } = useWerewolfStore();
  const { room } = useRoomStore();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 演出: 少し遅れてお題を表示
    const timer = setTimeout(() => setShowPrompt(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!promptInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-2xl animate-pulse">🎭 役職を配布中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Timer />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {/* ジャンル表示 */}
        <div className="mb-4 text-lg text-gray-600">
          お題ジャンル
        </div>
        <div className="mb-8 text-3xl font-bold text-indigo-600">
          【{promptInfo.category}】
        </div>

        {/* お題表示 */}
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-8 shadow-xl"
            >
              {promptInfo.isHidden ? (
                // インポスター: お題なし
                <div className="text-center">
                  <div className="text-6xl mb-4">❓</div>
                  <div className="text-xl text-gray-500">
                    あなたのお題は...
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-500">
                    わかりません
                  </div>
                  <div className="mt-4 text-sm text-gray-400">
                    他のプレイヤーの絵を見て推測しましょう
                  </div>
                </div>
              ) : (
                // 通常: お題あり
                <div className="text-center">
                  <div className="text-xl text-gray-500 mb-2">
                    あなたのお題
                  </div>
                  <div className="text-4xl font-bold text-gray-800">
                    {promptInfo.prompt}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 注意書き */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-sm text-gray-500"
        >
          ⚠️ お題を直接描くのはNGです。関連するものを描きましょう。
        </motion.div>
      </motion.div>
    </div>
  );
}
```

### 3.2 WerewolfDrawing.tsx（描画画面）

```tsx
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@/shared/components/Canvas';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import type { DrawingStroke } from '@/shared/types';

interface Props {
  onSubmit: (imageData: string, strokes?: DrawingStroke[]) => void;
}

export function WerewolfDrawing({ onSubmit }: Props) {
  const { promptInfo, currentRound, totalRounds } = useWerewolfStore();
  const { room } = useRoomStore();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);

  const handleSubmit = useCallback((imageData: string) => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    onSubmit(imageData, strokes);
  }, [hasSubmitted, onSubmit, strokes]);

  const handleStrokeAdd = useCallback((stroke: DrawingStroke) => {
    setStrokes(prev => [...prev, stroke]);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">
              ラウンド {currentRound} / {totalRounds}
            </div>
            <div className="text-lg font-bold">
              【{promptInfo?.category}】
              {!promptInfo?.isHidden && ` ${promptInfo?.prompt}`}
            </div>
          </div>
          <Timer />
        </div>
      </div>

      {/* キャンバス */}
      <div className="flex-1 p-4">
        <Canvas
          onSubmit={handleSubmit}
          onStrokeAdd={handleStrokeAdd}
          disabled={hasSubmitted}
        />
      </div>

      {/* 提出状態 */}
      {hasSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/50"
        >
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="text-4xl mb-4">✅</div>
            <div className="text-xl font-bold">提出完了！</div>
            <div className="mt-2 text-gray-500">
              他のプレイヤーを待っています...
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

### 3.3 WerewolfReveal.tsx（発表画面）

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

export function WerewolfReveal() {
  const { revealingPlayerId, revealingDrawing, currentRound } = useWerewolfStore();
  const { room } = useRoomStore();

  const revealingPlayer = room?.players.find(p => p.id === revealingPlayerId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Timer />

      <div className="text-center mb-8">
        <div className="text-lg text-gray-500">
          ラウンド {currentRound} - 発表
        </div>
      </div>

      <AnimatePresence mode="wait">
        {revealingPlayer && revealingDrawing && (
          <motion.div
            key={revealingPlayerId}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* プレイヤー名 */}
            <div className="mb-4 flex items-center justify-center gap-2">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: revealingPlayer.color }}
              />
              <span className="text-2xl font-bold">
                {revealingPlayer.name}
              </span>
            </div>

            {/* 絵 */}
            <div className="rounded-2xl bg-white p-4 shadow-xl">
              <img
                src={revealingDrawing}
                alt={`${revealingPlayer.name}の絵`}
                className="max-w-md rounded-lg"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 3.4 WerewolfDiscussion.tsx（議論画面）

```tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

interface Props {
  onSendChat: (message: string) => void;
}

export function WerewolfDiscussion({ onSendChat }: Props) {
  const { allDrawings, chatMessages, currentRound, totalRounds } = useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    onSendChat(inputText.trim());
    setInputText('');
  }, [inputText, onSendChat]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">
            🗣️ 議論タイム（ラウンド {currentRound}/{totalRounds}）
          </div>
          <Timer />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 絵の一覧 */}
        <div className="w-1/2 overflow-y-auto border-r p-4">
          <div className="grid grid-cols-2 gap-4">
            {room?.players.map(player => {
              const entries = allDrawings.get(player.id) ?? [];
              const latestDrawing = entries[entries.length - 1];
              
              return (
                <motion.div
                  key={player.id}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-lg bg-white p-2 shadow"
                >
                  <div className="mb-1 flex items-center gap-1 text-sm">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-medium">{player.name}</span>
                  </div>
                  {latestDrawing && (
                    <img
                      src={latestDrawing.imageData}
                      alt={`${player.name}の絵`}
                      className="w-full rounded"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* チャット */}
        <div className="flex w-1/2 flex-col">
          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto p-4">
            {chatMessages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`mb-2 ${msg.playerId === playerId ? 'text-right' : ''}`}
              >
                <div className="inline-block max-w-[80%] rounded-lg bg-white p-2 shadow">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: msg.playerColor }}
                    />
                    <span>{msg.playerName}</span>
                  </div>
                  <div className="mt-1">{msg.text}</div>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* 入力欄 */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                className="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="rounded-full bg-amber-500 px-6 py-2 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3.5 WerewolfVoting.tsx（投票画面）

```tsx
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Timer } from './Timer';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';

interface Props {
  onVote: (targetId: string) => void;
}

export function WerewolfVoting({ onVote }: Props) {
  const { allDrawings, myVote, voteCount, totalPlayers } = useWerewolfStore();
  const { room, playerId } = useRoomStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleVote = useCallback(() => {
    if (!selectedId || myVote) return;
    onVote(selectedId);
  }, [selectedId, myVote, onVote]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-red-500 to-pink-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">🗳️ 投票タイム</div>
            <div className="text-sm opacity-80">
              人狼だと思う人を選んでください
            </div>
          </div>
          <Timer />
        </div>
      </div>

      {/* 投票進捗 */}
      <div className="bg-gray-100 p-2 text-center text-sm">
        投票済み: {voteCount} / {totalPlayers}
      </div>

      {/* プレイヤー一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {room?.players
            .filter(p => p.id !== playerId) // 自分は除外
            .map(player => {
              const entries = allDrawings.get(player.id) ?? [];
              const isSelected = selectedId === player.id;
              const isVoted = myVote === player.id;

              return (
                <motion.button
                  key={player.id}
                  whileHover={{ scale: myVote ? 1 : 1.02 }}
                  whileTap={{ scale: myVote ? 1 : 0.98 }}
                  onClick={() => !myVote && setSelectedId(player.id)}
                  disabled={!!myVote}
                  className={`rounded-xl p-4 text-left transition-all ${
                    isVoted
                      ? 'bg-red-100 ring-2 ring-red-500'
                      : isSelected
                      ? 'bg-indigo-100 ring-2 ring-indigo-500'
                      : 'bg-white hover:bg-gray-50'
                  } shadow`}
                >
                  {/* プレイヤー情報 */}
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-bold">{player.name}</span>
                  </div>

                  {/* 絵の履歴 */}
                  <div className="flex gap-1">
                    {entries.map((entry, i) => (
                      <img
                        key={i}
                        src={entry.imageData}
                        alt={`Round ${entry.round}`}
                        className="h-16 w-16 rounded object-cover"
                      />
                    ))}
                  </div>

                  {isVoted && (
                    <div className="mt-2 text-center text-sm text-red-600">
                      投票済み ✓
                    </div>
                  )}
                </motion.button>
              );
            })}
        </div>
      </div>

      {/* 投票ボタン */}
      {!myVote && (
        <div className="border-t p-4">
          <button
            onClick={handleVote}
            disabled={!selectedId}
            className="w-full rounded-full bg-red-500 py-3 text-lg font-bold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {selectedId
              ? `${room?.players.find(p => p.id === selectedId)?.name} に投票する`
              : 'プレイヤーを選択してください'}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3.6 WerewolfResult.tsx（結果画面）

```tsx
import { motion } from 'framer-motion';
import { useWerewolfStore } from '../store/werewolfStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { ReturnToLobbyButton } from './ReturnToLobbyButton';

export function WerewolfResult() {
  const { result } = useWerewolfStore();
  const { room } = useRoomStore();

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-2xl animate-pulse">結果を集計中...</div>
      </div>
    );
  }

  const werewolfPlayers = result.players.filter(p => 
    result.werewolves.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white">
      {/* タイトル */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="text-4xl font-bold">
          {result.caught ? '🎉 村人の勝利！' : '🐺 人狼の勝利！'}
        </div>
      </motion.div>

      {/* 人狼は誰だったか */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8 rounded-2xl bg-gray-800 p-6 text-center"
      >
        <div className="mb-4 text-lg text-gray-400">人狼は...</div>
        <div className="flex justify-center gap-4">
          {werewolfPlayers.map(player => (
            <div key={player.id} className="text-center">
              <div
                className="mx-auto mb-2 h-16 w-16 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <div className="text-xl font-bold">{player.name}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* お題の違い */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mb-8 grid grid-cols-2 gap-4"
      >
        <div className="rounded-xl bg-blue-900/50 p-4 text-center">
          <div className="mb-2 text-sm text-blue-300">村人のお題</div>
          <div className="text-2xl font-bold">{result.villagerPrompt}</div>
        </div>
        <div className="rounded-xl bg-red-900/50 p-4 text-center">
          <div className="mb-2 text-sm text-red-300">人狼のお題</div>
          <div className="text-2xl font-bold">
            {result.werewolfPrompt ?? '（なし）'}
          </div>
        </div>
      </motion.div>

      {/* 投票結果 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mb-8"
      >
        <h3 className="mb-4 text-lg font-bold">投票結果</h3>
        <div className="space-y-2">
          {result.voteResults.map(({ playerId, voteCount }) => {
            const player = result.players.find(p => p.id === playerId);
            const isWerewolf = result.werewolves.includes(playerId);
            
            return (
              <div
                key={playerId}
                className={`flex items-center justify-between rounded-lg p-3 ${
                  isWerewolf ? 'bg-red-900/30' : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: player?.color }}
                  />
                  <span>{player?.name}</span>
                  {isWerewolf && <span className="text-red-400">🐺</span>}
                </div>
                <div className="font-bold">{voteCount} 票</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* スコアボード */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mb-8"
      >
        <h3 className="mb-4 text-lg font-bold">スコア</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {result.players
            .sort((a, b) => (result.scores[b.id] ?? 0) - (result.scores[a.id] ?? 0))
            .map(player => (
              <div
                key={player.id}
                className="rounded-lg bg-gray-700/50 p-3 text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="text-sm">{player.name}</span>
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {result.scores[player.id] ?? 0}
                </div>
              </div>
            ))}
        </div>
      </motion.div>

      {/* ロビーに戻るボタン */}
      <div className="text-center">
        <ReturnToLobbyButton />
      </div>
    </div>
  );
}
```


## 4. GamePage.tsx の更新

```tsx
// 人狼モードのルーティングを追加
if (gameMode === 'werewolf') {
  switch (phase) {
    case 'werewolf_assign':
      return <WerewolfAssign />;
    case 'werewolf_drawing':
      return <WerewolfDrawing onSubmit={submitDrawing} />;
    case 'werewolf_reveal':
      return <WerewolfReveal />;
    case 'werewolf_discussion':
      return <WerewolfDiscussion onSendChat={sendWerewolfChat} />;
    case 'werewolf_voting':
      return <WerewolfVoting onVote={sendWerewolfVote} />;
    case 'werewolf_result':
    case 'result':
      return <WerewolfResult />;
  }
}
```


## 5. useWebSocket.ts の更新

```typescript
// 人狼モード用のイベント送信関数を追加
const sendWerewolfVote = useCallback((targetId: string) => {
  send({ type: 'werewolf_vote', payload: { targetId } });
}, [send]);

const sendWerewolfChat = useCallback((message: string) => {
  send({ type: 'werewolf_chat', payload: { message } });
}, [send]);

const sendWerewolfGuess = useCallback((guess: string) => {
  send({ type: 'werewolf_guess_prompt', payload: { guess } });
}, [send]);

// イベントハンドラーの追加
case 'werewolf_role_assigned':
  useWerewolfStore.getState().setPromptInfo(payload as WerewolfPromptInfo);
  break;

case 'werewolf_chat_message':
  useWerewolfStore.getState().addChatMessage(payload as WerewolfChatMessage);
  break;

case 'werewolf_vote_update':
  useWerewolfStore.getState().setVoteProgress(payload.voteCount, payload.totalPlayers);
  break;

case 'werewolf_reveal_player':
  useWerewolfStore.getState().setRevealing(payload.playerId, payload.drawing);
  break;

case 'werewolf_result':
  useWerewolfStore.getState().setResult(payload as WerewolfResult);
  break;
```


## 実装チェックリスト

- [ ] 型定義追加（shared/types/index.ts）
- [ ] werewolfStore.ts 作成
- [ ] WerewolfAssign.tsx 作成
- [ ] WerewolfDrawing.tsx 作成
- [ ] WerewolfReveal.tsx 作成
- [ ] WerewolfDiscussion.tsx 作成
- [ ] WerewolfVoting.tsx 作成
- [ ] WerewolfResult.tsx 作成
- [ ] GamePage.tsx 更新
- [ ] useWebSocket.ts 更新
- [ ] GameModeSettings.tsx に人狼設定UI追加
- [ ] モバイル対応（レスポンシブ）
- [ ] アニメーション・演出の調整
