# /docs — Documentação viva do Escalafut

Esta pasta é a **memória do projeto**. O agente (Lovable) deve:

1. **Ler antes de agir.** Antes de qualquer nova implementação:
   - Consultar `02-funcionalidades/` para checar se algo parecido já existe.
   - Consultar as últimas entradas de `changelog.md` para não contradizer entregas recentes.
   - Se o pedido já existir (ou for muito parecido), **avisar o usuário** antes de criar do zero e perguntar se é para reaproveitar/estender.

2. **Atualizar depois de agir.** A cada mudança relevante:
   - Editar/criar o arquivo do módulo em `02-funcionalidades/`.
   - Adicionar uma entrada NOVA no TOPO de `changelog.md` (nunca apagar antigas).

## Estrutura

```
docs/
  README.md                 este arquivo (regra de ouro)
  changelog.md              histórico cronológico (topo = mais recente)
  01-sistema/
    visao-geral.md
    arquitetura.md
  02-funcionalidades/
    autenticacao-tecnico.md
    jogadores.md
    rodadas.md
    selecao-escalacao.md
    analytics.md
    ia-resumo-jogo.md
    branding.md
```

## Padrão de cada módulo em `02-funcionalidades/`

```
# Nome do Módulo

## O que é
## O que ele faz
## Como funciona
## Dependências
## Status   (Em produção | Em desenvolvimento | Planejado)
```
