-- ============================================================
-- Gestão de Aulas — Luniq  |  Schema Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

-- ── 1. Profiles (estende auth.users) ─────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  perfil      text not null default 'operador'
                check (perfil in ('admin', 'financeiro', 'gestor', 'operador')),
  departamento text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cria profile automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'perfil', 'operador')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. Professores ────────────────────────────────────────
create table if not exists public.professores (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  email           text,
  telefone        text,
  area            text,
  disciplinas     text[],          -- ex: ['Finanças', 'Excel']
  valor_hora      numeric(10,2),
  banco           text,
  agencia         text,
  conta           text,
  tipo_conta      text check (tipo_conta in ('corrente', 'poupanca', 'pix')),
  chave_pix       text,
  observacoes     text,
  ativo           boolean not null default true,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 3. Cards (solicitações) ───────────────────────────────
create table if not exists public.cards (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  professor_id    uuid references public.professores(id) on delete set null,
  professor_nome  text,            -- desnormalizado para exibição rápida
  disciplina      text not null,
  tipo            text not null default 'Video'
                    check (tipo in ('Video', 'Ao Vivo', 'Material')),
  card_number     bigint,
  tipo_solicitacao text,
  solicitante     text,
  assunto         text,
  concurso        text,
  tipo_producao   text default 'Video',
  centro_custo    text not null default 'Academico'
                    check (centro_custo in ('Academico', 'Marketing')),
  prazo           date,
  data_prova      date,
  data_entrega_efetiva date,
  tempo_gravacao  numeric(5,2),    -- em horas (ex: 1.5 = 1h30)
  pag_teoria      integer,         -- páginas de teoria
  pag_questoes_com integer,        -- questões comentadas
  pag_questoes_in integer,         -- questões inéditas
  valor_previsto  numeric(10,2),
  valor_efetivo   numeric(10,2),
  responsavel_id  uuid references public.profiles(id) on delete set null,
  responsavel_nome text,           -- desnormalizado
  observacoes     text,
  archive_reason  text,
  archive_status  text,
  proposta_diretrizes text,
  proposta_objetos jsonb not null default '[]'::jsonb,
  proposta_prazo_aceite date,
  proposta_status text,
  proposta_motivo text,
  agenda_tipo text,
  agenda_modalidade text,
  agenda_inicio timestamptz,
  agenda_fim timestamptz,
  agenda_evento_nome text,
  agenda_invites jsonb not null default '[]'::jsonb,
  gravacao_conteudo_gravado text,
  gravacao_data timestamptz,
  gravacao_link_arquivo text,
  gravacao_material_apoio_link text,
  gravacao_justificativa text,
  publicacao_data timestamptz,
  publicacao_link text,
  phase_id        text not null default 'aulas-solicitadas',
  arquivado       boolean not null default false,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 4. Metas mensais de orçamento ─────────────────────────
create table if not exists public.budget_months (
  month_id       text not null,
  centro_custo   text not null default 'Academico'
                  check (centro_custo in ('Academico', 'Marketing')),
  month_start    date not null,
  meta_despesa   numeric(12,2),
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (month_id, centro_custo)
);

-- ── 5. Orçamento ──────────────────────────────────────────
create table if not exists public.orcamento (
  id               uuid primary key default gen_random_uuid(),
  card_id          uuid not null references public.cards(id) on delete cascade,
  valor_aprovado   numeric(10,2),
  valor_executado  numeric(10,2) default 0,
  status           text not null default 'pendente'
                     check (status in ('pendente', 'aprovado', 'pago', 'cancelado')),
  observacoes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── 6. Histórico de movimentações ────────────────────────
create table if not exists public.card_history (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  from_phase  text,
  to_phase    text not null,
  user_id     uuid references public.profiles(id),
  user_name   text,
  created_at  timestamptz not null default now()
);

-- ── 7. Regras de movimentação por fase ────────────────────
create table if not exists public.phase_move_rules (
  from_phase      text primary key,
  allowed_phases  text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.integrations (
  id          text primary key,
  enabled     boolean not null default false,
  config      jsonb not null default '{}'::jsonb,
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 8. Row Level Security ─────────────────────────────────

alter table public.profiles     enable row level security;
alter table public.professores  enable row level security;
alter table public.cards        enable row level security;
alter table public.budget_months enable row level security;
alter table public.orcamento    enable row level security;
alter table public.card_history enable row level security;
alter table public.phase_move_rules enable row level security;
alter table public.integrations enable row level security;

-- Helper: retorna o perfil do usuário logado
create or replace function public.my_perfil()
returns text language sql security definer stable as $$
  select perfil from public.profiles where id = auth.uid()
$$;

-- ── profiles ──
create policy "Usuários leem todos os profiles"
  on public.profiles for select
  to authenticated using (true);

create policy "Usuário atualiza o próprio perfil"
  on public.profiles for update
  to authenticated using (id = auth.uid());

create policy "Admin atualiza qualquer perfil"
  on public.profiles for update
  to authenticated using (public.my_perfil() = 'admin');

-- ── professores ──
create policy "Autenticados leem professores"
  on public.professores for select
  to authenticated using (true);

create policy "Gestor/Admin criam professores"
  on public.professores for insert
  to authenticated with check (public.my_perfil() in ('gestor', 'admin'));

create policy "Gestor/Admin editam professores"
  on public.professores for update
  to authenticated using (public.my_perfil() in ('gestor', 'admin'));

create policy "Admin deleta professores"
  on public.professores for delete
  to authenticated using (public.my_perfil() = 'admin');

-- ── cards ──
create policy "Admin/Financeiro/Gestor veem todos os cards"
  on public.cards for select
  to authenticated
  using (public.my_perfil() in ('admin', 'financeiro', 'gestor'));

create policy "Operador vê cards onde é responsável"
  on public.cards for select
  to authenticated
  using (
    public.my_perfil() = 'operador'
    and responsavel_id = auth.uid()
  );

create policy "Autenticados criam cards"
  on public.cards for insert
  to authenticated with check (true);

create policy "Admin/Financeiro/Gestor editam qualquer card"
  on public.cards for update
  to authenticated
  using (public.my_perfil() in ('admin', 'financeiro', 'gestor'));

create policy "Operador avança cards onde é responsável"
  on public.cards for update
  to authenticated
  using (
    public.my_perfil() = 'operador'
    and responsavel_id = auth.uid()
  );

create policy "Admin deleta cards"
  on public.cards for delete
  to authenticated using (public.my_perfil() = 'admin');

-- ── orçamento ──
create policy "Gestor/Admin/Financeiro veem metas de orçamento"
  on public.budget_months for select
  to authenticated using (public.my_perfil() in ('admin', 'financeiro', 'gestor'));

create policy "Gestor/Admin/Financeiro gerenciam metas de orçamento"
  on public.budget_months for all
  to authenticated using (public.my_perfil() in ('admin', 'financeiro', 'gestor'))
  with check (public.my_perfil() in ('admin', 'financeiro', 'gestor'));

create policy "Admin/Financeiro/Gestor veem orçamento"
  on public.orcamento for select
  to authenticated using (public.my_perfil() in ('admin', 'financeiro', 'gestor'));

create policy "Admin/Financeiro/Gestor gerenciam orçamento"
  on public.orcamento for all
  to authenticated using (public.my_perfil() in ('admin', 'financeiro', 'gestor'));

-- ── histórico ──
create policy "Autenticados leem histórico dos seus cards"
  on public.card_history for select
  to authenticated using (true);

create policy "Sistema insere histórico"
  on public.card_history for insert
  to authenticated with check (true);

-- ── regras de movimentação ──
create policy "Autenticados veem regras de movimento"
  on public.phase_move_rules for select
  to authenticated using (true);

create policy "Admin gerencia regras de movimento"
  on public.phase_move_rules for all
  to authenticated using (public.my_perfil() = 'admin')
  with check (public.my_perfil() = 'admin');

create policy "Admin lê integrações"
  on public.integrations for select
  to authenticated using (public.my_perfil() = 'admin');

create policy "Admin cria integrações"
  on public.integrations for insert
  to authenticated with check (public.my_perfil() = 'admin');

create policy "Admin atualiza integrações"
  on public.integrations for update
  to authenticated using (public.my_perfil() = 'admin')
  with check (public.my_perfil() = 'admin');

-- ── 9. Índices ────────────────────────────────────────────
create index if not exists idx_cards_phase_id        on public.cards(phase_id);
create index if not exists idx_cards_responsavel_id  on public.cards(responsavel_id);
create index if not exists idx_cards_professor_id    on public.cards(professor_id);
create index if not exists idx_cards_prazo           on public.cards(prazo);
create index if not exists idx_cards_proposta_prazo_aceite on public.cards(proposta_prazo_aceite);
create index if not exists idx_cards_centro_custo    on public.cards(centro_custo);
create index if not exists idx_cards_data_entrega_efetiva on public.cards(data_entrega_efetiva);
create index if not exists idx_budget_months_centro_custo on public.budget_months(centro_custo);
create index if not exists idx_card_history_card_id  on public.card_history(card_id);
create index if not exists idx_orcamento_card_id     on public.orcamento(card_id);
