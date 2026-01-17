import React, { ReactNode, useEffect, useState, useId } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './HangingFrame.css';

interface HangingFrameProps {
  children: ReactNode;
  delay?: number;
  isExiting?: boolean;
  /** 紐の長さ（vh単位）- フレームの位置に応じて調整 */
  ropeLength?: number;
}

// 退場アニメーションのタイプ
type ExitType = 'pull-up' | 'drop-down';

// 同時に退場するフレームで共有する退場タイプ
let sharedExitType: ExitType | null = null;
let sharedExitTimestamp = 0;
const SHARED_EXIT_WINDOW = 100; // 100ms以内なら同じ退場セッションとみなす

function getSharedExitType(): ExitType {
  const now = Date.now();
  // 前回の退場から100ms以内なら同じタイプを使用
  if (sharedExitType && now - sharedExitTimestamp < SHARED_EXIT_WINDOW) {
    return sharedExitType;
  }
  sharedExitType = Math.random() < 0.3 ? 'drop-down' : 'pull-up';
  sharedExitTimestamp = now;
  return sharedExitType;
}

/**
 * 美術館風の吊り下げ額縁コンポーネント
 * 紐で吊るされた絵画のように、ページ遷移時に
 * - 入場：上から降りてきて振り子のように揺れて止まる
 * - 退場：
 *   - pull-up（基本）：紐に引っ張られて上に消える
 *   - drop-down（たまに）：紐が切れて重力で下に落ちる
 */
export const HangingFrame: React.FC<HangingFrameProps> = ({
  children,
  delay = 0,
  isExiting = false,
  ropeLength = 30,
}) => {
  const controls = useAnimation();
  const ropeControls = useAnimation();
  const [ropeCut, setRopeCut] = useState(false);
  const [ropeAnimating, setRopeAnimating] = useState(true);
  const [exitType, setExitType] = useState<ExitType | null>(null);
  const uniqueId = useId();

  useEffect(() => {
    if (isExiting) {
      const currentExitType = getSharedExitType();
      setExitType(currentExitType);

      if (currentExitType === 'drop-down') {
        // 落下パターン：紐が切れて重力で落下
        const exitSequence = async () => {
          setRopeCut(true);

          // 紐が切れるアニメーション（上に引っ込む）
          ropeControls.start({
            scaleY: 0,
            originY: 0,
            transition: { duration: 0.15, ease: 'easeIn' }
          });

          // フレームが重力で落下（少し回転しながら）
          await controls.start({
            translateY: '120vh',
            rotateZ: Math.random() > 0.5 ? 25 : -25,
            opacity: 0,
            transition: {
              translateY: {
                duration: 0.8,
                ease: [0.55, 0, 1, 0.45], // 重力加速カーブ
              },
              rotateZ: {
                duration: 0.8,
                ease: 'easeIn',
              },
              opacity: {
                duration: 0.6,
                delay: 0.2,
              },
            },
          });
        };
        exitSequence();
      } else {
        // 引き上げパターン：紐に引っ張られて上に消える
        const exitSequence = async () => {
          // フレームと紐が一緒に上に引き上げられる
          await controls.start({
            translateY: '-120vh',
            rotateZ: Math.random() > 0.5 ? 8 : -8, // わずかな揺れ
            opacity: 0,
            transition: {
              translateY: {
                duration: 0.7,
                ease: [0.4, 0, 0.6, 1], // スムーズな加速
              },
              rotateZ: {
                duration: 0.7,
                ease: 'easeOut',
              },
              opacity: {
                duration: 0.5,
                delay: 0.2,
              },
            },
          });
        };
        exitSequence();
      }
    } else {
      // 入場：上から降りてきて揺れる
      setRopeAnimating(true);
      controls.start({
        opacity: 1,
        rotateZ: 0,
        translateY: 0,
        transition: {
          delay,
          duration: 0.9,
          ease: [0.34, 1.56, 0.64, 1], // swing easing
        },
      });

      // 入場アニメーション終了後、紐の揺れを停止
      const stopRopeAnimation = setTimeout(() => {
        setRopeAnimating(false);
      }, (delay + 2.5) * 1000);

      return () => clearTimeout(stopRopeAnimation);
    }
  }, [isExiting, controls, ropeControls, delay]);

  // SVGで直線の紐を描画（アニメーション時のみ少し動く）
  const renderRope = (side: 'left' | 'right') => {
    const xOffset = side === 'left' ? 20 : 80;
    const gradientId = `ropeGradient-${side}-${uniqueId}`;

    return (
      <svg
        className={`rope-svg rope-svg-${side} ${ropeAnimating ? 'rope-swinging' : ''} ${ropeCut ? 'rope-cut-svg' : ''}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b7355" />
            <stop offset="50%" stopColor="#a08060" />
            <stop offset="100%" stopColor="#6b5344" />
          </linearGradient>
          <filter id={`shadow-${uniqueId}`}>
            <feDropShadow dx="0.5" dy="0" stdDeviation="0.5" floodOpacity="0.5" />
          </filter>
        </defs>
        {/* 紐の縁取り（視認性向上） */}
        <line
          x1={xOffset}
          y1="0"
          x2={xOffset}
          y2="100"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          className="rope-line-shadow"
        />
        <line
          x1={xOffset}
          y1="0"
          x2={xOffset}
          y2="100"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.2"
          strokeLinecap="round"
          className="rope-line"
        />
      </svg>
    );
  };

  return (
    <div className="hanging-frame-container">
      {/* 紐 - 画面上部から額縁まで（背面レイヤー） */}
      <motion.div
        className={`hanging-ropes-long ${exitType === 'pull-up' ? 'rope-pulling' : ''}`}
        animate={ropeControls}
        style={{ height: `${ropeLength}vh` }}
      >
        {renderRope('left')}
        {renderRope('right')}
      </motion.div>

      {/* 額縁本体 */}
      <motion.div
        className="hanging-frame-wrapper"
        initial={{ opacity: 0, rotateZ: -12, translateY: -80 }}
        animate={controls}
        style={{
          originX: 0.5,
          originY: 0,
        }}
      >
        {/* 額縁コンテンツ */}
        <div className="frame-content">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
