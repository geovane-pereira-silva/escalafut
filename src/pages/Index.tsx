import { useState, useCallback, useEffect, useMemo } from 'react';
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
import RoundManager from '@/components/RoundManager';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import LineupField from '@/components/LineupField';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { calculateVScore } from '@/lib/scoring';
import { Swords, Trophy, Users, UserPlus, ClipboardList, BarChart3, Shield } from 'lucide-react';

export default function Index() {
  const [coachId, setCoachId] = useState<string | null>(getLastCoachId());
  const { players, loading, savePlayer } = usePlayers(coachId);
  const { rounds, fetchAllPerformances } = useRounds(coachId);
  const [allPerformances, setAllPerformances] = useState<any[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [teams, setTeams] = useState<{ teamA: Player[]; teamB: Player[] } | null>(null);

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
    <div className="min-h-screen gradient-pitch">
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
          <Tabs defaultValue="cadastro" className="space-y-6">
            <TabsList className="bg-card border border-border h-auto flex w-full justify-between sm:justify-center sm:w-auto">
              <TabsTrigger value="cadastro" aria-label="Cadastro" className="font-heading gap-2 min-h-[44px] min-w-[44px]">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Cadastro</span>
              </TabsTrigger>
              <TabsTrigger value="selecao" aria-label="Seleção" className="font-heading gap-2 min-h-[44px] min-w-[44px]">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Seleção</span>
              </TabsTrigger>
              <TabsTrigger value="rodadas" aria-label="Rodadas" className="font-heading gap-2 min-h-[44px] min-w-[44px]">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Rodadas</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" aria-label="Analytics" className="font-heading gap-2 min-h-[44px] min-w-[44px]">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="escalacao" aria-label="Escalação" className="font-heading gap-2 min-h-[44px] min-w-[44px]">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Escalação</span>
              </TabsTrigger>
            </TabsList>

            {/* Cadastro Tab */}
            <TabsContent value="cadastro" className="space-y-6">
              {/* Add player button */}
              {!showForm && (
                <Button onClick={handleNewPlayer} className="gradient-gold text-primary-foreground font-heading gap-2">
                  <UserPlus className="h-4 w-4" />
                  Adicionar Jogador
                </Button>
              )}

              {/* Collapsible form */}
              {showForm && (
                <PlayerForm
                  onSave={handleSave}
                  editingPlayer={editingPlayer}
                  onCancelEdit={handleCancelEdit}
                />
              )}

              {/* Radar fixed + list scrollable */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:sticky lg:top-6 lg:self-start">
                  <PlayerRadar player={selectedPlayer} />
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <PlayerList
                    players={players}
                    onEdit={handleEdit}
                    onToggleEscalavel={handleToggleEscalavel}
                    onSelect={setSelectedPlayer}
                    selectedId={selectedPlayer?.id}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Seleção Tab */}
            <TabsContent value="selecao" className="space-y-6">
              <SelectionView
                players={players}
                onUpdatePlayer={savePlayer}
              />
              <Button
                onClick={handleEscalar}
                disabled={activeCount < 14}
                className="w-full gradient-gold text-primary-foreground font-heading text-lg py-6 gap-2"
              >
                <Swords className="h-5 w-5" />
                Escalar Times ({activeCount}/14 escaláveis)
              </Button>
            </TabsContent>

            {/* Rodadas Tab */}
            <TabsContent value="rodadas" className="space-y-6">
              <RoundManager players={players} coachId={coachId} />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsDashboard
                players={players}
                rounds={rounds}
                allPerformances={allPerformances}
              />
            </TabsContent>

            {/* Escalação Tab */}
            <TabsContent value="escalacao" className="space-y-6">
              <LineupField players={players} vScores={vScores} />
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

        {/* Team modal */}
        {teams && (
          <TeamDisplay
            open={showTeams}
            onClose={() => setShowTeams(false)}
            teamA={teams.teamA}
            teamB={teams.teamB}
          />
        )}
      </div>
    </div>
  );
}
