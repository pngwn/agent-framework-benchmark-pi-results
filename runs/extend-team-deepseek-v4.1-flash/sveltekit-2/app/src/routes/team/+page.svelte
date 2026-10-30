<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import Section from '#lib/components/Section.svelte';
	import { humanize, pageTitle } from '#lib/format.ts';
	import { getTeam } from '#lib/team.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const team = getTeam();

	async function remove(name: string) {
		team.remove(name);
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{pageTitle('Team')}</title>
</svelte:head>

<h1 class="page-heading">Team</h1>

<p class="muted count">{data.members.length} of 6</p>

{#if data.members.length === 0}
	<div class="empty">
		<p>Your team is empty</p>
		<p><a href="/">Browse Pokémon</a></p>
	</div>
{:else}
	<ul class="team-list">
		{#each data.members as member (member.name)}
			<li class="member">
				<PokemonCard
					card={{ id: member.id, name: member.name, sprite: member.sprite, types: member.types }}
					showTypes
				/>
				<button type="button" onclick={() => remove(member.name)}>Remove {humanize(member.name)}</button>
			</li>
		{/each}
	</ul>

	<Section title="Type coverage">
		<table class="coverage">
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
		padding: var(--space-6) 0;
		color: var(--color-text-muted);
	}

	.team-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--card-min-width), 1fr));
		gap: var(--space-3);
		margin: 0 0 var(--space-5);
		padding: 0;
		list-style: none;
	}

	.member {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.member button {
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-link);
		cursor: pointer;
	}

	.member button:hover {
		border-color: var(--color-link);
	}

	.coverage {
		width: 100%;
		border-collapse: collapse;
	}

	.coverage th,
	.coverage td {
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--color-border);
		text-align: left;
	}

	.coverage thead th {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: var(--weight-normal);
	}

	.coverage tbody th {
		font-weight: var(--weight-normal);
	}
</style>
