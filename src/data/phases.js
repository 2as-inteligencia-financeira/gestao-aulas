export const PHASES = [
  { id: 'aulas-solicitadas',      name: 'Aulas Solicitadas',        group: 'solicitacao', terminal: false },
  { id: 'em-espera',              name: 'Em Espera',                group: 'solicitacao', terminal: false },
  { id: 'solicitacoes-aprovadas', name: 'Solicitações Aprovadas',   group: 'solicitacao', terminal: false },
  { id: 'propostas-enviadas',     name: 'Propostas Enviadas',       group: 'proposta',    terminal: false },
  { id: 'conteudo-producao',      name: 'Conteúdo em Produção',     group: 'conteudo',    terminal: false },
  { id: 'conteudo-recebido',      name: 'Conteúdo Recebido',        group: 'conteudo',    terminal: false },
  { id: 'conteudo-reprovado',     name: 'Conteúdo Reprovado',       group: 'conteudo',    terminal: false },
  { id: 'conteudo-corrigido',     name: 'Conteúdo Corrigido',       group: 'conteudo',    terminal: false },
  { id: 'agendamento',            name: 'Agendamento',              group: 'gravacao',    terminal: false },
  { id: 'aulas-gravacoes-previstas', name: 'Aulas e Gravações Previstas', group: 'gravacao', terminal: false },
  { id: 'gravacao-nao-realizada', name: 'Gravação Não Realizada',   group: 'gravacao',    terminal: true  },
  { id: 'videos-editar',          name: 'Vídeos para Editar',       group: 'video',       terminal: false },
  { id: 'publicado-plataforma',   name: 'Publicado na Plataforma',   group: 'video',       terminal: false },
  { id: 'remuneracao-professor',  name: 'Remuneração do Professor', group: 'finalizacao', terminal: false },
  { id: 'concluido',              name: 'Concluído',                group: 'finalizacao', terminal: true  },
  { id: 'arquivadas',             name: 'Arquivadas',               group: 'finalizacao', terminal: true  },
];

export const PHASE_IDS = PHASES.map(p => p.id);

export const GROUP_COLORS = {
  solicitacao: '#3b82f6',
  proposta:    '#a855f7',
  conteudo:    '#f59e0b',
  gravacao:    '#10b981',
  video:       '#06b6d4',
  finalizacao: '#6b7280',
};

export function getPhaseById(id) {
  return PHASES.find(p => p.id === id);
}

export function getNextPhaseId(currentId) {
  const idx = PHASE_IDS.indexOf(currentId);
  if (idx === -1 || idx >= PHASE_IDS.length - 1) return null;
  const next = PHASES[idx + 1];
  return next.terminal === false || next.id === 'concluido' ? next.id : next.id;
}
