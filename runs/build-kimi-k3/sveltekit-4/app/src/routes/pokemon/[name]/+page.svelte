<script>
	import { goto } from '$app/navigation';
	import Section from '../../../lib/components/Section.svelte';
	import EvolutionNode from '../../../lib/components/EvolutionNode.svelte';
	import MoveTable from '../../../lib/components/MoveTable.svelte';

	let { data } = $props();

	const STAT_BAR_MAX = 255;
	const TOTAL_BAR_MAX = 720;

	function onGameChange(event) {
		const game = event.currentTarget.value;
		goto(`/pokemon/${data.speciesName}?game=${encodeURIComponent(game)}#moves`, { reset: false });
	}
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<div class="summary card">
	{#if data.artwork}
		<img class="artwork" src={data.artwork} alt={data.name} width="288" height="288" />
	{/if}
	<div class="summary-info">
		<p class="dex muted">{data.dex}</p>
		<h1>{data.name}</h1>
		{#if data.genus}
			<p class="genus muted">{data.genus}</p>
		{/if}
		<p class="badges">
			{#each data.types as type (type.name)}
				<a class="pill" style:--pill-bg="var(--type-{type.name}, var(--color-border))" href="/types/{type.name}">
					{type.label}
				</a>
			{/each}
		</p>
		<dl class="hw">
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

<Section id="stats" title="Base stats">
	<table class="stats-table">
		<tbody>
			{#each data.stats as stat (stat.label)}
				<tr>
					<th scope="row">{stat.label}</th>
					<td class="num">{stat.value}</td>
					<td class="bar-cell">
						<span class="bar-track">
							<span class="bar" style:width="{Math.min(100, (stat.value / STAT_BAR_MAX) * 100)}%"></span>
						</span>
					</td>
				</tr>
			{/each}
			<tr class="total">
				<th scope="row">Total</th>
				<td class="num">{data.total}</td>
				<td class="bar-cell">
					<span class="bar-track">
						<span class="bar" style:width="{Math.min(100, (data.total / TOTAL_BAR_MAX) * 100)}%"></span>
					</span>
				</td>
			</tr>
		</tbody>
	</table>
</Section>

<Section id="abilities" title="Abilities">
	<ul class="plain-list">
		{#each data.abilities as ability (ability.name)}
			<li>
				<a href="/abilities/{ability.name}">{ability.label}</a>{#if ability.hidden}{' '}<span class="muted">(hidden)</span>{/if}
			</li>
		{/each}
	</ul>
</Section>

{#if data.evolution}
	<Section id="evolution" title="Evolution">
		<ul class="plain-list evolution-tree">
			<EvolutionNode node={data.evolution} />
		</ul>
	</Section>
{/if}

<Section id="moves" title="Moves">
	{#if data.games.length}
		<div class="game-picker">
			<label for="game">Game</label>
			<select id="game" value={data.selectedGame} onchange={onGameChange}>
				{#each data.games as game (game.name)}
					<option value={game.name}>{game.label}</option>
				{/each}
			</select>
		</div>
	{/if}
	{#key data.selectedGame}
		{#each data.tables as table (table.method)}
			<MoveTable {table} />
		{/each}
	{/key}
</Section>

<style>
	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		margin-bottom: var(--space-5);
	}

	@media (min-width: 48rem) {
		.summary {
			flex-direction: row;
			align-items: flex-start;
		}
	}

	.artwork {
		width: 100%;
		max-width: var(--artwork-size);
		aspect-ratio: 1;
		object-fit: contain;
		align-self: center;
	}

	.summary-info {
		flex: 1;
	}

	.dex {
		font-size: var(--text-sm);
	}

	h1 {
		font-size: var(--text-2xl);
		font-weight: var(--weight-normal);
		line-height: var(--leading-tight);
	}

	.genus {
		margin-top: var(--space-1);
	}

	.badges {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.hw {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, max-content));
		gap: var(--space-2) var(--space-6);
		margin-top: var(--space-4);
	}

	.hw dt {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.hw dd {
		font-weight: var(--weight-semibold);
	}

	.flavor {
		margin-top: var(--space-4);
		max-width: 60ch;
	}

	.stats-table th {
		font-weight: var(--weight-normal);
		width: 5rem;
		white-space: nowrap;
	}

	.stats-table .num {
		width: 3rem;
	}

	.stats-table .bar-cell {
		width: 100%;
	}

	.bar-track {
		display: block;
		height: 0.5rem;
		background: var(--color-stat-track);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.bar {
		display: block;
		height: 100%;
		background: var(--color-stat-bar);
		border-radius: var(--radius-pill);
	}

	.total th,
	.total td {
		font-weight: var(--weight-semibold);
	}

	.game-picker {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.game-picker label {
		margin-bottom: 0;
	}

	.game-picker select {
		width: 16rem;
		max-width: 100%;
	}
</style>
