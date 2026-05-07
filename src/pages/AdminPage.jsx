import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const PERFIL_LABEL = { admin: 'Admin', financeiro: 'Financeiro', gestor: 'Gestor', operador: 'Operador' };
const PERFIL_COLOR = { admin: '#f59e0b', financeiro: '#2563eb', gestor: '#22c55e', operador: '#666' };

export default function AdminPage() {
  const [email, setEmail]     = useState('');
  const [nome, setNome]       = useState('');
  const [perfil, setPerfil]   = useState('operador');
  const [senha, setSenha]     = useState('');
  const [msg, setMsg]         = useState(null); // { text, ok }
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [editId, setEditId]   = useState(null);
  const [editPerfil, setEditPerfil] = useState('');
  const [syncMsg, setSyncMsg]   = useState(null);
  const [syncing, setSyncing]   = useState(false);
  const [calendarMsg, setCalendarMsg] = useState(null);
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [calendar, setCalendar] = useState({
    enabled: false,
    account_label: 'Calendar Operação',
    calendar_id: '',
    organizer_email: '',
    sync_from_phase: 'agendamento',
    sync_to_phase: 'aulas-gravacoes-previstas',
    sync_mode: 'on_move',
  });

  const fetchUsuarios = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    setUsuarios(data ?? []);
  }, []);

  const fetchIntegrations = useCallback(async () => {
    const { data } = await supabase
      .from('integrations')
      .select('id, enabled, config')
      .eq('id', 'google_calendar')
      .maybeSingle();
    if (!data) return;
    const cfg = data.config ?? {};
    setCalendar({
      enabled: Boolean(data.enabled),
      account_label: cfg.account_label ?? 'Calendar Operação',
      calendar_id: cfg.calendar_id ?? '',
      organizer_email: cfg.organizer_email ?? '',
      sync_from_phase: cfg.sync_from_phase ?? 'agendamento',
      sync_to_phase: cfg.sync_to_phase ?? 'aulas-gravacoes-previstas',
      sync_mode: cfg.sync_mode ?? 'on_move',
    });
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]); // eslint-disable-line react-hooks/set-state-in-effect

  async function handleCriar(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { name: nome, email, password: senha, perfil },
      });

      if (error || data?.error) throw new Error(data?.error ?? error.message);

      setMsg({ text: `✓ Usuário ${email} criado com sucesso. Pode logar imediatamente.`, ok: true });
      setEmail(''); setNome(''); setSenha(''); setPerfil('operador');
      setTimeout(fetchUsuarios, 800);
    } catch (err) {
      setMsg({ text: 'Erro: ' + err.message, ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handlePerfilSave(id) {
    await supabase
      .from('profiles')
      .update({ perfil: editPerfil, updated_at: new Date().toISOString() })
      .eq('id', id);
    setEditId(null);
    fetchUsuarios();
  }

  async function handleSyncProfessores() {
    setSyncMsg(null);
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-professores');
      if (error || data?.error) throw new Error(data?.error ?? error.message);
      setSyncMsg({ text: `✓ ${data.sincronizados} professores sincronizados da planilha.`, ok: true });
    } catch (err) {
      setSyncMsg({ text: 'Erro: ' + err.message, ok: false });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveCalendar(e) {
    e.preventDefault();
    setCalendarMsg(null);
    setCalendarSaving(true);
    try {
      const payload = {
        id: 'google_calendar',
        enabled: calendar.enabled,
        config: {
          account_label: calendar.account_label,
          calendar_id: calendar.calendar_id,
          organizer_email: calendar.organizer_email,
          sync_from_phase: calendar.sync_from_phase,
          sync_to_phase: calendar.sync_to_phase,
          sync_mode: calendar.sync_mode,
        },
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('integrations').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setCalendarMsg({ ok: true, text: 'Configuração de Google Calendar salva. Pronto para conectar na edge function de sincronização.' });
    } catch (err) {
      setCalendarMsg({ ok: false, text: 'Erro: ' + err.message });
    } finally {
      setCalendarSaving(false);
    }
  }

  return (
    <div className="dir-page">
      <div className="dir-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-sub">Gerenciamento de usuários e integrações</p>
        </div>
      </div>

      {/* ── Sync Google Sheets ── */}
      <div className="admin-section" style={{ marginBottom: 24 }}>
        <h2 className="admin-section-title">Sincronizar Professores</h2>
        <p style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 14, lineHeight: 1.6 }}>
          Importa os dados da aba <strong>Cadastro</strong> da planilha de professores (colunas A–K),
          incluindo parâmetros de remuneração. Registros existentes são atualizados pelo nome.
        </p>
        {syncMsg && (
          <p style={{
            fontSize: 12,
            color: syncMsg.ok ? 'var(--grn)' : 'var(--red)',
            background: syncMsg.ok ? '#16a34a12' : '#dc262612',
            border: `1px solid ${syncMsg.ok ? '#16a34a30' : '#dc262630'}`,
            borderRadius: 4, padding: '8px 10px', lineHeight: 1.5, marginBottom: 10,
          }}>
            {syncMsg.text}
          </p>
        )}
        <button
          className="btn-primary"
          onClick={handleSyncProfessores}
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {syncing ? '⟳ Sincronizando...' : '↓ Sincronizar com Google Sheets'}
        </button>
      </div>

      <div className="admin-section" style={{ marginBottom: 24 }}>
        <h2 className="admin-section-title">Integrações · Google Calendar</h2>
        <p style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 14, lineHeight: 1.6 }}>
          Esta integração usa uma conta externa de operação (não a conta do usuário logado no Supabase). Deixe configurado agora e conecte depois na função de sincronização.
        </p>
        <form onSubmit={handleSaveCalendar} className="admin-form">
          <div className="form-row">
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={calendar.enabled}
                onChange={e => setCalendar(current => ({ ...current, enabled: e.target.checked }))}
              />
              Integração habilitada
            </label>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label>Rótulo da conta</label>
              <input
                type="text"
                value={calendar.account_label}
                onChange={e => setCalendar(current => ({ ...current, account_label: e.target.value }))}
                placeholder="Ex: Calendar Operação DC"
              />
            </div>
            <div className="form-row">
              <label>Calendar ID</label>
              <input
                type="text"
                value={calendar.calendar_id}
                onChange={e => setCalendar(current => ({ ...current, calendar_id: e.target.value }))}
                placeholder="agenda@group.calendar.google.com"
              />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label>E-mail organizador</label>
              <input
                type="email"
                value={calendar.organizer_email}
                onChange={e => setCalendar(current => ({ ...current, organizer_email: e.target.value }))}
                placeholder="operacao@empresa.com"
              />
            </div>
            <div className="form-row">
              <label>Modo de sincronização</label>
              <select
                value={calendar.sync_mode}
                onChange={e => setCalendar(current => ({ ...current, sync_mode: e.target.value }))}
              >
                <option value="on_move">Ao mover de fase</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label>Sincronizar da fase</label>
              <input type="text" value={calendar.sync_from_phase} readOnly className="input-readonly" />
            </div>
            <div className="form-row">
              <label>Sincronizar para fase</label>
              <input type="text" value={calendar.sync_to_phase} readOnly className="input-readonly" />
            </div>
          </div>
          {calendarMsg && (
            <p style={{
              fontSize: 12,
              color: calendarMsg.ok ? 'var(--grn)' : 'var(--red)',
              background: calendarMsg.ok ? '#16a34a12' : '#dc262612',
              border: `1px solid ${calendarMsg.ok ? '#16a34a30' : '#dc262630'}`,
              borderRadius: 4, padding: '8px 10px', lineHeight: 1.5,
            }}>
              {calendarMsg.text}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={calendarSaving}>
              {calendarSaving ? 'Salvando...' : 'Salvar integração'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Criar usuário ── */}
      <div className="admin-section" style={{ marginBottom: 24 }}>
        <h2 className="admin-section-title">Criar novo usuário</h2>
        <form onSubmit={handleCriar} className="admin-form">
          <div className="form-row-2">
            <div className="form-row">
              <label>Nome completo</label>
              <input
                type="text" value={nome}
                onChange={e => setNome(e.target.value)}
                required placeholder="Ex: João Silva"
              />
            </div>
            <div className="form-row">
              <label>E-mail</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required placeholder="joao@empresa.com"
              />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label>Senha inicial</label>
              <input
                type="password" value={senha}
                onChange={e => setSenha(e.target.value)}
                required minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="form-row">
              <label>Perfil</label>
              <select value={perfil} onChange={e => setPerfil(e.target.value)}>
                <option value="operador">Operador</option>
                <option value="gestor">Gestor</option>
                <option value="financeiro">Financeiro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {msg && (
            <p style={{
              fontSize: 12,
              color: msg.ok ? '#22c55e' : '#ef4444',
              background: msg.ok ? '#22c55e12' : '#ef444412',
              border: `1px solid ${msg.ok ? '#22c55e30' : '#ef444430'}`,
              borderRadius: 4, padding: '8px 10px', lineHeight: 1.5,
            }}>
              {msg.text}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Lista de usuários ── */}
      <div className="admin-section">
        <h2 className="admin-section-title">
          Usuários cadastrados <span style={{ color: 'var(--mut)', fontWeight: 400 }}>({usuarios.length})</span>
        </h2>
        <div className="dir-list" style={{ marginTop: 12 }}>
          {usuarios.map(u => (
            <div key={u.id} className="dir-list-row">
              <div className="dir-list-info">
                <span className="dir-card-name">{u.name}</span>
                <span className="dir-card-area">{u.email}</span>
              </div>
              <div className="dir-list-right">
                {editId === u.id ? (
                  <>
                    <select
                      value={editPerfil}
                      onChange={e => setEditPerfil(e.target.value)}
                      style={{
                        fontSize: 12, padding: '4px 8px',
                        background: 'var(--rai)', border: '1px solid var(--bor)',
                        color: 'var(--txt)', borderRadius: 4,
                      }}
                    >
                      <option value="operador">Operador</option>
                      <option value="gestor">Gestor</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      className="btn-primary"
                      style={{ fontSize: 11, padding: '4px 12px' }}
                      onClick={() => handlePerfilSave(u.id)}
                    >
                      Salvar
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => setEditId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="dir-perfil-badge"
                      style={{ color: PERFIL_COLOR[u.perfil], borderColor: PERFIL_COLOR[u.perfil] + '44' }}
                    >
                      {PERFIL_LABEL[u.perfil] ?? u.perfil}
                    </span>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => { setEditId(u.id); setEditPerfil(u.perfil); }}
                    >
                      Alterar perfil
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {usuarios.length === 0 && <p className="dir-empty">Nenhum usuário encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
