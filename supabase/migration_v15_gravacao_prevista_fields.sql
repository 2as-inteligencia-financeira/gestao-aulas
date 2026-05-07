-- Campos da fase "Aulas e Gravações Previstas"
alter table public.cards
  add column if not exists gravacao_conteudo_gravado text,
  add column if not exists gravacao_data timestamptz,
  add column if not exists gravacao_link_arquivo text,
  add column if not exists gravacao_material_apoio_link text,
  add column if not exists gravacao_justificativa text;
