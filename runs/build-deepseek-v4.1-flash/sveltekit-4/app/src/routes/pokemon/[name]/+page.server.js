import { error } from '@sveltejs/kit';
import {
	displayValue,
	englishName,
	humanize,
	latestEnglishFlavorText
} from '#lib/format';
import { getByUrl, getRecord, mapLimit } from '#lib/server/pokeapi';

const STAT_LABELS = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function methodOrderIndex(name) {
	const index = METHOD_ORDER.indexOf(name);
	return index === -1 ? METHOD_ORDER.length : index;
}

function chainNode(node) {
	return {
		name: node.species.name,
		display: humanize(node.species.name),
		children: (node.evolves_to ?? []).map(chainNode)
	};
}

function sortRows(rows, isLevelUp) {
	if (isLevelUp) {
		rows.sort(
			(a, b) =>
				(a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER) ||
				a.moveDisplay.localeCompare(b.moveDisplay)
		);
	} else {
		rows.sort((a, b) => a.moveDisplay.localeCompare(b.moveDisplay));
	}
	return rows;
}

function makeRow(methodName, detail, move) {
	return {
		level: methodName === 'level-up' ? detail.level_learned_at : null,
		move: move.name,
		moveDisplay: englishName(move.names, humanize(move.name)),
		moveHref: `/moves/${move.name}`,
		type: move.type?.name ?? '',
		typeDisplay: move.type ? humanize(move.type.name) : '—',
		category: move.damage_class?.name ?? '',
		categoryDisplay: move.damage_class ? humanize(move.damage_class.name) : '—',
		power: displayValue(move.power),
		powerSort: move.power,
		accuracy: displayValue(move.accuracy),
		accuracySort: move.accuracy,
		pp: displayValue(move.pp),
		ppSort: move.pp
	};
}

export async function load({ params, url }) {
	const species = await getRecord('pokemon-species', params.name);
	if (!species) error(404, 'Not found');

	const defaultVariety =
		species.varieties?.find((variety) => variety.is_default) ?? species.varieties?.[0];
	if (!defaultVariety) error(404, 'Not found');

	const [pokemon, evolutionChain] = await Promise.all([
		getByUrl('pokemon', defaultVariety.pokemon.url),
		species.evolution_chain ? getByUrl('evolution-chain', species.evolution_chain.url) : null
	]);
	if (!pokemon) error(404, 'Not found');

	const displayName = englishName(species.names, humanize(species.name));
	const genus = species.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? '';
	const flavorText = latestEnglishFlavorText(species.flavor_text_entries) ?? '—';

	const stats = (pokemon.stats ?? []).map((entry) => ({
		label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
		value: entry.base_stat
	}));
	const total = stats.reduce((sum, stat) => sum + stat.value, 0);

	const abilities = [...(pokemon.abilities ?? [])]
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({
			name: entry.ability.name,
			display: humanize(entry.ability.name),
			hidden: entry.is_hidden
		}));

	const types = [...(pokemon.types ?? [])]
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({
			name: entry.type.name,
			display: humanize(entry.type.name)
		}));

	const versionGroups = new Map();
	for (const moveEntry of pokemon.moves ?? []) {
		for (const detail of moveEntry.version_group_details ?? []) {
			if (!versionGroups.has(detail.version_group.name)) {
				versionGroups.set(detail.version_group.name, detail.version_group);
			}
		}
	}

	const groupRecords = await Promise.all(
		[...versionGroups.values()].map(async (group) => {
			const record = await getByUrl('version-group', group.url);
			return { name: group.name, order: record?.order ?? 0 };
		})
	);
	groupRecords.sort((a, b) => a.order - b.order);

	const requestedGame = url.searchParams.get('game');
	const selectedGame = groupRecords.some((entry) => entry.name === requestedGame)
		? requestedGame
		: groupRecords.at(-1)?.name;

	const methodMoves = new Map();
	if (selectedGame) {
		for (const moveEntry of pokemon.moves ?? []) {
			for (const detail of moveEntry.version_group_details ?? []) {
				if (detail.version_group.name !== selectedGame) continue;
				const method = detail.move_learn_method.name;
				const movesForMethod = methodMoves.get(method) ?? new Map();
				if (!movesForMethod.has(moveEntry.move.name)) {
					movesForMethod.set(moveEntry.move.name, detail);
				}
				methodMoves.set(method, movesForMethod);
			}
		}
	}

	const moveNames = [...new Set([...methodMoves.values()].flatMap((moves) => [...moves.keys()]))];
	const moveRecords = await mapLimit(moveNames, 30, (name) => getRecord('move', name));
	const moveByName = new Map(moveRecords.filter(Boolean).map((move) => [move.name, move]));

	const methodNames = [...methodMoves.keys()].filter((method) => methodMoves.get(method).size);
	methodNames.sort(
		(a, b) =>
			methodOrderIndex(a) - methodOrderIndex(b) ||
			humanize(a).localeCompare(humanize(b))
	);

	const tables = methodNames.map((methodName) => {
		const rows = [];
		for (const [moveName, detail] of methodMoves.get(methodName)) {
			const move = moveByName.get(moveName);
			if (!move) continue;
			rows.push(makeRow(methodName, detail, move));
		}
		sortRows(rows, methodName === 'level-up');
		return {
			method: methodName,
			caption: humanize(methodName),
			hasLevel: methodName === 'level-up',
			rows
		};
	});

	return {
		title: `${displayName} – Pokédex`,
		pokemon: {
			id: species.id,
			name: species.name,
			displayName,
			genus,
			flavorText,
			types,
			height: (pokemon.height / 10).toFixed(1),
			weight: (pokemon.weight / 10).toFixed(1),
			artwork:
				pokemon.sprites?.other?.['official-artwork']?.front_default ??
				pokemon.sprites?.front_default ??
				''
		},
		stats,
		total,
		abilities,
		evolution: evolutionChain?.chain ? chainNode(evolutionChain.chain) : null,
		moves: {
			games: groupRecords.map((group) => ({
				name: group.name,
				display: humanize(group.name)
			})),
			selectedGame,
			tables
		}
	};
}
