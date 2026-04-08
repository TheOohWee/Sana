'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { useTimer } from '@/hooks/useTimer';
import { useToast } from './ui/Toast';
import { formatTimerDisplay, requestNotificationPermission, cn } from '@/lib/utils';

interface PomodoroTimerProps {
  onLogTime: (entry: {
    duration_minutes: number;
    source: 'pomodoro' | 'manual';
    category?: string;
  }) => Promise<{ data: unknown; error: unknown } | null | undefined>;
}

export function PomodoroTimer({ onLogTime }: PomodoroTimerProps) {
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [tempWork, setTempWork] = useState('25');
  const [tempBreak, setTempBreak] = useState('5');

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleComplete = async (sessionType: 'work' | 'break', durationMinutes: number) => {
    if (sessionType === 'work') {
      const result = await onLogTime({
        duration_minutes: durationMinutes,
        source: 'pomodoro',
        category: 'Focus session',
      });

      if (result?.error) {
        const err = result.error as { message?: string };
        toast(`Failed to log session: ${err.message || 'Unknown error'}`, 'error');
      }
    }
  };

  const timer = useTimer(handleComplete);

  function handleSaveSettings() {
    const work = Math.max(1, Math.min(120, parseInt(tempWork) || 25));
    const brk = Math.max(1, Math.min(60, parseInt(tempBreak) || 5));
    timer.updateConfig({ workMinutes: work, breakMinutes: brk });
    setShowSettings(false);
  }

  const progress =
    timer.state !== 'idle'
      ? 1 -
        timer.remainingSeconds /
          ((timer.sessionType === 'work'
            ? timer.config.workMinutes
            : timer.config.breakMinutes) * 60)
      : 0;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center py-8">
      <div className="flex items-center gap-2 mb-6">
        <span
          className={cn(
            'text-sm font-medium px-3 py-1 rounded-full',
            timer.sessionType === 'work'
              ? 'bg-accent/10 text-accent'
              : 'bg-success/10 text-success'
          )}
        >
          {timer.sessionType === 'work' ? 'Focus' : 'Break'}
        </span>
        <span className="text-xs text-text-muted">
          Session {timer.sessionCount} of 4
        </span>
        <button
          onClick={() => {
            setTempWork(String(timer.config.workMinutes));
            setTempBreak(String(timer.config.breakMinutes));
            setShowSettings(true);
          }}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="relative w-64 h-64 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
          <circle cx="128" cy="128" r="120" fill="none" stroke="#1A1A1E" strokeWidth="4" />
          {timer.state !== 'idle' && (
            <circle
              cx="128" cy="128" r="120" fill="none"
              stroke={timer.sessionType === 'work' ? '#6C63FF' : '#22C55E'}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-semibold tracking-wider tabular-nums text-text-primary">
            {formatTimerDisplay(timer.remainingSeconds)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {timer.state === 'running' ? (
          <Button onClick={timer.pause} variant="secondary" size="lg" icon={<Pause className="h-5 w-5" />}>
            Pause
          </Button>
        ) : (
          <Button onClick={timer.start} size="lg" icon={<Play className="h-5 w-5" />}>
            {timer.state === 'paused' ? 'Resume' : 'Start'}
          </Button>
        )}
        <Button onClick={timer.reset} variant="ghost" size="lg" icon={<RotateCcw className="h-4 w-4" />}>
          Reset
        </Button>
      </div>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Timer Settings">
        <div className="space-y-4">
          <Input label="Focus duration (minutes)" type="number" min="1" max="120" value={tempWork} onChange={(e) => setTempWork(e.target.value)} />
          <Input label="Break duration (minutes)" type="number" min="1" max="60" value={tempBreak} onChange={(e) => setTempBreak(e.target.value)} />
          <Button onClick={handleSaveSettings} className="w-full">Save</Button>
        </div>
      </Modal>
    </div>
  );
}
