'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { formatDateForDB } from '@/lib/utils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface TimeEntry {
  id: string;
  user_id: string;
  party_id: string | null;
  duration_minutes: number;
  note: string;
  source: 'pomodoro' | 'manual';
  category: string;
  created_at: string;
  date: string;
}

interface Stats {
  today: number;
  week: number;
  month: number;
}

interface HeatmapData {
  [date: string]: number;
}

export function useTimeEntries() {
  const { user } = useAuth();
  const supabase = createClient();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0 });
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const todayStr = formatDateForDB(today);
    const weekStart = formatDateForDB(startOfWeek(today, { weekStartsOn: 1 }));
    const weekEnd = formatDateForDB(endOfWeek(today, { weekStartsOn: 1 }));
    const monthStart = formatDateForDB(startOfMonth(today));
    const monthEnd = formatDateForDB(endOfMonth(today));

    const [todayRes, weekRes, monthRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .eq('date', todayStr),
      supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd),
      supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd),
    ]);

    const sum = (data: { duration_minutes: number }[] | null) =>
      (data || []).reduce((acc, e) => acc + e.duration_minutes, 0);

    setStats({
      today: sum(todayRes.data),
      week: sum(weekRes.data),
      month: sum(monthRes.data),
    });
  }, [user, supabase]);

  const fetchHeatmap = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setDate(yearAgo.getDate() - 364);

    const { data } = await supabase.rpc('get_user_heatmap', {
      p_user_id: user.id,
      p_start_date: formatDateForDB(yearAgo),
      p_end_date: formatDateForDB(today),
    });

    const map: HeatmapData = {};
    (data || []).forEach((d: { date: string; total_minutes: number }) => {
      map[d.date] = d.total_minutes;
    });
    setHeatmapData(map);
  }, [user, supabase]);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setEntries(data || []);
    setLoading(false);
  }, [user, supabase]);

  const addEntry = useCallback(
    async (entry: {
      duration_minutes: number;
      note?: string;
      source: 'pomodoro' | 'manual';
      category?: string;
      party_id?: string | null;
    }) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          party_id: entry.party_id || null,
          duration_minutes: entry.duration_minutes,
          note: entry.note || '',
          source: entry.source,
          category: entry.category || '',
          date: formatDateForDB(new Date()),
        })
        .select()
        .single();

      if (!error && data) {
        setEntries((prev) => [data, ...prev]);
        await fetchStats();
        await fetchHeatmap();
      }

      return { data, error };
    },
    [user, supabase, fetchStats, fetchHeatmap]
  );

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchStats();
      fetchHeatmap();
    }
  }, [user, fetchEntries, fetchStats, fetchHeatmap]);

  return { entries, stats, heatmapData, loading, addEntry, refresh: fetchEntries };
}
