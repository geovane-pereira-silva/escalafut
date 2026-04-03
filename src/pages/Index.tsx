import { useState, useCallback } from 'react';
import { Player } from '@/types/player';
import { savePlayers, loadPlayers, saveLastFormation, loadLastFormation, getLastCoachId, setLastCoachId } from '@/lib/storage';
import { generateTeams } from '@/lib/escalation';
import CoachAccess from '@/components/CoachAccess';
import PlayerForm from '@/components/PlayerForm';
import PlayerList from '@/components/PlayerList';
import PlayerRadar from '@/components/PlayerRadar';
import TeamDisplay from '@/components/TeamDisplay';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Swords, Trophy, Upload } from 'lucide-react';
import { getImportPlayers } from '@/lib/importPlayers';

export default function Index() {
  const [coachId, setCoachId] = useState<string | null>(getLastCoachId());
  const [players, setPlayers] = useState<Player[]>(() => {
    const id = getLastCoachId();
    return id ? loadPlayers(id) : [];
  });
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showTeams, setShowTeams] = useState(false);
  const [teams, setTeams] = useState<{ teamA: Player[]; teamB: Player[] } | null>(() => {
    const id = getLastCoachId();
    return id ? loadLastFormation(id) : null;
  });

  const persist = useCallback((newPlayers: Player[], cId: string) => {
    setPlayers(newPlayers);
    savePlayers(cId, newPlayers);
  }, []);

  const handleLogin = (id: string) => {
    setCoachId(id);
    setLastCoachId(id);
    const loaded = loadPlayers(id);
    setPlayers(loaded);
    setTeams(loadLastFormation(id));
    toast.success(`Bem-vindo, ${id}!`);
  };

  const handleSave = (player: Player) => {
    if (!coachId) return;
    const exists = players.findIndex(p => p.id === player.id);
    let updated: Player[];
    if (exists >= 0) {
      updated = [...players];
      updated[exists] = player;
    } else {
      updated = [...players, player];
    }
    persist(updated, coachId);
    // Update selected if same
    if (selectedPlayer?.id === player.id) setSelectedPlayer(player);
  };

  const handleDelete = (id: string) => {
    if (!coachId) return;
    persist(players.filter(p => p.id !== id), coachId);
    if (selectedPlayer?.id === id) setSelectedPlayer(null);
    if (editingPlayer?.id === id) setEditingPlayer(null);
  };

  const handleImport = () => {
    if (!coachId) return;
    const imported = getImportPlayers();
    const merged = [...players];
    for (const p of imported) {
      if (!merged.find(e => e.name.toLowerCase() === p.name.toLowerCase())) {
        merged.push(p);
      }
    }
    persist(merged, coachId);
    toast.success(`${imported.length} jogadores importados!`);
  };

  const handleEscalar = () => {
    if (!coachId) return;
    try {
      const result = generateTeams(players);
      setTeams(result);
      saveLastFormation(coachId, result);
      setShowTeams(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeCount = players.filter(p => p.active).length;

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
          <>
            {/* Form */}
            <PlayerForm
              onSave={handleSave}
              editingPlayer={editingPlayer}
              onCancelEdit={() => setEditingPlayer(null)}
            />

            {/* Radar + List */}
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
                  onClick={handleEscalar}
                  disabled={activeCount < 14}
                  className="w-full gradient-gold text-primary-foreground font-heading text-lg py-6 gap-2"
                >
                  <Swords className="h-5 w-5" />
                  Escalar Times ({activeCount}/14 ativos)
                </Button>
              </div>
            </div>

            {/* Team modal */}
            {teams && (
              <TeamDisplay
                open={showTeams}
                onClose={() => setShowTeams(false)}
                teamA={teams.teamA}
                teamB={teams.teamB}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Trophy className="h-16 w-16 text-primary/40" />
            <p className="text-muted-foreground font-heading text-lg">
              Insira seu Nome/ID de Técnico para começar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
