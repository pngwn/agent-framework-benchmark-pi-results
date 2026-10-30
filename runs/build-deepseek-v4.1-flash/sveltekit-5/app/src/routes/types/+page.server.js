import { getTypeData } from '#lib/server/pokeapi.js';

export async function load() {
	const types = await getTypeData();
	return {
		types: types.map(({ name, englishName }) => ({ name, englishName }))
	};
}
