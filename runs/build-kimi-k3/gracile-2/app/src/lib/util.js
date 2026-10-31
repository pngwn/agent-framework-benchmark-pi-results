export const EM_DASH = '\u2014';

/** mr-mime -> Mr Mime */
export function humanize(name) {
	return String(name)
		.split('-')
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
}

/** English display name from a resource's `names` list. */
export function englishName(entity) {
	const found = entity?.names?.find((n) => n.language?.name === 'en');
	return found ? found.name : humanize(entity?.name ?? '');
}

/** Last English flavor text, whitespace runs collapsed to single spaces. */
export function latestEnglishFlavorText(entries) {
	const english = (entries ?? []).filter((e) => e.language?.name === 'en');
	if (english.length === 0) return null;
	return english.at(-1).flavor_text.replace(/\s+/g, ' ').trim();
}

/** English genus (e.g. "Mouse Pokémon"). */
export function englishGenus(species) {
	const found = (species?.genera ?? []).find((g) => g.language?.name === 'en');
	return found ? found.genus : null;
}

/** English short effect from an `effect_entries` list. */
export function englishShortEffect(entries) {
	const found = (entries ?? []).find((e) => e.language?.name === 'en');
	return found ? found.short_effect.replace(/\s+/g, ' ').trim() : null;
}

/** #25 -> "#0025" */
export function dexNumber(id) {
	return `#${String(id).padStart(4, '0')}`;
}

/** Number or em dash for missing values. */
export function valueOrDash(value) {
	return value === null || value === undefined ? EM_DASH : String(value);
}

/** Hectograms -> "6.0 kg", decimetres -> "0.4 m". */
export function formatMeasure(value, unit) {
	return `${(value / 10).toFixed(1)} ${unit}`;
}
