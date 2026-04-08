'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface Message {
  id: string;
  party_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useChat(partyId: string) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('party_messages')
      .select('*, profiles(username, display_name, avatar_url)')
      .eq('party_id', partyId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Chat fetch error:', error.message, error.details);
    }

    setMessages(data || []);
    setLoading(false);
  }, [partyId, supabase]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim()) return;

      const optimisticMsg: Message = {
        id: crypto.randomUUID(),
        party_id: partyId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
        profiles: undefined,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const { error } = await supabase.from('party_messages').insert({
        party_id: partyId,
        user_id: user.id,
        content: content.trim(),
      });

      if (error) {
        console.error('Chat send error:', error.message, error.details);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    },
    [user, partyId, supabase]
  );

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_messages',
          filter: `party_id=eq.${partyId}`,
        },
        async (payload: { new: Message }) => {
          const newMsg = payload.new as Message;
          if (newMsg.user_id === user?.id) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('id', newMsg.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, profiles: profile || undefined },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { messages, loading, sendMessage };
}
