import { error } from '@sveltejs/kit';
import {
	englishName,
	getEvolutionChain,
	getMove,
	getPokemon,
	getSpecies,
	getTypeIndex,
	getVersionGroups,
	humanize,
	idFromUrl
} from '#lib/server/pokeapi.js';

const STAT_LABELS = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const isMissing = (value) => value === null || value === undefined;

export async function load({ params, url }) {
	const species = await getSpecies(params.name);
	if (!species) error(404, 'Not found');

	const defaultVariety = (species.varieties ?? []).find((variety) => variety.is_default);
	const pokemonRef = defaultVariety?.pokemon ?? {
		name: species.name,
		url: `/api/v2/pokemon/${species.id}/`
	};
	const pokemonId = idFromUrl(pokemonRef.url) ?? species.id;
	const pokemon = await getPokemon(pokemonId);
	if (!pokemon) error(404, 'Not found');

	const [typeIndex, versionGroups, evolutionChain] = await Promise.all([
		getTypeIndex(),
		getVersionGroups(),
		(async () => {
			const chainId = idFromUrl(species.evolution_chain?.url);
			return chainId ? await getEvolutionChain(chainId) : null;
		})()
	]);

	const heading = englishName(species);
	const genusEntry = (species.genera ?? []).find((entry) => entry.language?.name === 'en');
	const flavorEntry = (species.flavor_text_entries ?? [])
		.filter((entry) => entry.language?.name === 'en')
		.at(-1);

	const types = (pokemon.types ?? [])
		.slice()
		.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
		.map((entry) => ({
			name: entry.type.name,
			englishName: typeIndex.get(entry.type.name)?.englishName ?? humanize(entry.type.name)
		}));

	const stats = (pokemon.stats ?? []).map((entry) => ({
		name: entry.stat.name,
		label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
		value: entry.base_stat
	}));
	const total = stats.reduce((sum, stat) => sum + stat.value, 0);

	const abilities = (pokemon.abilities ?? [])
		.slice()
		.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
		.map((entry) => ({
			name: entry.ability.name,
			label: humanize(entry.ability.name),
			hidden: Boolean(entry.is_hidden)
		}));

	// Version groups are ordered by their `order`, not by the order they appear in move data.
	const groupByName = new Map(versionGroups.map((group) => [group.name, group]));
	const groupNames = new Set();
	for (const entry of pokemon.moves ?? []) {
		for (const detail of entry.version_group_details ?? []) {
			if (detail.version_group?.name) groupNames.add(detail.version_group.name);
		}
	}
	const games = [...groupNames]
		.map((name) => groupByName.get(name))
		.filter(Boolean)
		.sort((a, b) => a.order - b.order);

	const requestedGame = url.searchParams.get('game');
	const selectedGame = games.find((game) => game.name === requestedGame) ?? games.at(-1) ?? null;

	const rawRowsByMethod = new Map();
	const moveNames = new Set();
	for (const entry of pokemon.moves ?? []) {
		for (const detail of entry.version_group_details ?? []) {
			if (!selectedGame || detail.version_group?.name !== selectedGame.name) continue;
			const methodName = detail.move_learn_method?.name;
			if (!methodName) continue;
			if (!rawRowsByMethod.has(methodName)) rawRowsByMethod.set(methodName, []);
			rawRowsByMethod.get(methodName).push({
				moveName: entry.move.name,
				level: isMissing(detail.level_learned_at) ? null : detail.level_learned_at
			});
			moveNames.add(entry.move.name);
		}
	}

	const moveDetails = await Promise.all([...moveNames].map((name) => getMove(name)));
	const moveByName = new Map();
	for (const move of moveDetails) if (move) moveByName.set(move.name, move);

	const tables = [];
	for (const [methodName, rawRows] of rawRowsByMethod) {
		const rows = [];
		for (const raw of rawRows) {
			const move = moveByName.get(raw.moveName);
			if (!move) continue;
			const typeName = move.type?.name ?? '';
			rows.push({
				level: raw.level,
				moveName: move.name,
				moveLabel: englishName(move),
				typeName,
				typeLabel: typeIndex.get(typeName)?.englishName ?? humanize(typeName),
				category: humanize(move.damage_class?.name ?? ''),
				power: isMissing(move.power) ? null : move.power,
				accuracy: isMissing(move.accuracy) ? null : move.accuracy,
				pp: isMissing(move.pp) ? null : move.pp
			});
		}
		if (!rows.length) continue;
		tables.push({
			name: methodName,
			label: humanize(methodName),
			hasLevel: methodName === 'level-up',
			rows
		});
	}

	tables.sort((a, b) => {
		const aRank = METHOD_ORDER.indexOf(a.name);
		const bRank = METHOD_ORDER.indexOf(b.name);
		const aOrder = aRank === -1 ? METHOD_ORDER.length : aRank;
		const bOrder = bRank === -1 ? METHOD_ORDER.length : bRank;
		if (aOrder !== bOrder) return aOrder - bOrder;
		return a.label.localeCompare(b.label);
	});

	return {
		heading,
		dexNumber: `#${String(species.id).padStart(4, '0')}`,
		genus: genusEntry?.genus ?? '—',
		flavor: flavorEntry ? flavorEntry.flavor_text.replace(/\s+/g, ' ').trim() : '',
		types,
		height: isMissing(pokemon.height) ? '—' : `${(pokemon.height / 10).toFixed(1)} m`,
		weight: isMissing(pokemon.weight) ? '—' : `${(pokemon.weight / 10).toFixed(1)} kg`,
		artwork:
			pokemon.sprites?.other?.['official-artwork']?.front_default ??
			pokemon.sprites?.front_default ??
			null,
		stats,
		total,
		abilities,
		evolutionChain: evolutionChain?.chain ?? {
			species: { name: species.name, url: '' },
			evolves_to: []
		},
		games: games.map((game) => ({ name: game.name, label: game.englishName })),
		selectedGame: selectedGame?.name ?? '',
		tables
	};
}
