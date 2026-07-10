# Rodadas & Desempenho

## O que é
Registro cronológico de cada pelada, com scouts individuais e pontuação por jogador. Base para V-Score, consistência e analytics.

## O que ele faz
- Cria rodadas numeradas (sugere próximo número automaticamente).
- Registra scouts por jogador (gols, assistências, desarmes, defesas difíceis se GL, jogo sem sofrer gol para defensores, etc.).
- Calcula pontos por jogador via `calculatePoints` (pesos por posição).
- Finaliza rodada (lock — não permite mais edição).
- Mostra resumo de fechamento com destaques.
- Ranking V-Score (média ponderada das últimas 5 rodadas).
- Indicadores de consistência: 🔥 hot (3 últimas acima da média) / ❄️ cold (3 abaixo).
- Preenchimento assistido por IA a partir de um texto de resumo do jogo.

## Como funciona
- Hook: `src/hooks/useRounds.ts` — `fetchRounds`, `fetchPerformances`, `fetchAllPerformances`, `createRound`, `savePerformance`, `finalizeRound`, `saveRoundSummary`.
- UI: `src/components/RoundManager.tsx` (+ `ScoutInputDialog`, `RoundClosureSummary.tsx`, `MatchSummaryChat.tsx`).
- Cálculo: `src/lib/scoring.ts` (`SCOUT_ACTIONS`, `calculatePoints`, `calculateVScore`). V-Score usa soma dos pesos aplicados como divisor (jogadores com <5 jogos não são inflacionados).
- Perf index: `Map<"playerId:roundId", pts>` para evitar `find()` O(N) na renderização.
- Rodadas finalizadas ficam com `status='finalized'` e liberam analytics.

## Dependências
- Depende de: Jogadores, Auth, Supabase (`rounds`, `player_performances`).
- Dependem dele: Analytics, Dream Team, awards.

## Status
Em produção.
