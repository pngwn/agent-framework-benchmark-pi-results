<script>
  import TypeBadge from './TypeBadge.svelte';
  import { dexNumber } from '#lib/utils.js';

  let { items, showTypes = false } = $props();
</script>

<ul class="card-grid" role="list">
  {#each items as pokemon (pokemon.id)}
    <li class="card" role="listitem">
      <a href="/pokemon/{pokemon.name}">
        <img src={pokemon.sprite} alt="" width="96" height="96" />
        <span class="card-dex">{dexNumber(pokemon.id)}</span>
        <span class="card-name">{pokemon.human}</span>
        {#if showTypes && pokemon.types?.length}
          <span class="card-badges">
            {#each pokemon.types as type (type.name)}
              <TypeBadge name={type.name} label={type.label} />
            {/each}
          </span>
        {/if}
        {#if pokemon.hidden}
          <span class="card-note">Hidden ability</span>
        {/if}
      </a>
    </li>
  {/each}
</ul>
