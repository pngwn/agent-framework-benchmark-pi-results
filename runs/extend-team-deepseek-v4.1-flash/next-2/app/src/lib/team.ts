/** The team lives in the browser, in this cookie (species API names, in the order added). */
export const TEAM_COOKIE = 'team';
export const TEAM_SIZE = 6;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** A cookie value → the team, dropping duplicates and anything beyond the size limit. */
export function parseTeam(value: string | undefined | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of value.split('|')) {
    const name = raw.trim();
    if (!name || seen.has(name) || names.length >= TEAM_SIZE) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

export function serializeTeam(names: string[]): string {
  return [...new Set(names)].slice(0, TEAM_SIZE).join('|');
}

/** The current team, read from the browser's cookie store. */
export function readTeamCookie(): string[] {
  if (typeof document === 'undefined') return [];
  const prefix = `${TEAM_COOKIE}=`;
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return parseTeam(entry ? entry.slice(prefix.length) : '');
}

export function writeTeamCookie(names: string[]): void {
  if (typeof document === 'undefined') return;
  const value = serializeTeam(names);
  const cookie = `${TEAM_COOKIE}=${value}; path=/; SameSite=Lax`;
  document.cookie = value ? `${cookie}; max-age=${COOKIE_MAX_AGE}` : `${cookie}; max-age=0`;
}
