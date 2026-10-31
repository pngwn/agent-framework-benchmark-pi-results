<script>
  import PokemonCard from '#lib/PokemonCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.en} – Pokédex</title>
</svelte:head>

<h1>{data.en}</h1>

<div class="surface">
  <dl class="move-facts">
    <div>
      <dt>Type</dt>
      <dd><a class="badge type-{data.typeName}" href="/types/{data.typeName}">{data.typeLabel}</a></dd>
    </div>
    <div>
      <dt>Category</dt>
      <dd>{data.category}</dd>
    </div>
    <div>
      <dt>Power</dt>
      <dd>{data.power ?? '—'}</dd>
    </div>
    <div>
      <dt>Accuracy</dt>
      <dd>{data.accuracy ?? '—'}</dd>
    </div>
    <div>
      <dt>PP</dt>
      <dd>{data.pp ?? '—'}</dd>
    </div>
  </dl>
</div>

<section class="surface" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>{data.effect}</p>
</section>

<section class="surface" aria-labelledby="learned-by-heading">
  <h2 id="learned-by-heading">Learned by</h2>
  <p class="count">{data.cards.length} Pokémon</p>
  <ul class="card-grid">
    {#each data.cards as card (card.id)}
      <PokemonCard {card} />
    {/each}
  </ul>
</section>
