// Shared, environment-agnostic helpers.

/** `mr-mime` -> `Mr Mime`, `thunder-punch` -> `Thunder Punch` */
export function humanize(name) {
	return name
		.split('-')
		.map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');
}

/** English display name from a record's `names` list, humanized fallback. */
export function englishName(record) {
	return record?.names?.find((n) => n.language.name === 'en')?.name ?? humanize(record?.name ?? '');
}

/** Latest English flavor text with all whitespace runs collapsed. */
export function latestFlavor(entries) {
	const en = (entries ?? []).filter((e) => e.language.name === 'en');
	if (!en.length) return null;
	return en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim();
}

/** Collapse whitespace runs (including \n and \f) to single spaces. */
export function collapse(text) {
	return text == null ? null : text.replace(/\s+/g, ' ').trim();
}

/** Numeric id from a resource URL like `.../pokemon-species/25/`. */
export function idFromUrl(url) {
	const match = /\/(\d+)\/?$/.exec(url);
	return match ? Number(match[1]) : NaN;
}

/** `#0025` */
export function dexNumber(id) {
	return `#${String(id).padStart(4, '0')}`;
}

/** Labels for the six base stats, keyed by API stat name. */
export const STAT_LABELS = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};
