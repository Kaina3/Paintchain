import React, { ReactNode, useEffect, useId, useState } from 'react';
import { motion, useMotionValue, useTransform, MotionValue, animate } from 'framer-motion';
import './HangingFrame.css';

interface HangingFrameProps {
  children: ReactNode;
  delay?: number;
  isExiting?: boolean;
  /** 天井の高さ（vh単位） */
  ropeLength?: number;
}

type ExitType = 'pull-up' | 'drop-down';

// 共有された退場アニメーションタイプ
let sharedExitType: ExitType | null = null;
let sharedExitTimestamp = 0;
const SHARED_EXIT_WINDOW = 100;

function getSharedExitType(): ExitType {
  const now = Date.now();
  if (sharedExitType && now - sharedExitTimestamp < SHARED_EXIT_WINDOW) {
    return sharedExitType;
  }
  sharedExitType = Math.random() < 0.5 ? 'drop-down' : 'pull-up';
  sharedExitTimestamp = now;
  return sharedExitType;
}

/**
 * 縄を描画するSVGコンポーネント
 * 額縁の動き (y, rotate) に追従して立体的な縄を描く
 */
const Rope = ({
  y,
  rotate,
  isCut,
  uniqueId,
  ropeHeightVh = 100,
  opacity
}: {
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  isCut: boolean;
  uniqueId: string;
  ropeHeightVh?: number;
  opacity: MotionValue<number>;
}) => {
  // アンカー座標（画面上部より上）
  const anchorY = -50 - (ropeHeightVh / 2);
  const leftAnchorX = 20;
  const rightAnchorX = 80;

  // フック座標（額縁との接続点の初期位置）
  const hookBaseY = 0;
  const leftHookBaseX = 20;
  const rightHookBaseX = 80;
  const centerX = 50;

  // MotionValueからパス文字列を生成
  const createRopePath = (anchorX: number, hookBaseX: number) =>
    useTransform([y, rotate], (values: number[]) => {
      const [currentY, currentRotate] = values;
      const rad = (currentRotate * Math.PI) / 180;
      const dx = hookBaseX - centerX;
      const dy = hookBaseY;

      // 回転を適用
      const rotatedX = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
      const finalRotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);
      const finalX = rotatedX;
      const finalY = finalRotatedY + currentY;

      if (isCut) {
        // 切れた縄は垂れ下がる（アンカーから少し下に垂れる）
        const hangLength = 15;
        return `M ${anchorX} ${anchorY} L ${anchorX} ${anchorY + hangLength}`;
      }

      // 通常は直線
      return `M ${anchorX} ${anchorY} L ${finalX} ${finalY}`;
    });

  const leftRopePath = createRopePath(leftAnchorX, leftHookBaseX);
  const rightRopePath = createRopePath(rightAnchorX, rightHookBaseX);

  return (
    <motion.svg
      className="rope-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ opacity }}
    >
      <defs>
        {/* 縄の影 */}
        <filter id={`rope-shadow-${uniqueId}`}>
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
          <feOffset dx="1" dy="1" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 左の縄 */}
      <g filter={`url(#rope-shadow-${uniqueId})`}>
        <motion.path
          d={leftRopePath}
          stroke="#6a5a4a"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* ハイライト */}
        <motion.path
          d={leftRopePath}
          stroke="rgba(139, 115, 85, 0.4)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{ transform: 'translateX(-0.5px)' }}
        />
      </g>

      {/* 右の縄 */}
      <g filter={`url(#rope-shadow-${uniqueId})`}>
        <motion.path
          d={rightRopePath}
          stroke="#6a5a4a"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* ハイライト */}
        <motion.path
          d={rightRopePath}
          stroke="rgba(139, 115, 85, 0.4)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{ transform: 'translateX(-0.5px)' }}
        />
      </g>
    </motion.svg>
  );
};

export const HangingFrame: React.FC<HangingFrameProps> = ({
  children,
  delay = 0,
  isExiting = false,
  ropeLength = 50,
}) => {
  const uniqueId = useId();
  const y = useMotionValue(-100);
  const rotate = useMotionValue(0);
  const ropeOpacity = useMotionValue(0); // 初期値は非表示（表示ズレ防止のため）
  const [ropeCut, setRopeCut] = useState(false);

  useEffect(() => {
    if (!isExiting) {
      // 初期化
      y.set(-100);
      rotate.set(-5 + Math.random() * 10);
      ropeOpacity.set(0);
      setRopeCut(false);

      const enterAnimation = async () => {
        // 遅延待機
        await new Promise(r => setTimeout(r, delay * 1000));

        // アニメーション開始直前に表示（画面外にあるはずなのでパッと現れても問題ない）
        ropeOpacity.set(1);

        // 額縁のアニメーション
        const controlsY = animate(y, 0, {
          type: "spring",
          damping: 12,
          stiffness: 60,
          mass: 1.2
        });

        const controlsRotate = animate(rotate, 0, {
          type: "spring",
          damping: 5,
          stiffness: 30,
          velocity: (Math.random() - 0.5) * 50
        });

        // アニメーション終了待機
        await Promise.all([controlsY, controlsRotate]);

        // 少し待ってからフェードアウト
        // 直前の色の変化などを防ぐため、十分に静止してから行う
        await new Promise(r => setTimeout(r, 100));
        animate(ropeOpacity, 0, { duration: 0.5, ease: "easeOut" });
      };

      enterAnimation();
    } else {
      // 退場アニメーション
      // 退場時は即座に表示して連動させる
      ropeOpacity.set(1);
      const currentExitType = getSharedExitType();

      if (currentExitType === 'drop-down') {
        setRopeCut(true);
        animate(y, 120, { duration: 0.8, ease: [0.55, 0, 1, 0.45] });
        animate(rotate, Math.random() > 0.5 ? 20 : -20, { duration: 0.8 });
      } else {
        animate(y, -120, { duration: 0.8, ease: [0.4, 0, 0.6, 1] });
        animate(rotate, Math.random() > 0.5 ? 5 : -5, { duration: 0.6 });
      }

      // 退場時のフェードアウト
      animate(ropeOpacity, 0, { duration: 0.5, ease: "easeOut" });
    }
  }, [isExiting, delay, y, rotate, ropeOpacity]);

  const yVh = useTransform(y, value => `${value}vh`);

  return (
    <div className="hanging-frame-container">
      <Rope
        y={y}
        rotate={rotate}
        isCut={ropeCut}
        uniqueId={uniqueId}
        ropeHeightVh={ropeLength}
        opacity={ropeOpacity}
      />

      <motion.div
        className="hanging-frame-wrapper"
        style={{
          y: yVh,
          rotate: rotate,
          transformOrigin: "50% 0%"
        }}
      >
        <div className="frame-content">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
