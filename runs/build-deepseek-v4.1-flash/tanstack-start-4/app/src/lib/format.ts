export function humanize(name: string): string {
  return String(name ?? '')
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

export function dexNumber(id: number | string): string {
  return `#${String(Number(id)).padStart(4, '0')}`
}

export function collapseWhitespace(value: string): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function idFromUrl(url: string): number {
  const match = String(url ?? '').match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : 0
}

export function englishEntry(
  entries: Array<Record<string, any>> | undefined,
  field: string,
): string | undefined {
  const entry = [...(entries ?? [])].reverse().find((item) => item?.language?.name === 'en')
  const value = entry?.[field]
  return typeof value === 'string' ? value : undefined
}

export function latestEnglishFlavor(
  entries: Array<Record<string, any>> | undefined,
): string | undefined {
  const entry = [...(entries ?? [])].reverse().find((item) => item?.language?.name === 'en')
  return typeof entry?.flavor_text === 'string' ? collapseWhitespace(entry.flavor_text) : undefined
}

export function displayOrDash(value: unknown): string {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}
