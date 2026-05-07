-- Migração V11: status da proposta
-- Execute no Supabase SQL Editor ou via Supabase CLI

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS proposta_status TEXT;
