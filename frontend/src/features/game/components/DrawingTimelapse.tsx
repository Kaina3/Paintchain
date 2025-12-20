import { useRef, useState, useEffect, useCallback } from 'react';
import type { DrawingStroke } from '@/shared/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/shared/components/Canvas';

interface DrawingTimelapseProps {
  strokes: DrawingStroke[];
  finalImage: string;
  maxWidth?: number;
  maxHeight?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
}

// 固定の再生速度（ストローク数に応じて調整）
const getPlaybackDelay = (totalStrokes: number): number => {
  if (totalStrokes <= 10) return 80;
  if (totalStrokes <= 30) return 50;
  if (totalStrokes <= 60) return 30;
  return 20;
};

export function DrawingTimelapse({
  strokes,
  finalImage,
  maxWidth = 300,
  maxHeight = 225,
  autoPlay = true,
  onComplete,
}: DrawingTimelapseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // autoPlayがtrueの場合、最初はキャンバス表示（再生準備中）
  // autoPlayがfalseの場合、最初から完成画像を表示
  const [showFinalImage, setShowFinalImage] = useState(!autoPlay);
  const animationRef = useRef<number | null>(null);
  const abortRef = useRef(false);
  const hasAutoPlayedRef = useRef(false);

  // スケール計算
  const scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT);
  const scaledWidth = CANVAS_WIDTH * scale;
  const scaledHeight = CANVAS_HEIGHT * scale;

  // キャンバスを白で初期化
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  // 単一ストロークを描画
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: DrawingStroke) => {
    ctx.save();
    ctx.globalAlpha = stroke.opacity / 100;

    switch (stroke.tool) {
      case 'brush':
      case 'eraser': {
        if (!stroke.points || stroke.points.length === 0) break;
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        break;
      }

      case 'line': {
        if (!stroke.points || stroke.points.length < 2) break;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        break;
      }

      case 'bucket': {
        if (!stroke.fillPoint) break;
        // バケツツールは単純化して、点に小さな円を描画
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(stroke.fillPoint.x, stroke.fillPoint.y, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'stamp': {
        if (!stroke.stampBounds || !stroke.stampShape) break;
        const { x, y, width, height } = stroke.stampBounds;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        ctx.fillStyle = stroke.color;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        switch (stroke.stampShape) {
          case 'circle': {
            const radius = Math.min(width, height) / 2;
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            break;
          }
          case 'ellipse':
            ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
            break;
          case 'square': {
            const size = Math.min(width, height);
            ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
            break;
          }
          case 'rectangle':
            ctx.rect(x, y, width, height);
            break;
          case 'triangle':
            ctx.moveTo(centerX, y);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.closePath();
            break;
          case 'star': {
            const spikes = 5;
            const outerRadius = Math.min(width, height) / 2;
            const innerRadius = outerRadius * 0.4;
            let rot = (Math.PI / 2) * 3;
            const step = Math.PI / spikes;
            ctx.moveTo(centerX, centerY - outerRadius);
            for (let i = 0; i < spikes; i++) {
              ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius);
              rot += step;
              ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius);
              rot += step;
            }
            ctx.closePath();
            break;
          }
          case 'heart': {
            const heartWidth = width / 2;
            const heartHeight = height / 2;
            const topCurveHeight = heartHeight * 0.3;
            ctx.moveTo(centerX, centerY + heartHeight * 0.3);
            ctx.bezierCurveTo(
              centerX, centerY - topCurveHeight,
              centerX - heartWidth, centerY - topCurveHeight,
              centerX - heartWidth, centerY + topCurveHeight
            );
            ctx.bezierCurveTo(
              centerX - heartWidth, centerY + heartHeight * 0.6,
              centerX, centerY + heartHeight * 0.8,
              centerX, centerY + heartHeight
            );
            ctx.bezierCurveTo(
              centerX, centerY + heartHeight * 0.8,
              centerX + heartWidth, centerY + heartHeight * 0.6,
              centerX + heartWidth, centerY + topCurveHeight
            );
            ctx.bezierCurveTo(
              centerX + heartWidth, centerY - topCurveHeight,
              centerX, centerY - topCurveHeight,
              centerX, centerY + heartHeight * 0.3
            );
            break;
          }
        }

        if (stroke.fillStamp) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;
      }
    }

    ctx.restore();
  }, []);

  // タイムラプス再生
  const playTimelapse = useCallback(async () => {
    if (strokes.length === 0) return;

    setIsPlaying(true);
    setShowFinalImage(false);
    abortRef.current = false;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    initCanvas();

    const delay = getPlaybackDelay(strokes.length);

    for (let i = 0; i < strokes.length; i++) {
      if (abortRef.current) break;

      drawStroke(ctx, strokes[i]);

      await new Promise<void>((resolve) => {
        animationRef.current = window.setTimeout(() => {
          resolve();
        }, delay) as unknown as number;
      });
    }

    setIsPlaying(false);
    setShowFinalImage(true);
    onComplete?.();
  }, [strokes, initCanvas, drawStroke, onComplete]);

  // 自動再生
  // React 18 StrictMode(dev) では effect が「実行→cleanup→再実行」と2回走るため、
  // cleanupでタイマーが消えても2回目で再スケジュールされるように、
  // hasAutoPlayedRef は“タイマーが発火した瞬間”に立てる。
  useEffect(() => {
    if (!autoPlay) return;
    if (strokes.length === 0) return;
    if (hasAutoPlayedRef.current) return;

    const timer = window.setTimeout(() => {
      if (hasAutoPlayedRef.current) return;
      hasAutoPlayedRef.current = true;
      playTimelapse();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [autoPlay, strokes.length, playTimelapse]);

  // 初期化
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  // 画像クリックで再生
  const handleClick = () => {
    if (!isPlaying && showFinalImage) {
      playTimelapse();
    }
  };

  // ストローク履歴がない場合は完成画像のみ表示
  if (strokes.length === 0) {
    return (
      <div 
        className="overflow-hidden rounded-lg border-2 border-gray-200 bg-white shadow-lg"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <img 
          src={finalImage} 
          alt="drawing" 
          style={{ width: scaledWidth, height: scaledHeight }}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div 
      className="cursor-pointer"
      onClick={handleClick}
    >
      <div 
        className="overflow-hidden rounded-lg border-2 border-gray-200 bg-white shadow-lg"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        {/* 再生中または待機中はキャンバスを表示 */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: scaledWidth,
            height: scaledHeight,
            display: showFinalImage && !isPlaying ? 'none' : 'block',
          }}
        />
        {/* 再生完了後は完成画像を表示 */}
        {showFinalImage && !isPlaying && (
          <img 
            src={finalImage} 
            alt="drawing" 
            style={{ width: scaledWidth, height: scaledHeight }}
            className="object-contain"
          />
        )}
      </div>
    </div>
  );
}
