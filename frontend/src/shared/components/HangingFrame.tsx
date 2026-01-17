import React, { ReactNode, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './HangingFrame.css';

interface HangingFrameProps {
  children: ReactNode;
  delay?: number;
  isExiting?: boolean;
  /** 紐の長さ（vh単位）- フレームの位置に応じて調整 */
  ropeLength?: number;
}

/**
 * 美術館風の吊り下げ額縁コンポーネント
 * 紐で吊るされた絵画のように、ページ遷移時に
 * - 入場：上から落ちてきて振り子のように揺れて止まる
 * - 退場：紐が切れて、重力で下に落ちる
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

  useEffect(() => {
    if (isExiting) {
      // 退場：紐が切れて重力で落下
      const exitSequence = async () => {
        // 紐を切る
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
          rotateZ: Math.random() > 0.5 ? 25 : -25, // ランダムな方向に回転
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
      // 入場：上から降りてきて揺れる
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
    }
  }, [isExiting, controls, ropeControls, delay]);

  return (
    <div className="hanging-frame-container">
      {/* 紐 - 画面上部から額縁まで（背面レイヤー） */}
      <motion.div
        className="hanging-ropes-long"
        animate={ropeControls}
        style={{ height: `${ropeLength}vh` }}
      >
        <div className={`rope-long rope-long-left ${ropeCut ? 'rope-cut' : ''}`} />
        <div className={`rope-long rope-long-right ${ropeCut ? 'rope-cut' : ''}`} />
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
