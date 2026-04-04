# 19. 人狼モード - サーバー側実装

## 概要
人狼モードのバックエンド実装。ゲームロジック、状態管理、WebSocketイベント処理を担当。


## ファイル構成

```
server/src/
├── domain/
│   └── entities.ts              # GameMode, GamePhase, Settings追加
├── application/
│   └── gameModes/
│       ├── index.ts             # WerewolfModeHandler登録
│       └── werewolfMode.ts      # 人狼モードハンドラー（新規）
├── data/
│   └── werewolfPrompts.ts       # 人狼用お題データ（新規）
└── infra/
    └── ws/
        └── wsHandler.ts         # WebSocketイベント追加
```


## 1. entities.ts 変更

### GameMode追加
```typescript
export type GameMode = 'normal' | 'animation' | 'shiritori' | 'quiz' | 'werewolf';
```

### GamePhase追加
```typescript
export type GamePhase = 
  | 'prompt' | 'first-frame' | 'drawing' | 'guessing' | 'result'
  | 'quiz_prompt' | 'quiz_drawing' | 'quiz_guessing' | 'quiz_reveal'
  | 'werewolf_assign' | 'werewolf_drawing' | 'werewolf_reveal' 
  | 'werewolf_discussion' | 'werewolf_voting' | 'werewolf_result';
```

### WerewolfModeSettings追加
```typescript
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
```

### Settings更新
```typescript
export interface Settings {
  maxPlayers: number;
  gameMode: GameMode;
  normalSettings: NormalModeSettings;
  animationSettings: AnimationModeSettings;
  shiritoriSettings: ShiritoriModeSettings;
  quizSettings: QuizModeSettings;
  werewolfSettings: WerewolfModeSettings;  // 追加
}
```

### createDefaultSettings更新
```typescript
export function createDefaultSettings(): Settings {
  return {
    // ... 既存 ...
    werewolfSettings: {
      werewolfType: 'wordwolf',
      assignTimeSec: 5,
      drawingTimeSec: 60,
      revealTimeSec: 5,
      discussionTimeSec: 90,
      votingTimeSec: 30,
      drawingRounds: 2,
      werewolfCount: 1,
      autoWerewolfCount: true,
      scoring: {
        villagerCatchWolf: 2,
        wolfSurvive: 3,
        wolfGuessPrompt: 1,
      },
      selectedCategories: [],
    },
  };
}
```


## 2. werewolfMode.ts 新規作成

