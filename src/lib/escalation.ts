import { Player, Position, getSectorAvg } from '@/types/player';

const DEFENSE_POS: Position[] = ['ZG', 'LD', 'LE', 'VO'];
const ATTACK_POS: Position[] = ['ME', 'PO', 'CA'];
const SECTORS = ['tecnico', 'fisico', 'tatico', 'psicologico'];

interface MinReq { pos: Position; count: number }
const MIN_REQUIREMENTS: MinReq[] = [
  { pos: 'GL', count: 1 }, { pos: 'ZG', count: 2 },
  { pos: 'VO', count: 1 }, { pos: 'ME', count: 1 },
];
// At least 1 CA or PO each team
const MIN_ATTACK = 1;

// Ensure each team has at least 1 LE and 1 LD (can use secondary position or adapt)
function ensureLaterals(team: Player[]): boolean {
  const hasLE = team.some(p => p.positionPrimary === 'LE' || p.positionSecondary === 'LE' || p.positionPrimary === 'LD');
  const hasLD = team.some(p => p.positionPrimary === 'LD' || p.positionSecondary === 'LD' || p.positionPrimary === 'LE');
  return hasLE && hasLD;
}

function teamSectorAvg(team: Player[], sector: string): number {
  if (!team.length) return 0;
  return team.reduce((s, p) => s + getSectorAvg(p, sector), 0) / team.length;
}

function teamImbalance(a: Player[], b: Player[]): number {
  let diff = 0;
  for (const sec of SECTORS) {
    diff += Math.abs(teamSectorAvg(a, sec) - teamSectorAvg(b, sec));
  }
  return diff;
}

function countPos(team: Player[], pos: Position): number {
  return team.filter(p => p.positionPrimary === pos || p.positionSecondary === pos).length;
}

function meetsMinimums(team: Player[]): boolean {
  for (const req of MIN_REQUIREMENTS) {
    if (countPos(team, req.pos) < req.count) return false;
  }
  const attackCount = team.filter(p =>
    p.positionPrimary === 'CA' || p.positionPrimary === 'PO' ||
    p.positionSecondary === 'CA' || p.positionSecondary === 'PO'
  ).length;
  if (attackCount < MIN_ATTACK) return false;
  return true;
}

export function computeTeamSectorAvg(team: Player[], sector: string): number {
  return teamSectorAvg(team, sector);
}

export function computeImbalance(a: Player[], b: Player[]): number {
  return teamImbalance(a, b);
}

export function generateTeams(players: Player[]): { teamA: Player[]; teamB: Player[]; imbalance: number } {
  const active = players.filter(p => p.active);
  if (active.length < 14) throw new Error('Mínimo de 14 jogadores ativos necessário');

  const perTeam = Math.floor(active.length / 2);

  // Sort by position groups then overall to get a good initial split
  const sorted = [...active];

  // Initial greedy split: alternate assigning by position group
  const gks = sorted.filter(p => p.positionPrimary === 'GL');
  const defs = sorted.filter(p => DEFENSE_POS.includes(p.positionPrimary));
  const atks = sorted.filter(p => ATTACK_POS.includes(p.positionPrimary));

  let teamA: Player[] = [];
  let teamB: Player[] = [];

  // Distribute each group alternately
  const distribute = (group: Player[]) => {
    // Sort by overall desc for fairness
    group.sort((a, b) => getSectorAvg(b, 'tecnico') - getSectorAvg(a, 'tecnico'));
    for (let i = 0; i < group.length; i++) {
      if (teamA.length <= teamB.length) teamA.push(group[i]);
      else teamB.push(group[i]);
    }
  };

  distribute(gks);
  distribute(defs);
  distribute(atks);

  // Balance team sizes
  while (teamA.length > perTeam && teamB.length < perTeam) {
    teamB.push(teamA.pop()!);
  }
  while (teamB.length > perTeam && teamA.length < perTeam) {
    teamA.push(teamB.pop()!);
  }

  // Swap optimization: try swapping players to minimize imbalance
  let bestImbalance = teamImbalance(teamA, teamB);
  let improved = true;
  let iterations = 0;
  const MAX_ITER = 500;

  while (improved && iterations < MAX_ITER) {
    improved = false;
    iterations++;
    for (let i = 0; i < teamA.length; i++) {
      for (let j = 0; j < teamB.length; j++) {
        // Try swap
        [teamA[i], teamB[j]] = [teamB[j], teamA[i]];
        const valid = meetsMinimums(teamA) && meetsMinimums(teamB);
        const newImb = teamImbalance(teamA, teamB);
        if (valid && newImb < bestImbalance - 0.001) {
          bestImbalance = newImb;
          improved = true;
        } else {
          // Revert
          [teamA[i], teamB[j]] = [teamB[j], teamA[i]];
        }
      }
    }
  }

  return { teamA, teamB, imbalance: bestImbalance };
}
