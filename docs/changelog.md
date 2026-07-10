# Changelog — Escalafut

Formato: entradas novas SEMPRE no topo. Nunca apagar entradas antigas.

```
## [YYYY-MM-DD] — Título curto
- O que foi feito:
- Arquivos/componentes afetados:
- Por quê:
```

---

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
