<script>
  let { data } = $props();
</script>

<svelte:head>
  <title>Types – Pokédex</title>
</svelte:head>

<h1>Types</h1>

<ul class="type-list">
  {#each data.types as type (type.name)}
    <li>
      <a class="type-tile" style:background-color="var(--type-{type.name})" href="/types/{type.name}">{type.en}</a>
    </li>
  {/each}
</ul>

<style>
  .type-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .type-tile {
    display: inline-block;
    min-width: 8rem;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    color: var(--color-on-type);
    font-weight: var(--weight-semibold);
    text-align: center;
    text-decoration: none;
  }

  .type-tile:hover {
    text-decoration: underline;
  }
</style>
