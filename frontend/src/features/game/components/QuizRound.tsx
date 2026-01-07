import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { Canvas, type CanvasRef } from '@/shared/components/Canvas';
import { Timer } from '@/features/game/components/Timer';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { wsManager } from '@/shared/lib/websocket';
import type { QuizFeedItem } from '@/shared/types';

interface QuizRoundProps {
  onSubmitDrawing: (imageData: string) => void;
  onSubmitGuess: (text: string) => void;
}

// 弾幕アイテム
function DanmakuItem({ item, lane }: { item: QuizFeedItem; lane: number }) {
  // 正解時は金色、それ以外はプレイヤーカラー
  const textColor = item.kind === 'correct' ? '#FFD700' : (item.playerColor || '#FFFFFF');
  
  return (
    <div
      className={`danmaku-item absolute whitespace-nowrap font-bold ${
        item.kind === 'correct' ? 'text-lg' : ''
      }`}
      style={{ 
        top: `${lane * 40 + 12}px`,
        color: textColor,
        fontSize: '1.2rem',
        WebkitTextStroke: '1.5px white',
        paintOrder: 'stroke fill',
        textShadow: `
          0 0 4px white,
          0 0 4px white,
          0 0 8px rgba(255,255,255,0.5)
        `,
      }}
    >
      <span>{item.text}</span>
    </div>
  );
}

// 弾幕オーバーレイ
function DanmakuOverlay({ items }: { items: QuizFeedItem[] }) {
  const [activeItems, setActiveItems] = useState<{ item: QuizFeedItem; lane: number; key: string }[]>([]);
  const lanes = useRef<number[]>(new Array(6).fill(0));

  // items側から削除された弾幕（例: 正解時にローカルguessを取り消す）を即座に反映
  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    setActiveItems((prev) => prev.filter((i) => ids.has(i.key)));
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    const latest = items[items.length - 1];
    
    // 最も古いレーンを選択
    const now = Date.now();
    let minLane = 0;
    let minTime = lanes.current[0];
    for (let i = 1; i < lanes.current.length; i++) {
      if (lanes.current[i] < minTime) {
        minTime = lanes.current[i];
        minLane = i;
      }
    }
    lanes.current[minLane] = now;

    setActiveItems((prev) => [...prev, { item: latest, lane: minLane, key: latest.id }]);

    // 8秒後に削除（アニメーション時間と同じ）
    const timer = setTimeout(() => {
      setActiveItems((prev) => prev.filter((i) => i.key !== latest.id));
    }, 8000);

    return () => clearTimeout(timer);
  }, [items]);

  return (
    <div className="danmaku-container pointer-events-none absolute inset-0 overflow-hidden">
      {activeItems.map(({ item, lane, key }) => (
        <DanmakuItem key={key} item={item} lane={lane} />
      ))}
    </div>
  );
}

// スコアボード
function Scoreboard({ scores, players, drawerId }: { 
  scores: Record<string, number>; 
  players: { id: string; name: string }[];
  drawerId: string;
}) {
  const sorted = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  
  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
            p.id === drawerId
              ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-400'
              : i === 0
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {i === 0 && '👑'}{p.name}: {scores[p.id] ?? 0}pt
        </div>
      ))}
    </div>
  );
}

// お題確認フェーズ（親のみ）
function PromptViewPhase({ prompt, hint }: { prompt: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-8 text-center text-white shadow-xl">
        <p className="text-lg opacity-80">お題を確認してください</p>
        {hint && (
          <p className="mt-2 text-sm opacity-70">ヒント: {hint}</p>
        )}
        <p className="mt-4 text-5xl font-black">{prompt}</p>
        <p className="mt-4 text-sm opacity-70">まもなく描画開始...</p>
      </div>
    </div>
  );
}

