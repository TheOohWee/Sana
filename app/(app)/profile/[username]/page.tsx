'use client';

import { useParams } from 'next/navigation';
import { usePublicProfile, useUserHeatmap } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { MapPin, Calendar, Clock, Crown, Flame, Trophy, UserPlus, UserCheck, UserX, Users } from 'lucide-react';
import { formatDate, formatMinutes, formatDateForDB } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ActivityHeatmap = dynamic(() => import('@/components/ActivityHeatmap').then(m => ({ default: m.ActivityHeatmap })), {
  loading: () => <Skeleton className="h-40" />,
});

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { profile, loading, error } = usePublicProfile(username);
  const { data: heatmapData, loading: heatmapLoading } = useUserHeatmap(profile?.id);
  const { user } = useAuth();
  const { friends, sendRequest, getFriendshipStatus, acceptRequest, removeFriend } = useFriends();
  const { toast } = useToast();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [partyPerfLoading, setPartyPerfLoading] = useState(false);
  const [partyPerf, setPartyPerf] = useState<{ party_id: string; party_name: string; rank: number | null; total_minutes: number; member_count: number }[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [friendStatus, setFriendStatus] = useState<{ id: string; status: string; requester_id: string } | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  const isOwnProfile = user?.id === profile?.id;

  // All hooks MUST be above conditional returns
  const range = useMemo(() => {
    const now = new Date();
    const ymd = (d: Date) => formatDateForDB(d);
    if (period === 'daily') return { start: ymd(now), end: ymd(now) };

    const start = new Date(now);
    const end = new Date(now);
    if (period === 'weekly') {
      const day = now.getUTCDay();
      const diffToMon = (day + 6) % 7;
      start.setUTCDate(now.getUTCDate() - diffToMon);
      end.setUTCDate(start.getUTCDate() + 6);
      return { start: ymd(start), end: ymd(end) };
    }
    start.setUTCDate(1);
    end.setUTCMonth(start.getUTCMonth() + 1);
    end.setUTCDate(0);
    return { start: ymd(start), end: ymd(end) };
  }, [period]);

  // Check friendship status
  useEffect(() => {
    if (!profile?.id || !user || isOwnProfile) return;
    getFriendshipStatus(profile.id).then(setFriendStatus);
  }, [profile?.id, user, isOwnProfile, getFriendshipStatus]);

  // Fetch party performance
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    (async () => {
      setPartyPerfLoading(true);
      const { data: memberships } = await supabase
        .from('party_members')
        .select('party_id, parties(id, name)')
        .eq('user_id', profile.id)
        .eq('status', 'accepted');

      const parties = (memberships || []).map((m) => (m as unknown as { parties: { id: string; name: string } }).parties).filter(Boolean);

      const results: { party_id: string; party_name: string; rank: number | null; total_minutes: number; member_count: number }[] = [];

      for (const p of parties) {
        const [{ data: ranking }, { count }] = await Promise.all([
          supabase.rpc('get_party_ranking', {
            p_party_id: p.id,
            p_start_date: range.start,
            p_end_date: range.end,
          }),
          supabase
            .from('party_members')
            .select('*', { count: 'exact', head: true })
            .eq('party_id', p.id)
            .eq('status', 'accepted'),
        ]);

        const row = (ranking || []).find((r: any) => r.user_id === profile.id);
        results.push({
          party_id: p.id,
          party_name: p.name,
          rank: row ? Number(row.rank) : null,
          total_minutes: row ? Number(row.total_minutes) : 0,
          member_count: count || 0,
        });
      }

      results.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
      if (!cancelled) setPartyPerf(results);
      if (!cancelled) setPartyPerfLoading(false);
    })();

    return () => { cancelled = true; };
  }, [profile?.id, range.start, range.end]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFriendAction = useCallback(async () => {
    if (!profile || !user) return;
    setFriendLoading(true);

    if (!friendStatus) {
      const result = await sendRequest(profile.id);
      if (!result.error) {
        toast('Friend request sent!', 'success');
        setFriendStatus({ id: '', status: 'pending', requester_id: user.id });
      } else {
        toast('Failed to send request', 'error');
      }
    } else if (friendStatus.status === 'pending' && friendStatus.requester_id !== user.id) {
      const result = await acceptRequest(friendStatus.id);
      if (!result.error) {
        toast('Friend request accepted!', 'success');
        setFriendStatus({ ...friendStatus, status: 'accepted' });
      }
    } else if (friendStatus.status === 'accepted') {
      const result = await removeFriend(friendStatus.id);
      if (!result.error) {
        toast('Friend removed', 'info');
        setFriendStatus(null);
      }
    }

    setFriendLoading(false);
  }, [profile, user, friendStatus, sendRequest, acceptRequest, removeFriend, toast]);

  // --- Conditional returns AFTER all hooks ---

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

  const totalHours = Math.floor(profile.total_focus_minutes / 60);
  const totalMins = profile.total_focus_minutes % 60;
  const totalWins = profile.daily_wins + profile.weekly_wins + profile.monthly_wins;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-5">
        <Avatar src={profile.avatar_url} size="xl" alt={profile.display_name || profile.username} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-text-primary truncate">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-text-muted">@{profile.username}</p>
            </div>
            {!isOwnProfile && user && (
              <Button
                size="sm"
                variant={friendStatus?.status === 'accepted' ? 'ghost' : friendStatus?.status === 'pending' && friendStatus.requester_id === user.id ? 'secondary' : 'primary'}
                onClick={handleFriendAction}
                loading={friendLoading}
                icon={
                  friendStatus?.status === 'accepted' ? <UserCheck className="h-4 w-4" /> :
                  friendStatus?.status === 'pending' && friendStatus.requester_id !== user.id ? <UserPlus className="h-4 w-4" /> :
                  friendStatus?.status === 'pending' ? <UserX className="h-4 w-4 text-text-muted" /> :
                  <UserPlus className="h-4 w-4" />
                }
              >
                {friendStatus?.status === 'accepted' ? 'Friends' :
                 friendStatus?.status === 'pending' && friendStatus.requester_id === user.id ? 'Pending' :
                 friendStatus?.status === 'pending' ? 'Accept' :
                 'Add Friend'}
              </Button>
            )}
          </div>
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

      {/* Streak & Rewards banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center py-3">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
            {profile.current_streak || 0}
          </p>
          <p className="text-xs text-text-muted">Day Streak</p>
        </Card>
        <Card className="text-center py-3">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
            {profile.longest_streak || 0}
          </p>
          <p className="text-xs text-text-muted">Best Streak</p>
        </Card>
        <Card className="text-center py-3">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
            {totalHours > 0 ? `${totalHours}h` : `${totalMins}m`}
          </p>
          <p className="text-xs text-text-muted">Total Focus</p>
        </Card>
        <Card className="text-center py-3">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Trophy className="h-4 w-4 text-crown" />
          </div>
          <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
            {totalWins}
          </p>
          <p className="text-xs text-text-muted">Total Wins</p>
        </Card>
      </div>

      {/* Rewards breakdown */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Rewards</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="flex items-center gap-2.5 py-3 px-3">
            <div className="w-8 h-8 rounded-lg bg-crown/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-crown" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums text-crown">{profile.daily_wins}</p>
              <p className="text-[10px] text-text-muted">Daily Wins</p>
            </div>
          </Card>
          <Card className="flex items-center gap-2.5 py-3 px-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums text-accent">{profile.weekly_wins}</p>
              <p className="text-[10px] text-text-muted">Weekly Wins</p>
            </div>
          </Card>
          <Card className="flex items-center gap-2.5 py-3 px-3">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums text-success">{profile.monthly_wins}</p>
              <p className="text-[10px] text-text-muted">Monthly Wins</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Friends section (only on own profile) */}
      {isOwnProfile && friends.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-secondary">Friends</h2>
            <span className="text-xs text-text-muted">{friends.length} friends</span>
          </div>
          <Card className="p-3">
            <div className="flex flex-wrap gap-3">
              {friends.slice(0, 8).map(f => (
                <Link key={f.id} href={`/profile/${f.username}`} className="flex flex-col items-center gap-1 group">
                  <Avatar src={f.avatar_url} size="md" />
                  <span className="text-[10px] text-text-muted group-hover:text-text-primary transition-colors truncate max-w-[56px]">
                    {f.display_name || f.username}
                  </span>
                </Link>
              ))}
              {friends.length > 8 && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-bg-tertiary border border-border-default flex items-center justify-center">
                    <Users className="h-4 w-4 text-text-muted" />
                  </div>
                  <span className="text-[10px] text-text-muted">+{friends.length - 8}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Party performance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-secondary">Party Performance</h2>
          <Tabs
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'daily', label: 'Day' },
              { value: 'weekly', label: 'Week' },
              { value: 'monthly', label: 'Month' },
            ]}
            className="max-w-xs"
          />
        </div>
        <Card className="p-0 divide-y divide-border-default">
          {partyPerfLoading ? (
            <div className="p-4">
              <Skeleton className="h-10" />
              <div className="h-2" />
              <Skeleton className="h-10" />
            </div>
          ) : partyPerf.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-text-muted">No visible parties for this user</p>
              <p className="text-xs text-text-muted mt-1">You'll only see parties you share with them (or your own).</p>
            </div>
          ) : (
            partyPerf.map((p) => (
              <div key={p.party_id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{p.party_name}</p>
                  <p className="text-xs text-text-muted">
                    {p.rank ? `Rank #${p.rank} of ${p.member_count || '\u2014'}` : 'No rank yet'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold font-mono tabular-nums text-text-primary">
                    {formatMinutes(p.total_minutes)}
                  </p>
                  {p.rank === 1 && p.total_minutes > 0 && (
                    <p className="text-xs text-crown flex items-center justify-end gap-1">
                      <Crown className="h-3.5 w-3.5" />
                      Leading
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Heatmap */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Activity</h2>
        <Card>
          <ActivityHeatmap data={heatmapData} loading={heatmapLoading} />
        </Card>
      </div>
    </div>
  );
}
