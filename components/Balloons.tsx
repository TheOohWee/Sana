'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#22C55E', '#4ADE80', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6', '#FFD700'];
const SHAPES = ['square', 'circle', 'strip'] as const;

interface Particle {
  id: number;
  x: number;
  color: string;
  shape: typeof SHAPES[number];
  size: number;
  duration: number;
  delay: number;
  drift: number;
  rotation: number;
  rotationSpeed: number;
}

export function Balloons({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      size: 4 + Math.random() * 6,
      duration: 1.8 + Math.random() * 2,
      delay: Math.random() * 0.4,
      drift: -60 + Math.random() * 120,
      rotation: Math.random() * 360,
      rotationSpeed: 200 + Math.random() * 600,
    }));

    setParticles(newParticles);

    const timeout = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 3500);

    return () => clearTimeout(timeout);
  }, [show, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
      {particles.map((p) => {
        const shapeStyle: React.CSSProperties =
          p.shape === 'circle'
            ? { width: p.size, height: p.size, borderRadius: '50%' }
            : p.shape === 'strip'
            ? { width: p.size * 0.4, height: p.size * 2.5, borderRadius: 2 }
            : { width: p.size, height: p.size, borderRadius: 1 };

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: '-10px',
              ...shapeStyle,
              backgroundColor: p.color,
              opacity: 0.9,
              animation: `confetti-fall ${p.duration}s cubic-bezier(.2,.8,.4,1) ${p.delay}s forwards`,
              ['--drift' as string]: `${p.drift}px`,
              ['--rotation' as string]: `${p.rotationSpeed}deg`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          />
        );
      })}

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift), 100vh, 0) rotate(var(--rotation)) scale(0.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
