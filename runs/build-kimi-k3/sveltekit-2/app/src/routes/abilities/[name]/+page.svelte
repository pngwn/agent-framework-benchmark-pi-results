<script>
  import PokemonCard from '#lib/PokemonCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.en} – Pokédex</title>
</svelte:head>

<h1>{data.en}</h1>

<section class="surface" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>{data.effect}</p>
</section>

<section class="surface" aria-labelledby="pokemon-heading">
  <h2 id="pokemon-heading">Pokémon</h2>
  <p class="count">{data.cards.length} Pokémon</p>
  <ul class="card-grid">
    {#each data.cards as card (card.id)}
      <PokemonCard {card} />
    {/each}
  </ul>
</section>
