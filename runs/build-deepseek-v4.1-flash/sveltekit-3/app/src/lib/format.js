export function humanize(name) {
	if (!name) return '';
	return name
		.split('-')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export function englishName(names, fallback) {
	const entry = names?.find((item) => item.language?.name === 'en');
	return entry?.name ?? humanize(fallback);
}

export function collapseWhitespace(text) {
	return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function latestFlavorText(entries) {
	if (!Array.isArray(entries)) return null;
	for (let i = entries.length - 1; i >= 0; i -= 1) {
		if (entries[i]?.language?.name === 'en') {
			return collapseWhitespace(entries[i].flavor_text);
		}
	}
	return null;
}

export const STAT_LABELS = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

export function statLabel(name) {
	return STAT_LABELS[name] ?? humanize(name);
}

export function damageCategory(name) {
	return humanize(name);
}

export function dexNumber(id) {
	return `#${String(id).padStart(4, '0')}`;
}

export function measurement(value, unit) {
	return `${(value / 10).toFixed(1)} ${unit}`;
}

export function displayValue(value) {
	return value === null || value === undefined || value === '' ? '—' : String(value);
}
