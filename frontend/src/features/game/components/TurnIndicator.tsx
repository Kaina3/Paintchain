import { useGameStore } from '@/features/game/store/gameStore';

export function TurnIndicator() {
  const { currentTurn, totalTurns, phase } = useGameStore();

  if (phase === 'prompt' || phase === 'result') {
    return null;
  }

  return (
    <div className="glass rounded-xl px-5 py-3 shadow-md inline-flex items-center justify-center gap-3 
                  border border-white/50">
      <span className="text-sm font-bold text-gray-700">🎯 ターン</span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalTurns }).map((_, idx) => (
          <div
            key={idx}
            className={`h-3 w-3 rounded-full transition-all duration-300 ${
              idx < currentTurn 
                ? 'bg-gradient-to-br from-pink-600 to-pink-700 shadow-lg scale-110' 
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="font-black text-pink-600 text-lg">
        {currentTurn} / {totalTurns}
      </span>
    </div>
  );
}
