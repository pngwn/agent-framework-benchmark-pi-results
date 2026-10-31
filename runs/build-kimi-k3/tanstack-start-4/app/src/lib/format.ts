// Shared formatting helpers (isomorphic: used on server and client).

/** Humanize an API name: each `-`-separated word capitalized, joined by spaces. */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Dex number: `#` plus four zero-padded digits. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

/** English name from a `names` list. */
export function englishName(
  names: Array<{ name: string; language: { name: string } }> | undefined,
): string | null {
  const entry = names?.find((n) => n.language?.name === 'en')
  return entry?.name ?? null
}

/** Latest English flavor text with all whitespace runs collapsed to a single space. */
export function latestEnglishFlavorText(
  entries:
    | Array<{ flavor_text: string; language: { name: string } }>
    | undefined,
): string | null {
  const en = entries?.filter((e) => e.language?.name === 'en')
  const last = en?.[en.length - 1]
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null
}

/** English short effect from an `effect_entries` list. */
export function englishShortEffect(
  entries:
    | Array<{ short_effect: string; language: { name: string } }>
    | undefined,
): string | null {
  const entry = entries?.find((e) => e.language?.name === 'en')
  return entry?.short_effect ?? null
}

/** Extract the trailing numeric id from an API resource URL. */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url)
  return match ? Number(match[1]) : NaN
}

export const EM_DASH = '—'
