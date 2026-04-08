import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player, PlayerSkills, Position } from '@/types/player';
import { toast } from 'sonner';

function dbToPlayer(row: any): Player {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    escalavel: row.escalavel ?? true,
    positionPrimary: row.position_primary as Position,
    positionSecondary: (row.position_secondary || '') as Position | '',
    skills: (row.skills ?? {}) as PlayerSkills,
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
    skills: player.skills as any,
  };
}

export function usePlayers(coachId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlayers = useCallback(async () => {
    if (!coachId) { setPlayers([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name');
    setLoading(false);
    if (error) { toast.error('Erro ao carregar jogadores'); return; }
    setPlayers((data ?? []).map(dbToPlayer));
  }, [coachId]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const savePlayer = useCallback(async (player: Player) => {
    if (!coachId) return;
    const row = playerToDb(player, coachId);
    const { error } = await supabase.from('players').upsert(row, { onConflict: 'id' });
    if (error) { toast.error('Erro ao salvar jogador'); return; }
    await fetchPlayers();
  }, [coachId, fetchPlayers]);

  const deletePlayer = useCallback(async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir jogador'); return; }
    await fetchPlayers();
  }, [fetchPlayers]);

  const importPlayers = useCallback(async (newPlayers: Player[]) => {
    if (!coachId) return;
    const rows = newPlayers.map(p => playerToDb(p, coachId));
    const { error } = await supabase.from('players').upsert(rows, { onConflict: 'id' });
    if (error) { toast.error('Erro ao importar jogadores'); return; }
    await fetchPlayers();
  }, [coachId, fetchPlayers]);

  return { players, loading, savePlayer, deletePlayer, importPlayers, refetch: fetchPlayers };
}
