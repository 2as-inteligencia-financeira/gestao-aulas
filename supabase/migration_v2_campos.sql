-- Migração V2: novos campos da solicitação de aulas
-- Execute no Supabase SQL Editor

-- Sequência para numeração automática dos cards
CREATE SEQUENCE IF NOT EXISTS cards_card_number_seq START 1001;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS card_number        BIGINT DEFAULT nextval('cards_card_number_seq'),
  ADD COLUMN IF NOT EXISTS tipo_solicitacao   TEXT,
  ADD COLUMN IF NOT EXISTS solicitante        TEXT,
  ADD COLUMN IF NOT EXISTS professor_id       UUID REFERENCES professores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assunto            TEXT,
  ADD COLUMN IF NOT EXISTS concurso           TEXT,
  ADD COLUMN IF NOT EXISTS tipo_producao      TEXT DEFAULT 'Video',
  ADD COLUMN IF NOT EXISTS data_prova         DATE,
  ADD COLUMN IF NOT EXISTS tempo_gravacao     NUMERIC(5,2),  -- em horas (ex: 1.5 = 1h30)
  ADD COLUMN IF NOT EXISTS pag_teoria         INTEGER,       -- páginas de teoria
  ADD COLUMN IF NOT EXISTS pag_questoes_com   INTEGER,       -- questões comentadas
  ADD COLUMN IF NOT EXISTS pag_questoes_in    INTEGER;       -- questões inéditas

-- Numera cards já existentes que ainda não têm número
UPDATE cards
SET card_number = nextval('cards_card_number_seq')
WHERE card_number IS NULL;

-- Índice para busca rápida por número
CREATE UNIQUE INDEX IF NOT EXISTS cards_card_number_idx ON cards(card_number);
