import { getDexData } from '#lib/server/pokeapi.js';

export async function load() {
	return await getDexData();
}
