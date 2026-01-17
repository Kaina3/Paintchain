import React, { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, MotionValue, animate } from 'framer-motion';
import './HangingFrame.css';

interface HangingFrameProps {
  children: ReactNode;
  delay?: number;
  isExiting?: boolean;
  ropeLength?: number;
}

type ExitType = 'pull-up' | 'drop-down' | 'carry-off';

let sharedExitType: ExitType | null = null;
let sharedExitTimestamp = 0;
const SHARED_EXIT_WINDOW = 100;

const EXITTYPE_PROBABILITY = 0.5; // used for split between pull/drop previously
const EXIT_DURATION = 0.8;
const ENTER_ROPE_SHOW_DELAY_MS = 180;

function getSharedExitType(): ExitType {
  const now = Date.now();
  if (sharedExitType && now - sharedExitTimestamp < SHARED_EXIT_WINDOW) {
    return sharedExitType;
  }

  const r = Math.random();
  if (r < 0.33) sharedExitType = 'pull-up';
  else if (r < 0.66) sharedExitType = 'drop-down';
  else sharedExitType = 'carry-off';

  sharedExitTimestamp = now;
  return sharedExitType;
}

const ROPE_COORDS = {
  leftAnchorX: 20,
  rightAnchorX: 80,
  hookBaseY: 0,
  leftHookBaseX: 20,
  rightHookBaseX: 80,
  centerX: 50,
} as const;

function computeHookPosition(hookBaseX: number, currentY: number, currentRotate: number) {
  const rad = (currentRotate * Math.PI) / 180;
  const dx = hookBaseX - ROPE_COORDS.centerX;
  const dy = ROPE_COORDS.hookBaseY;

  const hookX = ROPE_COORDS.centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
  const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);
  const hookY = rotatedY + currentY;

  return { hookX, hookY };
}

