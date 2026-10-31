import { error } from '@sveltejs/kit';
import { api } from '../../../lib/server/api.js';
import {
	dexNumber,
	englishName,
	humanize,
	idFromUrl,
	latestFlavor,
	STAT_LABELS
} from '../../../lib/utils.js';

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function evolutionNode(chainNode) {
	return {
		name: chainNode.species.name,
		label: humanize(chainNode.species.name),
		children: chainNode.evolves_to.map(evolutionNode)
	};
}

export async function load({ params, url }) {
	const species = await api(`/pokemon-species/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!species) error(404, `No such Pokémon: ${params.name}`);

	const defaultVariety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
	const pokemon = await api(defaultVariety.pokemon.url);
	if (!pokemon) error(404, `No such Pokémon: ${params.name}`);

	const name = englishName(species);
	const genus = species.genera?.find((g) => g.language.name === 'en')?.genus ?? null;
	const flavor = latestFlavor(species.flavor_text_entries);

	const types = [...pokemon.types]
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({ name: entry.type.name, label: humanize(entry.type.name) }));

	const stats = pokemon.stats.map((entry) => ({
		label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
		value: entry.base_stat
	}));

	const abilities = [...pokemon.abilities]
		.sort((a, b) => a.slot - b.slot)
		.map((entry) => ({
			name: entry.ability.name,
			label: humanize(entry.ability.name),
			hidden: entry.is_hidden
		}));

	// Evolution chain
	const chain = await api(species.evolution_chain.url);
	const evolution = chain ? evolutionNode(chain.chain) : null;

	// Version groups in which this Pokémon learns moves, ordered by `order`.
	const versionGroupNames = [
		...new Set(
			pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))
		)
	];
	const versionGroupRecords = await Promise.all(
		versionGroupNames.map((n) => api(`/version-group/${n}`))
	);
	const games = versionGroupRecords
		.filter(Boolean)
		.sort((a, b) => a.order - b.order)
		.map((v) => ({ name: v.name, label: humanize(v.name) }));

	const gameParam = url.searchParams.get('game');
	const selectedGame = games.some((g) => g.name === gameParam)
		? gameParam
		: (games[games.length - 1]?.name ?? null);

	// Moves for the selected version group, grouped by learn method.
	const learnRows = [];
	const seen = new Set();
	for (const m of pokemon.moves) {
		for (const d of m.version_group_details) {
			if (d.version_group.name !== selectedGame) continue;
			const key = `${d.move_learn_method.name}|${m.move.name}|${d.level_learned_at}`;
			if (seen.has(key)) continue;
			seen.add(key);
			learnRows.push({
				method: d.move_learn_method.name,
				move: m.move.name,
				level: d.level_learned_at
			});
		}
	}

	const moveNames = [...new Set(learnRows.map((r) => r.move))];
	const moveRecords = new Map(
		await Promise.all(moveNames.map(async (n) => [n, await api(`/move/${n}`)]))
	);

	const byMethod = new Map();
	for (const r of learnRows) {
		const record = moveRecords.get(r.move);
		const row = {
			method: r.method,
			level: r.level,
			move: r.move,
			moveLabel: record ? englishName(record) : humanize(r.move),
			type: record?.type?.name ?? null,
			typeLabel: record?.type?.name ? humanize(record.type.name) : null,
			category: record?.damage_class?.name ? humanize(record.damage_class.name) : '—',
			power: record?.power ?? null,
			accuracy: record?.accuracy ?? null,
			pp: record?.pp ?? null
		};
		if (!byMethod.has(r.method)) byMethod.set(r.method, []);
		byMethod.get(r.method).push(row);
	}

	const methods = [...byMethod.keys()].sort((a, b) => {
		const ia = METHOD_ORDER.indexOf(a);
		const ib = METHOD_ORDER.indexOf(b);
		if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
		return humanize(a).localeCompare(humanize(b));
	});

	const tables = methods.map((method) => ({
		method,
		label: humanize(method),
		rows: byMethod.get(method)
	}));

	return {
		name,
		speciesName: species.name,
		dex: dexNumber(species.id),
		genus,
		flavor,
		types,
		artwork:
			pokemon.sprites?.other?.['official-artwork']?.front_default ??
			pokemon.sprites?.front_default ??
			null,
		height: `${(pokemon.height / 10).toFixed(1)} m`,
		weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
		stats,
		total: stats.reduce((sum, s) => sum + s.value, 0),
		abilities,
		evolution,
		games,
		selectedGame,
		tables
	};
}
