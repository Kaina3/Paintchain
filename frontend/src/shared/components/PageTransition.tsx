import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { preloadMuseumBackgrounds, isMuseumBackgroundsReady } from '@/shared/lib/preloadMuseumBackgrounds';

const museumBg = '/img/gallery_room.png';
const museumBgDark = '/img/gallery_dark.png';

// 遷移状態のキー
const TRANSITION_KEY = 'pageTransition';

interface PageTransitionChildProps {
  isExiting: boolean;
  exitTo: (path: string) => void;
  contentVisible: boolean;
  lightOn: boolean;
}

interface PageTransitionProps {
  children: ReactNode | ((props: PageTransitionChildProps) => ReactNode);
  /** コンテンツの表示を遅延させるms（入場アニメーションの開始タイミング調整用） */
  contentDelay?: number;
  /** 入場アニメーション完了時のコールバック */
  onEnterComplete?: () => void;
  /** 退場準備（cleanup）のためのコールバック */
  onBeforeExit?: () => void;
  /** 遷移完了時（navigate直前）のコールバック */
  onTransitionComplete?: () => void;
}

/**
 * ページ遷移を統一管理するコンポーネント
 * - 背景の明暗切り替え
 * - 入場・退場アニメーションのタイミング制御
 * - HangingFrameとの連携（isExitingをchildrenに渡す）
 */
export function PageTransition({
  children,
  contentDelay = 120,
  onEnterComplete,
  onBeforeExit,
  onTransitionComplete,
}: PageTransitionProps) {
  const navigate = useNavigate();
  const [bgReady, setBgReady] = useState(isMuseumBackgroundsReady());
  const [lightOn, setLightOn] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // 入場アニメーションかどうかを判定
  const isEntering = sessionStorage.getItem(TRANSITION_KEY) === 'entering';

  // 背景画像をプリロード
  useEffect(() => {
    let cancelled = false;
    preloadMuseumBackgrounds().then(() => {
      if (!cancelled) setBgReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 入場アニメーション
  useEffect(() => {
    if (!bgReady) return;

    if (isEntering) {
      // 1. 最初は暗い状態でコンテンツは非表示
      setLightOn(false);
      setContentVisible(false);

      // 2. 少し待ってからコンテンツ表示開始（フレームが降りてくる）
      const contentTimer = setTimeout(() => {
        setContentVisible(true);
      }, contentDelay);

      // 3. 照明をつける（フレームが見えてから）
      const lightTimer = setTimeout(() => {
        setLightOn(true);
        // 開発時のStrictMode再マウントでも入場アニメが潰れないよう、
        // フラグ消費は「アニメ完了側」に寄せる（開始直後に消さない）
        sessionStorage.removeItem(TRANSITION_KEY);
        onEnterComplete?.();
      }, contentDelay + 300);

      return () => {
        clearTimeout(contentTimer);
        clearTimeout(lightTimer);
      };
    } else {
      // 通常表示（直接アクセスやリロード）
      setLightOn(true);
      setContentVisible(true);
    }
  }, [bgReady, isEntering, contentDelay, onEnterComplete]);

  // 退場アニメーション
  useEffect(() => {
    if (!isExiting || !pendingNavigation) return;

    // 1. 照明を消す
    setLightOn(false);

    // 2. 退場アニメーション完了を待ってから遷移
    const timer = setTimeout(() => {
      // 遷移完了コールバック（クリーンアップ用）
      onTransitionComplete?.();
      // 次のページの入場アニメーションをトリガー
      sessionStorage.setItem(TRANSITION_KEY, 'entering');
      navigate(pendingNavigation);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isExiting, pendingNavigation, navigate, onTransitionComplete]);

  // 退場アニメーションを開始する関数
  const exitTo = useCallback((path: string) => {
    if (isExiting) return; // 二重実行防止
    onBeforeExit?.();
    setPendingNavigation(path);
    setIsExiting(true);
  }, [isExiting, onBeforeExit]);

  // childrenに渡すprops
  const childProps: PageTransitionChildProps = {
    isExiting,
    exitTo,
    contentVisible,
    lightOn,
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
        {/* 画像ロード前の一瞬だけ暗幕を足す（空白防止） */}
        {!bgReady && <div className="absolute inset-0 bg-black" />}
      </div>

      {/* 軽いオーバーレイ */}
      <div className="fixed inset-0 bg-black/10 z-[1]" />

      {/* コンテンツ */}
      <div className="relative z-[2]">
        {typeof children === 'function' ? children(childProps) : children}
      </div>
    </div>
  );
}
