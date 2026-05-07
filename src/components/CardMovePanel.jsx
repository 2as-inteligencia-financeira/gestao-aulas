import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { configurablePhases, getCardMoveOptions } from '../data/cardMoves';
import { useIsAdmin } from '../contexts/AuthContext';

export function CardMovePanel({ card, onMove }) {
  const isAdmin = useIsAdmin();
  const [configuredPhaseIds, setConfiguredPhaseIds] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!card?.phase_id) return () => { alive = false; };

    supabase
      .from('phase_move_rules')
      .select('allowed_phases')
      .eq('from_phase', card.phase_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const allowed = data?.allowed_phases ?? null;
        setConfiguredPhaseIds(allowed);
        setDraft(allowed ?? []);
      });

    return () => { alive = false; };
  }, [card?.phase_id]);

  const moves = useMemo(() => getCardMoveOptions(card, configuredPhaseIds), [card, configuredPhaseIds]);
  const phaseChoices = useMemo(() => configurablePhases(card?.phase_id), [card?.phase_id]);

  if (!card || moves.length === 0) return null;

  function togglePhase(phaseId) {
    setDraft(current => current.includes(phaseId)
      ? current.filter(id => id !== phaseId)
      : [...current, phaseId]);
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('phase_move_rules')
        .upsert({
          from_phase: card.phase_id,
          allowed_phases: draft,
        }, { onConflict: 'from_phase' });
      if (error) throw error;
      setConfiguredPhaseIds(draft);
      setConfigOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-move-panel">
      <h3>Mover card para fase</h3>
      <div className="card-move-actions">
        {moves.map(move => (
          <button
            key={move.phaseId}
            type="button"
            className={`card-move-btn card-move-btn--${move.tone}`}
            onClick={() => onMove?.(card, move)}
          >
            <span>{move.phase.name}</span>
            <strong>→</strong>
          </button>
        ))}
      </div>
      {isAdmin && (
        <div className="card-move-links">
          <button type="button" onClick={() => setConfigOpen(open => !open)}>
            ↱ Configurar mover card
          </button>
        </div>
      )}

      {isAdmin && configOpen && (
        <div className="card-move-config">
          <span>Fases disponíveis a partir de {card.phase_id}</span>
          <div className="card-move-config-list">
            {phaseChoices.map(phase => (
              <label key={phase.id}>
                <input
                  type="checkbox"
                  checked={draft.includes(phase.id)}
                  onChange={() => togglePhase(phase.id)}
                />
                {phase.name}
              </label>
            ))}
          </div>
          <div className="card-move-config-actions">
            <button type="button" className="btn-secondary" onClick={() => setConfigOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={saveConfig} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar fases'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
