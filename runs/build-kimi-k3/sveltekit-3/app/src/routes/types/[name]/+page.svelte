<script>
  import PokemonCardList from '#lib/components/PokemonCardList.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<section class="surface" aria-labelledby="relations-heading">
  <h2 id="relations-heading">Damage relations</h2>
  <dl class="relations">
    {#each data.relations as relation (relation.term)}
      <div>
        <dt>{relation.term}</dt>
        <dd>
          {#if relation.types.length}
            {#each relation.types as type (type.name)}
              <a class="type-badge type-{type.name}" href="/types/{type.name}">{type.label}</a>
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
  <p class="count">{data.pokemon.length} Pokémon</p>
  <PokemonCardList items={data.pokemon} />
</section>

<section class="surface" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  <p class="count">{data.moves.length} moves</p>
  <ul class="move-list" role="list">
    {#each data.moves as move (move.name)}
      <li role="listitem"><a href="/moves/{move.name}">{move.human}</a></li>
    {/each}
  </ul>
</section>
