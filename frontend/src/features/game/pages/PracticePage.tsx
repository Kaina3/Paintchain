import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, CanvasRef } from '@/shared/components/Canvas';
import museumBg from '@/assets/museum_simple.png';
import paletteImg from '@/assets/palette.png';

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
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col p-4 md:p-6">
        {/* Header */}
        <div 
          className="flex-shrink-0 rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl mb-4"
          style={{ 
            border: '6px solid transparent',
            borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
          }}
        >
          <div className="rounded bg-white/5 backdrop-blur-xl p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="rounded-lg bg-stone-700/80 border border-stone-600 px-4 py-2 font-serif text-amber-100 hover:bg-stone-600/80 transition"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                ← BACK
              </button>
              <div className="flex items-center gap-2">
                <img src={paletteImg} alt="palette" className="w-8 h-8 drop-shadow-lg" />
                <h1 className="font-serif text-xl md:text-2xl font-bold text-amber-100" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  PRACTICE STUDIO
                </h1>
              </div>
              <button
                onClick={handleDownload}
                className="rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 border-2 border-amber-600 px-4 py-2 font-serif font-bold text-amber-100 hover:from-amber-600 hover:to-amber-700 transition shadow-lg"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                💾 SAVE
              </button>
            </div>
          </div>
        </div>

        {/* Canvas with toolbar */}
        <div 
          className="flex-1 rounded-lg bg-white/10 backdrop-blur-md p-1 shadow-2xl"
          style={{ 
            border: '6px solid transparent',
            borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
          }}
        >
          <div className="rounded bg-white/5 backdrop-blur-xl p-4 h-full">
            <Canvas ref={canvasRef} className="h-full" museumTheme={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
