import { useGameStore } from '@/features/game/store/gameStore';

export function SubmissionProgress() {
  const { submittedCount, totalCount } = useGameStore();
  const percentage = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;

  return (
    <div className="glass rounded-xl px-4 py-3 shadow-md border border-white/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-700">📊 提出状況</span>
        <span className="text-xs font-black text-primary-600">
          {submittedCount} / {totalCount} 人
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-pink-600 to-pink-700 h-2.5 rounded-full transition-all duration-500 ease-out shadow-lg"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
