import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createRoom } from '@/shared/lib/api';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nickname, setNickname] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if there's a room to join from URL parameter
  const joinFromUrl = searchParams.get('join');

  useEffect(() => {
    if (joinFromUrl) {
      setJoinRoomId(joinFromUrl.toUpperCase());
    }
  }, [joinFromUrl]);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { roomId } = await createRoom();
      // Store nickname in sessionStorage for use in lobby
      sessionStorage.setItem('playerName', nickname.trim());
      navigate(`/room/${roomId}`);
    } catch {
      setError('ルームの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }
    if (!joinRoomId.trim()) {
      setError('ルームIDを入力してください');
      return;
    }

    sessionStorage.setItem('playerName', nickname.trim());
    navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-700">🎨 Paintchain</h1>
          <p className="mt-2 text-gray-600">お絵描き伝言ゲーム</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          {joinFromUrl && (
            <div className="mb-4 rounded-lg bg-primary-50 p-3 text-sm text-primary-700">
              ルーム <span className="font-bold">{joinFromUrl}</span> に招待されています。ニックネームを入力して参加してください！
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
                ニックネーム
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="あなたの名前"
                maxLength={20}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>

            {/* Show join button prominently if joining from URL */}
            {joinFromUrl ? (
              <>
                <button
                  onClick={handleJoinRoom}
                  className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700"
                >
                  ルームに参加
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">または</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                >
                  {loading ? '作成中...' : '新しいルームを作成'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? '作成中...' : 'ルームを作成'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">または</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="roomId" className="block text-sm font-medium text-gray-700">
                    ルームIDで参加
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="roomId"
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="XXXXXX"
                      maxLength={6}
                      className="block flex-1 rounded-lg border border-gray-300 px-4 py-2 uppercase focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white transition hover:bg-gray-700"
                    >
                      参加
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Practice button */}
        <button
          onClick={() => navigate('/practice')}
          className="w-full rounded-xl bg-white p-4 text-center shadow-lg transition hover:shadow-xl"
        >
          <span className="text-2xl">🖌️</span>
          <p className="mt-1 font-semibold text-gray-700">お絵描きしてみる！</p>
          <p className="text-sm text-gray-500">キャンバスで自由にお絵描き練習</p>
        </button>
      </div>
    </div>
  );
}
