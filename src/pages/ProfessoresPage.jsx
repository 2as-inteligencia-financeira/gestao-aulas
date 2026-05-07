import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const EMPTY = {
  nome: '', email: '', telefone: '', area: '',
  valor_hora: '', banco: '', agencia: '', conta: '',
  tipo_conta: 'pix', chave_pix: '', observacoes: '',
};

function ProfessorModal({ prof, onSave, onClose }) {
  const [form, setForm] = useState(prof ? { ...EMPTY, ...prof } : EMPTY);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{prof ? 'Editar Professor' : 'Novo Professor'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="modal-form">
          <div className="form-row-2">
            <div className="form-row">
              <label>Nome *</label>
              <input type="text" value={form.nome} onChange={set('nome')} required />
            </div>
            <div className="form-row">
              <label>Área / Especialidade</label>
              <input type="text" value={form.area} onChange={set('area')} placeholder="Ex: Finanças" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label>E-mail</label>
              <input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-row">
              <label>Telefone</label>
              <input type="text" value={form.telefone} onChange={set('telefone')} />
            </div>
          </div>
          <div className="form-row">
            <label>Valor / hora (R$)</label>
            <input type="number" value={form.valor_hora} onChange={set('valor_hora')} min="0" step="0.01" />
          </div>

          <div className="dir-section-label">Dados bancários</div>

          <div className="form-row-2">
            <div className="form-row">
              <label>Tipo de conta</label>
              <select value={form.tipo_conta} onChange={set('tipo_conta')}>
                <option value="pix">PIX</option>
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>
            {form.tipo_conta === 'pix' ? (
              <div className="form-row">
                <label>Chave PIX</label>
                <input type="text" value={form.chave_pix} onChange={set('chave_pix')} />
              </div>
            ) : (
              <div className="form-row">
                <label>Banco</label>
                <input type="text" value={form.banco} onChange={set('banco')} />
              </div>
            )}
          </div>

          {form.tipo_conta !== 'pix' && (
            <div className="form-row-2">
              <div className="form-row">
                <label>Agência</label>
                <input type="text" value={form.agencia} onChange={set('agencia')} />
              </div>
              <div className="form-row">
                <label>Conta</label>
                <input type="text" value={form.conta} onChange={set('conta')} />
              </div>
            </div>
          )}

          <div className="form-row">
            <label>Observações</label>
            <textarea value={form.observacoes} onChange={set('observacoes')} rows={2} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">{prof ? 'Salvar' : 'Cadastrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfessoresPage() {
  const { user } = useAuth();
  const [professores, setProfessores] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('professores')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    setProfessores(data ?? []);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleSave(form) {
    const payload = { ...form, valor_hora: form.valor_hora || null, ativo: true };
    if (modal?.prof) {
      await supabase.from('professores').update(payload).eq('id', modal.prof.id);
    } else {
      await supabase.from('professores').insert({ ...payload, created_by: user.id });
    }
    setModal(null);
    fetch();
  }

  async function handleDeactivate(id) {
    await supabase.from('professores').update({ ativo: false }).eq('id', id);
    fetch();
  }

  const filtered = professores.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.area ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dir-page">
      <div className="dir-header">
        <div>
          <h1 className="page-title">Professores</h1>
          <p className="page-sub">{professores.length} cadastrado{professores.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="dir-header-actions">
          <input
            type="text"
            className="dir-search"
            placeholder="Buscar por nome ou área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={() => setModal({ prof: null })}>+ Professor</button>
        </div>
      </div>

      <div className="prof-list">
        {filtered.map(p => (
          <div key={p.id} className="prof-list-row">
            <div className="prof-list-info">
              <span className="prof-nome">{p.nome}</span>
              {p.area && <span className="prof-area">{p.area}</span>}
              {p.email && <span className="prof-email">{p.email}</span>}
            </div>

            <div className="prof-remuneracao">
              {p.valor_hora_video   && <span className="rem-chip">Vídeo R${Number(p.valor_hora_video).toFixed(2)}/h</span>}
              {p.valor_pag_teoria   && <span className="rem-chip">Teoria R${Number(p.valor_pag_teoria).toFixed(2)}</span>}
              {p.valor_questao_com  && <span className="rem-chip">Q.Com R${Number(p.valor_questao_com).toFixed(2)}</span>}
              {p.valor_questao_in   && <span className="rem-chip">Q.In R${Number(p.valor_questao_in).toFixed(2)}</span>}
            </div>

            <div className="prof-list-actions">
              <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setModal({ prof: p })}>
                Editar
              </button>
              <button className="btn-archive" onClick={() => handleDeactivate(p.id)}>
                Desativar
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="dir-empty">Nenhum professor encontrado.</p>
        )}
      </div>

      {modal && (
        <ProfessorModal
          prof={modal.prof}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
