import { useState } from 'react';
import type { ShiritoriDrawingPublic } from '@/shared/types';

interface ShiritoriGalleryProps {
  drawings: ShiritoriDrawingPublic[];
  currentOrder?: number;
  myPlayerId?: string;
  myAnswers?: Map<number, string>; // order -> answer
  title?: string;
}

export function ShiritoriGallery({ drawings, currentOrder, myPlayerId, myAnswers, title }: ShiritoriGalleryProps) {
  const [selectedDrawing, setSelectedDrawing] = useState<{ drawing: ShiritoriDrawingPublic; answer: string } | null>(null);

  const handleDrawingClick = (drawing: ShiritoriDrawingPublic) => {
    // 自分の絵のみクリック可能
    if (drawing.authorId === myPlayerId && myAnswers) {
      const answer = myAnswers.get(drawing.order);
      if (answer) {
        setSelectedDrawing({ drawing, answer });
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedDrawing(null);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{title ?? 'ギャラリー'}</h3>
          {currentOrder !== undefined && (
            <span className="text-xs text-gray-500">{currentOrder} 枚提出済み</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {drawings.map((drawing) => {
            const isMyDrawing = drawing.authorId === myPlayerId;
            return (
              <button
                key={drawing.order}
                onClick={() => handleDrawingClick(drawing)}
                disabled={!isMyDrawing}
                className={`group overflow-hidden rounded-xl border transition ${
                  isMyDrawing
                    ? 'cursor-pointer border-indigo-400 shadow-md ring-2 ring-indigo-200 hover:shadow-lg'
                    : 'border-gray-200 shadow-sm'
                } ${currentOrder === drawing.order ? 'ring-2 ring-primary-300' : ''} bg-white`}
              >
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                  #{drawing.order}
                  {isMyDrawing && (
                    <span className="ml-1 rounded bg-indigo-600 px-1.5 py-0.5 text-white">あなた</span>
                  )}
                </div>
                <div className="aspect-square bg-white">
                  <img
                    src={drawing.imageData}
                    alt={`drawing-${drawing.order}`}
                    className="h-full w-full object-contain"
                  />
                </div>
                {/* 文字数を丸で表示 */}
                <div className="flex justify-center gap-1 px-3 py-2">
                  {Array.from({ length: drawing.letterCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${isMyDrawing ? 'bg-indigo-400' : 'bg-gray-400'}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
          {drawings.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              まだ提出された絵はありません
            </div>
          )}
        </div>
      </div>

      {/* 答えを表示するモーダル */}
      {selectedDrawing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600">あなたの答え</p>
              <p className="text-3xl font-bold text-indigo-600">{selectedDrawing.answer}</p>
            </div>
            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
              <img
                src={selectedDrawing.drawing.imageData}
                alt="your drawing"
                className="w-full object-contain"
                style={{ maxHeight: '300px' }}
              />
            </div>
            <button
              onClick={handleCloseModal}
              className="w-full rounded-lg bg-gray-600 px-4 py-2 font-medium text-white transition hover:bg-gray-700"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