// 親（描画者）ビュー
function DrawerView({ prompt, hint, onSubmit, isRevealMode }: { 
  prompt: string; 
  hint?: string;
  onSubmit: (imageData: string) => void;
  isRevealMode: boolean;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const { hasSubmitted, phase, quizRevealedAnswer } = useGameStore();
  const canvasRef = useRef<CanvasRef>(null);
  const lastSentRef = useRef<string>('');

  const { roomId } = useParams<{ roomId: string }>();
  const { send } = useWebSocket(roomId ?? null);

  const handleSubmit = () => {
    const imageData = canvasRef.current?.getImageData();
    if (imageData) {
      onSubmit(imageData);
    }
  };

  // realtime形式: 描画中のキャンバスを同期（submit後一括公開ではなく、描いてる最中を見せる）
  useEffect(() => {
    if (isRevealMode) return;
    if (phase !== 'quiz_drawing') return;

    const interval = setInterval(() => {
      const imageData = canvasRef.current?.getImageData();
      if (!imageData) return;
      if (imageData === lastSentRef.current) return;
      lastSentRef.current = imageData;
      send({ type: 'quiz_canvas_sync', payload: { imageData } });
    }, 500);

    return () => clearInterval(interval);
  }, [isRevealMode, phase, send]);

  // お題表示テキスト（ヒントがあれば括弧で追加）
  const promptDisplayText = hint ? `${prompt}（${hint}）` : prompt;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-violet-600 px-3 py-1 text-sm font-bold text-white">
            🎨 あなたの番
          </span>
          <button
            className="rounded-lg bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700 active:bg-gray-300"
            onMouseDown={() => setShowPrompt(true)}
            onMouseUp={() => setShowPrompt(false)}
            onMouseLeave={() => setShowPrompt(false)}
            onTouchStart={() => setShowPrompt(true)}
            onTouchEnd={() => setShowPrompt(false)}
          >
            {showPrompt ? `お題: ${promptDisplayText}` : '👀 押してお題を見る'}
          </button>
          {isRevealMode && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
              🔒 他の人には見えていません
            </span>
          )}
        </div>
        {!hasSubmitted && (
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700"
          >
            提出する
          </button>
        )}
      </div>
      <div className="flex-1">
        <Canvas ref={canvasRef} />
      </div>

      {phase === 'quiz_reveal' && quizRevealedAnswer && (
        <div className="mt-3 rounded-xl bg-violet-50 p-4 text-center">
          <div className="text-sm font-semibold text-violet-700">答え</div>
          <div className="mt-1 text-2xl font-black text-violet-900">{quizRevealedAnswer}</div>
        </div>
      )}

      {hasSubmitted && (
        <div className="mt-2 text-center text-sm text-gray-500">
          描画を送信しました！{isRevealMode ? 'まもなく公開されます...' : 'みんなの回答を待っています...'}
        </div>
      )}
    </div>
  );
}

