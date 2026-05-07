import { supabase } from './supabase';
import { PHASE_IDS } from '../data/phases';

const APPROVED_PHASE_INDEX = PHASE_IDS.indexOf('solicitacoes-aprovadas');

export function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

export function monthIdFromDate(date) {
  if (!date) return null;
  return date.slice(0, 7);
}

export function monthRange(monthId) {
  const [year, month] = monthId.split('-').map(Number);
  const start = `${monthId}-01`;
  const next = new Date(year, month, 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, end };
}

export function monthLabel(monthId) {
  const [year, month] = monthId.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function monthsForBudgetYear(year) {
  const startMonth = year === 2026 ? 5 : 1;
  return Array.from({ length: 13 - startMonth }, (_, i) => {
    const month = startMonth + i;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

export function consumesBudget(phaseId) {
  const index = PHASE_IDS.indexOf(phaseId);
  return index >= APPROVED_PHASE_INDEX && phaseId !== 'arquivadas';
}

export async function fetchBudgetForMonth(monthId, centroCusto = 'Academico') {
  const { data, error } = await supabase
    .from('budget_months')
    .select('*')
    .eq('month_id', monthId)
    .eq('centro_custo', centroCusto)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCardsForBudgetMonth(monthId, centroCusto = 'Academico') {
  const { start, end } = monthRange(monthId);

  const [
    { data: previstos, error: prevError },
    { data: realizados, error: realError },
    { data: realizadosFallback, error: fallbackError },
  ] = await Promise.all([
    supabase
      .from('cards')
      .select('id, title, assunto, disciplina, professor_nome, prazo, valor_previsto, arquivado, phase_id')
      .gte('prazo', start)
      .lt('prazo', end)
      .eq('centro_custo', centroCusto)
      .eq('arquivado', false),
    supabase
      .from('cards')
      .select('id, title, assunto, disciplina, professor_nome, data_entrega_efetiva, valor_efetivo, valor_previsto')
      .gte('data_entrega_efetiva', start)
      .lt('data_entrega_efetiva', end)
      .eq('centro_custo', centroCusto),
    supabase
      .from('cards')
      .select('id, title, assunto, disciplina, professor_nome, updated_at, valor_efetivo, valor_previsto')
      .in('phase_id', ['remuneracao-professor', 'concluido'])
      .is('data_entrega_efetiva', null)
      .gte('updated_at', `${start}T00:00:00`)
      .lt('updated_at', `${end}T00:00:00`)
      .eq('centro_custo', centroCusto),
  ]);

  if (prevError) throw prevError;
  if (realError) throw realError;
  if (fallbackError) throw fallbackError;

  const realizedRows = [...(realizados ?? [])];
  const existingIds = new Set(realizedRows.map(card => card.id));
  (realizadosFallback ?? []).forEach(card => {
    if (!existingIds.has(card.id)) realizedRows.push(card);
  });

  return {
    previstos: previstos ?? [],
    realizados: realizedRows,
  };
}

export async function fetchBudgetSnapshot(monthId, centroCusto = 'Academico') {
  const [budget, cards] = await Promise.all([
    fetchBudgetForMonth(monthId, centroCusto),
    fetchCardsForBudgetMonth(monthId, centroCusto),
  ]);

  const meta = Number(budget?.meta_despesa) || 0;
  const previsto = cards.previstos
    .filter(card => consumesBudget(card.phase_id))
    .reduce((sum, card) => sum + (Number(card.valor_previsto) || 0), 0);
  const realizado = cards.realizados.reduce((sum, card) => {
    return sum + (Number(card.valor_efetivo ?? card.valor_previsto) || 0);
  }, 0);

  return {
    monthId,
    centroCusto,
    budget,
    cards,
    previstoCards: cards.previstos.filter(card => consumesBudget(card.phase_id)),
    meta,
    previsto,
    realizado,
    disponivelPrevisto: meta - previsto,
    disponivelRealizado: meta - realizado,
  };
}
