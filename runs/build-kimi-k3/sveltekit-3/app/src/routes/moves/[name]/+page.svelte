<script>
  import PokemonCardList from '#lib/components/PokemonCardList.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.name} – Pokédex</title>
</svelte:head>

<h1>{data.name}</h1>

<div class="surface">
  <dl class="facts">
    <div>
      <dt>Type</dt>
      <dd>
        {#if data.typeName}
          <a class="type-badge type-{data.typeName}" href="/types/{data.typeName}">{data.typeLabel}</a>
        {:else}
          {data.typeLabel}
        {/if}
      </dd>
    </div>
    <div>
      <dt>Category</dt>
      <dd>{data.category}</dd>
    </div>
    <div>
      <dt>Power</dt>
      <dd>{data.power}</dd>
    </div>
    <div>
      <dt>Accuracy</dt>
      <dd>{data.accuracy}</dd>
    </div>
    <div>
      <dt>PP</dt>
      <dd>{data.pp}</dd>
    </div>
  </dl>
</div>

<section class="surface" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>{data.effect}</p>
</section>

<section class="surface" aria-labelledby="learned-heading">
  <h2 id="learned-heading">Learned by</h2>
  <p class="count">{data.learned.length} Pokémon</p>
  <PokemonCardList items={data.learned} />
</section>
