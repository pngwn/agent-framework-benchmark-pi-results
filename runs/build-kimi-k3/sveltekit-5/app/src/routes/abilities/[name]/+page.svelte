<script>
  import CardGrid from '#lib/CardGrid.svelte';

  let { data } = $props();
  const view = $derived(data.view);
</script>

<svelte:head>
  <title>{view.name} – Pokédex</title>
</svelte:head>

<h1>{view.name}</h1>

<section class="panel" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>{view.effect}</p>
</section>

<section class="panel" aria-labelledby="pokemon-heading">
  <h2 id="pokemon-heading">Pokémon</h2>
  <p class="count muted">{view.cards.length} Pokémon</p>
  <CardGrid items={view.cards} />
</section>

<style>
  .count {
    font-size: var(--text-sm);
    margin-bottom: var(--space-3);
  }
</style>
