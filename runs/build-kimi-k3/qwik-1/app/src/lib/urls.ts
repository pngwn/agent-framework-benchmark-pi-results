/** URL helpers shared between server loaders and client components. */

export interface HomeFilters {
  q?: string;
  type?: string;
  generation?: string;
  page?: number;
}

/** Build the home URL for a filter state, omitting empty/default params. */
export function homeUrl(f: HomeFilters): string {
  const p = new URLSearchParams();
  if (f.q && f.q.trim()) p.set('q', f.q.trim());
  if (f.type) p.set('type', f.type);
  if (f.generation) p.set('generation', f.generation);
  if (f.page && f.page > 1) p.set('page', String(f.page));
  const s = p.toString();
  return s ? `/?${s}` : '/';
}
