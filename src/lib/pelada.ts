import { supabase } from '@/integrations/supabase/client';

/**
 * Pelada padrão enquanto não temos seleção multi-pelada.
 * Todas as inserções em `players` e `rounds` são carimbadas com este id.
 * A Parte 2 (admin/hierarquia) introduzirá vínculo usuário↔pelada real.
 */
export const DEFAULT_PELADA_NAME = 'AABB PIEAD';

let cachedPeladaId: string | null = null;
let inflight: Promise<string | null> | null = null;

export async function getDefaultPeladaId(): Promise<string | null> {
  if (cachedPeladaId) return cachedPeladaId;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from('peladas')
      .select('id')
      .eq('name', DEFAULT_PELADA_NAME)
      .maybeSingle();
    if (error) {
      console.error('[getDefaultPeladaId]', error);
      inflight = null;
      return null;
    }
    cachedPeladaId = data?.id ?? null;
    inflight = null;
    return cachedPeladaId;
  })();
  return inflight;
}
