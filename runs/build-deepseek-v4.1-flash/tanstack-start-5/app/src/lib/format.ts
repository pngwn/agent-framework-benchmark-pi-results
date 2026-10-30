export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

export function latestEnglishFlavorText(
  entries: Array<{ flavor_text: string; language: { name: string } }> | undefined | null,
): string {
  if (!entries) return ''
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]
    if (entry.language?.name === 'en') {
      return entry.flavor_text.replace(/\s+/g, ' ').trim()
    }
  }
  return ''
}

export function englishName(
  names: Array<{ name: string; language: { name: string } }> | undefined | null,
  fallback: string,
): string {
  const entry = names?.find((item) => item.language?.name === 'en')
  return entry?.name ?? humanize(fallback)
}

export function englishShortEffect(
  entries: Array<{ short_effect: string; language: { name: string } }> | undefined | null,
): string {
  const entry = entries?.find((item) => item.language?.name === 'en')
  return entry?.short_effect ?? ''
}

export function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

export function trackable(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value)
}

export function formatHeight(decimetres: number): string {
  return `${(decimetres / 10).toFixed(1)} m`
}

export function formatWeight(hectograms: number): string {
  return `${(hectograms / 10).toFixed(1)} kg`
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b)
}
