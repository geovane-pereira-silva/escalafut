import { useState, useCallback } from 'react';
import { Player } from '@/types/player';
import { usePlayers } from '@/hooks/usePlayers';
import { getLastCoachId, setLastCoachId } from '@/lib/storage';
import { generateTeams } from '@/lib/escalation';
import { getImportPlayers } from '@/lib/importPlayers';
import CoachAccess from '@/components/CoachAccess';
import PlayerForm from '@/components/PlayerForm';
import PlayerList from '@/components/PlayerList';
import PlayerRadar from '@/components/PlayerRadar';
import TeamDisplay from '@/components/TeamDisplay';
import SelectionView from '@/components/SelectionView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Swords, Trophy, Upload, Users, UserPlus } from 'lucide-react';

export default function Index() {
  const [coachId, setCoachId] = useState<string | null>(getLastCoachId());
  const { players, loading, savePlayer, deletePlayer, importPlayers } = usePlayers(coachId);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showTeams, setShowTeams] = useState(false);
  const [teams, setTeams] = useState<{ teamA: Player[]; teamB: Player[] } | null>(null);

  const handleLogin = (id: string) => {
    setCoachId(id);
    setLastCoachId(id);
    toast.success(`Bem-vindo, ${id}!`);
  };

  const handleSave = async (player: Player) => {
    await savePlayer(player);
    if (selectedPlayer?.id === player.id) setSelectedPlayer(player);
  };

  const handleDelete = async (id: string) => {
    await deletePlayer(id);
    if (selectedPlayer?.id === id) setSelectedPlayer(null);
    if (editingPlayer?.id === id) setEditingPlayer(null);
  };

  const handleImport = async () => {
    if (!coachId) return;
    const imported = getImportPlayers();
    const existingNames = new Set(players.map(p => p.name.toLowerCase()));
    const newPlayers = imported.filter(p => !existingNames.has(p.name.toLowerCase()));
    if (newPlayers.length === 0) {
      toast.info('Todos os jogadores já foram importados');
      return;
    }
    await importPlayers(newPlayers);
    toast.success(`${newPlayers.length} jogadores importados!`);
  };

  const handleEscalar = () => {
    try {
      const escalaveisAtivos = players.filter(p => p.escalavel);
      const result = generateTeams(escalaveisAtivos);
      setTeams(result);
      setShowTeams(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeCount = players.filter(p => p.escalavel).length;

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
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="cadastro" className="font-heading gap-2">
                <UserPlus className="h-4 w-4" />
                Cadastro
              </TabsTrigger>
              <TabsTrigger value="selecao" className="font-heading gap-2">
                <Users className="h-4 w-4" />
                Seleção
              </TabsTrigger>
            </TabsList>

            {/* Cadastro Tab */}
            <TabsContent value="cadastro" className="space-y-6">
              <PlayerForm
                onSave={handleSave}
                editingPlayer={editingPlayer}
                onCancelEdit={() => setEditingPlayer(null)}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PlayerRadar player={selectedPlayer} />
                <div className="space-y-4">
                  <PlayerList
                    players={players}
                    onEdit={setEditingPlayer}
                    onDelete={handleDelete}
                    onSelect={setSelectedPlayer}
                    selectedId={selectedPlayer?.id}
                  />
                  <Button
                    onClick={handleImport}
                    variant="outline"
                    className="w-full font-heading gap-2"
                  >
                    <Upload className="h-5 w-5" />
                    Importar Jogadores
                  </Button>
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
