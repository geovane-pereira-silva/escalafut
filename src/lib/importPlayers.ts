import { Player, Position } from '@/types/player';

const POS_MAP: Record<string, Position> = {
  GOLEIRO: 'GL', ZAGUEIRO: 'ZG', LATERAL: 'LE', VOLANTE: 'VO',
  MEIA: 'ME', ATACANTE: 'CA',
};

// Spread a 0-10 value across multiple skills (scale to 0-20)
function spread(val: number, keys: string[], variance = 1): Record<string, number> {
  const base = Math.round(val * 2);
  const result: Record<string, number> = {};
  keys.forEach((k, i) => {
    const offset = (i % 2 === 0 ? variance : -variance);
    result[k] = Math.max(0, Math.min(20, base + offset));
  });
  return result;
}

function mapSkills(ataque: number, defesa: number, velocidade: number, apoio: number, folego: number, pos: Position): Record<string, number> {
  const s: Record<string, number> = {};
  const a = spread(ataque, ['chuteCurtaDist', 'chuteLongaDist', 'ataqueGeral', 'capacidadeMarcarGol']);
  const d = spread(defesa, ['defesaGeral', 'marcacao', 'cabeceioDefesa', 'posicionamento', 'cobertura']);
  const v = spread(velocidade, ['velocidade', 'agilidade']);
  const ap = spread(apoio, ['passeCurto', 'passeLongo', 'visao', 'criacao', 'comunicacao', 'espiritoEquipe', 'dominio']);
  const f = spread(folego, ['resistencia', 'forca', 'determinacao', 'frieza']);
  // Fill remaining
  const misc = spread(Math.round((ataque + apoio) / 2), ['drible', 'faltaLongaDist', 'faltaCurtaDist', 'cabeceioAtaque']);
  Object.assign(s, a, d, v, ap, f, misc);
  if (pos === 'GL') {
    const gk = Math.round((defesa + apoio) / 2);
    s.qualidadeGoleiro = Math.min(20, gk * 2);
    s.defensorPenalti = Math.min(20, Math.round(defesa * 2));
    s.defensorFaltas = Math.min(20, Math.round(defesa * 1.8));
  }
  return s;
}

interface RawPlayer {
  name: string; pos1: string; pos2: string;
  ataque: number; defesa: number; velocidade: number; apoio: number; folego: number;
}

