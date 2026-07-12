# Plano completo — Escalafut

> **STATUS (2026-07-12):** Etapa 1 concluída e válida. Etapas 2–7 **PAUSADAS** por decisão do usuário até nova autorização — a unificação Elenco+Presença e a aba Escalação Stories mexeram nos mesmos componentes-alvo (SelectionView, PlayerList, PlayerCard) e continuar em paralelo geraria conflito.

Escopo enorme. Vou entregar em **7 etapas independentes**, cada uma commitável e testável isoladamente. Você aprova o plano e depois decide se executo tudo em sequência ou só algumas etapas.



Antes de começar: preciso confirmar prioridade. Se você quer tudo, executo na ordem abaixo (do que dá mais risco/valor para o menos). Se quiser só parte, me diga quais etapas.

---

## Etapa 1 — Auditoria de bugs e correções críticas

Varredura em `src/` procurando:
- Estados inconsistentes em `useRounds`, `usePlayers` (race conditions em fetch/save paralelos).
- Uso de `any` em pontos sensíveis (scoring, escalação).
- Chaves React ausentes/duplicadas em listas (`PlayerList`, `RoundManager`, `AnalyticsDashboard`).
- `useEffect` com dependências faltando (bug clássico do `fetchAllPerformances` recalculando).
- Cálculo de `vScores`/`consistency` em `RoundManager` — hoje refaz para todos os jogadores toda vez que `allPerformances` muda (O(P×R) sem memo estável).
- Divisões por zero em `scoring.ts` e `escalation.ts`.
- Validação de input ausente em `PlayerForm` e no chat de IA (`MatchSummaryChat`).
- `localStorage` sem try/catch (quebra em Safari privado).

Cada bug corrigido vem com: arquivo, linha, o que era, o que virou, por quê.

## Etapa 2 — Tratamento de erros robusto

- `ErrorBoundary` já existe mas não está aplicado por rota. Vou envolver cada aba principal (`Selecao`, `Rodadas`, `Analytics`) individualmente para uma aba quebrada não derrubar o app.
- Padronizar `try/catch` em todos os hooks Supabase (`useRounds`, `usePlayers`) com toast + log estruturado.
- Adicionar `retry` com backoff em fetches Supabase (React Query já está no projeto mas subutilizado — migrar leituras para `useQuery`).
- Wrapper único `src/lib/safeStorage.ts` para localStorage com fallback em memória.
- Edge function `parse-match-summary`: validar payload com Zod, retornar erros tipados.

## Etapa 3 — Componentização e reutilização

Componentes hoje inchados que vou quebrar:
- `RoundManager.tsx` (~360 linhas) → `RoundSelector`, `RoundVScoreRanking`, `RoundPlayerGroup`, `ScoutInputDialog` (extrair), `useVScores` hook, `useConsistency` hook.
- `PlayerList.tsx` → `PlayerCardCompact`, `PlayerFilters`, `PlayerGrouping` (por posição/status).
- `AnalyticsDashboard.tsx` → `DreamTeamCard`, `TeamEvolutionChart`, `AwardsPanel`.
- `SelectionView.tsx` → `TeamPreview`, `BalanceIndicator`.

Além disso: primitivos genéricos em `src/components/common/`:
- `StatBadge`, `PositionBadge`, `PlayerAvatar`, `EmptyState`, `SectionHeader`.

## Etapa 4 — UI moderna, responsiva, acessível

- **Mobile first real**: revisar toda a home (`Index.tsx`), tabs com scroll horizontal em telas <380px, botões primários com `min-h-11`.
- **Trocar `h-screen` por `h-dvh`** nos containers de página.
- **A11y**:
  - `aria-label` em todos os botões só-ícone (Plus, Lock, Sparkles, etc.).
  - `<main>` único no layout, `<section>` com `aria-labelledby` em cada bloco.
  - Contraste: substituir usos de `text-muted-foreground/50` e cinzas arbitrários por tokens.
  - Foco visível consistente (`focus-visible:ring-2 ring-primary`).
  - Radar chart com descrição textual acessível (`aria-describedby` apontando pra lista de atributos).
- **Micro-motion** com `framer-motion` (já instalável): entrada de cards, transição de aba. Nada exagerado.
- Skeleton loaders para listas enquanto Supabase carrega.

## Etapa 5 — Performance

- **Memoização real**: `useMemo` estável em `vScores`/`consistency` chaveado por `rounds.length + allPerformances.length` em vez de referências que mudam a cada fetch.
- **Virtualização** da lista de jogadores quando >30 (`react-window`).
- **Code splitting**: `AnalyticsDashboard` e `LineupField` via `React.lazy` (usam recharts e html2canvas, pesados).
- **Bundle**: mover `html2canvas` para import dinâmico só no clique de export PNG.
- **Recharts**: importar só os módulos usados, não o pacote inteiro.
- **Supabase**: reduzir round-trips em `fetchAllPerformances` (hoje pode ser 1 select com join em vez de N).
- Preload da hero image no `index.html` se houver LCP identificável.

## Etapa 6 — SEO e AI Search

Este site é PT-BR, público-alvo Brasil. Vou:
- Rodar um scan de SEO (aprovação necessária) e corrigir tudo que aparecer.
- Trocar `<html lang="en">` por `lang="pt-BR"`.
- Adicionar JSON-LD `SoftwareApplication` + `Organization` em `index.html`.
- `sitemap.xml` e `robots.txt` já existem — revisar e adicionar `Sitemap:` apontando pra `escalafut.lovable.app`.
- Landing/hero com H1 claro ("Escalafut — Gestão de peladas e times amadores"), meta description otimizada para queries reais (usar Semrush para validar volumes de "escalação time pelada", "app pelada amador", "sortear time futebol equilibrado").
- Canonical self-referente na home.
- Estratégia de conteúdo (fora de código, entrega em markdown): páginas satélite futuras (`/como-funciona`, `/sortear-times`) — não crio agora, só desenho o plano.

## Etapa 7 — Documentação e comentários

- JSDoc nos hooks públicos (`usePlayers`, `useRounds`) e em `lib/scoring.ts`, `lib/escalation.ts`, `lib/lineupOptimizer.ts` (fórmulas críticas).
- `README.md` reescrito: arquitetura, como rodar, glossário (V-Score, OVR, consistência), decisões de escala 0-100.
- ADRs curtos em `docs/adr/` para: escala de atributos, separação status/escalável, decisão de guardar performances por rodada.

---

## Detalhes técnicos

- Cada etapa = um conjunto de commits. Reporto arquivos alterados com `git diff --stat` de verdade ao fim.
- Nenhuma etapa toca em dados do Supabase (a correção de escala 0-20 → 0-100 já foi feita).
- Etapa 4 pode envolver instalar `framer-motion` e `react-window` — aviso antes.
- Não vou introduzir novo framework, novo state manager, nem migrar rotas.

---

## O que preciso de você

1. Aprovar o plano (ou pedir ajustes/remoções).
2. Confirmar se executo **tudo em sequência** ou **etapa por etapa com sua aprovação entre elas** (recomendo etapa por etapa — o escopo é grande e você quer ver o diff de cada uma).
3. Para a Etapa 6 (SEO), autorizar o scan quando eu pedir.
