import { useState, useEffect, useCallback, useMemo } from 'react';
import { Player, Position, POSITION_LABELS, getPlayerOverall } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, RotateCcw, Copy, Trophy, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const POSITION_ORDER: Position[] = ['GL', 'ZG', 'LE', 'LD', 'VO', 'ME', 'PO', 'CA'];

interface LineupStoriesProps {
  teamA: Player[]; // Blue
  teamB: Player[]; // Red
  imbalance: number;
  onResort?: () => void;
  onBackToRoster?: () => void;
}

/**
 * Apresentação estilo Stories do resultado do sorteio.
 * 3 slides: Red → Blue → Lado a lado por posição.
 * Toque no lado direito avança, esquerdo volta. Barrinhas no topo.
 */
export default function LineupStories({ teamA, teamB, imbalance, onResort, onBackToRoster }: LineupStoriesProps) {
  const [step, setStep] = useState(0);
  const total = 3;

  const next = useCallback(() => setStep(s => Math.min(total - 1, s + 1)), []);
  const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) prev();
    else next();
  };

  const buildShareText = () => {
    const fmt = (t: Player[]) => sortByPosition(t).map((p, i) => `${i + 1}. ${p.name} (${p.positionPrimary})`).join('\n');
    return `⚽ Escalação da Pelada\n\n🔴 Time Vermelho\n${fmt(teamB)}\n\n🔵 Time Azul\n${fmt(teamA)}`;
  };

  const handleShare = async () => {
    const text = buildShareText();
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ title: 'Escalação', text }); return; }
      catch (err: any) { if (err?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast.success('Copiado! Cole no WhatsApp.'); }
    catch { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); }
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(buildShareText()); toast.success('Copiado.'); }
    catch { toast.error('Falha ao copiar'); }
  };

  return (
    <div className="relative w-full max-w-md mx-auto h-[calc(100vh-14rem)] min-h-[560px] rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full bg-white transition-all duration-500 ${i < step ? 'w-full' : i === step ? 'w-full' : 'w-0'}`}
            />
          </div>
        ))}
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 z-20" onClick={handleTap} aria-label="Toque à direita para avançar, à esquerda para voltar" />

      {/* Slides */}
      <div className="absolute inset-0 z-10">
        {step === 0 && <TeamSlide team={teamB} label="Time Vermelho" accent="red" imbalance={imbalance} />}
        {step === 1 && <TeamSlide team={teamA} label="Time Azul" accent="blue" imbalance={imbalance} />}
        {step === 2 && <SideBySideSlide teamA={teamA} teamB={teamB} />}
      </div>

      {/* Bottom controls (above tap layer) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-3 flex gap-2 bg-gradient-to-t from-background/95 to-transparent pt-8">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); prev(); }} disabled={step === 0} className="text-foreground/80 h-10 w-10">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); handleShare(); }}
          className="flex-1 gradient-gold text-primary-foreground font-heading gap-2 min-h-[44px]"
        >
          <Share2 className="h-4 w-4" /> Compartilhar
        </Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="text-foreground/80 h-10 w-10" aria-label="Copiar">
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); next(); }} disabled={step === total - 1} className="text-foreground/80 h-10 w-10">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Top-right resort */}
      {onResort && (
        <button
          onClick={(e) => { e.stopPropagation(); onResort(); }}
          className="absolute top-4 right-3 z-30 text-[11px] font-heading tracking-wider text-white/80 hover:text-white bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> Sortear de novo
        </button>
      )}
    </div>
  );
}

function sortByPosition(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a.positionPrimary);
    const ib = POSITION_ORDER.indexOf(b.positionPrimary);
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });
}

function avgOvr(team: Player[]) {
  if (!team.length) return 0;
  return team.reduce((s, p) => s + getPlayerOverall(p), 0) / team.length;
}

