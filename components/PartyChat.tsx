'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { useAuth } from './AuthProvider';
import { Avatar } from './ui/Avatar';
import { Skeleton } from './ui/Skeleton';
import { Send } from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

interface PartyChatProps {
  partyId: string;
}

export function PartyChat({ partyId }: PartyChatProps) {
  const { messages, loading, sendMessage } = useChat(partyId);
  const { user, profile } = useAuth();
  const [input, setInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">No messages yet. Start the conversation!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          const displayName = isOwn
            ? (profile?.display_name || profile?.username || 'You')
            : (msg.profiles?.display_name || msg.profiles?.username || 'Unknown');
          const avatarUrl = isOwn ? profile?.avatar_url : msg.profiles?.avatar_url;
          const username = isOwn ? profile?.username : msg.profiles?.username;

          return (
            <div key={msg.id} className="flex gap-2.5">
              {username ? (
                <Link href={`/profile/${username}`} className="shrink-0">
                  <Avatar src={avatarUrl} size="sm" alt={displayName} />
                </Link>
              ) : (
                <Avatar src={avatarUrl} size="sm" alt={displayName} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  {username ? (
                    <Link
                      href={`/profile/${username}`}
                      className="text-sm font-medium text-text-primary hover:underline"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-text-primary">
                      {displayName}
                    </span>
                  )}
                  <span className="text-xs text-text-muted">
                    {formatRelativeTime(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm text-text-secondary break-words mt-0.5">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-border-default p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            'p-2 rounded-lg transition-colors cursor-pointer',
            input.trim()
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-bg-tertiary text-text-muted'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