const Rope = ({
  y,
  rotate,
  isCut,
  cutLengths,
  anchorY,
  uniqueId,
  opacity
}: {
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  isCut: boolean;
  cutLengths: { left: number; right: number } | null;
  anchorY: number;
  uniqueId: string;
  opacity: MotionValue<number>;
}) => {
  const buildRopePath = (
    anchorX: number,
    hookBaseX: number,
    currentY: number,
    currentRotate: number,
    cutLength: number | null
  ) => {
    const { hookX, hookY } = computeHookPosition(hookBaseX, currentY, currentRotate);

    if (isCut) {
      const length = cutLength ?? 0;
      return `M ${hookX} ${hookY} L ${hookX} ${hookY + length}`;
    }

    return `M ${anchorX} ${anchorY} L ${hookX} ${hookY}`;
  };

  const leftRopePath = useTransform([y, rotate], (values: number[]) => {
    const [currentY, currentRotate] = values;
    return buildRopePath(
      ROPE_COORDS.leftAnchorX,
      ROPE_COORDS.leftHookBaseX,
      currentY,
      currentRotate,
      cutLengths?.left ?? null
    );
  });

  const rightRopePath = useTransform([y, rotate], (values: number[]) => {
    const [currentY, currentRotate] = values;
    return buildRopePath(
      ROPE_COORDS.rightAnchorX,
      ROPE_COORDS.rightHookBaseX,
      currentY,
      currentRotate,
      cutLengths?.right ?? null
    );
  });

  return (
    <motion.svg
      className="rope-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ opacity }}
    >
      <defs>
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
      <g filter={`url(#rope-shadow-${uniqueId})`}>
        <motion.path
          d={leftRopePath}
          stroke="#6a5a4a"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <motion.path
          d={leftRopePath}
          stroke="rgba(139, 115, 85, 0.4)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{ transform: 'translateX(-0.5px)' }}
        />
      </g>
      <g filter={`url(#rope-shadow-${uniqueId})`}>
        <motion.path
          d={rightRopePath}
          stroke="#6a5a4a"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
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

const MiniArtists = ({
  x,
  opacity,
  bob
}: {
  x: MotionValue<number>;
  opacity: MotionValue<number>;
  bob: MotionValue<number>;
}) => {
  const y = useTransform(bob, [0, 1], [0, -5]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: -73,
        left: '50%',
        x,
        y: y,
        marginLeft: -75,
        width: 150,
        height: 80,
        opacity,
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      <svg viewBox="0 0 150 80" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="artist-shadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#artist-shadow)">
          {/* Artist 1 */}
          <g transform="translate(20, 20)">
            <path d="M5,10 Q15,-5 25,10 Z" fill="#333" />
            <circle cx="15" cy="15" r="8" fill="#f0d0b0" />
            <rect x="10" y="23" width="10" height="25" rx="3" fill="#4a5568" />
            <path d="M13,48 L8,68 M17,48 L22,68" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M10,30 L-2,40 M20,30 L32,40" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
          {/* Artist 2 (Leader) */}
          <g transform="translate(60, 12)">
            <path d="M5,10 Q15,-5 25,10 Z" fill="#702" />
            <circle cx="15" cy="15" r="8" fill="#f0d0b0" />
            <rect x="10" y="23" width="10" height="25" rx="3" fill="#742a2a" />
            <path d="M13,48 L8,68 M17,48 L22,68" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M10,30 L-2,20 M20,30 L32,20" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
          {/* Artist 3 */}
          <g transform="translate(100, 20)">
            <path d="M5,10 Q15,-5 25,10 Z" fill="#225" />
            <circle cx="15" cy="15" r="8" fill="#f0d0b0" />
            <rect x="10" y="23" width="10" height="25" rx="3" fill="#2c5282" />
            <path d="M13,48 L8,68 M17,48 L22,68" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M10,30 L-2,40 M20,30 L32,40" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </motion.div>
  );
};

export const HangingFrame: React.FC<HangingFrameProps> = ({
  children,
  delay = 0,
  isExiting = false,
  ropeLength = 50,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const y = useMotionValue(-100);
  const x = useMotionValue(0);
  const rotate = useMotionValue(0);
  const ropeOpacity = useMotionValue(0);
  const [ropeCut, setRopeCut] = useState(false);
  const [ropeMounted, setRopeMounted] = useState(false);
  const [cutLengths, setCutLengths] = useState<{ left: number; right: number } | null>(null);
  const [anchorY, setAnchorY] = useState(() => -(ropeLength / 2));

  // Artists animation values
  const artistsX = useMotionValue(0);
  const artistsOpacity = useMotionValue(0);
  const artistsBob = useMotionValue(0);

  const computeAnchorYVh = () => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper || window.innerHeight <= 0) return -(ropeLength / 2);

    const containerRect = container.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const wrappers = Array.from(document.querySelectorAll<HTMLElement>('.hanging-frame-wrapper'));

    let closestAboveBottomPx: number | null = null;
    for (const el of wrappers) {
      if (el === wrapper) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom <= wrapperRect.top - 1) {
        if (closestAboveBottomPx === null || r.bottom > closestAboveBottomPx) {
          closestAboveBottomPx = r.bottom;
        }
      }
    }

    const boundaryPx = closestAboveBottomPx ?? 0;
    return ((boundaryPx - containerRect.top) / window.innerHeight) * 100;
  };

  const computeCurrentRopeLengths = (anchor: number) => {
    const currentY = y.get();
    const currentRotate = rotate.get();

    const leftHook = computeHookPosition(ROPE_COORDS.leftHookBaseX, currentY, currentRotate);
    const rightHook = computeHookPosition(ROPE_COORDS.rightHookBaseX, currentY, currentRotate);

    return {
      left: Math.max(0, leftHook.hookY - anchor),
      right: Math.max(0, rightHook.hookY - anchor),
    };
  };

  useEffect(() => {
    if (!isExiting) {
      y.set(-100);
      rotate.set(-5 + Math.random() * 10);
      ropeOpacity.set(0);
      setRopeCut(false);
      setRopeMounted(false);
      setCutLengths(null);
      setAnchorY(computeAnchorYVh());

      const enterAnimation = async () => {
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

        await new Promise(r => setTimeout(r, ENTER_ROPE_SHOW_DELAY_MS));
        setRopeMounted(true);
        ropeOpacity.set(1);

        await Promise.all([controlsY, controlsRotate]);

        await new Promise(r => setTimeout(r, 100));
        animate(ropeOpacity, 0, {
          duration: 0.5,
          ease: "easeOut",
          onComplete: () => setRopeMounted(false),
        });
      };

      enterAnimation();
    } else {
      const currentExitType = getSharedExitType();

      if (currentExitType === 'carry-off') {
        setRopeMounted(false);
        ropeOpacity.set(0);
        artistsOpacity.set(1);

        const screenW = window.innerWidth;
        const startX = -((screenW / 2) + 200);
        const endX = (screenW / 2) + 200;

        artistsX.set(startX);

        const sequence = async () => {
          const bobCtrl = animate(artistsBob, 1, {
            repeat: Infinity, repeatType: "reverse", duration: 0.1, ease: "easeInOut"
          });

          await animate(artistsX, 0, { duration: 0.5, ease: "linear" });

          bobCtrl.stop();
          artistsBob.set(0);

          await new Promise(r => setTimeout(r, 150));
          animate(y, -5, { duration: 0.2 });
          animate(rotate, 2, { duration: 0.2 });

          const exitBob = animate(artistsBob, 1, {
            repeat: Infinity, repeatType: "reverse", duration: 0.1, ease: "easeInOut"
          });

          // Use slightly longer duration to match PageTransition 1.2s
          const exitDuration = 0.6;
          animate(x, endX, { duration: exitDuration, ease: "linear" });
          await animate(artistsX, endX, { duration: exitDuration, ease: "linear" });

          exitBob.stop();
        };
        sequence();

      } else {
        setRopeMounted(true);
        ropeOpacity.set(1);

        if (currentExitType === 'drop-down') {
          const nextAnchorY = computeAnchorYVh();
          setAnchorY(nextAnchorY);
          setCutLengths(computeCurrentRopeLengths(nextAnchorY));
          setRopeCut(true);
          animate(y, 120, { duration: EXIT_DURATION, ease: [0.55, 0, 1, 0.45] });
          animate(rotate, Math.random() > 0.5 ? 20 : -20, { duration: EXIT_DURATION });
        } else {
          animate(y, -120, { duration: EXIT_DURATION, ease: [0.4, 0, 0.6, 0.5] });
          animate(rotate, Math.random() > 0.5 ? 5 : -5, { duration: EXIT_DURATION });
        }

        animate(ropeOpacity, 0, {
          duration: EXIT_DURATION,
          ease: "easeOut",
          onComplete: () => setRopeMounted(false),
        });
      }
    }
  }, [isExiting, delay, ropeLength, y, rotate, ropeOpacity, x, artistsX, artistsOpacity, artistsBob]);

  const yVh = useTransform(y, value => `${value}vh`);

  return (
    <div ref={containerRef} className="hanging-frame-container">
      {ropeMounted && (
        <Rope
          y={y}
          rotate={rotate}
          isCut={ropeCut}
          cutLengths={cutLengths}
          anchorY={anchorY}
          uniqueId={uniqueId}
          opacity={ropeOpacity}
        />
      )}

      <motion.div
        className="hanging-frame-wrapper"
        ref={wrapperRef}
        style={{
          y: yVh,
          x,
          rotate: rotate,
          transformOrigin: "50% 0%"
        }}
      >
        <MiniArtists x={artistsX} opacity={artistsOpacity} bob={artistsBob} />
        <div className="frame-content">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