```typescript
import type { Chain, GamePhase, Room, DrawingStroke } from '../../domain/entities.js';
import type { ContentPayload, GameModeHandler, SubmissionData } from '../../domain/gameMode.js';
import { generatePlayerId } from '../../infra/services/idGenerator.js';
import { getWerewolfPromptPair, getPromptChoices } from '../../data/werewolfPrompts.js';

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
  currentRevealIndex: number;  // 発表中のプレイヤーインデックス
  drawings: Map<string, DrawingEntry[]>;
  votes: Map<string, string>;
  wolfGuess: string | null;    // インポスターがお題を当てた回答
  scores: Record<string, number>;
  chatMessages: ChatMessage[];
}

export interface WerewolfResult {
  werewolves: string[];
  villagerPrompt: string;
  werewolfPrompt: string | null;
  votes: { voterId: string; targetId: string }[];
  voteResults: VoteResult[];
  caught: boolean;              // 人狼が当てられたか
  wolfGuessedPrompt: boolean;   // 人狼がお題を当てたか（インポスター）
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

  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number, room?: Room): GamePhase | 'result' {
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
          // 次のラウンドへ
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
        // 発表時間 × 人数（動的に計算する必要がある場合はroomを渡す）
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
    const playerIds = room.players.map(p => p.id);
    
    // 人狼を選出
    const wolfCount = getWerewolfCount(
      playerIds.length, 
      settings.werewolfCount, 
      settings.autoWerewolfCount
    );
    const werewolves = selectWerewolves(playerIds, wolfCount);
    
    // お題を取得
    const { category, villagerPrompt, werewolfPrompt, choices } = 
      getWerewolfPromptPair(settings.werewolfType, settings.selectedCategories);
    
    // スコア初期化
    const scores: Record<string, number> = {};
    playerIds.forEach(id => { scores[id] = 0; });
    
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
    playerIds.forEach(id => {
      state.drawings.set(id, []);
    });
    
    werewolfStates.set(room.id, state);
    
    room.currentPhase = 'werewolf_assign';
    room.currentTurn = 1;
    room.totalTurns = settings.drawingRounds * 3 + 2; // assign + (draw+reveal+discuss)*rounds + voting + result
  }

  getExpectedSubmitters(room: Room): string[] {
    // 描画フェーズでは全員が提出必要
    if (room.currentPhase === 'werewolf_drawing') {
      return room.players.map(p => p.id);
    }
    // 投票フェーズでも全員が投票必要
    if (room.currentPhase === 'werewolf_voting') {
      return room.players.map(p => p.id);
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
        // 人狼用のお題（インポスターの場合はジャンルのみ）
        const prompt = state.werewolfPrompt ?? `【${state.category}】???`;
        payloads.set(player.id, { 
          type: 'text', 
          payload: JSON.stringify({
            category: state.category,
            prompt: state.werewolfType === 'impostor' ? null : state.werewolfPrompt,
            isHidden: state.werewolfType === 'impostor',
          })
        });
      } else {
        // 村人用のお題
        payloads.set(player.id, { 
          type: 'text', 
          payload: JSON.stringify({
            category: state.category,
            prompt: state.villagerPrompt,
            isHidden: false,
          })
        });
      }
    }

    return payloads;
  }

  handleSubmission(room: Room, playerId: string, data: SubmissionData, _chains: Chain[]): boolean {
    const state = werewolfStates.get(room.id);
    if (!state) return false;

    if (room.currentPhase === 'werewolf_drawing' && data.type === 'drawing') {
      // 描画を保存
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
        // 村人勝利: 村人に得点
        state.scores[player.id] += settings.scoring.villagerCatchWolf;
      } else if (!caught && isWerewolf) {
        // 人狼勝利: 人狼に得点
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
        entries 
      })),
      players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color })),
    };
  }
}

// ========== 追加のエクスポート関数 ==========

// 投票を処理
export function handleVote(roomId: string, voterId: string, targetId: string): boolean {
  const state = werewolfStates.get(roomId);
  if (!state || voterId === targetId) return false;
  
  state.votes.set(voterId, targetId);
  return true;
}

// チャットメッセージを追加
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
  
  // 最新100件のみ保持
  if (state.chatMessages.length > 100) {
    state.chatMessages = state.chatMessages.slice(-100);
  }
  
  return message;
}

// インポスターのお題推測を処理
export function handleWolfGuess(roomId: string, playerId: string, guess: string): boolean {
  const state = werewolfStates.get(roomId);
  if (!state || !state.werewolves.has(playerId)) return false;
  
  state.wolfGuess = guess;
  return true;
}

// 発表インデックスを進める
export function advanceRevealIndex(roomId: string): number {
  const state = werewolfStates.get(roomId);
  if (!state) return -1;
  
  state.currentRevealIndex++;
  return state.currentRevealIndex;
}

// 現在の発表インデックスを取得
export function getCurrentRevealIndex(roomId: string): number {
  const state = werewolfStates.get(roomId);
  return state?.currentRevealIndex ?? 0;
}

// 発表インデックスをリセット
export function resetRevealIndex(roomId: string): void {
  const state = werewolfStates.get(roomId);
  if (state) {
    state.currentRevealIndex = 0;
  }
}
```


## 3. wsHandler.ts 変更

### イベント型追加

