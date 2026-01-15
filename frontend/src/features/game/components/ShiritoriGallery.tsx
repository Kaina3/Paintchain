import { useState } from 'react';
import type { ShiritoriDrawingPublic } from '@/shared/types';

// 美術館フレームのスタイル（小さいサムネイル用）
const thumbnailFrameStyle = {
  border: '3px solid transparent',
  borderImage: 'linear-gradient(135deg, #a08060 0%, #6b5344 100%) 1',
};

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
        <div className="flex items-center justify-between border-b border-stone-300 pb-2">
          <h3 className="font-serif text-sm font-bold text-stone-700 tracking-wide">{title ?? '🖼️ GALLERY'}</h3>
          {currentOrder !== undefined && (
            <span className="text-xs text-stone-500 font-medium">{currentOrder} submitted</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {drawings.map((drawing) => {
            const isMyDrawing = drawing.authorId === myPlayerId;
            return (
              <button
                key={drawing.order}
                onClick={() => handleDrawingClick(drawing)}
                disabled={!isMyDrawing}
                className={`group overflow-hidden rounded-lg transition ${
                  isMyDrawing
                    ? 'cursor-pointer ring-2 ring-amber-400 shadow-md hover:shadow-lg hover:ring-amber-500'
                    : 'shadow-sm'
                } ${currentOrder === drawing.order ? 'ring-2 ring-emerald-400' : ''} bg-white`}
                style={thumbnailFrameStyle}
              >
                <div className="bg-stone-700/90 px-2 py-1.5 text-xs font-bold text-amber-100 flex items-center justify-between">
                  <span>#{drawing.order}</span>
                  {isMyDrawing && (
                    <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px]">YOU</span>
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
                <div className="flex justify-center gap-1 bg-stone-100 px-2 py-2">
                  {Array.from({ length: drawing.letterCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${isMyDrawing ? 'bg-amber-500' : 'bg-stone-400'}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
          {drawings.length === 0 && (
            <div className="col-span-full rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
              <p className="font-serif text-sm text-stone-500">No artworks yet</p>
            </div>
          )}
        </div>
      </div>

      {/* 答えを表示するモーダル */}
      {selectedDrawing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="max-w-sm rounded-lg bg-stone-100 p-6 shadow-2xl"
            style={{
              border: '6px solid transparent',
              borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-center">
              <p className="font-serif text-sm text-stone-500">YOUR TITLE</p>
              <p className="font-serif text-3xl font-bold text-amber-700">{selectedDrawing.answer}</p>
            </div>
            <div className="mb-4 overflow-hidden rounded-lg border-2 border-stone-300 bg-white">
              <img
                src={selectedDrawing.drawing.imageData}
                alt="your drawing"
                className="w-full object-contain"
                style={{ maxHeight: '300px' }}
              />
            </div>
            <button
              onClick={handleCloseModal}
              className="w-full rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 px-4 py-2 font-serif font-bold text-stone-100 shadow transition hover:from-stone-500 hover:to-stone-600"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  );
}
