import 'server-only';
import { cookies } from 'next/headers';

/** The team is a browser-owned list of species names, kept in a cookie. */
export const TEAM_COOKIE = 'pokedex-team';
export const TEAM_SIZE = 6;

/** API names only contain lowercase letters, digits and hyphens. */
const NAME_PATTERN = /^[a-z0-9-]+$/;

/** The species on the team, in the order they were added. */
export async function getTeam(): Promise<string[]> {
  const store = await cookies();
  const raw = store.get(TEAM_COOKIE)?.value;
  if (!raw) return [];

  const team: string[] = [];
  for (const part of raw.split(',')) {
    const name = part.trim().toLowerCase();
    if (!name || !NAME_PATTERN.test(name) || team.includes(name)) continue;
    team.push(name);
    if (team.length === TEAM_SIZE) break;
  }
  return team;
}

export async function writeTeam(team: string[]): Promise<void> {
  const store = await cookies();
  store.set(TEAM_COOKIE, team.join(','), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
