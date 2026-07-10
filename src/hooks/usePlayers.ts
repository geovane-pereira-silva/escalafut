import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player, Position } from '@/types/player';
import { toast } from 'sonner';

/**
 * Hook de acesso aos jogadores no backend.
 *
 * Responsabilidades:
 * - Carregar jogadores do técnico (via `coach_id`) na montagem;
 * - Persistir criação/edição/exclusão com feedback via toast;
 * - Garantir estado `loading` correto mesmo em erros (usa try/finally).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToPlayer(row: any): Player {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    escalavel: row.escalavel ?? true,
    positionPrimary: row.position_primary as Position,
    positionSecondary: (row.position_secondary || '') as Position | '',
    skills: row.skills ?? {},
  };
}

function playerToDb(player: Player, coachId: string) {
  return {
    id: player.id,
    coach_id: coachId,
    name: player.name,
    active: player.active,
    escalavel: player.escalavel ?? true,
    position_primary: player.positionPrimary,
    position_secondary: player.positionSecondary || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skills: player.skills as any,
  };
}

export function usePlayers(coachId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlayers = useCallback(async () => {
    if (!coachId) {
      setPlayers([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');
      if (error) {
        toast.error('Erro ao carregar jogadores');
        return;
      }
      setPlayers((data ?? []).map(dbToPlayer));
    } catch (err) {
      // Defesa contra falhas de rede/parse
      console.error('[usePlayers.fetchPlayers]', err);
      toast.error('Falha inesperada ao carregar jogadores');
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const savePlayer = useCallback(
    async (player: Player) => {
      if (!coachId) return;
      // Auto-capitaliza cada palavra do nome antes de salvar
      const capitalized = {
        ...player,
        name: player.name.replace(/\b\w/g, (c) => c.toUpperCase()),
      };
      const row = playerToDb(capitalized, coachId);
      const { error } = await supabase
        .from('players')
        .upsert(row, { onConflict: 'id' });
      if (error) {
        console.error('[usePlayers.savePlayer]', error);
        toast.error('Erro ao salvar jogador');
        return;
      }
      await fetchPlayers();
    },
    [coachId, fetchPlayers],
  );

  const deletePlayer = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) {
        console.error('[usePlayers.deletePlayer]', error);
        toast.error('Erro ao excluir jogador');
        return;
      }
      await fetchPlayers();
    },
    [fetchPlayers],
  );

  const importPlayers = useCallback(
    async (newPlayers: Player[]) => {
      if (!coachId) return;
      const rows = newPlayers.map((p) => playerToDb(p, coachId));
      const { error } = await supabase
        .from('players')
        .upsert(rows, { onConflict: 'id' });
      if (error) {
        console.error('[usePlayers.importPlayers]', error);
        toast.error('Erro ao importar jogadores');
        return;
      }
      await fetchPlayers();
    },
    [coachId, fetchPlayers],
  );

  return {
    players,
    loading,
    savePlayer,
    deletePlayer,
    importPlayers,
    refetch: fetchPlayers,
  };
}
