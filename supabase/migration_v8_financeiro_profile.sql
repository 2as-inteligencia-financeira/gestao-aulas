-- Migração V8: perfil Financeiro
-- Execute no Supabase SQL Editor ou via Supabase CLI

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_perfil_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_perfil_check
  CHECK (perfil IN ('admin', 'financeiro', 'gestor', 'operador'));

DROP POLICY IF EXISTS "Admin/Gestor veem todos os cards" ON public.cards;
CREATE POLICY "Admin/Financeiro/Gestor veem todos os cards"
  ON public.cards FOR SELECT
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'financeiro', 'gestor'));

DROP POLICY IF EXISTS "Admin/Gestor editam qualquer card" ON public.cards;
CREATE POLICY "Admin/Financeiro/Gestor editam qualquer card"
  ON public.cards FOR UPDATE
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'financeiro', 'gestor'));

DROP POLICY IF EXISTS "Gestor/Admin veem metas de orçamento" ON public.budget_months;
CREATE POLICY "Gestor/Admin/Financeiro veem metas de orçamento"
  ON public.budget_months FOR SELECT
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'financeiro', 'gestor'));

DROP POLICY IF EXISTS "Gestor/Admin gerenciam metas de orçamento" ON public.budget_months;
CREATE POLICY "Gestor/Admin/Financeiro gerenciam metas de orçamento"
  ON public.budget_months FOR ALL
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'financeiro', 'gestor'))
  WITH CHECK (public.my_perfil() IN ('admin', 'financeiro', 'gestor'));

DROP POLICY IF EXISTS "Admin/Gestor veem orçamento" ON public.orcamento;
CREATE POLICY "Admin/Financeiro/Gestor veem orçamento"
  ON public.orcamento FOR SELECT
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'financeiro', 'gestor'));

DROP POLICY IF EXISTS "Admin/Gestor gerenciam orçamento" ON public.orcamento;
CREATE POLICY "Admin/Financeiro/Gestor gerenciam orçamento"
  ON public.orcamento FOR ALL
  TO authenticated
  USING (public.my_perfil() IN ('admin', 'financeiro', 'gestor'));
