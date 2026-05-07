-- Migração V5: controle mensal de orçamento
-- Execute no Supabase SQL Editor ou via Supabase CLI

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS data_entrega_efetiva DATE;

CREATE TABLE IF NOT EXISTS public.budget_months (
  month_id       TEXT PRIMARY KEY,
  month_start    DATE NOT NULL UNIQUE,
  meta_despesa   NUMERIC(12,2),
  observacoes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_months ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestor/Admin veem metas de orçamento" ON public.budget_months;
CREATE POLICY "Gestor/Admin veem metas de orçamento"
  ON public.budget_months FOR SELECT
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'gestor'));

DROP POLICY IF EXISTS "Gestor/Admin gerenciam metas de orçamento" ON public.budget_months;
CREATE POLICY "Gestor/Admin gerenciam metas de orçamento"
  ON public.budget_months FOR ALL
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'gestor'))
  WITH CHECK (public.my_perfil() IN ('admin', 'gestor'));

CREATE INDEX IF NOT EXISTS idx_cards_prazo ON public.cards(prazo);
CREATE INDEX IF NOT EXISTS idx_cards_data_entrega_efetiva ON public.cards(data_entrega_efetiva);
