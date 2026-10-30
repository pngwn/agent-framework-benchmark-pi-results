export const DASH = '—';

export const humanize = (name: string) =>
	name
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const orDash = (value: number | string | null | undefined) =>
	value === null || value === undefined || value === '' ? DASH : String(value);

export const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

type Named = { name: string; language: { name: string } };

/** The English `names` entry, falling back to the humanized API name. */
export const englishName = (resource: { name: string; names?: Named[] }) =>
	resource.names?.find((n) => n.language.name === 'en')?.name ??
	humanize(resource.name);

type Flavor = { flavor_text: string; language: { name: string } };

export function latestEnglishFlavor(entries: Flavor[] | undefined) {
	const english = (entries ?? []).filter((e) => e.language.name === 'en');
	const last = english.at(-1);
	return last ? collapse(last.flavor_text) : null;
}

type Effect = { short_effect: string; language: { name: string } };

export const englishShortEffect = (entries: Effect[] | undefined) => {
	const text = entries?.find((e) => e.language.name === 'en')?.short_effect;
	return text ? collapse(text) : null;
};
