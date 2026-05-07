-- Unifica Home Studio + Estúdios DC em fase única de operação
alter table public.cards
  alter column phase_id type text;

update public.cards
set phase_id = 'aulas-gravacoes-previstas',
    updated_at = now()
where phase_id in ('home-studio', 'estudios-dc');

update public.phase_move_rules
set allowed_phases = array(
  select distinct
    case
      when phase = 'home-studio' then 'aulas-gravacoes-previstas'
      when phase = 'estudios-dc' then 'aulas-gravacoes-previstas'
      else phase
    end
  from unnest(allowed_phases) as phase
)
where allowed_phases && array['home-studio', 'estudios-dc'];
