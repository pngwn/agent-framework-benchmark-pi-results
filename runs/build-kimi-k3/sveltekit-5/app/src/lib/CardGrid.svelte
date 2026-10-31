<script>
  /**
   * A list of Pokémon cards. Each item: { id, name, human, dex, sprite, href,
   * types?: [{name, en}], hidden?: boolean }.
   */
  let { items, showTypes = false } = $props();
</script>

<ul class="card-grid">
  {#each items as item (item.id)}
    <li>
      <a class="pokemon-card" href={item.href}>
        <img src={item.sprite} alt="" width="96" height="96" />
        <span class="dex">{item.dex}</span>
        <span class="name">{item.human}</span>
        {#if showTypes && item.types?.length}
          <span class="card-types">
            {#each item.types as type (type.name)}
              <span class="type-badge" style:background-color="var(--type-{type.name})">{type.en}</span>
            {/each}
          </span>
        {/if}
        {#if item.hidden}
          <span class="hidden-note">Hidden ability</span>
        {/if}
      </a>
    </li>
  {/each}
</ul>
