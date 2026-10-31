// Server-only PokeAPI client. All data is fetched over HTTP at request time and
// cached in memory for the lifetime of the process (the API is a live service;
// nothing is read at build time).

import { englishName, humanize, idFromUrl } from '#lib/format.js';

const BASE = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const cache = new Map();

/**
 * Fetch a resource from the API, e.g. api('/pokemon/25/') or api('/pokemon/?limit=100').
 * Returns null for 404s. Responses are cached in memory.
 */
export function api(path) {
	const url = `${BASE}/api/v2${path}`;
	if (!cache.has(url)) {
		const promise = fetch(url)
			.then((res) => {
				if (res.status === 404) return null;
				if (!res.ok) throw new Error(`PokeAPI responded ${res.status} for ${url}`);
				return res.json();
			})
			.catch((err) => {
				cache.delete(url);
				throw err;
			});
		cache.set(url, promise);
	}
	return cache.get(url);
}

/** Fetch a resource given one of the absolute URLs the API embeds in responses. */
export function apiByUrl(url) {
	return api(new URL(url).pathname.replace(/^\/api\/v2/, ''));
}

/** Front sprite URL for a Pokémon id. */
export function spriteUrl(id) {
	return `${BASE}/media/sprites/pokemon/${id}.png`;
}

// The types the app covers: everything except these.
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

let indexPromise = null;

/**
 * The shared species index: every species with its dex number, types, generation
 * and sprite, plus lookup helpers used to map Pokémon references to their species.
 */
export function getIndex() {
	indexPromise ??= buildIndex().catch((err) => {
		indexPromise = null;
		throw err;
	});
	return indexPromise;
}

async function buildIndex() {
	const [speciesPage, typePage, generationPage] = await Promise.all([
		api('/pokemon-species/?limit=5000'),
		api('/type/?limit=100'),
		api('/generation/?limit=100')
	]);

	const typeNames = typePage.results.map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
	const [typeRecords, generationRecords] = await Promise.all([
		Promise.all(typeNames.map((n) => api(`/type/${encodeURIComponent(n)}/`))),
		Promise.all(generationPage.results.map((r) => api(`/generation/${encodeURIComponent(r.name)}/`)))
	]);

	const types = typeRecords.filter(Boolean).map((t) => ({
		name: t.name,
		en: englishName(t.names) ?? humanize(t.name)
	}));
	const typeEn = new Map(types.map((t) => [t.name, t.en]));

	const generations = generationRecords.filter(Boolean).map((g) => ({
		name: g.name,
		en: englishName(g.names) ?? humanize(g.name)
	}));

	const generationBySpecies = new Map();
	for (const g of generationRecords.filter(Boolean)) {
		for (const s of g.pokemon_species) generationBySpecies.set(s.name, g.name);
	}

	const typesByPokemonId = new Map();
	for (const t of typeRecords.filter(Boolean)) {
		for (const entry of t.pokemon) {
			const pid = idFromUrl(entry.pokemon.url);
			if (pid == null) continue;
			if (!typesByPokemonId.has(pid)) typesByPokemonId.set(pid, []);
			typesByPokemonId.get(pid).push({ name: t.name, slot: entry.slot });
		}
	}
	for (const list of typesByPokemonId.values()) list.sort((a, b) => a.slot - b.slot);

	// A species' default Pokémon has the same id as the species; Pokémon with ids
	// that don't match a species are alternate forms and are out of scope.
	const species = speciesPage.results
		.map((r) => ({ id: idFromUrl(r.url), name: r.name }))
		.filter((s) => s.id != null)
		.sort((a, b) => a.id - b.id);

	const list = species.map((s) => ({
		id: s.id,
		name: s.name,
		human: humanize(s.name),
		sprite: spriteUrl(s.id),
		generation: generationBySpecies.get(s.name) ?? null,
		types: (typesByPokemonId.get(s.id) ?? []).map((t) => ({
			name: t.name,
			en: typeEn.get(t.name) ?? humanize(t.name)
		}))
	}));

	const speciesById = new Map(list.map((s) => [s.id, s]));

	/** Map a Pokémon reference ({name, url}) to its species card, or null for alternate forms. */
	function resolvePokemon(ref) {
		const id = idFromUrl(ref.url);
		return (id != null && speciesById.get(id)) || null;
	}

	return { species: list, types, generations, typeEn, resolvePokemon };
}
