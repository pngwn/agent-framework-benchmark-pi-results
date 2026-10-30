import 'server-only';
import { cookies } from 'next/headers';
import { parseTeam, TEAM_COOKIE } from './team';

/** The team sent by the browser with this request. */
export async function getTeam(): Promise<string[]> {
  const store = await cookies();
  return parseTeam(store.get(TEAM_COOKIE)?.value);
}
