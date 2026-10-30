import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { section, teamCard } from '../components/partials.js';
import { document } from '../document.js';
import { isBuildRender } from '../lib/api.js';
import {
	type TypeBadge,
	type TypeInfo,
	getDefaultPokemon,
	getSpecies,
	getTypes,
} from '../lib/data.js';
import { humanize } from '../lib/format.js';
import { TEAM_MAX, teamFromCookieHeader } from '../lib/team.js';

type Member = {
	id: number;
	name: string;
	label: string;
	types: TypeBadge[];
};

type Coverage = {
	name: string;
	label: string;
	weak: number;
	resistant: number;
};

async function member(name: string, labels: Map<string, string>): Promise<Member | null> {
	try {
		const species = await getSpecies(name);
		if (!species || species.name !== name) return null;
		const pokemon = await getDefaultPokemon(species);
		return {
			id: species.id,
			name: species.name,
			label: humanize(species.name),
			types: [...pokemon.types]
				.sort((a, b) => a.slot - b.slot)
				.map((t) => ({
					name: t.type.name,
					label: labels.get(t.type.name) ?? humanize(t.type.name),
				})),
		};
	} catch {
		return null;
	}
}

function multiplier(attacking: TypeInfo, defending: TypeBadge[]): number {
	const relations = attacking.record.damage_relations;
	let result = 1;
	for (const type of defending) {
		if (relations.double_damage_to.some((t) => t.name === type.name)) result *= 2;
		else if (relations.half_damage_to.some((t) => t.name === type.name)) result *= 0.5;
		else if (relations.no_damage_to.some((t) => t.name === type.name)) result *= 0;
	}
	return result;
}

function coverage(types: TypeInfo[], members: Member[]): Coverage[] {
	return types.map((type) => {
		let weak = 0;
		let resistant = 0;
		for (const member of members) {
			const value = multiplier(type, member.types);
			if (value > 1) weak++;
			else if (value < 1) resistant++;
		}
		return { name: type.name, label: type.label, weak, resistant };
	});
}

async function load(team: string[]) {
	const types = await getTypes();
	const labels = new Map(types.map((t) => [t.name, t.label]));
	const members = (
		await Promise.all(team.map((name) => member(name, labels)))
	).filter((m): m is Member => m !== null);
	return { members, coverage: coverage(types, members) };
}

const empty = { members: [] as Member[], coverage: [] as Coverage[] };

export default defineRoute({
	handler: async ({ request, url }) => {
		if (isBuildRender(url)) return empty;
		const team = teamFromCookieHeader(request.headers.get('cookie'));
		return load(team);
	},

	document: () => document({ title: 'Team' }),

	template: ({ props }) => html`
		<h1 class="page-title">Team</h1>
		<p class="count">${props.members.length} of ${TEAM_MAX}</p>

		${props.members.length
			? html`
					<team-list>
						<ul class="card-grid team-grid">
							${props.members.map(teamCard)}
						</ul>
					</team-list>

					${section(
						'type-coverage',
						'Type coverage',
						html`<div class="table-wrap">
							<table class="data-table coverage-table">
								<thead>
									<tr>
										<th scope="col">Type</th>
										<th scope="col">Weak</th>
										<th scope="col">Resistant</th>
									</tr>
								</thead>
								<tbody>
									${props.coverage.map(
										(row) => html`<tr>
											<th scope="row">${row.label}</th>
											<td>${row.weak}</td>
											<td>${row.resistant}</td>
										</tr>`,
									)}
								</tbody>
							</table>
						</div>`,
					)}
				`
			: html`<p class="empty">
					Your team is empty. <a href="/">Browse the Pokédex</a>
				</p>`}
	`,
});
