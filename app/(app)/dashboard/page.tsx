'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ManualTimeEntry } from '@/components/ManualTimeEntry';
import { StatsCards } from '@/components/StatsCards';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { WinBadges } from '@/components/WinBadges';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';

interface Party {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { stats, heatmapData, loading: entriesLoading, addEntry } = useTimeEntries();
  const [parties, setParties] = useState<Party[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchParties() {
      if (!user) return;
      const { data } = await supabase
        .from('party_members')
        .select('party_id, parties(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const partyList: Party[] = (data || [])
        .map((d) => (d as unknown as { parties: Party }).parties)
        .filter(Boolean);
      setParties(partyList);
    }
    fetchParties();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <Card>
        <PomodoroTimer parties={parties} onLogTime={addEntry} />
      </Card>

      <Card>
        <ManualTimeEntry parties={parties} onLogTime={addEntry} />
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
