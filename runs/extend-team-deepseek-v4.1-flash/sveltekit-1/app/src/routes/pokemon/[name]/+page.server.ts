import { error } from '@sveltejs/kit';
import { getPokemonPage } from '#lib/server/pokedex.ts';
import { parseTeam, TEAM_COOKIE } from '#lib/team.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, cookies }) => {
	const pokemon = await getPokemonPage(params.name, url.searchParams.get('game'));
	if (!pokemon) error(404, 'Not found');
	return { pokemon, team: parseTeam(cookies.get(TEAM_COOKIE)) };
};
