export function humanize(name: string): string {
  return String(name)
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

export function statLabel(name: string): string {
  return STAT_LABELS[name] ?? humanize(name)
}
