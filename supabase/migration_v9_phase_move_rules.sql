-- Migração V9: configuração de movimentos permitidos por fase
-- Execute no Supabase SQL Editor ou via Supabase CLI

CREATE TABLE IF NOT EXISTS public.phase_move_rules (
  from_phase     TEXT PRIMARY KEY,
  allowed_phases TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.phase_move_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados veem regras de movimento" ON public.phase_move_rules;
CREATE POLICY "Autenticados veem regras de movimento"
  ON public.phase_move_rules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin gerencia regras de movimento" ON public.phase_move_rules;
CREATE POLICY "Admin gerencia regras de movimento"
  ON public.phase_move_rules FOR ALL
  TO authenticated
  USING (public.my_perfil() = 'admin')
  WITH CHECK (public.my_perfil() = 'admin');
