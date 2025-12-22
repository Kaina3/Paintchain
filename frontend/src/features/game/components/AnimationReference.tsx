interface AnimationReferenceProps {
  frames: string[];
  viewMode: 'previous' | 'sequence';
  background?: string;
}

export function AnimationReference({ frames, viewMode, background }: AnimationReferenceProps) {
  const hasContent = frames.length > 0 || background;
  
  if (!hasContent) {
    return (
      <div className="rounded-xl bg-white p-4 text-sm text-gray-500 shadow-inner">
        参照できるフレームはまだありません。
      </div>
    );
  }

  const description = background
    ? '背景の上にアニメーションを描いてください。'
    : viewMode === 'previous'
      ? '前のプレイヤーのフレームを参照してください。'
      : 'これまでのフレームの流れを確認できます。';

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">{description}</p>
      
      {/* 背景画像がある場合は最初に表示 */}
      {background && (
        <div className="mb-3">
          <div className="overflow-hidden rounded-lg border-2 border-amber-300 bg-amber-50 shadow-sm">
            <div className="bg-amber-100 px-2 py-1 text-center text-[10px] font-semibold text-amber-700">
              🖼️ 背景（固定）
            </div>
            <div className="bg-white p-1">
              <img
                src={background}
                alt="背景"
                className="h-auto w-full rounded border border-amber-100 object-contain"
                style={{ maxHeight: '200px' }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* フレーム一覧 */}
      {frames.length > 0 && (
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
      )}
    </div>
  );
}
