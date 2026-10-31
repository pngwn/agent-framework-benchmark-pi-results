import { getTypes } from '../../lib/server/data.js';

export async function load() {
	return { types: await getTypes() };
}
