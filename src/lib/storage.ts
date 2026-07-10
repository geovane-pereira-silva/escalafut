import { Player } from '@/types/player';

/**
 * Wrapper seguro sobre localStorage.
 *
 * Motivação: em Safari em modo privado, storage cheia, ou contextos
 * onde `window.localStorage` lança (SecurityError, QuotaExceededError),
 * qualquer chamada nua quebra o app inteiro. Aqui degradamos para
 * um fallback em memória para o app continuar funcional na sessão.
 */

const KEY_PREFIX = 'escalafut_';

// Fallback em memória quando localStorage não está disponível.
const memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore[key] ?? null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStore[key] = value;
  }
}

function coachKey(coachId: string, suffix: string) {
  return `${KEY_PREFIX}${coachId}_${suffix}`;
}

/** Persiste a lista de jogadores localmente para o técnico informado. */
export function savePlayers(coachId: string, players: Player[]) {
  safeSet(coachKey(coachId, 'players'), JSON.stringify(players));
}

/** Recupera a lista local de jogadores; retorna [] se ausente ou corrompida. */
export function loadPlayers(coachId: string): Player[] {
  const raw = safeGet(coachKey(coachId, 'players'));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persiste a última formação sorteada para restauração rápida. */
export function saveLastFormation(
  coachId: string,
  formation: { teamA: Player[]; teamB: Player[] } | null,
) {
  safeSet(coachKey(coachId, 'formation'), JSON.stringify(formation));
}

/** Restaura a última formação sorteada; retorna null se ausente/corrompida. */
export function loadLastFormation(
  coachId: string,
): { teamA: Player[]; teamB: Player[] } | null {
  const raw = safeGet(coachKey(coachId, 'formation'));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** ID do último técnico logado; usado para retomar sessão. */
export function getLastCoachId(): string | null {
  return safeGet(`${KEY_PREFIX}lastCoach`);
}

export function setLastCoachId(id: string) {
  safeSet(`${KEY_PREFIX}lastCoach`, id);
}
