export function humanize(name: string | null | undefined): string {
  if (!name) return ''
  return String(name)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function englishName(entries: any[] | null | undefined): string {
  return entries?.find((entry) => entry?.language?.name === 'en')?.name ?? ''
}

export function englishValue(
  entries: any[] | null | undefined,
  key: string,
): string {
  return entries?.find((entry) => entry?.language?.name === 'en')?.[key] ?? ''
}

export function latestEnglishFlavor(entries: any[] | null | undefined): string {
  if (!Array.isArray(entries)) return ''
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (entry?.language?.name === 'en' && entry.flavor_text) {
      return String(entry.flavor_text).replace(/\s+/g, ' ').trim()
    }
  }
  return ''
}

export function idFromUrl(url: string | null | undefined): number | null {
  const match = String(url ?? '').match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : null
}

export function mediaPath(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(url, 'http://local.invalid').pathname
  } catch {
    return url
  }
}

export function dexNumber(id: number | string): string {
  return `#${String(id).padStart(4, '0')}`
}

export function statLabel(name: string): string {
  const labels: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  }
  return labels[name] ?? humanize(name)
}
