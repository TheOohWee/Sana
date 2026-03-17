'use client';

import { useParams } from 'next/navigation';
import { usePublicProfile, useUserHeatmap } from '@/hooks/useProfile';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { WinBadges } from '@/components/WinBadges';
import { Skeleton } from '@/components/ui/Skeleton';
import { MapPin, Calendar } from 'lucide-react';
import { formatMinutesLong, formatDate } from '@/lib/utils';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { profile, loading, error } = usePublicProfile(username);
  const { data: heatmapData, loading: heatmapLoading } = useUserHeatmap(profile?.id);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary text-lg">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-5">
        <Avatar src={profile.avatar_url} size="xl" alt={profile.display_name || profile.username} />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-text-primary">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-text-muted">@{profile.username}</p>
          {profile.bio && (
            <p className="text-sm text-text-secondary mt-2">{profile.bio}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {profile.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {formatDate(profile.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center py-3">
          <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
            {formatMinutesLong(profile.total_focus_minutes)}
          </p>
          <p className="text-xs text-text-muted">Total Focus</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-lg font-semibold font-mono tabular-nums text-crown">
            {profile.daily_wins}
          </p>
          <p className="text-xs text-text-muted">Daily Wins</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-lg font-semibold font-mono tabular-nums text-crown">
            {profile.weekly_wins}
          </p>
          <p className="text-xs text-text-muted">Weekly Wins</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-lg font-semibold font-mono tabular-nums text-crown">
            {profile.monthly_wins}
          </p>
          <p className="text-xs text-text-muted">Monthly Wins</p>
        </Card>
      </div>

      {/* Heatmap */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Activity</h2>
        <Card>
          <ActivityHeatmap data={heatmapData} loading={heatmapLoading} />
        </Card>
      </div>

      {/* Win Badges */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Achievements</h2>
        <WinBadges
          dailyWins={profile.daily_wins}
          weeklyWins={profile.weekly_wins}
          monthlyWins={profile.monthly_wins}
        />
      </div>
    </div>
  );
}
