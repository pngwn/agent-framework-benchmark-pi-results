import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { api, apiBase, idFromUrl, mapPool } from '../../lib/api.js';
import { getTypeNames } from '../../lib/data.js';
import { NOT_FOUND_TITLE, notFoundContent } from '../../lib/views.js';
import {
	dexNumber,
	EM_DASH,
	englishGenus,
	englishName,
	formatMeasure,
	humanize,
	latestEnglishFlavorText,
	valueOrDash,
} from '../../lib/util.js';

const STAT_LABELS = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const option = (value, label, selected) =>
	selected
		? html`<option value="${value}" selected>${label}</option>`
		: html`<option value="${value}">${label}</option>`;

function evolutionTree(node) {
	return html`<li>
		<a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>
		${node.evolves_to.length > 0
			? html`<ul>
					${node.evolves_to.map(evolutionTree)}
				</ul>`
			: null}
	</li>`;
}

function movesTable(method, rows, typeNames) {
	const isLevelUp = method === 'level-up';
	const headerCell = (label, sort) =>
		html`<th scope="col" data-sort="${sort}">
			<button type="button">${label}</button>
		</th>`;
	return html`<table class="moves-table">
		<caption>
			${humanize(method)}
		</caption>
		<thead>
			<tr>
				${isLevelUp ? headerCell('Level', 'number') : null}
				${headerCell('Move', 'string')} ${headerCell('Type', 'string')}
				${headerCell('Category', 'string')} ${headerCell('Power', 'number')}
				${headerCell('Accuracy', 'number')} ${headerCell('PP', 'number')}
			</tr>
		</thead>
		<tbody>
			${rows.map(
				(r) => html`<tr>
					${isLevelUp ? html`<td>${r.level}</td>` : null}
					<td><a href="/moves/${r.name}">${r.enName}</a></td>
					<td>
						<a class="badge type-${r.type}" href="/types/${r.type}"
							>${typeNames.get(r.type) ?? humanize(r.type)}</a
						>
					</td>
					<td>${r.damageClass ? humanize(r.damageClass) : EM_DASH}</td>
					<td>${valueOrDash(r.power)}</td>
					<td>${valueOrDash(r.accuracy)}</td>
					<td>${valueOrDash(r.pp)}</td>
				</tr>`,
			)}
		</tbody>
	</table>`;
}

