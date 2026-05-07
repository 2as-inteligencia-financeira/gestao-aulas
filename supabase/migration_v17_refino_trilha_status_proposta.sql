-- Refino final de trilha e status de propostas no próprio card
alter table public.cards
  add column if not exists proposta_motivo text;

update public.cards
set phase_id = 'propostas-enviadas',
    proposta_status = case
      when phase_id = 'propostas-expiradas' then 'Expirada'
      when phase_id = 'propostas-recusadas' then 'Recusada'
      else proposta_status
    end,
    updated_at = now()
where phase_id in ('propostas-expiradas', 'propostas-recusadas');

update public.cards
set phase_id = 'arquivadas',
    archive_status = coalesce(archive_status, 'Solicitação Recusada'),
    updated_at = now()
where phase_id = 'solicitacoes-recusadas';

update public.phase_move_rules
set allowed_phases = array(
  select distinct
    case
      when phase in ('propostas-expiradas', 'propostas-recusadas') then 'arquivadas'
      when phase = 'solicitacoes-recusadas' then 'arquivadas'
      else phase
    end
  from unnest(allowed_phases) as phase
)
where allowed_phases && array[
  'propostas-expiradas',
  'propostas-recusadas',
  'solicitacoes-recusadas'
];
