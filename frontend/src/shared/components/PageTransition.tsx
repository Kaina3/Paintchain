import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  isEntering?: boolean;
  onEnterComplete?: () => void;
}

export function PageTransition({ children, isEntering = false, onEnterComplete }: PageTransitionProps) {
  const [lightOn, setLightOn] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);

  useEffect(() => {
    if (isEntering) {
      // 入場アニメーション
      setLightOn(false);
      setCanAnimate(true);

      // 照明をつけるのはアニメーション後
      const lightTimer = setTimeout(() => {
        setLightOn(true);
        onEnterComplete?.();
      }, 900);

      return () => {
        clearTimeout(lightTimer);
      };
    } else {
      // 通常表示
      setLightOn(true);
      setCanAnimate(true);
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
      <motion.div
        className="relative z-[2]"
        initial={isEntering ? { opacity: 0, rotateZ: -15, translateY: -120 } : { opacity: 1, rotateZ: 0, translateY: 0 }}
        animate={canAnimate ? { opacity: 1, rotateZ: 0, translateY: 0 } : {}}
        transition={isEntering ? {
          duration: 0.8,
          ease: [0.34, 1.56, 0.64, 1], // swing ease
        } : {}}
        style={{
          originX: 0.5,
          originY: 0,
        }}
      >
        {children}
      </motion.div>
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
  const [canAnimateExit, setCanAnimateExit] = useState(false);

  useEffect(() => {
    if (isExiting) {
      // 退場アニメーション
      setLightOn(false);
      setCanAnimateExit(true);

      // アニメーション完了後
      const completeTimer = setTimeout(() => {
        onExitComplete();
      }, 700);

      return () => {
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
      <motion.div
        className="relative z-[2]"
        initial={{ opacity: 1, rotateZ: 0, translateY: 0 }}
        animate={canAnimateExit ? { opacity: 0, rotateZ: 15, translateY: -150 } : { opacity: 1, rotateZ: 0, translateY: 0 }}
        transition={{
          duration: 0.6,
          ease: 'easeIn',
        }}
        style={{
          originX: 0.5,
          originY: 0,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
