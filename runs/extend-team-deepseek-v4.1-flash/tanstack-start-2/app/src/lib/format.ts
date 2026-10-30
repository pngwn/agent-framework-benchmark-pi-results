export const EM_DASH = '—'

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

export function pageTitle(heading?: string): string {
  return heading ? `${heading} – Pokédex` : 'Pokédex'
}

export function display(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? EM_DASH : String(value)
}

export function spriteUrl(mediaBase: string, id: number): string {
  return `${mediaBase}/media/sprites/pokemon/${id}.png`
}
