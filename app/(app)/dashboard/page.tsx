'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ManualTimeEntry } from '@/components/ManualTimeEntry';
import { StatsCards } from '@/components/StatsCards';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { WinBadges } from '@/components/WinBadges';
import { Balloons } from '@/components/Balloons';
import { TimeHistory } from '@/components/TimeHistory';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Flame, Zap } from 'lucide-react';

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

      {/* Welcome banner */}
      {profile && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-bg-secondary to-bg-secondary border border-accent/10 p-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative">
            <h1 className="text-xl font-semibold text-text-primary">
              Welcome back, {profile.display_name || profile.username}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              {(profile.current_streak ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm text-orange-400">
                  <Flame className="h-4 w-4" />
                  {profile.current_streak} day streak
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm text-accent">
                <Zap className="h-4 w-4" />
                {stats.today > 0 ? `${stats.today}m focused today` : 'Start focusing!'}
              </span>
            </div>
          </div>
        </div>
      )}

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
