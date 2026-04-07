import { useMemo } from 'react';
import { Player, POSITION_LABELS } from '@/types/player';
import { PlayerPerformance, Round } from '@/hooks/useRounds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Target, Shield, Flame, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RoundClosureSummaryProps {
  open: boolean;
  onClose: () => void;
  round: Round;
  performances: PlayerPerformance[];
  players: Player[];
  previousPerformances?: PlayerPerformance[]; // performances from prior rounds
}

export default function RoundClosureSummary({
  open, onClose, round, performances, players, previousPerformances = [],
}: RoundClosureSummaryProps) {
  const stats = useMemo(() => {
    const perfsThisRound = performances.filter(p => p.roundId === round.id);
    if (!perfsThisRound.length) return null;

    const sorted = [...perfsThisRound].sort((a, b) => b.pointsCalculated - a.pointsCalculated);
    const totalPoints = perfsThisRound.reduce((s, p) => s + p.pointsCalculated, 0);
    const avgPoints = totalPoints / perfsThisRound.length;
    const mvp = sorted[0];
    const worst = sorted[sorted.length - 1];

    // Biggest improvement compared to previous average
    let biggestClimber: { player: Player; delta: number } | null = null;
    for (const perf of perfsThisRound) {
      const prevPerfs = previousPerformances.filter(pp => pp.playerId === perf.playerId && pp.roundId !== round.id);
      if (!prevPerfs.length) continue;
      const prevAvg = prevPerfs.reduce((s, p) => s + p.pointsCalculated, 0) / prevPerfs.length;
      const delta = perf.pointsCalculated - prevAvg;
      if (!biggestClimber || delta > biggestClimber.delta) {
        const player = players.find(p => p.id === perf.playerId);
        if (player) biggestClimber = { player, delta };
      }
    }

    const mvpPlayer = players.find(p => p.id === mvp?.playerId);
    const worstPlayer = players.find(p => p.id === worst?.playerId);

    return { totalPoints, avgPoints, mvp, mvpPlayer, worst, worstPlayer, biggestClimber, count: perfsThisRound.length };
  }, [performances, round, players, previousPerformances]);

  if (!stats) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Resumo — Rodada {round.roundNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-heading text-muted-foreground uppercase">Total</p>
              <p className="text-xl font-heading text-primary">{stats.totalPoints.toFixed(1)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-heading text-muted-foreground uppercase">Média</p>
              <p className="text-xl font-heading text-accent">{stats.avgPoints.toFixed(1)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-heading text-muted-foreground uppercase">Jogadores</p>
              <p className="text-xl font-heading text-foreground">{stats.count}</p>
            </div>
          </div>

          {/* MVP */}
          {stats.mvpPlayer && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <Star className="h-6 w-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-heading text-muted-foreground uppercase">MVP da Rodada</p>
                <p className="text-sm font-heading truncate">{stats.mvpPlayer.name}</p>
              </div>
              <Badge variant="secondary">{stats.mvpPlayer.positionPrimary}</Badge>
              <span className="text-lg font-mono text-primary">{stats.mvp!.pointsCalculated.toFixed(1)}</span>
            </div>
          )}

          {/* Biggest climber */}
          {stats.biggestClimber && stats.biggestClimber.delta > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
              <TrendingUp className="h-5 w-5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-heading text-muted-foreground uppercase">Maior Evolução</p>
                <p className="text-sm font-heading truncate">{stats.biggestClimber.player.name}</p>
              </div>
              <span className="text-sm font-mono text-accent">+{stats.biggestClimber.delta.toFixed(1)}</span>
            </div>
          )}

          {/* Worst performer */}
          {stats.worstPlayer && stats.worst!.pointsCalculated < stats.avgPoints && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-heading text-muted-foreground uppercase">Menor Pontuação</p>
                <p className="text-sm font-heading truncate">{stats.worstPlayer.name}</p>
              </div>
              <span className="text-sm font-mono text-destructive">{stats.worst!.pointsCalculated.toFixed(1)}</span>
            </div>
          )}

          <Button onClick={onClose} className="w-full font-heading">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
