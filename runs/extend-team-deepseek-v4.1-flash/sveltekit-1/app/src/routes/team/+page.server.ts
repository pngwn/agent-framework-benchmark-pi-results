import { getTeamPage } from '#lib/server/pokedex.ts';
import { parseTeam, TEAM_COOKIE } from '#lib/team.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const team = parseTeam(cookies.get(TEAM_COOKIE));
	return { team, ...(await getTeamPage(team)) };
};
