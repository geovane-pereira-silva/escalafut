import { Player, getPlayerOverall, getSectorAvg } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, CheckCircle2, XCircle, UserCheck, UserX } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  onSelect: (p: Player) => void;
  onEdit: (p: Player) => void;
  /** Se fornecido, renderiza um botão de toggle presença/escalável no card. */
  onTogglePresence?: (p: Player) => void;
}


// Position → refined tint tokens (desaturated, luxo/minimal)
const POS_TINT: Record<string, { bg: string; ring: string; label: string }> = {
  GL: { bg: 'hsl(38 45% 55% / 0.14)', ring: 'hsl(38 45% 62%)',  label: 'text-warning' },
  ZG: { bg: 'hsl(212 40% 55% / 0.14)', ring: 'hsl(212 45% 62%)', label: 'text-team-blue' },
  LE: { bg: 'hsl(212 40% 55% / 0.14)', ring: 'hsl(212 45% 62%)', label: 'text-team-blue' },
  LD: { bg: 'hsl(212 40% 55% / 0.14)', ring: 'hsl(212 45% 62%)', label: 'text-team-blue' },
  VO: { bg: 'hsl(158 30% 45% / 0.16)', ring: 'hsl(158 32% 55%)', label: 'text-accent' },
  ME: { bg: 'hsl(158 30% 45% / 0.16)', ring: 'hsl(158 32% 55%)', label: 'text-accent' },
  PO: { bg: 'hsl(4 55% 55% / 0.14)',   ring: 'hsl(4 60% 62%)',   label: 'text-destructive' },
  CA: { bg: 'hsl(4 55% 55% / 0.14)',   ring: 'hsl(4 60% 62%)',   label: 'text-destructive' },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// OVR tiers on 0-100 scale
function ovrStyle(ovr: number): { className: string; label: string } {
  if (ovr >= 80) return { className: 'gradient-gold text-primary-foreground shadow-[0_0_18px_hsl(45_80%_55%/0.4)]', label: 'Elite' };
  if (ovr >= 65) return { className: 'bg-primary/90 text-primary-foreground', label: 'Alto' };
  if (ovr >= 50) return { className: 'bg-accent/80 text-accent-foreground', label: 'Médio' };
  return { className: 'bg-muted text-muted-foreground', label: 'Base' };
}

// Small radar contour, no labels
function MiniRadar({ player, color }: { player: Player; color: string }) {
  const size = 44;
  const cx = size / 2, cy = size / 2;
  const r = 18;
  const sectors = ['tecnico', 'fisico', 'tatico', 'psicologico'];
  const points = sectors.map((s, i) => {
    const v = Math.min(100, Math.max(0, getSectorAvg(player, s))) / 100;
    const angle = (Math.PI * 2 * i) / sectors.length - Math.PI / 2;
    const x = cx + Math.cos(angle) * r * v;
    const y = cy + Math.sin(angle) * r * v;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const grid = sectors.map((_, i) => {
    const a = (Math.PI * 2 * i) / sectors.length - Math.PI / 2;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <polygon points={grid} fill="none" stroke="hsl(var(--border))" strokeWidth={0.6} />
      <polygon points={points} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.2} />
    </svg>
  );
}

export default function PlayerCard({ player, selected, onSelect, onEdit, onTogglePresence }: PlayerCardProps) {
  const tint = POS_TINT[player.positionPrimary] ?? POS_TINT.VO;
  const ovr = getPlayerOverall(player);
  const ovrS = ovrStyle(ovr);
  const inactive = !player.active;
  const notEscalavel = player.active && !player.escalavel;

  return (
    <div
      onClick={() => onSelect(player)}
      className={`group relative flex items-center gap-3 p-3 rounded-[var(--radius)] cursor-pointer border transition-all
        ${selected
          ? 'border-primary bg-primary/10 shadow-[0_6px_20px_-8px_hsl(45_80%_55%/0.5)]'
          : 'border-border/60 bg-card/60 hover:border-border hover:bg-card shadow-[0_2px_10px_-6px_hsl(0_0%_0%/0.5)]'}
        ${inactive ? 'opacity-55' : ''}`}
    >
      {/* Avatar */}
      <div
        className="relative shrink-0 h-12 w-12 rounded-full flex items-center justify-center font-heading text-base tracking-wider"
        style={{
          background: tint.bg,
          boxShadow: `inset 0 0 0 1.5px ${tint.ring}`,
        }}
      >
        <span className={tint.label}>{initials(player.name)}</span>
      </div>

      {/* Identity + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium truncate text-sm">{player.name}</span>
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-current ${tint.label} font-heading`}>
            {player.positionPrimary}
          </Badge>
          {player.positionSecondary && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground border-muted-foreground/40">
              {player.positionSecondary}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {inactive ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <XCircle className="h-3 w-3" /> Inativo
            </span>
          ) : notEscalavel ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-destructive/90">
              <XCircle className="h-3 w-3" /> Fora hoje
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-accent">
              <CheckCircle2 className="h-3 w-3" /> Escalável
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/70">· leitura</span>
        </div>
      </div>

      {/* Mini radar */}
      <MiniRadar player={player} color={`hsl(var(--primary))`} />

      {/* OVR badge */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`h-11 w-11 rounded-full flex items-center justify-center font-heading text-lg leading-none ${ovrS.className}`}>
          {ovr.toFixed(0)}
        </div>
        <span className="text-[9px] font-heading text-muted-foreground mt-0.5 tracking-wider">{ovrS.label}</span>
      </div>

      {/* Edit */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-warning hover:text-warning shrink-0"
        onClick={e => { e.stopPropagation(); onEdit(player); }}
        aria-label={`Editar ${player.name}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
