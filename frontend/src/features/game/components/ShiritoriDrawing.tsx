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
  // 時間切れで絵のみ提出済み（答えはまだ入力可能）
  const [imageSubmittedOnly, setImageSubmittedOnly] = useState(false);
  // 提出エラーメッセージ
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 入力変更時にエラーをクリア
  const handleAnswerChange = useCallback((value: string) => {
    setLocalAnswer(value);
    setSubmitError(null);
  }, []);

  const drawerName = useMemo(() => room?.players.find((p) => p.id === shiritoriDrawerId)?.name ?? '誰か', [room, shiritoriDrawerId]);
  const isMyTurn = playerId === shiritoriDrawerId;

  // WebSocketエラーコールバックを登録
  useEffect(() => {
    wsManager.setErrorCallback((message) => {
      // 絵しりとりのエラーメッセージを処理
      if (message.includes('ひらがな') || message.includes('shiritori')) {
        setSubmitError(message);
        setHasSubmitted(false); // エラー時は提出をキャンセル
        setImageSubmittedOnly(false); // 時間切れ状態もリセット
      }
    });

    return () => {
      wsManager.setErrorCallback(null);
    };
  }, [setHasSubmitted]);

  // 提出成功時に自分の答えを保存
  useEffect(() => {
    if (hasSubmitted && playerId) {
      // 最新のdrawingが自分のものなら答えを保存
      const latestDrawing = shiritoriGallery[shiritoriGallery.length - 1];
      if (latestDrawing && latestDrawing.authorId === playerId && localAnswer) {
        setMyAnswers((prev) => new Map(prev).set(latestDrawing.order, localAnswer));
      }
    }
  }, [hasSubmitted, shiritoriGallery, playerId, localAnswer]);

  // Reset on new turn
  useEffect(() => {
    setLocalAnswer('');
    setHasSubmitted(false);
    setImageSubmittedOnly(false);
    setSubmitError(null);
    if (isMyTurn) {
      canvasRef.current?.clear();
    }
    // Clear live canvas when drawer changes
    setShiritoriLiveCanvas(null);
  }, [shiritoriDrawerId, setHasSubmitted, setShiritoriLiveCanvas, isMyTurn]);

  // Canvas sync for current drawer
  useEffect(() => {
    if (!isMyTurn || hasSubmitted || imageSubmittedOnly) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    console.log('[Shiritori] Starting canvas sync (drawer)');

    // Send canvas updates every 500ms
    syncIntervalRef.current = setInterval(() => {
      if (canvasRef.current) {
        const imageData = canvasRef.current.getImageData();
        if (imageData) {
          send({ type: 'shiritori_canvas_sync', payload: { imageData } });
          console.log('[Shiritori] Sent canvas sync');
        }
      }
    }, 500);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
        console.log('[Shiritori] Stopped canvas sync');
      }
    };
  }, [isMyTurn, hasSubmitted, imageSubmittedOnly, send]);

  const handleSubmit = useCallback(() => {
    if (!isMyTurn) return;
    
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
    
    // 答えのみの提出（時間切れ後）
    if (imageSubmittedOnly) {
      submitShiritori(null, trimmed);
      // サーバーからの成功レスポンス待ち（shiritori_drawing_addedで設定）
      setImageSubmittedOnly(false);
      return;
    }
    
    // 通常の提出（絵と答え）
    if (!canvasRef.current) return;
    const imageData = canvasRef.current.getImageData();
    submitShiritori(imageData, trimmed);
    // サーバーからの成功レスポンス待ち（shiritori_drawing_addedで設定）
    setReceivedContent(null);
  }, [isMyTurn, submitShiritori, localAnswer, setHasSubmitted, setReceivedContent, shiritoriOrder, imageSubmittedOnly]);

  const handleTimeout = useCallback(() => {
    if (!isMyTurn || hasSubmitted || imageSubmittedOnly) return;
    if (!canvasRef.current) return;
    
    // 絵だけ提出（答えは引き続き入力可能）
    const imageData = canvasRef.current.getImageData();
    submitShiritori(imageData, null);
    setImageSubmittedOnly(true);
    // キャンバスの同期を停止
    // hasSubmittedはまだfalseのまま（答え入力のため）
  }, [isMyTurn, hasSubmitted, imageSubmittedOnly, submitShiritori]);

  const headerBadge = `${shiritoriOrder}/${shiritoriTotal} 枚目`;

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
            {isMyTurn ? 'あなたの番!' : `${drawerName} が描画中`}
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {shiritoriHint ? `「${shiritoriHint}」から始まる言葉を描いてください` : '最初の絵です。自由に描いてください。'}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Timer onTimeout={handleTimeout} />
          <SubmissionProgress />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        {/* キャンバス */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">キャンバス</h3>
              {!isMyTurn && <span className="text-xs text-gray-500">あなたの番までお待ちください</span>}
            </div>
            <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Canvas layer */}
              <div className={`h-full w-full ${!isMyTurn && shiritoriLiveCanvas ? 'invisible' : 'visible'}`}>
                <Canvas ref={canvasRef} className="h-full w-full" />
              </div>
              
              {/* Live preview layer for non-drawer players */}
              {!isMyTurn && shiritoriLiveCanvas && (
                <div className="absolute inset-0 z-10">
                  <img src={shiritoriLiveCanvas} alt="Live drawing" className="h-full w-full object-contain" />
                  <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-3 py-1 text-xs text-white">
                    {drawerName} が描画中...
                  </div>
                </div>
              )}
              
              {/* Waiting overlay */}
              {!isMyTurn && !shiritoriLiveCanvas && (
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
              {/* Time out overlay - drawing submitted but waiting for answer */}
              {imageSubmittedOnly && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-yellow-50/90 text-sm text-gray-600">
                  時間切れ - 答えを入力してください
                </div>
              )}
            </div>
            {isMyTurn && (
              <div className="mt-4 space-y-3">
                {imageSubmittedOnly && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
                    ⏱️ 時間切れで絵が提出されました。答えを入力してください。
                  </div>
                )}
                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                    {submitError}
                  </div>
                )}
                <ShiritoriAnswerInput
                  disabled={hasSubmitted}
                  value={localAnswer}
                  onChange={handleAnswerChange}
                  onSubmit={handleSubmit}
                />
                <button
                  onClick={handleSubmit}
                  disabled={hasSubmitted}
                  className="w-full rounded-lg bg-primary-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {imageSubmittedOnly ? '答えを提出する' : '提出する'}
                </button>
              </div>
            )}
            {!isMyTurn && (
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
