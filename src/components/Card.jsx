import { getPhaseById, getNextPhaseId } from '../data/phases';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function isOverdue(prazo) {
  if (!prazo) return false;
  return new Date(prazo) < new Date();
}

function dueInfo(prazo, phaseId) {
  if (!prazo || phaseId === 'concluido') return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(prazo + 'T12:00:00');
  due.setHours(0, 0, 0, 0);

  const days = Math.round((due - today) / 86400000);

  if (days < 0) {
    const count = Math.abs(days);
    return { label: `Atrasado ${count} dia${count !== 1 ? 's' : ''}`, status: 'late' };
  }
  if (days === 0) return { label: 'Vence hoje', status: 'today' };
  if (days === 1) return { label: 'Vence amanhã', status: 'soon' };
  if (days <= 7) return { label: `Vence em ${days} dias`, status: 'soon' };
  return { label: `Vence em ${days} dias`, status: 'ok' };
}

function proposalDueInfo(prazoAceite, phaseId) {
  if (phaseId !== 'propostas-enviadas' || !prazoAceite) return null;
  const info = dueInfo(prazoAceite, phaseId);
  if (!info) return null;
  return {
    ...info,
    label: info.status === 'late'
      ? info.label.replace('Atrasado', 'Proposta vencida há')
      : info.label.replace('Vence', 'Proposta vence'),
  };
}

export function Card({ card, onAdvance, onArchive, onEdit }) {
  const phaseId  = card.phase_id ?? card.phaseId;
  const phase    = getPhaseById(phaseId);
  const nextId   = getNextPhaseId(phaseId);
  const overdue  = isOverdue(card.prazo);
  const professor = card.professor_nome ?? card.professor;
  const tipo = card.tipo_producao ?? card.tipo ?? 'Vídeo';
  const due = dueInfo(card.prazo, phaseId);
  const proposalDue = proposalDueInfo(card.proposta_prazo_aceite, phaseId);
  const shouldShowQuickAdvance = !['solicitacoes-aprovadas', 'propostas-enviadas'].includes(phaseId);

  return (
    <div className="card" onClick={() => onEdit(card)}>
      <div className="card-top-row">
        {card.card_number && (
          <span className="card-num">#{card.card_number}</span>
        )}
        <span className="card-tipo">{tipo === 'Video' ? 'Vídeo' : tipo}</span>
      </div>

      {card.tipo_solicitacao && (
        <div className="card-solicitacao">
          {card.tipo_solicitacao}
          {card.centro_custo && <span> · {card.centro_custo}</span>}
        </div>
      )}

      <div className="card-title">
        {card.assunto || card.title}
      </div>

      <div className="card-meta">
        {professor && <span className="card-professor">{professor}</span>}
        {card.disciplina && <span className="card-disciplina">{card.disciplina}</span>}
      </div>

      {card.concurso && (
        <div className="card-concurso">{card.concurso}</div>
      )}

      {due && (
        <div className={`card-due-tag card-due-tag--${due.status}`}>
          {due.label}
        </div>
      )}

      {proposalDue && (
        <div className={`card-due-tag card-due-tag--${proposalDue.status}`}>
          {proposalDue.label}
        </div>
      )}

      {phaseId === 'propostas-enviadas' && (
        <div className="card-proposal-status">
          {card.proposta_status ?? 'Proposta enviada'}
        </div>
      )}

      {phaseId === 'arquivadas' && (
        <div className="card-archive-info">
          <strong>{card.archive_status ?? 'Arquivada'}</strong>
          {card.archive_reason && <span>{card.archive_reason}</span>}
        </div>
      )}

      <div className="card-dates">
        {card.prazo && (
          <span className={`card-prazo ${overdue ? 'overdue' : ''}`}>
            {overdue ? '⚠ ' : ''}Envio: {formatDate(card.prazo)}
          </span>
        )}
        {card.data_prova && (
          <span className="card-data-prova">Prova: {formatDate(card.data_prova)}</span>
        )}
      </div>

      {card.valor_previsto && (
        <div className="card-valor-previsto">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_previsto)}
          <span className="card-valor-label">previsto</span>
        </div>
      )}
      {card.valor_efetivo && (
        <div className="card-valor-efetivo">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_efetivo)}
          <span className="card-valor-label">efetivo</span>
        </div>
      )}

      <div className="card-actions" onClick={e => e.stopPropagation()}>
        {!phase?.terminal && nextId && shouldShowQuickAdvance && (
          <button className="btn-advance" onClick={() => onAdvance(card)}>
            Avançar →
          </button>
        )}
        {phaseId !== 'arquivadas' && phaseId !== 'concluido' && (
          <button className="btn-archive" onClick={() => onArchive(card)}>
            Arquivar
          </button>
        )}
      </div>
    </div>
  );
}
