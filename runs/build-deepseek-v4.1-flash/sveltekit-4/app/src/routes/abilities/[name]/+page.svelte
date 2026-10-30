<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<h1 class="page-title">{data.ability.displayName}</h1>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.ability.effect}</p>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
	<h2 id="pokemon-heading">Pokémon</h2>
	<p class="section-intro">{data.cards.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.cards as pokemon (pokemon.id)}
			<PokemonCard {pokemon} hidden={pokemon.hidden} />
		{/each}
	</ul>
</section>
