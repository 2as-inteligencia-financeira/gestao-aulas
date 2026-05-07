import { PHASES } from '../data/phases';
import { Column } from './Column';

export function Board({ cardsByPhase, onAdvance, onArchive, onEdit }) {
  return (
    <div className="board">
      {PHASES.map((phase) => (
        <Column
          key={phase.id}
          phase={phase}
          cards={cardsByPhase(phase.id)}
          onAdvance={onAdvance}
          onArchive={onArchive}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
