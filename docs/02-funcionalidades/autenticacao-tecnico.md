# Autenticação do Técnico (Coach Access)

## O que é
Login simples do técnico/organizador para isolar o plantel e o histórico de rodadas dele. Todo dado é chaveado por `coach_id`.

## O que ele faz
- Permite entrar com credenciais de técnico.
- Mantém sessão via Supabase Auth (Lovable Cloud).
- Isola jogadores, rodadas e desempenhos por técnico via RLS.

## Como funciona
- Componente: `src/components/CoachAccess.tsx` (bloco no topo da home).
- Sessão: `supabase.auth` (client em `src/integrations/supabase/client.ts`).
- RLS: todas as tabelas filtram por `coach_id = auth.uid()` (ou papel via `has_role`).

## Dependências
- Depende de: Lovable Cloud (Auth), tabela `user_roles`.
- Dependem dele: `usePlayers`, `useRounds`, e todas as views (Seleção, Rodadas, Analytics).

## Status
Em produção.
