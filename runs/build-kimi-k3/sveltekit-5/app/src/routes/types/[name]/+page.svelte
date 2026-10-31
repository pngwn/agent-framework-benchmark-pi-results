<script>
  import CardGrid from '#lib/CardGrid.svelte';

  let { data } = $props();
  const view = $derived(data.view);
</script>

<svelte:head>
  <title>{view.name} – Pokédex</title>
</svelte:head>

<h1>{view.name}</h1>

<section class="panel" aria-labelledby="damage-heading">
  <h2 id="damage-heading">Damage relations</h2>
  <dl class="relations">
    {#each view.relations as relation (relation.term)}
      <div class="relation">
        <dt>{relation.term}</dt>
        <dd>
          {#if relation.types.length}
            {#each relation.types as type (type.name)}
              <a class="type-badge" style:background-color="var(--type-{type.name})" href={type.href}>{type.en}</a>
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
  <p class="count muted">{view.cards.length} Pokémon</p>
  <CardGrid items={view.cards} />
</section>

<section class="panel" aria-labelledby="moves-heading">
  <h2 id="moves-heading">Moves</h2>
  <p class="count muted">{view.moves.length} moves</p>
  <ul class="move-list">
    {#each view.moves as move (move.name)}
      <li><a href={move.href}>{move.label}</a></li>
    {/each}
  </ul>
</section>

<style>
  .relations {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4) var(--space-6);
    margin: 0;
  }

  .relation dt {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }

  .relation dd {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .count {
    font-size: var(--text-sm);
    margin-bottom: var(--space-3);
  }

  .move-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--space-1) var(--space-4);
    font-size: var(--text-sm);
  }

  @media (max-width: 40rem) {
    .relations {
      grid-template-columns: 1fr;
    }
  }
</style>
