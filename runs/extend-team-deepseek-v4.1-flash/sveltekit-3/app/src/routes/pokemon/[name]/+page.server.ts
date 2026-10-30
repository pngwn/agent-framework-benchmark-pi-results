import { error } from '@sveltejs/kit';
import { getPokemonPage } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const pokemon = await getPokemonPage(params.name, url.searchParams.get('game'));
	if (!pokemon) error(404, 'Not found');
	return { pokemon };
};
