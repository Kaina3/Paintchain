import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, CanvasRef } from '@/shared/components/Canvas';

export function PracticePage() {
  const navigate = useNavigate();
  const canvasRef = useRef<CanvasRef>(null);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;

    const imageData = canvasRef.current.getImageData();
    const link = document.createElement('a');
    link.download = 'paintchain-drawing.png';
    link.href = imageData;
    link.click();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            ← 戻る
          </button>
          <h1 className="text-xl font-bold text-primary-700">🎨 お絵描き練習</h1>
          <button
            onClick={handleDownload}
            className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            保存
          </button>
        </div>
      </div>

      {/* Canvas with toolbar */}
      <div className="flex-1 p-4">
        <Canvas ref={canvasRef} className="h-full" />
      </div>
    </div>
  );
}
