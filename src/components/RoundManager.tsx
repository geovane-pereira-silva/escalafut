import { useState, useEffect, useMemo } from 'react';
import { Player, POSITIONS, POSITION_LABELS } from '@/types/player';
import { Round, PlayerPerformance, useRounds } from '@/hooks/useRounds';
import { SCOUT_ACTIONS, SCOUT_LABELS, Scouts, calculatePoints, calculateVScore } from '@/lib/scoring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Lock, ClipboardList, Flame, Snowflake, TrendingUp, Sparkles } from 'lucide-react';
import RoundClosureSummary from '@/components/RoundClosureSummary';
import MatchSummaryChat from '@/components/MatchSummaryChat';

interface RoundManagerProps {
  players: Player[];
  coachId: string;
}

function ScoutInputDialog({ player, roundId, existingPerf, open, onClose, onSave }: {
  player: Player;
  roundId: string;
  existingPerf?: PlayerPerformance;
  open: boolean;
  onClose: () => void;
  onSave: (playerId: string, roundId: string, scouts: Scouts, points: number) => Promise<void>;
}) {
  const [scouts, setScouts] = useState<Scouts>(() => {
    const initial: Scouts = {};
    SCOUT_ACTIONS.forEach(a => initial[a] = existingPerf?.scouts[a] ?? 0);
    return initial;
  });

  const points = useMemo(() => calculatePoints(scouts, player.positionPrimary), [scouts, player.positionPrimary]);

  const handleSave = async () => {
    await onSave(player.id, roundId, scouts, points);
    onClose();
  };

  // Filter actions relevant to position
  const visibleActions = SCOUT_ACTIONS.filter(a => {
    if (a === 'defesasDificeis' && player.positionPrimary !== 'GL') return false;
    if (a === 'jogoSemSofrerGol' && !['GL', 'ZG', 'LE', 'LD'].includes(player.positionPrimary)) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Scouts — {player.name}
            <Badge variant="secondary" className="ml-2">{player.positionPrimary}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {visibleActions.map(action => (
            <div key={action} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground flex-1">{SCOUT_LABELS[action]}</span>
              <div className="flex items-center gap-2">
                <Button
                  size="icon" variant="outline" className="h-7 w-7"
                  onClick={() => setScouts(s => ({ ...s, [action]: Math.max(0, (s[action] ?? 0) - 1) }))}
                >-</Button>
                <span className="text-sm font-mono w-6 text-center">{scouts[action] ?? 0}</span>
                <Button
                  size="icon" variant="outline" className="h-7 w-7"
                  onClick={() => setScouts(s => ({ ...s, [action]: (s[action] ?? 0) + 1 }))}
                >+</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="font-heading text-primary text-lg">
            Pontos: <span className={points >= 0 ? 'text-accent' : 'text-destructive'}>{points.toFixed(1)}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} className="gradient-gold text-primary-foreground font-heading">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RoundManager({ players, coachId }: RoundManagerProps) {
  const {
    rounds, performances, loading,
    fetchPerformances, fetchAllPerformances,
    createRound, savePerformance, finalizeRound, saveRoundSummary,
  } = useRounds(coachId);

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [newRoundNumber, setNewRoundNumber] = useState('');
  const [allPerformances, setAllPerformances] = useState<PlayerPerformance[]>([]);
  const [showClosureSummary, setShowClosureSummary] = useState(false);
  const [closureRound, setClosureRound] = useState<Round | null>(null);
  const [showAiChat, setShowAiChat] = useState(false);

  const selectedRound = rounds.find(r => r.id === selectedRoundId);
  const isFinalized = selectedRound?.status === 'finalized';

  // Load performances when round selected
  useEffect(() => {
    if (selectedRoundId) fetchPerformances(selectedRoundId);
  }, [selectedRoundId, fetchPerformances]);

  // Load all performances for V-Score
  useEffect(() => {
    fetchAllPerformances().then(p => setAllPerformances(p));
  }, [fetchAllPerformances, rounds]);

  // V-Score per player
  const vScores = useMemo(() => {
    const map: Record<string, number> = {};
    const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const finalizedRoundIds = sortedRounds.filter(r => r.status === 'finalized').map(r => r.id);

    for (const player of players) {
      const history = finalizedRoundIds
        .map(rid => allPerformances.find(p => p.playerId === player.id && p.roundId === rid))
        .filter(Boolean)
        .map(p => p!.pointsCalculated);
      map[player.id] = calculateVScore(history);
    }
    return map;
  }, [players, rounds, allPerformances]);

  // Consistency (std dev) for risk indicator
  const consistency = useMemo(() => {
    const map: Record<string, { stdDev: number; avg: number; trend: 'hot' | 'cold' | 'neutral' }> = {};
    const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const finalizedRoundIds = sortedRounds.filter(r => r.status === 'finalized').map(r => r.id);

    for (const player of players) {
      const history = finalizedRoundIds
        .map(rid => allPerformances.find(p => p.playerId === player.id && p.roundId === rid))
        .filter(Boolean)
        .map(p => p!.pointsCalculated);

      if (history.length < 2) {
        map[player.id] = { stdDev: 0, avg: 0, trend: 'neutral' };
        continue;
      }
      const avg = history.reduce((s, v) => s + v, 0) / history.length;
      const variance = history.reduce((s, v) => s + (v - avg) ** 2, 0) / history.length;
      const stdDev = Math.sqrt(variance);

      // Trend: last 3 games above avg = hot, below = cold
      const last3 = history.slice(-3);
      const allAbove = last3.every(v => v >= avg);
      const allBelow = last3.every(v => v < avg);
      const trend = allAbove ? 'hot' : allBelow ? 'cold' : 'neutral';
      map[player.id] = { stdDev, avg, trend };
    }
    return map;
  }, [players, rounds, allPerformances]);

  const handleCreateRound = async () => {
    const num = parseInt(newRoundNumber);
    if (!num || num < 1) { toast.error('Número de rodada inválido'); return; }
    const today = new Date().toISOString().split('T')[0];
    await createRound(num, today);
    setNewRoundNumber('');
  };

  const handleFinalize = async () => {
    if (!selectedRoundId) return;
    const roundToClose = rounds.find(r => r.id === selectedRoundId);
    await finalizeRound(selectedRoundId);
    // Refresh performances then show summary
    const perfs = await fetchPerformances(selectedRoundId);
    const allP = await fetchAllPerformances();
    setAllPerformances(allP);
    if (roundToClose) {
      setClosureRound({ ...roundToClose, status: 'finalized' });
      setShowClosureSummary(true);
    }
  };

  const escalaveisPlayers = players.filter(p => p.escalavel);
  const grouped = POSITIONS.map(pos => ({
    pos,
    label: POSITION_LABELS[pos],
    players: escalaveisPlayers
      .filter(p => p.positionPrimary === pos)
      .sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0)),
  })).filter(g => g.players.length > 0);

  const editingPlayer = players.find(p => p.id === editingPlayerId);
  const editingPerf = performances.find(p => p.playerId === editingPlayerId);

  const nextRoundNumber = rounds.length > 0 ? Math.max(...rounds.map(r => r.roundNumber)) + 1 : 1;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading text-primary flex items-center gap-2">
        <ClipboardList className="h-5 w-5" />
        Rodadas & Desempenho
      </h2>

      {/* Create + Select Round */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={`Rodada ${nextRoundNumber}`}
            value={newRoundNumber}
            onChange={e => setNewRoundNumber(e.target.value)}
            className="w-32"
          />
          <Button onClick={handleCreateRound} variant="outline" className="font-heading gap-1">
            <Plus className="h-4 w-4" /> Nova Rodada
          </Button>
        </div>

        {rounds.length > 0 && (
          <Select value={selectedRoundId ?? ''} onValueChange={setSelectedRoundId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione rodada" />
            </SelectTrigger>
            <SelectContent>
              {rounds.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  Rodada {r.roundNumber} {r.status === 'finalized' ? '🔒' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedRound && selectedRound.status === 'open' && (
          <>
            <Button
              onClick={() => setShowAiChat(true)}
              className="gradient-gold text-primary-foreground font-heading gap-1"
            >
              <Sparkles className="h-4 w-4" /> Preencher com IA
            </Button>
            <Button onClick={handleFinalize} variant="destructive" className="font-heading gap-1">
              <Lock className="h-4 w-4" /> Finalizar Rodada
            </Button>
          </>
        )}
      </div>

      {/* Status info */}
      {selectedRound && (
        <div className="flex items-center gap-2">
          <Badge variant={isFinalized ? 'secondary' : 'default'}>
            {isFinalized ? 'Finalizada' : 'Aberta'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Rodada {selectedRound.roundNumber} — {selectedRound.roundDate}
          </span>
        </div>
      )}

      {/* Players with V-Score and scout input */}
      {selectedRound && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grouped.map(g => (
            <div key={g.pos} className="space-y-2">
              <h3 className="text-sm font-heading text-primary tracking-wider border-b border-border pb-1">
                {g.pos} — {g.label}
              </h3>
              {g.players.map(p => {
                const perf = performances.find(pf => pf.playerId === p.id);
                const vs = vScores[p.id] ?? 0;
                const con = consistency[p.id];
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-transparent hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {con?.trend === 'hot' && <Flame className="h-4 w-4 text-orange-400 shrink-0" />}
                      {con?.trend === 'cold' && <Snowflake className="h-4 w-4 text-blue-400 shrink-0" />}
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        V {vs.toFixed(1)}
                      </Badge>
                      {perf && (
                        <span className={`text-xs font-mono ${perf.pointsCalculated >= 0 ? 'text-accent' : 'text-destructive'}`}>
                          {perf.pointsCalculated > 0 ? '+' : ''}{perf.pointsCalculated.toFixed(1)}pts
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isFinalized && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs font-heading"
                          onClick={() => setEditingPlayerId(p.id)}
                        >
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Scouts
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* V-Score ranking (when no round selected) */}
      {!selectedRound && rounds.some(r => r.status === 'finalized') && (
        <div className="space-y-4">
          <h3 className="text-lg font-heading text-primary flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ranking V-Score
          </h3>
          <div className="space-y-1">
            {[...players]
              .filter(p => (vScores[p.id] ?? 0) > 0)
              .sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0))
              .slice(0, 15)
              .map((p, i) => {
                const con = consistency[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                    <span className="text-xs font-heading text-muted-foreground w-6 text-right">
                      #{i + 1}
                    </span>
                    {con?.trend === 'hot' && <Flame className="h-4 w-4 text-orange-400" />}
                    {con?.trend === 'cold' && <Snowflake className="h-4 w-4 text-blue-400" />}
                    <span className="text-sm font-medium flex-1">{p.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.positionPrimary}</Badge>
                    <span className="text-sm font-mono text-primary">{(vScores[p.id] ?? 0).toFixed(1)}</span>
                    {con && con.stdDev > 0 && (
                      <span className="text-[10px] text-muted-foreground">σ {con.stdDev.toFixed(1)}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Scout input dialog */}
      {editingPlayer && selectedRoundId && (
        <ScoutInputDialog
          player={editingPlayer}
          roundId={selectedRoundId}
          existingPerf={editingPerf}
          open={!!editingPlayer}
          onClose={() => setEditingPlayerId(null)}
          onSave={async (pid, rid, scouts, pts) => {
            await savePerformance(pid, rid, scouts, pts);
            await fetchPerformances(rid);
            const updated = await fetchAllPerformances();
            setAllPerformances(updated);
          }}
        />
      )}

      {/* Round Closure Summary */}
      {closureRound && (
        <RoundClosureSummary
          open={showClosureSummary}
          onClose={() => setShowClosureSummary(false)}
          round={closureRound}
          performances={allPerformances}
          players={players}
          previousPerformances={allPerformances}
        />
      )}

      {/* AI Match Summary Chat */}
      {selectedRound && selectedRoundId && (
        <MatchSummaryChat
          open={showAiChat}
          onClose={() => setShowAiChat(false)}
          players={escalaveisPlayers}
          roundId={selectedRoundId}
          initialSummary={selectedRound.summaryText}
          onApply={async (rows, summaryText) => {
            for (const row of rows) {
              await savePerformance(row.playerId, selectedRoundId, row.scouts, row.points);
            }
            await saveRoundSummary(selectedRoundId, summaryText);
            await fetchPerformances(selectedRoundId);
            const updated = await fetchAllPerformances();
            setAllPerformances(updated);
          }}
        />
      )}
    </div>
  );
}
