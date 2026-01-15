import { useGameStore } from '@/features/game/store/gameStore';

export function SubmissionProgress() {
  const { submittedCount, totalCount } = useGameStore();
  const percentage = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;

  return (
    <div className="rounded-md bg-stone-800/60 border border-amber-700/50 px-2 py-1.5 shadow-md min-w-[80px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-serif text-amber-200">📊</span>
        <span className="text-xs font-serif font-bold text-amber-100">
          {submittedCount}/{totalCount}
        </span>
      </div>
      <div className="w-full bg-stone-700 rounded-full h-1.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-amber-500 to-amber-600 h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
