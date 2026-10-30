<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EvolutionList from '#lib/components/EvolutionList.svelte';
	import MoveTable from '#lib/components/MoveTable.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';

	let { data } = $props();

	function onGameChange(event) {
		const url = new URL(page.url);
		url.searchParams.set('game', event.currentTarget.value);
		goto(url, { noScroll: true, keepFocus: true, replace: true });
	}
</script>

<svelte:head>
	<title>{data.heading} – Pokédex</title>
</svelte:head>

<div class="hero">
	<div class="artwork">
		{#if data.artwork}
			<img src={data.artwork} alt={data.heading} width="288" height="288" />
		{/if}
	</div>
	<div class="hero-body">
		<p class="dex-number">{data.dexNumber}</p>
		<h1>{data.heading}</h1>
		<p class="genus">{data.genus}</p>
		<div class="hero-types">
			{#each data.types as type}
				<TypeBadge name={type.name} englishName={type.englishName} link />
			{/each}
		</div>
		<dl class="measures">
			<div>
				<dt>Height</dt>
				<dd>{data.height}</dd>
			</div>
			<div>
				<dt>Weight</dt>
				<dd>{data.weight}</dd>
			</div>
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
			{#each data.stats as stat}
				<tr>
					<th scope="row">{stat.label}</th>
					<td>
						<span class="stat-cell">
							<span class="stat-number">{stat.value}</span>
							<span class="stat-track" aria-hidden="true">
								<span
									class="stat-fill"
									style:width={`${Math.min(100, (stat.value / 255) * 100)}%`}
								></span>
							</span>
						</span>
					</td>
				</tr>
			{/each}
			<tr>
				<th scope="row">Total</th>
				<td>
					<span class="stat-cell">
						<span class="stat-number">{data.total}</span>
						<span class="stat-track" aria-hidden="true">
							<span
								class="stat-fill"
								style:width={`${Math.min(100, (data.total / (data.stats.length * 255)) * 100)}%`}
							></span>
						</span>
					</span>
				</td>
			</tr>
		</tbody>
	</table>
</section>

<section class="panel" aria-labelledby="abilities-heading">
	<h2 id="abilities-heading">Abilities</h2>
	<ul class="abilities">
		{#each data.abilities as ability}
			<li>
				<a href="/abilities/{ability.name}">{ability.label}</a>{#if ability.hidden}<span class="hidden-marker">{' (hidden)'}</span>{/if}
			</li>
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="evolution-heading">
	<h2 id="evolution-heading">Evolution</h2>
	<EvolutionList chain={data.evolutionChain} />
</section>

<section class="panel" id="moves" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	<div class="game-control">
		<label for="game">Game</label>
		<select id="game" value={data.selectedGame} onchange={onGameChange}>
			{#each data.games as game}
				<option value={game.name}>{game.label}</option>
			{/each}
		</select>
	</div>

	{#key data.selectedGame}
		{#each data.tables as table (table.name)}
			<MoveTable {table} />
		{/each}
	{/key}
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: var(--artwork-size) minmax(0, 1fr);
		gap: var(--space-6);
		align-items: start;
		margin-bottom: var(--space-2);
	}

	.artwork {
		width: var(--artwork-size);
		height: var(--artwork-size);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-1);
	}

	.artwork img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.hero-body {
		padding-top: 1.125rem;
	}

	.dex-number {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		margin-bottom: var(--space-1);
	}

	.hero h1 {
		font-size: var(--text-2xl);
	}

	.genus {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
	}

	.hero-types {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.measures {
		display: flex;
		gap: var(--space-6);
		margin-top: var(--space-4);
	}

	.measures dt {
		font-size: var(--text-xs);
	}

	.measures dd {
		font-size: var(--text-sm);
	}

	.flavor {
		margin-top: 1.25rem;
		max-width: 60rem;
	}

	.stats-table {
		width: 100%;
		border-collapse: collapse;
	}

	.stats-table th {
		width: 6rem;
		padding: 0.35rem 0;
		color: var(--color-text);
		font-size: var(--text-sm);
		font-weight: var(--weight-normal);
		text-align: left;
	}

	.stats-table td {
		padding: 0.35rem 0;
	}

	.stat-cell {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
	}

	.stat-number {
		width: 2.5rem;
		text-align: left;
		font-size: var(--text-sm);
	}

	.stat-track {
		flex: 1;
		height: 0.5rem;
		background: var(--color-stat-track);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.stat-fill {
		display: block;
		height: 100%;
		background: var(--color-stat-bar);
		border-radius: var(--radius-pill);
	}

	.abilities {
		margin: 0;
		padding-left: var(--space-5);
	}

	.abilities li + li {
		margin-top: var(--space-1);
	}

	.hidden-marker {
		color: var(--color-text-muted);
	}

	.game-control {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.game-control label {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.game-control select {
		width: min(100%, 16rem);
		height: 2.5rem;
		padding: 0 var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
	}

	:global(.data-table) {
		margin-bottom: var(--space-5);
	}

	:global(.data-table:last-child) {
		margin-bottom: 0;
	}

	@media (max-width: 43rem) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.25rem;
		}

		.artwork {
			justify-self: center;
		}

		.hero-body {
			padding-top: 0;
		}

		.measures {
			gap: var(--space-5);
		}
	}
</style>
