<script>
	import PokemonCard from '#lib/PokemonCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<section class="panel" aria-labelledby="effect-heading">
	<h2 id="effect-heading">Effect</h2>
	<p>{data.effect}</p>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
	<h2 id="pokemon-heading">Pokémon</h2>
	<p class="count">{data.pokemon.length} Pokémon</p>
	<ul class="card-grid">
		{#each data.pokemon as s (s.id)}
			<PokemonCard id={s.id} name={s.name} human={s.human} sprite={s.sprite} hidden={s.hidden} />
		{/each}
	</ul>
</section>
