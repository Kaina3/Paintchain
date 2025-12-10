import { useGameStore } from '@/features/game/store/gameStore';

export function TurnIndicator() {
  const { currentTurn, totalTurns, phase } = useGameStore();

  if (phase === 'prompt' || phase === 'result') {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
      <span>ターン</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalTurns }).map((_, idx) => (
          <div
            key={idx}
            className={`h-2 w-2 rounded-full ${
              idx < currentTurn ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="font-medium">
        {currentTurn} / {totalTurns}
      </span>
    </div>
  );
}
