import { parseTeamCookie, TEAM_COOKIE } from '#lib/team.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => ({
	team: parseTeamCookie(cookies.get(TEAM_COOKIE))
});
