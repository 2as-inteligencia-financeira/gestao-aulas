import { useEffect, useMemo, useState } from 'react';
import { brl, fetchBudgetSnapshot, monthIdFromDate, monthLabel } from '../lib/budget';

export function BudgetImpact({ prazo, valorPrevisto, cardId, centroCusto }) {
  const monthId = monthIdFromDate(prazo);
  const valor = Number(valorPrevisto) || 0;
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    if (!monthId) {
      return () => { alive = false; };
    }

    fetchBudgetSnapshot(monthId, centroCusto)
      .then(data => {
        if (alive) {
          setSnapshot(data);
          setError('');
        }
      })
      .catch(err => {
        if (alive) setError(err?.message ?? 'Não foi possível carregar o orçamento.');
      });

    return () => { alive = false; };
  }, [monthId, centroCusto]);

  const impacto = useMemo(() => {
    if (!snapshot) return null;
    const atualDoCard = snapshot.previstoCards
      .filter(card => card.id === cardId)
      .reduce((sum, card) => sum + (Number(card.valor_previsto) || 0), 0);
    const previstoSemCard = snapshot.previsto - atualDoCard;
    const previstoComPedido = previstoSemCard + valor;

    return {
      meta: snapshot.meta,
      previstoSemCard,
      previstoComPedido,
      disponivelDepois: snapshot.meta - previstoComPedido,
      estoura: snapshot.meta > 0 && previstoComPedido > snapshot.meta,
    };
  }, [snapshot, valor, cardId]);

  if (!monthId) {
    return (
      <div className="budget-impact budget-impact--empty">
        <span className="budget-impact-label">Orçamento</span>
        <strong>Informe o prazo para calcular o mês de impacto.</strong>
      </div>
    );
  }

  if (error) {
    return (
      <div className="budget-impact budget-impact--warning">
        <span className="budget-impact-label">Orçamento</span>
        <strong>{error}</strong>
      </div>
    );
  }

  if (!impacto) {
    return (
      <div className="budget-impact budget-impact--empty">
        <span className="budget-impact-label">Orçamento</span>
        <strong>Carregando orçamento de {monthLabel(monthId)}...</strong>
      </div>
    );
  }

  return (
    <div className={`budget-impact ${impacto.estoura ? 'budget-impact--danger' : 'budget-impact--ok'}`}>
      <div className="budget-impact-head">
        <span className="budget-impact-label">Orçamento</span>
        <strong>{centroCusto} · {monthLabel(monthId)}</strong>
      </div>
      <div className="budget-impact-grid">
        <span>
          <small>Meta despesa</small>
          <strong>{brl(impacto.meta)}</strong>
        </span>
        <span>
          <small>Previsto com pedido</small>
          <strong>{brl(impacto.previstoComPedido)}</strong>
        </span>
        <span>
          <small>{impacto.estoura ? 'Estouro previsto' : 'Disponível após pedido'}</small>
          <strong>{brl(Math.abs(impacto.disponivelDepois))}</strong>
        </span>
      </div>
    </div>
  );
}
