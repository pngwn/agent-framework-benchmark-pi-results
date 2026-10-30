<script>
	import { goto } from '$app/navigation';
	import MoveTable from '#lib/components/MoveTable.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { dexNumber } from '#lib/format.js';

	let { data } = $props();

	function onGameChange(event) {
		const game = event.currentTarget.value;
		const params = new URLSearchParams();
		if (game) params.set('game', game);
		const query = params.toString();
		const hash = window.location.hash;
		goto(`/pokemon/${data.name}${query ? `?${query}` : ''}${hash}`, {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<div class="summary">
	<figure class="artwork">
		<img src={data.artwork} alt={data.label} width="475" height="475" />
	</figure>
	<div class="identity">
		<p class="dex">{dexNumber(data.dex)}</p>
		<h1>{data.label}</h1>
		<p class="genus">{data.genus}</p>
		<div class="type-row">
			{#each data.types as type (type.name)}
				<TypeBadge name={type.name} label={type.label} href="/types/{type.name}" />
			{/each}
		</div>
		<dl class="inline-details">
			<dt>Height</dt>
			<dd>{data.height}</dd>
			<dt>Weight</dt>
			<dd>{data.weight}</dd>
		</dl>
		{#if data.flavor}
			<p class="flavor">{data.flavor}</p>
		{/if}
	</div>
</div>

<section class="panel" aria-labelledby="stats-heading">
	<h2 id="stats-heading">Base stats</h2>
	<table class="stats-table">
		<tbody>
			{#each data.stats as stat (stat.name)}
				<tr>
					<th scope="row">{stat.label}</th>
					<td class="stat-value">{stat.value}</td>
					<td class="bar-cell" aria-hidden="true">
						<span class="bar-track">
							<span
								class="bar-fill"
								style={`width: ${Math.min(100, (stat.value / 180) * 100)}%`}
							></span>
						</span>
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
	<ul class="plain-list">
		{#each data.abilities as ability (ability.name)}
			<li>
				<a href="/abilities/{ability.name}">{ability.label}</a>{#if ability.hidden}<span class="hidden-marker">&nbsp;(hidden)</span>{/if}
			</li>
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="evolution-heading">
	<h2 id="evolution-heading">Evolution</h2>
	{#if data.evolution}
		<ul class="evolution">
			{@render evolutionNode(data.evolution)}
		</ul>
	{/if}
</section>

{#snippet evolutionNode(node)}
	<li>
		<a href="/pokemon/{node.name}">{node.displayName}</a>
		{#if node.children.length}
			<ul>
				{#each node.children as child (child.name)}
					{@render evolutionNode(child)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<section class="panel moves" id="moves" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	<div class="game-control">
		<label for="game-select">Game</label>
		<select id="game-select" value={data.game} onchange={onGameChange}>
			{#each data.games as game (game.name)}
				<option value={game.name}>{game.label}</option>
			{/each}
		</select>
	</div>
	{#each data.methods as method (method.name)}
		<div class="method-block">
			<MoveTable {method} />
		</div>
	{/each}
</section>

<style>
	.summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		margin-bottom: var(--space-6);
	}

	.artwork {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		padding: var(--space-3);
	}

	.artwork img {
		display: block;
		width: 100%;
		height: auto;
		max-height: var(--artwork-size);
		object-fit: contain;
	}

	.identity {
		min-width: 0;
	}

	.dex {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.identity h1 {
		margin-top: var(--space-1);
	}

	.genus {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.type-row {
		justify-content: flex-start;
		margin-top: var(--space-3);
	}

	.flavor {
		margin-top: var(--space-4);
		font-size: var(--text-sm);
	}

	.stats-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.stats-table th {
		width: 6rem;
		padding: var(--space-1) var(--space-2) var(--space-1) 0;
		font-weight: var(--weight-normal);
		text-align: left;
		white-space: nowrap;
	}

	.stat-value {
		width: 3rem;
		padding: var(--space-1) var(--space-2);
	}

	.bar-cell {
		width: auto;
		padding: var(--space-1) 0;
	}

	.bar-track {
		display: block;
		width: 100%;
		height: 0.375rem;
		overflow: hidden;
		border-radius: var(--radius-pill);
		background: var(--color-stat-track);
	}

	.bar-fill {
		display: block;
		height: 100%;
		border-radius: var(--radius-pill);
		background: var(--color-stat-bar);
	}

	.plain-list {
		list-style: none;
		font-size: var(--text-sm);
	}

	.plain-list li + li {
		margin-top: var(--space-1);
	}

	.evolution,
	.evolution ul {
		list-style: none;
		font-size: var(--text-sm);
	}

	.evolution ul {
		margin-top: var(--space-1);
		margin-left: var(--space-5);
	}

	.evolution li + li {
		margin-top: var(--space-1);
	}

	.game-control {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.game-control label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.game-control select {
		min-width: 12rem;
		height: 2.25rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		padding: 0 var(--space-2);
		color: var(--color-text);
	}

	.method-block {
		overflow-x: auto;
	}

	.method-block + .method-block {
		margin-top: var(--space-5);
	}

	.moves {
		scroll-margin-top: var(--space-4);
	}

	@media (min-width: 48rem) {
		.summary {
			grid-template-columns: var(--artwork-size) minmax(0, 1fr);
			align-items: start;
			gap: var(--space-6);
		}
	}
</style>
