# Seleção & Escalação Equilibrada

## O que é
Aba "Seleção" — sorteia/monta times equilibrados a partir dos jogadores marcados como disponíveis para a próxima rodada.

## O que ele faz
- Filtra jogadores `escalavel = true`.
- Divide em N times equilibrados por **setor** (não por soma bruta), respeitando formação mínima.
- Exige mínimo de 14 jogadores.
- Aplica regras de formação mínima por time (ao menos 1 GL, mix de linha).
- Preview do balanceamento (indicador visual).
- Exporta escalação como PNG (html2canvas).

## Como funciona
- Componente: `src/components/SelectionView.tsx` + `TeamDisplay.tsx`.
- Lógica: `src/lib/escalation.ts` — média por setor (defesa/meio/ataque/GL) e alocação gulosa balanceada.
- Optimizer de lineup individual: `src/lib/lineupOptimizer.ts` (usado no Analytics/LineupField).

## Dependências
- Depende de: Jogadores (com `escalavel` + atributos + posição).
- Não depende de rodadas.

## Status
Em produção.
