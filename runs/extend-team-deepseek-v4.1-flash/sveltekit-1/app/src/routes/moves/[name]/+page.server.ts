import { error } from '@sveltejs/kit';
import { getMovePage } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const move = await getMovePage(params.name);
	if (!move) error(404, 'Not found');
	return { move };
};
