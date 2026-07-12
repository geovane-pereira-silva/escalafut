import { Player, POSITIONS, POSITION_LABELS } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import PlayerCard from './PlayerCard';

interface PlayerListProps {
  players: Player[];
  onEdit: (player: Player) => void;
  onSelect: (player: Player) => void;
  selectedId?: string;
  /** Opcional: mostra toggle de presença nos cards e agrupa por escalável/fora. */
  onTogglePresence?: (player: Player) => void;
}

export default function PlayerList({ players, onEdit, onSelect, selectedId, onTogglePresence }: PlayerListProps) {
  const activePlayers = players.filter(p => p.active);
  const inactivePlayers = players.filter(p => !p.active);

  const groupByPosition = (list: Player[]) =>
    POSITIONS.map(pos => ({
      pos,
      label: POSITION_LABELS[pos],
      players: list.filter(p => p.positionPrimary === pos).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter(g => g.players.length > 0);

  const groupedActive = groupByPosition(activePlayers);
  const confirmados = activePlayers.filter(p => p.escalavel).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading text-primary">
            Elenco <span className="text-muted-foreground text-sm">({players.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {onTogglePresence
              ? 'Edite atributos e marque presença direto no card. Mínimo 14 confirmados para sortear.'
              : 'Cadastro do elenco.'}
          </p>
        </div>
        <Badge variant="secondary" className="font-heading">
          {confirmados} confirmados
        </Badge>
      </div>


      <div className="space-y-5">
        {groupedActive.map(g => (
          <div key={g.pos} className="space-y-2">
            <div className="flex items-baseline gap-2 border-b border-border/60 pb-1.5">
              <h3 className="text-sm font-heading text-primary tracking-wider">
                {g.pos}
              </h3>
              <span className="text-[11px] text-muted-foreground">{g.label}</span>
              <span className="text-[11px] text-muted-foreground/60 ml-auto">{g.players.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {g.players.map(p => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  selected={selectedId === p.id}
                  onSelect={onSelect}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {inactivePlayers.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-baseline gap-2 border-b border-destructive/30 pb-1.5">
            <h3 className="text-sm font-heading text-destructive tracking-wider">Inativos</h3>
            <span className="text-[11px] text-muted-foreground">{inactivePlayers.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {inactivePlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
              <PlayerCard
                key={p.id}
                player={p}
                selected={selectedId === p.id}
                onSelect={onSelect}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
