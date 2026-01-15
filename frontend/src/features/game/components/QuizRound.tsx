import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { Canvas, type CanvasRef } from '@/shared/components/Canvas';
import { Timer } from '@/features/game/components/Timer';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { wsManager } from '@/shared/lib/websocket';
import type { QuizFeedItem } from '@/shared/types';
import { PaintSplashOverlay } from '@/shared/components/PaintSplashOverlay';
import museumBg from '@/assets/museum_simple.png';

interface QuizRoundProps {
  onSubmitDrawing: (imageData: string) => void;
  onSubmitGuess: (text: string) => void;
}

const frameStyle = {
  border: '6px solid transparent',
  borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)'
} as const;

function MuseumBackdrop({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative overflow-auto"
      style={{
        backgroundImage: `url(${museumBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <PaintSplashOverlay />
      <div className="absolute inset-0 bg-black/10 z-[1]" />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
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
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold font-serif border backdrop-blur-sm shadow-sm ${
            p.id === drawerId
              ? 'bg-amber-100/80 text-amber-900 border-amber-500/60 ring-2 ring-amber-500/40'
              : i === 0
                ? 'bg-amber-200/80 text-amber-900 border-amber-500/50'
                : 'bg-stone-100/80 text-stone-700 border-stone-300/70'
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
      <div className="museum-frame rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl" style={frameStyle}>
        <div className="rounded bg-white/95 backdrop-blur-xl p-8 text-center">
          <p className="text-lg font-serif font-semibold text-stone-700">お題を確認してください</p>
        {hint && (
          <p className="mt-2 text-sm font-serif text-stone-500 italic">ヒント: {hint}</p>
        )}
          <p className="mt-4 text-5xl font-black text-stone-900" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.15)' }}>
            {prompt}
          </p>
          <p className="mt-4 text-sm font-serif text-stone-500 italic">まもなく描画開始...</p>
        </div>
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
          <span className="rounded-full bg-gradient-to-r from-amber-700 to-amber-800 px-3 py-1 text-sm font-bold text-amber-100 shadow-sm border border-amber-600/60">
            🎨 あなたの番
          </span>
          <button
            className="rounded-lg bg-stone-800/80 px-3 py-1 text-sm font-semibold text-amber-100 border border-amber-700/40 shadow-sm active:bg-stone-700"
            onMouseDown={() => setShowPrompt(true)}
            onMouseUp={() => setShowPrompt(false)}
            onMouseLeave={() => setShowPrompt(false)}
            onTouchStart={() => setShowPrompt(true)}
            onTouchEnd={() => setShowPrompt(false)}
          >
            {showPrompt ? `お題: ${promptDisplayText}` : '👀 押してお題を見る'}
          </button>
          {isRevealMode && (
            <span className="rounded-full bg-amber-100/90 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-400/60">
              🔒 他の人には見えていません
            </span>
          )}
        </div>
        {!hasSubmitted && (
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-2 font-bold text-amber-100 shadow-lg border border-amber-600/60 hover:from-amber-600 hover:to-amber-700"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.25)' }}
          >
            提出する
          </button>
        )}
      </div>
      <div className="flex-1">
        <div className="museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl" style={frameStyle}>
          <div className="rounded bg-stone-100/95 backdrop-blur-xl p-4" style={{ minHeight: '420px' }}>
            <Canvas ref={canvasRef} className="h-full w-full" museumTheme={true} />
          </div>
        </div>
      </div>

      {phase === 'quiz_reveal' && quizRevealedAnswer && (
        <div className="mt-3 rounded-xl bg-amber-50/90 p-4 text-center border border-amber-200 shadow-sm">
          <div className="text-sm font-semibold text-amber-700">答え</div>
          <div className="mt-1 text-2xl font-black text-amber-900">{quizRevealedAnswer}</div>
        </div>
      )}

      {hasSubmitted && (
        <div className="mt-2 text-center text-sm text-stone-500 font-serif">
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
      <div className="museum-frame mx-auto w-full max-w-2xl rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl" style={frameStyle}>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-stone-100/95 shadow-inner">
          {canvasLocked ? (
            <div className="flex h-full flex-col items-center justify-center bg-stone-200/80 text-stone-600">
              <span className="text-5xl mb-4">🔒</span>
              <p className="font-bold font-serif">描画中...</p>
              <p className="text-sm font-serif">完成したら公開されます</p>
            </div>
          ) : drawing ? (
            <img src={drawing} alt="Quiz drawing" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500 font-serif">
              描画を待っています...
            </div>
          )}
        </div>
      </div>

      {phase === 'quiz_reveal' && quizRevealedAnswer && (
        <div className="mt-3 rounded-xl bg-amber-50/90 p-4 text-center border border-amber-200 shadow-sm">
          <div className="text-sm font-semibold text-amber-700">答え</div>
          <div className="mt-1 text-2xl font-black text-amber-900">{quizRevealedAnswer}</div>
        </div>
      )}
      
      <div className="mt-auto pt-4">
        {hasWon ? (
          <div className="rounded-xl bg-emerald-100/90 p-4 text-center border border-emerald-200 shadow-sm">
            <div className="text-sm font-semibold text-emerald-800">🎉 正解！</div>
            {phase !== 'quiz_reveal' && revealedPrompt && (
              <div className="mt-1 text-2xl font-black text-emerald-900">{revealedPrompt}</div>
            )}
            <p className="mt-2 font-bold text-emerald-700">正解しました！</p>
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
              className="flex-1 rounded-xl border border-stone-300 bg-stone-50/90 px-4 py-3 text-lg text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <button
              onClick={handleSubmit}
              disabled={!guess.trim()}
              className="rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-3 font-bold text-amber-100 shadow-lg border border-amber-600/60 disabled:opacity-50"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.25)' }}
            >
              送信
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-stone-100/90 p-4 text-center text-stone-600 border border-stone-200">
            {isRevealMode ? '絵が完成するまでお待ちください...' : '回答待機中...'}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-sm text-stone-500 font-serif">
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
    <MuseumBackdrop>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl" style={frameStyle}>
          <div className="rounded bg-white/95 backdrop-blur-xl p-6">
            <h2 className="mb-4 text-center text-2xl font-serif font-black text-stone-900">🏆 最終結果</h2>
            <div className="space-y-2">
              {sorted.map((player, i) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl p-3 border ${
                    i === 0
                      ? 'bg-amber-100/80 border-amber-300'
                      : i === 1
                        ? 'bg-stone-100/80 border-stone-200'
                        : i === 2
                          ? 'bg-orange-100/80 border-orange-200'
                          : 'bg-stone-50/80 border-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <span className="font-bold text-stone-900">{player.name}</span>
                  </div>
                  <span className="font-bold text-amber-700">{quizResult.scores[player.id] ?? 0}pt</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-3 font-bold text-amber-100 shadow-lg border border-amber-600/60 hover:from-amber-600 hover:to-amber-700"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.25)' }}
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
      </div>
    </MuseumBackdrop>
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
      <MuseumBackdrop>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-4xl animate-bounce">❓</div>
            <p className="mt-4 text-stone-200 font-serif" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
              クイズを準備中...
            </p>
          </div>
        </div>
      </MuseumBackdrop>
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
      <MuseumBackdrop>
        <div className="flex min-h-screen flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 rounded-lg bg-stone-800/70 px-3 py-2 border border-amber-700/40 shadow-lg">
              <Timer />
              <span className="text-sm font-semibold text-amber-100 font-serif">
                ラウンド {currentTurn + 1}/{totalTurns}
              </span>
            </div>
            <Scoreboard scores={quizState.scores} players={players} drawerId={quizState.drawerId} />
          </div>
          <div className="flex-1">
            <PromptViewPhase prompt={quizState.prompt ?? ''} hint={quizState.promptHint} />
          </div>
        </div>
      </MuseumBackdrop>
    );
  }

  // お題確認フェーズ（他のプレイヤー）
  if (phase === 'quiz_prompt' && !isDrawer) {
    const drawerName = room.players.find(p => p.id === quizState.drawerId)?.name ?? '???';
    return (
      <MuseumBackdrop>
        <div className="flex min-h-screen flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 rounded-lg bg-stone-800/70 px-3 py-2 border border-amber-700/40 shadow-lg">
              <Timer />
              <span className="text-sm font-semibold text-amber-100 font-serif">
                ラウンド {currentTurn + 1}/{totalTurns}
              </span>
            </div>
            <Scoreboard scores={quizState.scores} players={players} drawerId={quizState.drawerId} />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl" style={frameStyle}>
              <div className="rounded bg-white/95 backdrop-blur-xl p-8 text-center">
                <span className="text-5xl">🎨</span>
                <p className="mt-4 text-xl font-bold text-stone-700 font-serif">
                  {drawerName} さんがお題を確認中...
                </p>
              </div>
            </div>
          </div>
        </div>
      </MuseumBackdrop>
    );
  }

  return (
    <MuseumBackdrop>
      <div className="flex min-h-screen flex-col p-4">
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-lg bg-stone-800/70 px-3 py-2 border border-amber-700/40 shadow-lg">
            <Timer />
            <span className="text-sm font-semibold text-amber-100 font-serif">
              ラウンド {currentTurn + 1}/{totalTurns}
            </span>
            {phase === 'quiz_guessing' && (
              <span className="rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
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
    </MuseumBackdrop>
  );
}
