import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useIsAdmin, useIsGestor } from '../contexts/AuthContext';

const ICON = {
  dashboard:'◉',
  board:    '▦',
  profs:    '🎓',
  colabs:   '👥',
  orcamento:'◈',
  admin:    '⚙',
};

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const isGestor = useIsGestor();
  const isAdmin  = useIsAdmin();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function perfilLabel(p) {
    return { admin: 'Admin', financeiro: 'Financeiro', gestor: 'Gestor', operador: 'Operador' }[p] ?? p;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span style={{ fontSize:20, fontWeight:800, letterSpacing:"-.04em" }}><span style={{ color:"#f59e0b" }}>2</span>AS</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          <span className="sidebar-icon">{ICON.dashboard}</span>
          Página Inicial
        </NavLink>

        <NavLink to="/kanban" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          <span className="sidebar-icon">{ICON.board}</span>
          Kanban
        </NavLink>

        {isGestor && (
          <NavLink to="/professores" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="sidebar-icon">{ICON.profs}</span>
            Professores
          </NavLink>
        )}

        {isGestor && (
          <NavLink to="/colaboradores" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="sidebar-icon">{ICON.colabs}</span>
            Colaboradores
          </NavLink>
        )}

        {isGestor && (
          <NavLink to="/orcamento" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="sidebar-icon">{ICON.orcamento}</span>
            Orçamento
          </NavLink>
        )}

        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="sidebar-icon">{ICON.admin}</span>
            Admin
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="sidebar-user-name">{profile?.name ?? '—'}</span>
          <span className="sidebar-user-role">{perfilLabel(profile?.perfil)}</span>
        </div>
        <button className="sidebar-signout" onClick={handleSignOut} title="Sair">
          ⏻
        </button>
      </div>
    </aside>
  );
}
