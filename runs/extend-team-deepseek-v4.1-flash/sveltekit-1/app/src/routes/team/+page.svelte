<script lang="ts">
	import Section from '#lib/components/Section.svelte';
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import { humanize, pageTitle } from '#lib/format.ts';
	import { saveTeam, TEAM_SIZE } from '#lib/team.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let members = $state([...data.members]);

	// A client-side navigation to /team reuses this component, so sync with the new data.
	$effect(() => {
		members = [...data.members];
	});

	const coverage = $derived.by(() =>
		data.attackTypes.map((attack) => {
			let weak = 0;
			let resistant = 0;
			for (const member of members) {
				let multiplier = 1;
				for (const type of member.card.types ?? []) {
					if (attack.none.includes(type.name)) multiplier *= 0;
					else if (attack.half.includes(type.name)) multiplier *= 0.5;
					else if (attack.double.includes(type.name)) multiplier *= 2;
				}
				if (multiplier > 1) weak++;
				else if (multiplier < 1) resistant++;
			}
			return { name: attack.name, label: attack.label, weak, resistant };
		})
	);

	function remove(name: string) {
		members = members.filter((member) => member.name !== name);
		saveTeam(members.map((member) => member.name));
	}
</script>

<svelte:head>
	<title>{pageTitle('Team')}</title>
</svelte:head>

<h1 class="page-heading">Team</h1>

<p class="muted count">{members.length} of {TEAM_SIZE}</p>

{#if members.length}
	<ul class="team">
		{#each members as member (member.name)}
			<li>
				<PokemonCard card={member.card} showTypes />
				<button type="button" class="remove" onclick={() => remove(member.name)}>
					Remove {humanize(member.name)}
				</button>
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
				{#each coverage as row (row.name)}
					<tr>
						<th scope="row">{row.label}</th>
						<td>{row.weak}</td>
						<td>{row.resistant}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</Section>
{:else}
	<div class="empty">
		<p>Your team is empty</p>
		<p><a href="/">Browse Pokémon</a></p>
	</div>
{/if}

<style>
	.count {
		margin-bottom: var(--space-4);
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

	.remove {
		min-height: 2.5rem;
		padding: 0 var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.remove:hover {
		border-color: var(--color-link);
	}

	.coverage {
		width: 100%;
		border-collapse: collapse;
	}

	.coverage th,
	.coverage td {
		padding: var(--space-2) 0;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	.coverage thead th {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-weight: var(--weight-normal);
	}

	.coverage tbody th {
		font-weight: var(--weight-normal);
	}

	.coverage tbody tr:last-child th,
	.coverage tbody tr:last-child td {
		border-bottom: 0;
	}

	.coverage td {
		width: 6rem;
	}

	.empty {
		padding: var(--space-6) 0;
		text-align: center;
	}

	.empty p + p {
		margin-top: var(--space-3);
	}
</style>
