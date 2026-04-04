import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_DISTANCE_FALLBACK = 1600;

export function useDanmakuMotion(speedPxPerSec = 120) {
  const ref = useRef<HTMLDivElement>(null);
  const [travelDistancePx, setTravelDistancePx] = useState(DEFAULT_DISTANCE_FALLBACK);

  useEffect(() => {
    const updateDistance = () => {
      const viewportWidth = window.innerWidth || 1280;
      const itemWidth = ref.current?.offsetWidth ?? 320;
      setTravelDistancePx(viewportWidth + itemWidth);
    };

    updateDistance();
    window.addEventListener('resize', updateDistance);
    return () => window.removeEventListener('resize', updateDistance);
  }, []);

  const motionStyle = useMemo(() => {
    const durationMs = Math.max(5000, (travelDistancePx / speedPxPerSec) * 1000);
    return {
      animationDuration: `${durationMs}ms`,
      ['--danmaku-travel-x' as string]: `${travelDistancePx}px`,
    } as React.CSSProperties;
  }, [travelDistancePx, speedPxPerSec]);

  return { ref, motionStyle };
}
