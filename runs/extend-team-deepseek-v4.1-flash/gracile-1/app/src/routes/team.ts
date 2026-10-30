import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { section, teamCardList } from '../components/partials.js';
import { document } from '../document.js';
import { isBuildRender } from '../lib/api.js';
import { getTeamCards, getTypeCoverage } from '../lib/data.js';
import { parseTeamCookie } from '../lib/team.js';

export default defineRoute({
	handler: async ({ request, url }) => {
		if (isBuildRender(url)) return { names: [], cards: [], coverage: [] };

		const names = parseTeamCookie(request.headers.get('cookie'));
		const cards = await getTeamCards(names);
		const coverage = cards.length ? await getTypeCoverage(cards) : [];
		return { names, cards, coverage };
	},

	document: () => document({ title: 'Team' }),

	template: ({ props }) => html`
		<team-page>
			<h1 class="page-title">Team</h1>
			<p class="count">${props.names.length} of 6</p>

			${props.names.length
				? html`
						${teamCardList(props.cards)}
						${props.coverage.length
							? section(
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
													(row) => html`
														<tr>
															<th scope="row">${row.label}</th>
															<td>${row.weak}</td>
															<td>${row.resistant}</td>
														</tr>
													`,
												)}
											</tbody>
										</table>
									</div>`,
								)
							: null}
					`
				: html`
						<p class="empty">Your team is empty</p>
						<p><a href="/">Browse Pokémon</a></p>
					`}
		</team-page>
	`,
});
