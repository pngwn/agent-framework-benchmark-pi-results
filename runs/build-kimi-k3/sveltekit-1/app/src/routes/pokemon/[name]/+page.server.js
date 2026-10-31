import { error } from '@sveltejs/kit';
import { api, getIndex } from '#lib/server/api.js';
import { collapseWhitespace, englishName, humanize, idFromUrl } from '#lib/format.js';

const STAT_LABELS = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

// Learn methods with a fixed position; any others follow alphabetically.
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function latestEnglishFlavor(entries) {
	const english = entries.filter((e) => e.language?.name === 'en');
	return english.length ? collapseWhitespace(english.at(-1).flavor_text) : '';
}

export async function load({ params, url }) {
	const index = await getIndex();
	const species = await api(`/pokemon-species/${encodeURIComponent(params.name)}/`);
	if (!species) error(404, 'Not found');

	const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
	const pokemon = variety ? await api(`/pokemon/${idFromUrl(variety.pokemon.url)}/`) : null;
	if (!pokemon) error(404, 'Not found');

	const chainId = species.evolution_chain ? idFromUrl(species.evolution_chain.url) : null;
	const chainRecord = chainId != null ? await api(`/evolution-chain/${chainId}/`) : null;

	const toNode = (link) => ({
		name: link.species.name,
		human: humanize(link.species.name),
		children: link.evolves_to.map(toNode)
	});
	const evolution = chainRecord ? toNode(chainRecord.chain) : null;

	// Version groups in which this Pokémon learns moves, ordered by `order`.
	const versionGroupNames = new Set();
	for (const move of pokemon.moves) {
		for (const detail of move.version_group_details) {
			versionGroupNames.add(detail.version_group.name);
		}
	}
	const versionGroups = (
		await Promise.all([...versionGroupNames].map((n) => api(`/version-group/${encodeURIComponent(n)}/`)))
	)
		.filter(Boolean)
		.sort((a, b) => a.order - b.order)
		.map((g) => ({ name: g.name, human: humanize(g.name) }));

	const requestedGame = url.searchParams.get('game');
	const selectedGame = versionGroups.some((g) => g.name === requestedGame)
		? requestedGame
		: (versionGroups.at(-1)?.name ?? null);

	// Moves for the selected version group, grouped by learn method. A move learned
	// at several levels gets one row, at the lowest level.
	const byMethod = new Map();
	for (const move of pokemon.moves) {
		for (const detail of move.version_group_details) {
			if (detail.version_group.name !== selectedGame) continue;
			const method = detail.move_learn_method.name;
			if (!byMethod.has(method)) byMethod.set(method, new Map());
			const moves = byMethod.get(method);
			const existing = moves.get(move.move.name);
			if (!existing || detail.level_learned_at < existing.level) {
				moves.set(move.move.name, { name: move.move.name, level: detail.level_learned_at });
			}
		}
	}

	const moveNames = [...new Set([...byMethod.values()].flatMap((m) => [...m.keys()]))];
	const moveRecords = new Map(
		await Promise.all(
			moveNames.map(async (n) => [n, await api(`/move/${encodeURIComponent(n)}/`)])
		)
	);

	const methods = [...byMethod.entries()]
		.map(([method, moves]) => {
			const rows = [...moves.values()].map(({ name, level }) => {
				const record = moveRecords.get(name);
				return {
					move: name,
					moveEn: (record && englishName(record.names)) || humanize(name),
					type: record?.type?.name ?? '',
					typeEn: index.typeEn.get(record?.type?.name) ?? humanize(record?.type?.name ?? ''),
					category: record?.damage_class?.name ? humanize(record.damage_class.name) : '—',
					power: record?.power ?? null,
					accuracy: record?.accuracy ?? null,
					pp: record?.pp ?? null,
					level
				};
			});
			rows.sort((a, b) =>
				method === 'level-up'
					? a.level - b.level || a.moveEn.localeCompare(b.moveEn)
					: a.moveEn.localeCompare(b.moveEn)
			);
			return { method, label: humanize(method), rows };
		})
		.sort((a, b) => {
			const ai = METHOD_ORDER.indexOf(a.method);
			const bi = METHOD_ORDER.indexOf(b.method);
			if (ai !== -1 || bi !== -1) return (ai === -1 ? METHOD_ORDER.length : ai) - (bi === -1 ? METHOD_ORDER.length : bi);
			return a.label.localeCompare(b.label);
		});

	const stats = pokemon.stats.map((s) => ({
		label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
		value: s.base_stat
	}));

	return {
		name: englishName(species.names) ?? humanize(species.name),
		id: species.id,
		genus: species.genera.find((g) => g.language?.name === 'en')?.genus ?? '',
		types: pokemon.types
			.slice()
			.sort((a, b) => a.slot - b.slot)
			.map((t) => ({
				name: t.type.name,
				en: index.typeEn.get(t.type.name) ?? humanize(t.type.name)
			})),
		artwork:
			pokemon.sprites?.other?.['official-artwork']?.front_default ??
			pokemon.sprites?.front_default ??
			null,
		height: (pokemon.height / 10).toFixed(1),
		weight: (pokemon.weight / 10).toFixed(1),
		flavor: latestEnglishFlavor(species.flavor_text_entries),
		stats,
		total: stats.reduce((sum, s) => sum + s.value, 0),
		abilities: pokemon.abilities
			.slice()
			.sort((a, b) => a.slot - b.slot)
			.map((a) => ({ name: a.ability.name, human: humanize(a.ability.name), hidden: a.is_hidden })),
		evolution,
		versionGroups,
		selectedGame,
		methods
	};
}
