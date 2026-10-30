<svelte:head>
  <title>{data.notFound ? 'Not found – Pokédex' : data.move.englishName + ' – Pokédex'}</title>
</svelte:head>

<script>
  import { displayValue } from '#lib/format.js';
  import PokemonCard from '#lib/components/PokemonCard.svelte';
  import NotFound from '#lib/components/NotFound.svelte';

  let { data } = $props();
</script>

{#if data.notFound}
  <NotFound />
{:else}

  <h1>{data.move.englishName}</h1>

  <div class="panel facts-panel">
    <dl class="move-facts">
      <div>
        <dt>Type</dt>
        <dd>
          {#if data.move.type}
            <a class="type-badge type-{data.move.type.name}" href={`/types/${data.move.type.name}`}>{data.move.type.label}</a>
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
        <dd>{displayValue(data.move.power)}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{displayValue(data.move.accuracy)}</dd>
      </div>
      <div>
        <dt>PP</dt>
        <dd>{displayValue(data.move.pp)}</dd>
      </div>
    </dl>
  </div>

  <section class="panel" aria-labelledby="effect-heading">
    <h2 id="effect-heading">Effect</h2>
    <p>{data.move.effect}</p>
  </section>

  <section class="panel" aria-labelledby="learned-heading">
    <h2 id="learned-heading">Learned by</h2>
    <p class="count">{data.learnedBy.length} Pokémon</p>
    <ul class="pokemon-grid">
      {#each data.learnedBy as pokemon (pokemon.id)}
        <PokemonCard {pokemon} />
      {/each}
    </ul>
  </section>
{/if}
