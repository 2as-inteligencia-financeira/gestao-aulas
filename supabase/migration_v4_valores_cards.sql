-- Migração V4: valores calculados nos cards
-- Execute no Supabase SQL Editor

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS valor_previsto NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_efetivo  NUMERIC(10,2);
