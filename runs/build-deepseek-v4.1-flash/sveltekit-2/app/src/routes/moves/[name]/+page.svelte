<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';
	import { displayValue } from '#lib/format.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1>{data.label}</h1>

<div class="panel move-facts-panel">
	<dl class="move-facts">
		<div>
			<dt>Type</dt>
			<dd>
				<TypeBadge name={data.type.name} label={data.type.label} href={`/types/${data.type.name}`} />
			</dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{data.category}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{displayValue(data.power)}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{displayValue(data.accuracy)}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{displayValue(data.pp)}</dd>
		</div>
	</dl>
</div>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.effect}</p>
</section>

<section class="panel" aria-labelledby="learned-by-heading">
	<h2 id="learned-by-heading">Learned by</h2>
	<p class="page-count">{data.pokemon.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.pokemon as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>

<style>
	.move-facts-panel {
		margin-top: 0;
		padding-block: var(--space-4);
	}

	.move-facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-6);
		margin: 0;
	}

	.move-facts dt {
		margin-bottom: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
	}

	.move-facts dd {
		margin: 0;
		font-size: var(--text-base);
	}

	@media (max-width: 30rem) {
		.move-facts {
			gap: var(--space-4);
		}
	}
</style>
