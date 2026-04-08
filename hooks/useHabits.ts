'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { formatDateForDB } from '@/lib/utils';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly';
  target_count: number;
  archived: boolean;
  created_at: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  count: number;
}

export function useHabits() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('created_at', { ascending: true });
    setHabits(data || []);
  }, [user, supabase]);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    // Fetch last 7 days of entries
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const { data } = await supabase
      .from('habit_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', formatDateForDB(weekAgo))
      .lte('date', formatDateForDB(today));
    setEntries(data || []);
  }, [user, supabase]);

  const addHabit = useCallback(async (habit: { name: string; icon: string; color: string; frequency: 'daily' | 'weekly'; target_count: number }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, user_id: user.id })
      .select()
      .single();
    if (data) setHabits(prev => [...prev, data]);
    return { data, error };
  }, [user, supabase]);

  const deleteHabit = useCallback(async (habitId: string) => {
    await supabase.from('habits').update({ archived: true }).eq('id', habitId);
    setHabits(prev => prev.filter(h => h.id !== habitId));
  }, [supabase]);

  const toggleEntry = useCallback(async (habitId: string, date: string) => {
    if (!user) return;
    const existing = entries.find(e => e.habit_id === habitId && e.date === date);
    if (existing) {
      await supabase.from('habit_entries').delete().eq('id', existing.id);
      setEntries(prev => prev.filter(e => e.id !== existing.id));
    } else {
      const { data } = await supabase
        .from('habit_entries')
        .insert({ habit_id: habitId, user_id: user.id, date })
        .select()
        .single();
      if (data) setEntries(prev => [...prev, data]);
    }
  }, [user, supabase, entries]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchHabits(), fetchEntries()]).then(() => setLoading(false));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { habits, entries, loading, addHabit, deleteHabit, toggleEntry, refresh: () => Promise.all([fetchHabits(), fetchEntries()]) };
}
