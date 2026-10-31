<script>
  import PokemonCard from '#lib/PokemonCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.en} – Pokédex</title>
</svelte:head>

<h1>{data.en}</h1>

<section class="surface" aria-labelledby="damage-relations-heading">
  <h2 id="damage-relations-heading">Damage relations</h2>
  <dl class="damage-relations">
    {#each data.relations as relation (relation.label)}
      <div>
        <dt>{relation.label}</dt>
        <dd>
          {#if relation.types.length}
            {#each relation.types as type (type.name)}
              <a class="badge type-{type.name}" href="/types/{type.name}">{type.en}</a>
            {/each}
          {:else}
            None
          {/if}
        </dd>
      </div>
    {/each}
  </dl>
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

<section class="surface" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  <p class="count">{data.moves.length} moves</p>
  <ul class="move-link-list">
    {#each data.moves as move (move.name)}
      <li><a href="/moves/{move.name}">{move.label}</a></li>
    {/each}
  </ul>
</section>
