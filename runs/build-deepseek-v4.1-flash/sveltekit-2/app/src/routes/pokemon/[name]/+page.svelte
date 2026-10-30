<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MoveTable from '#lib/components/MoveTable.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { dexNumber } from '#lib/format.js';

	let { data } = $props();

	onMount(() => {
		if (location.hash) {
			requestAnimationFrame(() => {
				document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
			});
		}
	});

	function changeGame(event) {
		const url = new URL(page.url);
		url.searchParams.set('game', event.currentTarget.value);
		goto(url, { noScroll: true, keepFocus: true });
	}
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<div class="summary">
	<div class="artwork">
		{#if data.artwork}
			<img src={data.artwork} alt={data.label} width="288" height="288" />
		{/if}
	</div>
	<div class="summary-info">
		<p class="dex">{dexNumber(data.id)}</p>
		<h1>{data.label}</h1>
		<p class="genus">{data.genus}</p>
		<div class="types">
			{#each data.types as type}
				<TypeBadge name={type.name} label={type.label} href={`/types/${type.name}`} />
			{/each}
		</div>
		<dl class="measurements">
			<div>
				<dt>Height</dt>
				<dd>{(data.height / 10).toFixed(1)} m</dd>
			</div>
			<div>
				<dt>Weight</dt>
				<dd>{(data.weight / 10).toFixed(1)} kg</dd>
			</div>
		</dl>
		<p class="flavor">{data.flavor}</p>
	</div>
</div>

<section class="panel" aria-labelledby="stats-heading">
	<h2 id="stats-heading">Base stats</h2>
	<table class="stats-table">
		<tbody>
			{#each data.stats as stat}
				<tr>
					<th scope="row">{stat.label}</th>
					<td class="stat-value">{stat.value}</td>
					<td class="bar-cell">
						<div class="stat-track">
							<span
								class="stat-fill"
								style={`width: ${Math.min(100, (stat.value / 255) * 100)}%`}
							></span>
						</div>
					</td>
				</tr>
			{/each}
			<tr>
				<th scope="row">Total</th>
				<td class="stat-value">{data.total}</td>
				<td class="bar-cell"></td>
			</tr>
		</tbody>
	</table>
</section>

<section class="panel" aria-labelledby="abilities-heading">
	<h2 id="abilities-heading">Abilities</h2>
	<ul class="abilities">
		{#each data.abilities as ability}
			<li>
				<a href={`/abilities/${ability.name}`}>{ability.label}</a>{#if ability.hidden}{' '}<span
						class="hidden-tag">(hidden)</span
					>{/if}
			</li>
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="evolution-heading">
	<h2 id="evolution-heading">Evolution</h2>
	{#if data.evolution}
		{#snippet evolutionItem(node)}
			<li>
				<a href={`/pokemon/${node.name}`}>{node.label}</a>
				{#if node.evolvesTo.length}
					<ul>
						{#each node.evolvesTo as child (child.name)}
							{@render evolutionItem(child)}
						{/each}
					</ul>
				{/if}
			</li>
		{/snippet}
		<ul class="evolution">
			{@render evolutionItem(data.evolution)}
		</ul>
	{/if}
</section>

<section class="panel moves-panel" id="moves" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	{#if data.games.length}
		<div class="game-row">
			<label class="field-label game-label" for="game-select">Game</label>
			<select class="select-input game-select" id="game-select" onchange={changeGame}>
				{#each data.games as game}
					<option value={game.name} selected={game.name === data.selectedGame}>{game.label}</option>
				{/each}
			</select>
		</div>
	{/if}
	{#each data.tables as table (table.method)}
		<MoveTable label={table.label} showLevel={table.showLevel} rows={table.rows} />
	{/each}
</section>

<style>
	.summary {
		display: grid;
		grid-template-columns: var(--artwork-size) minmax(0, 1fr);
		gap: var(--space-6);
		align-items: start;
		margin-bottom: var(--space-4);
	}

	.artwork {
		width: var(--artwork-size);
	}

	.artwork img {
		display: block;
		width: 100%;
		height: auto;
	}

	.dex {
		margin-bottom: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.summary h1 {
		margin-bottom: var(--space-1);
	}

	.genus {
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--text-base);
	}

	.types {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.measurements {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-5);
		margin-bottom: var(--space-4);
	}

	.measurements dt {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.measurements dd {
		margin: 0;
		font-size: var(--text-sm);
	}

	.flavor {
		max-width: 48rem;
		margin-bottom: 0;
	}

	.stats-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.stats-table th,
	.stats-table td {
		padding: 0.3rem var(--space-2);
		border: 0;
		text-align: left;
	}

	.stats-table th {
		width: 5rem;
		color: var(--color-text-muted);
		font-weight: var(--weight-normal);
		white-space: nowrap;
	}

	.stat-value {
		width: 3rem;
	}

	.bar-cell {
		width: 100%;
	}

	.stat-track {
		width: 100%;
		height: 0.7rem;
		overflow: hidden;
		background: var(--color-stat-track);
		border-radius: var(--radius-pill);
	}

	.stat-fill {
		display: block;
		height: 100%;
		background: var(--color-stat-bar);
		border-radius: var(--radius-pill);
	}

	.abilities,
	.evolution {
		padding-left: var(--space-5);
		margin-bottom: 0;
	}

	.abilities li,
	.evolution li {
		margin-bottom: var(--space-1);
	}

	.hidden-tag {
		color: var(--color-text-muted);
	}

	.moves-panel {
		scroll-margin-top: var(--space-4);
	}

	.game-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.game-label {
		margin-bottom: 0;
	}

	.game-select {
		width: 16rem;
		max-width: 100%;
	}

	@media (max-width: 48rem) {
		.summary {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}

		.artwork {
			margin-inline: auto;
		}
	}
</style>
