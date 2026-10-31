/** Humanize an API name: each `-`-separated word capitalized, joined by spaces. */
export function humanize(name) {
	return name
		.split('-')
		.map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');
}

/** Dex number: `#` plus four zero-padded digits. */
export function dexNumber(id) {
	return `#${String(id).padStart(4, '0')}`;
}

/** Extract the numeric id from a PokeAPI resource URL. */
export function idFromUrl(url) {
	const match = /\/(\d+)\/?$/.exec(url);
	return match ? Number(match[1]) : null;
}

/** The English entry of a `names` array, or null. */
export function englishName(names) {
	return names?.find((n) => n.language?.name === 'en')?.name ?? null;
}

/** Collapse every run of whitespace (including \n and \f) to a single space. */
export function collapseWhitespace(text) {
	return text.replace(/\s+/g, ' ').trim();
}
