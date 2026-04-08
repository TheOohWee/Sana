'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export interface Friend {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_focus_minutes: number;
  current_streak: number;
  friendship_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_requester: boolean;
}

export function useFriends() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    // Fetch friendships where user is either requester or addressee
    const { data: sent } = await supabase
      .from('friendships')
      .select('id, status, requester_id, addressee_id, addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url, total_focus_minutes, current_streak)')
      .eq('requester_id', user.id);

    const { data: received } = await supabase
      .from('friendships')
      .select('id, status, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url, total_focus_minutes, current_streak)')
      .eq('addressee_id', user.id);

    const allFriends: Friend[] = [];
    const pending: Friend[] = [];

    (sent || []).forEach((f: any) => {
      const profile = f.addressee;
      if (!profile) return;
      const friend: Friend = {
        id: profile.id,
        user_id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        total_focus_minutes: profile.total_focus_minutes || 0,
        current_streak: profile.current_streak || 0,
        friendship_id: f.id,
        status: f.status,
        is_requester: true,
      };
      if (f.status === 'accepted') allFriends.push(friend);
      else if (f.status === 'pending') pending.push(friend);
    });

    (received || []).forEach((f: any) => {
      const profile = f.requester;
      if (!profile) return;
      const friend: Friend = {
        id: profile.id,
        user_id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        total_focus_minutes: profile.total_focus_minutes || 0,
        current_streak: profile.current_streak || 0,
        friendship_id: f.id,
        status: f.status,
        is_requester: false,
      };
      if (f.status === 'accepted') allFriends.push(friend);
      else if (f.status === 'pending') pending.push(friend);
    });

    setFriends(allFriends);
    setPendingRequests(pending);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendRequest = useCallback(async (addresseeId: string) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: addresseeId });
    if (!error) await fetchFriends();
    return { error: error?.message || null };
  }, [user, fetchFriends]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    if (!error) await fetchFriends();
    return { error: error?.message || null };
  }, [fetchFriends]); // eslint-disable-line react-hooks/exhaustive-deps

  const rejectRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (!error) await fetchFriends();
    return { error: error?.message || null };
  }, [fetchFriends]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeFriend = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (!error) await fetchFriends();
    return { error: error?.message || null };
  }, [fetchFriends]); // eslint-disable-line react-hooks/exhaustive-deps

  const getFriendshipStatus = useCallback(async (otherUserId: string) => {
    if (!user) return null;
    const { data } = await supabase
      .from('friendships')
      .select('id, status, requester_id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();
    return data;
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      fetchFriends().then(() => setLoading(false));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { friends, pendingRequests, loading, sendRequest, acceptRequest, rejectRequest, removeFriend, getFriendshipStatus, refresh: fetchFriends };
}
