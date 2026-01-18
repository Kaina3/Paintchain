import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';

export function ReturnToLobbyButton() {
  const navigate = useNavigate();
  const { room, playerId } = useRoomStore();
  const { send } = useWebSocket(room?.id ?? null);
  const reset = useGameStore(state => state.reset);
  const isHost = room?.hostId === playerId;

  const handleReturnToLobby = () => {
    if (!room?.id) {
      console.error('Room ID not found');
      return;
    }
    
    if (window.confirm('ゲームを中断してロビーに戻りますか？')) {
      reset();
      send({ type: 'return_to_lobby', payload: {} });
      navigate(`/room/${room.id}`);
    }
  };

  const handleForceReturnToLobby = () => {
    if (!room?.id) {
      console.error('Room ID not found');
      return;
    }
    
    if (window.confirm('全員を強制的にロビーに戻しますか？\nゲームは中断され、全員のプレイが終了します。')) {
      send({ type: 'force_return_to_lobby', payload: {} });
    }
  };

  return (
    <div className="fixed top-3 left-3 z-50 flex gap-2">
      <button
        onClick={handleReturnToLobby}
        className="bg-stone-800/90 hover:bg-stone-700/95 text-amber-100 px-3 py-1.5 rounded-md shadow-lg transition-all hover:shadow-xl border border-amber-700/50 flex items-center gap-1.5 backdrop-blur-sm"
        style={{ 
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span className="font-serif text-sm font-medium">ロビーに戻る</span>
      </button>

      {isHost && (
        <button
          onClick={handleForceReturnToLobby}
          className="bg-red-900/90 hover:bg-red-800/95 text-amber-100 px-3 py-1.5 rounded-md shadow-lg transition-all hover:shadow-xl border border-red-700/50 flex items-center gap-1.5 backdrop-blur-sm"
          style={{ 
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="font-serif text-sm font-medium">全員を戻す</span>
        </button>
      )}
    </div>
  );
}
