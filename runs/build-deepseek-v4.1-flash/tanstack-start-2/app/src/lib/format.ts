export function humanize(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function dexNumber(id: number | string): string {
  return `#${String(id).padStart(4, '0')}`
}

export function normalizeWhitespace(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

export function displayValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function englishName(
  resource: { names?: Array<{ name: string; language: { name: string } }> } | null | undefined,
  fallback: string,
): string {
  return resource?.names?.find((entry) => entry.language?.name === 'en')?.name ?? humanize(fallback)
}

export function englishGenus(
  species: { genera?: Array<{ genus: string; language: { name: string } }> } | null | undefined,
): string {
  return species?.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? ''
}

export function latestEnglishFlavor(
  entries: Array<{ flavor_text: string; language: { name: string } }> | null | undefined,
): string {
  if (!entries) return ''
  const english = entries.filter((entry) => entry.language?.name === 'en')
  if (!english.length) return ''
  return normalizeWhitespace(english[english.length - 1].flavor_text)
}

export function englishShortEffect(
  entries: Array<{ short_effect: string; language: { name: string } }> | null | undefined,
): string {
  return entries?.find((entry) => entry.language?.name === 'en')?.short_effect ?? ''
}

export function idFromUrl(url: string | null | undefined): number | null {
  const match = url?.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

export function typeBadgeClass(name: string): string {
  return `type-badge type-${name}`
}
