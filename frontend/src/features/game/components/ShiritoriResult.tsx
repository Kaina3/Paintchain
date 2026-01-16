import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/features/game/store/gameStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useWebSocket } from '@/shared/hooks/useWebSocket';

const museumBg = '/img/gallery_room.png';

// 美術館フレームのスタイル
const frameStyle = {
  border: '6px solid transparent',
  borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
};

export function ShiritoriResult() {
  const { shiritoriResult, reset: resetGame } = useGameStore();
  const { room } = useRoomStore();
  const { send } = useWebSocket(room?.id ?? null);
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const connectedCount = shiritoriResult?.totalCorrect ?? 0;
  const total = shiritoriResult?.totalDrawings ?? 0;

  const summary = useMemo(() => {
    if (!shiritoriResult) return [];
    return shiritoriResult.drawings;
  }, [shiritoriResult]);

  const currentItem = summary[currentIndex];

  const handleReturnToLobby = useCallback(() => {
    send({ type: 'return_to_lobby', payload: {} });
    resetGame();
    navigate(`/room/${roomId}`);
  }, [send, resetGame, navigate, roomId]);

  const handleNext = useCallback(() => {
    if (currentIndex < summary.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, summary.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  if (!shiritoriResult || !currentItem) {
    return (
      <div 
        className="min-h-screen relative overflow-auto flex items-center justify-center"
        style={{
          backgroundImage: `url(${museumBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="rounded-lg bg-stone-800/80 px-6 py-4 text-amber-100 font-serif">
          結果を待っています...
        </div>
      </div>
    );
  }

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

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

      <div className="relative z-10 mx-auto max-w-7xl p-4 md:p-6">
        {/* ヘッダー */}
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-wide text-amber-100 drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            🎨 EXHIBITION RESULTS
          </h1>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={`rounded-lg px-6 py-2 font-serif font-bold text-xl shadow-lg border ${
              connectedCount === total 
                ? 'bg-emerald-800/80 text-emerald-100 border-emerald-600/50' 
                : 'bg-amber-800/80 text-amber-100 border-amber-600/50'
            }`} style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {connectedCount}/{total} CONNECTED!
            </span>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div 
          className="museum-frame rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
          style={frameStyle}
        >
          <div className="rounded bg-stone-100/95 backdrop-blur-xl p-4 md:p-6">
            {/* ギャラリー一覧 */}
            <div className="mb-6 border-b border-stone-300 pb-6">
              <h3 className="mb-4 font-serif text-lg font-bold text-stone-700 tracking-wide">
                🖼️ ALL ARTWORKS
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8">
                {summary.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`group relative overflow-hidden rounded-lg transition ${
                      currentIndex === index
                        ? 'ring-4 ring-amber-500 shadow-lg'
                        : 'hover:ring-2 hover:ring-amber-400 hover:shadow-md'
                    }`}
                    style={{
                      border: '3px solid transparent',
                      borderImage: currentIndex === index 
                        ? 'linear-gradient(135deg, #d4a574 0%, #8b7355 100%) 1'
                        : 'linear-gradient(135deg, #a08060 0%, #6b5344 100%) 1',
                    }}
                  >
                    <div className="aspect-square bg-white">
                      <img
                        src={item.imageData}
                        alt={`${item.order}番目の絵`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    {/* 正誤バッジ */}
                    <div
                      className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
                        item.isConnected ? 'bg-emerald-600' : 'bg-red-600'
                      }`}
                    >
                      {item.isConnected ? '○' : '×'}
                    </div>
                    {/* 答え */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900/90 to-transparent px-1 py-1.5 text-center text-xs font-bold text-amber-100">
                      {item.answer}
                    </div>
                    {/* 順番 */}
                    <div className="absolute left-1 top-1 rounded bg-stone-800/80 px-1.5 py-0.5 text-xs font-bold text-amber-100">
                      {item.order}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 選択中の絵を大きく表示 */}
            <div>
              <div 
                className="mb-4 rounded-lg bg-white p-6"
                style={{
                  border: '4px solid transparent',
                  borderImage: 'linear-gradient(135deg, #c4a574 0%, #8b7355 50%, #6b5344 100%) 1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500 font-serif">
                      {currentIndex + 1} / {summary.length}
                    </p>
                    <p className="font-serif text-xl font-bold text-stone-700">PIECE #{currentItem.order}</p>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 font-serif font-bold shadow ${
                      currentItem.isConnected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {currentItem.isConnected ? '○ CONNECTED' : '× BROKEN'}
                  </div>
                </div>

                <div className="mb-4 overflow-hidden rounded-lg bg-stone-50 border-2 border-stone-200">
                  <img
                    src={currentItem.imageData}
                    alt={currentItem.answer}
                    className="mx-auto w-full object-contain"
                    style={{ maxHeight: '450px' }}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-sm font-medium text-stone-500">TITLE:</span>
                    <span className="font-serif text-2xl font-bold text-stone-800">{currentItem.answer}</span>
                  </div>
                  {currentItem.previousAnswer && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <p className="text-sm text-stone-600">前の答え: <span className="font-semibold">{currentItem.previousAnswer}</span></p>
                      <p className="text-sm font-bold text-blue-700 mt-1">{currentItem.connectionDetail}</p>
                    </div>
                  )}
                  {!currentItem.isConnected && currentItem.connectionDetail && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700 font-medium">{currentItem.connectionDetail}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ナビゲーションボタン */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 px-6 py-2 font-serif font-bold text-stone-100 shadow-lg border border-stone-500 transition hover:from-stone-500 hover:to-stone-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← PREV
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === summary.length - 1}
                  className="rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 px-6 py-2 font-serif font-bold text-stone-100 shadow-lg border border-stone-500 transition hover:from-stone-500 hover:to-stone-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  NEXT →
                </button>
              </div>
            </div>

            {/* ロビーに戻るボタン */}
            <div className="mt-8 flex justify-center border-t border-stone-300 pt-6">
              <button
                onClick={handleReturnToLobby}
                className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-8 py-3 font-serif font-bold text-lg text-amber-100 shadow-lg border-2 border-amber-600 transition-all duration-300 hover:from-amber-600 hover:to-amber-700"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                🏛️ RETURN TO LOBBY
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
