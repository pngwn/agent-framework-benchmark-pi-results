// Formatting helpers shared between the app and the server.

/** Humanize an API name: "mr-mime" -> "Mr Mime", "thunder-punch" -> "Thunder Punch". */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/** Dex number: 25 -> "#0025". */
export function dexNumber(id: number): string {
  return '#' + String(id).padStart(4, '0')
}
