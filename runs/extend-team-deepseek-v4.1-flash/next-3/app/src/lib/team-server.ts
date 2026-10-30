import 'server-only';
import { cookies } from 'next/headers';
import { parseTeamCookie, TEAM_COOKIE } from './team';

/** The species names on the browser's team, read from the request cookie. */
export async function getTeam(): Promise<string[]> {
  const store = await cookies();
  return parseTeamCookie(store.get(TEAM_COOKIE)?.value);
}
