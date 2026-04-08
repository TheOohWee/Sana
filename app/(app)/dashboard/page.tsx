'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/AuthProvider';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ManualTimeEntry } from '@/components/ManualTimeEntry';
import { StatsCards } from '@/components/StatsCards';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

const ActivityHeatmap = dynamic(() => import('@/components/ActivityHeatmap').then(m => ({ default: m.ActivityHeatmap })), {
  loading: () => <Skeleton className="h-40" />,
});
const WinBadges = dynamic(() => import('@/components/WinBadges').then(m => ({ default: m.WinBadges })), {
  loading: () => <Skeleton className="h-20" />,
});
const Balloons = dynamic(() => import('@/components/Balloons').then(m => ({ default: m.Balloons })), { ssr: false });
const TimeHistory = dynamic(() => import('@/components/TimeHistory').then(m => ({ default: m.TimeHistory })), {
  loading: () => <Skeleton className="h-32" />,
});

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const { entries, stats, heatmapData, loading: entriesLoading, addEntry, deleteEntry } = useTimeEntries();
  const [showBalloons, setShowBalloons] = useState(false);
  const { toast } = useToast();

  const handleLogTime = useCallback(async (entry: {
    duration_minutes: number;
    source: 'pomodoro' | 'manual';
    category?: string;
    note?: string;
    party_id?: string | null;
  }) => {
    const result = await addEntry({
      ...entry,
      party_id: null,
    });

    if (result && !result.error) {
      setShowBalloons(true);
      toast(`${entry.duration_minutes} min logged!`, 'success');
    }

    return result;
  }, [addEntry, toast]);

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-80" />
        <Skeleton className="h-24" />
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <Balloons show={showBalloons} onComplete={() => setShowBalloons(false)} />

      <Card>
        <PomodoroTimer onLogTime={handleLogTime} />
      </Card>

      <Card>
        <ManualTimeEntry onLogTime={handleLogTime} />
      </Card>

      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Your Progress</h2>
        <StatsCards
          today={stats.today}
          week={stats.week}
          month={stats.month}
          loading={entriesLoading}
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">History</h2>
        <Card>
          <TimeHistory entries={entries} loading={entriesLoading} onDelete={deleteEntry} />
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Activity</h2>
        <Card>
          <ActivityHeatmap data={heatmapData} loading={entriesLoading} />
        </Card>
      </div>

      {profile && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Achievements</h2>
          <WinBadges
            dailyWins={profile.daily_wins}
            weeklyWins={profile.weekly_wins}
            monthlyWins={profile.monthly_wins}
          />
        </div>
      )}
    </div>
  );
}
