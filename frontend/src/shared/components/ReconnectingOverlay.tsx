interface ReconnectingOverlayProps {
  isVisible: boolean;
}

export function ReconnectingOverlay({ isVisible }: ReconnectingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-xl bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <div className="text-center">
            <p className="font-semibold text-gray-800">再接続中...</p>
            <p className="mt-1 text-sm text-gray-600">しばらくお待ちください</p>
          </div>
        </div>
      </div>
    </div>
  );
}
