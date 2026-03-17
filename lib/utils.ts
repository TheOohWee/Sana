import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  format,
  formatDistanceToNow,
  subDays,
  eachDayOfInterval,
} from 'date-fns';

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatMinutesLong(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hrs`;
  return `${hours} hrs ${minutes} min`;
}

export function formatTimerDisplay(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getDateRangeForPeriod(period: 'daily' | 'weekly' | 'monthly', date: Date = new Date()) {
  switch (period) {
    case 'daily':
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      };
    case 'weekly':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    case 'monthly':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
  }
}

export function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function getLast365Days(): Date[] {
  const today = new Date();
  return eachDayOfInterval({
    start: subDays(today, 364),
    end: today,
  });
}

export function getWeekNumber(date: Date): number {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const yearStart = new Date(start.getFullYear(), 0, 1);
  const diff = start.getTime() - yearStart.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Audio not available
  }
}

export function sendBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function requestNotificationPermission() {
  if (typeof window === 'undefined') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
