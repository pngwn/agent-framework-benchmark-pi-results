<script>
  import PokemonCardList from '#lib/components/PokemonCardList.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<section class="surface" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>{data.effect}</p>
</section>

<section class="surface" aria-labelledby="pokemon-heading">
  <h2 id="pokemon-heading">Pokémon</h2>
  <p class="count">{data.pokemon.length} Pokémon</p>
  <PokemonCardList items={data.pokemon} />
</section>
