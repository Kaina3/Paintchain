import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/features/game/store/gameStore';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useWebSocket } from '@/shared/hooks/useWebSocket';

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
      <div className="flex min-h-screen items-center justify-center text-gray-600">
        結果を待っています...
      </div>
    );
  }

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">絵しりとり結果</h2>
        <p className="mb-6 text-center text-lg text-gray-600">
          {connectedCount}/{total} 繋がった！
        </p>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {/* ギャラリー一覧 */}
          <div className="mb-6 border-b border-gray-200 pb-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-700">全ての絵</h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8">
              {summary.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleThumbnailClick(index)}
                  className={`group relative overflow-hidden rounded-lg border-2 transition ${
                    currentIndex === index
                      ? 'border-indigo-600 shadow-lg'
                      : 'border-gray-200 hover:border-indigo-400 hover:shadow-md'
                  }`}
                >
                  <div className="aspect-square bg-gray-50">
                    <img
                      src={item.imageData}
                      alt={`${item.order}番目の絵`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {/* 正誤バッジ */}
                  <div
                    className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                      item.isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {item.isConnected ? '○' : '×'}
                  </div>
                  {/* 答え */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-1 text-center text-xs font-medium text-white">
                    {item.answer}
                  </div>
                  {/* 順番 */}
                  <div className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-xs font-semibold text-white">
                    {item.order}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 選択中の絵を大きく表示 */}
          <div>
            <div className="mb-4 rounded-xl border-2 border-gray-200 bg-gray-50 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {currentIndex + 1} / {summary.length}
                  </p>
                  <p className="text-lg font-semibold text-gray-800">#{currentItem.order}</p>
                </div>
                <div
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    currentItem.isConnected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {currentItem.isConnected ? '○ 繋がった' : '× 切れた'}
                </div>
              </div>

              <div className="mb-4 overflow-hidden rounded-lg bg-white">
                <img
                  src={currentItem.imageData}
                  alt={currentItem.answer}
                  className="mx-auto w-full object-contain"
                  style={{ maxHeight: '500px' }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">答え:</span>
                  <span className="text-2xl font-semibold text-gray-800">{currentItem.answer}</span>
                </div>
                {currentItem.previousAnswer && (
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-sm text-gray-600">前の答え: {currentItem.previousAnswer}</p>
                    <p className="text-sm font-medium text-gray-800">{currentItem.connectionDetail}</p>
                  </div>
                )}
                {!currentItem.isConnected && currentItem.connectionDetail && (
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-sm text-red-700">{currentItem.connectionDetail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ナビゲーションボタン */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← 前へ
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === summary.length - 1}
                className="rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                次へ →
              </button>
            </div>
          </div>

          {/* ロビーに戻るボタン */}
          <div className="mt-8 flex justify-center border-t border-gray-200 pt-6">
            <button
              onClick={handleReturnToLobby}
              className="rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              ロビーに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
