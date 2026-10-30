import { humanize } from './format'

// The team lives in a first-party cookie so the server can render the right state on
// every request. The client keeps a copy in React state and writes the cookie on change.
export const TEAM_COOKIE = 'team'
export const TEAM_SIZE = 6

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function parseTeam(value: string | undefined | null): string[] {
  if (!value) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    try {
      parsed = JSON.parse(decode(value))
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  const names: string[] = []
  for (const item of parsed) {
    if (typeof item !== 'string') continue
    const name = item.trim().toLowerCase()
    if (!name || names.includes(name)) continue
    names.push(name)
    if (names.length >= TEAM_SIZE) break
  }
  return names
}

export function serializeTeam(names: string[]): string {
  return encodeURIComponent(JSON.stringify(names.slice(0, TEAM_SIZE)))
}

export function writeTeamCookie(names: string[]): void {
  if (typeof document === 'undefined') return
  document.cookie = `${TEAM_COOKIE}=${serializeTeam(names)}; path=/; max-age=31536000; samesite=lax`
}

export function removeButtonName(name: string): string {
  return `Remove ${humanize(name)}`
}
