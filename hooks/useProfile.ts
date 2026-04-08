'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string;
  location: string;
  avatar_url: string | null;
  total_focus_minutes: number;
  daily_wins: number;
  weekly_wins: number;
  monthly_wins: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
}

export function usePublicProfile(username: string) {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (err) {
      setError('Profile not found');
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [username, supabase]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { profile, loading, error };
}

export function useUserHeatmap(userId: string | undefined) {
  const supabase = createClient();
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setDate(yearAgo.getDate() - 364);

      const { data: result } = await supabase.rpc('get_user_heatmap', {
        p_user_id: userId,
        p_start_date: today.toISOString().split('T')[0],
        p_end_date: yearAgo.toISOString().split('T')[0],
      });

      const map: Record<string, number> = {};
      (result || []).forEach((d: { date: string; total_minutes: number }) => {
        map[d.date] = d.total_minutes;
      });
      setData(map);
      setLoading(false);
    };

    fetchData();
  }, [userId, supabase]);

  return { data, loading };
}
