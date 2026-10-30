export function humanize(name: string): string {
  return String(name)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function displayNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}
