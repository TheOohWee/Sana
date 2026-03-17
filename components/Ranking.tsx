'use client';

import { Avatar } from './ui/Avatar';
import { Skeleton } from './ui/Skeleton';
import { formatMinutes, cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface RankingEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_minutes: number;
  rank: number;
}

interface RankingProps {
  entries: RankingEntry[];
  currentUserId?: string;
  loading?: boolean;
}

export function Ranking({ entries, currentUserId, loading }: RankingProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-muted">No activity yet for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, idx) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const isFirst = entry.rank === 1;
        const prevEntry = idx > 0 ? entries[idx - 1] : null;
        const gap = prevEntry ? prevEntry.total_minutes - entry.total_minutes : 0;

        return (
          <div
            key={entry.user_id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              isCurrentUser ? 'bg-accent/5 border border-accent/20' : 'hover:bg-bg-tertiary'
            )}
          >
            {/* Rank */}
            <span
              className={cn(
                'w-8 text-center text-sm font-semibold font-mono tabular-nums',
                isFirst ? 'text-crown' : 'text-text-muted'
              )}
            >
              #{entry.rank}
            </span>

            {/* Avatar */}
            <Avatar src={entry.avatar_url} size="sm" />

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-text-primary truncate">
                  {entry.display_name || entry.username}
                </span>
                {isFirst && entry.total_minutes > 0 && (
                  <Crown className="h-4 w-4 text-crown shrink-0" />
                )}
              </div>
              <span className="text-xs text-text-muted">@{entry.username}</span>
            </div>

            {/* Time + gap */}
            <div className="text-right">
              <p className="text-sm font-semibold font-mono tabular-nums text-text-primary">
                {formatMinutes(Number(entry.total_minutes))}
              </p>
              {gap > 0 && (
                <p className="text-xs text-text-muted">
                  +{formatMinutes(gap)} to catch up
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
