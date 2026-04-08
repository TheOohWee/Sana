'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0 });
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({});
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const todayStr = formatDateForDB(today);
    const monthStart = formatDateForDB(startOfMonth(today));
    const monthEnd = formatDateForDB(endOfMonth(today));

    // Single query for the whole month, compute today/week/month client-side
    const { data: monthData } = await supabase
      .from('time_entries')
      .select('duration_minutes, date')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd);

    const weekStart = formatDateForDB(startOfWeek(today, { weekStartsOn: 1 }));
    const weekEnd = formatDateForDB(endOfWeek(today, { weekStartsOn: 1 }));

    let todayTotal = 0, weekTotal = 0, monthTotal = 0;
    for (const e of monthData || []) {
      monthTotal += e.duration_minutes;
      if (e.date === todayStr) todayTotal += e.duration_minutes;
      if (e.date >= weekStart && e.date <= weekEnd) weekTotal += e.duration_minutes;
    }

    setStats({ today: todayTotal, week: weekTotal, month: monthTotal });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHeatmap = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setDate(yearAgo.getDate() - 364);

    const { data, error } = await supabase.rpc('get_user_heatmap', {
      p_user_id: user.id,
      p_start_date: formatDateForDB(yearAgo),
      p_end_date: formatDateForDB(today),
    });

    if (error) {
      console.error('Heatmap fetch error:', error.message);
    }

    const map: HeatmapData = {};
    (data || []).forEach((d: { date: string; total_minutes: number }) => {
      map[d.date] = d.total_minutes;
    });
    setHeatmapData(map);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEntries = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setEntries(data || []);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const addEntry = useCallback(
    async (entry: {
      duration_minutes: number;
      note?: string;
      source: 'pomodoro' | 'manual';
      category?: string;
      party_id?: string | null;
    }) => {
      if (!user) {
        console.error('addEntry: no user');
        return { data: null, error: { message: 'Not authenticated' } };
      }

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

      if (error) {
        console.error('addEntry error:', error.message, error.details, error.hint);
        return { data: null, error };
      }

      if (data) {
        setEntries((prev) => [data, ...prev]);
        fetchStats();
        fetchHeatmap();
      }

      return { data, error: null };
    },
    [user, fetchStats, fetchHeatmap] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!user) return { error: { message: 'Not authenticated' } };

      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) {
        console.error('deleteEntry error:', error.message);
        return { error };
      }

      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      fetchStats();
      fetchHeatmap();
      return { error: null };
    },
    [user, fetchStats, fetchHeatmap] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      Promise.all([fetchEntries(), fetchStats(), fetchHeatmap()]).then(() => setLoading(false));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { entries, stats, heatmapData, loading, addEntry, deleteEntry, refresh: fetchEntries };
}
