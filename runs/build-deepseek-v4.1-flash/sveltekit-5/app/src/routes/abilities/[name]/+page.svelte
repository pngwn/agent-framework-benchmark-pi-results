<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.heading} – Pokédex</title>
</svelte:head>

<h1 class="page-heading">{data.heading}</h1>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.effect}</p>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
	<h2 id="pokemon-heading">Pokémon</h2>
	<p class="count">{data.cards.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} note={pokemon.hidden ? 'Hidden ability' : ''} />
		{/each}
	</ul>
</section>
