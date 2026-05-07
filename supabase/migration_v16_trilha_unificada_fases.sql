-- Ajustes da trilha unificada de fases (vídeo/material)
alter table public.cards
  add column if not exists publicacao_data timestamptz,
  add column if not exists publicacao_link text;

update public.cards
set phase_id = case
  when phase_id in ('videos-atraso', 'videos-recebidos', 'videos-corrigidos', 'exportacao-pronto') then 'videos-editar'
  when phase_id = 'videos-reprovados' then 'aulas-gravacoes-previstas'
  when phase_id = 'conteudo-atrasado' then 'conteudo-producao'
  else phase_id
end,
updated_at = now()
where phase_id in (
  'videos-atraso',
  'videos-recebidos',
  'videos-reprovados',
  'videos-corrigidos',
  'exportacao-pronto',
  'conteudo-atrasado'
);

update public.phase_move_rules
set allowed_phases = array(
  select distinct
    case
      when phase in ('videos-atraso', 'videos-recebidos', 'videos-corrigidos', 'exportacao-pronto') then 'videos-editar'
      when phase = 'videos-reprovados' then 'aulas-gravacoes-previstas'
      when phase = 'conteudo-atrasado' then 'conteudo-producao'
      else phase
    end
  from unnest(allowed_phases) as phase
)
where allowed_phases && array[
  'videos-atraso',
  'videos-recebidos',
  'videos-reprovados',
  'videos-corrigidos',
  'exportacao-pronto',
  'conteudo-atrasado'
];
