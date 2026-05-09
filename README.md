# Gestão de Aulas — 2AS

Aplicação React/Vite com Supabase para gestão de solicitações de aulas, propostas para professores, orçamento, agendamento, gravação, publicação e remuneração.

## Contexto do Produto

O contexto consolidado do projeto está em:

- [docs/contexto-atual.md](docs/contexto-atual.md)
- [docs/perfis-dashboard.md](docs/perfis-dashboard.md)

Esses documentos registram o fluxo atual, perfis de acesso, orçamento, propostas, integrações e pendências de produto.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Supabase

As migrations do projeto ficam em `supabase/` e devem ser aplicadas em sequência quando um ambiente novo for criado.

Edge Functions existentes:

- `create-user`
- `sync-professores`
