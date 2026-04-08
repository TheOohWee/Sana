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
  frequency: 'daily' | 'weekly' | 'monthly';
  frequency_days: number[];
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
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEntries = useCallback(async () => {
    if (!user) return;
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
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const addHabit = useCallback(async (habit: { name: string; icon: string; color: string; frequency: 'daily' | 'weekly' | 'monthly'; frequency_days: number[]; target_count: number }) => {
    if (!user) return { data: null, error: { message: 'Not authenticated' } };
    try {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name: habit.name,
          icon: habit.icon,
          color: habit.color,
          frequency: habit.frequency,
          frequency_days: habit.frequency_days,
          target_count: habit.target_count,
          archived: false,
        })
        .select()
        .single();
      if (error) {
        console.error('addHabit error:', error.message, error.details, error.hint);
        return { data: null, error };
      }
      if (data) setHabits(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      console.error('addHabit exception:', err);
      return { data: null, error: { message: 'Unexpected error creating habit' } };
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteHabit = useCallback(async (habitId: string) => {
    if (!user) return;
    await supabase.from('habits').update({ archived: true }).eq('id', habitId).eq('user_id', user.id);
    setHabits(prev => prev.filter(h => h.id !== habitId));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEntry = useCallback(async (habitId: string, date: string) => {
    if (!user) return;
    const existing = entries.find(e => e.habit_id === habitId && e.date === date);
    if (existing) {
      await supabase.from('habit_entries').delete().eq('id', existing.id);
      setEntries(prev => prev.filter(e => e.id !== existing.id));
    } else {
      const { data } = await supabase
        .from('habit_entries')
        .insert({ habit_id: habitId, user_id: user.id, date, count: 1 })
        .select()
        .single();
      if (data) setEntries(prev => [...prev, data]);
    }
  }, [user, entries]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      Promise.all([fetchHabits(), fetchEntries()]).then(() => setLoading(false));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return { habits, entries, loading, addHabit, deleteHabit, toggleEntry, refresh: () => Promise.all([fetchHabits(), fetchEntries()]) };
}
