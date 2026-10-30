import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { section, teamCardList } from '../components/partials.js';
import { document } from '../document.js';
import { isBuildRender } from '../lib/api.js';
import { type CoverageRow, getTeamCards, getTypeCoverage } from '../lib/data.js';
import { teamFromCookieHeader } from '../lib/team.js';

async function load(names: string[], url: URL) {
	if (isBuildRender(url)) return { cards: [], coverage: [] };
	const cards = await getTeamCards(names);
	const coverage = await getTypeCoverage(cards);
	return { cards, coverage };
}

const coverageTable = (rows: CoverageRow[]) => html`
	<div class="table-wrap">
		<table class="coverage-table">
			<thead>
				<tr>
					<th scope="col">Type</th>
					<th scope="col">Weak</th>
					<th scope="col">Resistant</th>
				</tr>
			</thead>
			<tbody>
				${rows.map(
					(row) => html`<tr>
						<th scope="row">${row.type.label}</th>
						<td>${row.weak}</td>
						<td>${row.resistant}</td>
					</tr>`,
				)}
			</tbody>
		</table>
	</div>
`;

export default defineRoute({
	handler: async ({ request, url }) => {
		const names = isBuildRender(url)
			? []
			: teamFromCookieHeader(request.headers.get('cookie'));
		const { cards, coverage } = await load(names, url);
		return { cards, coverage };
	},

	document: () => document({ title: 'Team' }),

	template: ({ props }) => html`
		<h1 class="page-title">Team</h1>

		<team-page class="team-page">
			<div id="team-content">
				<p class="count">${props.cards.length} of 6</p>
				${props.cards.length
					? html`
							${teamCardList(props.cards)}
							${section(
								'coverage',
								'Type coverage',
								coverageTable(props.coverage),
							)}
						`
					: html`
							<div class="empty">
								<p>Your team is empty</p>
								<p><a href="/">Browse Pokémon</a></p>
							</div>
						`}
			</div>
		</team-page>
	`,
});
