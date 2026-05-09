# Contexto atual do projeto

Última atualização: 2026-05-07

## Produto

O projeto é uma aplicação React/Vite com Supabase para gestão do fluxo de solicitações de aulas/conteúdo da 2AS. O núcleo do produto é um Kanban operacional com fases, orçamento por centro de custo, propostas para professores, agendamento/gravação, publicação e remuneração.

## Navegação atual

- Página Inicial: dashboard por perfil, com indicadores, filtros, cards críticos e visão operacional.
- Kanban: board principal por fases, busca de cards, modal de edição e movimentação.
- Professores: cadastro/listagem de professores e parâmetros de remuneração.
- Colaboradores: usuários ativos e edição de perfil.
- Orçamento: metas mensais por centro de custo, previsto, realizado e disponível.
- Admin: criação de usuários, sincronização de professores e configurações administrativas.

## Perfis

- Admin: acesso total, cria usuários, altera perfis, integrações e configura regras gerais.
- Financeiro: observa tudo, edita/movimenta cards, aprova solicitações e acompanha orçamento. Não altera configurações gerais de fluxo.
- Gestor: cria solicitações, movimenta cards e aprova cards criados por operadores.
- Operador: cria solicitações, movimenta cards e altera seus próprios cards. Ainda precisa de modelo formal de delegação/assunção de cards de outro operador em férias/desligamento/ausência.

## Fluxo de fases

Fases atuais em `src/data/phases.js`:

- Aulas Solicitadas
- Em Espera
- Solicitações Aprovadas
- Propostas Enviadas
- Conteúdo em Produção
- Conteúdo Recebido
- Conteúdo Reprovado
- Conteúdo Corrigido
- Agendamento
- Aulas e Gravações Previstas
- Gravação Não Realizada
- Vídeos para Editar
- Publicado na Plataforma
- Remuneração do Professor
- Concluído
- Arquivadas

As fases antigas de propostas expiradas/recusadas foram refinadas para status no próprio card em `Propostas Enviadas`/arquivamento, conforme `migration_v17_refino_trilha_status_proposta.sql`.

## Movimentação de cards

O modal do card tem painel de movimentação. O Admin pode configurar destinos permitidos por fase pela tabela `phase_move_rules`.

Regras padrão relevantes:

- Aulas Solicitadas: Em Espera, Solicitações Aprovadas, Arquivadas.
- Solicitações Aprovadas: Propostas Enviadas, Agendamento, Arquivadas, Aulas Solicitadas, Em Espera.
- Propostas Enviadas: arquivamento/encerramento e aceite para Conteúdo em Produção ou Agendamento conforme tipo do card.
- Agendamento: Aulas e Gravações Previstas, Gravação Não Realizada, Arquivadas.
- Aulas e Gravações Previstas: Vídeos para Editar, Conteúdo em Produção, Gravação Não Realizada.
- Conteúdo em Produção: Conteúdo Recebido, Conteúdo Reprovado.
- Conteúdo Reprovado: Conteúdo Corrigido, Arquivadas.
- Vídeos para Editar: Publicado na Plataforma ou retorno para Aulas e Gravações Previstas.
- Publicado na Plataforma/Conteúdo Recebido: Remuneração do Professor.

## Modal do card

Decisão de UX atual:

- Manter padrão de duas colunas em todas as fases:
  - esquerda: solicitação original/resumo/histórico;
  - direita: campos da fase atual e movimentação abaixo.
- Em Solicitações Aprovadas, campos iniciais do card saem do topo e ficam em Solicitação Original.
- Proposta ao Professor ocupa a área principal.

Campos atuais de proposta:

- Diretrizes
- Link e Nome dos Objetos, com múltiplas linhas
- Prazo para Aceite da Proposta
- Texto para WhatsApp gerado automaticamente
- Status da proposta nas fases posteriores

Texto de WhatsApp atual:

