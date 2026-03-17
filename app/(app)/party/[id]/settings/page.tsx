'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Trash2, UserMinus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function PartySettingsPage() {
  const params = useParams();
  const partyId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: party } = await supabase
        .from('parties')
        .select('*')
        .eq('id', partyId)
        .single();

      if (!party || party.created_by !== user?.id) {
        router.push(`/party/${partyId}`);
        return;
      }

      setName(party.name);
      setDescription(party.description || '');
      setPurpose(party.purpose || '');

      const { data: memberData } = await supabase
        .from('party_members')
        .select('id, user_id, role, status, profiles(username, display_name, avatar_url)')
        .eq('party_id', partyId);

      setMembers((memberData as unknown as Member[]) || []);
      setLoading(false);
    }
    fetchData();
  }, [partyId, user, supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('parties')
      .update({
        name: name.trim(),
        description: description.trim(),
        purpose: purpose.trim(),
      })
      .eq('id', partyId);

    if (error) {
      toast('Failed to update party', 'error');
    } else {
      toast('Party updated!', 'success');
    }
    setSaving(false);
  }

  async function handleRemoveMember(memberId: string) {
    const { error } = await supabase
      .from('party_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast('Failed to remove member', 'error');
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast('Member removed', 'success');
    }
  }

  async function handleDeleteParty() {
    if (!confirm('Are you sure you want to delete this party? This cannot be undone.')) return;
    setDeleting(true);

    const { error } = await supabase
      .from('parties')
      .delete()
      .eq('id', partyId);

    if (error) {
      toast('Failed to delete party', 'error');
      setDeleting(false);
    } else {
      toast('Party deleted', 'info');
      router.push('/parties');
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/party/${partyId}`}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">Party Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="space-y-4">
          <Input
            label="Party Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <Input
            label="Purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="What does this party track?"
          />
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </Card>
      </form>

      {/* Members */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-text-secondary mb-3">
          Members ({members.filter((m) => m.status === 'accepted').length})
        </h2>
        <Card className="p-0 divide-y divide-border-default">
          {members
            .filter((m) => m.status === 'accepted')
            .map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar src={member.profiles?.avatar_url} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {member.profiles?.display_name || member.profiles?.username}
                    </p>
                    <p className="text-xs text-text-muted">@{member.profiles?.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'owner' ? (
                    <span className="text-xs text-accent font-medium">Owner</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMember(member.id)}
                      icon={<UserMinus className="h-3.5 w-3.5" />}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </Card>
      </div>

      {/* Pending */}
      {members.some((m) => m.status === 'pending') && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-text-secondary mb-3">Pending Invites</h2>
          <Card className="p-0 divide-y divide-border-default">
            {members
              .filter((m) => m.status === 'pending')
              .map((member) => (
                <div key={member.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.profiles?.avatar_url} size="sm" />
                    <p className="text-sm text-text-secondary">
                      @{member.profiles?.username}
                    </p>
                  </div>
                  <span className="text-xs text-warning">Pending</span>
                </div>
              ))}
          </Card>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-8">
        <Card className="border-error/20">
          <h3 className="text-sm font-medium text-error mb-2">Danger Zone</h3>
          <p className="text-xs text-text-muted mb-4">
            Deleting this party will remove all associated data including messages and time entries.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteParty}
            loading={deleting}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Delete Party
          </Button>
        </Card>
      </div>
    </div>
  );
}
