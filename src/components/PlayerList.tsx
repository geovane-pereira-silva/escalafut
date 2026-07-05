import { Player, POSITIONS, POSITION_LABELS, getPlayerOverall } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  onEdit: (player: Player) => void;
  onSelect: (player: Player) => void;
  selectedId?: string;
}

export default function PlayerList({ players, onEdit, onSelect, selectedId }: PlayerListProps) {
  const activePlayers = players.filter(p => p.active);
  const inactivePlayers = players.filter(p => !p.active);

  const groupByPosition = (list: Player[]) =>
    POSITIONS.map(pos => ({
      pos,
      label: POSITION_LABELS[pos],
      players: list.filter(p => p.positionPrimary === pos).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter(g => g.players.length > 0);

  const groupedActive = groupByPosition(activePlayers);

  const renderPlayer = (p: Player) => (
    <div
      key={p.id}
      onClick={() => onSelect(p)}
      className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors border ${
        selectedId === p.id
          ? 'border-primary bg-primary/10'
          : 'border-transparent bg-muted/40 hover:bg-muted/70'
      } ${!p.active ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium truncate">{p.name}</span>
        {p.positionSecondary && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {p.positionSecondary}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          OVR {getPlayerOverall(p).toFixed(1)}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {p.active && !p.escalavel && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/40 text-destructive">
            Fora hoje
          </Badge>
        )}
        <Button
          size="icon" variant="ghost"
          className="h-7 w-7 text-warning hover:text-warning"
          onClick={e => { e.stopPropagation(); onEdit(p); }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-primary">
          Jogadores ({players.length})
        </h2>
        <Badge variant="secondary" className="font-heading">
          {activePlayers.filter(p => p.escalavel).length} Disponíveis
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupedActive.map(g => (
          <div key={g.pos} className="space-y-2">
            <h3 className="text-sm font-heading text-primary tracking-wider border-b border-border pb-1">
              {g.pos} — {g.label}
            </h3>
            {g.players.map(renderPlayer)}
          </div>
        ))}
      </div>

      {inactivePlayers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-heading text-destructive tracking-wider border-b border-destructive/30 pb-1">
            Inativos ({inactivePlayers.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {inactivePlayers.sort((a, b) => a.name.localeCompare(b.name)).map(renderPlayer)}
          </div>
        </div>
      )}
    </div>
  );
}
