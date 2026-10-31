/**
 * Small, dependency-free helpers shared between server and client code.
 */

export interface NamedReference {
	name: string;
	url: string;
}

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch`. */
export function humanize(name: string): string {
	return name
		.split('-')
		.map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
		.join(' ');
}

export interface LocalizedName {
	name: string;
	language: NamedReference;
}

/** English name from a `names` list, falling back to the humanized API name. */
export function englishName(
	names: LocalizedName[] | undefined,
	fallback: string,
): string {
	const entry = names?.find((n) => n.language.name === 'en');
	return entry?.name ?? humanize(fallback);
}

export interface FlavorTextEntry {
	flavor_text: string;
	language: NamedReference;
}

export interface EffectEntry {
	effect: string;
	short_effect: string;
	language: NamedReference;
}

export function collapseWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

/** Last English flavor text, whitespace-collapsed. */
export function latestEnglishFlavorText(
	entries: FlavorTextEntry[] | undefined,
): string | null {
	const en = entries?.filter((e) => e.language.name === 'en');
	const last = en?.[en.length - 1];
	return last ? collapseWhitespace(last.flavor_text) : null;
}

/** English short effect text. */
export function englishShortEffect(
	entries: EffectEntry[] | undefined,
): string | null {
	const en = entries?.filter((e) => e.language.name === 'en');
	const last = en?.[en.length - 1];
	return last ? collapseWhitespace(last.short_effect) : null;
}

/** 25 -> `#0025`. */
export function dexNumber(id: number): string {
	return `#${String(id).padStart(4, '0')}`;
}

/** Extract the trailing numeric id from an API resource URL. */
export function idFromUrl(url: string): number | null {
	const match = url.match(/\/(\d+)\/?$/);
	return match ? Number(match[1]) : null;
}

/** Pokémon ids below 10000 are the species' default Pokémon. */
export const FIRST_FORM_ID = 10_000;

export const EM_DASH = '—';

export function valueOrDash(value: number | null | undefined): string {
	return value === null || value === undefined ? EM_DASH : String(value);
}

export interface SpeciesLike {
	id: number;
	name: string;
	human: string;
	generation: string;
	types: string[];
	sprite: string;
}

export interface BrowseFilters {
	q: string;
	type: string;
	generation: string;
	page: number;
}

export const PAGE_SIZE = 48;

export function filterSpecies<T extends SpeciesLike>(
	species: T[],
	filters: { q?: string; type?: string; generation?: string },
): T[] {
	const q = (filters.q ?? '').trim().toLowerCase();
	const type = filters.type ?? '';
	const generation = filters.generation ?? '';
	return species.filter((entry) => {
		if (q && !entry.human.toLowerCase().includes(q)) return false;
		if (type && !entry.types.includes(type)) return false;
		if (generation && entry.generation !== generation) return false;
		return true;
	});
}

export function paginate<T>(
	items: T[],
	page: number,
	pageSize = PAGE_SIZE,
): { page: number; pageCount: number; items: T[] } {
	const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
	const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
	return {
		page: current,
		pageCount,
		items: items.slice((current - 1) * pageSize, current * pageSize),
	};
}

/** Serialize browse state to a query string, omitting defaults. */
export function browseQuery(filters: BrowseFilters): string {
	const params = new URLSearchParams();
	if (filters.q) params.set('q', filters.q);
	if (filters.type) params.set('type', filters.type);
	if (filters.generation) params.set('generation', filters.generation);
	if (filters.page > 1) params.set('page', String(filters.page));
	const serialized = params.toString();
	return serialized ? `?${serialized}` : '';
}
