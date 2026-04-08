'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { PartyCard } from '@/components/PartyCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Plus, Check, X, Users } from 'lucide-react';

interface Party {
  id: string;
  name: string;
  description: string;
  purpose: string;
  invite_code: string;
  member_count: number;
}

interface PendingInvite {
  id: string;
  party_id: string;
  party_name: string;
  party_purpose: string;
  invited_by: string;
}

export default function PartiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [parties, setParties] = useState<Party[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newParty, setNewParty] = useState({ name: '', description: '', purpose: '' });

  const fetchParties = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from('party_members')
      .select('party_id, parties(id, name, description, purpose, invite_code)')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const partyList: Party[] = [];
    for (const m of memberships || []) {
      const party = (m as unknown as { parties: { id: string; name: string; description: string; purpose: string; invite_code: string } }).parties;
      if (!party) continue;

      const { count } = await supabase
        .from('party_members')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', party.id)
        .eq('status', 'accepted');

      partyList.push({ ...party, member_count: count || 1 });
    }
    setParties(partyList);

    const { data: invites } = await supabase
      .from('party_members')
      .select('id, party_id, parties(name, purpose, created_by, profiles(username))')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    const pendingList: PendingInvite[] = (invites || []).map((inv) => {
      const p = (inv as unknown as { 
        id: string; 
        party_id: string; 
        parties: { 
          name: string; 
          purpose: string; 
          created_by: string;
          profiles: { username: string };
        } 
      });
      return {
        id: p.id,
        party_id: p.party_id,
        party_name: p.parties?.name || 'Unknown',
        party_purpose: p.parties?.purpose || '',
        invited_by: p.parties?.profiles?.username || 'someone',
      };
    });
    setPendingInvites(pendingList);
    setLoading(false);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('party-invites')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchParties()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchParties]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newParty.name.trim()) return;

    setCreating(true);

    const { data: party, error } = await supabase
      .from('parties')
      .insert({
        name: newParty.name.trim(),
        description: newParty.description.trim(),
        purpose: newParty.purpose.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !party) {
      console.error('Party create error:', error?.message, error?.details, error?.hint);
      toast(`Failed to create party: ${error?.message || 'Unknown error'}`, 'error');
      setCreating(false);
      return;
    }

    const { error: memberError } = await supabase.from('party_members').insert({
      party_id: party.id,
      user_id: user.id,
      role: 'owner',
      status: 'accepted',
    });

    if (memberError) {
      console.error('Member insert error:', memberError.message);
    }

    toast('Party created!', 'success');
    setNewParty({ name: '', description: '', purpose: '' });
    setShowCreate(false);
    setCreating(false);
    fetchParties();
  }

  async function handleInviteResponse(inviteId: string, accept: boolean) {
    const status = accept ? 'accepted' : 'rejected';
    const { error } = await supabase
      .from('party_members')
      .update({ status })
      .eq('id', inviteId);

    if (error) {
      toast(`Failed to ${accept ? 'accept' : 'reject'} invite`, 'error');
    } else {
      toast(accept ? 'Joined party!' : 'Invite rejected', accept ? 'success' : 'info');
      fetchParties();
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-text-secondary mb-3">Pending Invites</h2>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <Card key={inv.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{inv.party_name}</p>
                  <p className="text-xs text-text-muted">
                    Invited by @{inv.invited_by}
                    {inv.party_purpose && ` · ${inv.party_purpose}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleInviteResponse(inv.id, true)}
                    icon={<Check className="h-3.5 w-3.5" />}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleInviteResponse(inv.id, false)}
                    icon={<X className="h-3.5 w-3.5" />}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Your Parties */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Your Parties</h2>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          icon={<Plus className="h-4 w-4" />}
        >
          Create Party
        </Button>
      </div>

      {parties.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No parties yet</p>
          <p className="text-xs text-text-muted mt-1">Create one or ask a friend to invite you</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {parties.map((party) => (
            <PartyCard
              key={party.id}
              id={party.id}
              name={party.name}
              description={party.description}
              purpose={party.purpose}
              memberCount={party.member_count}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Party">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Party Name"
            placeholder="e.g., Study Squad"
            value={newParty.name}
            onChange={(e) => setNewParty((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            placeholder="What's this party about?"
            value={newParty.description}
            onChange={(e) => setNewParty((p) => ({ ...p, description: e.target.value }))}
            rows={2}
          />
          <Input
            label="Purpose"
            placeholder="e.g., Studying for finals, Gym grind"
            value={newParty.purpose}
            onChange={(e) => setNewParty((p) => ({ ...p, purpose: e.target.value }))}
          />
          <Button type="submit" className="w-full" loading={creating} disabled={!newParty.name.trim()}>
            Create Party
          </Button>
        </form>
      </Modal>
    </div>
  );
}
