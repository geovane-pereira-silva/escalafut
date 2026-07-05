import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { Player } from '@/types/player';
import { usePlayers } from '@/hooks/usePlayers';
import { useRounds } from '@/hooks/useRounds';
import { getLastCoachId, setLastCoachId } from '@/lib/storage';
import { generateTeams } from '@/lib/escalation';

import CoachAccess from '@/components/CoachAccess';
import PlayerForm from '@/components/PlayerForm';
import PlayerList from '@/components/PlayerList';
import PlayerRadar from '@/components/PlayerRadar';
import TeamDisplay from '@/components/TeamDisplay';
import SelectionView from '@/components/SelectionView';
const RoundManager = lazy(() => import('@/components/RoundManager'));
const AnalyticsDashboard = lazy(() => import('@/components/AnalyticsDashboard'));
const LineupField = lazy(() => import('@/components/LineupField'));
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { calculateVScore } from '@/lib/scoring';
import { Swords, Trophy, Users, UserPlus, ClipboardList, BarChart3, Shield } from 'lucide-react';

function LazyFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function Index() {
  const [coachId, setCoachId] = useState<string | null>(getLastCoachId());
  const { players, loading, savePlayer } = usePlayers(coachId);
  const { rounds, fetchAllPerformances } = useRounds(coachId);
  const [allPerformances, setAllPerformances] = useState<any[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showField, setShowField] = useState(false);
  const [activeTab, setActiveTab] = useState('selecao');
  const [teams, setTeams] = useState<{ teamA: Player[]; teamB: Player[]; imbalance: number } | null>(null);

  useEffect(() => {
    fetchAllPerformances().then(p => setAllPerformances(p));
  }, [fetchAllPerformances, rounds]);

  // V-Scores for lineup optimizer
  const vScores = useMemo(() => {
    const map: Record<string, number> = {};
    const finalizedRounds = [...rounds].filter(r => r.status === 'finalized').sort((a, b) => a.roundNumber - b.roundNumber);
    const roundIds = finalizedRounds.map(r => r.id);
    for (const player of players) {
      const history = roundIds
        .map(rid => allPerformances.find((p: any) => p.playerId === player.id && p.roundId === rid))
        .filter(Boolean)
        .map((p: any) => p.pointsCalculated);
      map[player.id] = calculateVScore(history);
    }
    return map;
  }, [players, rounds, allPerformances]);

  const handleLogin = (id: string) => {
    setCoachId(id);
    setLastCoachId(id);
    toast.success(`Bem-vindo, ${id}!`);
  };

  const handleSave = async (player: Player) => {
    await savePlayer(player);
    if (selectedPlayer?.id === player.id) setSelectedPlayer(player);
    // Collapse form after save
    setShowForm(false);
    setEditingPlayer(null);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  const handleToggleEscalavel = async (player: Player) => {
    await savePlayer({ ...player, escalavel: !player.escalavel });
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setShowForm(false);
  };

  const handleNewPlayer = () => {
    setEditingPlayer(null);
    setShowForm(true);
  };

  const handleEscalar = () => {
    try {
      const escalaveisAtivos = players.filter(p => p.escalavel && p.active);
      const result = generateTeams(escalaveisAtivos);
      setTeams(result);
      setShowTeams(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeCount = players.filter(p => p.escalavel && p.active).length;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${activeTab === 'selecao' ? 'gradient-selection' : 'gradient-pitch'}`}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-heading text-primary tracking-wide">Escalafut</h1>
          </div>
          <CoachAccess onLogin={handleLogin} initialId={coachId ?? ''} />
        </div>

        {coachId ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card border border-border h-auto grid grid-cols-4 w-full sm:w-auto sm:inline-flex gap-1 p-1">
              <TabsTrigger value="selecao" aria-label="Presença" className="font-heading flex-col sm:flex-row gap-1 sm:gap-2 min-h-[52px] px-2 text-[10px] sm:text-sm">
                <Swords className="h-4 w-4" />
                <span>Presença</span>
              </TabsTrigger>
              <TabsTrigger value="cadastro" aria-label="Elenco" className="font-heading flex-col sm:flex-row gap-1 sm:gap-2 min-h-[52px] px-2 text-[10px] sm:text-sm">
                <UserPlus className="h-4 w-4" />
                <span>Elenco</span>
              </TabsTrigger>
              <TabsTrigger value="rodadas" aria-label="Rodadas" className="font-heading flex-col sm:flex-row gap-1 sm:gap-2 min-h-[52px] px-2 text-[10px] sm:text-sm">
                <ClipboardList className="h-4 w-4" />
                <span>Rodadas</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" aria-label="Estatísticas" className="font-heading flex-col sm:flex-row gap-1 sm:gap-2 min-h-[52px] px-2 text-[10px] sm:text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Stats</span>
              </TabsTrigger>
            </TabsList>

            {/* Presença Tab — main flow */}
            <TabsContent value="selecao" className="space-y-6 pb-28">
              <SelectionView
                players={players}
                onUpdatePlayer={savePlayer}
              />
            </TabsContent>

            {/* Cadastro Tab */}
            <TabsContent value="cadastro" className="space-y-6">
              {!showForm && (
                <Button onClick={handleNewPlayer} className="gradient-gold text-primary-foreground font-heading gap-2">
                  <UserPlus className="h-4 w-4" />
                  Adicionar Jogador
                </Button>
              )}
              {showForm && (
                <PlayerForm
                  onSave={handleSave}
                  editingPlayer={editingPlayer}
                  onCancelEdit={handleCancelEdit}
                />
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:sticky lg:top-6 lg:self-start">
                  <PlayerRadar player={selectedPlayer} />
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <PlayerList
                    players={players}
                    onEdit={handleEdit}
                    
                    onSelect={setSelectedPlayer}
                    selectedId={selectedPlayer?.id}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rodadas" className="space-y-6">
              <Suspense fallback={<LazyFallback />}>
                <RoundManager players={players} coachId={coachId} />
              </Suspense>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Suspense fallback={<LazyFallback />}>
                <AnalyticsDashboard
                  players={players}
                  rounds={rounds}
                  allPerformances={allPerformances}
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Trophy className="h-16 w-16 text-primary/40" />
            <p className="text-muted-foreground font-heading text-lg">
              Insira seu Nome/ID de Técnico para começar
            </p>
          </div>
        )}

        {/* Sticky floating action — only on Presença tab */}
        {coachId && activeTab === 'selecao' && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
            <div className="max-w-7xl mx-auto">
              <Button
                onClick={handleEscalar}
                disabled={activeCount < 14}
                className="w-full gradient-gold text-primary-foreground font-heading text-base sm:text-lg py-5 gap-2 min-h-[52px]"
              >
                <Swords className="h-5 w-5" />
                {activeCount < 14
                  ? `${activeCount}/14 confirmados`
                  : `${activeCount} confirmados — Sortear Times`}
              </Button>
            </div>
          </div>
        )}

        {/* Team result modal */}
        {teams && (
          <ErrorBoundary label="times sorteados" onReset={() => setShowTeams(false)}>
            <TeamDisplay
              open={showTeams}
              onClose={() => setShowTeams(false)}
              teamA={teams.teamA}
              teamB={teams.teamB}
              imbalance={teams.imbalance}
              onOpenField={() => {
                setShowTeams(false);
                setShowField(true);
              }}
            />
          </ErrorBoundary>
        )}

        {/* Advanced: Lineup field as opt-in modal */}
        <Dialog open={showField} onOpenChange={v => !v && setShowField(false)}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="font-heading text-primary">
                Ajustar posições no campo
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Opcional — só para refinar a formação. Se você só quer saber os times, o sorteio já está pronto.
              </p>
            </DialogHeader>
            <ErrorBoundary label="campo" onReset={() => setShowField(false)}>
              <Suspense fallback={<LazyFallback />}>
                <LineupField players={players} vScores={vScores} />
              </Suspense>
            </ErrorBoundary>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
