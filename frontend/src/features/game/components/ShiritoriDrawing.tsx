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

  const headerBadge = `${shiritoriOrder}/${shiritoriTotal} 枚目`;

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
    <div className="flex min-h-screen flex-col p-4">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 mb-4 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-600">絵しりとり</p>
            <p className="text-lg font-semibold text-gray-800">{headerBadge}</p>
          </div>
          <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            {isAnswerPhase ? '答えを入力中...' : isMyTurn ? 'あなたの番!' : `${drawerName} が描画中`}
          </div>
        </div>
        
        {/* ヒント表示（描画中のみ） */}
        {isDrawingPhase && (
          <div className="mt-3 rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {shiritoriHint ? `「${shiritoriHint}」から始まる言葉を描いてください` : '最初の絵です。自由に描いてください。'}
          </div>
        )}
        
        {/* 答え入力中のメッセージ */}
        {isAnswerPhase && (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            絵の提出が完了しました！答えを入力してください（時間制限なし）
          </div>
        )}
        
        {/* タイマー（描画中のみ表示） */}
        {isDrawingPhase && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Timer onTimeout={handleTimeout} />
            <SubmissionProgress />
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        {/* キャンバス */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">キャンバス</h3>
              {!isMyTurn && !isAnswerPhase && <span className="text-xs text-gray-500">あなたの番までお待ちください</span>}
              {isAnswerPhase && <span className="text-xs text-blue-600">あなたの絵</span>}
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Canvas layer */}
              <div className={`h-full w-full ${canvasContent.type !== 'drawing' ? 'invisible' : 'visible'}`}>
                <Canvas ref={canvasRef} className="h-full w-full" />
              </div>
              
              {/* 自分のpending絵を表示（答え入力中） */}
              {canvasContent.type === 'my-pending' && (
                <div className="absolute inset-0 z-10">
                  <img src={canvasContent.image} alt="Your drawing" className="h-full w-full object-contain" />
                </div>
              )}
              
              {/* Live preview layer for non-drawer players */}
              {canvasContent.type === 'live' && (
                <div className="absolute inset-0 z-10">
                  <img src={canvasContent.image} alt="Live drawing" className="h-full w-full object-contain" />
                  <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-3 py-1 text-xs text-white">
                    {drawerName} が描画中...
                  </div>
                </div>
              )}
              
              {/* Waiting overlay */}
              {canvasContent.type === 'waiting' && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm text-gray-600">
                  {drawerName} が描画を開始するのを待っています...
                </div>
              )}
              
              {/* Submitted overlay */}
              {hasSubmitted && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 text-sm text-gray-600">
                  提出済みです
                </div>
              )}
            </div>
            
            {/* 描画中: 絵を提出ボタン */}
            {isDrawingPhase && (
              <div className="mt-4">
                <button
                  onClick={handleSubmitImage}
                  className="w-full rounded-lg bg-primary-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
                >
                  絵を提出する
                </button>
              </div>
            )}
            
            {/* 答え入力中 */}
            {isAnswerPhase && (
              <div className="mt-4 space-y-3">
                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                    {submitError}
                  </div>
                )}
                <ShiritoriAnswerInput
                  disabled={false}
                  value={localAnswer}
                  onChange={handleAnswerChange}
                  onSubmit={handleSubmitAnswer}
                />
                <button
                  onClick={handleSubmitAnswer}
                  className="w-full rounded-lg bg-green-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                >
                  答えを提出する
                </button>
              </div>
            )}
            
            {/* 自分のターンでない時 */}
            {!isMyTurn && !isAnswerPhase && (
              <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {drawerName} の提出を待っています...
              </div>
            )}
          </div>
        </div>

        {/* ギャラリー */}
        <div className="lg:w-80">
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
            <ShiritoriGallery 
              drawings={shiritoriGallery} 
              currentOrder={shiritoriOrder - 1}
              myPlayerId={playerId ?? undefined}
              myAnswers={myAnswers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
