import { useState } from 'react';
import { Player, POSITIONS, POSITION_LABELS, getPlayerOverall, getVisibleSkills, SKILL_LABELS } from '@/types/player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Pencil, Check, UserCheck, UserX } from 'lucide-react';

interface SelectionViewProps {
  players: Player[];
  onUpdatePlayer: (player: Player) => void;
}

function EditSkillsDialog({ player, open, onClose, onSave }: {
  player: Player;
  open: boolean;
  onClose: () => void;
  onSave: (p: Player) => void;
}) {
  const [skills, setSkills] = useState({ ...player.skills });
  const visibleSkills = getVisibleSkills(player.positionPrimary);

  const handleSave = () => {
    onSave({ ...player, skills });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar — {player.name}
            <Badge variant="secondary" className="ml-2">{player.positionPrimary}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-4">
          {visibleSkills.map(sk => (
            <div key={sk} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0 truncate" title={SKILL_LABELS[sk]}>
                {SKILL_LABELS[sk]}
              </span>
              <Slider
                min={0} max={100} step={1}
                value={[skills[sk] ?? 0]}
                onValueChange={([v]) => setSkills(prev => ({ ...prev, [sk]: v }))}
                className="flex-1"
              />
              <span className="text-xs font-mono text-primary w-8 text-right">{skills[sk] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="gradient-gold text-primary-foreground font-heading gap-2">
            <Check className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SelectionView({ players, onUpdatePlayer }: SelectionViewProps) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const escalavel = players.filter(p => p.escalavel);
  const naoEscalavel = players.filter(p => !p.escalavel);

  const groupedEscalavel = POSITIONS.map(pos => ({
    pos,
    label: POSITION_LABELS[pos],
    players: escalavel
      .filter(p => p.positionPrimary === pos)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(g => g.players.length > 0);

  const toggleEscalavel = (player: Player) => {
    onUpdatePlayer({ ...player, escalavel: !player.escalavel });
  };

  const renderPlayerRow = (p: Player) => (
    <div
      key={p.id}
      className={`flex items-center justify-between p-2.5 rounded-md border transition-colors ${
        p.escalavel
          ? 'border-transparent bg-muted/40'
          : 'border-transparent bg-muted/20 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-heading shrink-0">
          {p.positionPrimary}
        </Badge>
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
        <Button
          size="icon" variant="ghost"
          className="h-7 w-7 text-warning hover:text-warning"
          onClick={() => setEditingPlayer(p)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <button
          onClick={() => toggleEscalavel(p)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
            p.escalavel
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
          }`}
        >
          {p.escalavel ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
          {p.escalavel ? 'Escalável' : 'Indisponível'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading text-primary">Quem vai jogar hoje?</h2>
        <p className="text-xs text-muted-foreground">Toque em cada jogador para marcar presença. Mínimo 14 confirmados para sortear.</p>
      </div>

      {/* Escaláveis por posição — sanfonadas */}
      <Accordion
        type="multiple"
        defaultValue={groupedEscalavel.map(g => g.pos)}
        className="w-full space-y-2"
      >
        {groupedEscalavel.map(g => (
          <AccordionItem
            key={g.pos}
            value={g.pos}
            className="border border-border rounded-md bg-card/40 px-3"
          >
            <AccordionTrigger className="text-sm font-heading text-primary tracking-wider min-h-[44px] hover:no-underline">
              <span className="flex items-center gap-2">
                {g.pos} — {g.label}
                <span className="text-xs text-muted-foreground">({g.players.length})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1.5 pt-1">
                {g.players.map(renderPlayerRow)}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Inativos / Não escaláveis */}
      {naoEscalavel.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-heading text-destructive tracking-wider border-b border-destructive/30 pb-1">
            Indisponíveis ({naoEscalavel.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {naoEscalavel
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(renderPlayerRow)}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {editingPlayer && (
        <EditSkillsDialog
          player={editingPlayer}
          open={!!editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={(updated) => {
            onUpdatePlayer(updated);
            setEditingPlayer(null);
          }}
        />
      )}
    </div>
  );
}
