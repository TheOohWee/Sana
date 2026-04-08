'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateForDB, getDateRangeForPeriod } from '@/lib/utils';

interface RankingEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_minutes: number;
  rank: number;
}

type Period = 'daily' | 'weekly' | 'monthly';

export function usePartyRanking(partyId: string, period: Period) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async () => {
    const range = getDateRangeForPeriod(period);

    const { data, error } = await supabase.rpc('get_party_ranking', {
      p_party_id: partyId,
      p_start_date: formatDateForDB(range.start),
      p_end_date: formatDateForDB(range.end),
    });

    if (!error && data) {
      setRanking(data);
    }
    setLoading(false);
  }, [partyId, period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchRanking();

    const channel = supabase
      .channel(`ranking-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'time_entries',
          filter: `party_id=eq.${partyId}`,
        },
        () => {
          fetchRanking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyId, period, fetchRanking]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ranking, loading, refresh: fetchRanking };
}
