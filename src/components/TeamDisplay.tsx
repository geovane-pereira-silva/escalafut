import { Player, Position, POSITION_LABELS, getPlayerOverall, getSectorAvg } from '@/types/player';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const POSITION_ORDER: Position[] = ['GL', 'ZG', 'LE', 'LD', 'VO', 'ME', 'PO', 'CA'];

function sortByPosition(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a.positionPrimary);
    const ib = POSITION_ORDER.indexOf(b.positionPrimary);
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });
}

interface TeamDisplayProps {
  open: boolean;
  onClose: () => void;
  teamA: Player[];
  teamB: Player[];
}

function TeamColumn({ team, label, colorClass, align }: { team: Player[]; label: string; colorClass: string; align: 'left' | 'right' }) {
  const sectors = ['tecnico', 'fisico', 'tatico', 'psicologico'];
  const sectorLabels: Record<string, string> = {
    tecnico: 'TEC', fisico: 'FIS', tatico: 'TAT', psicologico: 'PSI',
  };

  const sorted = sortByPosition(team);
  const isRight = align === 'right';

  return (
    <div className="flex-1 space-y-3">
      <h3 className={`text-lg font-heading text-center py-2 rounded-md ${colorClass}`}>{label}</h3>
      <div className="flex justify-center gap-2 flex-wrap">
        {sectors.map(s => {
          const avg = team.length
            ? (team.reduce((sum, p) => sum + getSectorAvg(p, s), 0) / team.length).toFixed(1)
            : '0';
          return (
            <Badge key={s} variant="outline" className="text-[10px]">
              {sectorLabels[s]}: {avg}
            </Badge>
          );
        })}
      </div>
      <div className="space-y-1.5">
        {sorted.map(p => (
          <div
            key={p.id}
            className={`flex items-center justify-between bg-muted/40 rounded px-3 py-1.5 text-sm ${isRight ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-heading">
                {p.positionPrimary}
              </Badge>
              <span className="truncate">{p.name}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{getPlayerOverall(p).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamDisplay({ open, onClose, teamA, teamB }: TeamDisplayProps) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="font-heading text-xl text-primary">Escalação Inteligente</DialogTitle>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-destructive h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        <div className="flex gap-4 mt-2">
          <TeamColumn team={teamA} label="Time Azul" colorClass="team-blue-bg" align="left" />
          <TeamColumn team={teamB} label="Time Vermelho" colorClass="team-red-bg" align="right" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
