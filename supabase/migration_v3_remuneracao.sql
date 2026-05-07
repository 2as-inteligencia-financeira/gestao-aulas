-- Migração V3: colunas de remuneração e constraint para sync Google Sheets
-- Execute no Supabase SQL Editor

ALTER TABLE professores
  ADD COLUMN IF NOT EXISTS valor_hora_video  NUMERIC(10,2),  -- R$/hora de gravação de vídeo
  ADD COLUMN IF NOT EXISTS valor_pag_teoria  NUMERIC(10,2),  -- R$/quantidade de teoria
  ADD COLUMN IF NOT EXISTS valor_questao_com NUMERIC(10,2),  -- R$/questão comentada
  ADD COLUMN IF NOT EXISTS valor_questao_in  NUMERIC(10,2);  -- R$/questão inédita

-- Constraint única por nome (necessário para o upsert via sync)
-- Se já existe duplicatas de nome, corrija antes de rodar
ALTER TABLE professores
  DROP CONSTRAINT IF EXISTS professores_nome_unique;

ALTER TABLE professores
  ADD CONSTRAINT professores_nome_unique UNIQUE (nome);
