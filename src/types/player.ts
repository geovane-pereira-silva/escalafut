export const POSITIONS = ['GL', 'ZG', 'LE', 'LD', 'VO', 'ME', 'PO', 'CA'] as const;
export type Position = typeof POSITIONS[number];

export const POSITION_LABELS: Record<Position, string> = {
  GL: 'Goleiro', ZG: 'Zagueiro', LE: 'Lateral Esq.', LD: 'Lateral Dir.',
  VO: 'Volante', ME: 'Meia', PO: 'Ponta', CA: 'Centroavante',
};

// Skills visible for field players
export const FIELD_SKILLS = [
  // Técnicas
  'passeCurto', 'passeLongo', 'chuteLongaDist', 'chuteCurtaDist',
  'drible', 'dominio', 'faltaLongaDist', 'faltaCurtaDist',
  // Físicas
  'velocidade', 'resistencia', 'forca', 'agilidade',
  // Táticas
  'posicionamento', 'visao', 'marcacao', 'cobertura',
  'cabeceioAtaque', 'cabeceioDefesa',
  // Psicológicas
  'determinacao', 'comunicacao', 'espiritoEquipe', 'frieza', 'capacidadeMarcarGol',
  // Gerais
  'defesaGeral', 'ataqueGeral', 'criacao',
] as const;

// Skills visible only for goalkeepers
export const GK_ONLY_SKILLS = [
  'qualidadeGoleiro', 'defensorPenalti', 'defensorFaltas',
] as const;

// Skills hidden for GK
export const GK_HIDDEN_SKILLS = [
  'drible', 'cabeceioAtaque', 'resistencia', 'cobertura', 'ataqueGeral', 'capacidadeMarcarGol',
] as const;

export const SKILL_LABELS: Record<string, string> = {
  passeCurto: 'Passe Curto', passeLongo: 'Passe Longo',
  chuteLongaDist: 'Chute Longa Dist.', chuteCurtaDist: 'Chute Curta Dist.',
  drible: 'Drible', dominio: 'Domínio',
  faltaLongaDist: 'Falta Longa Dist.', faltaCurtaDist: 'Falta Curta Dist.',
  velocidade: 'Velocidade', resistencia: 'Resistência', forca: 'Força', agilidade: 'Agilidade',
  posicionamento: 'Posicionamento', visao: 'Visão', marcacao: 'Marcação', cobertura: 'Cobertura',
  cabeceioAtaque: 'Cabeceio Ataque', cabeceioDefesa: 'Cabeceio Defesa',
  determinacao: 'Determinação', comunicacao: 'Comunicação',
  espiritoEquipe: 'Espírito Equipe', frieza: 'Frieza',
  capacidadeMarcarGol: 'Cap. Marcar Gol',
  defesaGeral: 'Defesa Geral', ataqueGeral: 'Ataque Geral', criacao: 'Criação',
  qualidadeGoleiro: 'Qualid. Goleiro', defensorPenalti: 'Def. Pênalti', defensorFaltas: 'Def. Faltas',
};

export const SKILL_ABBR: Record<string, string> = {
  passeCurto: 'PC', passeLongo: 'PL', chuteLongaDist: 'CLD', chuteCurtaDist: 'CCD',
  drible: 'DRI', dominio: 'DOM', faltaLongaDist: 'FLD', faltaCurtaDist: 'FCD',
  velocidade: 'VEL', resistencia: 'RES', forca: 'FOR', agilidade: 'AGI',
  posicionamento: 'POS', visao: 'VIS', marcacao: 'MAR', cobertura: 'COB',
  cabeceioAtaque: 'CBA', cabeceioDefesa: 'CBD',
  determinacao: 'DET', comunicacao: 'COM', espiritoEquipe: 'EQP', frieza: 'FRI',
  capacidadeMarcarGol: 'GOL', defesaGeral: 'DEF', ataqueGeral: 'ATQ', criacao: 'CRI',
  qualidadeGoleiro: 'QGL', defensorPenalti: 'DPE', defensorFaltas: 'DFA',
};

// Weights for scoring
export const SKILL_WEIGHTS: Record<string, number> = {
  faltaLongaDist: 1.25, faltaCurtaDist: 1.25,
  velocidade: 1.15, resistencia: 1.15, forca: 1.15, agilidade: 1.15,
  capacidadeMarcarGol: 1.25,
  qualidadeGoleiro: 1.3, defensorPenalti: 1.2, defensorFaltas: 1.2,
};

// GK gets extra weight for these
export const GK_EXTRA_WEIGHTS: Record<string, number> = {
  passeLongo: 1.2, agilidade: 1.2,
};

export const SKILL_SECTORS: Record<string, string> = {
  passeCurto: 'tecnico', passeLongo: 'tecnico', chuteLongaDist: 'tecnico', chuteCurtaDist: 'tecnico',
  drible: 'tecnico', dominio: 'tecnico', faltaLongaDist: 'tecnico', faltaCurtaDist: 'tecnico',
  velocidade: 'fisico', resistencia: 'fisico', forca: 'fisico', agilidade: 'fisico',
  posicionamento: 'tatico', visao: 'tatico', marcacao: 'tatico', cobertura: 'tatico',
  cabeceioAtaque: 'tatico', cabeceioDefesa: 'tatico',
  determinacao: 'psicologico', comunicacao: 'psicologico', espiritoEquipe: 'psicologico',
  frieza: 'psicologico', capacidadeMarcarGol: 'psicologico',
  defesaGeral: 'geral', ataqueGeral: 'geral', criacao: 'geral',
  qualidadeGoleiro: 'goleiro', defensorPenalti: 'goleiro', defensorFaltas: 'goleiro',
};

export interface PlayerSkills {
  [key: string]: number;
}

export interface Player {
  id: string;
  name: string;
  active: boolean;
  positionPrimary: Position;
  positionSecondary: Position | '';
  skills: PlayerSkills;
}

export function getVisibleSkills(pos: Position): string[] {
  if (pos === 'GL') {
    const hidden = new Set(GK_HIDDEN_SKILLS as readonly string[]);
    const fieldVisible = (FIELD_SKILLS as readonly string[]).filter(s => !hidden.has(s));
    return [...fieldVisible, ...(GK_ONLY_SKILLS as readonly string[])];
  }
  return [...(FIELD_SKILLS as readonly string[])];
}

export function getPlayerOverall(player: Player): number {
  const visible = getVisibleSkills(player.positionPrimary);
  let total = 0, weightSum = 0;
  for (const sk of visible) {
    let w = SKILL_WEIGHTS[sk] ?? 1;
    if (player.positionPrimary === 'GL' && GK_EXTRA_WEIGHTS[sk]) {
      w = GK_EXTRA_WEIGHTS[sk];
    }
    total += (player.skills[sk] ?? 0) * w;
    weightSum += w;
  }
  return weightSum ? total / weightSum : 0;
}

export function getSectorAvg(player: Player, sector: string): number {
  const visible = getVisibleSkills(player.positionPrimary);
  const sectorSkills = visible.filter(s => SKILL_SECTORS[s] === sector);
  if (!sectorSkills.length) return 0;
  let total = 0, wSum = 0;
  for (const sk of sectorSkills) {
    let w = SKILL_WEIGHTS[sk] ?? 1;
    if (player.positionPrimary === 'GL' && GK_EXTRA_WEIGHTS[sk]) w = GK_EXTRA_WEIGHTS[sk];
    total += (player.skills[sk] ?? 0) * w;
    wSum += w;
  }
  return wSum ? total / wSum : 0;
}
