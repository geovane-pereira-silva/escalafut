import { Player, Position, getPlayerOverall } from '@/types/player';
import { computeTeamSectorAvg } from '@/lib/escalation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, MapPin, X, Copy, Cpu, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const POSITION_ORDER: Position[] = ['GL', 'ZG', 'LE', 'LD', 'VO', 'ME', 'PO', 'CA'];

function sortByPosition(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a.positionPrimary);
    const ib = POSITION_ORDER.indexOf(b.positionPrimary);
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });
}

function avgOverall(team: Player[]): number {
  if (!team.length) return 0;
  return team.reduce((s, p) => s + getPlayerOverall(p), 0) / team.length;
}

function buildShareText(teamA: Player[], teamB: Player[]): string {
  const line = (p: Player, i: number) => `${i + 1}. ${p.name} (${p.positionPrimary})`;
  const a = sortByPosition(teamA).map(line).join('\n');
  const b = sortByPosition(teamB).map(line).join('\n');
  return `⚽ Escalação da Pelada\n\n🔵 Time Azul\n${a}\n\n🔴 Time Vermelho\n${b}`;
}

interface TeamDisplayProps {
  open: boolean;
  onClose: () => void;
  teamA: Player[];
  teamB: Player[];
  imbalance: number;
  onOpenField?: () => void;
}

function TeamList({ team, label, colorClass }: { team: Player[]; label: string; colorClass: string }) {
  const sorted = sortByPosition(team);
  return (
    <div className="flex-1 min-w-0 space-y-2">
      <div className={`flex items-center justify-between px-3 py-2 rounded-md ${colorClass}`}>
        <h3 className="font-heading text-base">{label}</h3>
        <span className="text-xs font-mono opacity-80">OVR {avgOverall(team).toFixed(1)}</span>
      </div>
      <ol className="space-y-1">
        {sorted.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 bg-muted/40 rounded px-2.5 py-1.5 text-sm">
            <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{i + 1}.</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-heading shrink-0">
              {p.positionPrimary}
            </Badge>
            <span className="truncate flex-1">{p.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BalanceBar({ teamA, teamB, imbalance }: { teamA: Player[]; teamB: Player[]; imbalance: number }) {
  const avgA = avgOverall(teamA);
  const avgB = avgOverall(teamB);
  const total = avgA + avgB || 1;
  const pctA = (avgA / total) * 100;

  // Convert imbalance (sum of 4 sector abs diffs, ~0 = perfect) into 0-100 score.
  // 0 diff -> 100%, 5+ -> ~0%. Smooth curve.
  const score = Math.max(0, Math.min(100, 100 - imbalance * 20));
  const label =
    score >= 90 ? 'Times muito equilibrados' :
    score >= 75 ? 'Times equilibrados' :
    score >= 55 ? 'Leve diferença de nível' :
    'Times desequilibrados';
  const scoreColor =
    score >= 75 ? 'text-accent' :
    score >= 55 ? 'text-warning' : 'text-destructive';
  const barGlow =
    score >= 75 ? 'shadow-[0_0_18px_hsl(145_60%_45%/0.35)]' :
    score >= 55 ? 'shadow-[0_0_18px_hsl(35_90%_55%/0.3)]' :
    'shadow-[0_0_18px_hsl(0_70%_50%/0.3)]';

  return (
    <div className="rounded-[var(--radius)] border border-border/60 bg-card/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-md gradient-gold flex items-center justify-center shrink-0">
            <Cpu className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-heading tracking-[0.15em] text-muted-foreground uppercase">Motor de Balanceamento</p>
            <p className={`text-sm font-heading ${scoreColor} flex items-center gap-1`}>
              <ShieldCheck className="h-3.5 w-3.5" /> {label}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-heading leading-none ${scoreColor}`}>{score.toFixed(0)}<span className="text-sm text-muted-foreground">%</span></div>
          <div className="text-[10px] tracking-wider text-muted-foreground uppercase">Score de equilíbrio</div>
        </div>
      </div>

      <div className={`flex h-2.5 rounded-full overflow-hidden bg-muted ${barGlow}`}>
        <div className="team-blue-bg transition-[width]" style={{ width: `${pctA}%` }} />
        <div className="team-red-bg transition-[width]" style={{ width: `${100 - pctA}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>Azul OVR {avgA.toFixed(1)}</span>
        <span className="italic">Δ setorial {imbalance.toFixed(2)}</span>
        <span>Vermelho OVR {avgB.toFixed(1)}</span>
      </div>
    </div>
  );
}

export default function TeamDisplay({ open, onClose, teamA, teamB, imbalance, onOpenField }: TeamDisplayProps) {
  const handleShare = async () => {
    const text = buildShareText(teamA, teamB);
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Escalação da Pelada', text });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // user cancelled
      }
    }
    // Fallback: clipboard, then WhatsApp web
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Escalação copiada! Cole no WhatsApp.');
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(teamA, teamB));
      toast.success('Copiado para a área de transferência');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-heading text-lg sm:text-xl text-primary">
            Times sorteados
          </DialogTitle>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="mt-3">
          <BalanceBar teamA={teamA} teamB={teamB} imbalance={imbalance} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <TeamList team={teamA} label="Time Azul" colorClass="team-blue-bg" />
          <TeamList team={teamB} label="Time Vermelho" colorClass="team-red-bg" />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <Button
            onClick={handleShare}
            className="gradient-gold text-primary-foreground font-heading gap-2 flex-1 min-h-[44px]"
          >
            <Share2 className="h-4 w-4" />
            Compartilhar no WhatsApp
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="gap-2 min-h-[44px] sm:w-auto"
            aria-label="Copiar texto"
          >
            <Copy className="h-4 w-4" />
            <span className="sm:hidden">Copiar</span>
          </Button>
          {onOpenField && (
            <Button
              variant="secondary"
              onClick={onOpenField}
              className="gap-2 flex-1 min-h-[44px]"
            >
              <MapPin className="h-4 w-4" />
              Ver no campo / Ajustar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
