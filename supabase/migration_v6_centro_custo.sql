-- Migração V6: centro de custo nos cards e no orçamento
-- Execute no Supabase SQL Editor ou via Supabase CLI

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS centro_custo TEXT NOT NULL DEFAULT 'Academico'
    CHECK (centro_custo IN ('Academico', 'Marketing'));

ALTER TABLE budget_months
  ADD COLUMN IF NOT EXISTS centro_custo TEXT NOT NULL DEFAULT 'Academico'
    CHECK (centro_custo IN ('Academico', 'Marketing'));

DROP INDEX IF EXISTS budget_months_month_id_key;
ALTER TABLE budget_months
  DROP CONSTRAINT IF EXISTS budget_months_month_start_key,
  DROP CONSTRAINT IF EXISTS budget_months_pkey;

ALTER TABLE budget_months
  ADD CONSTRAINT budget_months_pkey PRIMARY KEY (month_id, centro_custo);

CREATE INDEX IF NOT EXISTS idx_cards_centro_custo ON public.cards(centro_custo);
CREATE INDEX IF NOT EXISTS idx_budget_months_centro_custo ON public.budget_months(centro_custo);
