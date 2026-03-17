'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Users, UserPlus } from 'lucide-react';

interface PartyInfo {
  id: string;
  name: string;
  description: string;
  purpose: string;
}

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [party, setParty] = useState<PartyInfo | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchParty() {
      const { data } = await supabase
        .from('parties')
        .select('id, name, description, purpose')
        .eq('invite_code', code)
        .single();

      if (!data) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      setParty(data);

      const { count } = await supabase
        .from('party_members')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', data.id)
        .eq('status', 'accepted');

      setMemberCount(count || 0);
      setLoading(false);
    }

    fetchParty();
  }, [code, supabase]);

  async function handleJoin() {
    if (!user || !party) return;
    setJoining(true);

    const { data: existing } = await supabase
      .from('party_members')
      .select('id, status')
      .eq('party_id', party.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        toast('You are already a member of this party', 'info');
        router.push(`/party/${party.id}`);
        return;
      }

      await supabase
        .from('party_members')
        .update({ status: 'accepted' })
        .eq('id', existing.id);
    } else {
      const { error } = await supabase.from('party_members').insert({
        party_id: party.id,
        user_id: user.id,
        role: 'member',
        status: 'accepted',
      });

      if (error) {
        toast('Failed to join party', 'error');
        setJoining(false);
        return;
      }
    }

    toast('Joined party!', 'success');
    router.push(`/party/${party.id}`);
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary text-lg">{error}</p>
      </div>
    );
  }

  if (!party) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-16 animate-fade-in">
      <Card className="text-center py-8 px-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Users className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-1">
          {party.name}
        </h1>
        {party.purpose && (
          <p className="text-sm text-text-muted mb-1">{party.purpose}</p>
        )}
        {party.description && (
          <p className="text-sm text-text-secondary mb-4">{party.description}</p>
        )}
        <p className="text-xs text-text-muted mb-6">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </p>

        <Button
          onClick={handleJoin}
          loading={joining}
          size="lg"
          className="w-full"
          icon={<UserPlus className="h-5 w-5" />}
        >
          Join Party
        </Button>
      </Card>
    </div>
  );
}
