import { defineRoute } from '@gracile/gracile/route';
import { html, nothing } from 'lit';

import { document } from '../../document.js';
import { api, idFromUrl } from '../../lib/api.js';
import { notFoundTemplate, section, typeBadge } from '../../lib/components.js';
import {
	MISSING,
	dexNumber,
	englishName,
	humanize,
	latestFlavorText,
	orMissing,
	pageTitle,
} from '../../lib/format.js';

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};

/** Method display order: Level Up, Machine, Egg, Tutor, then the rest. */
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

type MoveRow = {
	moveName: string;
	moveLabel: string;
	typeName: string;
	category: string;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	level: number;
};

type MethodTable = { method: string; label: string; rows: MoveRow[] };

function evolutionChain(chainNode: any): unknown {
	const children = chainNode.evolves_to ?? [];
	return html`<li>
		<a href="/pokemon/${chainNode.species.name}"
			>${humanize(chainNode.species.name)}</a
		>
		${children.length > 0
			? html`<ul>
					${children.map((child: unknown) => evolutionChain(child))}
				</ul>`
			: nothing}
	</li>`;
}

function sortableHeader(label: string) {
	return html`<th scope="col"><button type="button">${label}</button></th>`;
}

function numberCell(value: number | null) {
	return value === null
		? html`<td data-missing data-v="">${MISSING}</td>`
		: html`<td data-n data-v="${value}">${value}</td>`;
}

function movesTable(table: MethodTable) {
	const isLevelUp = table.method === 'level-up';
	return html`<table class="moves-table">
		<caption>
			${table.label}
		</caption>
		<thead>
			<tr>
				${isLevelUp ? sortableHeader('Level') : nothing} ${sortableHeader('Move')}
				${sortableHeader('Type')} ${sortableHeader('Category')}
				${sortableHeader('Power')} ${sortableHeader('Accuracy')}
				${sortableHeader('PP')}
			</tr>
		</thead>
		<tbody>
			${table.rows.map(
				(row) => html`<tr>
					${isLevelUp
						? html`<td data-n data-v="${row.level}">${row.level}</td>`
						: nothing}
					<td data-v="${row.moveLabel.toLowerCase()}">
						<a href="/moves/${row.moveName}">${row.moveLabel}</a>
					</td>
					<td data-v="${row.typeName}">${typeBadge(row.typeName, true)}</td>
					<td data-v="${row.category.toLowerCase()}">${row.category}</td>
					${numberCell(row.power)} ${numberCell(row.accuracy)}
					${numberCell(row.pp)}
				</tr>`,
			)}
		</tbody>
	</table>`;
}

