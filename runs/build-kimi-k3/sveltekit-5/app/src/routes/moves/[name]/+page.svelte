<script>
  import CardGrid from '#lib/CardGrid.svelte';

  let { data } = $props();
  const view = $derived(data.view);
</script>

<svelte:head>
  <title>{view.name} – Pokédex</title>
</svelte:head>

<h1>{view.name}</h1>

<div class="panel">
  <dl class="facts">
    <div>
      <dt>Type</dt>
      <dd>
        {#if view.typeName}
          <a class="type-badge" style:background-color="var(--type-{view.typeName})" href="/types/{view.typeName}">{view.typeEn}</a>
        {:else}
          —
        {/if}
      </dd>
    </div>
    <div>
      <dt>Category</dt>
      <dd>{view.category}</dd>
    </div>
    <div>
      <dt>Power</dt>
      <dd>{view.power ?? '—'}</dd>
    </div>
    <div>
      <dt>Accuracy</dt>
      <dd>{view.accuracy ?? '—'}</dd>
    </div>
    <div>
      <dt>PP</dt>
      <dd>{view.pp ?? '—'}</dd>
    </div>
  </dl>
</div>

<section class="panel" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>{view.effect}</p>
</section>

<section class="panel" aria-labelledby="learned-by-heading">
  <h2 id="learned-by-heading">Learned by</h2>
  <p class="count muted">{view.cards.length} Pokémon</p>
  <CardGrid items={view.cards} />
</section>

<style>
  .count {
    font-size: var(--text-sm);
    margin-bottom: var(--space-3);
  }
</style>
