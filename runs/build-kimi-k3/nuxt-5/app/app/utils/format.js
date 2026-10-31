// Formatting and naming helpers shared by all pages.

export function idFromUrl(url) {
  const m = /\/(\d+)\/?$/.exec(url ?? '')
  return m ? Number(m[1]) : NaN
}

// "mr-mime" -> "Mr Mime", "thunder-punch" -> "Thunder Punch"
export function humanize(name) {
  return String(name ?? '')
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

export function enName(record) {
  return record?.names?.find((n) => n.language?.name === 'en')?.name ?? humanize(record?.name)
}

export function enGenus(record) {
  return record?.genera?.find((g) => g.language?.name === 'en')?.genus ?? ''
}

// Latest English flavor text with all whitespace runs collapsed.
export function latestEnFlavorText(entries) {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en')
  const last = en.at(-1)
  return last ? String(last.flavor_text).replace(/\s+/g, ' ').trim() : ''
}

export function enShortEffect(record) {
  const en = (record?.effect_entries ?? []).filter((e) => e.language?.name === 'en')
  return en.at(-1)?.short_effect ?? ''
}

export function dexNumber(id) {
  return `#${String(id).padStart(4, '0')}`
}

// Front sprites follow a fixed pattern on the API server.
export function spriteUrl(id) {
  return `${getApiBase()}/media/sprites/pokemon/${id}.png`
}

export const MISSING = '—'
