// Shared formatting helpers (safe to use on both server and client).

/** Humanize an API name: capitalize each dash-separated word. */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Dex number: species id shown as # plus four zero-padded digits. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

/** Parse the numeric id from a resource URL like "/api/v2/pokemon/25/". */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : NaN
}

export interface LanguageName {
  name: string
  language: { name: string }
}

/** English name from a `names` array. */
export function englishName(names: LanguageName[] | undefined | null): string | null {
  const entry = names?.find((n) => n.language.name === 'en')
  return entry ? entry.name : null
}

export interface FlavorEntry {
  flavor_text: string
  language: { name: string }
}

/** Latest English flavor text with all whitespace runs collapsed to single spaces. */
export function latestEnglishFlavor(entries: FlavorEntry[] | undefined | null): string | null {
  if (!entries) return null
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language.name === 'en') {
      return entries[i].flavor_text.replace(/\s+/g, ' ').trim()
    }
  }
  return null
}

export const MISSING = '—'
