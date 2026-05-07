-- Migração V7: motivo/status de arquivamento
-- Execute no Supabase SQL Editor ou via Supabase CLI

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS archive_reason TEXT,
  ADD COLUMN IF NOT EXISTS archive_status TEXT;
