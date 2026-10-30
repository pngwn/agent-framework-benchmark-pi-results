export const TEAM_COOKIE = 'pokedex-team'
export const MAX_TEAM_SIZE = 6

// The team is sent as a URI-encoded JSON array of species names in a cookie, so the
// server can render the right state on the first request and on every reload.
export function parseTeam(value: string | undefined | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value))
    if (!Array.isArray(parsed)) return []
    const team: string[] = []
    for (const name of parsed) {
      if (typeof name !== 'string' || !name || team.includes(name)) continue
      team.push(name)
      if (team.length === MAX_TEAM_SIZE) break
    }
    return team
  } catch {
    return []
  }
}

export function serializeTeam(team: string[]): string {
  return encodeURIComponent(JSON.stringify(team.slice(0, MAX_TEAM_SIZE)))
}

export function writeTeamCookie(team: string[]): void {
  if (typeof document === 'undefined') return
  document.cookie = `${TEAM_COOKIE}=${serializeTeam(team)}; path=/; max-age=31536000; samesite=lax`
}
