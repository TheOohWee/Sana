'use client';

import { useState } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/components/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDateForDB } from '@/lib/utils';
import { Plus, Check, Trash2, Flame } from 'lucide-react';

const HABIT_ICONS = ['🎯', '📚', '💪', '🧘', '💧', '🏃', '✍️', '🎨', '🎵', '💻', '🌅', '😴'];
const HABIT_COLORS = ['#6C63FF', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6', '#F97316'];

function getLast7Days(): { date: string; label: string; isToday: boolean }[] {
  const days = [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: formatDateForDB(d),
      label: dayLabels[d.getDay()],
      isToday: i === 0,
    });
  }
  return days;
}

export default function HabitsPage() {
  const { loading: authLoading } = useAuth();
  const { habits, entries, loading, addHabit, deleteHabit, toggleEntry } = useHabits();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🎯');
  const [newColor, setNewColor] = useState('#6C63FF');
  const [creating, setCreating] = useState(false);

  const days = getLast7Days();

  function getCompletionForDay(habitId: string, date: string) {
    return entries.some(e => e.habit_id === habitId && e.date === date);
  }

  function getStreak(habitId: string): number {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDateForDB(d);
      if (entries.some(e => e.habit_id === habitId && e.date === dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      } else {
        // today not completed yet, check yesterday
        continue;
      }
    }
    return streak;
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await addHabit({
      name: newName.trim(),
      icon: newIcon,
      color: newColor,
      frequency: 'daily',
      target_count: 1,
    });
    if (result?.data) {
      toast('Habit created!', 'success');
      setShowCreate(false);
      setNewName('');
      setNewIcon('🎯');
      setNewColor('#6C63FF');
    } else {
      toast('Failed to create habit', 'error');
    }
    setCreating(false);
  }

  const completedToday = habits.filter(h => getCompletionForDay(h.id, formatDateForDB(new Date()))).length;
  const totalRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Habits</h1>
          <p className="text-sm text-text-muted mt-1">Build consistency, one day at a time</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus className="h-4 w-4" />} size="sm">
          New Habit
        </Button>
      </div>

      {/* Today's summary */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Today</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-text-primary mt-1">
              {completedToday}<span className="text-text-muted text-lg">/{habits.length}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" className="text-bg-tertiary" />
                <circle
                  cx="28" cy="28" r="24" fill="none"
                  stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${(totalRate / 100) * 150.8} 150.8`}
                  strokeLinecap="round"
                  className="text-accent transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-text-primary">
                {totalRate}%
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Habit list */}
      {habits.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-text-secondary font-medium">No habits yet</p>
          <p className="text-sm text-text-muted mt-1">Create your first habit to start building streaks</p>
          <Button onClick={() => setShowCreate(true)} className="mt-4" size="sm" variant="secondary">
            Create a Habit
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const streak = getStreak(habit.id);
            return (
              <Card key={habit.id} className="p-0">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{habit.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{habit.name}</p>
                      {streak > 0 && (
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                          <Flame className="h-3 w-3 text-orange-400" />
                          {streak} day streak
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Weekly grid */}
                <div className="px-4 pb-4 grid grid-cols-7 gap-1.5">
                  {days.map((day) => {
                    const completed = getCompletionForDay(habit.id, day.date);
                    return (
                      <button
                        key={day.date}
                        onClick={() => toggleEntry(habit.id, day.date)}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <span className={`text-[10px] ${day.isToday ? 'text-accent font-semibold' : 'text-text-muted'}`}>
                          {day.label}
                        </span>
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            completed
                              ? 'scale-100'
                              : 'bg-bg-tertiary border border-border-default group-hover:border-border-hover'
                          }`}
                          style={completed ? { backgroundColor: habit.color + '20', borderColor: habit.color + '40', border: '1px solid' } : {}}
                        >
                          {completed && <Check className="h-4 w-4" style={{ color: habit.color }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create habit modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Habit">
        <div className="space-y-4">
          <Input
            label="Habit name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g., Read 30 minutes"
            maxLength={50}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                    newIcon === icon ? 'bg-accent/20 ring-2 ring-accent scale-110' : 'bg-bg-tertiary hover:bg-border-default'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
            <div className="flex gap-2">
              {HABIT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded-full transition-all cursor-pointer ${
                    newColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-primary scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} loading={creating} className="w-full" size="lg">
            Create Habit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
