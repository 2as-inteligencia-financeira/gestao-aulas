import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoard } from '../hooks/useBoard';
import { useAuth } from '../contexts/AuthContext';
import { PHASES, getPhaseById } from '../data/phases';
import { CardModal } from '../components/CardModal';

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatPtDate(value) {
  if (!value) return 'Sem prazo';
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function formatTodayPtBr() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function isOverdue(dateValue) {
  if (!dateValue) return false;
  const due = new Date(`${dateValue}T12:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return due < now;
}

function dueInDays(dateValue) {
  if (!dateValue) return null;
  const due = new Date(`${dateValue}T12:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86400000);
}

function resolveFinalAmount(card, payload) {
  const payloadEfetivo = Number(payload?.valor_efetivo || 0);
  if (payloadEfetivo > 0) return payloadEfetivo;
  const payloadPrevisto = Number(payload?.valor_previsto || 0);
  if (payloadPrevisto > 0) return payloadPrevisto;
  const cardEfetivo = Number(card?.valor_efetivo || 0);
  if (cardEfetivo > 0) return cardEfetivo;
  const cardPrevisto = Number(card?.valor_previsto || 0);
  if (cardPrevisto > 0) return cardPrevisto;
  return null;
}

export default function DashboardPage() {
  const { cards, loading, addCard, editCard, archiveCard } = useBoard();
  const { user, profile } = useAuth();
  const isLeadership = ['admin', 'gestor', 'financeiro'].includes(profile?.perfil);
  const isAdminOrGestor = ['admin', 'gestor'].includes(profile?.perfil);
  const isAdminOrFinance = ['admin', 'financeiro'].includes(profile?.perfil);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [phasePicker, setPhasePicker] = useState(null);

  const ownCards = useMemo(() => cards.filter(card => (
    card.responsavel_id === user?.id || card.created_by === user?.id
  )), [cards, user?.id]);

  const scopedCards = isLeadership ? cards : ownCards;

  const sourceCards = useMemo(() => {
    return scopedCards.filter(card => {
      const createdDate = String(card.created_at ?? '').slice(0, 10);
      if (fromDate && createdDate < fromDate) return false;
      if (toDate && createdDate > toDate) return false;
      if (selectedProfessor && (card.professor_nome ?? '') !== selectedProfessor) return false;
      if (selectedOwner && (card.responsavel_nome ?? '') !== selectedOwner) return false;
      return true;
    });
  }, [scopedCards, fromDate, toDate, selectedProfessor, selectedOwner]);

  const dashboardCards = useMemo(() => (
    isAdminOrFinance
      ? sourceCards
      : sourceCards.filter(card => card.phase_id !== 'remuneracao-professor')
  ), [sourceCards, isAdminOrFinance]);

  const activeCards = dashboardCards.filter(card => !card.arquivado && card.phase_id !== 'concluido');
  const overdueCards = activeCards.filter(card => isOverdue(card.prazo));
  const dueSoonCards = activeCards.filter(card => {
    const days = dueInDays(card.prazo);
    return days !== null && days >= 0 && days <= 3;
  });
  const healthyCards = activeCards.filter(card => {
    const days = dueInDays(card.prazo);
    return days !== null && days > 3;
  });

  const waitingFinance = activeCards.filter(card => card.phase_id === 'remuneracao-professor');
  const totalPrevisto = activeCards.reduce((acc, card) => acc + Number(card.valor_previsto || 0), 0);
  const totalEfetivo = dashboardCards.reduce((acc, card) => acc + Number(card.valor_efetivo || 0), 0);

  const cardsByPhase = useMemo(() => PHASES
    .map(phase => ({
      ...phase,
      total: activeCards.filter(card => card.phase_id === phase.id).length,
    }))
    .filter(phase => phase.total > 0), [activeCards]);

  const criticalList = useMemo(() => activeCards
    .filter(card => isOverdue(card.prazo) || card.phase_id === 'remuneracao-professor')
    .sort((a, b) => String(a.prazo || '9999-12-31').localeCompare(String(b.prazo || '9999-12-31')))
    .slice(0, 8), [activeCards]);

  const todayActions = useMemo(() => {
    return activeCards
      .filter(card => {
        const days = dueInDays(card.prazo);
        return days !== null && days <= 1;
      })
      .sort((a, b) => String(a.prazo || '9999-12-31').localeCompare(String(b.prazo || '9999-12-31')))
      .slice(0, 10);
  }, [activeCards]);

  const byProfessor = useMemo(() => {
    const grouped = new Map();
    activeCards.forEach(card => {
      const key = card.professor_nome || 'Sem professor';
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [activeCards]);

  const byOwner = useMemo(() => {
    const grouped = new Map();
    activeCards.forEach(card => {
      const key = card.responsavel_nome || 'Sem responsável';
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [activeCards]);

  const collaboratorKpis = useMemo(() => {
    if (!isAdminOrGestor) return [];

    const grouped = new Map();
    dashboardCards.forEach(card => {
      const key = card.responsavel_nome || 'Sem responsável';
      if (!grouped.has(key)) {
        grouped.set(key, {
          name: key,
          total: 0,
          noPrazo: 0,
          atraso: 0,
          priorizarHoje: 0,
          criticos: 0,
        });
      }
      const row = grouped.get(key);
      row.total += 1;

      const isActive = !card.arquivado && card.phase_id !== 'concluido';
      if (!isActive) return;

      const days = dueInDays(card.prazo);
      const overdue = isOverdue(card.prazo);
      const critical = overdue || card.phase_id === 'remuneracao-professor';

      if (overdue) row.atraso += 1;
      else if (days !== null && days > 3) row.noPrazo += 1;
      else if (days === null) row.noPrazo += 1;

      if (days !== null && days <= 1) row.priorizarHoje += 1;
      if (critical) row.criticos += 1;
    });

    return [...grouped.values()]
      .sort((a, b) => (
        b.criticos - a.criticos
        || b.priorizarHoje - a.priorizarHoje
        || b.atraso - a.atraso
        || b.total - a.total
      ))
      .slice(0, 12);
  }, [dashboardCards, isAdminOrGestor]);

  const professors = useMemo(() => (
    [...new Set(cards.map(card => card.professor_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  ), [cards]);
  const owners = useMemo(() => (
    [...new Set(cards.map(card => card.responsavel_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  ), [cards]);

  function openNew() { setModal('new'); }
  function openEdit(card) { setModal({ card }); }
  function closeModal() { setModal(null); }
  function closePhasePicker() { setPhasePicker(null); }

  async function handleSave(fields) {
    setSaving(true);
    try {
      if (modal === 'new') await addCard(fields);
      else await editCard(modal.card.id, fields);
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveCard(card, move, moveFields = {}) {
    const payload = { ...moveFields, updated_at: new Date().toISOString() };
    if (move.phaseId === 'remuneracao-professor' || move.phaseId === 'concluido') {
      const finalAmount = resolveFinalAmount(card, payload);
      if (finalAmount !== null) payload.valor_efetivo = finalAmount;
      payload.data_entrega_efetiva = payload.data_entrega_efetiva || new Date().toISOString().slice(0, 10);
    }
    if (move.requiresReason || move.phaseId === 'arquivadas') {
      const motivo = window.prompt(move.status === 'Recusada' ? 'Motivo da recusa' : 'Motivo do arquivamento');
      if (!motivo?.trim()) return;
      const ok = window.confirm('Confirmar movimentação deste card?');
      if (!ok) return;
      if (move.phaseId === 'arquivadas') {
        await archiveCard(card.id, card.phase_id, motivo.trim(), move.status ?? 'Arquivada');
      } else {
        await editCard(card.id, {
          ...payload,
          phase_id: move.phaseId,
          archive_reason: motivo.trim(),
          proposta_status: move.status ?? null,
        });
      }
    } else {
      await editCard(card.id, {
        ...payload,
        phase_id: move.phaseId,
        proposta_status: move.status ?? card.proposta_status ?? null,
      });
    }
    closeModal();
  }

  const phasePickerCards = useMemo(() => {
    if (!phasePicker) return [];
    return activeCards
      .filter(card => {
        if (phasePicker.type === 'phase') return card.phase_id === phasePicker.id;
        if (phasePicker.type === 'professor') return (card.professor_nome || 'Sem professor') === phasePicker.id;
        if (phasePicker.type === 'owner') return (card.responsavel_nome || 'Sem responsável') === phasePicker.id;
        return false;
      })
      .sort((a, b) => String(a.prazo || '9999-12-31').localeCompare(String(b.prazo || '9999-12-31')))
      .slice(0, 40);
  }, [phasePicker, activeCards]);

  return (
    <div className="dir-page dashboard-page">
      <div className="dir-header">
        <div>
          <h1 className="page-title">Página Inicial</h1>
          <p className="page-sub">
            {isLeadership ? 'Painel executivo com leitura rápida e foco em decisão' : 'Painel operacional do dia'}
          </p>
        </div>
        <div className="dir-header-actions">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          {isAdminOrGestor && (
            <>
              <select value={selectedProfessor} onChange={e => setSelectedProfessor(e.target.value)}>
                <option value="">Todos professores</option>
                {professors.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <select value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)}>
                <option value="">Todos colaboradores</option>
                {owners.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </>
          )}
          <button className="btn-primary" onClick={openNew}>+ Nova solicitação</button>
          <Link className="btn-secondary" to="/kanban">Ver Kanban</Link>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen">Carregando painel...</div>
      ) : (
        <>
          <div className="home-kpi-grid">
            <span>
              <small>Em andamento</small>
              <strong>{activeCards.length}</strong>
            </span>
            <span>
              <small>Crítico</small>
              <strong>{overdueCards.length}</strong>
            </span>
            <span>
              <small>Próximos 3 dias</small>
              <strong>{dueSoonCards.length}</strong>
            </span>
            <span>
              <small>No prazo</small>
              <strong>{healthyCards.length}</strong>
            </span>
            <span>
              <small>Fila financeiro</small>
              <strong>{waitingFinance.length}</strong>
            </span>
            <span>
              <small>Previsto aberto</small>
              <strong>{brl(totalPrevisto)}</strong>
            </span>
            {isLeadership && (
              <span>
                <small>Efetivo acumulado</small>
                <strong>{brl(totalEfetivo)}</strong>
              </span>
            )}
          </div>

          <div className="home-layout-grid">
            <section className="admin-section dashboard-section">
              <h2 className="admin-section-title">O que fazer hoje</h2>
              {todayActions.length === 0 ? (
                <p className="dir-empty">Sem ações urgentes para hoje.</p>
              ) : (
                <div className="dashboard-task-list">
                  {todayActions.map(card => (
                    <button className="dashboard-task-item" type="button" key={card.id} onClick={() => openEdit(card)}>
                      <div className="task-main">
                        <strong className="task-title">{card.professor_nome || 'Sem professor'}</strong>
                        <span className="task-subtitle">
                          #{card.card_number} · {card.assunto || 'Sem assunto'} · {card.disciplina || 'Sem disciplina'}
                        </span>
                        <span className="task-meta">
                          {card.concurso || 'Sem concurso'} · {getPhaseById(card.phase_id)?.name ?? card.phase_id}
                        </span>
                      </div>
                      <span className={isOverdue(card.prazo) ? 'dashboard-badge dashboard-badge--late' : 'dashboard-badge'}>
                        {card.prazo ? `Prazo ${formatPtDate(card.prazo)}` : 'Sem prazo'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-section dashboard-section">
              <h2 className="admin-section-title">Situação por fase</h2>
              <div className="dashboard-phase-list">
                {cardsByPhase.map(phase => (
                  <button
                    key={phase.id}
                    className="dashboard-phase-item"
                    type="button"
                    onClick={() => setPhasePicker({ type: 'phase', id: phase.id, name: phase.name })}
                  >
                    <span>{phase.name}</span>
                    <strong>{phase.total}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="admin-section dashboard-section">
            <h2 className="admin-section-title">Itens críticos</h2>
            {criticalList.length === 0 ? (
              <p className="dir-empty">Nenhum item crítico no período selecionado.</p>
            ) : (
              <div className="dashboard-task-list">
                {criticalList.map(card => (
                  <button className="dashboard-task-item" type="button" key={card.id} onClick={() => openEdit(card)}>
                    <div className="task-main">
                      <strong className="task-title">{card.professor_nome || 'Sem professor'}</strong>
                      <span className="task-subtitle">
                        #{card.card_number} · {card.assunto || 'Sem assunto'} · {card.disciplina || 'Sem disciplina'}
                      </span>
                      <span className="task-meta">
                        {card.concurso || 'Sem concurso'} · {getPhaseById(card.phase_id)?.name ?? card.phase_id}
                      </span>
                    </div>
                    <span className={isOverdue(card.prazo) ? 'dashboard-badge dashboard-badge--late' : 'dashboard-badge'}>
                      {card.prazo ? `Prazo ${formatPtDate(card.prazo)}` : 'Sem prazo'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {isAdminOrGestor && (
            <section className="admin-section dashboard-section">
              <h2 className="admin-section-title">Histórico e distribuição</h2>
              <div className="dashboard-analytics-grid">
                <div>
                  <h3>Por professor</h3>
                  <div className="dashboard-phase-list">
                    {byProfessor.map(([name, total]) => (
                      <button
                        className="dashboard-phase-item"
                        type="button"
                        key={name}
                        onClick={() => setPhasePicker({ type: 'professor', id: name, name: `Professor: ${name}` })}
                      >
                        <span>{name}</span>
                        <strong>{total}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Por colaborador</h3>
                  <div className="dashboard-phase-list">
                    {byOwner.map(([name, total]) => (
                      <button
                        className="dashboard-phase-item"
                        type="button"
                        key={name}
                        onClick={() => setPhasePicker({ type: 'owner', id: name, name: `Colaborador: ${name}` })}
                      >
                        <span>{name}</span>
                        <strong>{total}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {isAdminOrGestor && (
            <section className="admin-section dashboard-section">
              <h2 className="admin-section-title">Distribuição por colaborador</h2>
              {collaboratorKpis.length === 0 ? (
                <p className="dir-empty">Sem dados para os filtros atuais.</p>
              ) : (
                <div className="collab-kpi-table">
                  <div className="collab-kpi-head">
                    <span>Colaborador</span>
                    <span>Solicitações</span>
                    <span>No prazo</span>
                    <span>Em atraso</span>
                    <span>Priorizar hoje</span>
                    <span>Críticos</span>
                  </div>
                  {collaboratorKpis.map(row => (
                    <div className="collab-kpi-row" key={row.name}>
                      <strong>{row.name}</strong>
                      <span>{row.total}</span>
                      <span className="kpi-ok">{row.noPrazo}</span>
                      <span className={row.atraso > 0 ? 'kpi-danger' : ''}>{row.atraso}</span>
                      <span className={row.priorizarHoje > 0 ? 'kpi-warn' : ''}>{row.priorizarHoje}</span>
                      <span className={row.criticos > 0 ? 'kpi-danger' : ''}>{row.criticos}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {modal && (
        <CardModal
          key={modal === 'new' ? 'new' : modal.card.id}
          card={modal === 'new' ? null : modal.card}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          onMoveCard={handleMoveCard}
        />
      )}

      {phasePicker && (
        <div className="modal-overlay" onClick={closePhasePicker}>
          <div className="modal dashboard-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{phasePicker.name}</h2>
                <p className="page-sub">{phasePickerCards.length} card(s) para ação</p>
              </div>
              <button className="btn-icon" onClick={closePhasePicker}>✕</button>
            </div>
            <div className="dashboard-task-list">
              {phasePickerCards.length === 0 ? (
                <p className="dir-empty">Sem cards nesta fase para os filtros atuais.</p>
              ) : (
                phasePickerCards.map(card => (
                  <button
                    type="button"
                    className="dashboard-task-item"
                    key={card.id}
                    onClick={() => {
                      closePhasePicker();
                      openEdit(card);
                    }}
                  >
                    <div className="task-main">
                      <strong className="task-title">{card.professor_nome || 'Sem professor'}</strong>
                      <span className="task-subtitle">
                        #{card.card_number} · {card.assunto || 'Sem assunto'} · {card.disciplina || 'Sem disciplina'}
                      </span>
                      <span className="task-meta">
                        {card.concurso || 'Sem concurso'} · {card.responsavel_nome || 'Sem responsável'}
                      </span>
                    </div>
                    <span className={isOverdue(card.prazo) ? 'dashboard-badge dashboard-badge--late' : 'dashboard-badge'}>
                      {card.prazo ? `Prazo ${formatPtDate(card.prazo)}` : 'Sem prazo'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
