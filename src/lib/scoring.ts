import { Position } from '@/types/player';

// Scout actions that can be recorded per player per round
export const SCOUT_ACTIONS = [
  'gols', 'assistencias', 'desarmes', 'defesasDificeis',
  'jogoSemSofrerGol', 'cartaoAmarelo', 'golContra',
] as const;

export type ScoutAction = typeof SCOUT_ACTIONS[number];

export const SCOUT_LABELS: Record<ScoutAction, string> = {
  gols: 'Gols',
  assistencias: 'Assistências',
  // Bug fix: rótulo antigo dizia "Desarmes / Def. Difícil", confundindo com
  // `defesasDificeis` (que é exclusivo de goleiro). Cada scout tem semântica única.
  desarmes: 'Desarmes',
  defesasDificeis: 'Defesas Difíceis (GK)',
  jogoSemSofrerGol: 'Jogo sem Sofrer Gol',
  cartaoAmarelo: 'Cartão Amarelo',
  golContra: 'Gol Contra',
};

// Position group mapping
type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATK';

function getPosGroup(pos: Position): PosGroup {
  if (pos === 'GL') return 'GK';
  if (['ZG', 'LE', 'LD'].includes(pos)) return 'DEF';
  if (['VO', 'ME'].includes(pos)) return 'MID';
  return 'ATK'; // PO, CA
}

// Weight matrix: [GK, DEF, MID, ATK]
const WEIGHT_MATRIX: Record<ScoutAction, Record<PosGroup, number>> = {
  gols:              { GK: 10,  DEF: 8,   MID: 6,   ATK: 5 },
  assistencias:      { GK: 7,   DEF: 6,   MID: 5,   ATK: 5 },
  jogoSemSofrerGol:  { GK: 5,   DEF: 5,   MID: 0,   ATK: 0 },
  desarmes:          { GK: 1.5, DEF: 1.2, MID: 1,   ATK: 0.5 },
  defesasDificeis:   { GK: 1.5, DEF: 0,   MID: 0,   ATK: 0 },
  cartaoAmarelo:     { GK: -2,  DEF: -2,  MID: -2,  ATK: -2 },
  golContra:         { GK: -5,  DEF: -5,  MID: -5,  ATK: -5 },
};

export interface Scouts {
  [key: string]: number;
}

export function calculatePoints(scouts: Scouts, position: Position): number {
  const group = getPosGroup(position);
  let total = 0;
  for (const action of SCOUT_ACTIONS) {
    const count = scouts[action] ?? 0;
    total += count * WEIGHT_MATRIX[action][group];
  }
  return total;
}

/**
 * V-Score: weighted average of last 5 rounds
 * V = (P1*1.5 + P2*1.2 + P3 + P4 + P5) / 5
 * P1 = most recent, P5 = oldest
 */
export function calculateVScore(pointsHistory: number[]): number {
  if (!pointsHistory.length) return 0;
  const weights = [1.5, 1.2, 1, 1, 1];
  const last5 = pointsHistory.slice(-5).reverse(); // most recent first
  let total = 0;
  for (let i = 0; i < last5.length; i++) {
    total += last5[i] * (weights[i] ?? 1);
  }
  return total / Math.min(last5.length, 5);
}
