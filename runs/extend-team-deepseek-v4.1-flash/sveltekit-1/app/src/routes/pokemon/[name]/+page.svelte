<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Section from '#lib/components/Section.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import Evolution from '#lib/components/Evolution.svelte';
	import MoveTable from '#lib/components/MoveTable.svelte';
	import { dexNumber, humanize, pageTitle } from '#lib/format.ts';
	import { saveTeam, TEAM_SIZE } from '#lib/team.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const pokemon = $derived(data.pokemon);
	const total = $derived(pokemon.stats.reduce((sum, s) => sum + s.value, 0));
	const MAX_STAT = 255;

	let team = $state<string[]>([...data.team]);
	const onTeam = $derived(team.includes(pokemon.name));
	const teamFull = $derived(team.length >= TEAM_SIZE);

	// Keep the local copy in step when navigating between Pokémon pages, which reuses
	// this component while the server sends the team from the (updated) cookie.
	$effect(() => {
		team = [...data.team];
	});

	function toggleTeam() {
		if (onTeam) team = team.filter((name) => name !== pokemon.name);
		else if (!teamFull) team = [...team, pokemon.name];
		saveTeam(team);
	}

	function selectGame(game: string) {
		const url = new URL(page.url.href);
		url.searchParams.set('game', game);
		url.hash = 'moves';
		goto(url, { replace: true, reset: false });
	}
</script>

<svelte:head>
	<title>{pageTitle(pokemon.label)}</title>
</svelte:head>

<div class="summary">
	<div class="artwork">
		{#if pokemon.artwork}
			<img src={pokemon.artwork} alt={pokemon.label} width="475" height="475" />
		{/if}
	</div>
	<div class="details">
		<p class="dex">{dexNumber(pokemon.id)}</p>
		<h1>{pokemon.label}</h1>
		<div class="team-action">
			<button type="button" disabled={!onTeam && teamFull} onclick={toggleTeam}>
				{onTeam ? 'Remove from team' : 'Add to team'}
			</button>
			{#if !onTeam && teamFull}
				<span class="team-full">Team is full</span>
			{/if}
		</div>
		{#if pokemon.genus}
			<p class="genus">{pokemon.genus}</p>
		{/if}
		<ul class="types" aria-label="Types">
			{#each pokemon.types as type (type.name)}
				<li><TypeBadge {type} link /></li>
			{/each}
		</ul>
		<dl class="measurements">
			<div>
				<dt>Height</dt>
				<dd>{pokemon.height} m</dd>
			</div>
			<div>
				<dt>Weight</dt>
				<dd>{pokemon.weight} kg</dd>
			</div>
		</dl>
		{#if pokemon.flavorText}
			<p class="flavor">{pokemon.flavorText}</p>
		{/if}
	</div>
</div>

<div class="stack">
	<Section title="Base stats" id="stats">
		<table class="stats">
			<tbody>
				{#each pokemon.stats as stat (stat.name)}
					<tr>
						<th scope="row">{stat.label}</th>
						<td>{stat.value}</td>
						<td class="bar" aria-hidden="true">
							<span style:width="{Math.min(100, (stat.value / MAX_STAT) * 100)}%"></span>
						</td>
					</tr>
				{/each}
				<tr class="total">
					<th scope="row">Total</th>
					<td>{total}</td>
					<td class="bar" aria-hidden="true">
						<span style:width="{Math.min(100, (total / (MAX_STAT * pokemon.stats.length || 1)) * 100)}%"></span>
					</td>
				</tr>
			</tbody>
		</table>
	</Section>

	<Section title="Abilities">
		<ul class="abilities">
			{#each pokemon.abilities as ability (ability.name)}
				<li>
					<a href="/abilities/{ability.name}">{humanize(ability.name)}</a>
					{#if ability.hidden}(hidden){/if}
				</li>
			{/each}
		</ul>
	</Section>

	<Section title="Evolution">
		<Evolution nodes={[pokemon.evolution]} />
	</Section>

	<Section title="Moves" id="moves">
		{#if pokemon.games.length}
			<div class="game">
				<label for="game">Game</label>
				<select id="game" onchange={(event) => selectGame(event.currentTarget.value)}>
					{#each pokemon.games as game (game.name)}
						<option value={game.name} selected={game.name === pokemon.game}>{game.label}</option>
					{/each}
				</select>
			</div>
			{#each pokemon.moveTables as table (`${pokemon.game}-${table.method}`)}
				<MoveTable {table} />
			{/each}
		{:else}
			<p>This Pokémon doesn't learn any moves.</p>
		{/if}
	</Section>
</div>

<style>
	.summary {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-5);
	}

	@media (min-width: 48rem) {
		.summary {
			grid-template-columns: var(--artwork-size) 1fr;
			gap: var(--space-6);
		}
	}

	.artwork {
		width: var(--artwork-size);
		max-width: 100%;
		aspect-ratio: 1;
		justify-self: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.artwork img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.details {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	@media (min-width: 48rem) {
		.details {
			padding-top: var(--space-4);
		}
	}

	.dex,
	.genus {
		color: var(--color-text-muted);
	}

	.team-action {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.team-action button {
		min-height: 2.5rem;
		padding: 0 var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.team-action button:hover:not(:disabled) {
		border-color: var(--color-link);
	}

	.team-action button:disabled {
		color: var(--color-text-muted);
		cursor: not-allowed;
	}

	.team-full {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.genus {
		margin-top: var(--space-1);
	}

	.types {
		display: flex;
		gap: var(--space-1);
		margin: var(--space-3) 0 0;
		padding: 0;
		list-style: none;
	}

	.measurements {
		display: flex;
		gap: var(--space-6);
		margin: var(--space-4) 0 0;
	}

	.measurements dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.measurements dd {
		margin: 0;
	}

	.flavor {
		margin-top: var(--space-4);
	}

	.stats {
		width: 100%;
		border-collapse: collapse;
	}

	.stats th {
		width: 6rem;
		padding: var(--space-1) 0;
		text-align: left;
		font-weight: var(--weight-normal);
		color: var(--color-text-muted);
	}

	.stats td {
		padding: var(--space-1) 0;
	}

	.stats td:nth-of-type(1) {
		width: 3rem;
	}

	.bar span {
		display: block;
		height: 0.5rem;
		border-radius: var(--radius-pill);
		background: var(--color-stat-bar);
	}

	.bar {
		background-clip: content-box;
	}

	.stats .bar {
		position: relative;
	}

	.stats .bar::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 0.5rem;
		transform: translateY(-50%);
		border-radius: var(--radius-pill);
		background: var(--color-stat-track);
	}

	.stats .bar span {
		position: relative;
	}

	.total th,
	.total td {
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-2);
	}

	.abilities {
		margin: 0;
		padding-left: var(--space-5);
	}

	.game {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.game label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.game select {
		height: 2.5rem;
		min-width: 0;
		width: 16.5rem;
		max-width: 100%;
		padding: 0 var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
</style>
