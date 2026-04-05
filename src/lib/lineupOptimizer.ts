import { Player, Position, getPlayerOverall } from '@/types/player';

/**
 * Tactical formations: name → slot definitions
 * Each slot has a position requirement and field coordinates (x%, y%)
 */
export interface FormationSlot {
  pos: Position[];        // accepted positions for this slot
  label: string;          // display label
  x: number;              // field x position (0-100%)
  y: number;              // field y position (0-100%, 0=own goal)
}

export interface Formation {
  name: string;
  slots: FormationSlot[];
}

export const FORMATIONS: Formation[] = [
  {
    name: '4-3-3',
    slots: [
      { pos: ['GL'], label: 'GL', x: 50, y: 6 },
      { pos: ['LD'], label: 'LD', x: 85, y: 22 },
      { pos: ['ZG'], label: 'ZG', x: 62, y: 18 },
      { pos: ['ZG'], label: 'ZG', x: 38, y: 18 },
      { pos: ['LE'], label: 'LE', x: 15, y: 22 },
      { pos: ['VO', 'ME'], label: 'VOL', x: 50, y: 38 },
      { pos: ['ME', 'VO'], label: 'ME', x: 70, y: 48 },
      { pos: ['ME', 'VO'], label: 'ME', x: 30, y: 48 },
      { pos: ['PO', 'CA'], label: 'PD', x: 82, y: 68 },
      { pos: ['CA', 'PO'], label: 'CA', x: 50, y: 74 },
      { pos: ['PO', 'CA'], label: 'PE', x: 18, y: 68 },
    ],
  },
  {
    name: '4-4-2',
    slots: [
      { pos: ['GL'], label: 'GL', x: 50, y: 6 },
      { pos: ['LD'], label: 'LD', x: 85, y: 22 },
      { pos: ['ZG'], label: 'ZG', x: 62, y: 18 },
      { pos: ['ZG'], label: 'ZG', x: 38, y: 18 },
      { pos: ['LE'], label: 'LE', x: 15, y: 22 },
      { pos: ['PO', 'ME'], label: 'MD', x: 82, y: 45 },
      { pos: ['VO', 'ME'], label: 'VOL', x: 60, y: 40 },
      { pos: ['ME', 'VO'], label: 'ME', x: 40, y: 40 },
      { pos: ['PO', 'ME'], label: 'ME', x: 18, y: 45 },
      { pos: ['CA', 'PO'], label: 'CA', x: 60, y: 70 },
      { pos: ['CA', 'PO'], label: 'CA', x: 40, y: 70 },
    ],
  },
  {
    name: '3-5-2',
    slots: [
      { pos: ['GL'], label: 'GL', x: 50, y: 6 },
      { pos: ['ZG'], label: 'ZG', x: 70, y: 18 },
      { pos: ['ZG'], label: 'ZG', x: 50, y: 15 },
      { pos: ['ZG'], label: 'ZG', x: 30, y: 18 },
      { pos: ['LD', 'PO'], label: 'ALD', x: 88, y: 40 },
      { pos: ['VO', 'ME'], label: 'VOL', x: 60, y: 35 },
      { pos: ['ME', 'VO'], label: 'ME', x: 50, y: 45 },
      { pos: ['ME', 'VO'], label: 'ME', x: 40, y: 35 },
      { pos: ['LE', 'PO'], label: 'ALE', x: 12, y: 40 },
      { pos: ['CA', 'PO'], label: 'CA', x: 60, y: 70 },
      { pos: ['CA', 'PO'], label: 'CA', x: 40, y: 70 },
    ],
  },
  {
    name: '4-2-3-1',
    slots: [
      { pos: ['GL'], label: 'GL', x: 50, y: 6 },
      { pos: ['LD'], label: 'LD', x: 85, y: 22 },
      { pos: ['ZG'], label: 'ZG', x: 62, y: 18 },
      { pos: ['ZG'], label: 'ZG', x: 38, y: 18 },
      { pos: ['LE'], label: 'LE', x: 15, y: 22 },
      { pos: ['VO', 'ME'], label: 'VOL', x: 60, y: 38 },
      { pos: ['VO', 'ME'], label: 'VOL', x: 40, y: 38 },
      { pos: ['PO', 'ME'], label: 'PD', x: 80, y: 55 },
      { pos: ['ME', 'VO'], label: 'MEI', x: 50, y: 52 },
      { pos: ['PO', 'ME'], label: 'PE', x: 20, y: 55 },
      { pos: ['CA', 'PO'], label: 'CA', x: 50, y: 74 },
    ],
  },
];

export interface LineupSlot {
  slotIndex: number;
  player: Player | null;
}

/**
 * Score function for a player in a slot.
 * Primary position match = full score, secondary = 90%, else 70%.
 */
function slotScore(player: Player, slot: FormationSlot, vScore: number): number {
  const base = vScore > 0 ? vScore : getPlayerOverall(player);
  if (slot.pos.includes(player.positionPrimary)) return base;
  if (player.positionSecondary && slot.pos.includes(player.positionSecondary as Position)) return base * 0.9;
  return base * 0.7;
}

/**
 * Best XI Optimizer: fills formation slots with highest V-Score players.
 * Uses greedy assignment with backtracking for position conflicts.
 */
export function optimizeLineup(
  formation: Formation,
  availablePlayers: Player[],
  vScores: Record<string, number>,
): LineupSlot[] {
  const slots = formation.slots;
  const result: LineupSlot[] = slots.map((_, i) => ({ slotIndex: i, player: null }));
  const used = new Set<string>();

  // Score each player for each slot
  const candidates: { slotIdx: number; playerId: string; score: number }[] = [];
  for (let si = 0; si < slots.length; si++) {
    for (const p of availablePlayers) {
      candidates.push({
        slotIdx: si,
        playerId: p.id,
        score: slotScore(p, slots[si], vScores[p.id] ?? 0),
      });
    }
  }
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Greedy assignment
  for (const c of candidates) {
    if (used.has(c.playerId)) continue;
    if (result[c.slotIdx].player !== null) continue;
    const player = availablePlayers.find(p => p.id === c.playerId)!;
    result[c.slotIdx] = { slotIndex: c.slotIdx, player };
    used.add(c.playerId);
    if (used.size === slots.length) break;
  }

  return result;
}

/**
 * Suggest captain: player with highest average points.
 */
export function suggestCaptain(lineup: LineupSlot[], vScores: Record<string, number>): string | null {
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const slot of lineup) {
    if (!slot.player) continue;
    const score = vScores[slot.player.id] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestId = slot.player.id;
    }
  }
  return bestId;
}

/**
 * Calculate total team score with captain bonus.
 */
export function calculateTeamScore(
  lineup: LineupSlot[],
  vScores: Record<string, number>,
  captainId: string | null,
): number {
  let total = 0;
  for (const slot of lineup) {
    if (!slot.player) continue;
    const score = vScores[slot.player.id] ?? getPlayerOverall(slot.player);
    total += slot.player.id === captainId ? score * 2 : score;
  }
  return total;
}
