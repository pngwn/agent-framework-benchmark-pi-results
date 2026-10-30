import { error } from '@sveltejs/kit';
import { getTypePage } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const type = await getTypePage(params.name);
	if (!type) error(404, 'Not found');
	return { type };
};
