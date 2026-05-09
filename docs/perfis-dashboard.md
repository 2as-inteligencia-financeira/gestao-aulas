# Perfis de acesso e dashboard

> Contexto consolidado do projeto: veja também [contexto-atual.md](./contexto-atual.md).

## Perfis

- Admin: acesso total, cria usuários, perfis, integrações e ajustes gerais do fluxo.
- Financeiro: observa tudo, edita e movimenta cards, aprova solicitações e acompanha orçamento. Não altera configurações gerais do fluxo.
- Gestor: cria solicitações, movimenta cards e aprova cards criados por operadores.
- Operador: cria solicitações, movimenta cards e edita cards próprios. Precisa haver delegação/assunção de cards de outro operador em férias, desligamento ou ausência.

## Home futura

- Admin: visão de operação geral, pendências de configuração, usuários, integrações e gargalos por fase.
- Financeiro: aprovações pendentes, orçamento por centro de custo, estouros previstos, realizado por mês e cards aguardando decisão.
- Gestor: solicitações em aberto, cards de operadores aguardando aprovação, atrasos e próximas entregas.
- Operador: meus cards, próximas ações, cards em espera, devoluções/reprovações e solicitações recentes.

## Pendências de modelo

- Definir responsável/delegado do card para permitir transferência temporária ou definitiva.
- Separar permissões de movimento por fase e perfil em configuração própria.
- Criar eventos de auditoria para aprovar, reprovar, arquivar, delegar e alterar orçamento.
