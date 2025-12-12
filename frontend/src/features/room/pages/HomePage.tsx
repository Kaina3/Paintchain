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
        <div className="text-center animate-slide-down">
          <div className="relative inline-block">
            <h1 className="text-5xl font-black gradient-text animate-float">
              🎨 Paintchain
            </h1>
            <div className="absolute -inset-1 bg-gradient-primary opacity-20 blur-xl -z-10 rounded-full"></div>
          </div>
          <p className="mt-3 text-lg text-gray-700 font-medium">お絵描き伝言ゲーム</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-pop animate-scale-in">
          {joinFromUrl && (
            <div className="mb-4 rounded-xl bg-gradient-to-r from-primary-100 to-secondary-100 p-4 text-sm text-primary-700 animate-pulse-slow border-2 border-primary-200">
              <span className="text-lg">🎉</span> ルーム <span className="font-bold text-primary-600">{joinFromUrl}</span> に招待されています！
              <br />
              ニックネームを入力して参加してください
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100 p-4 text-sm text-red-700 border-2 border-red-200 animate-wiggle">
              <span className="text-lg">⚠️</span> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-bold text-gray-800 mb-2">
                ✏️ ニックネーム
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="あなたの名前"
                maxLength={20}
                className="block w-full rounded-xl border-2 border-gray-200 px-5 py-3 bg-white
                         focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100
                         transition-all duration-200 font-medium placeholder:text-gray-400"
              />
            </div>

            {/* Show join button prominently if joining from URL */}
            {joinFromUrl ? (
              <>
                <button
                  onClick={handleJoinRoom}
                  className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 px-6 py-4 font-bold text-white 
                           shadow-[0_4px_14px_0_rgba(221,32,115,0.5)] hover:shadow-[0_6px_20px_rgba(221,32,115,0.7)] 
                           hover:from-pink-700 hover:to-pink-800
                           transition-all duration-300 
                           transform hover:scale-[1.02] active:scale-95"
                >
                  <span className="text-lg">🎮</span> ルームに参加
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 py-1 text-gray-500 font-semibold rounded-md">または</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full rounded-xl bg-white border-2 border-gray-300 px-6 py-4 
                           font-bold text-gray-700 transition-all duration-300 
                           hover:bg-gray-50 hover:border-gray-400 transform hover:scale-[1.02] 
                           active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? '✨ 作成中...' : '🆕 新しいルームを作成'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 px-6 py-4 font-bold text-white 
                           shadow-[0_4px_14px_0_rgba(221,32,115,0.5)] hover:shadow-[0_6px_20px_rgba(221,32,115,0.7)] 
                           hover:from-pink-700 hover:to-pink-800
                           transition-all duration-300 
                           transform hover:scale-[1.02] active:scale-95 
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '✨ 作成中...' : '🆕 ルームを作成'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 py-1 text-gray-500 font-semibold rounded-md">または</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="roomId" className="block text-sm font-bold text-gray-800 mb-2">
                    🔑 ルームIDで参加
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="roomId"
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="XXXXXX"
                      maxLength={6}
                      className="block flex-1 rounded-xl border-2 border-gray-200 px-5 py-3 
                               uppercase bg-white font-bold text-lg tracking-wider
                               focus:border-secondary-400 focus:outline-none focus:ring-4 focus:ring-secondary-100
                               transition-all duration-200 placeholder:text-gray-400"
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 
                               px-6 py-3 font-bold text-white 
                               shadow-[0_4px_14px_0_rgba(37,99,235,0.5)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.7)]
                               hover:from-blue-700 hover:to-blue-800 
                               transition-all duration-300 transform hover:scale-105 active:scale-95"
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
          className="w-full bg-white rounded-2xl p-6 text-center shadow-pop 
                   hover:shadow-pop-hover transition-all duration-300 
                   transform hover:scale-[1.02] active:scale-95 
                   border-2 border-white animate-scale-in"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="text-4xl mb-2 animate-bounce-slow">🖌️</div>
          <p className="font-bold text-gray-800 text-lg">お絵描きしてみる！</p>
          <p className="text-sm text-gray-600 mt-1">キャンバスで自由にお絵描き練習</p>
        </button>
      </div>
    </div>
  );
}
