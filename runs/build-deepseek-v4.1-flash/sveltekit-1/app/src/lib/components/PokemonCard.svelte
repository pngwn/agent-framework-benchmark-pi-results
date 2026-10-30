<script>
  import { formatDex } from '#lib/format.js';

  let { pokemon, showTypes = false, hidden = false } = $props();
</script>

<li class="pokemon-card">
  <a class="pokemon-card-link" href={`/pokemon/${pokemon.name}`}>
    {#if pokemon.sprite}
      <img class="sprite" src={pokemon.sprite} alt="" width="96" height="96" />
    {:else}
      <span class="sprite sprite-placeholder" aria-hidden="true"></span>
    {/if}
    <span class="dex">{formatDex(pokemon.id)}</span>
    <span class="card-name">{pokemon.humanized}</span>
    {#if showTypes}
      <span class="type-row">
        {#each pokemon.types as type}
          <span class="type-badge type-{type.name}">{type.label}</span>
        {/each}
      </span>
    {/if}
    {#if hidden}
      <span class="hidden-ability">Hidden ability</span>
    {/if}
  </a>
</li>
