import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import '../../features/move-explorer.js';
import { notFoundTemplate } from '../../features/partials.js';
import { getPokemonPageData } from '../../lib/data.js';
import { dexNumber, humanize } from '../../lib/format.js';

export default defineRoute({
	handler: {
		GET: async ({ url, params }) => {
			const name = params.name?.toLowerCase();
			if (!name) return { notFound: true };
			const data = await getPokemonPageData(name);
			if (!data) return { notFound: true };
			const { selected, tables } = await data.moveTablesFor(
				url.searchParams.get('game') ?? undefined,
			);
			return { notFound: false, data, selected, tables };
		},
	},

	document: (context) => {
		const props = context.props.GET;
		return document({
			...context,
			title: props.notFound
				? 'Not found – Pokédex'
				: `${props.data.displayName} – Pokédex`,
		});
	},

	template: (context) => {
		const props = context.props.GET;
		if (props.notFound) return html`<main class="wrap">${notFoundTemplate}</main>`;

		const { data, selected, tables } = props;
		const { pokemon, species } = data;

		const artwork =
			pokemon.sprites?.other?.['official-artwork']?.front_default ??
			pokemon.sprites?.front_default ??
			null;

		const statsTotal = data.stats.reduce(
			(sum: number, stat: { value: number }) => sum + stat.value,
			0,
		);

		const statBar = (percent: number) => html`
			<div class="stat-track">
				<div class="stat-bar" style="width: ${Math.min(100, percent)}%"></div>
			</div>
		`;

		const evolutionNode = (node: any): any => html`
			<li>
				<a href="/pokemon/${node.species.name}">${humanize(node.species.name)}</a>
				${node.evolves_to?.length
					? html`<ul>
							${node.evolves_to.map(evolutionNode)}
						</ul>`
					: ''}
			</li>
		`;

		return html`
			<main class="wrap">
				<div class="pokemon-summary">
					${artwork
						? html`<img
								class="pokemon-artwork"
								src=${artwork}
								alt=${data.displayName}
								width="288"
								height="288"
							/>`
						: ''}
					<div class="pokemon-heading">
						<p class="pokemon-dex">${dexNumber(species.id)}</p>
						<h1>${data.displayName}</h1>
						<p class="pokemon-genus">${data.genus}</p>
						<div class="pokemon-types">
							${(pokemon.types as any[])
								.slice()
								.sort((a, b) => a.slot - b.slot)
								.map(
									(entry) => html`
										<a
											class="type-badge type-${entry.type.name}"
											href="/types/${entry.type.name}"
											>${data.labelForType(entry.type.name)}</a
										>
									`,
								)}
						</div>
						<dl class="pokemon-facts">
							<div>
								<dt>Height</dt>
								<dd>${(pokemon.height / 10).toFixed(1)} m</dd>
							</div>
							<div>
								<dt>Weight</dt>
								<dd>${(pokemon.weight / 10).toFixed(1)} kg</dd>
							</div>
						</dl>
						<p class="pokemon-flavor">${data.flavorText ?? '—'}</p>
					</div>
				</div>

				<section class="section" aria-labelledby="stats-heading">
					<h2 id="stats-heading">Base stats</h2>
					<table class="stats-table">
						<tbody>
							${data.stats.map(
								(stat: { label: string; value: number }) => html`
									<tr>
										<th scope="row">${stat.label}</th>
										<td class="stat-value">${stat.value}</td>
										<td>${statBar((stat.value / 255) * 100)}</td>
									</tr>
								`,
							)}
							<tr>
								<th scope="row">Total</th>
								<td class="stat-value">${statsTotal}</td>
								<td>${statBar((statsTotal / 720) * 100)}</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="section" aria-labelledby="abilities-heading">
					<h2 id="abilities-heading">Abilities</h2>
					<ul>
						${data.abilities.map(
							(ability: { name: string; hidden: boolean }) => html`
								<li>
									<a href="/abilities/${ability.name}">${humanize(ability.name)}</a
									>${ability.hidden ? ' (hidden)' : ''}
								</li>
							`,
						)}
					</ul>
				</section>

				<section class="section" aria-labelledby="evolution-heading">
					<h2 id="evolution-heading">Evolution</h2>
					<ul class="evolution-list">
						${evolutionNode(data.chain.chain)}
					</ul>
				</section>

				<section class="section" id="moves" aria-labelledby="moves-heading">
					<h2 id="moves-heading">Moves</h2>
					<move-explorer
						base="/pokemon/${species.name}"
						groups=${JSON.stringify(data.groups)}
						selected=${selected}
						tables=${JSON.stringify(tables)}
					></move-explorer>
				</section>
			</main>
		`;
	},
});
