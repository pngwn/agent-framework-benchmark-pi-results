import { parseTeam, TEAM_COOKIE } from '#lib/team.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => {
	return { team: parseTeam(cookies.get(TEAM_COOKIE)) };
};
