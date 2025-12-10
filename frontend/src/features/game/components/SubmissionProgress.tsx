import { useGameStore } from '@/features/game/store/gameStore';

export function SubmissionProgress() {
  const { submittedCount, totalCount } = useGameStore();

  return (
    <div className="text-center text-sm text-gray-600">
      提出状況: {submittedCount} / {totalCount} 人
    </div>
  );
}
