import { getTypeIndex } from '#lib/server/api.js';

export async function load() {
	const { types } = await getTypeIndex();
	return {
		types: types.map((type) => ({ name: type.name, label: type.label }))
	};
}
