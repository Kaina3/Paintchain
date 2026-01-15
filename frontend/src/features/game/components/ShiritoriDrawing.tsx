import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { wsManager } from '@/shared/lib/websocket';
import { Canvas, type CanvasRef } from '@/shared/components/Canvas';
import { Timer } from '@/features/game/components/Timer';
import { SubmissionProgress } from '@/features/game/components/SubmissionProgress';
import { ShiritoriGallery } from './ShiritoriGallery';
import { ShiritoriAnswerInput } from './ShiritoriAnswerInput';
import museumBg from '@/assets/museum_simple.png';

// 美術館フレームのスタイル
const frameStyle = {
  border: '6px solid transparent',
  borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
};

export function ShiritoriDrawing() {
  const canvasRef = useRef<CanvasRef>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const {
    shiritoriGallery,
    shiritoriDrawerId,
    shiritoriHint,
    shiritoriOrder,
    shiritoriTotal,
    shiritoriLiveCanvas,
    shiritoriPendingAnswer,
    shiritoriMyPendingImage,
    hasSubmitted,
    setHasSubmitted,
    setReceivedContent,
    setShiritoriLiveCanvas,
  } = useGameStore();
  const { room, playerId } = useRoomStore();
  const { submitShiritori, send } = useWebSocket(room?.id ?? null);
  const [localAnswer, setLocalAnswer] = useState('');
  // 自分の答えを保存（order -> answer）
  const [myAnswers, setMyAnswers] = useState<Map<number, string>>(new Map());
  // 提出エラーメッセージ
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 入力変更時にエラーをクリア
  const handleAnswerChange = useCallback((value: string) => {
    setLocalAnswer(value);
    setSubmitError(null);
  }, []);

  const drawerName = useMemo(() => room?.players.find((p) => p.id === shiritoriDrawerId)?.name ?? '誰か', [room, shiritoriDrawerId]);
  const isMyTurn = playerId === shiritoriDrawerId;
  // 描画フェーズ: 自分のターンで、絵を提出前
  const isDrawingPhase = isMyTurn && !shiritoriPendingAnswer && !hasSubmitted;
  // 答え入力フェーズ: 絵を提出して、答えの入力待ち
  const isAnswerPhase = shiritoriPendingAnswer && !hasSubmitted;

  // WebSocketエラーコールバックを登録
  useEffect(() => {
    wsManager.setErrorCallback((message) => {
      // 絵しりとりのエラーメッセージを処理
      if (message.includes('ひらがな') || message.includes('shiritori')) {
        setSubmitError(message);
      }
    });

    return () => {
      wsManager.setErrorCallback(null);
    };
  }, []);

  // 提出成功時に自分の答えを保存
  useEffect(() => {
    if (hasSubmitted && playerId) {
      // 最新のdrawingが自分のものなら答えを保存
      const latestDrawing = shiritoriGallery.find(d => d.authorId === playerId && d.hasAnswer);
      if (latestDrawing && localAnswer) {
        setMyAnswers((prev) => new Map(prev).set(latestDrawing.order, localAnswer));
      }
    }
  }, [hasSubmitted, shiritoriGallery, playerId, localAnswer]);

  // Reset on new turn（自分がdrawerになった時）
  useEffect(() => {
    if (isMyTurn && !shiritoriPendingAnswer) {
      setLocalAnswer('');
      setHasSubmitted(false);
      setSubmitError(null);
      canvasRef.current?.clear();
    }
  }, [shiritoriDrawerId, setHasSubmitted, isMyTurn, shiritoriPendingAnswer]);

  // Clear live canvas when drawer changes (but not for pending answer phase)
  useEffect(() => {
    if (!shiritoriPendingAnswer) {
      setShiritoriLiveCanvas(null);
    }
  }, [shiritoriDrawerId, setShiritoriLiveCanvas, shiritoriPendingAnswer]);

  // Canvas sync for current drawer (only during drawing phase)
  useEffect(() => {
    if (!isDrawingPhase) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Send canvas updates every 500ms
    syncIntervalRef.current = setInterval(() => {
      if (canvasRef.current) {
        const imageData = canvasRef.current.getImageData();
        if (imageData) {
          send({ type: 'shiritori_canvas_sync', payload: { imageData } });
        }
      }
    }, 500);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isDrawingPhase, send]);

  // 絵を提出（答えは後で）
  const handleSubmitImage = useCallback(() => {
    if (!isMyTurn || shiritoriPendingAnswer) return;
    if (!canvasRef.current) return;
    
    const imageData = canvasRef.current.getImageData();
    submitShiritori(imageData, null);
    setReceivedContent(null);
  }, [isMyTurn, shiritoriPendingAnswer, submitShiritori, setReceivedContent]);

  // 答えを提出
  const handleSubmitAnswer = useCallback(() => {
    setSubmitError(null);
    
    const trimmed = localAnswer.trim();

    if (!trimmed) {
      setSubmitError('ひらがなを入力してください');
      return;
    }

    // ひらがなチェック
    if (!/^[\u3041-\u3096ー]+$/.test(trimmed)) {
      setSubmitError('ひらがなを入力してください');
      return;
    }

    submitShiritori(null, trimmed);
  }, [submitShiritori, localAnswer]);

  // タイムアウト時（絵を強制提出）
  const handleTimeout = useCallback(() => {
    if (!isDrawingPhase) return;
    if (!canvasRef.current) return;
    
    const imageData = canvasRef.current.getImageData();
    submitShiritori(imageData, null);
  }, [isDrawingPhase, submitShiritori]);

  const headerBadge = `${shiritoriOrder}/${shiritoriTotal}`;

  // 表示するキャンバス内容を決定
  const canvasContent = useMemo(() => {
    // 答え入力中は自分の絵を表示
    if (isAnswerPhase && shiritoriMyPendingImage) {
      return { type: 'my-pending' as const, image: shiritoriMyPendingImage };
    }
    // 自分のターンでない場合、リアルタイムキャンバスまたは待機
    if (!isMyTurn && !isAnswerPhase) {
      if (shiritoriLiveCanvas) {
        return { type: 'live' as const, image: shiritoriLiveCanvas };
      }
      return { type: 'waiting' as const };
    }
    // 描画中または提出済み
    return { type: 'drawing' as const };
  }, [isMyTurn, isAnswerPhase, shiritoriMyPendingImage, shiritoriLiveCanvas]);

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
      {/* 暗めのオーバーレイ */}
      <div className="absolute inset-0 bg-black/10 z-[1]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col p-4 md:p-6">
        {/* ヘッダー */}
        <div className="mb-4 text-center">
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-wide text-amber-100 drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            🎨 PICTURE SHIRITORI
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-lg bg-stone-800/80 px-4 py-2 font-mono text-lg font-bold text-amber-100 shadow-lg border border-amber-700/50">
              {headerBadge} PIECES
            </span>
            <span className={`rounded-lg px-4 py-2 font-serif font-bold shadow-lg border ${
              isAnswerPhase 
                ? 'bg-blue-800/80 text-blue-100 border-blue-600/50' 
                : isMyTurn 
                  ? 'bg-amber-700/80 text-amber-100 border-amber-500/50' 
                  : 'bg-stone-700/80 text-stone-200 border-stone-500/50'
            }`}>
              {isAnswerPhase ? '📝 TITLE YOUR WORK' : isMyTurn ? '✏️ YOUR TURN!' : `👁️ ${drawerName} is painting...`}
            </span>
          </div>
        </div>

        {/* ヒント表示（描画中のみ） */}
        {isDrawingPhase && (
          <div 
            className="mb-4 mx-auto max-w-2xl rounded-lg bg-amber-900/80 px-6 py-3 text-center shadow-lg border border-amber-700/50"
          >
            <p className="font-serif text-lg text-amber-100" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {shiritoriHint 
                ? '🖼️ 前の絵の続きを描いてください' 
                : '🖼️ 最初の一枚です。自由に描いてください！'}
            </p>
          </div>
        )}
        
        {/* 答え入力中のメッセージ */}
        {isAnswerPhase && (
          <div 
            className="mb-4 mx-auto max-w-2xl rounded-lg bg-blue-900/80 px-6 py-3 text-center shadow-lg border border-blue-700/50"
          >
            <p className="font-serif text-lg text-blue-100" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              ✅ 絵の提出完了！答えを入力してください（ひらがな）
            </p>
          </div>
        )}

        {/* タイマー（描画中のみ表示） */}
        {isDrawingPhase && (
          <div className="mb-4 mx-auto max-w-2xl flex items-center justify-center gap-4">
            <div className="rounded-lg bg-stone-800/80 px-4 py-2 shadow-lg border border-stone-600/50">
              <Timer onTimeout={handleTimeout} />
            </div>
            <div className="rounded-lg bg-stone-800/80 px-4 py-2 shadow-lg border border-stone-600/50">
              <SubmissionProgress />
            </div>
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="flex-1 grid gap-4 lg:gap-6 lg:grid-cols-[1fr_320px] items-start">
          {/* キャンバス */}
          <div 
            className="museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
            style={frameStyle}
          >
            <div className="rounded bg-stone-100/95 backdrop-blur-xl p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between border-b border-stone-300 pb-3">
                <h3 className="font-serif text-lg font-bold text-stone-700 tracking-wide">
                  🖼️ CANVAS
                </h3>
                {!isMyTurn && !isAnswerPhase && (
                  <span className="text-sm text-stone-500 italic">あなたの番をお待ちください...</span>
                )}
                {isAnswerPhase && (
                  <span className="text-sm text-blue-600 font-semibold">あなたの作品</span>
                )}
              </div>
              
              <div className="relative overflow-hidden rounded-lg border-4 border-stone-300 bg-white shadow-inner" style={{ minHeight: '400px' }}>
                {/* Canvas layer */}
                <div className={`h-full w-full ${canvasContent.type !== 'drawing' ? 'invisible' : 'visible'}`} style={{ minHeight: '400px' }}>
                  <Canvas ref={canvasRef} className="h-full w-full" />
                </div>
                
                {/* 自分のpending絵を表示（答え入力中） */}
                {canvasContent.type === 'my-pending' && (
                  <div className="absolute inset-0 z-10 bg-white">
                    <img src={canvasContent.image} alt="Your drawing" className="h-full w-full object-contain" />
                  </div>
                )}
                
                {/* Live preview layer for non-drawer players */}
                {canvasContent.type === 'live' && (
                  <div className="absolute inset-0 z-10 bg-white">
                    <img src={canvasContent.image} alt="Live drawing" className="h-full w-full object-contain" />
                    <div className="absolute bottom-3 left-3 rounded-lg bg-stone-800/80 px-4 py-2 text-sm font-semibold text-amber-100 shadow-lg">
                      🎨 {drawerName} が描画中...
                    </div>
                  </div>
                )}
                
                {/* Waiting overlay */}
                {canvasContent.type === 'waiting' && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-100/90">
                    <div className="text-center">
                      <p className="font-serif text-lg text-stone-600">⏳ {drawerName} を待っています</p>
                      <p className="text-sm text-stone-500">描画が始まるまでお待ちください...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 描画中: 絵を提出ボタン */}
              {isDrawingPhase && (
                <div className="mt-4">
                  <button
                    onClick={handleSubmitImage}
                    className="w-full rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-3 font-serif font-bold text-lg text-amber-100 shadow-lg border-2 border-amber-600 transition-all duration-300 hover:from-amber-600 hover:to-amber-700"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    🖼️ 絵を提出する
                  </button>
                </div>
              )}
              
              {/* 答え入力中 */}
              {isAnswerPhase && (
                <div className="mt-4 space-y-3">
                  {submitError && (
                    <div className="rounded-lg border border-red-400/50 bg-red-900/80 px-4 py-2 text-sm text-red-100">
                      {submitError}
                    </div>
                  )}
                  <ShiritoriAnswerInput
                    disabled={false}
                    value={localAnswer}
                    onChange={handleAnswerChange}
                    onSubmit={handleSubmitAnswer}
                  />
                </div>
              )}
              
              {/* 自分のターンでない時 */}
              {!isMyTurn && !isAnswerPhase && (
                <div className="mt-4 rounded-lg border-2 border-dashed border-stone-400 bg-stone-200/50 px-4 py-3 text-center">
                  <p className="font-serif text-stone-600">
                    ⏳ {drawerName} の提出を待っています...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ギャラリー */}
          <div 
            className="museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
            style={frameStyle}
          >
            <div className="rounded bg-stone-100/95 backdrop-blur-xl p-4">
              <ShiritoriGallery 
                drawings={shiritoriGallery} 
                currentOrder={shiritoriOrder - 1}
                myPlayerId={playerId ?? undefined}
                myAnswers={myAnswers}
                title="🖼️ GALLERY"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
