import { useState, useEffect, useRef, useCallback } from 'react';

// 絵の具の飛沫の型定義
interface PaintSplash {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  rotation: number;
  scale: number;
  type: 'splash' | 'drip' | 'splatter';
}

// 絵の具の色パレット
const PAINT_COLORS = [
  '#FF6B6B', // 赤
  '#4ECDC4', // ターコイズ
  '#FFE66D', // 黄色
  '#95E1D3', // ミント
  '#F38181', // コーラル
  '#AA96DA', // ラベンダー
  '#FCBAD3', // ピンク
  '#A8D8EA', // 水色
  '#FF9F43', // オレンジ
  '#5F27CD', // 紫
];

// 絵の具飛沫コンポーネント
export function PaintSplashOverlay() {
  const [splashes, setSplashes] = useState<PaintSplash[]>([]);
  const idCounter = useRef(0);

  const createSplash = useCallback(() => {
    const newSplash: PaintSplash = {
      id: idCounter.current++,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 30 + Math.random() * 80,
      color: PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)],
      opacity: 0.4 + Math.random() * 0.3,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      type: ['splash', 'drip', 'splatter'][Math.floor(Math.random() * 3)] as PaintSplash['type'],
    };
    return newSplash;
  }, []);

  useEffect(() => {
    // 初期の飛沫を生成
    const initialSplashes = Array.from({ length: 5 }, () => createSplash());
    setSplashes(initialSplashes);

    // 定期的に新しい飛沫を追加
    const interval = setInterval(() => {
      setSplashes((prev) => {
        const newSplash = createSplash();
        // 古い飛沫を削除し、新しいものを追加（最大15個）
        const updated = [...prev, newSplash].slice(-15);
        return updated;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [createSplash]);

  // 飛沫をフェードアウトさせる
  useEffect(() => {
    const fadeInterval = setInterval(() => {
      setSplashes((prev) =>
        prev
          .map((s) => ({ ...s, opacity: s.opacity - 0.02 }))
          .filter((s) => s.opacity > 0)
      );
    }, 100);

    return () => clearInterval(fadeInterval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {splashes.map((splash) => (
        <div
          key={splash.id}
          className="absolute transition-all duration-500 ease-out"
          style={{
            left: `${splash.x}%`,
            top: `${splash.y}%`,
            transform: `rotate(${splash.rotation}deg) scale(${splash.scale})`,
            opacity: splash.opacity,
          }}
        >
          {splash.type === 'splash' && (
            <svg
              width={splash.size}
              height={splash.size}
              viewBox="0 0 100 100"
              fill={splash.color}
            >
              <path d="M50 10 C60 25, 80 30, 90 50 C80 70, 60 75, 50 90 C40 75, 20 70, 10 50 C20 30, 40 25, 50 10Z" />
              <circle cx="30" cy="20" r="8" />
              <circle cx="75" cy="25" r="6" />
              <circle cx="80" cy="70" r="7" />
              <circle cx="25" cy="75" r="5" />
            </svg>
          )}
          {splash.type === 'drip' && (
            <svg
              width={splash.size * 0.6}
              height={splash.size}
              viewBox="0 0 60 100"
              fill={splash.color}
            >
              <ellipse cx="30" cy="30" rx="25" ry="20" />
              <path d="M20 35 Q15 60, 25 85 Q30 95, 35 85 Q45 60, 40 35" />
              <circle cx="15" cy="20" r="5" />
              <circle cx="45" cy="25" r="4" />
            </svg>
          )}
          {splash.type === 'splatter' && (
            <svg
              width={splash.size}
              height={splash.size}
              viewBox="0 0 100 100"
              fill={splash.color}
            >
              <circle cx="50" cy="50" r="20" />
              <ellipse cx="25" cy="35" rx="12" ry="8" />
              <ellipse cx="75" cy="40" rx="10" ry="6" />
              <ellipse cx="35" cy="70" rx="8" ry="10" />
              <ellipse cx="70" cy="65" rx="9" ry="7" />
              <circle cx="20" cy="55" r="6" />
              <circle cx="80" cy="55" r="5" />
              <circle cx="45" cy="25" r="7" />
              <circle cx="60" cy="80" r="6" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
