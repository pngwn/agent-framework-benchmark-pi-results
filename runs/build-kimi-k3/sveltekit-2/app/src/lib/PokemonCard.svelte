<script>
  let { card, showTypes = false } = $props();
</script>

<li class="pokemon-card">
  <a href={card.href}>
    <img src={card.sprite} alt="" width="96" height="96" />
    <span class="dex">{card.dex}</span>
    <span class="name">{card.human}</span>
    {#if showTypes && card.types?.length}
      <span class="badges">
        {#each card.types as type (type.name)}
          <span class="badge type-{type.name}">{type.en}</span>
        {/each}
      </span>
    {/if}
    {#if card.note}
      <span class="note">{card.note}</span>
    {/if}
  </a>
</li>
