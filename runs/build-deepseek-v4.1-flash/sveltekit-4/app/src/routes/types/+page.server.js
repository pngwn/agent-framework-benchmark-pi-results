import { getAllTypes } from '#lib/server/pokeapi';

export async function load() {
	const types = await getAllTypes();
	return {
		title: 'Types – Pokédex',
		types: types.map((type) => ({
			name: type.name,
			englishName: type.englishName
		}))
	};
}
