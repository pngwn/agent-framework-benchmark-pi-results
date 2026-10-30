<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<h1 class="page-title">{data.move.displayName}</h1>

<div class="panel">
	<dl class="facts">
		<div>
			<dt>Type</dt>
			<dd>
				{#if data.move.type.name}
					<a class={`type-badge type-${data.move.type.name}`} href={`/types/${data.move.type.name}`}>
						{data.move.type.display}
					</a>
				{:else}
					—
				{/if}
			</dd>
		</div>
		<div>
			<dt>Category</dt>
			<dd>{data.move.category}</dd>
		</div>
		<div>
			<dt>Power</dt>
			<dd>{data.move.power}</dd>
		</div>
		<div>
			<dt>Accuracy</dt>
			<dd>{data.move.accuracy}</dd>
		</div>
		<div>
			<dt>PP</dt>
			<dd>{data.move.pp}</dd>
		</div>
	</dl>
</div>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.move.effect}</p>
</section>

<section class="panel" aria-labelledby="learned-heading">
	<h2 id="learned-heading">Learned by</h2>
	<p class="section-intro">{data.cards.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} />
		{/each}
	</ul>
</section>
