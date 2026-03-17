'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { useToast } from './ui/Toast';
import { Search, UserPlus, Copy, Check } from 'lucide-react';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  partyId: string;
  inviteCode: string;
}

interface SearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function InviteModal({ open, onClose, partyId, inviteCode }: InviteModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${inviteCode}`
    : '';

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${value}%`)
      .limit(10);

    setResults(data || []);
    setSearching(false);
  }

  async function handleInvite(userId: string) {
    setInviting(userId);

    const { error } = await supabase.from('party_members').insert({
      party_id: partyId,
      user_id: userId,
      role: 'member',
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        toast('User is already a member or invited', 'info');
      } else {
        toast('Failed to send invite', 'error');
      }
    } else {
      toast('Invite sent!', 'success');
    }
    setInviting(null);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast('Invite link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Members">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by username..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-tertiary"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar src={user.avatar_url} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-xs text-text-muted">@{user.username}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<UserPlus className="h-3.5 w-3.5" />}
                  loading={inviting === user.id}
                  onClick={() => handleInvite(user.id)}
                >
                  Invite
                </Button>
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && !searching && (
          <p className="text-sm text-text-muted text-center py-4">No users found</p>
        )}

        {/* Invite Link */}
        <div className="pt-4 border-t border-border-default">
          <p className="text-xs text-text-muted mb-2">Or share invite link</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 px-3 py-2 rounded-lg border border-border-default bg-bg-tertiary text-xs text-text-secondary truncate"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
