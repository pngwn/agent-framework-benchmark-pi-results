import { getTeamPage } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { team } = await parent();
	return getTeamPage(team);
};
