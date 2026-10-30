<svelte:head>
  <title>{data.notFound ? 'Not found – Pokédex' : data.ability.englishName + ' – Pokédex'}</title>
</svelte:head>

<script>
  import PokemonCard from '#lib/components/PokemonCard.svelte';
  import NotFound from '#lib/components/NotFound.svelte';

  let { data } = $props();
</script>

{#if data.notFound}
  <NotFound />
{:else}

  <h1>{data.ability.englishName}</h1>

  <section class="panel" aria-labelledby="effect-heading">
    <h2 id="effect-heading">Effect</h2>
    <p>{data.ability.effect}</p>
  </section>

  <section class="panel" aria-labelledby="pokemon-heading">
    <h2 id="pokemon-heading">Pokémon</h2>
    <p class="count">{data.pokemon.length} Pokémon</p>
    <ul class="pokemon-grid">
      {#each data.pokemon as pokemon (pokemon.id)}
        <PokemonCard {pokemon} hidden={pokemon.hidden} />
      {/each}
    </ul>
  </section>
{/if}
