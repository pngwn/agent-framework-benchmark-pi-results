<svelte:head>
  <title>{data.notFound ? 'Not found – Pokédex' : data.type.englishName + ' – Pokédex'}</title>
</svelte:head>

<script>
  import PokemonCard from '#lib/components/PokemonCard.svelte';
  import NotFound from '#lib/components/NotFound.svelte';

  let { data } = $props();
</script>

{#if data.notFound}
  <NotFound />
{:else}

  <h1>{data.type.englishName}</h1>

  <section class="panel" aria-labelledby="damage-heading">
    <h2 id="damage-heading">Damage relations</h2>
    <dl class="relations">
      {#each data.relations as relation}
        <div class="relation">
          <dt>{relation.term}</dt>
          <dd>
            {#if relation.types.length}
              {#each relation.types as type}
                <a class="type-badge type-{type.name}" href={`/types/${type.name}`}>{type.label}</a>
              {/each}
            {:else}
              None
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="panel" aria-labelledby="pokemon-heading">
    <h2 id="pokemon-heading">Pokémon</h2>
    <p class="count">{data.pokemon.length} Pokémon</p>
    <ul class="pokemon-grid">
      {#each data.pokemon as pokemon (pokemon.id)}
        <PokemonCard {pokemon} />
      {/each}
    </ul>
  </section>

  <section class="panel" aria-labelledby="moves-heading">
    <h2 id="moves-heading">Moves</h2>
    <p class="count">{data.moves.length} moves</p>
    <ul class="move-columns">
      {#each data.moves as move (move.name)}
        <li><a href={`/moves/${move.name}`}>{move.label}</a></li>
      {/each}
    </ul>
  </section>
{/if}
