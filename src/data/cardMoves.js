import { PHASES, getNextPhaseId, getPhaseById } from './phases';

const SPECIAL_MOVES = {
  'aulas-solicitadas': [
    { phaseId: 'em-espera', tone: 'wait', requiresReason: true },
    { phaseId: 'solicitacoes-aprovadas', tone: 'approve' },
    { phaseId: 'arquivadas', tone: 'archive', status: 'Solicitação Recusada', requiresReason: true },
  ],
  'solicitacoes-aprovadas': [
    { phaseId: 'propostas-enviadas', tone: 'approve' },
    { phaseId: 'agendamento', tone: 'schedule' },
    { phaseId: 'arquivadas', tone: 'archive', requiresReason: true },
    { phaseId: 'aulas-solicitadas', tone: 'back' },
    { phaseId: 'em-espera', tone: 'wait' },
  ],
  'propostas-enviadas': [
    { phaseId: 'arquivadas', tone: 'archive', status: 'Proposta Encerrada', requiresReason: true },
  ],
  'agendamento': [
    { phaseId: 'aulas-gravacoes-previstas', tone: 'schedule' },
    { phaseId: 'gravacao-nao-realizada', tone: 'archive', requiresReason: true },
    { phaseId: 'arquivadas', tone: 'archive', requiresReason: true },
  ],
  'aulas-gravacoes-previstas': [
    { phaseId: 'videos-editar', tone: 'next' },
    { phaseId: 'conteudo-producao', tone: 'next' },
    { phaseId: 'gravacao-nao-realizada', tone: 'archive', requiresReason: true },
  ],
  'conteudo-producao': [
    { phaseId: 'conteudo-recebido', tone: 'next' },
    { phaseId: 'conteudo-reprovado', tone: 'archive', requiresReason: true },
  ],
  'conteudo-reprovado': [
    { phaseId: 'conteudo-corrigido', tone: 'next' },
    { phaseId: 'arquivadas', tone: 'archive', requiresReason: true },
  ],
  'conteudo-corrigido': [
    { phaseId: 'conteudo-recebido', tone: 'approve' },
  ],
  'videos-editar': [
    { phaseId: 'publicado-plataforma', tone: 'approve' },
    { phaseId: 'aulas-gravacoes-previstas', tone: 'back', requiresReason: true },
  ],
  'publicado-plataforma': [
    { phaseId: 'remuneracao-professor', tone: 'approve' },
  ],
  'conteudo-recebido': [
    { phaseId: 'remuneracao-professor', tone: 'approve' },
    { phaseId: 'conteudo-reprovado', tone: 'archive', requiresReason: true },
  ],
};

export function getDefaultCardMoveOptions(card) {
  if (!card?.phase_id || card.phase_id === 'arquivadas') return [];

  const configured = SPECIAL_MOVES[card.phase_id];
  if (configured) {
    const moves = configured.map(move => ({
      ...move,
      phase: getPhaseById(move.phaseId),
    })).filter(move => move.phase);

    if (card.phase_id === 'propostas-enviadas') {
      const acceptedPhaseId = card.tipo_producao === 'Material' || card.tipo === 'Material'
        ? 'conteudo-producao'
        : 'agendamento';
      moves.push({
        phaseId: acceptedPhaseId,
        phase: getPhaseById(acceptedPhaseId),
        tone: 'approve',
        status: 'Aceita',
      });
    }

    return moves;
  }

  const nextId = getNextPhaseId(card.phase_id);
  return [
    nextId && { phaseId: nextId, phase: getPhaseById(nextId), tone: 'next' },
    { phaseId: 'arquivadas', phase: getPhaseById('arquivadas'), tone: 'archive', requiresReason: true },
  ].filter(move => move?.phase);
}

export function getCardMoveOptions(card, configuredPhaseIds) {
  if (configuredPhaseIds?.length) {
    return configuredPhaseIds.map(phaseId => ({
      phaseId,
      phase: getPhaseById(phaseId),
      tone: phaseId === 'arquivadas' ? 'archive' : 'next',
      requiresReason: phaseId === 'arquivadas',
    })).filter(move => move.phase);
  }

  return getDefaultCardMoveOptions(card);
}

export function configurablePhases(currentPhaseId) {
  return PHASES.filter(phase => phase.id !== currentPhaseId);
}
