<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import Section from '#lib/components/Section.svelte';
	import { humanize, pageTitle } from '#lib/format.ts';
	import { MAX_TEAM_SIZE, removeTeamMember } from '#lib/team.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const members = $derived(data.members);
	const count = $derived(members.length);
	let removing = $state<string | null>(null);

	async function remove(name: string) {
		if (removing) return;
		removing = name;
		try {
			removeTeamMember(data.team, name);
			await invalidateAll();
		} finally {
			removing = null;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle('Team')}</title>
</svelte:head>

<h1 class="page-heading">Team</h1>

<p class="muted count">{count} of {MAX_TEAM_SIZE}</p>

{#if count === 0}
	<div class="empty">
		<p>Your team is empty</p>
		<p><a href="/">Browse Pokémon</a></p>
	</div>
{:else}
	<ul class="team">
		{#each members as member (member.name)}
			<li>
				<PokemonCard card={member} showTypes />
				<button
					type="button"
					onclick={() => remove(member.name)}
					disabled={removing === member.name}
				>
					Remove {humanize(member.name)}
				</button>
			</li>
		{/each}
	</ul>

	<Section title="Type coverage">
		<div class="coverage">
			<table>
				<thead>
					<tr>
						<th scope="col">Type</th>
						<th scope="col">Weak</th>
						<th scope="col">Resistant</th>
					</tr>
				</thead>
				<tbody>
					{#each data.coverage as row (row.name)}
						<tr>
							<th scope="row">{row.label}</th>
							<td>{row.weak}</td>
							<td>{row.resistant}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Section>
{/if}

<style>
	.count {
		margin-bottom: var(--space-4);
	}

	.empty {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-6) var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		text-align: center;
		color: var(--color-text-muted);
	}

	.empty a {
		color: var(--color-link);
	}

	.team {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--card-min-width), 1fr));
		gap: var(--space-3);
		margin: 0 0 var(--space-5);
		padding: 0;
		list-style: none;
	}

	.team li {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.team button {
		width: 100%;
		min-height: 2.5rem;
		padding: 0 var(--space-3);
		background: var(--color-surface);
		color: var(--color-link);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.team button:hover {
		border-color: var(--color-link);
	}

	.team button:disabled {
		color: var(--color-text-muted);
		cursor: default;
	}

	.coverage {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		text-align: left;
	}

	thead th {
		color: var(--color-text-muted);
		font-weight: var(--weight-normal);
	}

	tbody th {
		font-weight: var(--weight-normal);
	}

	th:not(:first-child),
	td {
		width: 8rem;
		text-align: right;
	}
</style>
