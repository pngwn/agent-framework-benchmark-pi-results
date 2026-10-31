// Shared helpers usable on both server and client.

/** Humanize an API name: each `-`-separated word capitalized, joined by spaces. */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

type LocalizedName = { name: string; language: { name: string } }

/** English name from a `names` array, falling back to the humanized API name. */
export function englishName(names: LocalizedName[] | undefined, apiName: string): string {
  const en = names?.find((n) => n.language.name === 'en')
  return en?.name ?? humanize(apiName)
}

type FlavorEntry = { flavor_text: string; language: { name: string } }

/** Latest English flavor text with all whitespace runs collapsed to single spaces. */
export function latestEnglishFlavorText(entries: FlavorEntry[] | undefined): string | null {
  if (!entries) return null
  const en = entries.filter((e) => e.language.name === 'en')
  const last = en[en.length - 1]
  if (!last) return null
  return last.flavor_text.replace(/\s+/g, ' ').trim()
}

/** Dex number, e.g. #0025. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

/** Numeric id from a resource URL like `.../api/v2/pokemon/25/`. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : NaN
}

export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

export const DAMAGE_CLASS_LABELS: Record<string, string> = {
  physical: 'Physical',
  special: 'Special',
  status: 'Status',
}

export const EM_DASH = '—'

/** Format a nullable number, using an em dash for missing values. */
export function valueOrDash(value: number | null | undefined): string {
  return value === null || value === undefined ? EM_DASH : String(value)
}

/** Species id for a `/pokemon/<id>/` reference, or null for alternate forms. */
export function speciesIdFromPokemonUrl(url: string): number | null {
  const id = idFromUrl(url)
  if (!Number.isFinite(id) || id >= 10000) return null
  return id
}
