/** Humanize an API name: `mr-mime` → `Mr Mime`. */
export function humanize(name: string): string {
	return name
		.split('-')
		.map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
		.join(' ');
}

/** Dex number: `#0025`. */
export function dexNumber(id: number): string {
	return `#${String(id).padStart(4, '0')}`;
}

/** Collapse every run of whitespace (incl. \n and \f) to a single space. */
export function collapseWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

export const EM_DASH = '—';

/** Display a possibly-missing numeric value, using an em dash for nulls. */
export function valueOrDash(value: number | null | undefined): string | number {
	return value === null || value === undefined ? EM_DASH : value;
}
