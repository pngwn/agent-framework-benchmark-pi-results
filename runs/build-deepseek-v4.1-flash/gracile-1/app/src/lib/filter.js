export const PAGE_SIZE = 48;

export function filterPokedex(entries, params = {}) {
  const q = String(params.q ?? '');
  const type = String(params.type ?? '');
  const generation = String(params.generation ?? '');
  const search = q.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    if (search && !entry.displayName.toLowerCase().includes(search)) return false;
    if (type && !entry.types?.some((item) => item.name === type)) return false;
    if (generation && entry.generation !== generation) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number.parseInt(params.page, 10) || 1;
  const current = Math.min(Math.max(1, requested), totalPages);
  const start = (current - 1) * PAGE_SIZE;

  return {
    q,
    type,
    generation,
    all: filtered,
    items: filtered.slice(start, start + PAGE_SIZE),
    total,
    totalPages,
    page: current,
  };
}

export function homeUrl(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type) params.set('type', state.type);
  if (state.generation) params.set('generation', state.generation);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}
