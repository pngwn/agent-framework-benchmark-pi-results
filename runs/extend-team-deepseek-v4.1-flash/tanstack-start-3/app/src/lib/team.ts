export const TEAM_SIZE = 6
export const TEAM_COOKIE = 'team'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const TEAM_NAME = /^[a-z0-9-]+$/

// The team is stored as a comma-separated list of species API names in a cookie, so the
// server can render it correctly on the first request as well as in the browser.
export function decodeTeam(raw: string | undefined | null): string[] {
  if (!raw) return []
  let value = raw
  try {
    value = decodeURIComponent(raw)
  } catch {
    // Keep the raw value if it wasn't valid percent-encoding.
  }

  const team: string[] = []
  for (const part of value.split(',')) {
    const name = part.trim().toLowerCase()
    if (!TEAM_NAME.test(name) || team.includes(name)) continue
    team.push(name)
    if (team.length === TEAM_SIZE) break
  }
  return team
}

export function encodeTeam(team: string[]): string {
  return team.join(',')
}

export function readTeamCookie(): string[] {
  if (typeof document === 'undefined') return []
  const prefix = `${TEAM_COOKIE}=`
  const match = document.cookie.split('; ').find((row) => row.startsWith(prefix))
  return decodeTeam(match?.slice(prefix.length))
}

export function writeTeamCookie(team: string[]): void {
  if (typeof document === 'undefined') return
  const value = encodeURIComponent(encodeTeam(team))
  document.cookie = `${TEAM_COOKIE}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
}
