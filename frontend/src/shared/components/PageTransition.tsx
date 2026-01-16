import { useEffect, useState, type ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  isEntering?: boolean;
  onEnterComplete?: () => void;
}

export function PageTransition({ children, isEntering = false, onEnterComplete }: PageTransitionProps) {
  const [lightOn, setLightOn] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    if (isEntering) {
      // 入場アニメーション
      // 1. 最初は暗い状態でパネルは画面外（上）
      setLightOn(false);
      setPanelVisible(false);

      // 2. 少し待ってからパネルを降ろす
      const panelTimer = setTimeout(() => {
        setPanelVisible(true);
      }, 300);

      // 3. パネルが降りてきたら電気をつける
      const lightTimer = setTimeout(() => {
        setLightOn(true);
        onEnterComplete?.();
      }, 800);

      return () => {
        clearTimeout(panelTimer);
        clearTimeout(lightTimer);
      };
    } else {
      // 通常表示
      setLightOn(true);
      setPanelVisible(true);
    }
  }, [isEntering, onEnterComplete]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景レイヤー */}
      <div className="fixed inset-0 transition-opacity duration-500"
        style={{
          backgroundImage: lightOn ? "url('/img/gallery_room.png')" : "url('/img/gallery_dark.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />

      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-black/10 z-[1]" />

      {/* コンテンツ */}
      <div 
        className="relative z-[2] transition-all duration-700 ease-out"
        style={{
          transform: panelVisible ? 'translateY(0)' : 'translateY(-100vh)',
          opacity: panelVisible ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface PageExitTransitionProps {
  isExiting: boolean;
  onExitComplete: () => void;
  children: ReactNode;
}

export function PageExitTransition({ isExiting, onExitComplete, children }: PageExitTransitionProps) {
  const [lightOn, setLightOn] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);

  useEffect(() => {
    if (isExiting) {
      // 退場アニメーション
      // 1. 電気を消す
      setLightOn(false);

      // 2. 少し待ってからパネルを落とす
      const panelTimer = setTimeout(() => {
        setPanelVisible(false);
      }, 300);

      // 3. パネルが落ちたら完了
      const completeTimer = setTimeout(() => {
        onExitComplete();
      }, 1000);

      return () => {
        clearTimeout(panelTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isExiting, onExitComplete]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景レイヤー */}
      <div className="fixed inset-0 transition-opacity duration-500"
        style={{
          backgroundImage: lightOn ? "url('/img/gallery_room.png')" : "url('/img/gallery_dark.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />

      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-black/10 z-[1]" />

      {/* コンテンツ */}
      <div 
        className="relative z-[2] transition-all duration-700 ease-in"
        style={{
          transform: panelVisible ? 'translateY(0)' : 'translateY(100vh)',
          opacity: panelVisible ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
