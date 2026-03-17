export const APP_NAME = 'Sana';
export const APP_TAGLINE = 'Focus together. Compete. Grow.';

export const COLORS = {
  bgPrimary: '#0A0A0B',
  bgSecondary: '#121214',
  bgTertiary: '#1A1A1E',
  border: '#2A2A2E',
  borderHover: '#3A3A3E',
  textPrimary: '#FAFAFA',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',
  accent: '#6C63FF',
  accentHover: '#7B73FF',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  crownGold: '#FFD700',
} as const;

export const POMODORO_DEFAULTS = {
  workMinutes: 25,
  breakMinutes: 5,
  sessionsPerRound: 4,
} as const;

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const HEATMAP_COLORS = [
  '#1A1A1E',
  '#134e2a',
  '#16653a',
  '#22C55E',
  '#4ADE80',
] as const;
