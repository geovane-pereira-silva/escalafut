# IA — Preencher Scouts a partir de Resumo do Jogo

## O que é
Atalho para técnicos preguiçosos: cola um texto contando o que aconteceu na pelada e a IA propõe os scouts por jogador.

## O que ele faz
- Recebe texto livre do resumo do jogo.
- Sugere scouts (gols, assistências, desarmes, defesas, etc.) por jogador identificado.
- Preenche a rodada em massa após confirmação do técnico.
- Guarda o `summary_text` da rodada.

## Como funciona
- UI: `src/components/MatchSummaryChat.tsx` (dialog acionado por "Preencher com IA").
- Backend: edge function `supabase/functions/parse-match-summary/index.ts` — chama Lovable AI Gateway.
- Após confirmação, roda `savePerformance` por jogador + `saveRoundSummary`.

## Dependências
- Depende de: Rodada aberta selecionada, Jogadores `escalavel`, Lovable AI Gateway.

## Status
Em produção.