const RAW: RawPlayer[] = [
  { name: 'Alex', pos1: 'GOLEIRO', pos2: 'GOLEIRO', ataque: 2, defesa: 6, velocidade: 5, apoio: 5, folego: 6 },
  { name: 'Daniel', pos1: 'GOLEIRO', pos2: 'LATERAL', ataque: 3, defesa: 8, velocidade: 4, apoio: 6, folego: 4 },
  { name: 'Glauco', pos1: 'GOLEIRO', pos2: 'GOLEIRO', ataque: 3, defesa: 7, velocidade: 6, apoio: 6, folego: 7 },
  { name: 'Aldo', pos1: 'VOLANTE', pos2: 'ZAGUEIRO', ataque: 3, defesa: 6, velocidade: 5, apoio: 5, folego: 5 },
  { name: 'Alessandro', pos1: 'ZAGUEIRO', pos2: 'VOLANTE', ataque: 5, defesa: 9, velocidade: 8, apoio: 8, folego: 9 },
  { name: 'Alex', pos1: 'MEIA', pos2: 'VOLANTE', ataque: 7, defesa: 6, velocidade: 5, apoio: 8, folego: 7 },
  { name: 'Bi', pos1: 'VOLANTE', pos2: 'LATERAL', ataque: 6, defesa: 8, velocidade: 9, apoio: 8, folego: 9 },
  { name: 'Cucurela', pos1: 'ZAGUEIRO', pos2: 'VOLANTE', ataque: 3, defesa: 6, velocidade: 4, apoio: 6, folego: 6 },
  { name: 'Dudu', pos1: 'ATACANTE', pos2: 'MEIA', ataque: 10, defesa: 7, velocidade: 6, apoio: 8, folego: 6 },
  { name: 'Durval', pos1: 'LATERAL', pos2: 'VOLANTE', ataque: 7, defesa: 8, velocidade: 6, apoio: 6, folego: 4 },
  { name: 'Eduardo', pos1: 'LATERAL', pos2: 'ATACANTE', ataque: 3, defesa: 6, velocidade: 4, apoio: 6, folego: 4 },
  { name: 'Everton', pos1: 'MEIA', pos2: 'ATACANTE', ataque: 7, defesa: 4, velocidade: 3, apoio: 7, folego: 5 },
  { name: 'Felipe U', pos1: 'MEIA', pos2: 'VOLANTE', ataque: 8, defesa: 7, velocidade: 8, apoio: 7, folego: 5 },
  { name: 'Felype', pos1: 'LATERAL', pos2: 'ATACANTE', ataque: 3, defesa: 3, velocidade: 6, apoio: 4, folego: 6 },
  { name: 'Letrinha', pos1: 'ATACANTE', pos2: 'ATACANTE', ataque: 7, defesa: 4, velocidade: 7, apoio: 6, folego: 7 },
  { name: 'Gabriel Silva', pos1: 'VOLANTE', pos2: 'ZAGUEIRO', ataque: 4, defesa: 8, velocidade: 7, apoio: 8, folego: 8 },
  { name: 'Geovane', pos1: 'ATACANTE', pos2: 'LATERAL', ataque: 6, defesa: 2, velocidade: 4, apoio: 4, folego: 2 },
  { name: 'Glauco', pos1: 'VOLANTE', pos2: 'LATERAL', ataque: 6, defesa: 7, velocidade: 6, apoio: 4, folego: 7 },
  { name: 'Hudson', pos1: 'MEIA', pos2: 'VOLANTE', ataque: 9, defesa: 7, velocidade: 7, apoio: 9, folego: 6 },
  { name: 'Isaac', pos1: 'ZAGUEIRO', pos2: 'VOLANTE', ataque: 7, defesa: 10, velocidade: 6, apoio: 8, folego: 6 },
  { name: 'Joao Gabriel', pos1: 'MEIA', pos2: 'ATACANTE', ataque: 10, defesa: 8, velocidade: 9, apoio: 8, folego: 10 },
  { name: 'Joao Victor', pos1: 'LATERAL', pos2: 'ATACANTE', ataque: 3, defesa: 3, velocidade: 3, apoio: 7, folego: 4 },
  { name: 'Le Florinda', pos1: 'ATACANTE', pos2: 'ATACANTE', ataque: 8, defesa: 4, velocidade: 6, apoio: 8, folego: 5 },
  { name: 'Leandrinho', pos1: 'LATERAL', pos2: 'LATERAL', ataque: 6, defesa: 6, velocidade: 8, apoio: 6, folego: 8 },
  { name: 'Lucas', pos1: 'LATERAL', pos2: 'VOLANTE', ataque: 7, defesa: 8, velocidade: 10, apoio: 10, folego: 9 },
  { name: 'Lucas Volt', pos1: 'ZAGUEIRO', pos2: 'ZAGUEIRO', ataque: 3, defesa: 6, velocidade: 6, apoio: 6, folego: 5 },
  { name: 'Marcelo', pos1: 'ATACANTE', pos2: 'ATACANTE', ataque: 9, defesa: 3, velocidade: 5, apoio: 7, folego: 5 },
  { name: 'Michel', pos1: 'VOLANTE', pos2: 'ZAGUEIRO', ataque: 7, defesa: 9, velocidade: 7, apoio: 8, folego: 8 },
  { name: 'Pierre', pos1: 'MEIA', pos2: 'VOLANTE', ataque: 9, defesa: 8, velocidade: 7, apoio: 8, folego: 9 },
  { name: 'Piscina', pos1: 'ATACANTE', pos2: 'LATERAL', ataque: 4, defesa: 3, velocidade: 5, apoio: 5, folego: 4 },
  { name: 'Preto', pos1: 'MEIA', pos2: 'VOLANTE', ataque: 6, defesa: 4, velocidade: 6, apoio: 8, folego: 6 },
  { name: 'Ronaldinho', pos1: 'ATACANTE', pos2: 'LATERAL', ataque: 7, defesa: 4, velocidade: 6, apoio: 6, folego: 5 },
  { name: 'Sergio', pos1: 'LATERAL', pos2: 'ZAGUEIRO', ataque: 4, defesa: 6, velocidade: 6, apoio: 5, folego: 6 },
  { name: 'Tales', pos1: 'VOLANTE', pos2: 'LATERAL', ataque: 6, defesa: 7, velocidade: 7, apoio: 7, folego: 7 },
  { name: 'Madruga', pos1: 'ZAGUEIRO', pos2: 'VOLANTE', ataque: 7, defesa: 8, velocidade: 8, apoio: 9, folego: 8 },
  { name: 'Valter', pos1: 'LATERAL', pos2: 'ZAGUEIRO', ataque: 3, defesa: 5, velocidade: 6, apoio: 6, folego: 6 },
  { name: 'Vandinho', pos1: 'MEIA', pos2: 'ATACANTE', ataque: 8, defesa: 6, velocidade: 7, apoio: 8, folego: 8 },
];

// Track name occurrences to disambiguate duplicates
function buildPlayers(): Player[] {
  const nameCount: Record<string, number> = {};
  return RAW.map((r) => {
    const pos1 = POS_MAP[r.pos1] ?? 'CA';
    let pos2: Position | '' = POS_MAP[r.pos2] ?? '';
    if (pos2 === pos1) pos2 = '';
    // For LATERAL, alternate LE/LD
    const finalPos1 = pos1 === 'LE' ? (Math.random() > 0.5 ? 'LE' : 'LD') as Position : pos1;
    const finalPos2 = pos2 === 'LE' ? (finalPos1 === 'LE' ? 'LD' : 'LE') as Position : pos2;

    const key = r.name.toLowerCase();
    nameCount[key] = (nameCount[key] || 0) + 1;
    const suffix = nameCount[key] > 1 ? ` ${nameCount[key]}` : '';

    return {
      id: crypto.randomUUID(),
      name: r.name + suffix,
      active: true,
      positionPrimary: finalPos1,
      positionSecondary: finalPos2,
      skills: mapSkills(r.ataque, r.defesa, r.velocidade, r.apoio, r.folego, finalPos1),
    };
  });
}

export function getImportPlayers(): Player[] {
  return buildPlayers();
}
