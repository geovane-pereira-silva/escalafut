import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Player, POSITIONS, getPlayerOverall } from '@/types/player';
import {
  Formation, FORMATIONS, LineupSlot,
  optimizeLineup, suggestCaptain, calculateTeamScore,
} from '@/lib/lineupOptimizer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Wand2, Trash2, Crown, Star, ArrowRight,
  Shield, Users, Camera, X,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface LineupFieldProps {
  players: Player[];
  vScores: Record<string, number>;
}

export default function LineupField({ players, vScores }: LineupFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [formationName, setFormationName] = useState('4-3-3');
  const [lineup, setLineup] = useState<LineupSlot[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  // Unified selection state: works for both tap-to-place (mobile) and drag (desktop)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'best-value' | 'top-scorers' | 'most-picked'>('all');
  const [exporting, setExporting] = useState(false);

  const formation = FORMATIONS.find(f => f.name === formationName) ?? FORMATIONS[0];
  const escalaveisPlayers = players.filter(p => p.escalavel);

  const initSlots = useCallback((f: Formation) => {
    setLineup(f.slots.map((_, i) => ({ slotIndex: i, player: null })));
    setCaptainId(null);
    setSelectedPlayerId(null);
  }, []);

  const handleFormationChange = (name: string) => {
    setFormationName(name);
    const f = FORMATIONS.find(ff => ff.name === name) ?? FORMATIONS[0];
    initSlots(f);
  };

  // Ensure lineup slots are always in sync with the current formation length
  useEffect(() => {
    setLineup(prev => {
      if (prev.length === formation.slots.length) return prev;
      return formation.slots.map((_, i) => prev[i] ?? { slotIndex: i, player: null });
    });
  }, [formation]);


  const handleAutoFill = () => {
    const result = optimizeLineup(formation, escalaveisPlayers, vScores);
    setLineup(result);
    const captain = suggestCaptain(result, vScores);
    setCaptainId(captain);
    setSelectedPlayerId(null);
  };

  const handleClear = () => initSlots(formation);

  const usedIds = new Set(lineup.filter(s => s.player).map(s => s.player!.id));

  const benchPlayers = useMemo(() => {
    let available = escalaveisPlayers.filter(p => !usedIds.has(p.id));
    switch (filterMode) {
      case 'best-value': {
        const avgOvr = available.reduce((s, p) => s + getPlayerOverall(p), 0) / (available.length || 1);
        available.sort((a, b) => (getPlayerOverall(b) / (avgOvr || 1)) - (getPlayerOverall(a) / (avgOvr || 1)));
        break;
      }
      case 'top-scorers':
        available.sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0));
        break;
      default:
        available.sort((a, b) => {
          const posA = POSITIONS.indexOf(a.positionPrimary);
          const posB = POSITIONS.indexOf(b.positionPrimary);
          return posA !== posB ? posA - posB : a.name.localeCompare(b.name);
        });
    }
    return available;
  }, [escalaveisPlayers, usedIds, filterMode, vScores]);

  const teamScore = useMemo(() =>
    calculateTeamScore(lineup, vScores, captainId),
    [lineup, vScores, captainId]
  );

  const filledCount = lineup.filter(s => s.player).length;

  /** Place the currently selected player into slotIndex (or move from another slot). */
  const placePlayerInSlot = (playerId: string, slotIndex: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setLineup(prev => {
      const targetOccupant = prev[slotIndex]?.player;
      const sourceSlot = prev.find(s => s.player?.id === playerId);

      return prev.map(s => {
        if (s.slotIndex === slotIndex) return { slotIndex, player };
        // If dragging from another slot, swap target occupant into source slot (if any),
        // otherwise clear the source slot.
        if (sourceSlot && s.slotIndex === sourceSlot.slotIndex) {
          return { slotIndex: s.slotIndex, player: targetOccupant ?? null };
        }
        return s;
      });
    });
    setSelectedPlayerId(null);
  };

  /** Tap on a bench player: toggle selection. */
  const handleBenchTap = (playerId: string) => {
    setSelectedPlayerId(prev => (prev === playerId ? null : playerId));
  };

  /** Tap on a slot: if empty & something selected → place. If filled & something selected → swap/place. If filled & nothing selected → select that field player. */
  const handleSlotTap = (slotIndex: number) => {
    const slot = lineup[slotIndex];
    if (selectedPlayerId) {
      placePlayerInSlot(selectedPlayerId, slotIndex);
      return;
    }
    if (slot?.player) {
      setSelectedPlayerId(slot.player.id);
    }
  };

  const handleRemoveFromSlot = (slotIndex: number) => {
    setLineup(prev => prev.map(s => s.slotIndex === slotIndex ? { ...s, player: null } : s));
    setSelectedPlayerId(null);
  };

  const toggleCaptain = (playerId: string) => {
    setCaptainId(prev => prev === playerId ? null : playerId);
  };

  // Desktop drag (HTML5) — still supported alongside tap
  const handleDragStart = (playerId: string) => setSelectedPlayerId(playerId);
  const handleSlotDrop = (slotIndex: number) => {
    if (selectedPlayerId) placePlayerInSlot(selectedPlayerId, slotIndex);
  };

  const handleExport = async () => {
    if (!fieldRef.current || filledCount === 0) { toast.error('Escale pelo menos 1 jogador'); return; }
    setExporting(true);
    try {
      const el = fieldRef.current;
      // Force capture at the element's actual rendered size, independent of viewport.
      const rect = el.getBoundingClientRect();
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        width: rect.width,
        height: rect.height,
        windowWidth: Math.max(document.documentElement.clientWidth, 1024),
        windowHeight: Math.max(document.documentElement.clientHeight, 1024),
      });
      const link = document.createElement('a');
      link.download = `escalacao-${formationName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Imagem exportada!');
    } catch {
      toast.error('Erro ao exportar imagem');
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-heading text-primary flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Escalação — Best XI
      </h2>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Select value={formationName} onValueChange={handleFormationChange}>
          <SelectTrigger className="w-32 sm:w-36 min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATIONS.map(f => (
              <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleAutoFill} className="gradient-gold text-primary-foreground font-heading gap-2 min-h-[44px]">
          <Wand2 className="h-4 w-4" />
          <span className="hidden xs:inline sm:inline">Sugestão da IA</span>
          <span className="inline xs:hidden sm:hidden">IA</span>
        </Button>

        <Button onClick={handleClear} variant="outline" className="font-heading gap-2 min-h-[44px]">
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Limpar Campo</span>
        </Button>

        <Button onClick={handleExport} variant="outline" className="font-heading gap-2 min-h-[44px]" disabled={exporting || filledCount === 0}>
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Imagem</span>
        </Button>
      </div>

      {/* Team Score Banner */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-secondary/30">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <span className="font-heading text-primary text-base sm:text-lg">Pontuação</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="font-heading text-2xl text-primary">{teamScore.toFixed(1)}</span>
            <Badge variant="secondary" className="font-heading">{filledCount}/11</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Selection hint (mobile-friendly) */}
      {selectedPlayerId && (
        <div className="rounded-md bg-primary/15 border border-primary/40 px-3 py-2 text-xs sm:text-sm text-primary-foreground/90 flex items-center justify-between gap-2">
          <span className="truncate">
            <strong className="text-primary">
              {players.find(p => p.id === selectedPlayerId)?.name}
            </strong>{' '}
            selecionado — toque num slot do campo para posicionar.
          </span>
          <button
            onClick={() => setSelectedPlayerId(null)}
            className="text-xs underline text-primary shrink-0 min-h-[36px] px-2"
          >
            cancelar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Field */}
        <div className="lg:col-span-2 order-1">
          <div
            ref={fieldRef}
            className="relative w-full rounded-xl overflow-hidden border border-border/50 select-none touch-manipulation"
            style={{
              aspectRatio: '3/4',
              background: 'linear-gradient(180deg, hsl(145 40% 22%) 0%, hsl(145 35% 18%) 50%, hsl(145 40% 22%) 100%)',
            }}
          >
            {/* Field markings */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-[10%] right-[10%] top-1/2 h-px bg-white/20" />
              <div className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              <div className="absolute left-[20%] right-[20%] top-0 h-[15%] border-b border-l border-r border-white/20" />
              <div className="absolute left-[20%] right-[20%] bottom-0 h-[15%] border-t border-l border-r border-white/20" />
              <div className="absolute left-[30%] right-[30%] top-0 h-[7%] border-b border-l border-r border-white/15" />
              <div className="absolute left-[30%] right-[30%] bottom-0 h-[7%] border-t border-l border-r border-white/15" />
              <div className="absolute left-[10%] right-[10%] top-[2%] bottom-[2%] border border-white/15 rounded" />
            </div>

            {/* Formation slots */}
            {formation.slots.map((slot, idx) => {
              const lineupSlot = lineup[idx];
              const player = lineupSlot?.player;
              const isCaptain = player && captainId === player.id;
              const isSelected = player && selectedPlayerId === player.id;
              const isTargetable = !!selectedPlayerId && !isSelected;

              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('scale-110'); handleSlotDrop(idx); }}
                >
                  {/* Tap target (44x44 min) — wraps the visible avatar */}
                  <button
                    type="button"
                    onClick={() => handleSlotTap(idx)}
                    aria-label={player ? `Slot ${slot.label}: ${player.name}` : `Slot vazio ${slot.label}`}
                    className={`relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-1 rounded-full transition-transform active:scale-95 ${
                      isTargetable ? 'ring-2 ring-primary/60 ring-offset-1 ring-offset-transparent animate-pulse' : ''
                    }`}
                    draggable={!!player}
                    onDragStart={player ? () => handleDragStart(player.id) : undefined}
                  >
                    {player ? (
                      <>
                        <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs font-heading shadow-lg transition-colors ${
                          isCaptain
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                            : isSelected
                              ? 'bg-accent text-accent-foreground ring-2 ring-accent'
                              : 'bg-card text-foreground ring-1 ring-border'
                        }`}>
                          {isCaptain && (
                            <Crown className="absolute -top-2 -right-1 h-4 w-4 text-primary" />
                          )}
                          <span className="text-[10px] sm:text-xs">{slot.label}</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-white font-medium mt-0.5 max-w-[64px] sm:max-w-20 truncate text-center drop-shadow-md">
                          {player.name}
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-primary font-mono drop-shadow-md">
                          {(vScores[player.id] ?? getPlayerOverall(player)).toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-dashed flex items-center justify-center ${
                        isTargetable ? 'border-primary bg-primary/10' : 'border-white/30'
                      }`}>
                        <span className="text-[10px] sm:text-xs text-white/70 font-heading">{slot.label}</span>
                      </div>
                    )}
                  </button>

                  {/* Secondary action buttons — only for filled slots */}
                  {player && (
                    <div className="absolute -top-2 -right-2 flex flex-col gap-1 z-20">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromSlot(idx); }}
                        aria-label="Remover do campo"
                        className="bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-md active:scale-95"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleCaptain(player.id); }}
                        aria-label="Alternar capitão"
                        className={`rounded-full w-6 h-6 flex items-center justify-center shadow-md active:scale-95 ${
                          isCaptain ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                        }`}
                      >
                        <Crown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench / Player List */}
        <div className="space-y-3 order-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-heading text-primary text-sm">Banco</span>
            <Badge variant="outline" className="text-[10px]">{benchPlayers.length}</Badge>
            <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">
              Toque para selecionar
            </span>
          </div>

          <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
            <SelectTrigger className="w-full min-h-[44px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Por Posição</SelectItem>
              <SelectItem value="top-scorers">Maiores Pontuadores</SelectItem>
              <SelectItem value="best-value">Melhor Custo-Benefício</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-1 max-h-[45vh] lg:max-h-[500px] overflow-y-auto pr-1">
            {benchPlayers.map(p => {
              const isSelected = selectedPlayerId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleBenchTap(p.id)}
                  draggable
                  onDragStart={() => handleDragStart(p.id)}
                  className={`w-full flex items-center gap-2 p-2 min-h-[44px] rounded-md border transition-colors cursor-grab active:cursor-grabbing text-left ${
                    isSelected
                      ? 'bg-primary/20 border-primary ring-1 ring-primary'
                      : 'bg-muted/40 border-transparent hover:border-border'
                  }`}
                  aria-pressed={isSelected}
                >
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 font-heading">
                    {p.positionPrimary}
                  </Badge>
                  <span className="text-sm truncate flex-1">{p.name}</span>
                  <span className="text-[10px] font-mono text-primary shrink-0">
                    {(vScores[p.id] ?? getPlayerOverall(p)).toFixed(1)}
                  </span>
                  <ArrowRight className={`h-3 w-3 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                </button>
              );
            })}
            {benchPlayers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Todos os jogadores foram escalados
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
