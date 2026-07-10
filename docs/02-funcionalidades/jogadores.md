# Jogadores (Plantel)

## O que é
CRUD do elenco do técnico. Cada jogador tem identidade, posição primária, status e atributos técnicos/físicos (0–100).

## O que ele faz
- Cadastra, edita e mantém jogadores (nunca deleta — usa status).
- Marca status: **Ativo / Inativo** e **Disponível / Indisponível** (para a próxima rodada).
- Formulário de atributos escondido por padrão (expansível).
- Radar de atributos por jogador.
- Import em lote inicial (37 jogadores pré-carregados, escala 0–100).

## Como funciona
- Tipos: `src/types/player.ts` (`Player`, `POSITIONS`, `POSITION_LABELS`).
- Hook: `src/hooks/usePlayers.ts` (fetch/insert/update com log estruturado e loading em finally).
- UI: `PlayerList.tsx`, `PlayerCard.tsx`, `PlayerForm.tsx`, `PlayerRadar.tsx`.
- Import inicial: `src/lib/importPlayers.ts` — gera atributos direto em 0–100 (variance 5, clamped em 100). **Nunca reintroduzir escala 0–20.**
- OVR: calculado em runtime a partir dos atributos ponderados por posição (goleiro tem pesos próprios; skills de linha ficam ocultas para GL).

## Dependências
- Depende de: Auth do técnico, Supabase (`players`).
- Dependem dele: Rodadas, Seleção (escalação), Analytics, Optimizer.

## Status
Em produção.
