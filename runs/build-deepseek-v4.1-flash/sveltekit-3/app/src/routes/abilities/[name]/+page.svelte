<script>
	import PokemonCard from '#lib/components/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.label} – Pokédex</title>
</svelte:head>

<h1>{data.label}</h1>

<section class="panel" aria-labelledby="ability-effect-heading">
	<h2 id="ability-effect-heading">Effect</h2>
	<p>{data.effect}</p>
</section>

<section class="panel" aria-labelledby="ability-pokemon-heading">
	<h2 id="ability-pokemon-heading">Pokémon</h2>
	<p class="count">{data.pokemon.length} Pokémon</p>
	<ul class="cards">
		{#each data.pokemon as pokemon (pokemon.id)}
			<PokemonCard {pokemon} hidden={pokemon.hidden} />
		{/each}
	</ul>
</section>

<style>
	.count {
		margin-bottom: 0;
	}
</style>
