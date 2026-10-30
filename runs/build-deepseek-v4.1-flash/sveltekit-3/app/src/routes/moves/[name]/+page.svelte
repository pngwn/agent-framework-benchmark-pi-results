<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1>{data.label}</h1>

<dl class="details-list move-details panel">
	<div>
		<dt>Type</dt>
		<dd><TypeBadge name={data.type.name} label={data.type.label} href="/types/{data.type.name}" /></dd>
	</div>
	<div>
		<dt>Category</dt>
		<dd>{data.category}</dd>
	</div>
	<div>
		<dt>Power</dt>
		<dd>{data.power}</dd>
	</div>
	<div>
		<dt>Accuracy</dt>
		<dd>{data.accuracy}</dd>
	</div>
	<div>
		<dt>PP</dt>
		<dd>{data.pp}</dd>
	</div>
</dl>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.effect}</p>
</section>

<section class="panel" aria-labelledby="learned-by-heading">
	<h2 id="learned-by-heading">Learned by</h2>
	<p class="count">{data.pokemon.length} Pokémon</p>
	<ul class="cards">
		{#each data.pokemon as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>

<style>
	.move-details {
		column-gap: var(--space-6);
	}

	.move-details > div {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
	}

	.count {
		margin-bottom: 0;
	}
</style>
