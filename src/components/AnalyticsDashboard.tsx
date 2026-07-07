import { useMemo } from 'react';
import { Player, POSITIONS, POSITION_LABELS, getPlayerOverall } from '@/types/player';
import { PlayerPerformance, Round } from '@/hooks/useRounds';
import { calculateVScore } from '@/lib/scoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Flame, Snowflake, TrendingUp, TrendingDown, Shield, Swords, Target, Activity, BarChart3, Users, Trophy, Crown, Star, Medal } from 'lucide-react';

interface AnalyticsDashboardProps {
  players: Player[];
  rounds: Round[];
  allPerformances: PlayerPerformance[];
}

type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATK';

function getPosGroup(pos: string): PosGroup {
  if (pos === 'GL') return 'GK';
  if (['ZG', 'LE', 'LD'].includes(pos)) return 'DEF';
  if (['VO', 'ME'].includes(pos)) return 'MID';
  return 'ATK';
}

const POS_GROUP_LABELS: Record<PosGroup, string> = {
  GK: 'Goleiros',
  DEF: 'Defesa',
  MID: 'Meio-Campo',
  ATK: 'Ataque',
};

const POS_GROUP_ICONS: Record<PosGroup, typeof Shield> = {
  GK: Shield,
  DEF: Shield,
  MID: Activity,
  ATK: Target,
};

