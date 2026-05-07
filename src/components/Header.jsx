export function Header({ totalCards, onNewCard }) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">
          <span className="header-logo-l">L</span>
          <span className="header-logo-iq">UNIQ</span>
        </span>
        <span className="header-divider">/</span>
        <span className="header-title">Gestão de Solicitações de Aulas</span>
      </div>
      <div className="header-actions">
        <span className="header-count">{totalCards} card{totalCards !== 1 ? 's' : ''}</span>
        <button className="btn-primary" onClick={onNewCard}>
          + Nova Solicitação
        </button>
      </div>
    </header>
  );
}
