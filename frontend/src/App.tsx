import { Routes, Route, useLocation } from 'react-router-dom';
import { HomePage } from '@/features/room/pages/HomePage';
import { LobbyPage } from '@/features/room/pages/LobbyPage';
import { GamePage } from '@/features/game/pages/GamePage';
import { PracticePage } from '@/features/game/pages/PracticePage';
import { PaintSplashOverlay } from '@/shared/components/PaintSplashOverlay';

function App() {
  const location = useLocation();
  const showLobbySplashes =
    location.pathname === '/' || location.pathname.startsWith('/room/');

  return (
    <div className="min-h-screen">
      <div
        className={`fixed inset-0 overflow-hidden pointer-events-none z-[1] transition-opacity duration-300 ${
          showLobbySplashes ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      >
        <PaintSplashOverlay />
      </div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<LobbyPage />} />
        <Route path="/game/:roomId" element={<GamePage />} />
        <Route path="/practice" element={<PracticePage />} />
      </Routes>
    </div>
  );
}

export default App;
