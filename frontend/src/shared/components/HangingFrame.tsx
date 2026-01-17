import React, { ReactNode, useEffect, useId, useState } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, MotionValue, animate } from 'framer-motion';
import './HangingFrame.css';

interface HangingFrameProps {
  children: ReactNode;
  delay?: number;
  isExiting?: boolean;
  /** 天井の高さ（vh単位） */
  ropeLength?: number;
}

type ExitType = 'pull-up' | 'drop-down';

let sharedExitType: ExitType | null = null;
let sharedExitTimestamp = 0;
const SHARED_EXIT_WINDOW = 100;

function getSharedExitType(): ExitType {
  const now = Date.now();
  if (sharedExitType && now - sharedExitTimestamp < SHARED_EXIT_WINDOW) {
    return sharedExitType;
  }
  sharedExitType = Math.random() < 0.3 ? 'drop-down' : 'pull-up';
  sharedExitTimestamp = now;
  return sharedExitType;
}

/**
 * 紐を描画するコンポーネント
 * 額縁の動き (y, rotate) に追従してベジェ曲線を描く
 */
const DynamicRopes = ({
  y,
  rotate,
  isCut,
  uniqueId,
  ropeHeightVh = 100
}: {
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  isCut: boolean;
  uniqueId: string;
  ropeHeightVh?: number;
}) => {
  // アンカー座標（SVG内座標系: 0-100%）
  // 画面上部よりも上から吊るす
  // ropeHeightVhを使用して高さを調整
  const anchorY = -50 - (ropeHeightVh / 2);
  const leftAnchorX = 20;
  const rightAnchorX = 80;

  // フック（額縁との接続点）の初期座標（回転・移動なしの状態）
  const hookBaseY = 0;
  const leftHookBaseX = 20;
  const rightHookBaseX = 80;

  // 中心点（回転軸）
  const centerX = 50;

  // MotionValueからパス文字列を生成
  const leftRopePath = useTransform([y, rotate], ([currentY, currentRotate]) => {
    const rad = (currentRotate * Math.PI) / 180;
    const dx = leftHookBaseX - centerX;
    const dy = hookBaseY;

    // 回転
    const rotatedX = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
    // 回転軸 (50,0) まわり:
    // x' = cx + (x-cx)cos - (y-cy)sin
    // y' = cy + (x-cx)sin + (y-cy)cos
    // cy = 0
    // rotatedY = (x-cx)sin + y*cos
    const finalRotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

    // Y移動適用
    // currentYはvh単位だが、SVG内では%的に働く。
    // そのまま加算すると大きくずれる可能性があるが、
    // animateで0になるので、最終位置は正確になる。
    // 途中経過は見た目重視。
    const finalX = rotatedX;
    const finalY = finalRotatedY + currentY;

    if (isCut) {
      return `M ${leftAnchorX} ${anchorY} Q ${leftAnchorX} ${(anchorY + finalY) / 2 - 20} ${leftAnchorX + 5} ${(anchorY + finalY) / 2}`;
    }

    // ベジェ曲線で（わずかな）弛みを表現
    // 重力下にあるため基本は直線だが、雰囲気作りのためにごくわずかに下げる
    return `M ${leftAnchorX} ${anchorY} L ${finalX} ${finalY}`;
  });

  const rightRopePath = useTransform([y, rotate], ([currentY, currentRotate]) => {
    const rad = (currentRotate * Math.PI) / 180;
    const dx = rightHookBaseX - centerX;
    const dy = 0;

    const rotatedX = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
    const finalRotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

    const finalX = rotatedX;
    const finalY = finalRotatedY + currentY;

    if (isCut) {
      return `M ${rightAnchorX} ${anchorY} Q ${rightAnchorX} ${(anchorY + finalY) / 2 - 20} ${rightAnchorX - 5} ${(anchorY + finalY) / 2}`;
    }

    return `M ${rightAnchorX} ${anchorY} L ${finalX} ${finalY}`;
  });

  const patternId = `rope-pattern-${uniqueId}`;

  return (
    <svg
      className="ropes-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ overflow: 'visible', height: '100vh' }}
    >
      <defs>
        <pattern id={patternId} x="0" y="0" width="2" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect x="0" y="0" width="1" height="4" fill="#6d5a45" />
          <rect x="1" y="0" width="1" height="4" fill="#8f765e" />
        </pattern>
        <filter id={`rope-shadow-${uniqueId}`}>
          <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" floodOpacity="0.3" />
        </filter>
      </defs>

      <motion.path
        d={leftRopePath}
        stroke={`url(#${patternId})`}
        strokeWidth="1.2"
        fill="none"
        filter={`url(#rope-shadow-${uniqueId})`}
        vectorEffect="non-scaling-stroke"
      />

      <motion.path
        d={rightRopePath}
        stroke={`url(#${patternId})`}
        strokeWidth="1.2"
        fill="none"
        filter={`url(#rope-shadow-${uniqueId})`}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
  const [ropeCut, setRopeCut] = useState(false);
  const [exitType, setExitType] = useState<ExitType | null>(null);

  useEffect(() => {
    if (!isExiting) {
      y.set(-100);
      rotate.set(-5 + Math.random() * 10);
      setRopeCut(false);

      const enterAnimation = async () => {
        // 遅延待機
        await new Promise(r => setTimeout(r, delay * 1000));

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

        return () => {
          controlsY.stop();
          controlsRotate.stop();
        };
      };
      enterAnimation();
    } else {
      const currentExitType = getSharedExitType();
      setExitType(currentExitType);

      if (currentExitType === 'drop-down') {
        setRopeCut(true);
        animate(y, 120, { duration: 0.8, ease: [0.55, 0, 1, 0.45] });
        animate(rotate, Math.random() > 0.5 ? 20 : -20, { duration: 0.8 });
      } else {
        animate(y, -120, { duration: 0.6, ease: [0.4, 0, 0.6, 1] });
        animate(rotate, Math.random() > 0.5 ? 5 : -5, { duration: 0.6 });
      }
    }
  }, [isExiting, delay, y, rotate]);

  const yVh = useTransform(y, value => `${value}vh`);

  return (
    <div className="hanging-frame-container">
      <DynamicRopes
        y={y}
        rotate={rotate}
        isCut={ropeCut}
        uniqueId={uniqueId}
        ropeHeightVh={ropeLength}
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
