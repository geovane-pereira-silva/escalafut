import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player, PlayerSkills, Position } from '@/types/player';
import { toast } from 'sonner';

// Skills are stored in DB on a 0-20 scale (legacy) but displayed/edited on 0-100.
// Convert at the boundary. If a value looks already in the 0-100 range (>20),
// treat it as such and don't double-scale.
function scaleUp(skills: any): PlayerSkills {
  const out: PlayerSkills = {};
  const src = skills ?? {};
  for (const k of Object.keys(src)) {
    const v = Number(src[k]) || 0;
    out[k] = v > 20 ? Math.min(100, Math.round(v)) : Math.min(100, Math.round(v * 5));
  }
  return out;
}
function scaleDown(skills: PlayerSkills): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(skills ?? {})) {
    const v = Number(skills[k]) || 0;
    out[k] = Math.max(0, Math.min(20, Math.round(v / 5)));
  }
  return out;
}

function dbToPlayer(row: any): Player {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    escalavel: row.escalavel ?? true,
    positionPrimary: row.position_primary as Position,
    positionSecondary: (row.position_secondary || '') as Position | '',
    skills: scaleUp(row.skills),
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
    skills: scaleDown(player.skills) as any,
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
    // Auto-capitalize player name
    const capitalized = { ...player, name: player.name.replace(/\b\w/g, c => c.toUpperCase()) };
    const row = playerToDb(capitalized, coachId);
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