export default function AnalyticsDashboard({ players, rounds, allPerformances }: AnalyticsDashboardProps) {
  const finalizedRounds = useMemo(() =>
    [...rounds].filter(r => r.status === 'finalized').sort((a, b) => a.roundNumber - b.roundNumber),
    [rounds]
  );

  // V-Score per player
  const vScores = useMemo(() => {
    const map: Record<string, number> = {};
    const roundIds = finalizedRounds.map(r => r.id);
    for (const player of players) {
      const history = roundIds
        .map(rid => allPerformances.find(p => p.playerId === player.id && p.roundId === rid))
        .filter(Boolean)
        .map(p => p!.pointsCalculated);
      map[player.id] = calculateVScore(history);
    }
    return map;
  }, [players, finalizedRounds, allPerformances]);

  // Consistency & trend per player
  const playerStats = useMemo(() => {
    const map: Record<string, { stdDev: number; avg: number; trend: 'hot' | 'cold' | 'neutral'; ci: number; history: number[] }> = {};
    const roundIds = finalizedRounds.map(r => r.id);
    for (const player of players) {
      const history = roundIds
        .map(rid => allPerformances.find(p => p.playerId === player.id && p.roundId === rid))
        .filter(Boolean)
        .map(p => p!.pointsCalculated);

      if (history.length < 2) {
        map[player.id] = { stdDev: 0, avg: history[0] ?? 0, trend: 'neutral', ci: 0, history };
        continue;
      }
      const avg = history.reduce((s, v) => s + v, 0) / history.length;
      const variance = history.reduce((s, v) => s + (v - avg) ** 2, 0) / history.length;
      const stdDev = Math.sqrt(variance);
      const ci = stdDev > 0 ? avg / stdDev : avg > 0 ? 99 : 0;
      const last3 = history.slice(-3);
      const allAbove = last3.every(v => v >= avg);
      const allBelow = last3.every(v => v < avg);
      const trend = allAbove ? 'hot' : allBelow ? 'cold' : 'neutral';
      map[player.id] = { stdDev, avg, trend, ci, history };
    }
    return map;
  }, [players, finalizedRounds, allPerformances]);

  // Team total per round
  const teamEvolution = useMemo(() => {
    let cumulative = 0;
    return finalizedRounds.map(round => {
      const roundPerfs = allPerformances.filter(p => p.roundId === round.id);
      const total = roundPerfs.reduce((s, p) => s + p.pointsCalculated, 0);
      const avg = roundPerfs.length > 0 ? total / roundPerfs.length : 0;
      cumulative += total;
      return {
        name: `R${round.roundNumber}`,
        total: parseFloat(total.toFixed(1)),
        avg: parseFloat(avg.toFixed(1)),
        cumulative: parseFloat(cumulative.toFixed(1)),
      };
    });
  }, [finalizedRounds, allPerformances]);

  // Sector efficiency
  const sectorEfficiency = useMemo(() => {
    const groups: PosGroup[] = ['GK', 'DEF', 'MID', 'ATK'];
    return groups.map(group => {
      const groupPlayers = players.filter(p => getPosGroup(p.positionPrimary) === group);
      const scores = groupPlayers.map(p => vScores[p.id] ?? 0).filter(v => v > 0);
      const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
      return {
        sector: POS_GROUP_LABELS[group],
        avg: parseFloat(avg.toFixed(1)),
        count: groupPlayers.length,
      };
    });
  }, [players, vScores]);

  // Top 3 per position group
  const topPerformers = useMemo(() => {
    const groups: PosGroup[] = ['GK', 'DEF', 'MID', 'ATK'];
    return groups.map(group => {
      const groupPlayers = players
        .filter(p => getPosGroup(p.positionPrimary) === group && (vScores[p.id] ?? 0) > 0)
        .sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0))
        .slice(0, 3);
      return { group, label: POS_GROUP_LABELS[group], players: groupPlayers };
    }).filter(g => g.players.length > 0);
  }, [players, vScores]);

  // Power Ranking - all players sorted
  const powerRanking = useMemo(() => {
    return [...players]
      .filter(p => (vScores[p.id] ?? 0) > 0)
      .sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0))
      .slice(0, 10);
  }, [players, vScores]);

  // Risk/Reward categorization
  const riskReward = useMemo(() => {
    const safe: (Player & { ci: number })[] = [];
    const explosive: (Player & { ci: number })[] = [];
    for (const p of players) {
      const stats = playerStats[p.id];
      if (!stats || stats.history.length < 2) continue;
      const extended = { ...p, ci: stats.ci };
      if (stats.stdDev > stats.avg * 0.5) explosive.push(extended);
      else safe.push(extended);
    }
    safe.sort((a, b) => b.ci - a.ci);
    explosive.sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0));
    return { safe: safe.slice(0, 5), explosive: explosive.slice(0, 5) };
  }, [players, playerStats, vScores]);

  if (finalizedRounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground font-heading">
          Finalize pelo menos uma rodada para ver as análises
        </p>
      </div>
    );
  }

  const chartConfig = {
    total: { label: 'Total', color: 'hsl(var(--primary))' },
    avg: { label: 'Média', color: 'hsl(var(--accent))' },
    cumulative: { label: 'Acumulado', color: 'hsl(var(--primary))' },
    sector: { label: 'Setor', color: 'hsl(var(--accent))' },
  };

  // Editorial highlights ---------------------------------------
  const lastRound = finalizedRounds[finalizedRounds.length - 1];
  const craqueRodada = (() => {
    if (!lastRound) return null;
    const perfs = allPerformances.filter(p => p.roundId === lastRound.id);
    if (!perfs.length) return null;
    const top = [...perfs].sort((a, b) => b.pointsCalculated - a.pointsCalculated)[0];
    const player = players.find(p => p.id === top.playerId);
    return player ? { player, value: top.pointsCalculated, round: lastRound.roundNumber } : null;
  })();

  const artilheiro = (() => {
    const goals: Record<string, number> = {};
    for (const perf of allPerformances) {
      const g = Number(perf.scouts?.gol ?? 0);
      if (g > 0) goals[perf.playerId] = (goals[perf.playerId] ?? 0) + g;
    }
    const entries = Object.entries(goals).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return null;
    const player = players.find(p => p.id === entries[0][0]);
    return player ? { player, value: entries[0][1] } : null;
  })();

  const sequenciaPresenca = (() => {
    const rids = finalizedRounds.map(r => r.id);
    let best: { player: Player; streak: number } | null = null;
    for (const p of players) {
      let streak = 0;
      for (let i = rids.length - 1; i >= 0; i--) {
        const has = allPerformances.some(x => x.playerId === p.id && x.roundId === rids[i]);
        if (has) streak++; else break;
      }
      if (streak > 0 && (!best || streak > best.streak)) best = { player: p, streak };
    }
    return best;
  })();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading text-primary flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Analytics & Métricas
      </h2>

      {/* Editorial Highlights */}
      {(craqueRodada || artilheiro || sequenciaPresenca) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {craqueRodada && (
            <HighlightCard
              icon={Crown}
              eyebrow={`Rodada ${craqueRodada.round}`}
              title="Craque da Rodada"
              name={craqueRodada.player.name}
              value={craqueRodada.value.toFixed(1)}
              unit="pts"
              accent="gold"
            />
          )}
          {artilheiro && (
            <HighlightCard
              icon={Target}
              eyebrow="Temporada"
              title="Artilheiro"
              name={artilheiro.player.name}
              value={artilheiro.value.toString()}
              unit={artilheiro.value === 1 ? 'gol' : 'gols'}
              accent="red"
            />
          )}
          {sequenciaPresenca && (
            <HighlightCard
              icon={Flame}
              eyebrow="Em campo"
              title="Sequência de Presença"
              name={sequenciaPresenca.player.name}
              value={sequenciaPresenca.streak.toString()}
              unit={sequenciaPresenca.streak === 1 ? 'rodada' : 'rodadas seguidas'}
              accent="green"
            />
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wider">Rodadas</p>
            <p className="text-2xl font-heading text-primary">{finalizedRounds.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wider">Jogadores Ativos</p>
            <p className="text-2xl font-heading text-primary">{players.filter(p => p.escalavel).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wider">Média/Rodada</p>
            <p className="text-2xl font-heading text-accent">
              {teamEvolution.length > 0
                ? (teamEvolution.reduce((s, r) => s + r.total, 0) / teamEvolution.length).toFixed(1)
                : '0'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wider">Total Acumulado</p>
            <p className="text-2xl font-heading text-primary">
              {teamEvolution.length > 0 ? teamEvolution[teamEvolution.length - 1].cumulative : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Evolution Chart + Sector Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Evolution */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Evolução por Rodada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <AreaChart data={teamEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Total" />
                <Area type="monotone" dataKey="avg" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.1)" name="Média" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Sector Efficiency */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-primary flex items-center gap-2">
              <Users className="h-4 w-4" />
              Eficiência por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={sectorEfficiency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sector" fontSize={11} />
                <YAxis fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="avg" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="V-Score Médio" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Power Ranking + Risk/Reward */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Power Ranking */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Power Ranking — Top 10
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {powerRanking.map((p, i) => {
              const stats = playerStats[p.id];
              return (
                <div key={p.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                  <span className="text-xs font-heading text-muted-foreground w-5 text-right">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  {stats?.trend === 'hot' && <Flame className="h-3.5 w-3.5 text-orange-400 shrink-0" />}
                  {stats?.trend === 'cold' && <Snowflake className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                  <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.positionPrimary}</Badge>
                  <span className="text-sm font-mono text-primary w-10 text-right">{(vScores[p.id] ?? 0).toFixed(1)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Risk / Reward */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-primary flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Risk vs Reward
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Safe players */}
            <div className="space-y-1">
              <p className="text-xs font-heading text-accent flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Jogadores Seguros (baixo σ)
              </p>
              {riskReward.safe.length === 0 && (
                <p className="text-xs text-muted-foreground">Dados insuficientes</p>
              )}
              {riskReward.safe.map(p => (
                <div key={p.id} className="flex items-center gap-2 p-1.5 rounded bg-accent/10">
                  <span className="text-sm truncate flex-1">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">{p.positionPrimary}</Badge>
                  <span className="text-[10px] text-muted-foreground">CI {p.ci.toFixed(1)}</span>
                </div>
              ))}
            </div>
            {/* Explosive players */}
            <div className="space-y-1">
              <p className="text-xs font-heading text-destructive flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> Jogadores Explosivos (alto σ)
              </p>
              {riskReward.explosive.length === 0 && (
                <p className="text-xs text-muted-foreground">Dados insuficientes</p>
              )}
              {riskReward.explosive.map(p => {
                const stats = playerStats[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-2 p-1.5 rounded bg-destructive/10">
                    <span className="text-sm truncate flex-1">{p.name}</span>
                    <Badge variant="outline" className="text-[10px]">{p.positionPrimary}</Badge>
                    <span className="text-[10px] text-muted-foreground">σ {stats?.stdDev.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers per Sector */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading text-primary flex items-center gap-2">
            <Swords className="h-4 w-4" />
            Top 3 por Setor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topPerformers.map(({ group, label, players: topPlayers }) => (
              <div key={group} className="space-y-1">
                <p className="text-xs font-heading text-muted-foreground tracking-wider">{label}</p>
                {topPlayers.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                    <span className="text-xs text-muted-foreground w-4">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-sm truncate flex-1">{p.name}</span>
                    <span className="text-xs font-mono text-primary">{(vScores[p.id] ?? 0).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Evolution */}
      {teamEvolution.length > 1 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pontuação Acumulada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={teamEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} name="Acumulado" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Dream Team do Ano */}
      <DreamTeam players={players} vScores={vScores} playerStats={playerStats} finalizedRounds={finalizedRounds} allPerformances={allPerformances} />
    </div>
  );
}

/* ==============================
   Dream Team do Ano
   ============================== */
interface DreamTeamProps {
  players: Player[];
  vScores: Record<string, number>;
  playerStats: Record<string, { stdDev: number; avg: number; trend: 'hot' | 'cold' | 'neutral'; ci: number; history: number[] }>;
  finalizedRounds: Round[];
  allPerformances: PlayerPerformance[];
}

// Best XI positions: 1 GK, 2 DEF, 2 MID, 2 ATK (flexible for available pool)
const DREAM_SLOTS: { group: PosGroup; label: string; count: number }[] = [
  { group: 'GK', label: 'Goleiro', count: 1 },
  { group: 'DEF', label: 'Defesa', count: 3 },
  { group: 'MID', label: 'Meio', count: 3 },
  { group: 'ATK', label: 'Ataque', count: 4 },
];

function DreamTeam({ players, vScores, playerStats, finalizedRounds, allPerformances }: DreamTeamProps) {
  const dreamTeam = useMemo(() => {
    const selected: (Player & { vScore: number })[] = [];
    const used = new Set<string>();

    for (const slot of DREAM_SLOTS) {
      const candidates = players
        .filter(p => getPosGroup(p.positionPrimary) === slot.group && !used.has(p.id) && (vScores[p.id] ?? 0) > 0)
        .sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0));

      for (let i = 0; i < Math.min(slot.count, candidates.length); i++) {
        selected.push({ ...candidates[i], vScore: vScores[candidates[i].id] ?? 0 });
        used.add(candidates[i].id);
      }
    }
    return selected;
  }, [players, vScores]);

  // Awards
  const awards = useMemo(() => {
    const withData = players.filter(p => (playerStats[p.id]?.history.length ?? 0) >= 1);
    if (!withData.length) return [];

    const items: { icon: typeof Trophy; label: string; player: Player; value: string }[] = [];

    // MVP - highest V-Score
    const mvp = [...withData].sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0))[0];
    if (mvp) items.push({ icon: Trophy, label: 'MVP do Ano', player: mvp, value: `V ${(vScores[mvp.id] ?? 0).toFixed(1)}` });

    // Most consistent
    const consistent = withData
      .filter(p => (playerStats[p.id]?.history.length ?? 0) >= 3)
      .sort((a, b) => (playerStats[b.id]?.ci ?? 0) - (playerStats[a.id]?.ci ?? 0))[0];
    if (consistent) items.push({ icon: Shield, label: 'Mais Consistente', player: consistent, value: `CI ${playerStats[consistent.id]?.ci.toFixed(1)}` });

    // Biggest climber (most improvement last 3 vs first 3)
    const climbers = withData
      .filter(p => (playerStats[p.id]?.history.length ?? 0) >= 4)
      .map(p => {
        const h = playerStats[p.id]!.history;
        const first3 = h.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
        const last3 = h.slice(-3).reduce((s, v) => s + v, 0) / 3;
        return { player: p, improvement: last3 - first3 };
      })
      .sort((a, b) => b.improvement - a.improvement);
    if (climbers.length > 0 && climbers[0].improvement > 0) {
      items.push({ icon: TrendingUp, label: 'Maior Evolução', player: climbers[0].player, value: `+${climbers[0].improvement.toFixed(1)}` });
    }

    // Top scorer (most total points)
    const totalPoints: Record<string, number> = {};
    for (const perf of allPerformances) {
      totalPoints[perf.playerId] = (totalPoints[perf.playerId] ?? 0) + perf.pointsCalculated;
    }
    const topScorer = withData.sort((a, b) => (totalPoints[b.id] ?? 0) - (totalPoints[a.id] ?? 0))[0];
    if (topScorer && (totalPoints[topScorer.id] ?? 0) > 0) {
      items.push({ icon: Star, label: 'Artilheiro de Pontos', player: topScorer, value: `${(totalPoints[topScorer.id] ?? 0).toFixed(1)} pts` });
    }

    return items;
  }, [players, vScores, playerStats, allPerformances]);

  if (dreamTeam.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading text-primary flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Dream Team do Ano
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Awards */}
        {awards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {awards.map((award, i) => {
              const Icon = award.icon;
              return (
                <div key={i} className="flex flex-col items-center p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                  <Icon className="h-6 w-6 text-primary mb-1" />
                  <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wider">{award.label}</p>
                  <p className="text-sm font-heading text-foreground truncate max-w-full">{award.player.name}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">{award.value}</Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Best XI list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dreamTeam.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/30">
              <span className="text-xs font-heading text-muted-foreground w-5 text-right">
                {i === 0 ? '🏆' : `#${i + 1}`}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.positionPrimary}</Badge>
              <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
              <span className="text-sm font-mono text-primary">{p.vScore.toFixed(1)}</span>
            </div>
          ))}
        </div>

        {/* Season summary */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
          Baseado em {finalizedRounds.length} rodada{finalizedRounds.length !== 1 ? 's' : ''} finalizada{finalizedRounds.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
}
