import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/features/room/pages/HomePage';
import { LobbyPage } from '@/features/room/pages/LobbyPage';
import { GamePage } from '@/features/game/pages/GamePage';
import { PracticePage } from '@/features/game/pages/PracticePage';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
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
