'use client';

import { useParams } from 'next/navigation';
import { usePublicProfile, useUserHeatmap } from '@/hooks/useProfile';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { Skeleton } from '@/components/ui/Skeleton';
import { MapPin, Calendar, Clock, Crown } from 'lucide-react';
import { formatMinutesLong, formatDate, formatMinutes, formatDateForDB } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { profile, loading, error } = usePublicProfile(username);
  const { data: heatmapData, loading: heatmapLoading } = useUserHeatmap(profile?.id);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [partyPerfLoading, setPartyPerfLoading] = useState(false);
  const [partyPerf, setPartyPerf] = useState<{ party_id: string; party_name: string; rank: number | null; total_minutes: number; member_count: number }[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

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

  const range = useMemo(() => {
    const now = new Date();
    const ymd = (d: Date) => formatDateForDB(d);
    if (period === 'daily') return { start: ymd(now), end: ymd(now) };

    const start = new Date(now);
    const end = new Date(now);
    if (period === 'weekly') {
      // Monday (UTC)
      const day = now.getUTCDay(); // 0-6, Sun=0
      const diffToMon = (day + 6) % 7;
      start.setUTCDate(now.getUTCDate() - diffToMon);
      end.setUTCDate(start.getUTCDate() + 6);
      return { start: ymd(start), end: ymd(end) };
    }
    // monthly
    start.setUTCDate(1);
    end.setUTCMonth(start.getUTCMonth() + 1);
    end.setUTCDate(0);
    return { start: ymd(start), end: ymd(end) };
  }, [period]);

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

    return () => {
      cancelled = true;
    };
  }, [profile.id, supabase, range.start, range.end]);

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

      {/* Overview stats */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="text-center py-3">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-accent" />
            </div>
            <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
              {totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`}
            </p>
            <p className="text-xs text-text-muted">Total Focus</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
              {partyPerf.length}
            </p>
            <p className="text-xs text-text-muted">Parties</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
              {partyPerf.filter((p) => p.rank === 1).length}
            </p>
            <p className="text-xs text-text-muted">#1 Right Now</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-lg font-semibold font-mono tabular-nums text-text-primary">
              {formatMinutes(partyPerf.reduce((acc, p) => acc + p.total_minutes, 0))}
            </p>
            <p className="text-xs text-text-muted">Party Time ({period})</p>
          </Card>
        </div>
      </div>

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
              <p className="text-xs text-text-muted mt-1">You’ll only see parties you share with them (or your own).</p>
            </div>
          ) : (
            partyPerf.map((p) => (
              <div key={p.party_id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{p.party_name}</p>
                  <p className="text-xs text-text-muted">
                    {p.rank ? `Rank #${p.rank} of ${p.member_count || '—'}` : 'No rank yet'}
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
