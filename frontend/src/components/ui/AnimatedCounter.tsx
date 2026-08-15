import React, { useState, useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 1.5,
  decimals = 0,
  className = '',
}) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const rafRef = useRef<number>(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    const startValue = countRef.current;
    const endValue = value;
    const totalMs = duration * 1000;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / totalMs, 1);
      
      // Ease out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      countRef.current = current;
      setCount(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        countRef.current = endValue;
        setCount(endValue);
      }
    };

    startTime.current = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formattedValue = decimals > 0
    ? count.toFixed(decimals)
    : Math.round(count).toLocaleString();

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

/* ─── Percentage Ring Counter ─── */
interface RingCounterProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export const RingCounter: React.FC<RingCounterProps> = ({
  value,
  size = 64,
  strokeWidth = 3,
  color = 'var(--primary)',
  className = '',
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className={`relative flex-none ${className}`} style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-[var(--text-secondary)]">
          <AnimatedCounter value={value} suffix="%" />
        </span>
      </div>
    </div>
  );
};
