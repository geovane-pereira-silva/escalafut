import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface CoachAccessProps {
  onLogin: (coachId: string) => void;
  initialId?: string;
}

export default function CoachAccess({ onLogin, initialId }: CoachAccessProps) {
  const [id, setId] = useState(initialId ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = id.trim();
    if (trimmed) onLogin(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
      <Shield className="h-6 w-6 text-primary shrink-0" />
      <h2 className="text-lg font-heading text-primary shrink-0">Técnico</h2>
      <Input
        placeholder="Nome ou ID do Técnico"
        value={id}
        onChange={e => setId(e.target.value)}
        className="max-w-xs"
      />
      <Button type="submit" size="sm" className="gradient-gold text-primary-foreground font-heading shrink-0">
        Entrar
      </Button>
    </form>
  );
}
