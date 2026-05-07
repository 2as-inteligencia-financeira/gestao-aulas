import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBoard } from '../hooks/useBoard';
import { Board } from '../components/Board';
import { CardModal } from '../components/CardModal';
import { getNextPhaseId } from '../data/phases';

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

export default function BoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { cards, loading, addCard, editCard, advanceCard, archiveCard, cardsByPhase } = useBoard();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const openNew  = () => setModal('new');
  const openEdit = (card) => setModal({ card });
  const closeModal = () => setModal(null);

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

  async function handleAdvance(card) {
    if (card.phase_id === 'solicitacoes-aprovadas' || card.phase_id === 'propostas-enviadas') {
      window.alert('Para esta fase, abra o card e use "Mover card para fase" para manter os dados da proposta.');
      return;
    }
    const next = getNextPhaseId(card.phase_id);
    if (!next) return;
    await advanceCard(card.id, card.phase_id, next);
  }

  async function handleArchive(card) {
    const motivo = window.prompt('Motivo do arquivamento');
    if (!motivo?.trim()) return;
    const ok = window.confirm('Confirmar arquivamento deste card?');
    if (!ok) return;
    await archiveCard(card.id, card.phase_id, motivo.trim(), 'Arquivada');
    closeModal();
  }

  async function handleMoveCard(card, move, moveFields = {}) {
    const payload = {
      ...moveFields,
      updated_at: new Date().toISOString(),
    };
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

  const filteredCards = useMemo(() => {
    const phaseFilter = searchParams.get('phase');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const term = search.trim().toLowerCase();
    return cards.filter(card => {
      const textMatch = !term || [
      card.card_number,
      card.title,
      card.assunto,
      card.disciplina,
      card.professor_nome,
      card.professor,
      card.concurso,
      card.tipo_solicitacao,
      card.centro_custo,
      card.archive_reason,
      card.archive_status,
      ].some(value => String(value ?? '').toLowerCase().includes(term));
      if (!textMatch) return false;

      if (phaseFilter && card.phase_id !== phaseFilter) return false;

      if (from || to) {
        const createdDate = String(card.created_at ?? '').slice(0, 10);
        if (from && createdDate < from) return false;
        if (to && createdDate > to) return false;
      }
      return true;
    });
  }, [cards, search, searchParams]);

  const filteredCardsByPhase = useMemo(() => {
    return phaseId => filteredCards.filter(card => card.phase_id === phaseId);
  }, [filteredCards]);

  const activeCount = cards.filter(card => !card.arquivado).length;
  const phaseFilter = searchParams.get('phase');
  const fromFilter = searchParams.get('from');
  const toFilter = searchParams.get('to');

  function clearExternalFilters() {
    const params = new URLSearchParams(searchParams);
    params.delete('phase');
    params.delete('from');
    params.delete('to');
    setSearchParams(params);
  }

  return (
    <div className="board-page">
      <div className="board-header">
        <div className="board-header-left">
          <h1 className="page-title">Solicitações de Aulas</h1>
          <p className="page-sub">{activeCount} card{activeCount !== 1 ? 's' : ''} ativos</p>
        </div>
        <div className="board-header-actions">
          <div className="board-search">
            <span>⌕</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Procurar cards"
            />
          </div>
          {(phaseFilter || fromFilter || toFilter) && (
            <button type="button" className="btn-secondary" onClick={clearExternalFilters}>
              Limpar filtros
            </button>
          )}
          <button className="btn-primary" onClick={openNew}>+ Nova Solicitação</button>
        </div>
      </div>

      {loading
        ? <div className="loading-screen">Carregando cards...</div>
        : <Board
            cardsByPhase={search ? filteredCardsByPhase : cardsByPhase}
            onAdvance={handleAdvance}
            onArchive={handleArchive}
            onEdit={openEdit}
          />
      }

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
    </div>
  );
}
