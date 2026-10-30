/** Humanize an API name: `mr-mime` -> `Mr Mime`. */
export function humanize(name) {
	return String(name ?? '')
		.split('-')
		.map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');
}

export function dexNumber(id) {
	return `#${String(id).padStart(4, '0')}`;
}

export function englishName(resource, fallback) {
	return (
		resource?.names?.find((entry) => entry.language?.name === 'en')?.name ??
		fallback ??
		humanize(resource?.name)
	);
}

/** Latest English flavor text, with all whitespace collapsed. */
export function latestEnglishFlavor(entries) {
	const entry = [...(entries ?? [])].reverse().find((e) => e.language?.name === 'en');
	return entry ? entry.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function englishEffect(entries) {
	return entries?.find((entry) => entry.language?.name === 'en')?.short_effect ?? null;
}

export function displayValue(value) {
	return value === null || value === undefined || value === '' ? '—' : String(value);
}

export function speciesIdFromUrl(url) {
	return Number(String(url).match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}
