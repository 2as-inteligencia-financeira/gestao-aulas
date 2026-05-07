-- Migração V10: parametrização de propostas em Solicitações Aprovadas
-- Execute no Supabase SQL Editor ou via Supabase CLI

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS proposta_diretrizes TEXT,
  ADD COLUMN IF NOT EXISTS proposta_objetos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS proposta_prazo_aceite DATE;

CREATE INDEX IF NOT EXISTS idx_cards_proposta_prazo_aceite
  ON public.cards(proposta_prazo_aceite);