- Professor
- Disciplina e assunto puxados do card
- Concurso
- Tipo
- Tempo solicitado se vídeo
- Quantidade solicitada se material escrito
- Prazo de entrega
- Valor previsto
- Placeholder de link público da proposta

Pendente imediato:

- Corrigir/garantir persistência do `proposta_prazo_aceite` ao mover de Solicitações Aprovadas para Propostas Enviadas. Foi observado um card em Propostas Enviadas mostrando "Sem prazo de aceite informado" mesmo após o prazo ter sido preenchido na fase anterior.

## Orçamento

Centros de custo:

- Academico
- Marketing

Regras:

- A meta é mensal por centro de custo em `budget_months`.
- O previsto consome orçamento a partir do momento em que o card entra em `Solicitações Aprovadas`.
- Cards em Aulas Solicitadas/Em Espera ainda não consomem previsto.
- Arquivadas não consome previsto.
- Realizado usa `data_entrega_efetiva`/`valor_efetivo`; há fallback por `updated_at` para cards em Remuneração do Professor/Concluído sem data efetiva.

## Propostas para professores

Estratégia de produto:

- O operador continua usando WhatsApp manualmente.
- O sistema gera texto simples para copiar.
- Próximo passo planejado: gerar link público seguro da proposta, com token, para o professor aceitar ou recusar sem login.

Fluxo desejado:

- Solicitações Aprovadas: operador parametriza proposta e copia texto/link.
- Propostas Enviadas: mostra status e vencimento da proposta.
- Professor aceita:
  - Material Escrito -> Conteúdo em Produção.
  - Vídeo -> Agendamento.
- Professor recusa: exige motivo e encerra/arquiva com status de recusa.
- Proposta vencida: deve ser sinalizada e depois automatizada.

## Agendamento e gravação

Migrations recentes adicionaram campos de agendamento/gravação:

- Google Calendar previsto em `integrations`.
- Campos de gravação prevista:
  - conteúdo gravado
  - data de gravação
  - link do arquivo
  - link do material de apoio
  - justificativa
- Campos de publicação:
  - `publicacao_data`
  - `publicacao_link`

Integração planejada:

- Google Calendar configurável por Admin via tabela `integrations`.
- Configuração inicial criada para `google_calendar`, desligada por padrão.

## Supabase

Principais tabelas/colunas evoluídas:

- `cards`: campos de solicitação, proposta, orçamento, centro de custo, agendamento, gravação, publicação, arquivamento e status.
- `budget_months`: metas mensais por centro de custo.
- `phase_move_rules`: regras de movimentação configuráveis por Admin.
- `integrations`: configurações de integrações externas.
- `profiles`: perfis admin, financeiro, gestor, operador.
- `professores`: cadastro e parâmetros de remuneração.

Edge Functions:

- `create-user`: criação de usuários por Admin.
- `sync-professores`: sincronização de professores a partir de Google Sheets.

## Migrations

Sequência atual relevante:

- v2: campos de solicitação e numeração.
- v3: remuneração de professores.
- v4: valores previsto/efetivo.
- v5: orçamento mensal.
- v6: centro de custo.
- v7: motivo/status de arquivamento.
- v8: perfil Financeiro.
- v9: regras de movimentação por fase.
- v10: campos de proposta.
- v11: status da proposta.
- v12-v13: campos e unificação de agendamento.
- v14: integrações externas.
- v15: campos de gravação prevista.
- v16: trilha unificada de fases.
- v17: refino de trilha/status de proposta.

## Pendências de produto

- Link público/tokenizado para aceite/recusa da proposta.
- Expiração automática de proposta.
- Histórico detalhado por fase no painel esquerdo do modal.
- Delegação/transferência de cards entre operadores.
- Configuração mais robusta de permissões por perfil e fase.
- Tela Admin para integrações, regras de fase e parâmetros gerais.
- Dashboard final por perfil com métricas refinadas.
- Integração Google Calendar real quando o fluxo de agendamento estiver estabilizado.
