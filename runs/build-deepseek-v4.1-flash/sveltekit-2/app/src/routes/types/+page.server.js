import { getTypes } from '#lib/server/api.js';

export async function load() {
	const types = await getTypes();
	return { types: types.map(({ name, label }) => ({ name, label })) };
}
