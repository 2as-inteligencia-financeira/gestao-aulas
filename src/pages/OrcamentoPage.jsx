import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { brl, fetchBudgetSnapshot, monthLabel, monthsForBudgetYear } from '../lib/budget';

const CENTROS_CUSTO = ['Academico', 'Marketing'];

function statusClass(row) {
  if (!row.meta) return 'budget-status budget-status--empty';
  if (row.disponivelPrevisto < 0) return 'budget-status budget-status--danger';
  if (row.disponivelPrevisto / row.meta < 0.15) return 'budget-status budget-status--warning';
  return 'budget-status budget-status--ok';
}

function emptyTotals() {
  return { meta: 0, previsto: 0, realizado: 0 };
}

function totalRows(rows) {
  return rows.reduce((acc, row) => ({
    meta: acc.meta + row.meta,
    previsto: acc.previsto + row.previsto,
    realizado: acc.realizado + row.realizado,
  }), emptyTotals());
}

function monthShortLabel(monthId) {
  const [year, month] = monthId.split('-').map(Number);
  const short = new Date(year, month - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
  return `${short}/${String(year).slice(2)}`;
}

export default function OrcamentoPage() {
  const [year, setYear] = useState(2026);
  const [groups, setGroups] = useState({});
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('visao');

  const months = useMemo(() => monthsForBudgetYear(year), [year]);
  const totals = useMemo(() => {
    const byGroup = Object.fromEntries(CENTROS_CUSTO.map(centro => [centro, totalRows(groups[centro] ?? [])]));
    const geral = Object.values(byGroup).reduce((acc, item) => ({
      meta: acc.meta + item.meta,
      previsto: acc.previsto + item.previsto,
      realizado: acc.realizado + item.realizado,
    }), emptyTotals());
    return { byGroup, geral };
  }, [groups]);

  const monthlyTotals = useMemo(() => {
    return months.map(monthId => {
      const byCentro = CENTROS_CUSTO.map(centro => (groups[centro] ?? []).find(row => row.monthId === monthId)).filter(Boolean);
      return {
        monthId,
        previsto: byCentro.reduce((acc, row) => acc + row.previsto, 0),
        realizado: byCentro.reduce((acc, row) => acc + row.realizado, 0),
        meta: byCentro.reduce((acc, row) => acc + row.meta, 0),
      };
    });
  }, [groups, months]);

  const trendChart = useMemo(() => {
    const chartHeight = 170;
    const colWidth = 88;
    const width = Math.max(760, monthlyTotals.length * colWidth);
    const maxValue = Math.max(
      1,
      ...monthlyTotals.map(row => Math.max(row.meta || 0, row.previsto || 0, row.realizado || 0)),
    );
    const pointsArray = monthlyTotals.map((row, idx) => {
      const x = idx * colWidth + (colWidth / 2);
      const y = chartHeight - Math.round((Math.max(row.realizado || 0, 0) / maxValue) * chartHeight);
      return { x, y };
    });
    const points = pointsArray.map(p => `${p.x},${p.y}`).join(' ');
    return { chartHeight, colWidth, width, maxValue, points, pointsArray };
  }, [monthlyTotals]);

  const centerFinancial = useMemo(() => {
    return CENTROS_CUSTO.map(centro => {
      const rows = groups[centro] ?? [];
      const total = totalRows(rows);
      return {
        centro,
        ...total,
        consumo: total.meta ? Math.round((total.previsto / total.meta) * 100) : 0,
      };
    });
  }, [groups]);

  const financialInsights = useMemo(() => {
    const previstos = Object.values(groups)
      .flatMap(rows => rows ?? [])
      .flatMap(row => row.previstoCards ?? []);

    function aggregateBy(field) {
      const map = new Map();
      previstos.forEach(card => {
        const key = card[field] || `Sem ${field}`;
        const current = map.get(key) || { total: 0, valor: 0 };
        map.set(key, {
          total: current.total + 1,
          valor: current.valor + Number(card.valor_previsto || 0),
        });
      });
      return [...map.entries()]
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6);
    }

    return {
      professor: aggregateBy('professor_nome'),
      disciplina: aggregateBy('disciplina'),
      concurso: aggregateBy('concurso'),
    };
  }, [groups]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const entries = await Promise.all(CENTROS_CUSTO.map(async centro => {
        const rows = await Promise.all(months.map(month => fetchBudgetSnapshot(month, centro)));
        return [centro, rows];
      }));
      const nextGroups = Object.fromEntries(entries);
      setGroups(nextGroups);
      setEditing(Object.fromEntries(entries.flatMap(([centro, rows]) => (
        rows.map(row => [`${centro}:${row.monthId}`, row.meta ? String(row.meta) : ''])
      ))));
    } catch (err) {
      setError(err?.message ?? 'Não foi possível carregar o orçamento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [months]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  async function saveMonth(centroCusto, monthId) {
    const key = `${centroCusto}:${monthId}`;
    const value = editing[key];
    const meta = value === '' ? null : Number(value);
    const { error: saveError } = await supabase
      .from('budget_months')
      .upsert({
        month_id: monthId,
        centro_custo: centroCusto,
        month_start: `${monthId}-01`,
        meta_despesa: Number.isNaN(meta) ? null : meta,
      }, { onConflict: 'month_id,centro_custo' });

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await load();
  }

  return (
    <div className="dir-page budget-page">
      <div className="dir-header">
        <div>
          <h1 className="page-title">Orçamento</h1>
          <p className="page-sub">Visão financeira, consumo de orçamento e configuração de metas</p>
        </div>
        <div className="dir-header-actions">
          <div className="budget-mode-switch">
            <button
              type="button"
              className={mode === 'visao' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMode('visao')}
            >
              Visão Financeira
            </button>
            <button
              type="button"
              className={mode === 'config' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMode('config')}
            >
              Configuração de Metas
            </button>
          </div>
          <select className="budget-year" value={year} onChange={e => setYear(Number(e.target.value))}>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <button className="btn-secondary" onClick={load}>Atualizar</button>
        </div>
      </div>

      {error && <div className="form-error budget-error">{error}</div>}

      {loading ? (
        <div className="loading-screen">Carregando orçamento...</div>
      ) : (
        <>
          <div className="budget-summary">
            <span>
              <small>Meta despesa total</small>
              <strong>{brl(totals.geral.meta)}</strong>
            </span>
            <span>
              <small>Previsto total</small>
              <strong>{brl(totals.geral.previsto)}</strong>
            </span>
            <span>
              <small>Realizado total</small>
              <strong>{brl(totals.geral.realizado)}</strong>
            </span>
            <span>
              <small>Disponível previsto</small>
              <strong>{brl(totals.geral.meta - totals.geral.previsto)}</strong>
            </span>
            <span>
              <small>Consumo previsto</small>
              <strong>
                {totals.geral.meta ? `${Math.round((totals.geral.previsto / totals.geral.meta) * 100)}%` : '0%'}
              </strong>
            </span>
          </div>

          {mode === 'visao' && (
            <>
              <section className="budget-section">
                <div className="budget-section-head">
                  <div>
                    <h2>Tendência mensal (barras + linha)</h2>
                    <p>Meta e previsto em barras, realizado em linha</p>
                  </div>
                </div>
                <div className="budget-trend-grid">
                  <div className="budget-trend-wrap">
                    <div className="budget-trend-legend">
                      <span><i className="legend-box legend-box--meta" /> Meta</span>
                      <span><i className="legend-box legend-box--previsto" /> Previsto</span>
                      <span><i className="legend-line" /> Realizado</span>
                    </div>
                    <div className="budget-trend-scroll">
                      <div
                        className="budget-trend-chart"
                        style={{ width: `${trendChart.width}px`, height: `${trendChart.chartHeight + 52}px` }}
                      >
                        <div className="budget-trend-grid-lines">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                        <svg
                          className="budget-trend-line-svg"
                          viewBox={`0 0 ${trendChart.width} ${trendChart.chartHeight}`}
                          preserveAspectRatio="none"
                        >
                          <polyline points={trendChart.points} />
                          {trendChart.pointsArray.map((point, idx) => (
                            <circle key={`${monthlyTotals[idx]?.monthId}-dot`} cx={point.x} cy={point.y} r="3.2" />
                          ))}
                        </svg>
                        <div
                          className="budget-trend-columns"
                          style={{ gridTemplateColumns: `repeat(${monthlyTotals.length}, ${trendChart.colWidth}px)` }}
                        >
                          {monthlyTotals.map(row => (
                            <div className="budget-trend-col" key={row.monthId}>
                              <div className="budget-trend-bars">
                                <span
                                  className="budget-trend-bar budget-trend-bar--meta"
                                  style={{ height: `${Math.max(2, Math.round((row.meta / trendChart.maxValue) * trendChart.chartHeight))}px` }}
                                />
                                <span
                                  className="budget-trend-bar budget-trend-bar--previsto"
                                  style={{ height: `${Math.max(2, Math.round((row.previsto / trendChart.maxValue) * trendChart.chartHeight))}px` }}
                                />
                              </div>
                              <small>{monthShortLabel(row.monthId)}</small>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="budget-trend-table">
                    <div className="budget-trend-table-head">
                      <span>Mes</span>
                      <span>Meta</span>
                      <span>Previsto</span>
                      <span>Realizado</span>
                    </div>
                    {monthlyTotals.map(row => (
                      <div className="budget-trend-table-row" key={`table-${row.monthId}`}>
                        <strong>{monthLabel(row.monthId)}</strong>
                        <span>{brl(row.meta)}</span>
                        <span>{brl(row.previsto)}</span>
                        <span>{brl(row.realizado)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="budget-section">
                <div className="budget-section-head">
                  <div>
                    <h2>Consumo por centro de custo</h2>
                    <p>Pressão orçamentária por centro no ano selecionado</p>
                  </div>
                </div>
                <div className="budget-chart-list">
                  {centerFinancial.map(row => (
                    <div key={row.centro} className="budget-chart-row">
                      <div className="budget-chart-label">
                        <strong>{row.centro}</strong>
                        <small>Meta {brl(row.meta)}</small>
                      </div>
                      <div className="budget-chart-bars">
                        <div>
                          <span>Consumo previsto</span>
                          <div className="budget-usage">
                            <div
                              className={`budget-usage-bar ${
                                row.consumo >= 100 ? 'budget-usage-bar--danger'
                                  : row.consumo >= 85 ? 'budget-usage-bar--warning'
                                    : 'budget-usage-bar--ok'
                              }`}
                              style={{ width: `${Math.min(100, row.consumo)}%` }}
                            />
                          </div>
                          <small>{row.consumo}% · {brl(row.previsto)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {mode === 'visao' && (
            <section className="budget-section">
              <div className="budget-section-head">
                <div>
                  <h2>Mini dashboard financeiro</h2>
                  <p>Distribuição do previsto por professor, disciplina e concurso</p>
                </div>
              </div>
              <div className="dashboard-analytics-grid">
                <div>
                  <h3>Top Professores (previsto)</h3>
                  <div className="dashboard-phase-list">
                    {financialInsights.professor.map(item => (
                      <div className="finance-insight-item" key={item.name}>
                        <span>{item.name}</span>
                        <strong>{brl(item.valor)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Top Disciplinas (previsto)</h3>
                  <div className="dashboard-phase-list">
                    {financialInsights.disciplina.map(item => (
                      <div className="finance-insight-item" key={item.name}>
                        <span>{item.name}</span>
                        <strong>{brl(item.valor)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Top Concursos (previsto)</h3>
                  <div className="dashboard-phase-list">
                    {financialInsights.concurso.map(item => (
                      <div className="finance-insight-item" key={item.name}>
                        <span>{item.name}</span>
                        <strong>{brl(item.valor)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {mode === 'config' && CENTROS_CUSTO.map(centro => {
            const rows = groups[centro] ?? [];
            const total = totals.byGroup[centro] ?? emptyTotals();
            return (
              <section className="budget-section" key={centro}>
                <div className="budget-section-head">
                  <div>
                    <h2>{centro}</h2>
                    <p>{brl(total.meta - total.previsto)} disponível previsto</p>
                  </div>
                  <div className="budget-section-metrics">
                    <span>Meta {brl(total.meta)}</span>
                    <span>Previsto {brl(total.previsto)}</span>
                    <span>Realizado {brl(total.realizado)}</span>
                  </div>
                </div>

                <div className="budget-table">
                  <div className="budget-row budget-row--head">
                    <span>Mês</span>
                    <span>Configurar meta</span>
                    <span>Previsto</span>
                    <span>Realizado</span>
                    <span>Disponível</span>
                    <span>Consumo</span>
                    <span>Status</span>
                  </div>

                  {rows.map(row => {
                    const key = `${centro}:${row.monthId}`;
                    const consumo = row.meta ? Math.round((row.previsto / row.meta) * 100) : 0;
                    return (
                      <div className="budget-row" key={key}>
                        <div>
                          <strong>{monthLabel(row.monthId)}</strong>
                          <small>{row.previstoCards.length} pedido{row.previstoCards.length !== 1 ? 's' : ''} previsto{row.previstoCards.length !== 1 ? 's' : ''}</small>
                        </div>
                        <div className="budget-edit">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editing[key] ?? ''}
                            onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="0,00"
                          />
                          <button className="btn-secondary" onClick={() => saveMonth(centro, row.monthId)}>Salvar</button>
                        </div>
                        <span>{brl(row.previsto)}</span>
                        <span>{brl(row.realizado)}</span>
                        <span className={row.disponivelPrevisto < 0 ? 'budget-negative' : ''}>
                          {brl(row.disponivelPrevisto)}
                        </span>
                        <span>
                          <div className="budget-usage">
                            <div
                              className={`budget-usage-bar ${
                                consumo >= 100 ? 'budget-usage-bar--danger'
                                  : consumo >= 85 ? 'budget-usage-bar--warning'
                                    : 'budget-usage-bar--ok'
                              }`}
                              style={{ width: `${Math.min(100, consumo)}%` }}
                            />
                          </div>
                          <small>{consumo}%</small>
                        </span>
                        <span className={statusClass(row)}>
                          {!row.meta ? 'Sem meta' : row.disponivelPrevisto < 0 ? 'Estourado' : 'Dentro'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
