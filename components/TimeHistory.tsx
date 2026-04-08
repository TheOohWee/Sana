'use client';

import { useState } from 'react';
import { Trash2, Clock, Timer } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import { useToast } from './ui/Toast';
import { formatMinutes, formatRelativeTime, formatDate, cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  user_id: string;
  party_id: string | null;
  duration_minutes: number;
  note: string;
  source: 'pomodoro' | 'manual';
  category: string;
  created_at: string;
  date: string;
}

interface TimeHistoryProps {
  entries: TimeEntry[];
  loading: boolean;
  onDelete: (id: string) => Promise<{ error: unknown }>;
}

export function TimeHistory({ entries, loading, onDelete }: TimeHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleDelete(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }

    setDeletingId(id);
    const result = await onDelete(id);
    if (result.error) {
      const err = result.error as { message?: string };
      toast(`Failed to delete: ${err.message || 'Unknown error'}`, 'error');
    } else {
      toast('Entry deleted', 'info');
    }
    setDeletingId(null);
    setConfirmId(null);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="text-center py-10">
        <Clock className="h-8 w-8 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-muted">No time entries yet</p>
        <p className="text-xs text-text-muted mt-1">Start a Pomodoro or log time manually</p>
      </Card>
    );
  }

  let lastDate = '';

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const entryDate = formatDate(entry.date);
        const showDateHeader = entryDate !== lastDate;
        lastDate = entryDate;

        return (
          <div key={entry.id}>
            {showDateHeader && (
              <p className="text-xs font-medium text-text-muted pt-3 pb-1.5 px-1">
                {entryDate}
              </p>
            )}
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors',
                'hover:bg-bg-tertiary'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-md',
                entry.source === 'pomodoro' ? 'bg-accent/10' : 'bg-bg-tertiary'
              )}>
                {entry.source === 'pomodoro'
                  ? <Timer className="h-3.5 w-3.5 text-accent" />
                  : <Clock className="h-3.5 w-3.5 text-text-muted" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold font-mono tabular-nums text-text-primary">
                    {formatMinutes(entry.duration_minutes)}
                  </span>
                  {entry.category && (
                    <span className="text-xs text-text-secondary truncate">
                      {entry.category}
                    </span>
                  )}
                  <Badge variant={entry.source === 'pomodoro' ? 'accent' : 'default'}>
                    {entry.source === 'pomodoro' ? 'Pomodoro' : 'Manual'}
                  </Badge>
                </div>
                {entry.note && (
                  <p className="text-xs text-text-muted truncate mt-0.5">{entry.note}</p>
                )}
              </div>

              <span className="text-xs text-text-muted shrink-0">
                {formatRelativeTime(entry.created_at)}
              </span>

              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer shrink-0',
                  confirmId === entry.id
                    ? 'bg-error/10 text-error'
                    : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-error hover:bg-error/10'
                )}
                title={confirmId === entry.id ? 'Click again to confirm' : 'Delete entry'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
