import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/features/game/store/gameStore';
import { useRoomStore } from '@/features/room/store/roomStore';

interface TimerProps {
  onTimeout?: () => void;
}

export function Timer({ onTimeout }: TimerProps) {
  const { timeRemaining, deadline, phase } = useGameStore();
  const { room } = useRoomStore();
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const hasCalledTimeout = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  
  // 最新のonTimeoutを追跡
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Get total time for current phase
  const getTotalTime = useCallback(() => {
    if (!room?.settings || !phase) return 60;
    switch (phase) {
      case 'prompt':
        return room.settings.promptTimeSec;
      case 'drawing':
        return room.settings.drawingTimeSec;
      case 'guessing':
        return room.settings.guessTimeSec;
      default:
        return 60;
    }
  }, [room?.settings, phase]);

  const totalTime = getTotalTime();

  // Calculate remaining time based on deadline for accuracy
  const calculateRemaining = useCallback(() => {
    if (deadline) {
      return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 1000));
    }
    return timeRemaining;
  }, [deadline, timeRemaining]);

  // Initialize and sync with server time
  useEffect(() => {
    setDisplayTime(calculateRemaining());
    hasCalledTimeout.current = false;
  }, [calculateRemaining]);

  // Client-side countdown with deadline-based accuracy
  useEffect(() => {
    const tick = () => {
      const remaining = calculateRemaining();
      setDisplayTime(remaining);

      if (remaining <= 0 && !hasCalledTimeout.current) {
        hasCalledTimeout.current = true;
        onTimeoutRef.current?.();
      }
    };

    // Tick immediately
    tick();

    // Use shorter interval for more accurate display
    const interval = setInterval(tick, 250);

    return () => clearInterval(interval);
  }, [calculateRemaining]);

  // Calculate progress percentage (0-100)
  const progress = Math.max(0, Math.min(100, (displayTime / totalTime) * 100));

  // Determine color based on remaining time
  const isWarning = displayTime <= 10;
  const isCritical = displayTime <= 5;

  // Circle properties
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Color based on remaining time
  const getColor = () => {
    if (isCritical) return { stroke: '#dc2626', text: 'text-red-600', bg: 'bg-red-50' }; // red-600
    if (isWarning) return { stroke: '#f97316', text: 'text-orange-500', bg: 'bg-orange-50' }; // orange-500
    return { stroke: '#22c55e', text: 'text-green-600', bg: 'bg-green-50' }; // green-500
  };

  const colors = getColor();

  return (
    <div className={`flex items-center justify-center rounded-xl p-2 ${colors.bg} transition-colors duration-300`}>
      <div className="relative">
        <svg
          width={size}
          height={size}
          className={`transform -rotate-90 ${isCritical ? 'animate-pulse' : ''}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-200 ease-linear"
          />
        </svg>
        {/* Time display in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono text-xl font-bold ${colors.text} transition-colors duration-300`}>
            {displayTime}
          </span>
        </div>
      </div>
    </div>
  );
}
