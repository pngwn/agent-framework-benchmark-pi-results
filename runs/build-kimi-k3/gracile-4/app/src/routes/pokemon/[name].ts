import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { api, mapLimit } from '../../lib/api.js';
import { getTypes, type TypeInfo } from '../../lib/data.js';
import {
	EM_DASH,
	dexNumber,
	englishName,
	englishShortEffect,
	humanize,
	latestEnglishFlavorText,
	valueOrDash,
	type EffectEntry,
	type FlavorTextEntry,
	type LocalizedName,
	type NamedReference,
} from '../../lib/util.js';
import {
	notFoundMain,
	section,
	typeBadge,
} from '../../lib/views.js';

interface SpeciesRecord {
	id: number;
	name: string;
	names: LocalizedName[];
	genera: { genus: string; language: NamedReference }[];
	flavor_text_entries: FlavorTextEntry[];
	evolution_chain: { url: string };
	varieties: { is_default: boolean; pokemon: NamedReference }[];
}

interface PokemonRecord {
	id: number;
	name: string;
	height: number;
	weight: number;
	types: { slot: number; type: NamedReference }[];
	abilities: { is_hidden: boolean; slot: number; ability: NamedReference }[];
	stats: { base_stat: number; stat: NamedReference }[];
	sprites: {
		front_default: string | null;
		other?: Record<string, { front_default?: string | null } | undefined>;
	};
	moves: {
		move: NamedReference;
		version_group_details: {
			level_learned_at: number;
			version_group: NamedReference;
			move_learn_method: NamedReference;
		}[];
	}[];
}

