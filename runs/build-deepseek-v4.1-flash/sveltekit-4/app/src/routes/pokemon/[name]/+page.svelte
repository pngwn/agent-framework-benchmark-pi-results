<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MoveTable from '#lib/components/MoveTable.svelte';
	import { dexNumber } from '#lib/format';

	let { data } = $props();

	function changeGame(event) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('game', event.currentTarget.value);
		goto(`${page.url.pathname}?${params.toString()}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

{#snippet evolutionNode(node)}
	<li>
		<a href={`/pokemon/${node.name}`}>{node.display}</a>
		{#if node.children.length}
			<ul>
				{#each node.children as child (child.name)}
					{@render evolutionNode(child)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<section class="summary" aria-label="Overview">
	<div class="summary-artwork">
		{#if data.pokemon.artwork}
			<img src={data.pokemon.artwork} alt={data.pokemon.displayName} />
		{/if}
	</div>
	<div>
		<p class="dex-number">{dexNumber(data.pokemon.id)}</p>
		<h1>{data.pokemon.displayName}</h1>
		<p class="genus">{data.pokemon.genus}</p>
		<div class="summary-types">
			{#each data.pokemon.types as type (type.name)}
				<a class={`type-badge type-${type.name}`} href={`/types/${type.name}`}>{type.display}</a>
			{/each}
		</div>
		<dl class="meta">
			<div>
				<dt>Height</dt>
				<dd>{data.pokemon.height} m</dd>
			</div>
			<div>
				<dt>Weight</dt>
				<dd>{data.pokemon.weight} kg</dd>
			</div>
		</dl>
		<p class="flavor-text">{data.pokemon.flavorText}</p>
	</div>
</section>

<section class="panel" aria-labelledby="stats-heading">
	<h2 id="stats-heading">Base stats</h2>
	<table class="stats-table">
		<tbody>
			{#each data.stats as stat (stat.label)}
				<tr>
					<th scope="row">{stat.label}</th>
					<td class="stat-value">{stat.value}</td>
					<td>
						<div class="stat-track">
							<div class="stat-fill" style={`width: ${Math.min(100, (stat.value / 255) * 100)}%`}></div>
						</div>
					</td>
				</tr>
			{/each}
			<tr>
				<th scope="row">Total</th>
				<td class="stat-value">{data.total}</td>
				<td></td>
			</tr>
		</tbody>
	</table>
</section>

<section class="panel" aria-labelledby="abilities-heading">
	<h2 id="abilities-heading">Abilities</h2>
	<ul class="plain-list">
		{#each data.abilities as ability (ability.name)}
			<li>
				<a href={`/abilities/${ability.name}`}>{ability.display}</a>{#if ability.hidden}&nbsp;(hidden){/if}
			</li>
		{/each}
	</ul>
</section>

<section class="panel" aria-labelledby="evolution-heading">
	<h2 id="evolution-heading">Evolution</h2>
	{#if data.evolution}
		<ul class="evolution-list">
			{@render evolutionNode(data.evolution)}
		</ul>
	{/if}
</section>

<section class="panel" id="moves" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	{#if data.moves.games.length}
		<div class="field game-field">
			<label for="game-select">Game</label>
			<select id="game-select" value={data.moves.selectedGame} onchange={changeGame}>
				{#each data.moves.games as game (game.name)}
					<option value={game.name}>{game.display}</option>
				{/each}
			</select>
		</div>
	{/if}
	{#each data.moves.tables as table (table.method)}
		<MoveTable {table} />
	{/each}
</section>
