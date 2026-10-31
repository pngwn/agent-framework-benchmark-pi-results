// Shared formatting helpers (safe on server and client).

/** `mr-mime` -> `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/** English name from a PokeAPI `names` array, falling back to the humanized API name. */
export function englishName(
  names: Array<{ name: string; language: { name: string } }> | undefined,
  apiName: string,
): string {
  const entry = names?.find((n) => n.language?.name === 'en')
  return entry?.name ?? humanize(apiName)
}

/** Last English flavor text entry, whitespace collapsed to single spaces. */
export function latestEnglishFlavor(
  entries: Array<{ flavor_text: string; language: { name: string } }> | undefined,
): string | null {
  if (!entries) return null
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].language?.name === 'en') {
      return entries[i].flavor_text.replace(/\s+/g, ' ').trim()
    }
  }
  return null
}

/** Species id -> `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

/** Extract the numeric id from a PokeAPI resource URL. */
export function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

export const MISSING = '—'