// 子（回答者）ビュー
function GuesserView({ 
  drawing, 
  onSubmit,
  winners,
  maxWinners,
  canvasLocked,
  isRevealMode,
  canGuess,
  revealedPrompt,
}: { 
  drawing: string | null; 
  onSubmit: (text: string) => void;
  winners: { playerId: string; rank: number }[];
  maxWinners: number;
  canvasLocked: boolean;
  isRevealMode: boolean;
  canGuess: boolean;
  revealedPrompt?: string;
}) {
  const [guess, setGuess] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const { playerId, room } = useRoomStore();
  const { phase, quizRevealedAnswer, addQuizFeed } = useGameStore();
  const hasWon = winners.some((w) => w.playerId === playerId);

  const handleSubmit = () => {
    if (!guess.trim() || !canGuess || !playerId) return;
    const text = guess.trim();
    
    // 即座にローカルで弾幕表示（サーバー応答を待たずに）
    const currentPlayer = room?.players.find(p => p.id === playerId);
    const playerName = currentPlayer?.name ?? '?';
    const playerColor = currentPlayer?.color ?? '#808080';
    addQuizFeed({
      id: `local-${Date.now()}-${Math.random()}`,
      playerId,
      playerName,
      playerColor,
      text,
      kind: 'guess',
      createdAt: Date.now(),
    });
    
    // ローカル送信を記録（重複防止用）
    wsManager.markLocalQuizSubmission(playerId);
    
    onSubmit(text);
    setGuess('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposing) {
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative aspect-square w-full max-w-md mx-auto bg-white rounded-xl shadow-inner overflow-hidden">
        {canvasLocked ? (
          <div className="flex h-full flex-col items-center justify-center bg-gray-100 text-gray-500">
            <span className="text-5xl mb-4">🔒</span>
            <p className="font-bold">描画中...</p>
            <p className="text-sm">完成したら公開されます</p>
          </div>
        ) : drawing ? (
          <img src={drawing} alt="Quiz drawing" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            描画を待っています...
          </div>
        )}
      </div>

      {phase === 'quiz_reveal' && quizRevealedAnswer && (
        <div className="mt-3 rounded-xl bg-violet-50 p-4 text-center">
          <div className="text-sm font-semibold text-violet-700">答え</div>
          <div className="mt-1 text-2xl font-black text-violet-900">{quizRevealedAnswer}</div>
        </div>
      )}
      
      <div className="mt-auto pt-4">
        {hasWon ? (
          <div className="rounded-xl bg-green-100 p-4 text-center">
            <div className="text-sm font-semibold text-green-800">🎉 正解！</div>
            {phase !== 'quiz_reveal' && revealedPrompt && (
              <div className="mt-1 text-2xl font-black text-green-900">{revealedPrompt}</div>
            )}
            <p className="mt-2 font-bold text-green-700">正解しました！</p>
          </div>
        ) : canGuess ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="答えを入力..."
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-lg focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              onClick={handleSubmit}
              disabled={!guess.trim()}
              className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              送信
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 p-4 text-center text-gray-500">
            {isRevealMode ? '絵が完成するまでお待ちください...' : '回答待機中...'}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
          <span>正解者: {winners.length}/{maxWinners}人</span>
          <span>🏆 {winners.map((w) => `${w.rank}位`).join(', ') || 'まだなし'}</span>
        </div>
      </div>
    </div>
  );
}

// 結果画面
function QuizResultView() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { send } = useWebSocket(roomId ?? null);
  const { quizResult, reset: resetGame } = useGameStore();

  if (!quizResult) return null;

  const sorted = [...quizResult.players].sort(
    (a, b) => (quizResult.scores[b.id] ?? 0) - (quizResult.scores[a.id] ?? 0)
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-center text-2xl font-black text-gray-900">🏆 最終結果</h2>
        <div className="space-y-2">
          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-xl p-3 ${
                i === 0 ? 'bg-yellow-100' : i === 1 ? 'bg-gray-100' : i === 2 ? 'bg-orange-100' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="font-bold text-gray-900">{player.name}</span>
              </div>
              <span className="font-bold text-violet-600">{quizResult.scores[player.id] ?? 0}pt</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700"
          onClick={() => {
            send({ type: 'return_to_lobby', payload: {} });
            resetGame();
            if (roomId) navigate(`/room/${roomId}`);
          }}
        >
          ロビーに戻る
        </button>
      </div>
    </div>
  );
}

export function QuizRound({ onSubmitDrawing, onSubmitGuess }: QuizRoundProps) {
  const { room, playerId } = useRoomStore();
  const { phase, quizState, quizFeed, currentTurn, totalTurns } = useGameStore();

  if (phase === 'result') {
    return <QuizResultView />;
  }

  if (!quizState || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-bounce">❓</div>
          <p className="mt-4 text-gray-600">クイズを準備中...</p>
        </div>
      </div>
    );
  }

  const isDrawer = playerId === quizState.drawerId;
  const players = room.players.map((p) => ({ id: p.id, name: p.name }));
  const isRevealMode = quizState.quizFormat === 'reveal';
  // realtimeモード: quiz_drawingで回答可能
  // revealモード: quiz_guessingで回答可能
  const canGuess = isRevealMode ? phase === 'quiz_guessing' : phase === 'quiz_drawing';

  // お題確認フェーズ（親のみ表示）
  if (phase === 'quiz_prompt' && isDrawer) {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Timer />
            <span className="text-sm font-semibold text-gray-500">
              ラウンド {currentTurn + 1}/{totalTurns}
            </span>
          </div>
          <Scoreboard scores={quizState.scores} players={players} drawerId={quizState.drawerId} />
        </div>
        <div className="flex-1">
          <PromptViewPhase prompt={quizState.prompt ?? ''} hint={quizState.promptHint} />
        </div>
      </div>
    );
  }

  // お題確認フェーズ（他のプレイヤー）
  if (phase === 'quiz_prompt' && !isDrawer) {
    const drawerName = room.players.find(p => p.id === quizState.drawerId)?.name ?? '???';
    return (
      <div className="flex min-h-screen flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Timer />
            <span className="text-sm font-semibold text-gray-500">
              ラウンド {currentTurn + 1}/{totalTurns}
            </span>
          </div>
          <Scoreboard scores={quizState.scores} players={players} drawerId={quizState.drawerId} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <span className="text-5xl">🎨</span>
            <p className="mt-4 text-xl font-bold text-gray-700">
              {drawerName} さんがお題を確認中...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      {/* ヘッダー */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Timer />
          <span className="text-sm font-semibold text-gray-500">
            ラウンド {currentTurn + 1}/{totalTurns}
          </span>
          {phase === 'quiz_guessing' && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
              🔓 回答タイム！
            </span>
          )}
        </div>
        <Scoreboard scores={quizState.scores} players={players} drawerId={quizState.drawerId} />
      </div>

      {/* メインコンテンツ */}
      <div className="relative flex-1">
        {/* 弾幕 */}
        <DanmakuOverlay items={quizFeed} />

        {/* フェーズ別コンテンツ */}
        {isDrawer ? (
          <DrawerView 
            prompt={quizState.prompt ?? ''} 
            hint={quizState.promptHint}
            onSubmit={onSubmitDrawing}
            isRevealMode={isRevealMode}
          />
        ) : (
          <GuesserView
            drawing={quizState.currentDrawing}
            onSubmit={onSubmitGuess}
            winners={quizState.winners}
            maxWinners={quizState.maxWinners}
            canvasLocked={quizState.canvasLocked}
            isRevealMode={isRevealMode}
            canGuess={canGuess}
            revealedPrompt={quizState.prompt}
          />
        )}
      </div>
    </div>
  );
}
