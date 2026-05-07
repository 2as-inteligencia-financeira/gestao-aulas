-- Campos operacionais da fase de agendamento
alter table public.cards
  add column if not exists agenda_tipo text,
  add column if not exists agenda_modalidade text,
  add column if not exists agenda_inicio timestamptz,
  add column if not exists agenda_fim timestamptz,
  add column if not exists agenda_evento_nome text,
  add column if not exists agenda_invites jsonb not null default '[]'::jsonb;
