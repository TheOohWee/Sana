'use client';

import { useState } from 'react';
import { Plus, Minus, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './ui/Toast';

interface ManualTimeEntryProps {
  onLogTime: (entry: {
    duration_minutes: number;
    source: 'pomodoro' | 'manual';
    category?: string;
    note?: string;
    party_id?: string | null;
  }) => Promise<{ data: unknown; error: unknown } | null | undefined>;
  partyId?: string;
  compact?: boolean;
}

export function ManualTimeEntry({ onLogTime, partyId, compact }: ManualTimeEntryProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) {
      toast('Please enter a valid duration', 'error');
      return;
    }

    setLoading(true);
    const result = await onLogTime({
      duration_minutes: totalMinutes,
      source: 'manual',
      category,
      note,
      party_id: partyId || null,
    });

    if (result?.error) {
      const err = result.error as { message?: string };
      toast(`Failed to log time: ${err.message || 'Unknown error'}`, 'error');
    } else {
      setHours(0);
      setMinutes(30);
      setCategory('');
      setNote('');
    }
    setLoading(false);
  }

  function stepper(value: number, setter: (v: number) => void, min: number, max: number, step: number) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setter(Math.max(min, value - step))}
          className="p-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-border-default transition-colors cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => setter(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
          className="w-14 text-center rounded-lg border border-border-default bg-bg-secondary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <button
          type="button"
          onClick={() => setter(Math.min(max, value + step))}
          className="p-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-border-default transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!compact && (
        <div className="flex items-center gap-2 text-text-secondary mb-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Log Time Manually</span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Hours</label>
          {stepper(hours, setHours, 0, 23, 1)}
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Minutes</label>
          {stepper(minutes, setMinutes, 0, 59, 5)}
        </div>
        <div className="flex-1 min-w-[140px]">
          <Input
            placeholder="Category (e.g. studying)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[180px]">
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button type="submit" loading={loading} disabled={hours === 0 && minutes === 0}>
          Log Time
        </Button>
      </div>
    </form>
  );
}
