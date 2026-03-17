'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { POMODORO_DEFAULTS } from '@/lib/constants';
import { playNotificationSound, sendBrowserNotification } from '@/lib/utils';

type TimerState = 'idle' | 'running' | 'paused';
type SessionType = 'work' | 'break';

interface TimerConfig {
  workMinutes: number;
  breakMinutes: number;
}

interface TimerData {
  state: TimerState;
  sessionType: SessionType;
  remainingSeconds: number;
  sessionCount: number;
  config: TimerConfig;
  start: () => void;
  pause: () => void;
  reset: () => void;
  updateConfig: (config: Partial<TimerConfig>) => void;
}

const STORAGE_KEY = 'sana_timer_state';

interface StoredTimerState {
  startTimestamp: number;
  totalDuration: number;
  isRunning: boolean;
  sessionType: SessionType;
  sessionCount: number;
  config: TimerConfig;
}

function loadStoredState(): StoredTimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveState(state: StoredTimerState | null) {
  if (typeof window === 'undefined') return;
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useTimer(onComplete?: (sessionType: SessionType, durationMinutes: number) => void): TimerData {
  const [config, setConfig] = useState<TimerConfig>({
    workMinutes: POMODORO_DEFAULTS.workMinutes,
    breakMinutes: POMODORO_DEFAULTS.breakMinutes,
  });
  const [state, setState] = useState<TimerState>('idle');
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [remainingSeconds, setRemainingSeconds] = useState(config.workMinutes * 60);
  const [sessionCount, setSessionCount] = useState(1);

  const workerRef = useRef<Worker | null>(null);
  const startTimestampRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const sessionTypeRef = useRef(sessionType);
  sessionTypeRef.current = sessionType;
  const configRef = useRef(config);
  configRef.current = config;
  const sessionCountRef = useRef(sessionCount);
  sessionCountRef.current = sessionCount;

  useEffect(() => {
    workerRef.current = new Worker('/timer-worker.js');

    workerRef.current.onmessage = (e) => {
      const { type, remaining } = e.data;
      if (type === 'tick') {
        setRemainingSeconds(remaining);
      } else if (type === 'complete') {
        handleSessionComplete();
      }
    };

    const stored = loadStoredState();
    if (stored?.isRunning) {
      const elapsed = Date.now() - stored.startTimestamp;
      const remaining = stored.totalDuration - elapsed;
      if (remaining > 0) {
        setConfig(stored.config);
        configRef.current = stored.config;
        setSessionType(stored.sessionType);
        sessionTypeRef.current = stored.sessionType;
        setSessionCount(stored.sessionCount);
        sessionCountRef.current = stored.sessionCount;
        setState('running');
        startTimestampRef.current = stored.startTimestamp;
        totalDurationRef.current = stored.totalDuration;
        workerRef.current?.postMessage({
          type: 'start',
          payload: { startTimestamp: stored.startTimestamp, totalDuration: stored.totalDuration },
        });
      } else {
        saveState(null);
        handleSessionComplete();
      }
    }

    const handleVisibility = () => {
      if (!document.hidden && workerRef.current) {
        workerRef.current.postMessage({ type: 'sync' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      workerRef.current?.terminate();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSessionComplete = useCallback(() => {
    setState('idle');
    playNotificationSound();

    const currentType = sessionTypeRef.current;
    const cfg = configRef.current;
    const count = sessionCountRef.current;

    if (currentType === 'work') {
      sendBrowserNotification('Focus session complete!', 'Time for a break.');
      onCompleteRef.current?.('work', cfg.workMinutes);
      setSessionType('break');
      sessionTypeRef.current = 'break';
      setRemainingSeconds(cfg.breakMinutes * 60);
    } else {
      sendBrowserNotification('Break is over!', 'Ready for another round?');
      const newCount = count + 1;
      setSessionCount(newCount);
      sessionCountRef.current = newCount;
      setSessionType('work');
      sessionTypeRef.current = 'work';
      setRemainingSeconds(cfg.workMinutes * 60);
    }

    saveState(null);
  }, []);

  const start = useCallback(() => {
    const currentType = sessionTypeRef.current;
    const cfg = configRef.current;
    const duration = currentType === 'work'
      ? cfg.workMinutes * 60 * 1000
      : cfg.breakMinutes * 60 * 1000;

    if (state === 'paused') {
      const newTimestamp = Date.now() - (totalDurationRef.current - remainingSeconds * 1000);
      startTimestampRef.current = newTimestamp;
    } else {
      startTimestampRef.current = Date.now();
      totalDurationRef.current = duration;
    }

    setState('running');
    workerRef.current?.postMessage({
      type: 'start',
      payload: {
        startTimestamp: startTimestampRef.current,
        totalDuration: totalDurationRef.current || duration,
      },
    });

    saveState({
      startTimestamp: startTimestampRef.current,
      totalDuration: totalDurationRef.current || duration,
      isRunning: true,
      sessionType: currentType,
      sessionCount: sessionCountRef.current,
      config: cfg,
    });
  }, [state, remainingSeconds]);

  const pause = useCallback(() => {
    setState('paused');
    workerRef.current?.postMessage({ type: 'stop' });
    saveState(null);
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    workerRef.current?.postMessage({ type: 'stop' });
    const cfg = configRef.current;
    setSessionType('work');
    sessionTypeRef.current = 'work';
    setSessionCount(1);
    sessionCountRef.current = 1;
    setRemainingSeconds(cfg.workMinutes * 60);
    saveState(null);
  }, []);

  const updateConfig = useCallback((updates: Partial<TimerConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      configRef.current = next;
      if (state === 'idle') {
        const newSeconds = sessionTypeRef.current === 'work'
          ? next.workMinutes * 60
          : next.breakMinutes * 60;
        setRemainingSeconds(newSeconds);
      }
      return next;
    });
  }, [state]);

  return {
    state,
    sessionType,
    remainingSeconds,
    sessionCount,
    config,
    start,
    pause,
    reset,
    updateConfig,
  };
}
