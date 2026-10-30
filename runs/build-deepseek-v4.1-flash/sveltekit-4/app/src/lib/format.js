export function humanize(value) {
	if (!value) return '';
	return String(value)
		.split('-')
		.map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
		.join(' ');
}

export function englishName(names, fallback = '') {
	return names?.find((entry) => entry.language?.name === 'en')?.name ?? fallback;
}

export function englishEntry(entries) {
	return entries?.find((entry) => entry.language?.name === 'en');
}

export function latestEnglishFlavorText(entries) {
	for (let i = (entries?.length ?? 0) - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.language?.name === 'en') {
			return entry.flavor_text.replace(/\s+/g, ' ').trim();
		}
	}
	return null;
}

export function shortEffect(entries) {
	return englishEntry(entries)?.short_effect ?? null;
}

export function dexNumber(id) {
	return `#${String(id).padStart(4, '0')}`;
}

export function displayValue(value) {
	return value === null || value === undefined || value === '' ? '—' : String(value);
}