function TeamSlide({ team, label, accent, imbalance }: { team: Player[]; label: string; accent: 'red' | 'blue'; imbalance: number }) {
  const sorted = sortByPosition(team);
  const ovr = avgOvr(team);
  const bg = accent === 'red'
    ? 'linear-gradient(160deg, hsl(var(--team-red)) 0%, hsl(4 60% 22%) 100%)'
    : 'linear-gradient(160deg, hsl(var(--team-blue)) 0%, hsl(212 55% 22%) 100%)';

  return (
    <div className="absolute inset-0 flex flex-col text-white animate-in fade-in duration-500" style={{ background: bg }}>
      <div className="pt-10 px-6 pb-3 text-center">
        <p className="text-[11px] tracking-[0.25em] uppercase opacity-80 font-heading">Escalação</p>
        <h2 className="text-3xl font-heading tracking-wide mt-1">{label}</h2>
        <div className="mt-2 inline-flex items-center gap-3 text-xs bg-black/25 rounded-full px-3 py-1">
          <span>OVR médio <b className="font-mono">{ovr.toFixed(1)}</b></span>
          <span className="opacity-60">·</span>
          <span>{team.length} jogadores</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-1.5">
        {sorted.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-white/10">
            <span className="text-xs font-mono opacity-70 w-6 text-right">{i + 1}</span>
            <Badge className="bg-white/20 text-white border-0 font-heading text-[10px] px-1.5">{p.positionPrimary}</Badge>
            <span className="flex-1 font-medium truncate">{p.name}</span>
            <span className="text-xs font-mono opacity-80">{getPlayerOverall(p).toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-16 left-0 right-0 text-center text-[10px] opacity-60 pointer-events-none">
        Toque à direita para ver o próximo time
      </div>
    </div>
  );
}

function SideBySideSlide({ teamA, teamB }: { teamA: Player[]; teamB: Player[] }) {
  // Group by position, pair index-wise.
  const rows = useMemo(() => {
    return POSITION_ORDER.flatMap(pos => {
      const a = teamA.filter(p => p.positionPrimary === pos).sort((x, y) => y.skills.visao - x.skills.visao || x.name.localeCompare(y.name));
      const b = teamB.filter(p => p.positionPrimary === pos).sort((x, y) => y.skills.visao - x.skills.visao || x.name.localeCompare(y.name));
      const max = Math.max(a.length, b.length);
      if (!max) return [];
      return Array.from({ length: max }, (_, i) => ({ pos, a: a[i] ?? null, b: b[i] ?? null }));
    });
  }, [teamA, teamB]);

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-background via-background to-card text-foreground animate-in fade-in duration-500">
      <div className="pt-10 px-4 pb-3 text-center">
        <div className="inline-flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-heading text-primary tracking-wide">Confronto</h2>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Posição por posição — quem joga onde</p>
      </div>

      <div className="grid grid-cols-[1fr_36px_1fr] gap-1.5 px-3 pb-2 text-[10px] font-heading tracking-wider uppercase">
        <div className="text-center text-team-red">Vermelho</div>
        <div />
        <div className="text-center text-team-blue">Azul</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-24 space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_36px_1fr] gap-1.5 items-center">
            <PositionCell player={row.b} side="red" />
            <div className="text-center">
              <div className="text-[9px] font-heading text-muted-foreground tracking-wider">{row.pos}</div>
              <div className="text-[8px] text-muted-foreground/60">{POSITION_LABELS[row.pos].slice(0, 4)}</div>
            </div>
            <PositionCell player={row.a} side="blue" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PositionCell({ player, side }: { player: Player | null; side: 'red' | 'blue' }) {
  if (!player) return <div className="h-11 rounded-md border border-dashed border-border/50" />;
  const bg = side === 'red' ? 'bg-team-red/15 border-team-red/40' : 'bg-team-blue/15 border-team-blue/40';
  const align = side === 'red' ? 'text-right' : 'text-left';
  return (
    <div className={`h-11 rounded-md border ${bg} px-2 py-1 flex items-center gap-1.5 ${side === 'blue' ? '' : 'flex-row-reverse'}`}>
      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{getPlayerOverall(player).toFixed(0)}</span>
      <span className={`flex-1 text-xs font-medium truncate ${align}`}>{player.name}</span>
    </div>
  );
}
