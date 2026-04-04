import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Round {
  id: string;
  coachId: string;
  roundNumber: number;
  roundDate: string;
  status: 'open' | 'finalized';
}

export interface PlayerPerformance {
  id: string;
  playerId: string;
  roundId: string;
  scouts: Record<string, number>;
  pointsCalculated: number;
}

function dbToRound(row: any): Round {
  return {
    id: row.id,
    coachId: row.coach_id,
    roundNumber: row.round_number,
    roundDate: row.round_date,
    status: row.status,
  };
}

function dbToPerformance(row: any): PlayerPerformance {
  return {
    id: row.id,
    playerId: row.player_id,
    roundId: row.round_id,
    scouts: (row.scouts ?? {}) as Record<string, number>,
    pointsCalculated: row.points_calculated ?? 0,
  };
}

export function useRounds(coachId: string | null) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [performances, setPerformances] = useState<PlayerPerformance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRounds = useCallback(async () => {
    if (!coachId) { setRounds([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('coach_id', coachId)
      .order('round_number', { ascending: false });
    setLoading(false);
    if (error) { toast.error('Erro ao carregar rodadas'); return; }
    setRounds((data ?? []).map(dbToRound));
  }, [coachId]);

  const fetchPerformances = useCallback(async (roundId: string) => {
    const { data, error } = await supabase
      .from('player_performance')
      .select('*')
      .eq('round_id', roundId);
    if (error) { toast.error('Erro ao carregar desempenho'); return []; }
    const perfs = (data ?? []).map(dbToPerformance);
    setPerformances(perfs);
    return perfs;
  }, []);

  const fetchAllPerformances = useCallback(async () => {
    if (!coachId) return [];
    // Get all round IDs for this coach
    const { data: roundData } = await supabase
      .from('rounds')
      .select('id')
      .eq('coach_id', coachId);
    if (!roundData?.length) return [];
    const roundIds = roundData.map(r => r.id);
    const { data, error } = await supabase
      .from('player_performance')
      .select('*')
      .in('round_id', roundIds);
    if (error) return [];
    return (data ?? []).map(dbToPerformance);
  }, [coachId]);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  const createRound = useCallback(async (roundNumber: number, roundDate: string) => {
    if (!coachId) return;
    const { error } = await supabase.from('rounds').insert({
      coach_id: coachId,
      round_number: roundNumber,
      round_date: roundDate,
    });
    if (error) {
      if (error.code === '23505') toast.error('Essa rodada já existe');
      else toast.error('Erro ao criar rodada');
      return;
    }
    await fetchRounds();
    toast.success(`Rodada ${roundNumber} criada!`);
  }, [coachId, fetchRounds]);

  const savePerformance = useCallback(async (
    playerId: string, roundId: string, scouts: Record<string, number>, points: number
  ) => {
    const { error } = await supabase
      .from('player_performance')
      .upsert({
        player_id: playerId,
        round_id: roundId,
        scouts: scouts as any,
        points_calculated: points,
      }, { onConflict: 'player_id,round_id' });
    if (error) { toast.error('Erro ao salvar desempenho'); return; }
  }, []);

  const finalizeRound = useCallback(async (roundId: string) => {
    const { error } = await supabase
      .from('rounds')
      .update({ status: 'finalized' })
      .eq('id', roundId);
    if (error) { toast.error('Erro ao finalizar rodada'); return; }
    await fetchRounds();
    toast.success('Rodada finalizada!');
  }, [fetchRounds]);

  return {
    rounds, performances, loading,
    fetchRounds, fetchPerformances, fetchAllPerformances,
    createRound, savePerformance, finalizeRound,
  };
}
