/**
 * Server-side client for the local PokeAPI server.
 *
 * All app data comes from this API over HTTP at request time.
 * Responses are cached in memory for the lifetime of the process.
 */

export const apiBase = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(
	/\/+$/,
	'',
);

const cache = new Map<string, Promise<any>>();

/** Fetch a resource below `/api/v2/`. Returns `null` on 404. */
export function api(path: string): Promise<any> {
	let pending = cache.get(path);
	if (!pending) {
		pending = fetch(`${apiBase}/api/v2/${path}`).then(async (response) => {
			if (response.status === 404) return null;
			if (!response.ok)
				throw new Error(`PokeAPI error for ${path}: ${response.status}`);
			return response.json();
		});
		// Do not cache failures forever; allow a retry on the next request.
		pending.catch(() => cache.delete(path));
		cache.set(path, pending);
	}
	return pending;
}

/** Extract the trailing numeric id from a PokeAPI resource URL. */
export function idFromUrl(url: string): number {
	const match = /\/(\d+)\/?$/.exec(url);
	if (!match) throw new Error(`Cannot parse id from URL: ${url}`);
	return Number(match[1]);
}

/** Front sprite URL for a Pokémon (media lives on the API server). */
export function spriteUrl(pokemonId: number): string {
	return `${apiBase}/media/sprites/pokemon/${pokemonId}.png`;
}
