import { getPokemonList } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const params = url.searchParams;
	const filters = {
		q: params.get('q') ?? '',
		type: params.get('type') ?? '',
		generation: params.get('generation') ?? '',
		page: Number.parseInt(params.get('page') ?? '1', 10) || 1
	};
	const list = await getPokemonList(filters);
	return { filters: { ...filters, page: list.page }, ...list };
};