export default defineRoute({
	handler: {
		GET: async (context) => {
			const name = context.params.name;
			const species = await api(`pokemon-species/${name}`);
			if (!species) {
				context.responseInit.status = 404;
				return { notFound: true, title: NOT_FOUND_TITLE };
			}

			const pokemon = await api(`pokemon/${species.id}`);
			if (!pokemon) {
				context.responseInit.status = 404;
				return { notFound: true, title: NOT_FOUND_TITLE };
			}

			const enName = englishName(species);
			const genus = englishGenus(species);
			const flavorText = latestEnglishFlavorText(species.flavor_text_entries);
			const artwork =
				pokemon.sprites?.other?.['official-artwork']?.front_default ??
				pokemon.sprites?.front_default ??
				null;

			// Evolution chain
			const chainId = idFromUrl(species.evolution_chain.url);
			const evolution = await api(`evolution-chain/${chainId}`);

			// Version groups in which this Pokémon learns moves, by `order`.
			const versionGroupNames = new Set();
			for (const move of pokemon.moves ?? [])
				for (const detail of move.version_group_details ?? [])
					versionGroupNames.add(detail.version_group.name);
			const versionGroups = (
				await mapPool([...versionGroupNames], 8, (n) => api(`version-group/${n}`))
			)
				.filter(Boolean)
				.sort((a, b) => a.order - b.order);

			let selectedGame = context.url.searchParams.get('game') ?? '';
			if (!versionGroups.some((v) => v.name === selectedGame))
				selectedGame = versionGroups.at(-1)?.name ?? '';

			// Moves for the selected version group, grouped by learn method.
			const learners = [];
			for (const move of pokemon.moves ?? []) {
				const details = (move.version_group_details ?? []).filter(
					(d) => d.version_group.name === selectedGame,
				);
				if (details.length > 0) learners.push({ ref: move.move, details });
			}
			const enriched = await mapPool(learners, 12, async (l) => ({
				...l,
				move: await api(`move/${idFromUrl(l.ref.url)}`),
			}));

			const byMethod = new Map();
			for (const entry of enriched) {
				if (!entry.move) continue;
				for (const detail of entry.details) {
					const method = detail.move_learn_method.name;
					if (!byMethod.has(method)) byMethod.set(method, []);
					byMethod.get(method).push({
						level: detail.level_learned_at,
						name: entry.move.name,
						enName: englishName(entry.move),
						type: entry.move.type?.name ?? '',
						damageClass: entry.move.damage_class?.name ?? null,
						power: entry.move.power,
						accuracy: entry.move.accuracy,
						pp: entry.move.pp,
					});
				}
			}
			const methods = [...byMethod.keys()].sort((a, b) => {
				const rank = (m) => {
					const i = METHOD_ORDER.indexOf(m);
					return i === -1 ? METHOD_ORDER.length : i;
				};
				return rank(a) - rank(b) || humanize(a).localeCompare(humanize(b));
			});
			for (const [method, rows] of byMethod) {
				rows.sort((a, b) =>
					method === 'level-up'
						? a.level - b.level || a.enName.localeCompare(b.enName)
						: a.enName.localeCompare(b.enName),
				);
			}

			const typeNames = await getTypeNames();

			return {
				notFound: false,
				title: `${enName} – Pokédex`,
				enName,
				genus,
				flavorText,
				artwork,
				dex: dexNumber(species.id),
				height: formatMeasure(pokemon.height, 'm'),
				weight: formatMeasure(pokemon.weight, 'kg'),
				types: [...(pokemon.types ?? [])]
					.sort((a, b) => a.slot - b.slot)
					.map((t) => ({
						name: t.type.name,
						label: typeNames.get(t.type.name) ?? humanize(t.type.name),
					})),
				stats: (pokemon.stats ?? []).map((s) => ({
					label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
					value: s.base_stat,
				})),
				statsTotal: (pokemon.stats ?? []).reduce(
					(sum, s) => sum + s.base_stat,
					0,
				),
				abilities: [...(pokemon.abilities ?? [])]
					.sort((a, b) => a.slot - b.slot)
					.map((a) => ({
						name: a.ability.name,
						hidden: a.is_hidden,
					})),
				chain: evolution?.chain ?? null,
				games: versionGroups.map((v) => v.name),
				selectedGame,
				tables: methods.map((m) => ({ method: m, rows: byMethod.get(m) })),
				typeNames: Object.fromEntries(typeNames),
			};
		},
	},

	document: (context) =>
		document({ ...context, title: context.props.GET.title }),

	template: (context) => {
		const p = context.props.GET;
		if (p.notFound) return notFoundContent;
		const typeNames = new Map(Object.entries(p.typeNames));

		return html`
			<div class="pokemon-summary">
				<div class="artwork-card">
					${p.artwork
						? html`<img
								class="artwork"
								src="${p.artwork}"
								alt="${p.enName}"
								width="288"
								height="288"
							/>`
						: null}
				</div>
				<div class="summary-info">
					<p class="dex">${p.dex}</p>
					<h1>${p.enName}</h1>
					${p.genus ? html`<p class="genus">${p.genus}</p>` : null}
					<p class="badges">
						${p.types.map(
							(t) =>
								html`<a class="badge type-${t.name}" href="/types/${t.name}"
									>${t.label}</a
								>`,
						)}
					</p>
					<dl class="measures">
						<div>
							<dt>Height</dt>
							<dd>${p.height}</dd>
						</div>
						<div>
							<dt>Weight</dt>
							<dd>${p.weight}</dd>
						</div>
					</dl>
				</div>
			</div>
			${p.flavorText ? html`<p class="flavor">${p.flavorText}</p>` : null}

			<section class="panel" aria-labelledby="stats-heading">
				<h2 id="stats-heading">Base stats</h2>
				<table class="stats-table">
					<tbody>
						${p.stats.map(
							(s) => html`<tr>
								<th scope="row">${s.label}</th>
								<td class="stat-value">${s.value}</td>
								<td class="stat-bar">
									<span
										class="bar"
										style="width: ${Math.min(100, (s.value / 255) * 100)}%"
									></span>
								</td>
							</tr>`,
						)}
						<tr class="stat-total">
							<th scope="row">Total</th>
							<td class="stat-value">${p.statsTotal}</td>
							<td class="stat-bar">
								<span
									class="bar"
									style="width: ${Math.min(100, (p.statsTotal / 720) * 100)}%"
								></span>
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section class="panel" aria-labelledby="abilities-heading">
				<h2 id="abilities-heading">Abilities</h2>
				<ul class="ability-list">
					${p.abilities.map(
						(a) => html`<li>
							<a href="/abilities/${a.name}">${humanize(a.name)}</a>${a.hidden
								? html` (hidden)`
								: null}
						</li>`,
					)}
				</ul>
			</section>

			${p.chain
				? html`<section class="panel" aria-labelledby="evolution-heading">
						<h2 id="evolution-heading">Evolution</h2>
						<ul class="evolution-tree">
							${evolutionTree(p.chain)}
						</ul>
					</section>`
				: null}

			<section class="panel" id="moves" aria-labelledby="moves-heading">
				<h2 id="moves-heading">Moves</h2>
				<div class="moves-controls">
					<label for="game-select">Game</label>
					<select id="game-select" name="game">
						${p.games.map((g) =>
							option(g, humanize(g), g === p.selectedGame),
						)}
					</select>
				</div>
				<div id="moves-tables">
					${p.tables.map((t) => movesTable(t.method, t.rows, typeNames))}
				</div>
			</section>
		`;
	},
});
