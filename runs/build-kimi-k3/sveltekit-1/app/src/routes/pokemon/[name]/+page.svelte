<script>
	import { goto } from '$app/navigation';
	import { dexNumber } from '#lib/format.js';
	import EvolutionNode from '#lib/EvolutionNode.svelte';
	import MovesTable from '#lib/MovesTable.svelte';

	let { data } = $props();

	function onGameChange(event) {
		goto(`?game=${encodeURIComponent(event.currentTarget.value)}`, { reset: false });
	}
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<div class="panel summary">
	{#if data.artwork}
		<img class="artwork" src={data.artwork} alt={data.name} />
	{/if}
	<div class="summary-info">
		<p class="dex">{dexNumber(data.id)}</p>
		<h1>{data.name}</h1>
		<p class="genus">{data.genus}</p>
		<p class="badges">
			{#each data.types as t (t.name)}
				<a class="badge type-{t.name}" href="/types/{t.name}">{t.en}</a>
			{/each}
		</p>
		<dl class="measurements">
			<div>
				<dt>Height</dt>
				<dd>{data.height} m</dd>
			</div>
			<div>
				<dt>Weight</dt>
				<dd>{data.weight} kg</dd>
			</div>
		</dl>
	</div>
	<p class="flavor">{data.flavor}</p>
</div>

<section class="panel" aria-labelledby="stats-heading">
	<h2 id="stats-heading">Base stats</h2>
	<table class="stats">
		<tbody>
			{#each data.stats as stat (stat.label)}
				<tr>
					<th scope="row">{stat.label}</th>
					<td class="stat-value">{stat.value}</td>
					<td class="stat-bar-cell">
						<span class="stat-track">
							<span class="stat-bar" style:width="{Math.min(100, (stat.value / 255) * 100)}%"></span>
						</span>
					</td>
				</tr>
			{/each}
			<tr>
				<th scope="row">Total</th>
				<td class="stat-value">{data.total}</td>
				<td class="stat-bar-cell">
					<span class="stat-track">
						<span class="stat-bar" style:width="{Math.min(100, (data.total / 720) * 100)}%"></span>
					</span>
				</td>
			</tr>
		</tbody>
	</table>
</section>

<section class="panel" aria-labelledby="abilities-heading">
	<h2 id="abilities-heading">Abilities</h2>
	<ul class="link-list">
		{#each data.abilities as a (a.name)}
			<li>
				<a href="/abilities/{a.name}">{a.human}</a>{a.hidden ? ' (hidden)' : ''}
			</li>
		{/each}
	</ul>
</section>

{#if data.evolution}
	<section class="panel" aria-labelledby="evolution-heading">
		<h2 id="evolution-heading">Evolution</h2>
		<ul class="evolution">
			<EvolutionNode node={data.evolution} />
		</ul>
	</section>
{/if}

<section class="panel" id="moves" aria-labelledby="moves-heading">
	<h2 id="moves-heading">Moves</h2>
	{#if data.versionGroups.length > 0}
		<div class="field game-field">
			<label for="game">Game</label>
			<select id="game" value={data.selectedGame} onchange={onGameChange}>
				{#each data.versionGroups as g (g.name)}
					<option value={g.name}>{g.human}</option>
				{/each}
			</select>
		</div>
		{#each data.methods as m (m.method)}
			<MovesTable label={m.label} showLevel={m.method === 'level-up'} rows={m.rows} />
		{/each}
	{/if}
</section>
