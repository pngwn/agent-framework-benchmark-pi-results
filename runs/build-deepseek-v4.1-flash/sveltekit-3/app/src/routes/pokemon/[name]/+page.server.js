import { error } from '@sveltejs/kit';
import {
	artworkUrl,
	getByUrl,
	getMovesByNames,
	getResource,
	getTypeIndex,
	getVersionGroups
} from '#lib/server/api.js';
import {
	damageCategory,
	displayValue,
	englishName,
	humanize,
	latestFlavorText,
	measurement,
	statLabel
} from '#lib/format.js';

const METHOD_ORDER = new Map([
	['level-up', 0],
	['machine', 1],
	['egg', 2],
	['tutor', 3]
]);

function methodRank(name) {
	return METHOD_ORDER.has(name) ? METHOD_ORDER.get(name) : 4;
}

function evolutionNode(entry) {
	const name = entry.species?.name ?? entry.name ?? '';
	return {
		name,
		displayName: humanize(name),
		children: (entry.evolves_to ?? entry.children ?? []).map(evolutionNode)
	};
}

export async function load({ params, url }) {
	const [species, typeIndex, versionGroups] = await Promise.all([
		getResource('pokemon-species', params.name),
		getTypeIndex(),
		getVersionGroups()
	]);
	if (!species) throw error(404, 'Not found');

	const pokemon = await getResource('pokemon', species.id);
	if (!pokemon) throw error(404, 'Not found');

	const chainPromise = species.evolution_chain?.url
		? getByUrl(species.evolution_chain.url)
		: Promise.resolve(null);

	const label = englishName(species.names, species.name);
	const genus =
		species.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? '';

	const types = (pokemon.types ?? [])
		.slice()
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({
			name: entry.type.name,
			label: typeIndex.byName.get(entry.type.name)?.label ?? humanize(entry.type.name)
		}));

	const stats = (pokemon.stats ?? []).map((entry) => ({
		name: entry.stat.name,
		label: statLabel(entry.stat.name),
		value: entry.base_stat
	}));
	const total = stats.reduce((sum, stat) => sum + stat.value, 0);

	const abilities = (pokemon.abilities ?? [])
		.slice()
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({
			name: entry.ability.name,
			label: humanize(entry.ability.name),
			hidden: entry.is_hidden
		}));

	const artwork =
		artworkUrl(pokemon.sprites?.other?.['official-artwork']?.front_default) ??
		artworkUrl(pokemon.sprites?.front_default);

	const chainData = await chainPromise;
	const evolution = chainData?.chain ? evolutionNode(chainData.chain) : null;

	const availableGroupNames = new Set();
	const moveEntries = [];
	for (const moveEntry of pokemon.moves ?? []) {
		for (const detail of moveEntry.version_group_details ?? []) {
			const groupName = detail.version_group?.name;
			if (!groupName) continue;
			availableGroupNames.add(groupName);
			moveEntries.push({
				moveName: moveEntry.move.name,
				groupName,
				method: detail.move_learn_method?.name ?? 'other',
				level: detail.level_learned_at ?? 0
			});
		}
	}

	const games = versionGroups.filter((group) => availableGroupNames.has(group.name));
	const requestedGame = url.searchParams.get('game');
	const selectedGame =
		games.find((game) => game.name === requestedGame) ??
		games[games.length - 1] ??
		null;

	const methods = [];
	if (selectedGame) {
		const selectedEntries = moveEntries.filter(
			(entry) => entry.groupName === selectedGame.name
		);
		const moveData = await getMovesByNames(
			selectedEntries.map((entry) => entry.moveName)
		);
		const grouped = new Map();
		for (const entry of selectedEntries) {
			const method = entry.method ?? 'other';
			const move = moveData.get(entry.moveName);
			if (!move) continue;
			const type = typeIndex.byName.get(move.type?.name);
			const row = {
				level: displayValue(entry.level),
				levelValue: entry.level,
				moveName: move.name,
				moveLabel: englishName(move.names, move.name),
				moveSort: englishName(move.names, move.name).toLowerCase(),
				typeName: type?.name ?? move.type?.name,
				typeLabel: type?.label ?? humanize(move.type?.name),
				typeSort: (type?.label ?? humanize(move.type?.name)).toLowerCase(),
				category: damageCategory(move.damage_class?.name),
				categorySort: damageCategory(move.damage_class?.name).toLowerCase(),
				power: displayValue(move.power),
				powerValue: move.power ?? null,
				accuracy: displayValue(move.accuracy),
				accuracyValue: move.accuracy ?? null,
				pp: displayValue(move.pp),
				ppValue: move.pp ?? null
			};
			const rows = grouped.get(method) ?? [];
			if (!rows.some((item) => item.moveName === row.moveName)) rows.push(row);
			grouped.set(method, rows);
		}
		const methodNames = [...grouped.keys()].sort((a, b) => {
			const rank = methodRank(a) - methodRank(b);
			if (rank !== 0) return rank;
			return humanize(a).localeCompare(humanize(b));
		});
		for (const method of methodNames) {
			if (!grouped.get(method).length) continue;
			methods.push({
				name: method,
				label: humanize(method),
				showLevel: method === 'level-up',
				rows: grouped.get(method)
			});
		}
	}

	return {
		name: species.name,
		label,
		dex: species.id,
		genus,
		types,
		artwork,
		height: measurement(pokemon.height, 'm'),
		weight: measurement(pokemon.weight, 'kg'),
		flavor: latestFlavorText(species.flavor_text_entries),
		stats,
		total,
		abilities,
		evolution,
		games,
		game: selectedGame?.name ?? '',
		methods
	};
}
