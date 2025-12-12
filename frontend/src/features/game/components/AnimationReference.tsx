interface AnimationReferenceProps {
  frames: string[];
  viewMode: 'previous' | 'sequence';
}

export function AnimationReference({ frames, viewMode }: AnimationReferenceProps) {
  if (!frames.length) {
    return (
      <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-inner">
        参照できるフレームはまだありません。
      </div>
    );
  }

  const description =
    viewMode === 'previous'
      ? '前のプレイヤーのフレームを参照してください。'
      : 'これまでのフレームの流れを確認できます。';

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">{description}</p>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
          {frames.map((frame, index) => (
            <div
              key={index}
              className="flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm"
              style={{ width: '120px' }}
            >
              <div className="bg-gray-100 px-2 py-1 text-center text-[10px] font-semibold text-gray-700">
                #{index + 1}
              </div>
              <div className="bg-white p-1">
                <img
                  src={frame}
                  alt={`フレーム${index + 1}`}
                  className="h-auto w-full rounded border border-gray-100 object-contain"
                  style={{ aspectRatio: '1/1' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