interface MoveRecord {
	id: number;
	name: string;
	names: LocalizedName[];
	type: NamedReference;
	damage_class: NamedReference | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

interface EvolutionChainRecord {
	chain: {
		species: NamedReference;
		evolves_to: EvolutionChainRecord['chain'][];
	};
}

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

interface MoveRow {
	level: number;
	move: string;
	moveName: string;
	type: TypeInfo;
	category: string;
	power: string;
	accuracy: string;
	pp: string;
}

interface MoveTable {
	method: string;
	human: string;
	hasLevel: boolean;
	rows: MoveRow[];
}

interface EvoNode {
	name: string;
	human: string;
	evolvesTo: EvoNode[];
}

interface PokemonProps {
	kind: 'ok' | 'notfound' | 'build';
	title?: string;
	h1?: string;
	dex?: string;
	genus?: string;
	types?: TypeInfo[];
	artwork?: string | null;
	artworkAlt?: string;
	height?: string;
	weight?: string;
	flavor?: string | null;
	stats?: { label: string; value: number }[];
	total?: number;
	abilities?: { name: string; human: string; hidden: boolean }[];
	evolution?: EvoNode;
	games?: { name: string; human: string }[];
	selectedGame?: string;
	tables?: MoveTable[];
}

function evoNodeTemplate(node: EvoNode): unknown {
	return html`<li>
		<a href="/pokemon/${node.name}">${node.human}</a>
		${node.evolvesTo.length > 0
			? html`<ul>
					${node.evolvesTo.map((child) => evoNodeTemplate(child))}
				</ul>`
			: null}
	</li>`;
}

function sortableHeader(
	label: string,
	type: 'num' | 'text',
	sorted: boolean,
) {
	return sorted
		? html`<th scope="col" data-sort-type=${type} aria-sort="ascending">
				<button type="button">${label}</button>
			</th>`
		: html`<th scope="col" data-sort-type=${type}>
				<button type="button">${label}</button>
			</th>`;
}

function moveTableTemplate(table: MoveTable): unknown {
	return html`<table class="moves-table">
		<caption>${table.human}</caption>
		<thead>
			<tr>
				${table.hasLevel ? sortableHeader('Level', 'num', true) : null}
				${sortableHeader('Move', 'text', !table.hasLevel)}
				${sortableHeader('Type', 'text', false)}
				${sortableHeader('Category', 'text', false)}
				${sortableHeader('Power', 'num', false)}
				${sortableHeader('Accuracy', 'num', false)}
				${sortableHeader('PP', 'num', false)}
			</tr>
		</thead>
		<tbody>
			${table.rows.map(
				(row) => html`<tr>
					${table.hasLevel ? html`<td>${row.level}</td>` : null}
					<td><a href="/moves/${row.move}">${row.moveName}</a></td>
					<td>${typeBadge(row.type, true)}</td>
					<td>${row.category}</td>
					<td>${row.power}</td>
					<td>${row.accuracy}</td>
					<td>${row.pp}</td>
				</tr>`,
			)}
		</tbody>
	</table>`;
}

export default defineRoute({
	handler: async (context): Promise<PokemonProps> => {
		if (context.url.hostname === 'gracile-static') return { kind: 'build' };

		const name = (context.params.name ?? '').toLowerCase();
		const species = await api<SpeciesRecord>(`/pokemon-species/${name}`);
		if (!species) {
			context.responseInit.status = 404;
			return { kind: 'notfound' };
		}

		const defaultVariety =
			species.varieties.find((v) => v.is_default) ?? species.varieties[0];
		const pokemon =
			(defaultVariety
				? await api<PokemonRecord>(`/pokemon/${defaultVariety.pokemon.name}`)
				: null) ?? (await api<PokemonRecord>(`/pokemon/${species.id}`));
		if (!pokemon) {
			context.responseInit.status = 404;
			return { kind: 'notfound' };
		}

		const displayName = englishName(species.names, species.name);

		const [types, chainRecord] = await Promise.all([
			getTypes(),
			api<EvolutionChainRecord>(species.evolution_chain.url),
		]);
		const typeByName = new Map(types.map((t) => [t.name, t]));
		const typeInfo = async (typeName: string): Promise<TypeInfo> => {
			const known = typeByName.get(typeName);
			if (known) return known;
			const record = await api<{ name: string; names: LocalizedName[] }>(
				`/type/${typeName}`,
			);
			return { name: typeName, en: englishName(record?.names, typeName) };
		};

		// ── Version groups (games) ─────────────────────────────────────
		const versionGroupNames = new Set<string>();
		for (const move of pokemon.moves ?? [])
			for (const detail of move.version_group_details ?? [])
				versionGroupNames.add(detail.version_group.name);

		const versionGroups = await mapLimit(
			[...versionGroupNames],
			16,
			async (vgName) => {
				const record = await api<{ name: string; order: number }>(
					`/version-group/${vgName}`,
				);
				return { name: vgName, order: record?.order ?? 0 };
			},
		);
		versionGroups.sort((a, b) => a.order - b.order);

		const requestedGame = context.url.searchParams.get('game') ?? '';
		const selectedGame = versionGroups.some((g) => g.name === requestedGame)
			? requestedGame
			: (versionGroups[versionGroups.length - 1]?.name ?? '');

		// ── Moves for the selected game ────────────────────────────────
		const learnEntries: { move: string; method: string; level: number }[] = [];
		for (const move of pokemon.moves ?? [])
			for (const detail of move.version_group_details ?? [])
				if (detail.version_group.name === selectedGame)
					learnEntries.push({
						move: move.move.name,
						method: detail.move_learn_method.name,
						level: detail.level_learned_at,
					});

		const uniqueMoveNames = [...new Set(learnEntries.map((e) => e.move))];
		const moveRecords = new Map<string, MoveRecord | null>();
		await mapLimit(uniqueMoveNames, 48, async (moveName) => {
			moveRecords.set(moveName, await api<MoveRecord>(`/move/${moveName}`));
		});

		const moveTypeNames = [
			...new Set(
				[...moveRecords.values()].map((m) => m?.type.name).filter(Boolean),
			),
		] as string[];
		const moveTypeInfos = new Map<string, TypeInfo>();
		await mapLimit(moveTypeNames, 8, async (typeName) => {
			moveTypeInfos.set(typeName, await typeInfo(typeName));
		});

		const rowsByMethod = new Map<string, MoveRow[]>();
		for (const entry of learnEntries) {
			const record = moveRecords.get(entry.move);
			if (!record) continue;
			const row: MoveRow = {
				level: entry.level,
				move: record.name,
				moveName: englishName(record.names, record.name),
				type: moveTypeInfos.get(record.type.name) ?? {
					name: record.type.name,
					en: humanize(record.type.name),
				},
				category: record.damage_class
					? humanize(record.damage_class.name)
					: EM_DASH,
				power: valueOrDash(record.power),
				accuracy: valueOrDash(record.accuracy),
				pp: valueOrDash(record.pp),
			};
			const rows = rowsByMethod.get(entry.method) ?? [];
			rows.push(row);
			rowsByMethod.set(entry.method, rows);
		}

		const methodNames = [...rowsByMethod.keys()].sort((a, b) => {
			const ia = METHOD_ORDER.indexOf(a);
			const ib = METHOD_ORDER.indexOf(b);
			if (ia !== -1 || ib !== -1)
				return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
			return humanize(a).localeCompare(humanize(b));
		});

		const tables: MoveTable[] = methodNames.map((method) => {
			const rows = rowsByMethod.get(method) ?? [];
			const hasLevel = method === 'level-up';
			rows.sort((a, b) => {
				if (hasLevel && a.level !== b.level) return a.level - b.level;
				return a.moveName.localeCompare(b.moveName);
			});
			return { method, human: humanize(method), hasLevel, rows };
		});

		// ── Evolution chain ────────────────────────────────────────────
		const toEvoNode = (
			chain: EvolutionChainRecord['chain'] | undefined,
		): EvoNode | null =>
			chain
				? {
						name: chain.species.name,
						human: humanize(chain.species.name),
						evolvesTo: (chain.evolves_to ?? [])
							.map((child) => toEvoNode(child))
							.filter((n): n is EvoNode => n !== null),
					}
				: null;

		// ── Summary ────────────────────────────────────────────────────
		const genus = species.genera?.find(
			(g) => g.language.name === 'en',
		)?.genus;

		const stats = (pokemon.stats ?? []).map((s) => ({
			label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
			value: s.base_stat,
		}));

		const artwork =
			pokemon.sprites.other?.['official-artwork']?.front_default ??
			pokemon.sprites.front_default;

		return {
			kind: 'ok',
			title: displayName,
			h1: displayName,
			dex: dexNumber(species.id),
			genus,
			types: await Promise.all(
				(pokemon.types ?? [])
					.slice()
					.sort((a, b) => a.slot - b.slot)
					.map((slot) => typeInfo(slot.type.name)),
			),
			artwork,
			artworkAlt: displayName,
			height: `${(pokemon.height / 10).toFixed(1)} m`,
			weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
			flavor: latestEnglishFlavorText(species.flavor_text_entries),
			stats,
			total: stats.reduce((sum, s) => sum + s.value, 0),
			abilities: (pokemon.abilities ?? [])
				.slice()
				.sort((a, b) => a.slot - b.slot)
				.map((a) => ({
					name: a.ability.name,
					human: humanize(a.ability.name),
					hidden: a.is_hidden,
				})),
			evolution: toEvoNode(chainRecord?.chain) ?? undefined,
			games: versionGroups.map((g) => ({
				name: g.name,
				human: humanize(g.name),
			})),
			selectedGame,
			tables,
		};
	},

	document: (context) => {
		const props = context.props as PokemonProps;
		return document({
			url: context.url,
			title: props.kind === 'ok' ? (props.title ?? null) : 'Not found',
		});
	},

	template: (context) => {
		const props = context.props as PokemonProps;
		if (props.kind !== 'ok') return notFoundMain();

		return html`
			<main class="content">
				<div class="pokemon-summary">
					${props.artwork
						? html`<div class="artwork surface">
								<img src=${props.artwork} alt=${props.artworkAlt ?? ''} />
							</div>`
						: null}
					<div class="summary-info">
						<p class="dex">${props.dex}</p>
						<h1>${props.h1}</h1>
						${props.genus ? html`<p class="genus">${props.genus}</p>` : null}
						<p class="summary-types">
							${(props.types ?? []).map((type) => typeBadge(type, true))}
						</p>
						<dl class="summary-measures">
							<div>
								<dt>Height</dt>
								<dd>${props.height}</dd>
							</div>
							<div>
								<dt>Weight</dt>
								<dd>${props.weight}</dd>
							</div>
						</dl>
						${props.flavor ? html`<p class="flavor">${props.flavor}</p>` : null}
					</div>
				</div>

				${section(
					'stats',
					'Base stats',
					html`<table class="stats-table">
						<tbody>
							${(props.stats ?? []).map(
								(stat) => html`<tr>
									<th scope="row">${stat.label}</th>
									<td class="stat-num">${stat.value}</td>
									<td class="stat-bar" aria-hidden="true">
										<span class="stat-track"
											><span
												class="stat-fill"
												style=${`width: ${Math.min(100, (stat.value / 255) * 100)}%`}
											></span
										></span>
									</td>
								</tr>`,
							)}
							<tr class="stat-total">
								<th scope="row">Total</th>
								<td class="stat-num">${props.total}</td>
								<td class="stat-bar" aria-hidden="true">
									<span class="stat-track"
										><span
											class="stat-fill"
											style=${`width: ${Math.min(100, ((props.total ?? 0) / (255 * (props.stats?.length || 1))) * 100)}%`}
										></span
									></span>
								</td>
							</tr>
						</tbody>
					</table>`,
				)}
				${section(
					'abilities',
					'Abilities',
					html`<ul class="abilities-list">
						${(props.abilities ?? []).map(
							(ability) => html`<li>
								<a href="/abilities/${ability.name}">${ability.human}</a>${ability.hidden
									? ' (hidden)'
									: ''}
							</li>`,
						)}
					</ul>`,
				)}
				${section(
					'evolution',
					'Evolution',
					props.evolution
						? html`<ul class="evo-tree">
								${evoNodeTemplate(props.evolution)}
							</ul>`
						: html`<p>${EM_DASH}</p>`,
				)}
				${section(
					'moves',
					'Moves',
					html`
						<div class="field game-field">
							<label for="game-select">Game</label>
							<select id="game-select" name="game">
								${(props.games ?? []).map((game) =>
									game.name === props.selectedGame
										? html`<option value=${game.name} selected>
												${game.human}
											</option>`
										: html`<option value=${game.name}>${game.human}</option>`,
								)}
							</select>
						</div>
						<div class="moves-tables">
							${(props.tables ?? []).map((table) => moveTableTemplate(table))}
						</div>
					`,
				)}
			</main>
		`;
	},
});
