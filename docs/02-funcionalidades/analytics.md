# Analytics Dashboard

## O que é
Painel de estatísticas agregadas do grupo — evolução, Dream Team e prêmios automáticos com base nas rodadas finalizadas.

## O que ele faz
- Evolução do time ao longo das rodadas (gráfico linha).
- **Dream Team** com formação 1-3-3-4 (melhores por posição por V-Score).
- Awards automáticos: artilheiro, garçom (assists), muralha (GL), consistência, etc.
- Export PNG do Dream Team.

## Como funciona
- Componente: `src/components/AnalyticsDashboard.tsx`.
- Campo visual: `src/components/LineupField.tsx`.
- Fonte: `player_performances` de rodadas `finalized` + atributos dos jogadores.
- Cálculos derivados de `scoring.ts` e `lineupOptimizer.ts`.

## Dependências
- Depende de: Rodadas finalizadas, Jogadores.

## Status
Em produção.
