import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useRoomStore } from '@/features/room/store/roomStore';
import { useGameStore } from '@/features/game/store/gameStore';
import { useWerewolfStore } from '@/features/game/store/werewolfStore';

export function ReturnToLobbyButton() {
  const navigate = useNavigate();
  const { room, playerId } = useRoomStore();
  const { send } = useWebSocket(room?.id ?? null);
  const resetGame = useGameStore(state => state.reset);
  const resetWerewolf = useWerewolfStore(state => state.reset);
  const isHost = room?.hostId === playerId;

  const handleReturnToLobby = () => {
    if (!room?.id) {
      console.error('Room ID not found');
      return;
    }
    
    if (window.confirm('ゲームを中断してロビーに戻りますか？')) {
      // まずナビゲーションしてからクリーンアップ
      const targetPath = `/room/${room.id}`;
      send({ type: 'return_to_lobby', payload: {} });
      resetGame();
      resetWerewolf();
      navigate(targetPath);
    }
  };

  const [confirmForce, setConfirmForce] = useState(false);

  const handleForceReturnToLobby = () => {
    if (!room?.id) {
      console.error('Room ID not found');
      return;
    }
    if (!confirmForce) {
      // 1回目: 確認状態にする（2秒後にリセット）
      setConfirmForce(true);
      setTimeout(() => setConfirmForce(false), 3000);
      return;
    }
    // 2回目: 実行
    const targetPath = `/room/${room.id}`;
    send({ type: 'force_return_to_lobby', payload: {} });
    resetGame();
    resetWerewolf();
    navigate(targetPath);
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
          className={`${confirmForce ? 'bg-red-600 animate-pulse border-red-400' : 'bg-red-900/90 hover:bg-red-800/95 border-red-700/50'} text-amber-100 px-3 py-1.5 rounded-md shadow-lg transition-all hover:shadow-xl flex items-center gap-1.5 backdrop-blur-sm`}
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
          <span className="font-serif text-sm font-medium">{confirmForce ? 'もう一度押して確定' : '全員を戻す'}</span>
        </button>
      )}
    </div>
  );
}