export default defineRoute({
	handler: {
		GET: async ({ params, url, responseInit }) => {
			const name = params.name ?? '';
			// Build-time stub render (server mode renders at request time).
			if (url.hostname === 'gracile-static' || !name)
				return { notFound: true as const };
			let species: any;
			try {
				species = await api(`/pokemon-species/${encodeURIComponent(name)}/`);
			} catch {
				responseInit.status = 404;
				return { notFound: true as const };
			}

			const defaultVariety =
				species.varieties?.find((v: { is_default: boolean }) => v.is_default) ??
				species.varieties?.[0];
			const pokemon: any = await api(defaultVariety.pokemon.url);
			const chain: any = await api(species.evolution_chain.url);

			// Version groups in which this Pokémon learns moves, by order.
			const versionGroupNames = new Set<string>();
			for (const move of pokemon.moves ?? [])
				for (const detail of move.version_group_details ?? [])
					versionGroupNames.add(detail.version_group.name);
			const versionGroups: any[] = (
				await Promise.all(
					[...versionGroupNames].map((n) =>
						api(`/version-group/${encodeURIComponent(n)}/`).catch(() => null),
					),
				)
			)
				.filter(Boolean)
				.sort((a, b) => a.order - b.order);

			const requestedGame = url.searchParams.get('game');
			const selectedGame =
				versionGroups.find((g) => g.name === requestedGame) ??
				versionGroups.at(-1) ??
				null;

			// Moves for the selected version group, grouped by learn method.
			let tables: MethodTable[] = [];
			if (selectedGame) {
				const entries: Array<{
					moveName: string;
					method: string;
					level: number;
				}> = [];
				for (const move of pokemon.moves ?? []) {
					for (const detail of move.version_group_details ?? []) {
						if (detail.version_group.name !== selectedGame.name) continue;
						entries.push({
							moveName: move.move.name,
							method: detail.move_learn_method.name,
							level: detail.level_learned_at,
						});
					}
				}
				const moveNames = [...new Set(entries.map((e) => e.moveName))];
				const moveRecords = new Map<string, any>(
					await Promise.all(
						moveNames.map(
							async (n) =>
								[n, await api(`/move/${encodeURIComponent(n)}/`).catch(() => null)] as const,
						),
					),
				);

				const byMethod = new Map<string, MoveRow[]>();
				for (const entry of entries) {
					const record = moveRecords.get(entry.moveName);
					if (!record) continue;
					const row: MoveRow = {
						moveName: entry.moveName,
						moveLabel: englishName(record.names, record.name),
						typeName: record.type?.name ?? 'unknown',
						category: humanize(record.damage_class?.name ?? 'unknown'),
						power: record.power ?? null,
						accuracy: record.accuracy ?? null,
						pp: record.pp ?? null,
						level: entry.level,
					};
					const rows = byMethod.get(entry.method) ?? [];
					rows.push(row);
					byMethod.set(entry.method, rows);
				}

				tables = [...byMethod.entries()]
					.map(([method, rows]): MethodTable => {
						const sorted =
							method === 'level-up'
								? rows.sort(
										(a, b) =>
											a.level - b.level ||
											a.moveLabel.localeCompare(b.moveLabel),
									)
								: rows.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
						return { method, label: humanize(method), rows: sorted };
					})
					.sort((a, b) => {
						const ai = METHOD_ORDER.indexOf(a.method);
						const bi = METHOD_ORDER.indexOf(b.method);
						if (ai !== -1 || bi !== -1)
							return (ai === -1 ? METHOD_ORDER.length : ai) -
								(bi === -1 ? METHOD_ORDER.length : bi);
						return a.label.localeCompare(b.label);
					});
			}

			return {
				notFound: false as const,
				species,
				pokemon,
				chain,
				versionGroups,
				selectedGame,
				tables,
			};
		},
	},

	document: (context) => {
		const props = context.props.GET as any;
		const h1 = props?.notFound
			? 'Not found'
			: englishName(props?.species?.names, props?.species?.name ?? '');
		return document({ ...context, title: pageTitle(h1) });
	},

	template: (context) => {
		const props = context.props.GET as any;
		if (props.notFound) return notFoundTemplate();

		const { species, pokemon, chain, versionGroups, selectedGame, tables } = props;
		const displayName = englishName(species.names, species.name);
		const genus =
			species.genera?.find(
				(g: { language: { name: string } }) => g.language.name === 'en',
			)?.genus ?? '';
		const flavor = latestFlavorText(species.flavor_text_entries);
		const artwork =
			pokemon.sprites?.other?.['official-artwork']?.front_default ?? null;
		const types = (pokemon.types ?? [])
			.slice()
			.sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot);
		const stats: Array<{ base_stat: number; stat: { name: string } }> =
			pokemon.stats ?? [];
		const total = stats.reduce((sum, s) => sum + s.base_stat, 0);

		return html`
			<main class="container">
				<div class="pokemon-hero">
					<div class="artwork-card">
						${artwork
							? html`<img
									src="${artwork}"
									alt="${displayName}"
									width="288"
									height="288"
								/>`
							: ''}
					</div>
					<div class="pokemon-summary">
						<p class="dex-number">${dexNumber(species.id)}</p>
						<h1>${displayName}</h1>
						<p class="genus">${genus}</p>
						<p class="type-list">
							${types.map((t: { type: { name: string } }) =>
								typeBadge(t.type.name, true),
							)}
						</p>
						<dl class="measurements">
							<div>
								<dt>Height</dt>
								<dd>${(pokemon.height / 10).toFixed(1)} m</dd>
							</div>
							<div>
								<dt>Weight</dt>
								<dd>${(pokemon.weight / 10).toFixed(1)} kg</dd>
							</div>
						</dl>
						${flavor ? html`<p class="flavor-text">${flavor}</p>` : nothing}
					</div>
				</div>
				${section(
					'stats',
					'Base stats',
					html`<table class="stats-table">
						<tbody>
							${stats.map(
								(s) => html`<tr>
									<th scope="row">${STAT_LABELS[s.stat.name] ?? humanize(s.stat.name)}</th>
									<td class="stat-value">${s.base_stat}</td>
									<td class="stat-bar-cell">
										<span
											class="stat-bar"
											aria-hidden="true"
											style="width: ${Math.min(100, (s.base_stat / 255) * 100)}%"
										></span>
									</td>
								</tr>`,
							)}
							<tr class="stat-total">
								<th scope="row">Total</th>
								<td class="stat-value">${total}</td>
								<td class="stat-bar-cell">
									<span
										class="stat-bar"
										aria-hidden="true"
										style="width: ${Math.min(100, (total / (255 * 6)) * 100)}%"
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
						${(pokemon.abilities ?? [])
							.slice()
							.sort(
								(a: { slot: number }, b: { slot: number }) => a.slot - b.slot,
							)
							.map(
								(a: {
									is_hidden: boolean;
									ability: { name: string };
								}) => html`<li>
									<a href="/abilities/${a.ability.name}"
										>${humanize(a.ability.name)}</a
									>${a.is_hidden ? html` (hidden)` : nothing}
								</li>`,
							)}
					</ul>`,
				)}
				${section(
					'evolution',
					'Evolution',
					html`<ul class="evolution-tree">
						${evolutionChain(chain.chain)}
					</ul>`,
				)}
				${section(
					'moves',
					'Moves',
					html`
						${versionGroups.length > 0
							? html`<div class="field game-field">
									<label for="game">Game</label>
									<select id="game" name="game">
										${versionGroups.map(
											(g: { name: string }) => html`<option
												value="${g.name}"
												?selected=${g.name === selectedGame?.name}
											>
												${humanize(g.name)}
											</option>`,
										)}
									</select>
								</div>`
							: nothing}
						${tables.map((table) => movesTable(table))}
					`,
					'moves',
				)}
			</main>
		`;
	},
});
