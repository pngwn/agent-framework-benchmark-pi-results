import { error } from '@sveltejs/kit';
import {
	englishName,
	humanize,
	latestEnglishFlavor,
	speciesIdFromUrl
} from '#lib/format.js';
import { fetchJson, fetchMany, fetchUrl, getVersionGroups } from '#lib/server/api.js';

const STAT_LABELS = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

const METHOD_PRIORITY = {
	'level-up': 0,
	machine: 1,
	egg: 2,
	tutor: 3
};

function evolutionNode(node) {
	return {
		name: node.species.name,
		label: humanize(node.species.name),
		evolvesTo: (node.evolves_to ?? []).map(evolutionNode)
	};
}

export async function load({ params, url }) {
	let species;
	try {
		species = await fetchJson(`/api/v2/pokemon-species/${encodeURIComponent(params.name)}/`);
	} catch (err) {
		if (err.status === 404) error(404, 'Not found');
		throw err;
	}

	const defaultVariety = (species.varieties ?? []).find((variety) => variety.is_default);
	const pokemonId = defaultVariety
		? speciesIdFromUrl(defaultVariety.pokemon.url)
		: species.id;

	let pokemon;
	try {
		pokemon = await fetchJson(`/api/v2/pokemon/${pokemonId}/`);
	} catch (err) {
		if (err.status === 404) error(404, 'Not found');
		throw err;
	}

	const label = englishName(species, humanize(species.name));
	const genus =
		species.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? '—';
	const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? '—';
	const artwork =
		pokemon.sprites?.other?.['official-artwork']?.front_default ??
		pokemon.sprites?.front_default ??
		null;

	const types = [...(pokemon.types ?? [])]
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({ name: entry.type.name, label: humanize(entry.type.name) }));

	const stats = (pokemon.stats ?? []).map((entry) => ({
		label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
		value: entry.base_stat
	}));
	const total = stats.reduce((sum, stat) => sum + stat.value, 0);

	const abilities = [...(pokemon.abilities ?? [])]
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({
			name: entry.ability.name,
			label: humanize(entry.ability.name),
			hidden: Boolean(entry.is_hidden)
		}));

	let evolution = null;
	if (species.evolution_chain?.url) {
		const chain = await fetchUrl(species.evolution_chain.url);
		evolution = evolutionNode(chain.chain);
	}

	const gameNames = [
		...new Set(
			(pokemon.moves ?? []).flatMap((move) =>
				move.version_group_details.map((detail) => detail.version_group.name)
			)
		)
	];
	const versionGroups = await getVersionGroups(gameNames);
	const games = versionGroups.map((group) => ({
		name: group.name,
		label: humanize(group.name),
		order: group.order
	}));

	const requestedGame = url.searchParams.get('game');
	const selectedGame = games.some((game) => game.name === requestedGame)
		? requestedGame
		: (games.at(-1)?.name ?? null);

	const moveSpecs = [];
	const moveUrls = new Map();
	if (selectedGame) {
		for (const move of pokemon.moves ?? []) {
			for (const detail of move.version_group_details) {
				if (detail.version_group.name !== selectedGame) continue;
				moveSpecs.push({
					moveName: move.move.name,
					method: detail.move_learn_method.name,
					level: detail.level_learned_at
				});
				moveUrls.set(move.move.name, move.move.url);
			}
		}
	}

	const moveNames = [...moveUrls.keys()];
	const moveRecords = await fetchMany(moveNames, (name) => fetchUrl(moveUrls.get(name)));
	const moveDetails = new Map(
		moveNames.map((name, index) => [name, moveRecords[index]])
	);

	const groups = new Map();
	for (const [index, spec] of moveSpecs.entries()) {
		const detail = moveDetails.get(spec.moveName);
		if (!detail) continue;

		const row = {
			key: `${spec.method}:${spec.moveName}:${spec.level}:${index}`,
			level: spec.level,
			moveName: spec.moveName,
			moveLabel: englishName(detail, humanize(spec.moveName)),
			typeName: detail.type.name,
			typeLabel: humanize(detail.type.name),
			category: humanize(detail.damage_class?.name),
			power: detail.power,
			accuracy: detail.accuracy,
			pp: detail.pp
		};

		if (!groups.has(spec.method)) {
			groups.set(spec.method, {
				method: spec.method,
				label: humanize(spec.method),
				rows: []
			});
		}
		groups.get(spec.method).rows.push(row);
	}

	const tables = [...groups.values()].sort((a, b) => {
		const aPriority = METHOD_PRIORITY[a.method] ?? 4;
		const bPriority = METHOD_PRIORITY[b.method] ?? 4;
		if (aPriority !== bPriority) return aPriority - bPriority;
		return a.label.localeCompare(b.label);
	});

	for (const table of tables) {
		table.showLevel = table.method === 'level-up';
		table.rows.sort((a, b) => {
			if (table.showLevel) {
				const levelOrder = (a.level ?? Infinity) - (b.level ?? Infinity);
				if (levelOrder !== 0) return levelOrder;
			}
			return a.moveLabel.localeCompare(b.moveLabel);
		});
	}

	return {
		id: species.id,
		name: species.name,
		label,
		genus,
		flavor,
		artwork,
		height: pokemon.height,
		weight: pokemon.weight,
		types,
		stats,
		total,
		abilities,
		evolution,
		games,
		selectedGame,
		tables
	};
}
