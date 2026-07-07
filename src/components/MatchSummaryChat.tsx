import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types/player';
import { SCOUT_ACTIONS, SCOUT_LABELS, Scouts, calculatePoints } from '@/lib/scoring';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Loader2, Check, X, RefreshCw, Bot, User2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  players: Player[];
  roundId: string;
  initialSummary?: string;
  onApply: (rows: Array<{ playerId: string; scouts: Scouts; points: number }>, summaryText: string) => Promise<void>;
}

interface ParsedRow {
  playerId: string;
  scouts: Scouts;
  note?: string;
}

export default function MatchSummaryChat({ open, onClose, players, roundId, initialSummary, onApply }: Props) {
  const [summary, setSummary] = useState(initialSummary ?? '');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  const playerById = useMemo(() => {
    const m: Record<string, Player> = {};
    for (const p of players) m[p.id] = p;
    return m;
  }, [players]);

  const handleParse = async () => {
    if (summary.trim().length < 10) {
      toast.error('Escreva um resumo com pelo menos algumas frases.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-match-summary', {
        body: {
          summary: summary.trim(),
          players: players.map(p => ({ id: p.id, name: p.name, position: p.positionPrimary })),
        },
      });
      if (error) throw error;
      const parsed = (data?.players ?? []) as Array<ParsedRow & Scouts>;
      if (!parsed.length) {
        toast.warning('A IA não conseguiu identificar jogadores no texto. Tente citar nomes do elenco.');
        setLoading(false);
        return;
      }
      const mapped: ParsedRow[] = parsed.map((p: any) => {
        const scouts: Scouts = {};
        for (const a of SCOUT_ACTIONS) scouts[a] = Number(p[a] ?? 0);
        return { playerId: p.playerId, scouts, note: p.note };
      });
      setRows(mapped);
      setStep('review');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao processar resumo');
    } finally {
      setLoading(false);
    }
  };

  const updateScout = (playerId: string, action: string, delta: number) => {
    setRows(rs => rs.map(r => r.playerId === playerId
      ? { ...r, scouts: { ...r.scouts, [action]: Math.max(0, (r.scouts[action] ?? 0) + delta) } }
      : r));
  };

  const removeRow = (playerId: string) => {
    setRows(rs => rs.filter(r => r.playerId !== playerId));
  };

  const handleConfirm = async () => {
    if (!rows.length) { toast.error('Nada para aplicar.'); return; }
    setLoading(true);
    try {
      const payload = rows.map(r => {
        const player = playerById[r.playerId];
        const points = calculatePoints(r.scouts, player.positionPrimary);
        return { playerId: r.playerId, scouts: r.scouts, points };
      });
      await onApply(payload, summary.trim());
      toast.success(`${payload.length} jogador(es) atualizados pela IA.`);
      handleClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao aplicar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setRows([]);
    onClose();
  };

  const visibleActions = (p: Player) => SCOUT_ACTIONS.filter(a => {
    if (a === 'defesasDificeis' && p.positionPrimary !== 'GL') return false;
    if (a === 'jogoSemSofrerGol' && !['GL', 'ZG', 'LE', 'LD'].includes(p.positionPrimary)) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Preencher com IA
          </DialogTitle>
          <DialogDescription>
            Cole um resumo da pelada. A IA identifica jogadores, gols, assistências e mais — você revisa antes de salvar.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-3 mt-2">
            {/* Assistant bubble */}
            <div className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-full gradient-gold flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted/60 border border-border/50 px-3 py-2 text-xs text-foreground/90 max-w-[85%]">
                Me conta como foi a pelada. Ex: <span className="italic text-muted-foreground">"Time verde ganhou 4x2. João fez 2 gols e deu 1 assistência. Carlos (goleiro) fez 3 defesas difíceis. Ricardo levou amarelo."</span>
              </div>
            </div>

            {/* User bubble (input) */}
            <div className="flex items-start gap-2 justify-end">
              <div className="flex-1 max-w-[85%]">
                <Textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Escreva o resumo da partida..."
                  rows={7}
                  className="resize-none rounded-2xl rounded-tr-sm bg-primary/10 border-primary/30 focus-visible:ring-primary/40"
                />
              </div>
              <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <User2 className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>

            {/* Processing bubble */}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-full gradient-gold flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary-foreground animate-pulse" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted/60 border border-border/50 px-3 py-2 text-xs flex items-center gap-1.5">
                  <span className="text-muted-foreground">Analisando a partida</span>
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '240ms' }} />
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleParse}
                disabled={loading}
                className="gradient-gold text-primary-foreground font-heading gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analisar com IA
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                IA identificou <b>{rows.length}</b> jogador(es). Revise e ajuste antes de salvar.
              </p>
              <Button size="sm" variant="ghost" onClick={() => setStep('input')} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Reeditar texto
              </Button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {rows.map(r => {
                const p = playerById[r.playerId];
                if (!p) return null;
                const points = calculatePoints(r.scouts, p.positionPrimary);
                return (
                  <div key={r.playerId} className="p-3 rounded-md bg-muted/40 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{p.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{p.positionPrimary}</Badge>
                        <span className={`text-xs font-mono ${points >= 0 ? 'text-accent' : 'text-destructive'}`}>
                          {points > 0 ? '+' : ''}{points.toFixed(1)}pts
                        </span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeRow(r.playerId)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {r.note && (
                      <div className="text-[11px] italic text-muted-foreground mb-2">"{r.note}"</div>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {visibleActions(p).map(action => (
                        <div key={action} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-muted-foreground truncate">{SCOUT_LABELS[action]}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="outline" className="h-5 w-5"
                              onClick={() => updateScout(r.playerId, action, -1)}>-</Button>
                            <span className="font-mono w-5 text-center">{r.scouts[action] ?? 0}</span>
                            <Button size="icon" variant="outline" className="h-5 w-5"
                              onClick={() => updateScout(r.playerId, action, +1)}>+</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || rows.length === 0}
                className="gradient-gold text-primary-foreground font-heading gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar e salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
