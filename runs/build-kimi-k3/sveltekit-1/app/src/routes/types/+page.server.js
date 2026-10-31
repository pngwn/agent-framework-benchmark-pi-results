import { getIndex } from '#lib/server/api.js';

export async function load() {
	const { types } = await getIndex();
	return { types };
}