```typescript
interface WSClientEvent {
  type:
    | /* 既存 */
    | 'werewolf_vote'
    | 'werewolf_chat'
    | 'werewolf_guess_prompt'
    | 'werewolf_drawing_sync';
  payload: {
    // 既存フィールド...
    targetId?: string;      // 投票先
    message?: string;       // チャットメッセージ
    guess?: string;         // お題推測
  };
}

interface WSServerEvent {
  type:
    | /* 既存 */
    | 'werewolf_role_assigned'
    | 'werewolf_drawing_update'
    | 'werewolf_reveal_player'
    | 'werewolf_chat_message'
    | 'werewolf_vote_update'
    | 'werewolf_state'
    | 'werewolf_result';
  payload: unknown;
}
```

### イベントハンドラー追加

```typescript
// 投票処理
case 'werewolf_vote': {
  const { targetId } = event.payload;
  const room = getRoom(roomId);
  if (!room || room.currentPhase !== 'werewolf_voting' || !targetId) break;
  
  const success = handleVote(roomId, playerId, targetId);
  if (success) {
    const state = getWerewolfState(roomId);
    broadcastToRoom(room, {
      type: 'werewolf_vote_update',
      payload: {
        voterId: playerId,
        voteCount: state?.votes.size ?? 0,
        totalPlayers: room.players.length,
      },
    });
  }
  break;
}

// チャット処理
case 'werewolf_chat': {
  const { message } = event.payload;
  const room = getRoom(roomId);
  if (!room || !message) break;
  
  const player = room.players.find(p => p.id === playerId);
  if (!player) break;
  
  const chatMessage = addChatMessage(roomId, playerId, player.name, player.color, message);
  if (chatMessage) {
    broadcastToRoom(room, {
      type: 'werewolf_chat_message',
      payload: chatMessage,
    });
  }
  break;
}

// お題推測処理（インポスターモード）
case 'werewolf_guess_prompt': {
  const { guess } = event.payload;
  const room = getRoom(roomId);
  if (!room || !guess) break;
  
  handleWolfGuess(roomId, playerId, guess);
  break;
}
```


## 4. index.ts 更新

```typescript
import type { GameMode } from '../../domain/entities.js';
import type { GameModeHandler } from '../../domain/gameMode.js';
import { NormalModeHandler } from './normalMode.js';
import { AnimationModeHandler } from './animationMode.js';
import { ShiritoriModeHandler } from './shiritoriMode.js';
import { QuizModeHandler } from './quizMode.js';
import { WerewolfModeHandler } from './werewolfMode.js';

const handlers: Record<GameMode, GameModeHandler> = {
  normal: new NormalModeHandler(),
  animation: new AnimationModeHandler(),
  shiritori: new ShiritoriModeHandler(),
  quiz: new QuizModeHandler(),
  werewolf: new WerewolfModeHandler(),
};

export function getGameModeHandler(mode: GameMode): GameModeHandler {
  return handlers[mode] ?? handlers.normal;
}
```


## 5. 発表フェーズの時間計算

発表フェーズの時間は人数に応じて動的に計算する必要がある。
`getTimeLimit`を呼ぶ際にroomを渡せるよう、インターフェースを拡張するか、
別の方法で対応する。

```typescript
// gameUseCases.ts での対応案
function getRevealTimeForWerewolf(room: Room): number {
  const playerCount = room.players.length;
  const perPlayerTime = room.settings.werewolfSettings.revealTimeSec;
  return playerCount * perPlayerTime;
}
```


## 実装チェックリスト

- [ ] entities.ts に型定義追加
- [ ] createDefaultSettings に werewolfSettings 追加
- [ ] werewolfMode.ts 新規作成
- [ ] werewolfPrompts.ts 新規作成（次の計画書）
- [ ] index.ts にハンドラー登録
- [ ] wsHandler.ts にイベント追加
- [ ] gameUseCases.ts で人狼モード対応
- [ ] 発表フェーズの時間動的計算
