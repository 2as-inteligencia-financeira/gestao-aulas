import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useIsAdmin } from '../contexts/AuthContext';

const PERFIL_LABEL = { admin: 'Admin', financeiro: 'Financeiro', gestor: 'Gestor', operador: 'Operador' };
const PERFIL_COLOR = { admin: '#f59e0b', financeiro: '#2563eb', gestor: '#22c55e', operador: '#666' };

export default function ColaboradoresPage() {
  const isAdmin = useIsAdmin();
  const [colaboradores, setColaboradores] = useState([]);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editPerfil, setEditPerfil] = useState('');

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('ativo', true)
      .order('name');
    setColaboradores(data ?? []);
  }, []);

  useEffect(() => { fetch(); }, [fetch]); // eslint-disable-line react-hooks/set-state-in-effect

  async function handlePerfilSave(id) {
    await supabase.from('profiles').update({ perfil: editPerfil }).eq('id', id);
    setEditId(null);
    fetch();
  }

  async function handleDeactivate(id) {
    await supabase.from('profiles').update({ ativo: false }).eq('id', id);
    fetch();
  }

  const filtered = colaboradores.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dir-page">
      <div className="dir-header">
        <div>
          <h1 className="page-title">Colaboradores</h1>
          <p className="page-sub">{colaboradores.length} ativo{colaboradores.length !== 1 ? 's' : ''}</p>
        </div>
        <input
          type="text"
          className="dir-search"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="dir-list">
        {filtered.map(c => (
          <div key={c.id} className="dir-list-row">
            <div className="dir-list-info">
              <span className="dir-card-name">{c.name}</span>
              <span className="dir-card-area">{c.email}</span>
            </div>

            <div className="dir-list-right">
              {editId === c.id ? (
                <>
                  <select
                    value={editPerfil}
                    onChange={e => setEditPerfil(e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    <option value="operador">Operador</option>
                    <option value="gestor">Gestor</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn-primary" style={{ fontSize: 11 }} onClick={() => handlePerfilSave(c.id)}>
                    Salvar
                  </button>
                  <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => setEditId(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="dir-perfil-badge"
                    style={{ color: PERFIL_COLOR[c.perfil], borderColor: PERFIL_COLOR[c.perfil] + '44' }}
                  >
                    {PERFIL_LABEL[c.perfil] ?? c.perfil}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 11 }}
                        onClick={() => { setEditId(c.id); setEditPerfil(c.perfil); }}
                      >
                        Perfil
                      </button>
                      <button className="btn-archive" onClick={() => handleDeactivate(c.id)}>
                        Desativar
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="dir-empty">Nenhum colaborador encontrado.</p>}
      </div>
    </div>
  );
}
