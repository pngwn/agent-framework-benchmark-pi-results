import { getIndex } from '#lib/server/api.js';

export async function load() {
	const { species, types, generations } = await getIndex();
	return { species, types, generations };
}
