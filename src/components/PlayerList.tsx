import { Player, POSITIONS, POSITION_LABELS, getPlayerOverall } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
  onSelect: (player: Player) => void;
  selectedId?: string;
}

export default function PlayerList({ players, onEdit, onDelete, onSelect, selectedId }: PlayerListProps) {
  // Group by position, ordered
  const grouped = POSITIONS.map(pos => ({
    pos,
    label: POSITION_LABELS[pos],
    players: players
      .filter(p => p.positionPrimary === pos)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(g => g.players.length > 0);

  const activeCount = players.filter(p => p.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-primary">
          Jogadores ({players.length})
        </h2>
        <Badge variant="secondary" className="font-heading">
          {activeCount} Ativos
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map(g => (
          <div key={g.pos} className="space-y-2">
            <h3 className="text-sm font-heading text-primary tracking-wider border-b border-border pb-1">
              {g.pos} — {g.label}
            </h3>
            {g.players.map(p => (
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
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 text-warning hover:text-warning"
                    onClick={e => { e.stopPropagation(); onEdit(p); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={e => { e.stopPropagation(); onDelete(p.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
