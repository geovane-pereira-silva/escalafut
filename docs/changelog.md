# Changelog — Escalafut

Formato: entradas novas SEMPRE no topo. Nunca apagar entradas antigas.

```
## [YYYY-MM-DD] — Título curto
- O que foi feito:
- Arquivos/componentes afetados:
- Por quê:
```

---

## [2026-07-12] — Elenco unificado + aba Escalação em Stories
- O que foi feito:
  - Fundidas as abas "Presença" e "Cadastro" numa única aba **Elenco**: PlayerForm, PlayerRadar e PlayerList no mesmo lugar. Cada card do `PlayerList` recebeu um toggle de presença opcional (`onTogglePresence` no `PlayerCard`), então editar atributos, ver radar e marcar presença acontecem sem trocar de tela.
  - Nova aba **Escalação** exibindo o resultado do último sorteio em formato de Stories (3 slides: Time Vermelho fullscreen → Time Azul fullscreen → lado a lado por posição). Navegação por toque (metade esquerda volta, direita avança), setas do teclado, barras segmentadas de progresso no topo. Componente novo: `src/components/LineupStories.tsx`.
  - Botão sticky **Escalar** no rodapé da aba Elenco agora leva direto para a aba Escalação com os times prontos (não abre mais modal).
  - Critério de desempate no algoritmo de distribuição (`lib/escalation.ts`): quando dois jogadores empatam na média técnica primária, desempate por (1) score na posição secundária, (2) atributo `visao` como proxy de "capacidade de decidir jogo".
  - `TeamDisplay` (modal antigo) e `LineupField` (dialog do campo) continuam no repo, mas fora do fluxo principal — o novo caminho é `Escalar → Stories`. `SelectionView` também segue existindo mas não é mais referenciada.
- Arquivos: `src/lib/escalation.ts`, `src/components/PlayerCard.tsx`, `src/components/PlayerList.tsx`, `src/components/LineupStories.tsx` (novo), `src/pages/Index.tsx`.
- Por quê: eliminar a duplicidade Presença × Cadastro (fonte histórica de confusão com o toggle de disponibilidade) e transformar o "resultado do sorteio" numa experiência de apresentação (jogada boa pra mostrar no vestiário).

## [2026-07-11] — Pausa das etapas 2–7 do plano de refatoração
- O que foi feito: `.lovable/plan.md` marcado como PAUSADO nas etapas 2–7 até nova autorização. Etapa 1 (bug fixes) segue válida.
- Por quê: unificação Elenco/Presença mexe nos mesmos componentes que as etapas 2–3 iriam refatorar; rodar em paralelo geraria conflito.



## [2026-07-10] — Documentação viva `/docs`
- O que foi feito: criada estrutura `/docs` com visão geral, arquitetura, um arquivo por módulo (jogadores, rodadas, seleção, analytics, IA, auth, branding) e este changelog retroativo.
- Arquivos/componentes afetados: `docs/**` (novo).
- Por quê: manter memória viva do projeto para evitar retrabalho e contradição entre entregas.

## [2026-07-10] — Etapa 1 de refatoração: bug fixes
- O que foi feito: `safeGet/safeSet` em `storage.ts`; correção do divisor no `calculateVScore`; label "Desarmes" separado de defesas do GL; `setLoading` em `finally` e logs `[useRounds.*]`; `usePlayers` idem; estabilização de deps de `useEffect` em `Index.tsx` e `RoundManager.tsx` (roundsCount/finalizedCount); `perfIndex` Map para V-Score O(P×R).
- Arquivos: `src/lib/storage.ts`, `src/lib/scoring.ts`, `src/hooks/useRounds.ts`, `src/hooks/usePlayers.ts`, `src/pages/Index.tsx`, `src/components/RoundManager.tsx`.
- Por quê: race conditions, V-Score inflado para <5 jogos, crashes em Safari privado, refetch desnecessário.

## [2026-07-10] — Plano de refatoração em 7 etapas
- O que foi feito: `.lovable/plan.md` com etapas 1–7 (bugs, erros, componentização, UI/A11y, performance, SEO, docs).
- Arquivos: `.lovable/plan.md`.
- Por quê: dar visibilidade e permitir aprovação etapa a etapa.

## [2026-07-10] — Remoção completa de branding Lovable
- O que foi feito: varredura e limpeza de qualquer referência a Lovable no produto — metadados, textos, comentários, README.
- Arquivos: `index.html`, `README.md`, `src/App.css`, `src/index.css`.
- Por quê: identidade final é Escalafut, sem watermark de plataforma.

## [2026-07-10] — Correção retroativa da escala de atributos 0–20 → 0–100
- O que foi feito: migração SQL multiplicando por 5 e clampando em 100 os 38 jogadores importados em lote; ajuste do `importPlayers.ts` para gerar diretamente em 0–100 (variance 5, `Math.min(100, …)`); goleiro `* 10`. Backup `players_backup_pre_scale_fix.csv` preservado.
- Arquivos: `src/lib/importPlayers.ts` + dados em `players`.
- Por quê: `PlayerForm` sempre foi 0–100 e o import legacy era 0–20 — OVR/radar quebrados. Sem runtime scale (`scaleUp/Down` proibidos).

## [pré-2026-07-10] — Base do produto (retroativo, resumido)
- O que foi feito: MVP funcional do Escalafut — auth do técnico, CRUD de jogadores com atributos e status (sem delete), rodadas com scouts e finalização, V-Score/consistência (🔥/❄️), seleção equilibrada por setor com mínimo de 14 jogadores e formação mínima, Dream Team 1-3-3-4 e awards automáticos, optimizer de lineup com drag-and-drop, export PNG (html2canvas), IA para preencher scouts a partir de resumo do jogo (edge function `parse-match-summary`), seed de 37 jogadores iniciais, PWA.
- Arquivos: praticamente todo `src/` + `supabase/functions/parse-match-summary`.
- Por quê: entregar o núcleo do produto (gestão de pelada premium).
