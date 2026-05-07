const KEY = 'luniq:gestao-aulas';

export function loadBoard() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { cards: [] };
    return JSON.parse(raw);
  } catch {
    return { cards: [] };
  }
}

export function saveBoard(state) {
  localStorage.setItem(KEY, JSON.stringify({ ...state, lastUpdated: Date.now() }));
}

export function clearBoard() {
  localStorage.removeItem(KEY);
}
