'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Ranking } from '@/components/Ranking';
import { PartyChat } from '@/components/PartyChat';
import { InviteModal } from '@/components/InviteModal';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePartyRanking } from '@/hooks/usePartyRanking';
import { formatMinutes, formatRelativeTime, cn } from '@/lib/utils';
import { UserPlus, Settings, Clock, Users } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly';

interface PartyDetail {
  id: string;
  name: string;
  description: string;
  purpose: string;
  created_by: string;
  invite_code: string;
}

interface TimeEntry {
  id: string;
  user_id: string;
  duration_minutes: number;
  category: string;
  source: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function PartyDetailPage() {
  const params = useParams();
  const partyId = params.id as string;
  const { user } = useAuth();
  const supabase = createClient();

  const [party, setParty] = useState<PartyDetail | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [period, setPeriod] = useState<Period>('daily');
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'ranking' | 'chat' | 'log'>('ranking');

  const { ranking, loading: rankingLoading } = usePartyRanking(partyId, period);

  const fetchParty = useCallback(async () => {
    const { data: partyData } = await supabase
      .from('parties')
      .select('*')
      .eq('id', partyId)
      .single();

    if (partyData) setParty(partyData);

    const { count } = await supabase
      .from('party_members')
      .select('*', { count: 'exact', head: true })
      .eq('party_id', partyId)
      .eq('status', 'accepted');

    setMemberCount(count || 0);
    setLoading(false);
  }, [partyId, supabase]);

  const fetchRecentEntries = useCallback(async () => {
    const { data } = await supabase
      .from('time_entries')
      .select('id, user_id, duration_minutes, category, source, created_at, profiles(username, display_name, avatar_url)')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false })
      .limit(20);

    setRecentEntries((data as unknown as TimeEntry[]) || []);
  }, [partyId, supabase]);

  useEffect(() => {
    fetchParty();
    fetchRecentEntries();
  }, [fetchParty, fetchRecentEntries]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-16" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary text-lg">Party not found</p>
      </div>
    );
  }

  const isOwner = party.created_by === user?.id;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{party.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
            {party.purpose && <span>{party.purpose}</span>}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {memberCount} members
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowInvite(true)}
            icon={<UserPlus className="h-4 w-4" />}
          >
            Invite
          </Button>
          {isOwner && (
            <Link href={`/party/${partyId}/settings`}>
              <Button size="sm" variant="ghost" icon={<Settings className="h-4 w-4" />}>
                Settings
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Period Tabs */}
      <Tabs
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'daily', label: 'Day' },
          { value: 'weekly', label: 'Week' },
          { value: 'monthly', label: 'Month' },
        ]}
        className="mb-6 max-w-xs"
      />

      {/* Mobile tab selector */}
      <div className="lg:hidden mb-4">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'ranking', label: 'Ranking' },
            { value: 'chat', label: 'Chat' },
            { value: 'log', label: 'Log' },
          ]}
        />
      </div>

      {/* Desktop: two columns / Mobile: tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ranking */}
        <div className={cn('lg:block', activeTab !== 'ranking' && 'hidden')}>
          <Card className="p-0">
            <div className="p-4 border-b border-border-default">
              <h2 className="text-sm font-medium text-text-secondary">Leaderboard</h2>
            </div>
            <div className="p-3">
              <Ranking
                entries={ranking}
                currentUserId={user?.id}
                loading={rankingLoading}
              />
            </div>
          </Card>

          {/* Time Log - Desktop */}
          <div className="hidden lg:block mt-6">
            <Card className="p-0">
              <div className="p-4 border-b border-border-default">
                <h2 className="text-sm font-medium text-text-secondary">Recent Activity</h2>
              </div>
              <div className="divide-y divide-border-default max-h-80 overflow-y-auto">
                {recentEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-muted">No activity yet</p>
                  </div>
                ) : (
                  recentEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar src={entry.profiles?.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">
                          {entry.profiles?.display_name || entry.profiles?.username}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-text-muted">
                            {formatMinutes(entry.duration_minutes)}
                          </span>
                          {entry.category && (
                            <span className="text-xs text-text-muted">· {entry.category}</span>
                          )}
                          <Badge variant={entry.source === 'pomodoro' ? 'accent' : 'default'}>
                            {entry.source === 'pomodoro' ? 'Pomodoro' : 'Manual'}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">
                        {formatRelativeTime(entry.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right: Chat */}
        <div className={cn('lg:block', activeTab !== 'chat' && 'hidden')}>
          <Card className="p-0 h-[500px] flex flex-col">
            <div className="p-4 border-b border-border-default">
              <h2 className="text-sm font-medium text-text-secondary">Group Chat</h2>
            </div>
            <div className="flex-1 min-h-0">
              <PartyChat partyId={partyId} />
            </div>
          </Card>
        </div>

        {/* Mobile: Time Log tab */}
        <div className={cn('lg:hidden', activeTab !== 'log' && 'hidden')}>
          <Card className="p-0">
            <div className="p-4 border-b border-border-default">
              <h2 className="text-sm font-medium text-text-secondary">Recent Activity</h2>
            </div>
            <div className="divide-y divide-border-default max-h-96 overflow-y-auto">
              {recentEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-text-muted">No activity yet</p>
                </div>
              ) : (
                recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar src={entry.profiles?.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        {entry.profiles?.display_name || entry.profiles?.username}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-text-muted">
                          {formatMinutes(entry.duration_minutes)}
                        </span>
                        {entry.category && (
                          <span className="text-xs text-text-muted">· {entry.category}</span>
                        )}
                        <Badge variant={entry.source === 'pomodoro' ? 'accent' : 'default'}>
                          {entry.source === 'pomodoro' ? 'Pomodoro' : 'Manual'}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-text-muted">
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Invite Modal */}
      {party.invite_code && (
        <InviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          partyId={partyId}
          inviteCode={party.invite_code}
        />
      )}
    </div>
  );
}
