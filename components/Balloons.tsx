'use client';

import { useEffect, useState } from 'react';

const BALLOON_COLORS = [
  '#6C63FF', '#7B73FF', '#22C55E', '#4ADE80',
  '#F59E0B', '#FBBF24', '#EF4444', '#FB7185',
  '#8B5CF6', '#A78BFA', '#06B6D4', '#67E8F9',
];

interface Balloon {
  id: number;
  x: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
  wobble: number;
}

export function Balloons({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  const [balloons, setBalloons] = useState<Balloon[]>([]);

  useEffect(() => {
    if (!show) {
      setBalloons([]);
      return;
    }

    const newBalloons: Balloon[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
      size: 22 + Math.random() * 28,
      duration: 2.6 + Math.random() * 2.2,
      delay: Math.random() * 0.35,
      wobble: -18 + Math.random() * 36,
    }));

    setBalloons(newBalloons);

    const timeout = setTimeout(() => {
      setBalloons([]);
      onComplete?.();
    }, 5200);

    return () => clearTimeout(timeout);
  }, [show, onComplete]);

  if (balloons.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      {balloons.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: `${b.x}%`,
            bottom: '-60px',
            animation: `balloon-rise ${b.duration}s cubic-bezier(.16,1,.3,1) ${b.delay}s forwards`,
          }}
        >
          {/* Balloon body */}
          <div
            style={{
              width: `${b.size}px`,
              height: `${b.size * 1.2}px`,
              background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), rgba(255,255,255,0) 45%), linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.12)), ${b.color}`,
              borderRadius: '50% 50% 46% 46% / 60% 60% 40% 40%',
              opacity: 0.92,
              filter: 'saturate(1.05)',
              boxShadow: '0 6px 22px rgba(0,0,0,0.35)',
              animation: `balloon-wobble ${0.8 + Math.random() * 0.6}s ease-in-out ${b.delay}s infinite alternate`,
            }}
          />
          {/* Knot */}
          <div
            style={{
              width: '8px',
              height: '6px',
              backgroundColor: b.color,
              opacity: 0.7,
              borderRadius: '0 0 8px 8px',
              margin: '-2px auto 0',
              transform: 'rotate(45deg)',
            }}
          />
          {/* String */}
          <div
            style={{
              width: '1px',
              height: `${b.size * 0.6}px`,
              backgroundColor: b.color,
              opacity: 0.4,
              margin: '0 auto',
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes balloon-rise {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.98);
            opacity: 1;
          }
          25% {
            transform: translate3d(-10px, -30vh, 0) rotate(-3deg) scale(1);
          }
          55% {
            transform: translate3d(12px, -65vh, 0) rotate(4deg) scale(1.01);
          }
          75% {
            opacity: 1;
          }
          100% {
            transform: translate3d(${Math.random() > 0.5 ? '' : '-'}18px, -120vh, 0) rotate(${Math.random() > 0.5 ? '' : '-'}10deg) scale(1.02);
            opacity: 0;
          }
        }
        @keyframes balloon-wobble {
          0% { transform: translate3d(-6px, 0, 0) rotate(-4deg); }
          100% { transform: translate3d(6px, 0, 0) rotate(4deg); }
        }
      `}</style>
    </div>
  );
}
