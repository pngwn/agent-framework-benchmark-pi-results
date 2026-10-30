/** `mr-mime` → `Mr Mime`. */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `25` → `#0025`. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/** Missing values are shown as an em dash. */
export function orDash(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}
