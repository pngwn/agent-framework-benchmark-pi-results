import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { notFound, section, typeLink } from '../../components/partials.js';
import { document } from '../../document.js';
import { isBuildRender } from '../../lib/api.js';
import {
	type ChainLink,
	type MoveTable,
	getDefaultPokemon,
	getEvolutionChain,
	getGames,
	getMoveTables,
	getSpecies,
	getTypeLabels,
} from '../../lib/data.js';
import {
	DASH,
	dexNumber,
	englishName,
	humanize,
	latestEnglishFlavor,
	orDash,
} from '../../lib/format.js';
import { TEAM_MAX, teamFromCookieHeader } from '../../lib/team.js';

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};
const MAX_STAT = 255;

async function load(name: string, url: URL, team: string[]) {
	const species = await getSpecies(name);
	if (!species || species.name !== name.toLowerCase()) return null;

	const [pokemon, chain, typeLabels] = await Promise.all([
		getDefaultPokemon(species),
		getEvolutionChain(species),
		getTypeLabels(),
	]);

	const games = await getGames(pokemon);
	const requested = url.searchParams.get('game');
	const game =
		games.find((g) => g.name === requested) ?? games.at(-1) ?? null;
	const moveTables = game ? await getMoveTables(pokemon, game.name) : [];

	const stats = pokemon.stats.map((s) => ({
		label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
		value: s.base_stat,
	}));

	return {
		id: species.id,
		name: species.name,
		title: englishName(species),
		genus:
			species.genera.find((g) => g.language.name === 'en')?.genus ?? null,
		types: [...pokemon.types]
			.sort((a, b) => a.slot - b.slot)
			.map((t) => ({
				name: t.type.name,
				label: typeLabels.get(t.type.name) ?? humanize(t.type.name),
			})),
		artwork:
			pokemon.sprites.other?.['official-artwork']?.front_default ??
			pokemon.sprites.front_default,
		height: (pokemon.height / 10).toFixed(1),
		weight: (pokemon.weight / 10).toFixed(1),
		flavor: latestEnglishFlavor(species.flavor_text_entries),
		stats,
		total: stats.reduce((sum, s) => sum + s.value, 0),
		abilities: [...pokemon.abilities]
			.sort((a, b) => a.slot - b.slot)
			.map((a) => ({
				name: a.ability.name,
				label: humanize(a.ability.name),
				hidden: a.is_hidden,
			})),
		chain,
		games,
		game: game?.name ?? null,
		moveTables,
		onTeam: team.includes(species.name),
		teamFull: team.length >= TEAM_MAX,
	};
}

const bar = (value: number, max: number) =>
	html`<span class="stat-bar"
		><span style=${`width: ${Math.min(100, (value / max) * 100).toFixed(1)}%`}></span
	></span>`;

const evolutionList = (links: ChainLink[]): unknown =>
	html`<ul>
		${links.map(
			(link) => html`<li>
				<a href=${`/pokemon/${link.species.name}`}>${humanize(link.species.name)}</a>
				${link.evolves_to.length ? evolutionList(link.evolves_to) : null}
			</li>`,
		)}
	</ul>`;

type Column = { key: string; label: string; numeric?: boolean };

const COLUMNS: Column[] = [
	{ key: 'level', label: 'Level', numeric: true },
	{ key: 'move', label: 'Move' },
	{ key: 'type', label: 'Type' },
	{ key: 'category', label: 'Category' },
	{ key: 'power', label: 'Power', numeric: true },
	{ key: 'accuracy', label: 'Accuracy', numeric: true },
	{ key: 'pp', label: 'PP', numeric: true },
];

const num = (value: number | null) => (value === null ? '' : String(value));

