import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Player, Position, POSITIONS, POSITION_LABELS, getVisibleSkills, SKILL_LABELS } from '@/types/player';
import { toast } from 'sonner';
import { UserPlus, Save } from 'lucide-react';

interface PlayerFormProps {
  onSave: (player: Player) => void;
  editingPlayer: Player | null;
  onCancelEdit: () => void;
}

function capitalize(name: string) {
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

export default function PlayerForm({ onSave, editingPlayer, onCancelEdit }: PlayerFormProps) {
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [posPrimary, setPosPrimary] = useState<Position>('ZG');
  const [posSecondary, setPosSecondary] = useState<Position | ''>('');
  const [skills, setSkills] = useState<Record<string, number>>({});

  useEffect(() => {
    if (editingPlayer) {
      setName(editingPlayer.name);
      setActive(editingPlayer.active);
      setPosPrimary(editingPlayer.positionPrimary);
      setPosSecondary(editingPlayer.positionSecondary);
      setSkills({ ...editingPlayer.skills });
    }
  }, [editingPlayer]);

  const visibleSkills = getVisibleSkills(posPrimary);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Informe o nome do jogador'); return; }

    const player: Player = {
      id: editingPlayer?.id ?? crypto.randomUUID(),
      name: capitalize(name.trim()),
      active,
      positionPrimary: posPrimary,
      positionSecondary: posSecondary,
      skills: { ...skills },
    };
    onSave(player);
    toast.success(editingPlayer ? 'Jogador atualizado!' : 'Jogador cadastrado!');

    // Reset form but keep position
    setName('');
    setActive(true);
    setPosSecondary('');
    setSkills({});
    if (editingPlayer) onCancelEdit();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-5 space-y-5">
      <h2 className="text-xl font-heading text-primary flex items-center gap-2">
        <UserPlus className="h-5 w-5" />
        {editingPlayer ? 'Editar Jogador' : 'Cadastrar Jogador'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Jogador" />
        </div>
        <div className="space-y-1.5">
          <Label>Posição Principal</Label>
          <Select value={posPrimary} onValueChange={v => setPosPrimary(v as Position)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITIONS.map(p => (
                <SelectItem key={p} value={p}>{p} - {POSITION_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Posição Secundária</Label>
          <Select value={posSecondary || 'none'} onValueChange={v => setPosSecondary(v === 'none' ? '' : v as Position)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {POSITIONS.filter(p => p !== posPrimary).map(p => (
                <SelectItem key={p} value={p}>{p} - {POSITION_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Label>Ativo</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-3">
        <h3 className="text-sm font-heading text-muted-foreground tracking-wider">Habilidades</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {visibleSkills.map(sk => (
            <div key={sk} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0 truncate" title={SKILL_LABELS[sk]}>
                {SKILL_LABELS[sk]}
              </span>
              <Slider
                min={0} max={20} step={1}
                value={[skills[sk] ?? 0]}
                onValueChange={([v]) => setSkills(prev => ({ ...prev, [sk]: v }))}
                className="flex-1"
              />
              <span className="text-xs font-mono text-primary w-6 text-right">{skills[sk] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="gradient-gold text-primary-foreground font-heading gap-2">
          <Save className="h-4 w-4" />
          {editingPlayer ? 'Atualizar' : 'Salvar'}
        </Button>
        {editingPlayer && (
          <Button type="button" variant="outline" onClick={onCancelEdit}>Cancelar</Button>
        )}
      </div>
    </form>
  );
}
