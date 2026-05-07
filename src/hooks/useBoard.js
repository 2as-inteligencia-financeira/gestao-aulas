import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useBoard() {
  const { user, profile } = useAuth();
  const [cards, setCards]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error) setCards(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCards(); }, [fetchCards]); // eslint-disable-line react-hooks/set-state-in-effect

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('cards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, fetchCards)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchCards]);

  const addCard = useCallback(async (fields) => {
    const isOperador = profile?.perfil === 'operador';
    const { data, error } = await supabase
      .from('cards')
      .insert({
        ...fields,
        phase_id:   'aulas-solicitadas',
        created_by: user.id,
        responsavel_id: isOperador ? user.id : (fields.responsavel_id ?? null),
        responsavel_nome: isOperador ? (profile?.name ?? '') : (fields.responsavel_nome ?? null),
      })
      .select()
      .single();
    if (error) throw error;
    setCards(current => [...current, data]);
    return data.id;
  }, [user, profile]);

  const editCard = useCallback(async (id, fields) => {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('cards')
      .update({ ...fields, updated_at: updatedAt })
      .eq('id', id);
    if (error) throw error;

    setCards(current => current.map(card => (
      card.id === id ? { ...card, ...fields, updated_at: updatedAt } : card
    )));
  }, []);

  const advanceCard = useCallback(async (id, fromPhase, toPhase) => {
    const updatedAt = new Date().toISOString();
    const currentCard = cards.find(card => card.id === id);
    const payload = { phase_id: toPhase, updated_at: updatedAt };

    if (toPhase === 'remuneracao-professor' || toPhase === 'concluido') {
      const finalAmount = Number(currentCard?.valor_efetivo || 0) > 0
        ? Number(currentCard.valor_efetivo)
        : Number(currentCard?.valor_previsto || 0) > 0
          ? Number(currentCard.valor_previsto)
          : null;

      if (finalAmount !== null) payload.valor_efetivo = finalAmount;
      payload.data_entrega_efetiva = currentCard?.data_entrega_efetiva || new Date().toISOString().slice(0, 10);
    }

    const { error } = await supabase
      .from('cards')
      .update(payload)
      .eq('id', id);
    if (error) throw error;

    setCards(current => current.map(card => (
      card.id === id ? { ...card, ...payload } : card
    )));

    await supabase.from('card_history').insert({
      card_id:    id,
      from_phase: fromPhase,
      to_phase:   toPhase,
      user_id:    user.id,
      user_name:  profile?.name ?? '',
    });
  }, [user, profile, cards]);

  const archiveCard = useCallback(async (id, fromPhase, motivo, status = 'Arquivada') => {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from('cards')
      .update({
        arquivado: true,
        phase_id: 'arquivadas',
        archive_reason: motivo,
        archive_status: status,
        updated_at: updatedAt,
      })
      .eq('id', id);
    if (error) throw error;

    setCards(current => current.map(card => (
      card.id === id
        ? {
            ...card,
            arquivado: true,
            phase_id: 'arquivadas',
            archive_reason: motivo,
            archive_status: status,
            updated_at: updatedAt,
          }
        : card
    )));

    await supabase.from('card_history').insert({
      card_id:    id,
      from_phase: fromPhase,
      to_phase:   'arquivadas',
      user_id:    user.id,
      user_name:  profile?.name ?? '',
    });
  }, [user, profile]);

  const cardsByPhase = useCallback((phaseId) => {
    return cards.filter(c => c.phase_id === phaseId);
  }, [cards]);

  return { cards, loading, addCard, editCard, advanceCard, archiveCard, cardsByPhase };
}
