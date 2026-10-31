/** Escape text for interpolation into HTML. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

/** `mr-mime` → `Mr Mime`, `thunder-punch` → `Thunder Punch`. */
export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

/** Numeric id from a resource URL (`.../pokemon/25/` → 25). */
export const idFromUrl = (url: string): number => {
  const m = /\/(\d+)\/?$/.exec(url ?? '');
  return m ? Number(m[1]) : NaN;
};

/** `#0025` */
export const dexNumber = (id: number): string => '#' + String(id).padStart(4, '0');

/** English name from a `names` list, falling back to the humanized API name. */
export const enName = (o: any): string =>
  o?.names?.find((n: any) => n?.language?.name === 'en')?.name ?? humanize(o?.name ?? '');

/** English short_effect from an `effect_entries` list. */
export const enShortEffect = (o: any): string | null =>
  o?.effect_entries?.find((e: any) => e?.language?.name === 'en')?.short_effect ?? null;

/** Last English flavor text with all whitespace runs collapsed to single spaces. */
export const latestEnFlavor = (entries: any[] | undefined): string | null => {
  const en = (entries ?? []).filter((e) => e?.language?.name === 'en');
  const last = en[en.length - 1];
  return last ? String(last.flavor_text).replace(/\s+/g, ' ').trim() : null;
};

export const DASH = '—';

/** Display a possibly-missing numeric value (`—` for null/undefined). */
export const num = (v: number | null | undefined): string => (v === null || v === undefined ? DASH : String(v));

/** Alternate forms have Pokémon IDs above 10000 and are out of scope. */
export const isDefaultPokemonId = (id: number): boolean => Number.isFinite(id) && id <= 10000;
