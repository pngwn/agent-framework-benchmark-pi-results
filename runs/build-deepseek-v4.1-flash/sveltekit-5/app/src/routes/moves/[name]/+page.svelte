<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';
	import TypeBadge from '#lib/components/TypeBadge.svelte';

	let { data } = $props();
	const format = (value) => (value === null || value === undefined ? '—' : String(value));
</script>

<svelte:head>
	<title>{data.heading} – Pokédex</title>
</svelte:head>

<h1 class="page-heading">{data.heading}</h1>

<div class="panel details-panel">
	<dl class="detail-list">
		<div>
			<dt>Type</dt>
			<dd><TypeBadge name={data.type.name} englishName={data.type.englishName} link /></dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{data.category}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd class:missing={data.power === null}>{format(data.power)}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd class:missing={data.accuracy === null}>{format(data.accuracy)}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd class:missing={data.pp === null}>{format(data.pp)}</dd>
		</div>
	</dl>
</div>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.effect}</p>
</section>

<section class="panel" aria-labelledby="learned-heading">
	<h2 id="learned-heading">Learned by</h2>
	<p class="count">{data.cards.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>

<style>
	.details-panel {
		margin-top: 0;
		padding-block: var(--space-4);
	}

	.details-panel .detail-list {
		grid-template-columns: repeat(5, minmax(0, auto));
		justify-content: start;
		gap: var(--space-6);
	}

	.details-panel dd {
		font-size: var(--text-base);
	}

	@media (max-width: 43rem) {
		.details-panel .detail-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--space-3) var(--space-5);
		}
	}
</style>
