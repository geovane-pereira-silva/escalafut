# Arquitetura

## Stack
- **Frontend:** React 18 + Vite 5 + TypeScript 5.
- **UI:** Tailwind CSS v3 + shadcn/ui (Radix primitives). Tokens semânticos em `src/index.css` e `tailwind.config.ts`.
- **Gráficos:** Recharts (radar, evolução).
- **Export PNG:** html2canvas (escalação, resumos).
- **Backend:** Lovable Cloud (Supabase gerenciado) — Postgres + Auth + Edge Functions.
- **IA:** Edge function `parse-match-summary` (Lovable AI Gateway) para extrair scouts a partir de texto livre do jogo.
- **Testes:** Vitest + Playwright (fixture presente).
- **PWA:** `src/pwa/registerSW.ts`.

## Estrutura de pastas
```
src/
  components/         Componentes de tela (PlayerList, RoundManager, AnalyticsDashboard, LineupField...)
    ui/               shadcn primitives — não editar manualmente sem cuidado
  hooks/              usePlayers, useRounds (leitura/escrita Supabase)
  lib/                scoring.ts, escalation.ts, lineupOptimizer.ts, importPlayers.ts, storage.ts
  pages/              Index (home com tabs), NotFound
  integrations/supabase/  client.ts e types.ts (AUTO-GERADOS — não editar)
  types/player.ts     Tipos de domínio (Player, POSITIONS, atributos)
supabase/functions/parse-match-summary/  Edge function IA
docs/                 Esta documentação viva
```

## Convenções
- **Escala de atributos:** 0–100 (após migração retroativa). `importPlayers.ts` gera nessa escala. Nunca reintroduzir `scaleUp/scaleDown`.
- **Roles:** guardados em tabela separada `user_roles` (nunca no profile). Função `has_role` SECURITY DEFINER.
- **RLS:** obrigatório em toda tabela pública, com `GRANT` explícito.
- **Cores:** só tokens semânticos (`bg-primary`, `text-accent`, etc.). Nunca `text-white`, `bg-[#...]`.
- **Cliente Supabase:** `import { supabase } from "@/integrations/supabase/client"`.
- **Storage local:** sempre via `src/lib/storage.ts` (safeGet/safeSet com fallback em memória).

## Modelo de dados (resumo)
- `players` — jogadores globais + atributos 0–100 (chaveados por `coach_id`).
- `rounds` — rodadas cronológicas (status `open` | `finalized`, `summary_text`).
- `player_performances` — scouts + `points_calculated` por (player, round).
- `user_roles` — papéis (admin/coach/user).

## Deploy
- Preview: `id-preview--…lovable.app`
- Produção: `escalafut.lovable.app`
