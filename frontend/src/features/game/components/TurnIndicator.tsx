import { useGameStore } from '@/features/game/store/gameStore';

export function TurnIndicator() {
  const { currentTurn, totalTurns, phase } = useGameStore();

  if (phase === 'prompt' || phase === 'result') {
    return null;
  }

  return (
    <div className="rounded-md bg-stone-800/60 border border-amber-700/50 px-2 py-1 shadow-md inline-flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: totalTurns }).map((_, idx) => (
          <div
            key={idx}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              idx < currentTurn 
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow scale-110' 
                : 'bg-stone-600'
            }`}
          />
        ))}
      </div>
      <span className="font-serif font-bold text-amber-100 text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
        {currentTurn}/{totalTurns}
      </span>
    </div>
  );
}
