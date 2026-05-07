-- Configurações de integrações externas (Google Calendar, etc)
create table if not exists public.integrations (
  id text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integrations enable row level security;

create policy "Admin le integração"
  on public.integrations for select
  to authenticated
  using (public.my_perfil() = 'admin');

create policy "Admin cria integração"
  on public.integrations for insert
  to authenticated
  with check (public.my_perfil() = 'admin');

create policy "Admin atualiza integração"
  on public.integrations for update
  to authenticated
  using (public.my_perfil() = 'admin');

insert into public.integrations (id, enabled, config)
values (
  'google_calendar',
  false,
  jsonb_build_object(
    'account_label', 'Calendar Operação',
    'calendar_id', '',
    'organizer_email', '',
    'sync_from_phase', 'agendamento',
    'sync_to_phase', 'aulas-gravacoes-previstas',
    'sync_mode', 'on_move'
  )
)
on conflict (id) do nothing;
