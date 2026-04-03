import { Player } from '@/types/player';

const KEY_PREFIX = 'escalafut_';

function coachKey(coachId: string, suffix: string) {
  return `${KEY_PREFIX}${coachId}_${suffix}`;
}

export function savePlayers(coachId: string, players: Player[]) {
  localStorage.setItem(coachKey(coachId, 'players'), JSON.stringify(players));
}

export function loadPlayers(coachId: string): Player[] {
  const raw = localStorage.getItem(coachKey(coachId, 'players'));
  return raw ? JSON.parse(raw) : [];
}

export function saveLastFormation(coachId: string, formation: { teamA: Player[]; teamB: Player[] } | null) {
  localStorage.setItem(coachKey(coachId, 'formation'), JSON.stringify(formation));
}

export function loadLastFormation(coachId: string): { teamA: Player[]; teamB: Player[] } | null {
  const raw = localStorage.getItem(coachKey(coachId, 'formation'));
  return raw ? JSON.parse(raw) : null;
}

export function getLastCoachId(): string | null {
  return localStorage.getItem(`${KEY_PREFIX}lastCoach`);
}

export function setLastCoachId(id: string) {
  localStorage.setItem(`${KEY_PREFIX}lastCoach`, id);
}
