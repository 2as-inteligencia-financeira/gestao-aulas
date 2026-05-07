import { GROUP_COLORS } from '../data/phases';
import { Card } from './Card';

export function Column({ phase, cards, onAdvance, onArchive, onEdit }) {
  const color = GROUP_COLORS[phase.group] ?? '#666666';

  return (
    <div className="column">
      <div className="column-header" style={{ borderTopColor: color }}>
        <span className="column-name">{phase.name}</span>
        <span
          className="column-count"
          style={{ background: color + '18', color }}
        >
          {cards.length}
        </span>
      </div>

      <div className="column-body">
        {cards.length === 0 && (
          <div className="column-empty">—</div>
        )}
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onAdvance={onAdvance}
            onArchive={onArchive}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
