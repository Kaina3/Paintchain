import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createRoom, getRoom } from '@/shared/lib/api';
import { preloadMuseumBackgrounds, isMuseumBackgroundsReady } from '@/shared/lib/preloadMuseumBackgrounds';
import { FaPaintBrush } from 'react-icons/fa';
import { HiSparkles, HiTicket } from 'react-icons/hi';
import { GiEasel } from 'react-icons/gi';
import paletteImg from '@/assets/palette.png';
import { useRoomStore } from '@/features/room/store/roomStore';

const museumBg = '/img/gallery_room.png';
const museumBgDark = '/img/gallery_dark.png';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nickname, setNickname] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loadingAction, setLoadingAction] = useState<'create' | 'join' | 'rejoin' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRoom, setLastRoom] = useState<{ roomId: string; playerName: string } | null>(null);
  const { setRoom } = useRoomStore();
  
  // アニメーション状態
  const [isExiting, setIsExiting] = useState(false);
  const [lightOn, setLightOn] = useState(true);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [bgReady, setBgReady] = useState(isMuseumBackgroundsReady());
  const [homePanelVisible, setHomePanelVisible] = useState(true);
  const isLoading = loadingAction !== null;
  const isCreateLoading = loadingAction === 'create';
  const isJoinLoading = loadingAction === 'join';
  const isRejoinLoading = loadingAction === 'rejoin';

  // Check if there's a room to join from URL parameter
  const joinFromUrl = searchParams.get('join');

  // HomePage表示中はbody背景を無効化
  useEffect(() => {
    document.body.classList.add('home-page-active');
    return () => {
      document.body.classList.remove('home-page-active');
    };
  }, []);

  // 背景画像を事前ロードして遷移時のチラつきを抑える
  useEffect(() => {
    let cancelled = false;
    preloadMuseumBackgrounds().then(() => {
      if (!cancelled) setBgReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const isEntering = sessionStorage.getItem('homeTransition') === 'entering';
    if (!isEntering) return;
    sessionStorage.removeItem('homeTransition');
    setHomePanelVisible(false);
    requestAnimationFrame(() => {
      setHomePanelVisible(true);
    });
  }, []);

  useEffect(() => {
    if (joinFromUrl) {
      setJoinRoomId(joinFromUrl.toUpperCase());
    }

    // If the Home page was loaded via refresh, clear "return to room" info.
    // sessionStorage survives reloads, so we explicitly drop it on reload.
    const navEntries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[] | undefined;
    const navType = navEntries?.[0]?.type;
    if (navType === 'reload') {
      sessionStorage.removeItem('paintchain_last_room');
      setLastRoom(null);
      return;
    }

    // Load last room info (shown only when present)
    const saved = sessionStorage.getItem('paintchain_last_room');
    if (!saved) {
      setLastRoom(null);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { roomId?: string; playerName?: string };
      if (parsed?.roomId && parsed?.playerName) {
        setLastRoom({ roomId: parsed.roomId, playerName: parsed.playerName });
      } else {
        setLastRoom(null);
      }
    } catch (e) {
      console.error('Failed to parse last room info', e);
      setLastRoom(null);
    }
  }, [joinFromUrl]);

  // 退場アニメーションの実行
  useEffect(() => {
    if (isExiting && pendingNavigation) {
      // 1. 電気を消す
      setLightOn(false);

      // 2. 少し待ってからページ遷移
      const timer = setTimeout(() => {
        sessionStorage.setItem('pageTransition', 'entering');
        navigate(pendingNavigation);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isExiting, pendingNavigation, navigate]);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }

    setLoadingAction('create');
    setError(null);

    try {
      const { roomId } = await createRoom();
      const room = await getRoom(roomId);
      setRoom(room);
      const name = nickname.trim();
      // Store nickname in sessionStorage for use in lobby
      sessionStorage.setItem('playerName', name);
      // アニメーション開始
      setPendingNavigation(`/room/${roomId}`);
      setIsExiting(true);
    } catch {
      setError('ルームの作成に失敗しました');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError('ニックネームを入力してください');
      return;
    }
    if (!joinRoomId.trim()) {
      setError('ルームIDを入力してください');
      return;
    }

    setLoadingAction('join');
    setError(null);
    const name = nickname.trim();
    const roomId = joinRoomId.trim().toUpperCase();
    try {
      const room = await getRoom(roomId);
      setRoom(room);
      sessionStorage.setItem('playerName', name);
      // アニメーション開始
      setPendingNavigation(`/room/${roomId}`);
      setIsExiting(true);
    } catch {
      setError('ルームが見つかりませんでした');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejoin = async () => {
    if (!lastRoom) return;
    setLoadingAction('rejoin');
    setError(null);
    try {
      const room = await getRoom(lastRoom.roomId);
      setRoom(room);
      sessionStorage.setItem('playerName', lastRoom.playerName);
      setNickname(lastRoom.playerName);
      // アニメーション開始
      setPendingNavigation(`/room/${lastRoom.roomId}`);
      setIsExiting(true);
    } catch {
      setError('ルームが見つかりませんでした');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景レイヤー */}
      <div className="fixed inset-0" style={{ backgroundColor: '#0b0b0c' }}>
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-opacity duration-500"
          style={{
            backgroundImage: `url(${museumBgDark})`,
            opacity: lightOn ? 0 : 1,
            backgroundAttachment: 'fixed',
          }}
        />
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-opacity duration-500"
          style={{
            backgroundImage: `url(${museumBg})`,
            opacity: lightOn ? 1 : 0,
            backgroundAttachment: 'fixed',
          }}
        />
        {/* 画像ロード前の一瞬だけ薄い暗幕を足す（空白防止） */}
        {!bgReady && <div className="absolute inset-0 bg-black" />}
      </div>

      {/* 軽いオーバーレイ */}
      <div className="fixed inset-0 bg-black/10 z-[1]" />
      
      {/* コンテンツ */}
      <div className="relative z-[2] min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* タイトルヘッダー */}
        <div
          className="text-center transition-opacity duration-500"
          style={{ opacity: isExiting ? 0 : 1 }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src={paletteImg} alt="palette" className="w-14 h-14 md:w-16 md:h-16 drop-shadow-lg animate-float" />
            <h1 
              className="font-serif text-4xl md:text-5xl font-bold tracking-wide text-amber-100"
              style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.6)' }}
            >
              Paintchain
            </h1>
          </div>
          <p 
            className="text-lg text-amber-200/90 italic font-serif"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            A collaborative art journey
          </p>
        </div>

        <div
          className="space-y-6 transition-all duration-700 ease-in"
          style={{
            transform: isExiting || !homePanelVisible ? 'translateY(100vh)' : 'translateY(0)',
            opacity: isExiting || !homePanelVisible ? 0 : 1,
          }}
        >
          {/* メインカード - 美術館フレームスタイル */}
          <div 
            className="museum-frame rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl" 
            style={{ 
              border: '6px solid transparent',
              borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(107,83,68,0.4)'
            }}
          >
            <div className="rounded bg-white/90 backdrop-blur-xl p-5 md:p-6">
            {lastRoom && !joinFromUrl && (
              <div className="mb-5 animate-fade-in">
                <button
                  onClick={handleRejoin}
                  disabled={isLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-800 p-4 text-amber-100 
                           shadow-lg hover:from-emerald-600 hover:to-emerald-700
                           transition-all duration-300 transform hover:scale-[1.02] active:scale-95 
                           flex items-center justify-between group border-2 border-emerald-600/50
                           disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                >
                  <div className="text-left">
                    <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="animate-pulse">●</span> {isRejoinLoading ? 'Entering...' : 'Return to Exhibition'}
                    </div>
                    <div className="font-bold text-xl flex items-center gap-2 font-mono tracking-wide">
                      <span>🏛️</span> {lastRoom.roomId}
                    </div>
                    <div className="text-sm text-emerald-100 font-medium mt-1">
                      🎨 {lastRoom.playerName} として参加
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>
                
                <div className="relative mt-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-stone-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 py-1 text-stone-500 font-serif font-semibold rounded-md">or begin anew</span>
                  </div>
                </div>
              </div>
            )}

            {joinFromUrl && (
              <div className="mb-4 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100 p-4 text-sm text-amber-800 border-2 border-amber-300">
                <span className="text-lg">🎉</span> You have been invited to Room <span className="font-bold text-amber-700 font-mono">{joinFromUrl}</span>
                <br />
                <span className="text-stone-600">Enter your name to join the exhibition</span>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-gradient-to-r from-red-50 to-red-100 p-4 text-sm text-red-700 border-2 border-red-200">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="nickname" className="block text-sm font-serif font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                  <FaPaintBrush className="text-amber-700" /> Artist Name
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your name"
                  maxLength={20}
                  className="block w-full rounded-lg border-2 border-stone-300 px-4 py-3 bg-white
                           focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                           transition-all duration-200 font-medium placeholder:text-stone-400"
                />
              </div>

              {/* Show join button prominently if joining from URL */}
              {joinFromUrl ? (
                <>
                  <button
                    onClick={handleJoinRoom}
                    disabled={isLoading}
                    className="w-full rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-4 font-serif font-bold text-amber-100 
                             shadow-lg hover:from-amber-600 hover:to-amber-700
                             transition-all duration-300 
                             transform hover:scale-[1.02] active:scale-95 border-2 border-amber-600/50
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    🏛️ {isJoinLoading ? 'Entering...' : 'Enter Exhibition'}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-stone-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-4 py-1 text-stone-500 font-serif font-semibold rounded-md">or</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    disabled={isLoading}
                    className="w-full rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 border-2 border-stone-500 px-6 py-4 
                             font-serif font-bold text-stone-200 transition-all duration-300 
                             hover:from-stone-500 hover:to-stone-600 transform hover:scale-[1.02] 
                             active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <span className="flex items-center justify-center gap-2">
                    <HiSparkles className="text-lg" />
                    {isCreateLoading ? 'Creating...' : 'Create New Exhibition'}
                  </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCreateRoom}
                    disabled={isLoading}
                    className="w-full rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-4 font-serif font-bold text-amber-100 
                             shadow-lg hover:from-amber-600 hover:to-amber-700
                             transition-all duration-300 
                             transform hover:scale-[1.02] active:scale-95 
                             disabled:opacity-50 disabled:cursor-not-allowed border-2 border-amber-600/50"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <HiSparkles className="text-lg" />
                      {isCreateLoading ? 'Creating...' : 'Create Exhibition'}
                    </span>
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-stone-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-4 py-1 text-stone-500 font-serif font-semibold rounded-md">or</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="roomId" className="block text-sm font-serif font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                      <HiTicket className="text-amber-700 text-base" /> Join by Room Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="roomId"
                        type="text"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className="block flex-1 rounded-lg border-2 border-stone-300 px-4 py-3 
                                 uppercase bg-white font-bold text-lg tracking-wider
                                 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                                 transition-all duration-200 placeholder:text-stone-400"
                      />
                      <button
                        onClick={handleJoinRoom}
                        disabled={isLoading}
                        className="rounded-lg bg-gradient-to-r from-stone-700 to-stone-800 
                                 px-6 py-3 font-serif font-bold text-stone-200 
                                 shadow-lg hover:from-stone-600 hover:to-stone-700
                                 transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-stone-600/50
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
                      >
                        {isJoinLoading ? 'Entering...' : 'Enter'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

          {/* Practice button - 美術館風 */}
          <div 
            className="museum-frame rounded-lg bg-white/15 backdrop-blur-md p-1 shadow-2xl" 
            style={{ 
              border: '4px solid transparent',
              borderImage: 'linear-gradient(135deg, #8b7355 0%, #c4a574 20%, #a08060 40%, #6b5344 60%, #9c8060 80%, #7a6348 100%) 1',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(107,83,68,0.4)'
            }}
          >
            <button
              onClick={() => navigate('/practice')}
              className="w-full bg-white/90 backdrop-blur-xl rounded p-5 text-center 
                       hover:bg-white transition-all duration-300 
                       transform hover:scale-[1.02] active:scale-95"
            >
              <div className="flex justify-center text-4xl mb-2 text-stone-500">
                <GiEasel />
              </div>
              <p className="font-serif font-bold text-stone-800 text-lg">Practice Studio</p>
              <p className="text-sm text-stone-500 mt-1 font-serif italic">Free canvas for artistic exploration</p>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
