import { useEffect, useState } from 'react';
import { Player, getVisibleSkills, SKILL_ABBR, SKILL_LABELS, getSectorAvg } from '@/types/player';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PlayerRadarProps {
  player: Player | null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

const SECTORS = [
  { key: 'tecnico', label: 'Técnico' },
  { key: 'fisico', label: 'Físico' },
  { key: 'tatico', label: 'Tático' },
  { key: 'psicologico', label: 'Psicológico' },
];

export default function PlayerRadar({ player }: PlayerRadarProps) {
  const isMobile = useIsMobile();
  const [detailed, setDetailed] = useState(false);

  if (!player) {
    return (
      <div className="flex items-center justify-center h-[38vh] min-h-[220px] bg-card border border-border rounded-lg">
        <p className="text-muted-foreground font-heading text-sm text-center px-4">
          Selecione um jogador para ver o radar
        </p>
      </div>
    );
  }

  // Mobile compact = only 4 sector averages; desktop or opt-in detailed = all attributes
  const showDetailed = detailed || !isMobile;

  const data = showDetailed
    ? getVisibleSkills(player.positionPrimary).map(sk => ({
        skill: SKILL_ABBR[sk] ?? sk,
        fullName: SKILL_LABELS[sk] ?? sk,
        value: player.skills[sk] ?? 0,
      }))
    : SECTORS.map(s => ({
        skill: s.label,
        fullName: s.label,
        value: Math.round(getSectorAvg(player, s.key)),
      }));

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h2 className="text-lg font-heading text-primary truncate">{player.name} — Radar</h2>
        {isMobile && (
          <div className="flex items-center gap-2">
            <Label htmlFor="radar-detailed" className="text-xs text-muted-foreground">Detalhado</Label>
            <Switch
              id="radar-detailed"
              checked={detailed}
              onCheckedChange={setDetailed}
            />
          </div>
        )}
      </div>
      <div className="w-full h-[38vh] min-h-[240px] max-h-[320px] sm:h-[50vh] sm:max-h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="hsl(150 12% 25%)" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: 'hsl(45 20% 70%)', fontSize: showDetailed ? 10 : 13 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(150 10% 45%)' }} />
            <Radar
              name={player.name}
              dataKey="value"
              stroke="hsl(45 80% 55%)"
              fill="hsl(45 80% 55%)"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded px-3 py-1.5 text-xs">
                    <span className="text-foreground font-medium">{d.fullName}</span>: {d.value}
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
