-- Cards demo para validar cenários da trilha completa.
-- Ajuste created_by/responsavel_id para um usuário existente no seu ambiente, se necessário.

insert into public.cards (
  title,
  professor_nome,
  disciplina,
  tipo,
  tipo_solicitacao,
  assunto,
  concurso,
  phase_id,
  prazo,
  data_prova,
  valor_previsto,
  proposta_status
)
values
  ('Vídeo - Em aprovação gestor', 'Professor Demo 01', 'Direito Administrativo', 'Video', 'Vídeo', 'Ato Administrativo', 'TCU', 'aulas-solicitadas', current_date + 7, current_date + 30, 1200, null),
  ('Vídeo - Em espera com pendência', 'Professor Demo 02', 'Direito Constitucional', 'Video', 'Vídeo', 'Controle de Constitucionalidade', 'TRF', 'em-espera', current_date + 2, current_date + 25, 1800, null),
  ('Vídeo - Proposta enviada sem resposta', 'Professor Demo 03', 'Português', 'Video', 'Vídeo', 'Concordância Verbal', 'PF', 'propostas-enviadas', current_date + 5, current_date + 40, 950, 'Proposta enviada'),
  ('Vídeo - Agendamento completo', 'Professor Demo 04', 'Raciocínio Lógico', 'Video', 'Vídeo', 'Lógica Proposicional', 'PM', 'agendamento', current_date + 4, current_date + 20, 1000, 'Aceita'),
  ('Vídeo - Gravação prevista Home Studio', 'Professor Demo 05', 'Contabilidade', 'Video', 'Vídeo', 'Balanço Patrimonial', 'SEFAZ', 'aulas-gravacoes-previstas', current_date + 3, current_date + 28, 1600, 'Aceita'),
  ('Vídeo - Em edição', 'Professor Demo 06', 'Matemática', 'Video', 'Vídeo', 'Regra de Três', 'INSS', 'videos-editar', current_date + 1, current_date + 18, 1100, 'Aceita'),
  ('Vídeo - Publicado aguardando financeiro', 'Professor Demo 07', 'Informática', 'Video', 'Vídeo', 'Windows 11', 'BB', 'publicado-plataforma', current_date - 1, current_date + 12, 1300, 'Aceita'),
  ('Material - Em produção', 'Professor Demo 08', 'Direito Penal', 'Material', 'Material Escrito', 'Crimes contra a Administração', 'PC', 'conteudo-producao', current_date + 6, current_date + 35, 900, 'Aceita'),
  ('Material - Reprovado para correção', 'Professor Demo 09', 'Legislação', 'Material', 'Material Escrito', 'Lei de Licitações', 'CGU', 'conteudo-reprovado', current_date + 2, current_date + 22, 850, 'Aceita'),
  ('Material - Recebido pronto para financeiro', 'Professor Demo 10', 'Administração', 'Material', 'Material Escrito', 'Planejamento Estratégico', 'TCE', 'conteudo-recebido', current_date + 8, current_date + 32, 1400, 'Aceita')
on conflict do nothing;
