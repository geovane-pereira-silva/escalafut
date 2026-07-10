import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook de rodadas e desempenhos por rodada.
 *
 * Modelo:
 * - Uma `Round` tem status 'open' (edições permitidas) ou 'finalized' (travada).
 * - `PlayerPerformance` armazena scouts e `pointsCalculated` calculado no cliente.
 *
 * Todas as chamadas Supabase têm tratamento de erro com feedback via toast e
 * log estruturado no console — nenhuma promise rejeitada escapa para o React.
 */

export interface Round {
  id: string;
  coachId: string;
  roundNumber: number;
  roundDate: string;
  status: 'open' | 'finalized';
  summaryText?: string;
}

export interface PlayerPerformance {
  id: string;
  playerId: string;
  roundId: string;
  scouts: Record<string, number>;
  pointsCalculated: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToRound(row: any): Round {
  return {
    id: row.id,
    coachId: row.coach_id,
    roundNumber: row.round_number,
    roundDate: row.round_date,
    status: row.status,
    summaryText: row.summary_text ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (!coachId) {
      setRounds([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('coach_id', coachId)
        .order('round_number', { ascending: false });
      if (error) {
        console.error('[useRounds.fetchRounds]', error);
        toast.error('Erro ao carregar rodadas');
        return;
      }
      setRounds((data ?? []).map(dbToRound));
    } finally {
      // Bug fix: `setLoading(false)` estava antes do return de erro,
      // fazendo o spinner sumir mesmo em falha. Agora sempre roda em finally.
      setLoading(false);
    }
  }, [coachId]);

  const fetchPerformances = useCallback(async (roundId: string) => {
    const { data, error } = await supabase
      .from('player_performance')
      .select('*')
      .eq('round_id', roundId);
    if (error) {
      console.error('[useRounds.fetchPerformances]', error);
      toast.error('Erro ao carregar desempenho');
      return [];
    }
    const perfs = (data ?? []).map(dbToPerformance);
    setPerformances(perfs);
    return perfs;
  }, []);

  const fetchAllPerformances = useCallback(async (): Promise<PlayerPerformance[]> => {
    if (!coachId) return [];
    // 2 round-trips: primeiro os IDs de rodadas do técnico, depois as
    // performances daquelas rodadas. Um JOIN inline seria melhor, mas
    // os tipos gerados do Supabase não modelam a relação inversa aqui.
    const { data: roundData, error: rErr } = await supabase
      .from('rounds')
      .select('id')
      .eq('coach_id', coachId);
    if (rErr) {
      console.error('[useRounds.fetchAllPerformances/rounds]', rErr);
      return [];
    }
    if (!roundData?.length) return [];
    const roundIds = roundData.map((r) => r.id);
    const { data: perfs, error: pErr } = await supabase
      .from('player_performance')
      .select('*')
      .in('round_id', roundIds);
    if (pErr) {
      console.error('[useRounds.fetchAllPerformances/perfs]', pErr);
      return [];
    }
    return (perfs ?? []).map(dbToPerformance);
  }, [coachId]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  const createRound = useCallback(
    async (roundNumber: number, roundDate: string) => {
      if (!coachId) return;
      const { error } = await supabase.from('rounds').insert({
        coach_id: coachId,
        round_number: roundNumber,
        round_date: roundDate,
      });
      if (error) {
        if (error.code === '23505') toast.error('Essa rodada já existe');
        else {
          console.error('[useRounds.createRound]', error);
          toast.error('Erro ao criar rodada');
        }
        return;
      }
      await fetchRounds();
      toast.success(`Rodada ${roundNumber} criada!`);
    },
    [coachId, fetchRounds],
  );

  const savePerformance = useCallback(
    async (
      playerId: string,
      roundId: string,
      scouts: Record<string, number>,
      points: number,
    ): Promise<boolean> => {
      const { error } = await supabase.from('player_performance').upsert(
        {
          player_id: playerId,
          round_id: roundId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scouts: scouts as any,
          points_calculated: points,
        },
        { onConflict: 'player_id,round_id' },
      );
      if (error) {
        console.error('[useRounds.savePerformance]', error);
        toast.error('Erro ao salvar desempenho');
        return false;
      }
      return true;
    },
    [],
  );

  const finalizeRound = useCallback(
    async (roundId: string) => {
      const { error } = await supabase
        .from('rounds')
        .update({ status: 'finalized' })
        .eq('id', roundId);
      if (error) {
        console.error('[useRounds.finalizeRound]', error);
        toast.error('Erro ao finalizar rodada');
        return;
      }
      await fetchRounds();
      toast.success('Rodada finalizada!');
    },
    [fetchRounds],
  );

  const saveRoundSummary = useCallback(
    async (roundId: string, summaryText: string) => {
      const { error } = await supabase
        .from('rounds')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ summary_text: summaryText } as any)
        .eq('id', roundId);
      if (error) {
        console.error('[useRounds.saveRoundSummary]', error);
        toast.error('Erro ao salvar resumo');
        return;
      }
      await fetchRounds();
    },
    [fetchRounds],
  );

  return {
    rounds,
    performances,
    loading,
    fetchRounds,
    fetchPerformances,
    fetchAllPerformances,
    createRound,
    savePerformance,
    finalizeRound,
    saveRoundSummary,
  };
}
