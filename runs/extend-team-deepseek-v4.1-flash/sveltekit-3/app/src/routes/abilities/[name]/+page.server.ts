import { error } from '@sveltejs/kit';
import { getAbilityPage } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const ability = await getAbilityPage(params.name);
	if (!ability) error(404, 'Not found');
	return { ability };
};