export const moveTables = (tables: MoveTable[]) =>
	tables.length
		? tables.map((table) => {
				const columns = COLUMNS.filter(
					(c) => c.key !== 'level' || table.method === 'level-up',
				);
				return html`
					<sortable-table class="table-wrap">
						<table class="data-table moves-table">
							<caption>${table.label}</caption>
							<thead>
								<tr>
									${columns.map(
										(c) =>
											html`<th scope="col" data-numeric=${c.numeric ? 'true' : 'false'}>
												<button type="button">${c.label}<span class="sort-icon" aria-hidden="true"></span></button>
											</th>`,
									)}
								</tr>
							</thead>
							<tbody>
								${table.rows.map(
									(row) => html`<tr>
										${table.method === 'level-up'
											? html`<td data-sort=${num(row.level)}>${orDash(row.level)}</td>`
											: null}
										<td data-sort=${row.label}>
											<a href=${`/moves/${row.name}`}>${row.label}</a>
										</td>
										<td data-sort=${row.type.label}>${typeLink(row.type)}</td>
										<td data-sort=${row.category ?? ''}>${orDash(row.category)}</td>
										<td data-sort=${num(row.power)}>${orDash(row.power)}</td>
										<td data-sort=${num(row.accuracy)}>${orDash(row.accuracy)}</td>
										<td data-sort=${num(row.pp)}>${orDash(row.pp)}</td>
									</tr>`,
								)}
							</tbody>
						</table>
					</sortable-table>
				`;
			})
		: html`<p class="muted">No moves.</p>`;

export default defineRoute({
	handler: async ({ params, request, url, responseInit }) => {
		if (isBuildRender(url)) return { data: null };
		const team = teamFromCookieHeader(request.headers.get('cookie'));
		const data = await load(params.name ?? '', url, team);
		if (!data) responseInit.status = 404;
		return { data };
	},

	document: ({ props }) => document({ title: props.data?.title ?? 'Not found' }),

	template: ({ props: { data: p } }) => {
		if (!p) return notFound();
		return html`
			<div class="pokemon-hero">
				<div class="pokemon-hero__art">
					${p.artwork
						? html`<img src=${p.artwork} alt=${p.title} width="288" height="288" />`
						: null}
				</div>
				<div class="pokemon-hero__info">
					<p class="dex">${dexNumber(p.id)}</p>
					<h1 class="page-title pokemon-hero__name">${p.title}</h1>
					${p.genus ? html`<p class="genus">${p.genus}</p>` : null}
					<p class="type-list">${p.types.map(typeLink)}</p>
					<dl class="facts">
						<div><dt>Height</dt><dd>${p.height} m</dd></div>
						<div><dt>Weight</dt><dd>${p.weight} kg</dd></div>
					</dl>
					<p class="flavor">${p.flavor ?? DASH}</p>
					<team-toggle class="team-toggle" data-name=${p.name}>
						<button
							type="button"
							class="team-toggle__button"
							?disabled=${p.teamFull && !p.onTeam}
						>
							${p.onTeam ? 'Remove from team' : 'Add to team'}
						</button>
						${p.teamFull && !p.onTeam
							? html`<span class="team-toggle__note" data-team-full>Team is full</span>`
							: null}
					</team-toggle>
				</div>
			</div>

			${section(
				'stats',
				'Base stats',
				html`<table class="stats-table">
					<tbody>
						${p.stats.map(
							(s) => html`<tr>
								<th scope="row">${s.label}</th>
								<td class="stats-table__value">${s.value}</td>
								<td class="stats-table__bar" aria-hidden="true">${bar(s.value, MAX_STAT)}</td>
							</tr>`,
						)}
						<tr class="stats-table__total">
							<th scope="row">Total</th>
							<td class="stats-table__value">${p.total}</td>
							<td class="stats-table__bar" aria-hidden="true">
								${bar(p.total, MAX_STAT * p.stats.length)}
							</td>
						</tr>
					</tbody>
				</table>`,
			)}
			${section(
				'abilities',
				'Abilities',
				html`<ul class="plain-list">
					${p.abilities.map(
						(a) =>
							html`<li>
								<a href=${`/abilities/${a.name}`}>${a.label}</a>${a.hidden
									? ' (hidden)'
									: null}
							</li>`,
					)}
				</ul>`,
			)}
			${section(
				'evolution',
				'Evolution',
				p.chain
					? html`<div class="evolution">${evolutionList([p.chain])}</div>`
					: html`<div class="evolution">
							${evolutionList([{ species: { name: p.name, url: '' }, evolves_to: [] }])}
						</div>`,
			)}
			${section(
				'moves',
				'Moves',
				html`<moves-panel>
					${p.games.length
						? html`<form class="game-picker" method="get" action="#moves">
								<label for="game-select">Game</label>
								<select id="game-select" name="game">
									${p.games.map(
										(g) =>
											html`<option value=${g.name} ?selected=${g.name === p.game}>${g.label}</option>`,
									)}
								</select>
								<noscript><button type="submit">Show</button></noscript>
							</form>`
						: null}
					<div id="move-tables">${moveTables(p.moveTables)}</div>
				</moves-panel>`,
			)}
		`;
	},
});
