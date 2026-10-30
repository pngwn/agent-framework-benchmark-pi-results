export function humanize(name: string | null | undefined): string {
  if (!name) return ''
  return String(name)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function dexNumber(id: number | string): string {
  return `#${String(id).padStart(4, '0')}`
}

export function displayValue(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === ''
    ? '—'
    : String(value)
}
