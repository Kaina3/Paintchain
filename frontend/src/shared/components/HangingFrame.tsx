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

const EXIT_DURATION = 0.8;
const ENTER_ROPE_SHOW_DELAY_MS = 180;

function getSharedExitType(): ExitType {
  const now = Date.now();
  if (sharedExitType && now - sharedExitTimestamp < SHARED_EXIT_WINDOW) {
    return sharedExitType;
  }

  const r = Math.random();
  if (r < 0.1) sharedExitType = 'carry-off';
  else if (r < 0.6) sharedExitType = 'pull-up';
  else sharedExitType = 'drop-down';

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
          {/* Artist 1 - The quirky one */}
          <g transform="translate(20, 20)">
            <ellipse cx="15" cy="15" rx="8" ry="9" fill="#f0d0b0" /> {/* Face */}
            <path d="M5,10 C5,0 25,0 25,10 Z" fill="#2c5282" /> {/* Hat base */}
            <path d="M25,10 C30,12 30,5 25,4 L15,0" stroke="#2c5282" strokeWidth="2" fill="none" /> {/* Hat tail */}
            <rect x="10" y="24" width="10" height="20" rx="2" fill="#4a5568" /> {/* Body */}
            <path d="M10,44 L6,58 M20,44 L24,58" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" /> {/* Legs */}
            <path d="M9,28 L-2,38 M21,28 L32,38" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" /> {/* Arms */}
            <rect x="-4" y="32" width="6" height="8" transform="rotate(-15 -1 36)" fill="#8B4513" /> {/* Palette */}
            {/* Scarf */}
            <path d="M12,24 Q15,28 18,24" stroke="#c53030" strokeWidth="2" fill="none" />
            <path d="M18,24 L20,30" stroke="#c53030" strokeWidth="2" />
          </g>

          {/* Artist 2 - The Leader (Beret & Mustache) */}
          <g transform="translate(60, 10)">
            <ellipse cx="15" cy="15" rx="9" ry="10" fill="#eac0a0" />
            {/* Beret */}
            <path d="M4,12 Q15,-6 26,12 L4,12 Z" fill="#742a2a" />
            <rect x="23" y="2" width="4" height="6" fill="#742a2a" transform="rotate(20 23 2)" />
            {/* Mustache */}
            <path d="M11,18 Q15,16 19,18 Q22,17 19,19 Q15,22 11,19 Q8,17 11,18" fill="#333" />
            <rect x="9" y="25" width="12" height="24" rx="2" fill="#2d3748" /> {/* Body */}
            <path d="M12,49 L8,65 M18,49 L22,65" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M9,28 L-5,22 M21,28 L35,22" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Holding frame with effort */}
          </g>

          {/* Artist 3 - The Strong One carrying paint buckets sometimes? Or just strong. */}
          <g transform="translate(100, 20)">
            <circle cx="15" cy="15" r="8" fill="#f0d0b0" />
            {/* Bandana */}
            <path d="M5,10 Q15,6 25,10 L25,7 Q15,3 5,7 Z" fill="#2f855a" />
            <circle cx="26" cy="9" r="2" fill="#2f855a" /> {/* Knot */}

            <rect x="8" y="23" width="14" height="22" rx="3" fill="#38a169" /> {/* Body */}
            <path d="M11,45 L7,60 M19,45 L23,60" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M8,28 L-4,35 M22,28 L34,35" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            <rect x="30" y="32" width="6" height="10" fill="#ccc" stroke="#666" strokeWidth="1" /> {/* Brush handle */}
            <rect x="30" y="26" width="6" height="6" fill="#d69e2e" /> {/* Brush Tip */}
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
