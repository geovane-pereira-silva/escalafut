import { useState, useMemo, useCallback, useRef } from 'react';
import { Player, POSITIONS, POSITION_LABELS, getPlayerOverall } from '@/types/player';
import {
  Formation, FORMATIONS, LineupSlot,
  optimizeLineup, suggestCaptain, calculateTeamScore,
} from '@/lib/lineupOptimizer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Wand2, Trash2, Crown, Star, ArrowRight,
  Shield, ChevronDown, Users, Download, Camera,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface LineupFieldProps {
  players: Player[];
  vScores: Record<string, number>;
}

export default function LineupField({ players, vScores }: LineupFieldProps) {
  const [formationName, setFormationName] = useState('4-3-3');
  const [lineup, setLineup] = useState<LineupSlot[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'best-value' | 'top-scorers' | 'most-picked'>('all');

  const formation = FORMATIONS.find(f => f.name === formationName) ?? FORMATIONS[0];
  const escalaveisPlayers = players.filter(p => p.escalavel);

  // Initialize lineup slots when formation changes
  const initSlots = useCallback((f: Formation) => {
    setLineup(f.slots.map((_, i) => ({ slotIndex: i, player: null })));
    setCaptainId(null);
  }, []);

  const handleFormationChange = (name: string) => {
    setFormationName(name);
    const f = FORMATIONS.find(ff => ff.name === name) ?? FORMATIONS[0];
    initSlots(f);
  };

  // Auto-fill Best XI
  const handleAutoFill = () => {
    const result = optimizeLineup(formation, escalaveisPlayers, vScores);
    setLineup(result);
    const captain = suggestCaptain(result, vScores);
    setCaptainId(captain);
  };

  // Clear field
  const handleClear = () => {
    initSlots(formation);
  };

  // Used player IDs
  const usedIds = new Set(lineup.filter(s => s.player).map(s => s.player!.id));

  // Available bench players
  const benchPlayers = useMemo(() => {
    let available = escalaveisPlayers.filter(p => !usedIds.has(p.id));

    switch (filterMode) {
      case 'best-value': {
        // Best value = highest OVR relative to average
        const avgOvr = available.reduce((s, p) => s + getPlayerOverall(p), 0) / (available.length || 1);
        available.sort((a, b) => {
          const aVal = getPlayerOverall(a) / (avgOvr || 1);
          const bVal = getPlayerOverall(b) / (avgOvr || 1);
          return bVal - aVal;
        });
        break;
      }
      case 'top-scorers':
        available.sort((a, b) => (vScores[b.id] ?? 0) - (vScores[a.id] ?? 0));
        break;
      default:
        // Group by position
        available.sort((a, b) => {
          const posA = POSITIONS.indexOf(a.positionPrimary);
          const posB = POSITIONS.indexOf(b.positionPrimary);
          return posA !== posB ? posA - posB : a.name.localeCompare(b.name);
        });
    }
    return available;
  }, [escalaveisPlayers, usedIds, filterMode, vScores]);

  // Team score
  const teamScore = useMemo(() =>
    calculateTeamScore(lineup, vScores, captainId),
    [lineup, vScores, captainId]
  );

  const filledCount = lineup.filter(s => s.player).length;

  // Drag handlers
  const handleDragStart = (playerId: string) => {
    setDragPlayerId(playerId);
  };

  const handleSlotDrop = (slotIndex: number) => {
    if (!dragPlayerId) return;
    const player = players.find(p => p.id === dragPlayerId);
    if (!player) return;

    // Remove player from any existing slot
    setLineup(prev => {
      const updated = prev.map(s =>
        s.player?.id === dragPlayerId ? { ...s, player: null } : s
      );
      updated[slotIndex] = { slotIndex, player };
      return updated;
    });
    setDragPlayerId(null);
  };

  const handleSlotClick = (slotIndex: number) => {
    // If slot has player, remove them
    if (lineup[slotIndex]?.player) {
      setLineup(prev => prev.map(s =>
        s.slotIndex === slotIndex ? { ...s, player: null } : s
      ));
    }
  };

  const toggleCaptain = (playerId: string) => {
    setCaptainId(prev => prev === playerId ? null : playerId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-heading text-primary flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Escalação — Best XI
      </h2>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={formationName} onValueChange={handleFormationChange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATIONS.map(f => (
              <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleAutoFill} className="gradient-gold text-primary-foreground font-heading gap-2">
          <Wand2 className="h-4 w-4" />
          Sugestão da IA
        </Button>

        <Button onClick={handleClear} variant="outline" className="font-heading gap-2">
          <Trash2 className="h-4 w-4" />
          Limpar Campo
        </Button>
      </div>

      {/* Team Score Banner */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-secondary/30">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <span className="font-heading text-primary text-lg">Pontuação da Equipe</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-heading text-2xl text-primary">{teamScore.toFixed(1)}</span>
            <Badge variant="secondary" className="font-heading">{filledCount}/11</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Field */}
        <div className="lg:col-span-2">
          <div
            className="relative w-full rounded-xl overflow-hidden border border-border/50"
            style={{
              aspectRatio: '3/4',
              background: 'linear-gradient(180deg, hsl(145 40% 22%) 0%, hsl(145 35% 18%) 50%, hsl(145 40% 22%) 100%)',
            }}
          >
            {/* Field markings */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Center line */}
              <div className="absolute left-[10%] right-[10%] top-1/2 h-px bg-white/20" />
              {/* Center circle */}
              <div className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              {/* Penalty areas */}
              <div className="absolute left-[20%] right-[20%] top-0 h-[15%] border-b border-l border-r border-white/20" />
              <div className="absolute left-[20%] right-[20%] bottom-0 h-[15%] border-t border-l border-r border-white/20" />
              {/* Goal areas */}
              <div className="absolute left-[30%] right-[30%] top-0 h-[7%] border-b border-l border-r border-white/15" />
              <div className="absolute left-[30%] right-[30%] bottom-0 h-[7%] border-t border-l border-r border-white/15" />
              {/* Sidelines */}
              <div className="absolute left-[10%] right-[10%] top-[2%] bottom-[2%] border border-white/15 rounded" />
            </div>

            {/* Formation slots */}
            {formation.slots.map((slot, idx) => {
              const lineupSlot = lineup[idx];
              const player = lineupSlot?.player;
              const isCaptain = player && captainId === player.id;

              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('scale-110'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('scale-110'); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('scale-110'); handleSlotDrop(idx); }}
                >
                  {player ? (
                    <div
                      className="flex flex-col items-center cursor-pointer group transition-transform hover:scale-105"
                      onClick={() => handleSlotClick(idx)}
                      draggable
                      onDragStart={() => handleDragStart(player.id)}
                    >
                      <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs font-heading shadow-lg transition-colors ${
                        isCaptain
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                          : 'bg-card text-foreground ring-1 ring-border'
                      }`}>
                        {isCaptain && (
                          <Crown className="absolute -top-2 -right-1 h-4 w-4 text-primary" />
                        )}
                        <span className="text-[10px] sm:text-xs">{slot.label}</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-white font-medium mt-0.5 max-w-16 sm:max-w-20 truncate text-center drop-shadow-md">
                        {player.name}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-primary font-mono drop-shadow-md">
                        {(vScores[player.id] ?? getPlayerOverall(player)).toFixed(1)}
                      </span>
                      {/* Captain toggle on hover */}
                      <button
                        className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card rounded-full p-0.5"
                        onClick={(e) => { e.stopPropagation(); toggleCaptain(player.id); }}
                        title="Capitão"
                      >
                        <Crown className={`h-3 w-3 ${isCaptain ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-white/50 font-heading">{slot.label}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench / Player List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-heading text-primary text-sm">Banco</span>
            <Badge variant="outline" className="text-[10px]">{benchPlayers.length}</Badge>
          </div>

          {/* Filters */}
          <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Por Posição</SelectItem>
              <SelectItem value="top-scorers">Maiores Pontuadores</SelectItem>
              <SelectItem value="best-value">Melhor Custo-Benefício</SelectItem>
            </SelectContent>
          </Select>

          {/* Player list */}
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {benchPlayers.map(p => (
              <div
                key={p.id}
                draggable
                onDragStart={() => handleDragStart(p.id)}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border border-transparent hover:border-border cursor-grab active:cursor-grabbing transition-colors"
              >
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 font-heading">
                  {p.positionPrimary}
                </Badge>
                <span className="text-sm truncate flex-1">{p.name}</span>
                <span className="text-[10px] font-mono text-primary shrink-0">
                  {(vScores[p.id] ?? getPlayerOverall(p)).toFixed(1)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            ))}
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
