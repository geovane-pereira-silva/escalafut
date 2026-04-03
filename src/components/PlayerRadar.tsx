import { Player, getVisibleSkills, SKILL_ABBR, SKILL_LABELS } from '@/types/player';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface PlayerRadarProps {
  player: Player | null;
}

export default function PlayerRadar({ player }: PlayerRadarProps) {
  if (!player) {
    return (
      <div className="flex items-center justify-center h-[50vh] bg-card border border-border rounded-lg">
        <p className="text-muted-foreground font-heading">Selecione um jogador para ver o radar</p>
      </div>
    );
  }

  const visible = getVisibleSkills(player.positionPrimary);
  const data = visible.map(sk => ({
    skill: SKILL_ABBR[sk] ?? sk,
    fullName: SKILL_LABELS[sk] ?? sk,
    value: player.skills[sk] ?? 0,
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="text-lg font-heading text-primary mb-2">{player.name} — Radar</h2>
      <div className="h-[50vh] min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(150 12% 25%)" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: 'hsl(45 20% 70%)', fontSize: 10 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 20]} tick={{ fontSize: 9, fill: 'hsl(150 10% 45%)' }} />
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
