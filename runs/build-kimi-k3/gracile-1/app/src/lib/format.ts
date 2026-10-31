/** Display helpers shared by every page. */

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch`. */
export function humanize(apiName: string): string {
	return apiName
		.split('-')
		.map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
		.join(' ');
}

/** 25 -> `#0025`. */
export function dexNumber(id: number): string {
	return `#${String(id).padStart(4, '0')}`;
}

type LocalizedName = { name: string; language: { name: string } };

/** English name of a resource, from its `names` list. */
export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
	const entry = names?.find((n) => n.language.name === 'en');
	return entry?.name ?? humanize(fallback);
}

type FlavorEntry = {
	flavor_text: string;
	language: { name: string };
};

/** Latest English flavor text, with all whitespace runs collapsed. */
export function latestFlavorText(entries: FlavorEntry[] | undefined): string | null {
	if (!entries) return null;
	for (let i = entries.length - 1; i >= 0; i -= 1) {
		const entry = entries[i]!;
		if (entry.language.name === 'en') return entry.flavor_text.replace(/\s+/g, ' ').trim();
	}
	return null;
}

type EffectEntry = { short_effect: string; language: { name: string } };

/** English short effect text. */
export function englishShortEffect(entries: EffectEntry[] | undefined): string | null {
	const entry = entries?.find((e) => e.language.name === 'en');
	return entry?.short_effect ?? null;
}

/** Page document title: `<h1 text> – Pokédex` (en dash). */
export function pageTitle(h1: string | null): string {
	return h1 === null ? 'Pokédex' : `${h1} – Pokédex`;
}

/** Em dash for missing values. */
export const MISSING = '—';

export function orMissing(value: number | null | undefined): string {
	return value === null || value === undefined ? MISSING : String(value);
}

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** Alternate forms (Pokémon IDs above 10000) are out of scope. */
export function isAlternateForm(pokemonId: number): boolean {
	return pokemonId > 10000;
}
